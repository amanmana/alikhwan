import { Hono } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { Bindings } from "../db.ts";
import { loginSchema, passwordResetSchema } from "../../shared/schemas.ts";
import { cleanIc, normalizePhone } from "../../shared/validation.ts";
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  hashSessionToken,
} from "../auth.ts";
import { rateLimiter, memberAuth, verifyTurnstile } from "../middleware.ts";

const app = new Hono<{ Bindings: Bindings }>();

// 1. POST /api/auth/login (Member Login)
app.post("/login", rateLimiter("login-attempt", 10, 60), async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  const { username, password } = parsed.data;
  const normalizedUsername = username.toLowerCase().trim();
  const nowStr = new Date().toISOString();

  try {
    // Look up member account and join member status details
    const account = await c.env.DB.prepare(
      `SELECT a.id, a.member_id, a.password_hash, a.failed_login_count, a.locked_until,
              m.membership_status, m.account_state, m.full_name
       FROM member_accounts a
       JOIN members m ON a.member_id = m.id
       WHERE a.username_normalized = ?`,
    )
      .bind(normalizedUsername)
      .first<any>();

    const invalidAuthError = "Nama pengguna atau kata laluan tidak sah.";

    if (!account) {
      return c.json({ error: invalidAuthError }, 400);
    }

    // Check if account is locked
    if (account.locked_until && new Date(account.locked_until) > new Date()) {
      return c.json(
        {
          error: `Akaun telah dikunci sementara kerana terlalu banyak cubaan gagal. Sila cuba lagi selepas ${new Date(account.locked_until).toLocaleTimeString("ms-MY")}.`,
        },
        403,
      );
    }

    // Check membership status deactivations
    if (
      account.membership_status === "inactive" ||
      account.membership_status === "rejected"
    ) {
      return c.json(
        {
          error:
            "Keahlian anda tidak aktif atau telah ditolak. Sila hubungi surau.",
        },
        403,
      );
    }

    // Verify password
    const isPasswordCorrect = await verifyPassword(
      password,
      account.password_hash,
    );

    if (!isPasswordCorrect) {
      const newFailedCount = account.failed_login_count + 1;
      let lockedUntilStr: string | null = null;
      let errorMessage = invalidAuthError;

      if (newFailedCount >= 5) {
        // Lock account for 30 minutes
        const lockTime = new Date(Date.now() + 30 * 60 * 1000);
        lockedUntilStr = lockTime.toISOString();
        errorMessage =
          "Terlalu banyak cubaan log masuk gagal. Akaun anda dikunci untuk 30 minit.";

        // Update account lock state
        await c.env.DB.prepare(
          "UPDATE member_accounts SET failed_login_count = ?, locked_until = ?, updated_at = ? WHERE id = ?",
        )
          .bind(newFailedCount, lockedUntilStr, nowStr, account.id)
          .run();
      } else {
        // Just increment failed count
        await c.env.DB.prepare(
          "UPDATE member_accounts SET failed_login_count = ?, updated_at = ? WHERE id = ?",
        )
          .bind(newFailedCount, nowStr, account.id)
          .run();
      }

      return c.json({ error: errorMessage }, 400);
    }

    // If account was locked and now unlocked, reset it
    if (account.account_state === "locked") {
      return c.json(
        {
          error:
            "Akaun anda dikunci oleh pentadbir. Sila hubungi pentadbir surau.",
        },
        403,
      );
    }

    // Reset failed login count on successful login
    await c.env.DB.prepare(
      "UPDATE member_accounts SET failed_login_count = 0, locked_until = NULL, updated_at = ? WHERE id = ?",
    )
      .bind(nowStr, account.id)
      .run();

    // Create session token
    const sessionToken = generateSessionToken();
    const tokenHash = hashSessionToken(sessionToken);
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(); // 30 days

    await c.env.DB.prepare(
      `INSERT INTO member_sessions (id, account_id, token_hash, expires_at, created_at, last_used_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(sessionId, account.id, tokenHash, expiresAt, nowStr, nowStr)
      .run();

    // Set cookie
    setCookie(c, "__Host-alikhwan_session", sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return c.json({
      success: true,
      member: {
        id: account.member_id,
        fullName: account.full_name,
        membershipStatus: account.membership_status,
        accountState: account.account_state,
      },
    });
  } catch (err) {
    return c.json({ error: "Ralat pelayan semasa log masuk." }, 500);
  }
});

// 2. POST /api/auth/reset-password (Self-service reset using matching IC and phone)
app.post(
  "/reset-password",
  rateLimiter("password-reset", 5, 10 * 60),
  async (c) => {
    const body = await c.req.json();
    const parsed = passwordResetSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.errors[0].message }, 400);
    }

    const isTurnstileValid = await verifyTurnstile(
      parsed.data.turnstileToken,
      c.env.TURNSTILE_SECRET_KEY,
    );
    if (!isTurnstileValid) {
      return c.json(
        { error: "Pengesahan keselamatan gagal. Sila cuba lagi." },
        400,
      );
    }

    const icNormalized = cleanIc(parsed.data.ic);
    const phoneNormalized = normalizePhone(parsed.data.phone);
    const nowStr = new Date().toISOString();

    try {
      const account = await c.env.DB.prepare(
        `SELECT a.id
         FROM member_accounts a
         JOIN members m ON a.member_id = m.id
         WHERE m.ic_normalized = ?
           AND m.phone_normalized = ?
           AND m.membership_status = 'active'
           AND m.account_state = 'active'
         LIMIT 1`,
      )
        .bind(icNormalized, phoneNormalized)
        .first<any>();

      if (!account) {
        return c.json(
          {
            error:
              "No. IC atau nombor telefon tidak sepadan dengan akaun aktif.",
          },
          400,
        );
      }

      const passwordHash = await hashPassword(parsed.data.newPassword);

      await c.env.DB.prepare(
        `UPDATE member_accounts
         SET password_hash = ?, password_changed_at = ?, failed_login_count = 0,
             locked_until = NULL, updated_at = ?
         WHERE id = ?`,
      )
        .bind(passwordHash, nowStr, nowStr, account.id)
        .run();

      await c.env.DB.prepare(
        "UPDATE member_sessions SET revoked_at = ? WHERE account_id = ? AND revoked_at IS NULL",
      )
        .bind(nowStr, account.id)
        .run();

      deleteCookie(c, "__Host-alikhwan_session", {
        path: "/",
        secure: true,
        sameSite: "Strict",
      });

      return c.json({
        success: true,
        message:
          "Kata laluan berjaya ditetapkan semula. Sila log masuk menggunakan kata laluan baharu.",
      });
    } catch {
      return c.json(
        { error: "Ralat semasa menetapkan semula kata laluan." },
        500,
      );
    }
  },
);

// 3. POST /api/auth/logout (Member Logout)
app.post("/logout", memberAuth, async (c) => {
  const sessionId = c.get("sessionId");
  const nowStr = new Date().toISOString();

  try {
    // Revoke session in database
    await c.env.DB.prepare(
      "UPDATE member_sessions SET revoked_at = ? WHERE id = ?",
    )
      .bind(nowStr, sessionId)
      .run();

    // Delete cookie
    deleteCookie(c, "__Host-alikhwan_session", {
      path: "/",
      secure: true,
      sameSite: "Strict",
    });

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: "Ralat pelayan semasa log keluar." }, 500);
  }
});

// 4. GET /api/auth/session (Get Session State for React app launch)
app.get("/session", async (c) => {
  const token = getCookie(c, "__Host-alikhwan_session");
  if (!token) {
    return c.json({ authenticated: false });
  }

  const tokenHash = hashSessionToken(token);
  const nowStr = new Date().toISOString();

  try {
    const session = await c.env.DB.prepare(
      `SELECT m.id, m.full_name, m.membership_status, m.account_state, ma.username
       FROM member_sessions s
       JOIN member_accounts ma ON s.account_id = ma.id
       JOIN members m ON ma.member_id = m.id
       WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?`,
    )
      .bind(tokenHash, nowStr)
      .first<any>();

    if (!session) {
      return c.json({ authenticated: false });
    }

    if (
      session.account_state === "locked" ||
      session.membership_status === "inactive" ||
      session.membership_status === "rejected"
    ) {
      return c.json({ authenticated: false });
    }

    return c.json({
      authenticated: true,
      member: {
        id: session.id,
        fullName: session.full_name,
        username: session.username,
        membershipStatus: session.membership_status,
        accountState: session.account_state,
      },
    });
  } catch {
    return c.json({ authenticated: false });
  }
});

export default app;
