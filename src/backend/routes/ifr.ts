import { Hono } from "hono";
import { Bindings } from "../db.ts";

const router = new Hono<{ Bindings: Bindings }>();

router.post("/register", async (c) => {
  try {
    const data = await c.req.json();

    // Verify registration is still open
    const statusResults = await c.env.DB.prepare(
      "SELECT key, value FROM system_settings WHERE key IN ('ifr_status', 'ifr_auto_close_date')"
    ).all();
    let currentStatus = "open";
    let autoCloseDate = null;
    if (statusResults.results) {
      for (const row of statusResults.results) {
        if (row.key === "ifr_status") currentStatus = row.value as string;
        if (row.key === "ifr_auto_close_date") autoCloseDate = row.value as string;
      }
    }

    if (currentStatus !== "open") {
      return c.json({ error: "Pendaftaran telah ditutup." }, 403);
    }

    if (autoCloseDate) {
      const closeTime = new Date(autoCloseDate).getTime();
      if (new Date().getTime() >= closeTime) {
        return c.json({ error: "Pendaftaran telah tamat tempoh." }, 403);
      }
    }
    if (data.type === "group") {
      const { groupId, participants, receipt_data } = data;
      if (!groupId || !participants || !participants.length || !receipt_data) {
        return c.json({ error: "Maklumat kumpulan tidak lengkap." }, 400);
      }

      // 1. Insert into ifr_receipts
      const { success: receiptSuccess } = await c.env.DB.prepare(
        "INSERT INTO ifr_receipts (group_id, receipt_data) VALUES (?, ?)"
      ).bind(groupId, receipt_data).run();

      if (!receiptSuccess) {
        return c.json({ error: "Gagal memuat naik resit kumpulan." }, 500);
      }

      // 2. Loop and insert participants
      const stmt = c.env.DB.prepare(
        `INSERT INTO ifr_participants (
          id, name, ic_number, phone, category, address, shirt_size, emergency_contact_phone, receipt_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      const batchStatements = participants.map((p: any) => 
        stmt.bind(
          p.id, p.name, p.ic_number, p.phone, p.category, p.address, p.shirt_size, p.emergency_contact_phone,
          `GROUP:${groupId}`
        )
      );

      await c.env.DB.batch(batchStatements);

      return c.json({ success: true, message: "Pendaftaran kumpulan berjaya disimpan." });

    } else {
      // Individual logic
      const {
        id, name, ic_number, phone, category, address, shirt_size, emergency_contact_phone, receipt_data,
      } = data;

      if (!id || !name || !ic_number || !phone || !category || !address || !shirt_size || !emergency_contact_phone || !receipt_data) {
        return c.json({ error: "Sila lengkapkan semua maklumat." }, 400);
      }

      const { success } = await c.env.DB.prepare(
        `INSERT INTO ifr_participants (
          id, name, ic_number, phone, category, address, shirt_size, emergency_contact_phone, receipt_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(id, name, ic_number, phone, category, address, shirt_size, emergency_contact_phone, receipt_data).run();

      if (!success) {
        return c.json({ error: "Gagal menyimpan pendaftaran." }, 500);
      }

      return c.json({ success: true, message: "Pendaftaran berjaya disimpan." });
    }
  } catch (error) {
    console.error("IFR Registration error:", error);
    return c.json({ error: "Ralat dalaman pelayan." }, 500);
  }
});

router.get("/participant/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const result = await c.env.DB.prepare(
      "SELECT id, name, ic_number, category, shirt_size, kit_claimed, created_at FROM ifr_participants WHERE id = ?"
    )
      .bind(id)
      .first();

    if (!result) {
      return c.json({ error: "Peserta tidak dijumpai." }, 404);
    }

    return c.json({ participant: result });
  } catch (error) {
    console.error("IFR Get Participant error:", error);
    return c.json({ error: "Ralat dalaman pelayan." }, 500);
  }
});

router.get("/check-receipt", async (c) => {
  try {
    const ic_number = c.req.query("ic_number");
    
    if (!ic_number) {
      return c.json({ error: "Sila masukkan No. Kad Pengenalan." }, 400);
    }

    const result = await c.env.DB.prepare(
      "SELECT id FROM ifr_participants WHERE ic_number = ? LIMIT 1"
    )
      .bind(ic_number)
      .first();

    if (!result) {
      return c.json({ error: "Rekod pendaftaran tidak dijumpai untuk No. Kad Pengenalan ini." }, 404);
    }

    return c.json({ participantId: result.id });
  } catch (error) {
    console.error("IFR Check Receipt error:", error);
    return c.json({ error: "Ralat dalaman pelayan." }, 500);
  }
});

router.get("/admin/receipt/:groupId", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || authHeader !== `Bearer ${c.env.ADMIN_MAGIC_KEYWORD}`) {
      return c.json({ error: "Sesi tidak sah" }, 401);
    }

    const groupId = c.req.param("groupId");
    const result = await c.env.DB.prepare(
      "SELECT receipt_data FROM ifr_receipts WHERE group_id = ?"
    ).bind(groupId).first();

    if (!result) {
      return c.json({ error: "Resit tidak dijumpai." }, 404);
    }

    return c.json({ receipt_data: result.receipt_data });
  } catch (error) {
    return c.json({ error: "Ralat pelayan." }, 500);
  }
});

router.get("/admin/participants", async (c) => {
  const authHeader = c.req.header("Authorization");
  
  // Simple passcode auth as agreed
  if (authHeader !== "Bearer IFR2026") {
    return c.json({ error: "Akses ditolak. Passcode tidak sah." }, 401);
  }

  try {
    const participants = await c.env.DB.prepare(
      "SELECT id, name, ic_number, phone, category, address, shirt_size, emergency_contact_phone, created_at, receipt_data, kit_claimed FROM ifr_participants ORDER BY created_at DESC"
    ).all();

    return c.json({ participants: participants.results });
  } catch (error) {
    console.error("IFR Get Admin Participants error:", error);
    return c.json({ error: "Ralat dalaman pelayan." }, 500);
  }
});

router.post("/admin/participants/:id/claim", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader !== "Bearer IFR2026") {
    return c.json({ error: "Akses ditolak. Passcode tidak sah." }, 401);
  }

  try {
    const { id } = c.req.param();
    const { claimed } = await c.req.json();
    
    const { success } = await c.env.DB.prepare(
      "UPDATE ifr_participants SET kit_claimed = ? WHERE id = ?"
    ).bind(claimed ? 1 : 0, id).run();

    if (!success) {
      return c.json({ error: "Gagal mengemas kini status." }, 500);
    }

    return c.json({ success: true, message: "Status berjaya dikemas kini." });
  } catch (error) {
    console.error("IFR Update Kit Claim error:", error);
    return c.json({ error: "Ralat dalaman pelayan." }, 500);
  }
});

router.get("/status", async (c) => {
  try {
    const results = await c.env.DB.prepare(
      "SELECT key, value FROM system_settings WHERE key IN ('ifr_status', 'ifr_auto_close_date')"
    ).all();
    
    let status = "open";
    let autoCloseDate = null;

    if (results.results) {
      for (const row of results.results) {
        if (row.key === "ifr_status") status = row.value as string;
        if (row.key === "ifr_auto_close_date") autoCloseDate = row.value as string;
      }
    }
    
    // Server-side check: override to closed if time passed
    if (autoCloseDate && status === "open") {
      const closeTime = new Date(autoCloseDate).getTime();
      const nowTime = new Date().getTime();
      if (nowTime >= closeTime) {
        status = "closed_registration";
      }
    }

    return c.json({ status, autoCloseDate });
  } catch (error) {
    console.error("IFR Get Status error:", error);
    return c.json({ error: "Ralat dalaman pelayan." }, 500);
  }
});

router.post("/admin/status", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader !== "Bearer IFR2026") {
    return c.json({ error: "Akses ditolak. Passcode tidak sah." }, 401);
  }

  try {
    const { status } = await c.req.json();
    if (!["open", "closed_registration", "event_ended"].includes(status)) {
      return c.json({ error: "Status tidak sah." }, 400);
    }

    const nowStr = new Date().toISOString();
    await c.env.DB.prepare(
      `INSERT INTO system_settings (key, value, updated_at) 
       VALUES ('ifr_status', ?, ?) 
       ON CONFLICT(key) DO UPDATE SET 
         value = excluded.value, 
         updated_at = excluded.updated_at`
    ).bind(status, nowStr).run();

    return c.json({ success: true, message: "Status berjaya dikemas kini." });
  } catch (error) {
    console.error("IFR Set Admin Status error:", error);
    return c.json({ error: "Ralat dalaman pelayan." }, 500);
  }
});

router.get("/cert-status", async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT value FROM system_settings WHERE key = 'ifr_cert_release_date'"
    ).first<any>();
    
    // Default to Oct 10, 2026 10:00 AM (MYT) if not set
    const releaseDate = result ? result.value : "2026-10-10T10:00:00+08:00";
    return c.json({ releaseDate });
  } catch (error) {
    console.error("IFR Get Cert Status error:", error);
    return c.json({ error: "Ralat dalaman pelayan." }, 500);
  }
});

router.post("/admin/cert-status", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader !== "Bearer IFR2026") {
    return c.json({ error: "Akses ditolak. Passcode tidak sah." }, 401);
  }

  try {
    const { releaseDate } = await c.req.json();
    if (!releaseDate) {
      return c.json({ error: "Tarikh pelepasan diperlukan." }, 400);
    }

    const nowStr = new Date().toISOString();
    await c.env.DB.prepare(
      `INSERT INTO system_settings (key, value, updated_at) 
       VALUES ('ifr_cert_release_date', ?, ?) 
       ON CONFLICT(key) DO UPDATE SET 
         value = excluded.value, 
         updated_at = excluded.updated_at`
    ).bind(releaseDate, nowStr).run();

    return c.json({ success: true, message: "Tarikh sijil berjaya dikemas kini." });
  } catch (error) {
    console.error("IFR Set Cert Status error:", error);
    return c.json({ error: "Ralat dalaman pelayan." }, 500);
  }
});

router.post("/admin/auto-close-date", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader !== "Bearer IFR2026") {
    return c.json({ error: "Akses ditolak. Passcode tidak sah." }, 401);
  }

  try {
    const { closeDate } = await c.req.json();

    const nowStr = new Date().toISOString();
    if (!closeDate) {
      // Clear it
      await c.env.DB.prepare(
        "DELETE FROM system_settings WHERE key = 'ifr_auto_close_date'"
      ).run();
    } else {
      await c.env.DB.prepare(
        `INSERT INTO system_settings (key, value, updated_at) 
         VALUES ('ifr_auto_close_date', ?, ?) 
         ON CONFLICT(key) DO UPDATE SET 
           value = excluded.value, 
           updated_at = excluded.updated_at`
      ).bind(closeDate, nowStr).run();
    }

    return c.json({ success: true, message: "Tarikh auto-close berjaya dikemas kini." });
  } catch (error) {
    console.error("IFR Set Auto Close Date error:", error);
    return c.json({ error: "Ralat dalaman pelayan." }, 500);
  }
});

export default router;
