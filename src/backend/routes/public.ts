import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { Bindings, createAuditLog } from "../db.ts";
import { verifyTurnstile, rateLimiter } from "../middleware.ts";
import {
  cleanIc,
  parseIc,
  normalizePhone,
  isValidUsername,
} from "../../shared/validation.ts";
import {
  registrationSchema,
  membershipCheckSchema,
  accountClaimSchema,
} from "../../shared/schemas.ts";
import {
  hashPassword,
  generateSessionToken,
  hashSessionToken,
} from "../auth.ts";

const app = new Hono<{ Bindings: Bindings }>();

// 1. GET /api/public/members (Public Member Directory Search)
// Rate limited to prevent scraping
app.get("/members", rateLimiter("public-search", 40, 60), async (c) => {
  const q = c.req.query("q") || "";
  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    let members: any[] = [];

    if (q.trim().length >= 2) {
      // Clean and parse query for safe matching
      const cleanedQuery = q.replace(/[^\p{L}\p{N}\s]/gu, "").trim();
      if (cleanedQuery) {
        // Find using FTS5 virtual table
        const queryWithWildcard = `${cleanedQuery}*`;
        members = await c.env.DB.prepare(
          `SELECT id, full_name, address, ic_normalized, ic_last4, phone_normalized, account_state 
           FROM members 
           WHERE id IN (SELECT member_id FROM members_fts WHERE members_fts MATCH ?)
             AND membership_status = 'active' 
           LIMIT ? OFFSET ?`,
        )
          .bind(queryWithWildcard, limit, offset)
          .all()
          .then((res) => res.results);
      }
    } else {
      // Default: Return alphabetized list of active members
      members = await c.env.DB.prepare(
        `SELECT id, full_name, address, ic_normalized, ic_last4, phone_normalized, account_state 
         FROM members 
         WHERE membership_status = 'active' 
         ORDER BY full_name ASC
         LIMIT ? OFFSET ?`,
      )
        .bind(limit, offset)
        .all()
        .then((res) => res.results);
    }

    let totalCount = 0;
    if (q.trim().length >= 2) {
      const cleanedQuery = q.replace(/[^\p{L}\p{N}\s]/gu, "").trim();
      if (cleanedQuery) {
        const queryWithWildcard = `${cleanedQuery}*`;
        const countRes = await c.env.DB.prepare(
          `SELECT COUNT(*) as count 
           FROM members 
           WHERE id IN (SELECT member_id FROM members_fts WHERE members_fts MATCH ?)
             AND membership_status = 'active'`,
        )
          .bind(queryWithWildcard)
          .first<any>();
        totalCount = countRes ? countRes.count : 0;
      }
    } else {
      const countRes = await c.env.DB.prepare(
        `SELECT COUNT(*) as count 
         FROM members 
         WHERE membership_status = 'active'`,
      ).first<any>();
      totalCount = countRes ? countRes.count : 0;
    }

    // Map internal fields to public-only masked serializer
    const publicMembers = members.map((m) => {
      const icLast4 =
        m.ic_last4 || (m.ic_normalized ? m.ic_normalized.slice(-4) : "");
      const icMasked = m.ic_normalized
        ? `xxxxxx-xx-${icLast4}`
        : "Belum Dituntut";

      const phoneVal = m.phone_normalized || "";
      const phoneMasked = phoneVal
        ? `******${phoneVal.slice(-4)}`
        : "Belum Dituntut";

      return {
        id: m.id,
        fullName: m.full_name,
        address: m.address || "Kariah Al-Ikhwan",
        icMasked,
        phoneMasked,
        status: m.account_state === "unclaimed" ? "Belum Dituntut" : "Aktif",
      };
    });

    return c.json({
      members: publicMembers,
      total: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (err) {
    return c.json({ error: "Ralat mendapatkan senarai ahli." }, 500);
  }
});

// 1b. GET /api/public/legacy-search (Search unclaimed legacy profiles)
app.get("/legacy-search", rateLimiter("legacy-search", 20, 60), async (c) => {
  const q = c.req.query("q") || "";
  if (q.trim().length < 2) {
    return c.json({ members: [] });
  }
  try {
    const cleaned = q.replace(/[^\p{L}\p{N}\s]/gu, "").trim();
    const queryWithWildcard = `${cleaned}*`;
    const results = await c.env.DB.prepare(
      `SELECT id, full_name, address 
       FROM members 
       WHERE id IN (SELECT member_id FROM members_fts WHERE members_fts MATCH ?)
         AND account_state = 'unclaimed'
       LIMIT 10`,
    )
      .bind(queryWithWildcard)
      .all()
      .then((res) => res.results);

    const safeMembers = results.map((m: any) => ({
      id: m.id,
      fullName: m.full_name,
      // Strip exact house number for privacy: e.g. "No. 33 Jalan PUJ 2/2" -> "Jalan PUJ 2/2"
      address: m.address ? m.address.replace(/^No\.\s*\d+/i, "").trim() : "",
    }));

    return c.json({ members: safeMembers });
  } catch (err) {
    return c.json({ error: "Ralat semasa carian rekod ahli lama." }, 500);
  }
});

// 2. POST /api/public/membership-check (Membership Check)
app.post(
  "/membership-check",
  rateLimiter("membership-check", 10, 60),
  async (c) => {
    const body = await c.req.json();
    const parsed = membershipCheckSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.errors[0].message }, 400);
    }

    const { ic, phone, turnstileToken } = parsed.data;

    // Turnstile check
    const isTurnstileValid = await verifyTurnstile(
      turnstileToken,
      c.env.TURNSTILE_SECRET_KEY,
    );
    if (!isTurnstileValid) {
      return c.json(
        { error: "Pengesahan Turnstile gagal. Sila cuba lagi." },
        400,
      );
    }

    const cleanedIc = cleanIc(ic);
    const cleanedPhone = normalizePhone(phone);

    if (!cleanedPhone) {
      return c.json({ error: "No. telefon tidak sah." }, 400);
    }

    try {
      const member = await c.env.DB.prepare(
        `SELECT id, membership_status, account_state 
       FROM members 
       WHERE ic_normalized = ? AND phone_normalized = ?`,
      )
        .bind(cleanedIc, cleanedPhone)
        .first<any>();

      // Return a generic privacy-safe response to prevent enumeration
      const safeMessage =
        "Jika maklumat anda sepadan dengan rekod kami, anda boleh meneruskan permohonan tuntutan akaun.";

      if (member && member.account_state === "unclaimed") {
        return c.json({
          success: true,
          matched: true,
          message: safeMessage,
        });
      }

      return c.json({
        success: true,
        matched: false,
        message: safeMessage,
      });
    } catch (err) {
      return c.json({ error: "Ralat semasa menyemak keahlian." }, 500);
    }
  },
);

// 3. POST /api/public/register (New Member Registration)
app.post("/register", rateLimiter("register", 5, 60), async (c) => {
  const body = await c.req.json();
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  const {
    fullName,
    ic,
    phone,
    address,
    generalArea,
    username,
    password,
    directoryConsent,
    turnstileToken,
  } = parsed.data;

  // Turnstile check
  const isTurnstileValid = await verifyTurnstile(
    turnstileToken,
    c.env.TURNSTILE_SECRET_KEY,
  );
  if (!isTurnstileValid) {
    return c.json(
      { error: "Pengesahan Turnstile gagal. Sila cuba lagi." },
      400,
    );
  }

  const cleanedIc = cleanIc(ic);
  const cleanedPhone = normalizePhone(phone);
  const parsedIc = parseIc(cleanedIc);

  if (!cleanedPhone || !parsedIc) {
    return c.json({ error: "Maklumat IC atau telefon tidak sah." }, 400);
  }

  try {
    // Check duplicates
    const existingIc = await c.env.DB.prepare(
      "SELECT id FROM members WHERE ic_normalized = ?",
    )
      .bind(cleanedIc)
      .first();

    if (existingIc) {
      return c.json(
        { error: "No. IC ini telah didaftarkan dalam sistem." },
        400,
      );
    }

    const existingUsername = await c.env.DB.prepare(
      "SELECT id FROM member_accounts WHERE username_normalized = ?",
    )
      .bind(username.toLowerCase())
      .first();

    if (existingUsername) {
      return c.json(
        { error: "Nama pengguna ini telah diambil. Sila pilih nama lain." },
        400,
      );
    }

    // Perform batch insertion
    const memberId = crypto.randomUUID();
    const accountId = crypto.randomUUID();
    const nowStr = new Date().toISOString();
    const icLast4 = cleanedIc.substring(8);
    const normalizedName = fullName.toUpperCase().trim();
    const hashedPassword = await hashPassword(password);

    const insertMember = c.env.DB.prepare(
      `INSERT INTO members (
        id, legacy_id, full_name, full_name_normalized, ic_normalized, ic_last4, birth_date,
        phone_normalized, address, general_area, membership_status, account_state,
        directory_visible, directory_consent_at, registration_source, created_at, updated_at
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'active', ?, ?, 'public_registration', ?, ?)`,
    ).bind(
      memberId,
      fullName,
      normalizedName,
      cleanedIc,
      icLast4,
      parsedIc.birthDate,
      cleanedPhone,
      address,
      generalArea || null,
      directoryConsent ? 1 : 0,
      directoryConsent ? nowStr : null,
      nowStr,
      nowStr,
    );

    const insertAccount = c.env.DB.prepare(
      `INSERT INTO member_accounts (
        id, member_id, username, username_normalized, password_hash, password_changed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      accountId,
      memberId,
      username,
      username.toLowerCase(),
      hashedPassword,
      nowStr,
      nowStr,
      nowStr,
    );

    const insertConsent = c.env.DB.prepare(
      `INSERT INTO consent_records (
        id, member_id, consent_type, notice_version, granted, created_at
      ) VALUES (?, ?, 'privacy_notice', '1.0', 1, ?)`,
    ).bind(crypto.randomUUID(), memberId, nowStr);

    // D1 Batch executes inside a transaction
    await c.env.DB.batch([insertMember, insertAccount, insertConsent]);

    // Create session token and write cookie immediately to log them in
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
      .bind(sessionId, accountId, tokenHash, expiresAt, nowStr, nowStr)
      .run();

    // Set cookie
    setCookie(c, "__Host-alikhwan_session", sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    // Write audit log
    await createAuditLog(
      c.env.DB,
      "member",
      memberId,
      "REGISTRATION_CREATE",
      "members",
      memberId,
      JSON.stringify({ fullName, username }),
      "Pendaftaran ahli baru secara awam",
    );

    return c.json({
      success: true,
      message: "Pendaftaran diterima dan sedang menunggu pengesahan admin.",
      member: {
        id: memberId,
        fullName,
        membershipStatus: "pending",
      },
    });
  } catch (err) {
    return c.json({ error: "Ralat sistem semasa memproses pendaftaran." }, 500);
  }
});

// 4. POST /api/public/account-claim (Legacy Account Claim)
app.post("/account-claim", rateLimiter("claim", 5, 60), async (c) => {
  const body = await c.req.json();
  const parsed = accountClaimSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  const { memberId, ic, phone, username, password, turnstileToken } =
    parsed.data;

  // Turnstile check
  const isTurnstileValid = await verifyTurnstile(
    turnstileToken,
    c.env.TURNSTILE_SECRET_KEY,
  );
  if (!isTurnstileValid) {
    return c.json(
      { error: "Pengesahan Turnstile gagal. Sila cuba lagi." },
      400,
    );
  }

  const cleanedIc = cleanIc(ic);
  const cleanedPhone = normalizePhone(phone);

  if (!cleanedPhone) {
    return c.json({ error: "No. telefon tidak sah." }, 400);
  }

  try {
    let member: any = null;

    if (memberId) {
      member = await c.env.DB.prepare(
        `SELECT id, membership_status, account_state, full_name 
         FROM members 
         WHERE id = ?`,
      )
        .bind(memberId)
        .first<any>();

      if (!member) {
        return c.json({ error: "Rekod ahli tidak ditemui." }, 404);
      }

      if (member.account_state !== "unclaimed") {
        return c.json(
          {
            error:
              "Akaun ahli ini telah pun dituntut atau dalam proses tuntutan.",
          },
          400,
        );
      }

      // Check if IC is already taken by another active member
      const icTaken = await c.env.DB.prepare(
        "SELECT id FROM members WHERE ic_normalized = ? AND account_state = 'active'",
      )
        .bind(cleanedIc)
        .first();

      if (icTaken) {
        return c.json(
          { error: "No. IC ini telah berdaftar pada akaun ahli lain." },
          400,
        );
      }
    } else {
      // Fallback lookup by IC and Phone (for backwards compatibility/tests)
      member = await c.env.DB.prepare(
        `SELECT id, membership_status, account_state, full_name 
         FROM members 
         WHERE ic_normalized = ? AND phone_normalized = ?`,
      )
        .bind(cleanedIc, cleanedPhone)
        .first<any>();

      const safeError =
        "Tuntutan akaun tidak dapat diproses. Sila pastikan No. IC dan No. telefon sepadan dengan rekod kariah.";

      if (!member) {
        return c.json({ error: safeError }, 400);
      }

      if (member.account_state !== "unclaimed") {
        return c.json(
          { error: "Akaun untuk No. IC ini telah pun dituntut." },
          400,
        );
      }
    }

    // Check username duplicates in existing accounts or pending claims
    const existingUsername = await c.env.DB.prepare(
      "SELECT id FROM member_accounts WHERE username_normalized = ?",
    )
      .bind(username.toLowerCase())
      .first();

    if (existingUsername) {
      return c.json(
        { error: "Nama pengguna ini telah diambil. Sila pilih nama lain." },
        400,
      );
    }

    const pendingUsername = await c.env.DB.prepare(
      "SELECT id FROM account_claims WHERE requested_username_normalized = ? AND status = 'pending'",
    )
      .bind(username.toLowerCase())
      .first();

    if (pendingUsername) {
      return c.json(
        { error: "Nama pengguna ini sedang dalam proses tuntutan akaun lain." },
        400,
      );
    }

    // Hash pending password
    const hashedPendingPassword = await hashPassword(password);
    const claimId = crypto.randomUUID();
    const referenceCode =
      "CLM-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const nowStr = new Date().toISOString();

    // Create claim entry and set member account state to pending_claim
    const insertClaim = c.env.DB.prepare(
      `INSERT INTO account_claims (
        id, member_id, requested_username, requested_username_normalized, pending_password_hash,
        requested_ic_normalized, requested_phone_normalized, status, reference_code, requested_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    ).bind(
      claimId,
      member.id,
      username,
      username.toLowerCase(),
      hashedPendingPassword,
      cleanedIc,
      cleanedPhone,
      referenceCode,
      nowStr,
    );

    const updateMemberState = c.env.DB.prepare(
      "UPDATE members SET account_state = 'pending_claim', updated_at = ? WHERE id = ?",
    ).bind(nowStr, member.id);

    await c.env.DB.batch([insertClaim, updateMemberState]);

    // Audit log
    await createAuditLog(
      c.env.DB,
      "member",
      member.id,
      "CLAIM_SUBMIT",
      "account_claims",
      claimId,
      JSON.stringify({ username, referenceCode }),
      "Tuntutan akaun ahli lama diserahkan",
    );

    return c.json({
      success: true,
      referenceCode,
      message:
        "Permohonan tuntutan akaun berjaya dihantar. Sila catat kod rujukan anda.",
    });
  } catch (err) {
    return c.json(
      { error: "Ralat pelayan semasa memproses tuntutan akaun." },
      500,
    );
  }
});

export default app;
