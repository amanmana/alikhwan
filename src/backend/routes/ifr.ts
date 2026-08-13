import { Hono } from "hono";
import { Bindings } from "../db.ts";

const router = new Hono<{ Bindings: Bindings }>();

router.post("/register", async (c) => {
  try {
    const data = await c.req.json();
    const {
      id,
      name,
      ic_number,
      phone,
      category,
      address,
      shirt_size,
      emergency_contact_phone,
      receipt_data,
    } = data;

    if (
      !id ||
      !name ||
      !ic_number ||
      !phone ||
      !category ||
      !address ||
      !shirt_size ||
      !emergency_contact_phone ||
      !receipt_data
    ) {
      return c.json({ error: "Sila lengkapkan semua maklumat." }, 400);
    }

    const { success } = await c.env.DB.prepare(
      `INSERT INTO ifr_participants (
        id, name, ic_number, phone, category, address, shirt_size, emergency_contact_phone, receipt_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        name,
        ic_number,
        phone,
        category,
        address,
        shirt_size,
        emergency_contact_phone,
        receipt_data
      )
      .run();

    if (!success) {
      return c.json({ error: "Gagal menyimpan pendaftaran." }, 500);
    }

    return c.json({ success: true, message: "Pendaftaran berjaya disimpan." });
  } catch (error) {
    console.error("IFR Registration error:", error);
    return c.json({ error: "Ralat dalaman pelayan." }, 500);
  }
});

router.get("/participant/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const result = await c.env.DB.prepare(
      "SELECT name, category, shirt_size, created_at FROM ifr_participants WHERE id = ?"
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

router.get("/admin/participants", async (c) => {
  const authHeader = c.req.header("Authorization");
  
  // Simple passcode auth as agreed
  if (authHeader !== "Bearer IFR2026") {
    return c.json({ error: "Akses ditolak. Passcode tidak sah." }, 401);
  }

  try {
    const participants = await c.env.DB.prepare(
      "SELECT id, name, ic_number, phone, category, address, shirt_size, emergency_contact_phone, created_at, receipt_data FROM ifr_participants ORDER BY created_at DESC"
    ).all();

    return c.json({ participants: participants.results });
  } catch (error) {
    console.error("IFR Get Admin Participants error:", error);
    return c.json({ error: "Ralat dalaman pelayan." }, 500);
  }
});

router.get("/status", async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT value FROM system_settings WHERE key = 'ifr_status'"
    ).first<any>();
    
    // Default to 'open' if not set
    const status = result ? result.value : "open";
    return c.json({ status });
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

export default router;
