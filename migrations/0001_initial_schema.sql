-- Initial schema for e-Kariah Al-Ikhwan

-- 1. members table
CREATE TABLE members (
  id TEXT PRIMARY KEY,
  legacy_id TEXT UNIQUE NULL,
  full_name TEXT NOT NULL,
  full_name_normalized TEXT NOT NULL,
  ic_normalized TEXT NULL UNIQUE,
  ic_last4 TEXT NULL,
  birth_date TEXT NULL,
  phone_normalized TEXT NULL,
  address TEXT NOT NULL,
  general_area TEXT NULL,
  membership_status TEXT NOT NULL CHECK (membership_status IN ('pending', 'active', 'rejected', 'inactive', 'needs_review', 'moved', 'deceased')),
  account_state TEXT NOT NULL CHECK (account_state IN ('unclaimed', 'pending_claim', 'active', 'locked')),
  directory_visible INTEGER NOT NULL DEFAULT 0 CHECK (directory_visible IN (0, 1)),
  directory_consent_at TEXT NULL,
  registration_source TEXT NOT NULL CHECK (registration_source IN ('public_registration', 'legacy_import', 'admin_create')),
  admin_notes TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  approved_at TEXT NULL,
  approved_by TEXT NULL,
  deactivated_at TEXT NULL
);

-- 2. member_accounts table
CREATE TABLE member_accounts (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  username_normalized TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT NULL,
  password_changed_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- 3. member_sessions table
CREATE TABLE member_sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_used_at TEXT NOT NULL,
  revoked_at TEXT NULL,
  FOREIGN KEY (account_id) REFERENCES member_accounts(id) ON DELETE CASCADE
);

-- 4. admin_sessions table
CREATE TABLE admin_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  device_label TEXT NULL,
  created_at TEXT NOT NULL,
  last_used_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT NULL
);

-- 5. account_claims table
CREATE TABLE account_claims (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  requested_username TEXT NOT NULL,
  requested_username_normalized TEXT NOT NULL,
  pending_password_hash TEXT NOT NULL,
  requested_ic_normalized TEXT NULL,
  requested_phone_normalized TEXT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  reference_code TEXT NOT NULL UNIQUE,
  requested_at TEXT NOT NULL,
  reviewed_at TEXT NULL,
  reviewed_by TEXT NULL,
  rejection_reason TEXT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- 6. correction_requests table
CREATE TABLE correction_requests (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  requested_changes_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TEXT NOT NULL,
  reviewed_at TEXT NULL,
  reviewed_by TEXT NULL,
  rejection_reason TEXT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- 7. password_reset_tokens table
CREATE TABLE password_reset_tokens (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT NULL,
  created_by_admin_session_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES member_accounts(id) ON DELETE CASCADE
);

-- 8. audit_logs table
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('member', 'admin', 'system')),
  actor_id TEXT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NULL,
  changed_fields_json TEXT NULL,
  reason TEXT NULL,
  created_at TEXT NOT NULL
);

-- 9. consent_records table
CREATE TABLE consent_records (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  consent_type TEXT NOT NULL,
  notice_version TEXT NOT NULL,
  granted INTEGER NOT NULL CHECK (granted IN (0, 1)),
  created_at TEXT NOT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- 10. members_fts (FTS5 Virtual Table)
CREATE VIRTUAL TABLE members_fts USING fts5(
  member_id UNINDEXED,
  full_name_normalized
);

-- Triggers to synchronize members_fts
CREATE TRIGGER after_members_insert AFTER INSERT ON members BEGIN
  INSERT INTO members_fts (member_id, full_name_normalized)
  VALUES (new.id, new.full_name_normalized);
END;

CREATE TRIGGER after_members_update AFTER UPDATE ON members BEGIN
  UPDATE members_fts SET full_name_normalized = new.full_name_normalized
  WHERE member_id = new.id;
END;

CREATE TRIGGER after_members_delete AFTER DELETE ON members BEGIN
  DELETE FROM members_fts WHERE member_id = old.id;
END;

-- Indexes for performance
CREATE UNIQUE INDEX idx_members_ic ON members(ic_normalized);
CREATE INDEX idx_members_phone ON members(phone_normalized);
CREATE INDEX idx_members_status_visible ON members(membership_status, directory_visible);
CREATE INDEX idx_members_created ON members(created_at);
CREATE INDEX idx_members_updated ON members(updated_at);

CREATE UNIQUE INDEX idx_accounts_username ON member_accounts(username_normalized);

CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
