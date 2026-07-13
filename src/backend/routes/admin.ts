import { Hono } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { Bindings, createAuditLog } from "../db.ts";
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
    // Write failure audit log
    await createAuditLog(
      c.env.DB,
      "system",
      null,
      "ADMIN_LOGIN_FAILURE",
      "admin_sessions",
      null,
      JSON.stringify({ deviceLabel }),
      "Cubaan log masuk pentadbir dengan kata kunci salah",
    );
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

    // Write audit log
    await createAuditLog(
      c.env.DB,
      "admin",
      sessionId,
      "ADMIN_LOGIN_SUCCESS",
      "admin_sessions",
      sessionId,
      JSON.stringify({ deviceLabel }),
      "Pendaftaran peranti pentadbir berjaya",
    );

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

    await createAuditLog(
      c.env.DB,
      "admin",
      adminSessionId,
      "ADMIN_LOGOUT",
      "admin_sessions",
      adminSessionId,
      null,
      "Pentadbir log keluar peranti",
    );

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
    const pendingCorr = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM correction_requests WHERE status = 'pending'",
    ).first<any>();
    const needsReview = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM members WHERE membership_status = 'needs_review'",
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
        pendingCorrections: pendingCorr?.count || 0,
        needsReview: needsReview?.count || 0,
        unclaimedActive: unclaimedCount?.count || 0,
      },
      recentMembers,
    });
  } catch (err) {
    return c.json({ error: "Ralat mendapatkan data papan pemuka." }, 500);
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
  const adminSessionId = c.get("adminSessionId");
  const body = await c.req.json();
  const { fullName, ic, phone, address, generalArea, adminNotes, reason } =
    body;

  if (!reason) {
    return c.json(
      {
        error: "Sebab pengemaskinian profil diperlukan untuk tujuan log audit.",
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

    // Audit log
    await createAuditLog(
      c.env.DB,
      "admin",
      adminSessionId,
      "MEMBER_EDIT",
      "members",
      id,
      JSON.stringify(changes),
      reason,
    );

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

// 7b. DELETE /api/admin/members/:id (Permanently delete an unclaimed legacy record)
app.delete("/members/:id", async (c) => {
  const id = c.req.param("id");
  const adminSessionId = c.get("adminSessionId");
  const body = await c.req.json();
  const { reason, confirmationName } = body;

  if (!reason || reason.trim().length < 5) {
    return c.json(
      { error: "Sebab pemadaman sekurang-kurangnya 5 aksara diperlukan." },
      400,
    );
  }

  if (!confirmationName || typeof confirmationName !== "string") {
    return c.json(
      { error: "Taip nama penuh ahli untuk mengesahkan pemadaman." },
      400,
    );
  }

  try {
    const member = await c.env.DB.prepare(
      `SELECT id, full_name, registration_source, account_state
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

    if (
      member.registration_source !== "legacy_import" ||
      member.account_state !== "unclaimed"
    ) {
      return c.json(
        {
          error:
            "Hanya rekod import lama yang belum dituntut boleh dipadam kekal. Gunakan nyahaktif untuk rekod lain.",
        },
        409,
      );
    }

    const account = await c.env.DB.prepare(
      "SELECT id FROM member_accounts WHERE member_id = ? LIMIT 1",
    )
      .bind(id)
      .first();

    if (account) {
      return c.json(
        {
          error:
            "Rekod ini mempunyai akaun pengguna dan tidak boleh dipadam kekal.",
        },
        409,
      );
    }

    const nowStr = new Date().toISOString();
    const auditStatement = c.env.DB.prepare(
      `INSERT INTO audit_logs (
        id, actor_type, actor_id, action, entity_type, entity_id,
        changed_fields_json, reason, created_at
      ) VALUES (?, 'admin', ?, 'MEMBER_DELETE_PERMANENT', 'members', ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      adminSessionId,
      id,
      JSON.stringify({
        registrationSource: member.registration_source,
        accountState: member.account_state,
      }),
      reason.trim(),
      nowStr,
    );

    const deleteStatement = c.env.DB.prepare(
      `DELETE FROM members
       WHERE id = ? AND registration_source = 'legacy_import' AND account_state = 'unclaimed'`,
    ).bind(id);

    await c.env.DB.batch([auditStatement, deleteStatement]);

    return c.json({
      success: true,
      message: "Rekod ahli lama berjaya dipadam secara kekal.",
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

    if (
      member.membership_status !== "pending" &&
      member.membership_status !== "needs_review"
    ) {
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

    // Audit log
    await createAuditLog(
      c.env.DB,
      "admin",
      adminSessionId,
      "MEMBER_APPROVE",
      "members",
      id,
      JSON.stringify({
        statusBefore: member.membership_status,
        statusAfter: "active",
      }),
      "Permohonan pendaftaran diluluskan oleh pentadbir",
    );

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
  const adminSessionId = c.get("adminSessionId");
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

    // Audit log
    await createAuditLog(
      c.env.DB,
      "admin",
      adminSessionId,
      "MEMBER_REJECT",
      "members",
      id,
      null,
      reason,
    );

    return c.json({ success: true, message: "Permohonan keahlian ditolak." });
  } catch (err) {
    return c.json({ error: "Ralat pelayan semasa menolak keahlian." }, 500);
  }
});

// 10. POST /api/admin/members/:id/deactivate (Deactivate Member)
app.post("/members/:id/deactivate", async (c) => {
  const id = c.req.param("id");
  const adminSessionId = c.get("adminSessionId");
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

    // Audit log
    await createAuditLog(
      c.env.DB,
      "admin",
      adminSessionId,
      "MEMBER_DEACTIVATE",
      "members",
      id,
      null,
      reason,
    );

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
  const adminSessionId = c.get("adminSessionId");
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
      active: { action: "MEMBER_ACTIVATED", label: "Aktif" },
      inactive: { action: "MEMBER_DEACTIVATED", label: "Tidak Aktif" },
      moved: { action: "MEMBER_MOVED", label: "Berpindah" },
      deceased: { action: "MEMBER_DECEASED", label: "Meninggal Dunia" },
    }[status as "active" | "inactive" | "moved" | "deceased"];

    await createAuditLog(
      c.env.DB,
      "admin",
      adminSessionId,
      statusConfig.action,
      "members",
      id,
      JSON.stringify({
        previousStatus: member.membership_status,
        newStatus: status,
      }),
      reason,
    );

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
  const adminSessionId = c.get("adminSessionId");
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

    // Audit log
    await createAuditLog(
      c.env.DB,
      "admin",
      adminSessionId,
      "MEMBER_ACTIVATE",
      "members",
      id,
      null,
      reason,
    );

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

    // Audit log
    await createAuditLog(
      c.env.DB,
      "admin",
      adminSessionId,
      "CLAIM_APPROVE",
      "account_claims",
      id,
      JSON.stringify({ username: claim.requested_username }),
      "Tuntutan akaun diluluskan",
    );

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

    // Audit log
    await createAuditLog(
      c.env.DB,
      "admin",
      adminSessionId,
      "CLAIM_REJECT",
      "account_claims",
      id,
      null,
      reason,
    );

    return c.json({
      success: true,
      message: "Permohonan tuntutan akaun ditolak.",
    });
  } catch (err) {
    return c.json({ error: "Ralat pelayan semasa menolak tuntutan." }, 500);
  }
});

// 15. GET /api/admin/corrections (Fetch all correction requests)
app.get("/corrections", async (c) => {
  try {
    const corrections = await c.env.DB.prepare(
      `SELECT c.id, c.member_id, c.requested_changes_json, c.status, c.requested_at,
              m.full_name, m.ic_normalized, m.phone_normalized, m.address, m.general_area
       FROM correction_requests c
       JOIN members m ON c.member_id = m.id
       ORDER BY c.requested_at DESC`,
    )
      .all()
      .then((res) => res.results);

    return c.json({ corrections });
  } catch (err) {
    return c.json(
      { error: "Ralat pelayan semasa mendapatkan rekod pembetulan." },
      500,
    );
  }
});

// 16. POST /api/admin/corrections/:id/approve (Approve Correction)
app.post("/corrections/:id/approve", async (c) => {
  const id = c.req.param("id");
  const adminSessionId = c.get("adminSessionId");
  const nowStr = new Date().toISOString();

  try {
    const request = await c.env.DB.prepare(
      "SELECT member_id, requested_changes_json, status FROM correction_requests WHERE id = ?",
    )
      .bind(id)
      .first<any>();

    if (!request) {
      return c.json({ error: "Rekod pembetulan tidak ditemui." }, 404);
    }

    if (request.status !== "pending") {
      return c.json(
        { error: "Permohonan pembetulan ini telah diproses sebelum ini." },
        400,
      );
    }

    const changes = JSON.parse(request.requested_changes_json);
    const keys = Object.keys(changes);

    if (keys.length === 0) {
      return c.json(
        { error: "Tiada perubahan dikesan untuk permohonan ini." },
        400,
      );
    }

    // Map fields
    const mapping: Record<string, string> = {
      fullName: "full_name",
      ic: "ic_normalized",
      phone: "phone_normalized",
      address: "address",
      generalArea: "general_area",
    };

    const sets: string[] = [];
    const params: any[] = [];

    for (const key of keys) {
      const dbCol = mapping[key];
      if (dbCol) {
        let val = changes[key];
        if (dbCol === "ic_normalized") {
          val = cleanIc(val);
          sets.push("ic_last4 = ?");
          params.push(val.substring(8));
        } else if (dbCol === "phone_normalized") {
          val = normalizePhone(val) || val;
        } else if (dbCol === "full_name") {
          sets.push("full_name_normalized = ?");
          params.push(val.toUpperCase().trim());
        }
        sets.push(`${dbCol} = ?`);
        params.push(val);
      }
    }

    params.push(nowStr, request.member_id);

    const updateMember = c.env.DB.prepare(
      `UPDATE members SET ${sets.join(", ")}, updated_at = ? WHERE id = ?`,
    ).bind(...params);

    const approveRequest = c.env.DB.prepare(
      "UPDATE correction_requests SET status = 'approved', reviewed_at = ?, reviewed_by = ? WHERE id = ?",
    ).bind(nowStr, adminSessionId, id);

    await c.env.DB.batch([updateMember, approveRequest]);

    // Audit log
    await createAuditLog(
      c.env.DB,
      "admin",
      adminSessionId,
      "CORRECTION_APPROVE",
      "correction_requests",
      id,
      request.requested_changes_json,
      "Pembetulan profil diluluskan",
    );

    return c.json({
      success: true,
      message: "Permohonan pembetulan maklumat profil diluluskan.",
    });
  } catch (err) {
    return c.json(
      { error: "Ralat pelayan semasa meluluskan pembetulan." },
      500,
    );
  }
});

// 17. POST /api/admin/corrections/:id/reject (Reject Correction)
app.post("/corrections/:id/reject", async (c) => {
  const id = c.req.param("id");
  const adminSessionId = c.get("adminSessionId");
  const body = await c.req.json();
  const { reason } = body;

  if (!reason) {
    return c.json({ error: "Sebab penolakan pembetulan diperlukan." }, 400);
  }

  const nowStr = new Date().toISOString();

  try {
    const request = await c.env.DB.prepare(
      "SELECT status FROM correction_requests WHERE id = ?",
    )
      .bind(id)
      .first<any>();
    if (!request) {
      return c.json(
        { error: "Rekod permohonan pembetulan tidak ditemui." },
        404,
      );
    }

    if (request.status !== "pending") {
      return c.json(
        { error: "Permohonan pembetulan ini telah diproses sebelum ini." },
        400,
      );
    }

    await c.env.DB.prepare(
      "UPDATE correction_requests SET status = 'rejected', rejection_reason = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?",
    )
      .bind(reason, nowStr, adminSessionId, id)
      .run();

    // Audit log
    await createAuditLog(
      c.env.DB,
      "admin",
      adminSessionId,
      "CORRECTION_REJECT",
      "correction_requests",
      id,
      null,
      reason,
    );

    return c.json({
      success: true,
      message: "Permohonan pembetulan maklumat ditolak.",
    });
  } catch (err) {
    return c.json(
      { error: "Ralat pelayan semasa menolak permohonan pembetulan." },
      500,
    );
  }
});

// 18. POST /api/admin/accounts/:id/reset-code (Admin Account Reset Code Generator)
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

    // Audit log
    await createAuditLog(
      c.env.DB,
      "admin",
      adminSessionId,
      "PASSWORD_RESET_CODE_GENERATE",
      "member_accounts",
      account.id,
      null,
      reason,
    );

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
  const adminSessionId = c.get("adminSessionId");
  const nowStr = new Date().toISOString();

  try {
    await c.env.DB.prepare(
      "UPDATE admin_sessions SET revoked_at = ? WHERE id = ?",
    )
      .bind(nowStr, sessionIdToRevoke)
      .run();

    // Audit log
    await createAuditLog(
      c.env.DB,
      "admin",
      adminSessionId,
      "ADMIN_SESSION_REVOKE",
      "admin_sessions",
      sessionIdToRevoke,
      null,
      "Sesi pentadbir dibatalkan",
    );

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

    // Audit log
    await createAuditLog(
      c.env.DB,
      "admin",
      adminSessionId,
      "ADMIN_SESSION_REVOKE_OTHERS",
      "admin_sessions",
      null,
      null,
      "Semua sesi peranti pentadbir lain dibatalkan",
    );

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

// 22. GET /api/admin/audit (Fetch audit logs)
app.get("/audit", async (c) => {
  const action = c.req.query("action") || "";
  const actorType = c.req.query("actorType") || "";
  const page = parseInt(c.req.query("page") || "1", 10);

  const limit = 30;
  const offset = (page - 1) * limit;

  try {
    let sql =
      "SELECT id, actor_type, actor_id, action, entity_type, entity_id, changed_fields_json, reason, created_at FROM audit_logs WHERE 1=1";
    const params: any[] = [];

    if (action) {
      sql += " AND action = ?";
      params.push(action);
    }
    if (actorType) {
      sql += " AND actor_type = ?";
      params.push(actorType);
    }

    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const logs = await c.env.DB.prepare(sql)
      .bind(...params)
      .all()
      .then((res) => res.results);

    // Get total count
    let countSql = "SELECT COUNT(*) as count FROM audit_logs WHERE 1=1";
    const countParams: any[] = [];

    if (action) {
      countSql += " AND action = ?";
      countParams.push(action);
    }
    if (actorType) {
      countSql += " AND actor_type = ?";
      countParams.push(actorType);
    }

    const total = await c.env.DB.prepare(countSql)
      .bind(...countParams)
      .first<any>();

    return c.json({
      logs,
      pagination: {
        total: total?.count || 0,
        page,
        limit,
        totalPages: Math.ceil((total?.count || 0) / limit),
      },
    });
  } catch (err) {
    return c.json({ error: "Ralat pelayan semasa memuatkan log audit." }, 500);
  }
});

export default app;
