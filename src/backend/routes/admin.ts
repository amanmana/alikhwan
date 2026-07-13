import { Hono } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { Bindings } from "../db.ts";
import {
  verifyAdminKeyword,
  generateSessionToken,
  hashSessionToken,
} from "../auth.ts";
import { rateLimiter, adminAuth, verifyTurnstile } from "../middleware.ts";
import { cleanIc, normalizePhone, parseIc } from "../../shared/validation.ts";

const app = new Hono<{ Bindings: Bindings }>();

// 1. POST /api/admin/login (Admin Magic Keyword Login / Device Enrollment)
app.post("/login", rateLimiter("admin-login", 5, 60), async (c) => {
  const body = await c.req.json();
  const { keyword, deviceLabel, turnstileToken } = body;

  if (!keyword) {
    return c.json({ error: "Kata kunci diperlukan." }, 400);
  }

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

  // Magic keyword comparison (constant-time)
  const isKeywordCorrect = verifyAdminKeyword(
    keyword,
    c.env.ADMIN_MAGIC_KEYWORD,
  );
  if (!isKeywordCorrect) {
    return c.json({ error: "Kata kunci tidak sah." }, 400);
  }

  const nowStr = new Date().toISOString();
  const sessionToken = generateSessionToken();
  const tokenHash = hashSessionToken(sessionToken);
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + 180 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 180 days

  try {
    await c.env.DB.prepare(
      `INSERT INTO admin_sessions (id, token_hash, device_label, created_at, last_used_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        sessionId,
        tokenHash,
        deviceLabel || "Peranti Tidak Diketahui",
        nowStr,
        nowStr,
        expiresAt,
      )
      .run();

    // Set cookie
    setCookie(c, "__Host-alikhwan_admin", sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      path: "/",
      maxAge: 180 * 24 * 60 * 60,
    });

    return c.json({
      success: true,
      message: "Daftar masuk pentadbir berjaya.",
    });
  } catch (err) {
    return c.json(
      { error: "Ralat pelayan semasa mendaftar peranti pentadbir." },
      500,
    );
  }
});

// Apply admin authentication to all following endpoints
app.use("*", adminAuth);

// 2. POST /api/admin/logout (Admin Logout)
app.post("/logout", async (c) => {
  const adminSessionId = c.get("adminSessionId");
  const nowStr = new Date().toISOString();

  try {
    await c.env.DB.prepare(
      "UPDATE admin_sessions SET revoked_at = ? WHERE id = ?",
    )
      .bind(nowStr, adminSessionId)
      .run();

    deleteCookie(c, "__Host-alikhwan_admin", {
      path: "/",
      secure: true,
      sameSite: "Strict",
    });

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: "Ralat pelayan semasa log keluar pentadbir." }, 500);
  }
});

// 3. GET /api/admin/session (Get Admin Session status)
app.get("/session", async (c) => {
  const adminSessionId = c.get("adminSessionId");
  try {
    const session = await c.env.DB.prepare(
      "SELECT id, device_label, created_at FROM admin_sessions WHERE id = ?",
    )
      .bind(adminSessionId)
      .first<any>();

    if (!session) {
      return c.json({ authenticated: false });
    }

    return c.json({
      authenticated: true,
      session: {
        id: session.id,
        deviceLabel: session.device_label,
        createdAt: session.created_at,
      },
    });
  } catch {
    return c.json({ authenticated: false });
  }
});

// 4. GET /api/admin/dashboard (Dashboard statistics)
app.get("/dashboard", async (c) => {
  try {
    const active = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM members WHERE membership_status = 'active'",
    ).first<any>();
    const pendingReg = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM members WHERE membership_status = 'pending'",
    ).first<any>();
    const pendingClaim = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM account_claims WHERE status = 'pending'",
    ).first<any>();
    const newRegistrations = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM members WHERE registration_source = 'public_registration' AND created_at >= datetime('now', '-30 days')",
    ).first<any>();
    const unclaimedCount = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM members m LEFT JOIN member_accounts a ON m.id = a.member_id WHERE a.id IS NULL AND m.membership_status = 'active'",
    ).first<any>();

    const recentMembers = await c.env.DB.prepare(
      "SELECT id, full_name, membership_status, created_at, updated_at FROM members ORDER BY updated_at DESC LIMIT 5",
    )
      .all()
      .then((res) => res.results);

    return c.json({
      stats: {
        totalActive: active?.count || 0,
        pendingRegistrations: pendingReg?.count || 0,
        pendingClaims: pendingClaim?.count || 0,
        newRegistrations: newRegistrations?.count || 0,
        unclaimedActive: unclaimedCount?.count || 0,
      },
      recentMembers,
    });
  } catch (err) {
    return c.json({ error: "Ralat mendapatkan data papan pemuka." }, 500);
  }
});

// 4b. GET /api/admin/settings/registration-approval
app.get("/settings/registration-approval", async (c) => {
  try {
    const setting = await c.env.DB.prepare(
      `SELECT value, updated_at
       FROM system_settings
       WHERE key = 'registration_approval_mode'`,
    ).first<any>();

    return c.json({
      mode: setting?.value === "automatic" ? "automatic" : "manual",
      updatedAt: setting?.updated_at || null,
    });
  } catch {
    return c.json({ error: "Ralat mendapatkan tetapan kelulusan." }, 500);
  }
});

// 4c. PUT /api/admin/settings/registration-approval
app.put("/settings/registration-approval", async (c) => {
  const adminSessionId = c.get("adminSessionId");
  const body = await c.req.json();
  const mode = body?.mode;

  if (mode !== "manual" && mode !== "automatic") {
    return c.json(
      { error: "Mod kelulusan mesti 'manual' atau 'automatic'." },
      400,
    );
  }

  try {
    const current = await c.env.DB.prepare(
      `SELECT value
       FROM system_settings
       WHERE key = 'registration_approval_mode'`,
    ).first<any>();
    const previousMode =
      current?.value === "automatic" ? "automatic" : "manual";

    if (previousMode === mode) {
      return c.json({
        success: true,
        mode,
        message: "Tetapan kelulusan tidak berubah.",
      });
    }

    const nowStr = new Date().toISOString();
    await c.env.DB.prepare(
      `INSERT INTO system_settings (key, value, updated_at, updated_by)
       VALUES ('registration_approval_mode', ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`,
    )
      .bind(mode, nowStr, adminSessionId)
      .run();

    return c.json({
      success: true,
      mode,
      message:
        mode === "automatic"
          ? "Auto lulus telah diaktifkan untuk pendaftaran baharu."
          : "Kelulusan manual telah diaktifkan untuk pendaftaran baharu.",
    });
  } catch {
    return c.json({ error: "Ralat menyimpan tetapan kelulusan." }, 500);
  }
});

// 5. GET /api/admin/members (Dynamic Search with parameterised queries)
app.get("/members", async (c) => {
  const q = c.req.query("q") || "";
  const ic = c.req.query("ic") || "";
  const phone = c.req.query("phone") || "";
  const status = c.req.query("status") || "";
  const accountState = c.req.query("accountState") || "";
  const directoryVisible = c.req.query("directoryVisible") || "";
  const sortBy = c.req.query("sortBy") || "name"; // name, created, updated
  const sortOrder = c.req.query("sortOrder") || "ASC";
  const page = parseInt(c.req.query("page") || "1", 10);

  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    let sql = `
      SELECT id, full_name, ic_normalized, ic_last4, phone_normalized, address, general_area,
             membership_status, account_state, directory_visible, created_at, updated_at
      FROM members WHERE 1=1
    `;
    const params: any[] = [];

    // Filter by name (live search using FTS5 if q >= 2)
    if (q.trim().length >= 2) {
      const cleaned = q.replace(/[^\p{L}\p{N}\s]/gu, "").trim();
      if (cleaned) {
        sql += ` AND id IN (SELECT member_id FROM members_fts WHERE members_fts MATCH ?)`;
        params.push(`${cleaned}*`);
      }
    }

    // Exact IC search (requires full normalised 12 digits)
    if (ic.trim()) {
      const cleanedIc = cleanIc(ic);
      sql += ` AND ic_normalized = ?`;
      params.push(cleanedIc);
    }

    // Phone search
    if (phone.trim()) {
      const cleanedPhone = phone.trim();
      sql += ` AND phone_normalized LIKE ?`;
      params.push(`%${cleanedPhone}%`);
    }

    // Status filter
    if (status) {
      sql += ` AND membership_status = ?`;
      params.push(status);
    }

    // Account State filter
    if (accountState) {
      sql += ` AND account_state = ?`;
      params.push(accountState);
    }

    // Directory visible filter
    if (directoryVisible !== "") {
      sql += ` AND directory_visible = ?`;
      params.push(directoryVisible === "1" ? 1 : 0);
    }

    // Sorting
    let orderBySql = " ORDER BY full_name ASC";
    if (sortBy === "created") {
      orderBySql = ` ORDER BY created_at ${sortOrder === "DESC" ? "DESC" : "ASC"}`;
    } else if (sortBy === "updated") {
      orderBySql = ` ORDER BY updated_at ${sortOrder === "DESC" ? "DESC" : "ASC"}`;
    } else if (sortOrder === "DESC") {
      orderBySql = " ORDER BY full_name DESC";
    }

    sql += orderBySql + " LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const members = await c.env.DB.prepare(sql)
      .bind(...params)
      .all()
      .then((res) => res.results);

    // Get total count for pagination
    let countSql = "SELECT COUNT(*) as count FROM members WHERE 1=1";
    const countParams: any[] = [];

    if (q.trim().length >= 2) {
      const cleaned = q.replace(/[^\p{L}\p{N}\s]/gu, "").trim();
      if (cleaned) {
        countSql += ` AND id IN (SELECT member_id FROM members_fts WHERE members_fts MATCH ?)`;
        countParams.push(`${cleaned}*`);
      }
    }
    if (ic.trim()) {
      countSql += ` AND ic_normalized = ?`;
      countParams.push(cleanIc(ic));
    }
    if (phone.trim()) {
      countSql += ` AND phone_normalized LIKE ?`;
      countParams.push(`%${phone.trim()}%`);
    }
    if (status) {
      countSql += ` AND membership_status = ?`;
      countParams.push(status);
    }
    if (accountState) {
      countSql += ` AND account_state = ?`;
      countParams.push(accountState);
    }
    if (directoryVisible !== "") {
      countSql += ` AND directory_visible = ?`;
      countParams.push(directoryVisible === "1" ? 1 : 0);
    }

    const total = await c.env.DB.prepare(countSql)
      .bind(...countParams)
      .first<any>();

    return c.json({
      members,
      pagination: {
        total: total?.count || 0,
        page,
        limit,
        totalPages: Math.ceil((total?.count || 0) / limit),
      },
    });
  } catch (err) {
    return c.json({ error: "Ralat melakukan carian ahli." }, 500);
  }
});

// 5b. GET /api/admin/members/export (Export all members matching current filters)
app.get("/members/export", async (c) => {
  const q = c.req.query("q") || "";
  const ic = c.req.query("ic") || "";
  const phone = c.req.query("phone") || "";
  const status = c.req.query("status") || "";
  const accountState = c.req.query("accountState") || "";
  const sortBy = c.req.query("sortBy") || "name";
  const sortOrder = c.req.query("sortOrder") || "ASC";

  try {
    let sql = `
      SELECT full_name, ic_normalized, phone_normalized, address, general_area,
             membership_status, account_state, directory_visible, created_at
      FROM members WHERE 1=1
    `;
    const params: any[] = [];

    if (q.trim().length >= 2) {
      const cleaned = q.replace(/[^\p{L}\p{N}\s]/gu, "").trim();
      if (cleaned) {
        sql += ` AND id IN (SELECT member_id FROM members_fts WHERE members_fts MATCH ?)`;
        params.push(`${cleaned}*`);
      }
    }
    if (ic.trim()) {
      sql += ` AND ic_normalized = ?`;
      params.push(cleanIc(ic));
    }
    if (phone.trim()) {
      sql += ` AND phone_normalized LIKE ?`;
      params.push(`%${phone.trim()}%`);
    }
    if (status) {
      sql += ` AND membership_status = ?`;
      params.push(status);
    }
    if (accountState) {
      sql += ` AND account_state = ?`;
      params.push(accountState);
    }

    if (sortBy === "created") {
      sql += ` ORDER BY created_at ${sortOrder === "DESC" ? "DESC" : "ASC"}`;
    } else if (sortBy === "updated") {
      sql += ` ORDER BY updated_at ${sortOrder === "DESC" ? "DESC" : "ASC"}`;
    } else {
      sql += ` ORDER BY full_name ${sortOrder === "DESC" ? "DESC" : "ASC"}`;
    }

    const members = await c.env.DB.prepare(sql)
      .bind(...params)
      .all()
      .then((res) => res.results);

    return c.json({ members });
  } catch {
    return c.json(
      { error: "Ralat menyediakan senarai ahli untuk eksport." },
      500,
    );
  }
});

// 6. GET /api/admin/members/:id (Fetch member detail)
app.get("/members/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const member = await c.env.DB.prepare(
      `SELECT id, legacy_id, full_name, ic_normalized, ic_last4, birth_date, phone_normalized,
              address, general_area, membership_status, account_state, directory_visible,
              directory_consent_at, registration_source, admin_notes, created_at, updated_at,
              approved_at, approved_by, deactivated_at
       FROM members WHERE id = ?`,
    )
      .bind(id)
      .first<any>();

    if (!member) {
      return c.json({ error: "Ahli tidak ditemui." }, 404);
    }

    // Get account details if any
    const account = await c.env.DB.prepare(
      "SELECT id, username, failed_login_count, locked_until, password_changed_at, created_at FROM member_accounts WHERE member_id = ?",
    )
      .bind(id)
      .first<any>();

    return c.json({ member, account });
  } catch (err) {
    return c.json(
      { error: "Ralat pelayan semasa mendapatkan butiran ahli." },
      500,
    );
  }
});

// 7. PATCH /api/admin/members/:id (Edit member detail)
app.patch("/members/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { fullName, ic, phone, address, generalArea, adminNotes, reason } =
    body;

  if (!reason) {
    return c.json(
      {
        error: "Sebab pengemaskinian profil diperlukan.",
      },
      400,
    );
  }

  const nowStr = new Date().toISOString();

  try {
    const existing = await c.env.DB.prepare(
      "SELECT full_name, ic_normalized, phone_normalized, address, general_area, admin_notes FROM members WHERE id = ?",
    )
      .bind(id)
      .first<any>();

    if (!existing) {
      return c.json({ error: "Ahli tidak ditemui." }, 404);
    }

    const cleanedIc = ic ? cleanIc(ic) : existing.ic_normalized;
    const cleanedPhone = phone
      ? normalizePhone(phone) || existing.phone_normalized
      : existing.phone_normalized;

    const changes: Record<string, any> = {};
    if (fullName && fullName !== existing.full_name)
      changes.full_name = fullName;
    if (ic && cleanedIc !== existing.ic_normalized)
      changes.ic_normalized = cleanedIc;
    if (phone && cleanedPhone !== existing.phone_normalized)
      changes.phone_normalized = cleanedPhone;
    if (address && address !== existing.address) changes.address = address;
    if (generalArea !== undefined && generalArea !== existing.general_area)
      changes.general_area = generalArea;
    if (adminNotes !== undefined && adminNotes !== existing.admin_notes)
      changes.admin_notes = adminNotes;

    if (Object.keys(changes).length === 0) {
      return c.json({ success: true, message: "Tiada perubahan dikesan." });
    }

    const columns = Object.keys(changes)
      .map((k) => `${k} = ?`)
      .join(", ");
    const params = Object.values(changes);
    params.push(nowStr, id);

    // If name is updated, also update full_name_normalized
    let finalColumns = columns;
    if (changes.full_name) {
      finalColumns += ", full_name_normalized = ?";
      params.splice(
        params.length - 2,
        0,
        changes.full_name.toUpperCase().trim(),
      );
    }

    // If IC is updated, also update ic_last4
    if (changes.ic_normalized) {
      finalColumns += ", ic_last4 = ?";
      params.splice(params.length - 2, 0, changes.ic_normalized.substring(8));
    }

    await c.env.DB.prepare(
      `UPDATE members SET ${finalColumns}, updated_at = ? WHERE id = ?`,
    )
      .bind(...params)
      .run();

    return c.json({
      success: true,
      message: "Maklumat ahli berjaya dikemaskini.",
    });
  } catch (err) {
    return c.json(
      { error: "Ralat pelayan semasa mengemaskini maklumat ahli." },
      500,
    );
  }
});

// 7b. DELETE /api/admin/members/:id (Permanently delete an eligible member)
app.delete("/members/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { confirmationName } = body;

  if (!confirmationName || typeof confirmationName !== "string") {
    return c.json(
      { error: "Taip nama penuh ahli untuk mengesahkan pemadaman." },
      400,
    );
  }

  try {
    const member = await c.env.DB.prepare(
      `SELECT id, full_name, registration_source, account_state, membership_status
       FROM members WHERE id = ?`,
    )
      .bind(id)
      .first<any>();

    if (!member) {
      return c.json({ error: "Ahli tidak ditemui." }, 404);
    }

    const normalizeName = (value: string) =>
      value.toUpperCase().replace(/\s+/g, " ").trim();

    if (normalizeName(confirmationName) !== normalizeName(member.full_name)) {
      return c.json(
        { error: "Nama pengesahan tidak sepadan dengan nama rekod ahli." },
        400,
      );
    }

    const isInactive = member.membership_status === "inactive";
    const isUnclaimedLegacy =
      member.registration_source === "legacy_import" &&
      member.account_state === "unclaimed";

    if (!isInactive && !isUnclaimedLegacy) {
      return c.json(
        {
          error:
            "Hanya ahli berstatus Tidak Aktif atau rekod import lama yang belum dituntut boleh dipadam kekal.",
        },
        409,
      );
    }

    // An inactive member may be deleted together with their related account
    // and sessions through the schema's ON DELETE CASCADE constraints.
    if (!isInactive) {
      const account = await c.env.DB.prepare(
        "SELECT id FROM member_accounts WHERE member_id = ? LIMIT 1",
      )
        .bind(id)
        .first();

      if (account) {
        return c.json(
          {
            error:
              "Rekod import ini mempunyai akaun pengguna. Tukar status kepada Tidak Aktif sebelum memadamnya.",
          },
          409,
        );
      }
    }

    await c.env.DB.prepare(
      `DELETE FROM members
       WHERE id = ? AND (
         membership_status = 'inactive' OR
         (registration_source = 'legacy_import' AND account_state = 'unclaimed')
       )`,
    )
      .bind(id)
      .run();

    return c.json({
      success: true,
      message: "Rekod ahli dan akaun berkaitan berjaya dipadam secara kekal.",
    });
  } catch (err) {
    return c.json({ error: "Ralat pelayan semasa memadam rekod ahli." }, 500);
  }
});

// 8. POST /api/admin/members/:id/approve (Approve Registration)
app.post("/members/:id/approve", async (c) => {
  const id = c.req.param("id");
  const adminSessionId = c.get("adminSessionId");
  const nowStr = new Date().toISOString();

  try {
    const member = await c.env.DB.prepare(
      "SELECT membership_status FROM members WHERE id = ?",
    )
      .bind(id)
      .first<any>();
    if (!member) {
      return c.json({ error: "Ahli tidak ditemui." }, 404);
    }

    if (member.membership_status !== "pending") {
      return c.json(
        { error: "Status keahlian ini tidak boleh diluluskan." },
        400,
      );
    }

    await c.env.DB.prepare(
      "UPDATE members SET membership_status = 'active', approved_at = ?, approved_by = ?, updated_at = ? WHERE id = ?",
    )
      .bind(nowStr, adminSessionId, nowStr, id)
      .run();

    return c.json({
      success: true,
      message: "Permohonan keahlian berjaya diluluskan.",
    });
  } catch (err) {
    return c.json({ error: "Ralat pelayan semasa meluluskan keahlian." }, 500);
  }
});

// 9. POST /api/admin/members/:id/reject (Reject Registration)
app.post("/members/:id/reject", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { reason } = body;

  if (!reason) {
    return c.json(
      { error: "Sebab penolakan permohonan keahlian diperlukan." },
      400,
    );
  }

  const nowStr = new Date().toISOString();

  try {
    const member = await c.env.DB.prepare(
      "SELECT membership_status FROM members WHERE id = ?",
    )
      .bind(id)
      .first<any>();
    if (!member) {
      return c.json({ error: "Ahli tidak ditemui." }, 404);
    }

    if (member.membership_status !== "pending") {
      return c.json(
        {
          error: "Hanya permohonan berstatus menunggu (pending) boleh ditolak.",
        },
        400,
      );
    }

    await c.env.DB.prepare(
      "UPDATE members SET membership_status = 'rejected', admin_notes = ?, updated_at = ? WHERE id = ?",
    )
      .bind(reason, nowStr, id)
      .run();

    return c.json({ success: true, message: "Permohonan keahlian ditolak." });
  } catch (err) {
    return c.json({ error: "Ralat pelayan semasa menolak keahlian." }, 500);
  }
});

// 10. POST /api/admin/members/:id/deactivate (Deactivate Member)
app.post("/members/:id/deactivate", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { reason } = body;

  if (!reason) {
    return c.json({ error: "Sebab penyahaktifan keahlian diperlukan." }, 400);
  }

  const nowStr = new Date().toISOString();

  try {
    const member = await c.env.DB.prepare(
      "SELECT membership_status FROM members WHERE id = ?",
    )
      .bind(id)
      .first<any>();
    if (!member) {
      return c.json({ error: "Ahli tidak ditemui." }, 404);
    }

    if (member.membership_status !== "active") {
      return c.json(
        { error: "Hanya keahlian aktif boleh dinyahaktifkan." },
        400,
      );
    }

    await c.env.DB.prepare(
      "UPDATE members SET membership_status = 'inactive', deactivated_at = ?, updated_at = ? WHERE id = ?",
    )
      .bind(nowStr, nowStr, id)
      .run();

    return c.json({
      success: true,
      message: "Keahlian berjaya dinyahaktifkan.",
    });
  } catch (err) {
    return c.json(
      { error: "Ralat pelayan semasa menyahaktifkan keahlian." },
      500,
    );
  }
});

// 10b. POST /api/admin/members/:id/set-status (Change membership lifecycle status)
app.post("/members/:id/set-status", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { status, reason } = body;

  const allowedStatuses = ["active", "inactive", "moved", "deceased"];
  if (!status || !allowedStatuses.includes(status)) {
    return c.json(
      {
        error:
          "Status tidak sah. Gunakan 'active', 'inactive', 'moved' atau 'deceased'.",
      },
      400,
    );
  }

  if (!reason) {
    return c.json({ error: "Sebab perubahan status diperlukan." }, 400);
  }

  const nowStr = new Date().toISOString();

  try {
    const member = await c.env.DB.prepare(
      "SELECT membership_status, full_name FROM members WHERE id = ?",
    )
      .bind(id)
      .first<any>();

    if (!member) {
      return c.json({ error: "Ahli tidak ditemui." }, 404);
    }

    if (member.membership_status === status) {
      return c.json(
        { error: "Status baharu mesti berbeza daripada status semasa." },
        400,
      );
    }

    if (status === "active") {
      await c.env.DB.prepare(
        "UPDATE members SET membership_status = ?, deactivated_at = NULL, updated_at = ? WHERE id = ?",
      )
        .bind(status, nowStr, id)
        .run();
    } else {
      await c.env.DB.prepare(
        "UPDATE members SET membership_status = ?, directory_visible = 0, deactivated_at = ?, updated_at = ? WHERE id = ?",
      )
        .bind(status, nowStr, nowStr, id)
        .run();
    }

    const statusConfig = {
      active: { label: "Aktif" },
      inactive: { label: "Tidak Aktif" },
      moved: { label: "Berpindah" },
      deceased: { label: "Meninggal Dunia" },
    }[status as "active" | "inactive" | "moved" | "deceased"];

    return c.json({
      success: true,
      message:
        status === "active"
          ? `Status ahli berjaya dikemaskini kepada: ${statusConfig.label}. Tetapan direktori sedia ada dikekalkan.`
          : `Status ahli berjaya dikemaskini kepada: ${statusConfig.label}. Profil disembunyikan daripada direktori awam.`,
    });
  } catch (err) {
    return c.json(
      { error: "Ralat pelayan semasa mengemaskini status ahli." },
      500,
    );
  }
});

// 11. POST /api/admin/members/:id/activate (Activate Inactive Member)
app.post("/members/:id/activate", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { reason } = body;

  if (!reason) {
    return c.json(
      { error: "Sebab pengaktifan semula keahlian diperlukan." },
      400,
    );
  }

  const nowStr = new Date().toISOString();

  try {
    const member = await c.env.DB.prepare(
      "SELECT membership_status FROM members WHERE id = ?",
    )
      .bind(id)
      .first<any>();
    if (!member) {
      return c.json({ error: "Ahli tidak ditemui." }, 404);
    }

    if (
      member.membership_status !== "inactive" &&
      member.membership_status !== "rejected" &&
      member.membership_status !== "moved" &&
      member.membership_status !== "deceased"
    ) {
      return c.json(
        {
          error:
            "Hanya ahli tidak aktif, ditolak, berpindah atau meninggal dunia boleh diaktifkan semula.",
        },
        400,
      );
    }

    await c.env.DB.prepare(
      "UPDATE members SET membership_status = 'active', updated_at = ? WHERE id = ?",
    )
      .bind(nowStr, id)
      .run();

    return c.json({
      success: true,
      message: "Keahlian berjaya diaktifkan semula.",
    });
  } catch (err) {
    return c.json(
      { error: "Ralat pelayan semasa mengaktifkan keahlian." },
      500,
    );
  }
});

// 12. GET /api/admin/claims (Fetch all claims)
app.get("/claims", async (c) => {
  try {
    const claims = await c.env.DB.prepare(
      `SELECT c.id, c.member_id, c.requested_username, c.status, c.reference_code, c.requested_at,
              m.full_name, m.ic_normalized, m.phone_normalized
       FROM account_claims c
       JOIN members m ON c.member_id = m.id
       ORDER BY c.requested_at DESC`,
    )
      .all()
      .then((res) => res.results);

    return c.json({ claims });
  } catch (err) {
    return c.json(
      { error: "Ralat pelayan semasa mendapatkan rekod tuntutan." },
      500,
    );
  }
});

// 13. POST /api/admin/claims/:id/approve (Approve Claim)
app.post("/claims/:id/approve", async (c) => {
  const id = c.req.param("id");
  const adminSessionId = c.get("adminSessionId");
  const nowStr = new Date().toISOString();

  try {
    // Find claim
    const claim = await c.env.DB.prepare(
      "SELECT member_id, requested_username, requested_username_normalized, pending_password_hash, requested_ic_normalized, requested_phone_normalized, status FROM account_claims WHERE id = ?",
    )
      .bind(id)
      .first<any>();

    if (!claim) {
      return c.json({ error: "Rekod tuntutan tidak ditemui." }, 404);
    }

    if (claim.status !== "pending") {
      return c.json(
        { error: "Tuntutan akaun ini telah diproses sebelum ini." },
        400,
      );
    }

    // Verify username availability again
    const usernameTaken = await c.env.DB.prepare(
      "SELECT id FROM member_accounts WHERE username_normalized = ?",
    )
      .bind(claim.requested_username_normalized)
      .first();

    if (usernameTaken) {
      return c.json(
        { error: "Nama pengguna yang dipohon telah diambil oleh akaun lain." },
        400,
      );
    }

    const accountId = crypto.randomUUID();
    const icNormalized = claim.requested_ic_normalized || "";
    const phoneNormalized = claim.requested_phone_normalized || "";
    const icLast4 = icNormalized ? icNormalized.slice(-4) : "";
    const parsedIc = icNormalized ? parseIc(icNormalized) : null;
    const birthDate = parsedIc ? parsedIc.birthDate : null;

    // Create member account and set state to active, and set claim to approved
    const createAccount = c.env.DB.prepare(
      `INSERT INTO member_accounts (
        id, member_id, username, username_normalized, password_hash, failed_login_count, password_changed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    ).bind(
      accountId,
      claim.member_id,
      claim.requested_username,
      claim.requested_username_normalized,
      claim.pending_password_hash,
      nowStr,
      nowStr,
      nowStr,
    );

    const updateMember = c.env.DB.prepare(
      `UPDATE members 
       SET ic_normalized = ?,
           ic_last4 = ?,
           birth_date = ?,
           phone_normalized = ?,
           account_state = 'active', 
           membership_status = 'active', 
           updated_at = ? 
       WHERE id = ?`,
    ).bind(
      icNormalized,
      icLast4,
      birthDate,
      phoneNormalized,
      nowStr,
      claim.member_id,
    );

    const approveClaim = c.env.DB.prepare(
      "UPDATE account_claims SET status = 'approved', reviewed_at = ?, reviewed_by = ? WHERE id = ?",
    ).bind(nowStr, adminSessionId, id);

    await c.env.DB.batch([createAccount, updateMember, approveClaim]);

    return c.json({
      success: true,
      message: "Permohonan tuntutan akaun berjaya diluluskan.",
    });
  } catch (err) {
    return c.json({ error: "Ralat pelayan semasa meluluskan tuntutan." }, 500);
  }
});

// 14. POST /api/admin/claims/:id/reject (Reject Claim)
app.post("/claims/:id/reject", async (c) => {
  const id = c.req.param("id");
  const adminSessionId = c.get("adminSessionId");
  const body = await c.req.json();
  const { reason } = body;

  if (!reason) {
    return c.json({ error: "Sebab penolakan tuntutan akaun diperlukan." }, 400);
  }

  const nowStr = new Date().toISOString();

  try {
    const claim = await c.env.DB.prepare(
      "SELECT member_id, status FROM account_claims WHERE id = ?",
    )
      .bind(id)
      .first<any>();
    if (!claim) {
      return c.json({ error: "Rekod tuntutan tidak ditemui." }, 404);
    }

    if (claim.status !== "pending") {
      return c.json(
        { error: "Rekod tuntutan ini telah diproses sebelum ini." },
        400,
      );
    }

    const rejectClaim = c.env.DB.prepare(
      "UPDATE account_claims SET status = 'rejected', rejection_reason = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?",
    ).bind(reason, nowStr, adminSessionId, id);

    const revertMember = c.env.DB.prepare(
      "UPDATE members SET account_state = 'unclaimed', updated_at = ? WHERE id = ?",
    ).bind(nowStr, claim.member_id);

    await c.env.DB.batch([rejectClaim, revertMember]);

    return c.json({
      success: true,
      message: "Permohonan tuntutan akaun ditolak.",
    });
  } catch (err) {
    return c.json({ error: "Ralat pelayan semasa menolak tuntutan." }, 500);
  }
});

// POST /api/admin/accounts/:id/reset-code (Admin Account Reset Code Generator)
app.post("/accounts/:id/reset-code", async (c) => {
  const memberId = c.req.param("id"); // ID member
  const adminSessionId = c.get("adminSessionId");
  const body = await c.req.json();
  const { reason } = body;

  if (!reason) {
    return c.json({ error: "Sebab penjanaan kod set semula diperlukan." }, 400);
  }

  const nowStr = new Date().toISOString();

  try {
    // Get account details
    const account = await c.env.DB.prepare(
      "SELECT id, username FROM member_accounts WHERE member_id = ?",
    )
      .bind(memberId)
      .first<any>();

    if (!account) {
      return c.json(
        { error: "Akaun ahli ini tidak ditemui (mungkin belum dituntut)." },
        404,
      );
    }

    // Generate random 6 digit numeric code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenHash = hashSessionToken(resetCode);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours expiry
    const id = crypto.randomUUID();

    // Store in password_reset_tokens
    await c.env.DB.prepare(
      `INSERT INTO password_reset_tokens (id, account_id, token_hash, expires_at, created_by_admin_session_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, account.id, tokenHash, expiresAt, adminSessionId, nowStr)
      .run();

    return c.json({
      success: true,
      resetCode,
      username: account.username,
      message: "Kod set semula kata laluan 6 digit dijana. Sah untuk 24 jam.",
    });
  } catch (err) {
    return c.json(
      { error: "Ralat pelayan semasa menjana kod set semula kata laluan." },
      500,
    );
  }
});

// 19. GET /api/admin/sessions (List active admin sessions)
app.get("/sessions", async (c) => {
  const currentSessionId = c.get("adminSessionId");
  try {
    const sessions = await c.env.DB.prepare(
      "SELECT id, device_label, created_at, last_used_at FROM admin_sessions WHERE revoked_at IS NULL AND expires_at > ?",
    )
      .bind(new Date().toISOString())
      .all()
      .then((res) => res.results);

    return c.json({ sessions, currentSessionId });
  } catch (err) {
    return c.json(
      { error: "Ralat pelayan semasa mendapatkan sesi pentadbir." },
      500,
    );
  }
});

// 20. DELETE /api/admin/sessions/:id (Revoke one session)
app.delete("/sessions/:id", async (c) => {
  const sessionIdToRevoke = c.req.param("id");
  const nowStr = new Date().toISOString();

  try {
    await c.env.DB.prepare(
      "UPDATE admin_sessions SET revoked_at = ? WHERE id = ?",
    )
      .bind(nowStr, sessionIdToRevoke)
      .run();

    return c.json({
      success: true,
      message: "Sesi peranti berjaya dibatalkan.",
    });
  } catch (err) {
    return c.json({ error: "Ralat pelayan semasa membatalkan sesi." }, 500);
  }
});

// 21. POST /api/admin/sessions/revoke-others (Revoke all other sessions)
app.post("/sessions/revoke-others", async (c) => {
  const adminSessionId = c.get("adminSessionId");
  const nowStr = new Date().toISOString();

  try {
    await c.env.DB.prepare(
      "UPDATE admin_sessions SET revoked_at = ? WHERE id != ? AND revoked_at IS NULL",
    )
      .bind(nowStr, adminSessionId)
      .run();

    return c.json({
      success: true,
      message: "Semua sesi peranti lain berjaya dibatalkan.",
    });
  } catch (err) {
    return c.json(
      { error: "Ralat pelayan semasa membatalkan sesi lain." },
      500,
    );
  }
});

export default app;
