# Database Design: e-Kariah Al-Ikhwan

This document details the schema of the Cloudflare D1 (SQLite) database, including table layouts, indices, CHECK constraints, and triggers for synchronization.

---

## 1. Schema Diagrams & Relationships

```
┌──────────────────┐           ┌──────────────────┐
│     members      │───────────│ member_accounts  │
│  (Member record) │ 1      1  │ (Login Account)  │
└────────┬─────────┘           └────────┬─────────┘
         │ 1                            │ 1
         ├──────────────────────────────┼──────────────────────────────┐
         │ 1..*                         │ 1..*                         │ 1..*
┌────────▼─────────┐           ┌────────▼─────────┐           ┌────────▼─────────┐
│correction_requests│          │ member_sessions  │           │password_reset_tkn│
└──────────────────┘           └──────────────────┘           └──────────────────┘
```

---

## 2. Table Definitions

### A. members
Stores the core kariah member profile data.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Unique UUID or text ID |
| `legacy_id` | TEXT | NULL, UNIQUE | Imported ID if from users.sql |
| `full_name` | TEXT | NOT NULL | Member's display name |
| `full_name_normalized`| TEXT | NOT NULL | Uppercase, trimmed for FTS |
| `ic_normalized` | TEXT | NOT NULL, UNIQUE | 12-digit number (no hyphens) |
| `ic_last4` | TEXT | NOT NULL | Last 4 digits for masking |
| `birth_date` | TEXT | NULL | birth date (YYYY-MM-DD) |
| `phone_normalized` | TEXT | NOT NULL | normalised international string |
| `address` | TEXT | NOT NULL | Complete residential address |
| `general_area` | TEXT | NULL | General residential area |
| `membership_status` | TEXT | NOT NULL | CHECK in ('pending', 'active', 'rejected', 'inactive', 'needs_review') |
| `account_state` | TEXT | NOT NULL | CHECK in ('unclaimed', 'pending_claim', 'active', 'locked') |
| `directory_visible` | INTEGER| NOT NULL DEFAULT 0 | 0 = Hidden, 1 = Publicly visible |
| `directory_consent_at`| TEXT| NULL | Timestamp when consent granted |
| `registration_source` | TEXT | NOT NULL | CHECK in ('public_registration', 'legacy_import', 'admin_create') |
| `admin_notes` | TEXT | NULL | Internal admin-only notes |
| `created_at` | TEXT | NOT NULL | ISO8601 string |
| `updated_at` | TEXT | NOT NULL | ISO8601 string |
| `approved_at` | TEXT | NULL | ISO8601 string |
| `approved_by` | TEXT | NULL | Admin session ID that approved |
| `deactivated_at` | TEXT | NULL | ISO8601 string |

### B. member_accounts
Contains login credentials for members.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | UUID |
| `member_id` | TEXT | UNIQUE, FK(members.id) | Link to member profile |
| `username` | TEXT | NOT NULL | User's preferred username |
| `username_normalized`| TEXT | UNIQUE, NOT NULL | Lowercase username |
| `password_hash` | TEXT | NOT NULL | scrypt encoded hash |
| `failed_login_count` | INTEGER| NOT NULL DEFAULT 0 | Count for locking |
| `locked_until` | TEXT | NULL | Block login until date |
| `password_changed_at`| TEXT | NOT NULL | ISO8601 string |
| `created_at` | TEXT | NOT NULL | ISO8601 string |
| `updated_at` | TEXT | NOT NULL | ISO8601 string |

### C. member_sessions
Tracks active user session tokens.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | UUID |
| `account_id` | TEXT | NOT NULL, FK | Link to account |
| `token_hash` | TEXT | UNIQUE, NOT NULL | SHA-256 hash of raw session token |
| `expires_at` | TEXT | NOT NULL | ISO8601 |
| `created_at` | TEXT | NOT NULL | ISO8601 |
| `last_used_at` | TEXT | NOT NULL | ISO8601 |
| `revoked_at` | TEXT | NULL | ISO8601 |

### D. admin_sessions
Stores authorized admin browser tokens.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | UUID |
| `token_hash` | TEXT | UNIQUE, NOT NULL | SHA-256 hash of admin token |
| `device_label` | TEXT | NULL | Browser/OS summary |
| `expires_at` | TEXT | NOT NULL | ISO8601 |
| `created_at` | TEXT | NOT NULL | ISO8601 |
| `last_used_at` | TEXT | NOT NULL | ISO8601 |
| `revoked_at` | TEXT | NULL | ISO8601 |

### E. account_claims
Claims submitted by imported legacy members.

- `id` (TEXT PRIMARY KEY)
- `member_id` (TEXT FK to members.id)
- `requested_username` (TEXT)
- `requested_username_normalized` (TEXT)
- `pending_password_hash` (TEXT)
- `status` (TEXT - CHECK in ('pending', 'approved', 'rejected'))
- `reference_code` (TEXT UNIQUE)
- `requested_at` (TEXT)
- `reviewed_at` (TEXT NULL)
- `reviewed_by` (TEXT NULL)
- `rejection_reason` (TEXT NULL)

### F. correction_requests
Correction requests for approved members.

- `id` (TEXT PRIMARY KEY)
- `member_id` (TEXT FK to members.id)
- `requested_changes_json` (TEXT) - JSON string containing fields to update
- `status` (TEXT - CHECK in ('pending', 'approved', 'rejected'))
- `requested_at` (TEXT)
- `reviewed_at` (TEXT NULL)
- `reviewed_by` (TEXT NULL)
- `rejection_reason` (TEXT NULL)

### G. password_reset_tokens
Admin generated reset tokens.

- `id` (TEXT PRIMARY KEY)
- `account_id` (TEXT FK to member_accounts.id)
- `token_hash` (TEXT UNIQUE)
- `expires_at` (TEXT)
- `used_at` (TEXT NULL)
- `created_by_admin_session_id` (TEXT)
- `created_at` (TEXT)

### H. audit_logs
Chronological system events.

- `id` (TEXT PRIMARY KEY)
- `actor_type` (TEXT CHECK in ('member', 'admin', 'system'))
- `actor_id` (TEXT NULL)
- `action` (TEXT)
- `entity_type` (TEXT)
- `entity_id` (TEXT NULL)
- `changed_fields_json` (TEXT NULL)
- `reason` (TEXT NULL)
- `created_at` (TEXT)

### I. consent_records
Retains consent logs for legal privacy requirements.

- `id` (TEXT PRIMARY KEY)
- `member_id` (TEXT FK to members.id)
- `consent_type` (TEXT)
- `notice_version` (TEXT)
- `granted` (INTEGER CHECK (granted IN (0, 1)))
- `created_at` (TEXT)

---

## 3. Full-Text Search (FTS5)

To enable fast searches by name while preventing slow SQLite `LIKE '%name%'` queries, we create an FTS5 virtual table:
```sql
CREATE VIRTUAL TABLE members_fts USING fts5(
  member_id UNINDEXED,
  full_name_normalized
);
```

We keep it synchronised via application logic or standard SQLite database triggers:
```sql
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
```

---

## 4. Database Indices

We create indices for frequent filter and sort patterns:
- `idx_members_ic`: Unique index on `ic_normalized`
- `idx_accounts_username`: Unique index on `username_normalized`
- `idx_members_phone`: Index on `phone_normalized`
- `idx_members_status_visible`: Index on `(membership_status, directory_visible)`
- `idx_audit_logs_created`: Index on `created_at` for sorting logs
