import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { Bindings } from "../db.ts";
import { memberAuth } from "../middleware.ts";
import {
  passwordChangeSchema,
  profileUpdateSchema,
} from "../../shared/schemas.ts";
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  hashSessionToken,
} from "../auth.ts";
import { cleanIc, normalizePhone, parseIc } from "../../shared/validation.ts";

const app = new Hono<{ Bindings: Bindings }>();

// Apply member authentication middleware to all routes in this sub-router
app.use("*", memberAuth);

// 1. GET /api/me (Fetch own profile details)
app.get("/", async (c) => {
  const memberId = c.get("memberId");

  try {
    const member = await c.env.DB.prepare(
      `SELECT id, full_name, ic_normalized, ic_last4, birth_date, phone_normalized,
              address, general_area, membership_status, account_state,
              directory_visible, directory_consent_at, created_at, updated_at
       FROM members
       WHERE id = ?`,
    )
      .bind(memberId)
      .first<any>();

    if (!member) {
      return c.json({ error: "Maklumat profil tidak ditemui." }, 404);
    }

    return c.json({
      member: {
        id: member.id,
        fullName: member.full_name,
        ic: member.ic_normalized, // Full IC (masked on UI, revealed by action)
        icLast4: member.ic_last4,
        birthDate: member.birth_date,
        phone: member.phone_normalized,
        address: member.address,
        generalArea: member.general_area,
        membershipStatus: member.membership_status,
        accountState: member.account_state,
        directoryVisible: member.directory_visible === 1,
        directoryConsentAt: member.directory_consent_at,
        createdAt: member.created_at,
        updatedAt: member.updated_at,
      },
    });
  } catch (err) {
    return c.json({ error: "Ralat pelayan semasa mendapatkan profil." }, 500);
  }
});

// 2. POST /api/me/change-password (Change Password with Session Rotation)
app.post("/change-password", async (c) => {
  const accountId = c.get("accountId");
  const sessionId = c.get("sessionId");
  const body = await c.req.json();

  const parsed = passwordChangeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  const { currentPassword, newPassword } = parsed.data;
  const nowStr = new Date().toISOString();

  try {
    // Get account password hash
    const account = await c.env.DB.prepare(
      "SELECT password_hash FROM member_accounts WHERE id = ?",
    )
      .bind(accountId)
      .first<any>();

    if (!account) {
      return c.json({ error: "Akaun tidak ditemui." }, 404);
    }

    // Verify current password
    const isCurrentCorrect = await verifyPassword(
      currentPassword,
      account.password_hash,
    );
    if (!isCurrentCorrect) {
      return c.json({ error: "Kata laluan semasa tidak sah." }, 400);
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    const updatePassword = c.env.DB.prepare(
      "UPDATE member_accounts SET password_hash = ?, password_changed_at = ?, updated_at = ? WHERE id = ?",
    ).bind(newPasswordHash, nowStr, nowStr, accountId);

    // Revoke current session (for rotation)
    const revokeSession = c.env.DB.prepare(
      "UPDATE member_sessions SET revoked_at = ? WHERE id = ?",
    ).bind(nowStr, sessionId);

    await c.env.DB.batch([updatePassword, revokeSession]);

    // Create new session token (rotate session)
    const newSessionToken = generateSessionToken();
    const tokenHash = hashSessionToken(newSessionToken);
    const newSessionId = crypto.randomUUID();
    const expiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    await c.env.DB.prepare(
      `INSERT INTO member_sessions (id, account_id, token_hash, expires_at, created_at, last_used_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(newSessionId, accountId, tokenHash, expiresAt, nowStr, nowStr)
      .run();

    // Set new cookie
    setCookie(c, "__Host-alikhwan_session", newSessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return c.json({
      success: true,
      message: "Kata laluan berjaya dikemas kini.",
    });
  } catch (err) {
    return c.json(
      { error: "Ralat pelayan semasa mengemas kini kata laluan." },
      500,
    );
  }
});

// 3. PATCH /api/me/profile (Update own profile)
app.patch("/profile", async (c) => {
  const memberId = c.get("memberId");
  const body = await c.req.json();

  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  const changes = parsed.data;

  // Filter out undefined keys to see if any edits are requested
  const keys = Object.keys(changes) as (keyof typeof changes)[];
  const requestedChanges: Record<string, string> = {};

  for (const key of keys) {
    if (changes[key] !== undefined && changes[key] !== "") {
      requestedChanges[key] = changes[key] as string;
    }
  }

  if (Object.keys(requestedChanges).length === 0) {
    return c.json(
      {
        error:
          "Sila masukkan sekurang-kurangnya satu maklumat untuk dikemaskini.",
      },
      400,
    );
  }

  try {
    const nowStr = new Date().toISOString();
    const updates: string[] = [];
    const binds: any[] = [];

    const icVal = requestedChanges.ic ? cleanIc(requestedChanges.ic) : null;
    const phoneVal = requestedChanges.phone
      ? normalizePhone(requestedChanges.phone)
      : null;

    if (requestedChanges.fullName) {
      updates.push("full_name = ?", "full_name_normalized = ?");
      binds.push(
        requestedChanges.fullName,
        requestedChanges.fullName.toUpperCase(),
      );
    }
    if (requestedChanges.ic) {
      const parsedIc = parseIc(icVal!);
      const birthDate = parsedIc ? parsedIc.birthDate : null;
      const icLast4 = icVal!.slice(-4);
      updates.push("ic_normalized = ?", "ic_last4 = ?", "birth_date = ?");
      binds.push(icVal, icLast4, birthDate);
    }
    if (requestedChanges.phone) {
      updates.push("phone_normalized = ?");
      binds.push(phoneVal);
    }
    if (requestedChanges.address) {
      updates.push("address = ?");
      binds.push(requestedChanges.address);
    }
    if (requestedChanges.generalArea) {
      updates.push("general_area = ?");
      binds.push(requestedChanges.generalArea);
    }

    updates.push("updated_at = ?");
    binds.push(nowStr);

    // Bind memberId at the end of query
    binds.push(memberId);

    const updateQuery = `UPDATE members SET ${updates.join(", ")} WHERE id = ?`;
    const updateMember = c.env.DB.prepare(updateQuery).bind(...binds);

    await updateMember.run();

    return c.json({
      success: true,
      message: "Maklumat profil anda berjaya dikemas kini.",
    });
  } catch (err) {
    return c.json({ error: "Ralat pelayan semasa mengemas kini profil." }, 500);
  }
});

// 4. PATCH /api/me/directory-preference (Change Directory Visibility Preference)
app.patch("/directory-preference", async (c) => {
  const memberId = c.get("memberId");
  const body = await c.req.json();

  if (typeof body.directoryVisible !== "boolean") {
    return c.json({ error: "Maklumat kebenaran direktori tidak sah." }, 400);
  }

  const visible = body.directoryVisible ? 1 : 0;
  const nowStr = new Date().toISOString();

  try {
    await c.env.DB.prepare(
      "UPDATE members SET directory_visible = ?, directory_consent_at = ?, updated_at = ? WHERE id = ?",
    )
      .bind(visible, visible ? nowStr : null, nowStr, memberId)
      .run();

    // Keep the member's explicit directory-consent history.
    await c.env.DB.prepare(
      `INSERT INTO consent_records (id, member_id, consent_type, notice_version, granted, created_at)
       VALUES (?, ?, 'directory_visibility', '1.0', ?, ?)`,
    )
      .bind(crypto.randomUUID(), memberId, visible, nowStr)
      .run();

    return c.json({
      success: true,
      message: "Pilihan paparan direktori berjaya dikemaskini.",
    });
  } catch (err) {
    return c.json(
      { error: "Ralat pelayan semasa mengemas kini status direktori." },
      500,
    );
  }
});

export default app;
