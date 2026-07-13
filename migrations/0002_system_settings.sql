-- Persistent application settings controlled by administrators.

CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NULL
);

INSERT INTO system_settings (key, value, updated_at, updated_by)
VALUES ('registration_approval_mode', 'manual', CURRENT_TIMESTAMP, NULL);
