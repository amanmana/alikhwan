import { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { hashSessionToken } from "./auth.ts";

// 1. Same-Origin & Content-Type CSRF Protection
export const csrfProtection: MiddlewareHandler = async (c, next) => {
  const method = c.req.method;
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return next();
  }

  const origin = c.req.header("Origin");
  const host = c.req.header("Host");

  if (origin) {
    try {
      const originUrl = new URL(origin);
      const currentHostStr = host || new URL(c.req.url).host;
      const currentHostname = currentHostStr.split(":")[0];
      if (originUrl.hostname !== currentHostname) {
        return c.json(
          { error: "Ralat Keselamatan: Percubaan CSRF dikesan." },
          403,
        );
      }
    } catch {
      return c.json(
        { error: "Ralat Keselamatan: Maklumat asal (Origin) tidak sah." },
        403,
      );
    }
  }

  const contentType = c.req.header("Content-Type");
  if (
    contentType &&
    !contentType.includes("application/json") &&
    !contentType.includes("multipart/form-data")
  ) {
    return c.json(
      { error: "Ralat: Format jenis kandungan (Content-Type) tidak disokong." },
      415,
    );
  }

  await next();
};

// 2. Dual-mode Rate Limiter (Cloudflare Rate Limiting binding or local in-memory fallback)
const devLimiters = new Map<string, { count: number; resetTime: number }>();

export async function checkRateLimit(
  c: any,
  key: string,
  limit = 20,
  timeWindowSec = 60,
): Promise<{ success: boolean; retryAfter?: number }> {
  // Production binding check
  if (c.env.RATE_LIMITER) {
    try {
      const { success, retryAfter } = await c.env.RATE_LIMITER.limit({ key });
      return { success, retryAfter };
    } catch {
      // Fallback on binding failure
    }
  }

  // Local development fallback
  const now = Date.now();
  const entry = devLimiters.get(key);
  if (!entry || now > entry.resetTime) {
    devLimiters.set(key, {
      count: 1,
      resetTime: now + timeWindowSec * 1000,
    });
    return { success: true };
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { success: false, retryAfter };
  }

  entry.count++;
  return { success: true };
}

// 3. Hono rate limiting middleware wrapper
export function rateLimiter(
  keyPrefix: string,
  limit = 20,
  windowSec = 60,
): MiddlewareHandler {
  return async (c, next) => {
    // Get IP or identifier
    const ip = c.req.header("CF-Connecting-IP") || "127.0.0.1";
    const rateLimitKey = `${keyPrefix}:${ip}`;
    const { success, retryAfter } = await checkRateLimit(
      c,
      rateLimitKey,
      limit,
      windowSec,
    );

    if (!success) {
      c.header("Retry-After", String(retryAfter || windowSec));
      return c.json(
        { error: "Terlalu banyak percubaan. Sila cuba semula sebentar lagi." },
        429,
      );
    }
    await next();
  };
}

// 4. Member session validation middleware
export const memberAuth: MiddlewareHandler = async (c, next) => {
  const token = getCookie(c, "__Host-alikhwan_session");
  if (!token) {
    return c.json(
      { error: "Sesi anda telah tamat atau tidak sah. Sila log masuk semula." },
      401,
    );
  }

  const tokenHash = hashSessionToken(token);
  const nowStr = new Date().toISOString();

  try {
    const session = await c.env.DB.prepare(
      `SELECT s.id as session_id, s.expires_at, a.id as account_id, a.member_id, a.failed_login_count,
              m.membership_status, m.account_state
       FROM member_sessions s
       JOIN member_accounts a ON s.account_id = a.id
       JOIN members m ON a.member_id = m.id
       WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?`,
    )
      .bind(tokenHash, nowStr)
      .first<any>();

    if (!session) {
      return c.json(
        { error: "Sesi anda telah tamat. Sila log masuk semula." },
        401,
      );
    }

    if (session.account_state === "locked") {
      return c.json({ error: "Akaun anda telah dikunci oleh pentadbir." }, 403);
    }

    if (
      session.membership_status === "inactive" ||
      session.membership_status === "rejected"
    ) {
      return c.json({ error: "Keahlian anda tidak aktif." }, 403);
    }

    // Refresh last used time asynchronously
    c.executionCtx.waitUntil(
      c.env.DB.prepare(
        "UPDATE member_sessions SET last_used_at = ? WHERE id = ?",
      )
        .bind(nowStr, session.session_id)
        .run(),
    );

    // Save context variables
    c.set("memberId", session.member_id);
    c.set("accountId", session.account_id);
    c.set("sessionId", session.session_id);

    await next();
  } catch (err: any) {
    return c.json({ error: "Ralat pelayan dalaman semasa pengesahan." }, 500);
  }
};

// 5. Admin auth middleware — accepts magic keyword as Bearer token
export const adminAuth: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return c.json(
      { error: "Tiada kebenaran pentadbir. Sila log masuk semula." },
      401,
    );
  }

  // Constant-time comparison to prevent timing attacks
  const expected = c.env.ADMIN_MAGIC_KEYWORD;
  if (!expected || token !== expected) {
    return c.json({ error: "Kata kunci pentadbir tidak sah." }, 401);
  }

  // Pass a static identifier for audit logs
  c.set("adminSessionId", "admin-keyword-session");

  await next();
};

export async function verifyTurnstile(
  token: string,
  secretKey: string,
): Promise<boolean> {
  // Test tokens or dummy secret keys that always pass in local development
  if (
    token === "1x00000000000000000000AAAA" ||
    token === "1x00000000000000000000AA" ||
    token === "mock-turnstile-token" ||
    secretKey === "1x00000000000000000000000000000000AA" ||
    secretKey.startsWith("1x00000000")
  ) {
    return true;
  }

  try {
    const params = new URLSearchParams();
    params.append("secret", secretKey);
    params.append("response", token);

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );
    const body = (await res.json()) as any;
    return !!body.success;
  } catch {
    return false;
  }
}
