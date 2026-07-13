export interface Bindings {
  DB: D1Database;
  ADMIN_MAGIC_KEYWORD: string;
  SESSION_SECRET: string;
  TURNSTILE_SECRET_KEY: string;
  TURNSTILE_SITE_KEY: string;
}

export async function createAuditLog(
  db: D1Database,
  actorType: "member" | "admin" | "system",
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  changedFieldsJson: string | null,
  reason: string | null,
): Promise<void> {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  // Clean up any sensitive fields in changed_fields_json
  let cleanedChanges = changedFieldsJson;
  if (changedFieldsJson) {
    try {
      const obj = JSON.parse(changedFieldsJson);
      const sensitiveKeys = [
        "password",
        "password_hash",
        "pending_password_hash",
        "keyword",
        "token",
      ];
      let modified = false;
      for (const key of Object.keys(obj)) {
        if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
          obj[key] = "[SENSITIVE DATA MASKED]";
          modified = true;
        }
      }
      if (modified) {
        cleanedChanges = JSON.stringify(obj);
      }
    } catch {
      // Keep as-is if not valid JSON
    }
  }

  await db
    .prepare(
      `INSERT INTO audit_logs (id, actor_type, actor_id, action, entity_type, entity_id, changed_fields_json, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      actorType,
      actorId,
      action,
      entityType,
      entityId,
      cleanedChanges,
      reason,
      createdAt,
    )
    .run();
}
