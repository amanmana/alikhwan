-- Mock Seed Data for e-Kariah Al-Ikhwan (Development Only)

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Clear existing data (optional, but good for clean seeding)
DELETE FROM consent_records;
DELETE FROM member_sessions;
DELETE FROM admin_sessions;
DELETE FROM member_accounts;
DELETE FROM account_claims;
DELETE FROM members;
DELETE FROM members_fts;

-- 1. Insert Members
-- Active claimed member
INSERT INTO members (id, legacy_id, full_name, full_name_normalized, ic_normalized, ic_last4, birth_date, phone_normalized, address, general_area, membership_status, account_state, directory_visible, directory_consent_at, registration_source, admin_notes, created_at, updated_at)
VALUES (
  'member-uuid-1', 
  'LEG-001', 
  'MOHD AZMI BIN AHMAD', 
  'MOHD AZMI BIN AHMAD', 
  '800512105431', 
  '5431', 
  '1980-05-12', 
  '+60123456789', 
  'No. 12, Jalan Indah 5/3, Taman Desa Indah', 
  'Taman Desa Indah', 
  'active', 
  'active', 
  1, 
  '2026-07-13T08:00:00.000Z', 
  'legacy_import', 
  'Rekod diimport dengan lancar', 
  '2026-07-10T12:00:00.000Z', 
  '2026-07-13T08:00:00.000Z'
);

-- Active unclaimed member (can claim account)
INSERT INTO members (id, legacy_id, full_name, full_name_normalized, ic_normalized, ic_last4, birth_date, phone_normalized, address, general_area, membership_status, account_state, directory_visible, directory_consent_at, registration_source, admin_notes, created_at, updated_at)
VALUES (
  'member-uuid-2', 
  'LEG-002', 
  'FATIMAH BINTI OTHMAN', 
  'FATIMAH BINTI OTHMAN', 
  '850412141234', 
  '1234', 
  '1985-04-12', 
  '+60198765432', 
  'No. 45, Jalan Mawar 3, Taman Mawar Jaya', 
  'Taman Mawar Jaya', 
  'active', 
  'unclaimed', 
  0, 
  NULL, 
  'legacy_import', 
  'Ahli lama belum menuntut akaun', 
  '2026-07-10T12:00:00.000Z', 
  '2026-07-10T12:00:00.000Z'
);

-- Active unclaimed legacy member with NULL PII (no IC, no phone)
INSERT INTO members (id, legacy_id, full_name, full_name_normalized, ic_normalized, ic_last4, birth_date, phone_normalized, address, general_area, membership_status, account_state, directory_visible, directory_consent_at, registration_source, admin_notes, created_at, updated_at)
VALUES (
  'member-uuid-5', 
  'LEG-005', 
  'MOHD TASRANI BIN KAMARI', 
  'MOHD TASRANI BIN KAMARI', 
  NULL, 
  NULL, 
  NULL, 
  NULL, 
  'No. 33 Jalan PUJ 2/2', 
  NULL, 
  'active', 
  'unclaimed', 
  0, 
  NULL, 
  'legacy_import', 
  'Rekod diimport daripada users.sql, tiada IC/tel bimbit asal', 
  '2025-11-10T01:02:03.000Z', 
  '2025-11-10T01:02:03.000Z'
);

-- Pending registration member
INSERT INTO members (id, legacy_id, full_name, full_name_normalized, ic_normalized, ic_last4, birth_date, phone_normalized, address, general_area, membership_status, account_state, directory_visible, directory_consent_at, registration_source, admin_notes, created_at, updated_at)
VALUES (
  'member-uuid-3', 
  NULL, 
  'KHAIRUL ANUAR BIN ZAINAL', 
  'KHAIRUL ANUAR BIN ZAINAL', 
  '921123014455', 
  '4455', 
  '1992-11-23', 
  '+60176543210', 
  'No. 8, Lorong Kemboja 2, Taman Kemboja', 
  'Taman Kemboja', 
  'pending',
  'active', 
  0, 
  NULL, 
  'public_registration', 
  NULL, 
  '2026-07-13T01:00:00.000Z', 
  '2026-07-13T01:00:00.000Z'
);

-- Member pending administrator approval
INSERT INTO members (id, legacy_id, full_name, full_name_normalized, ic_normalized, ic_last4, birth_date, phone_normalized, address, general_area, membership_status, account_state, directory_visible, directory_consent_at, registration_source, admin_notes, created_at, updated_at)
VALUES (
  'member-uuid-4', 
  'LEG-004', 
  'AMAR BIN ABDULLAH (MOCK)', 
  'AMAR BIN ABDULLAH (MOCK)', 
  '150820108899', 
  '8899', 
  '2015-08-20', 
  '+60132221111', 
  'No. 2, Jalan Indah 5/1, Taman Desa Indah', 
  'Taman Desa Indah', 
  'pending', 
  'unclaimed', 
  0, 
  NULL, 
  'legacy_import', 
  'Lahir 2015 - Umur di bawah 18 tahun', 
  '2026-07-10T12:00:00.000Z', 
  '2026-07-10T12:00:00.000Z'
);

-- 2. Insert Member Accounts
-- Password is 'Kariah12345!'
-- Hash generated using scrypt (N=16384, r=8, p=1)
-- scrypt$N=16384,r=8,p=1$76f9d2de2877a9415c8df790f11db0d7$4e867db078696abde5cf4db86e08c8a14c6e3957597148564a93a1c8651a0b35dfbe8c614b8f0a0d4c88debc2f643e92557ec6db66432b4b45507ffc6c97a4a2
INSERT INTO member_accounts (id, member_id, username, username_normalized, password_hash, failed_login_count, locked_until, password_changed_at, created_at, updated_at)
VALUES (
  'account-uuid-1', 
  'member-uuid-1', 
  'azmi_ahmad', 
  'azmi_ahmad', 
  'scrypt$N=16384,r=8,p=1$76f9d2de2877a9415c8df790f11db0d7$4e867db078696abde5cf4db86e08c8a14c6e3957597148564a93a1c8651a0b35dfbe8c614b8f0a0d4c88debc2f643e92557ec6db66432b4b45507ffc6c97a4a2', 
  0, 
  NULL, 
  '2026-07-13T08:00:00.000Z', 
  '2026-07-13T08:00:00.000Z', 
  '2026-07-13T08:00:00.000Z'
);

INSERT INTO member_accounts (id, member_id, username, username_normalized, password_hash, failed_login_count, locked_until, password_changed_at, created_at, updated_at)
VALUES (
  'account-uuid-3', 
  'member-uuid-3', 
  'khairul_anuar', 
  'khairul_anuar', 
  'scrypt$N=16384,r=8,p=1$76f9d2de2877a9415c8df790f11db0d7$4e867db078696abde5cf4db86e08c8a14c6e3957597148564a93a1c8651a0b35dfbe8c614b8f0a0d4c88debc2f643e92557ec6db66432b4b45507ffc6c97a4a2', 
  0, 
  NULL, 
  '2026-07-13T01:00:00.000Z', 
  '2026-07-13T01:00:00.000Z', 
  '2026-07-13T01:00:00.000Z'
);

-- 3. Insert Consents
INSERT INTO consent_records (id, member_id, consent_type, notice_version, granted, created_at)
VALUES ('consent-uuid-1', 'member-uuid-1', 'directory_visibility', '1.0', 1, '2026-07-13T08:00:00.000Z');

INSERT INTO consent_records (id, member_id, consent_type, notice_version, granted, created_at)
VALUES ('consent-uuid-2', 'member-uuid-1', 'privacy_notice', '1.0', 1, '2026-07-13T08:00:00.000Z');

INSERT INTO consent_records (id, member_id, consent_type, notice_version, granted, created_at)
VALUES ('consent-uuid-3', 'member-uuid-3', 'privacy_notice', '1.0', 1, '2026-07-13T01:00:00.000Z');

-- 4. Sync Virtual Table manually (since trigger handles on inserts, but we do this for seed safety)
INSERT INTO members_fts (member_id, full_name_normalized) VALUES ('member-uuid-1', 'MOHD AZMI BIN AHMAD');
INSERT INTO members_fts (member_id, full_name_normalized) VALUES ('member-uuid-2', 'FATIMAH BINTI OTHMAN');
INSERT INTO members_fts (member_id, full_name_normalized) VALUES ('member-uuid-3', 'KHAIRUL ANUAR BIN ZAINAL');
INSERT INTO members_fts (member_id, full_name_normalized) VALUES ('member-uuid-4', 'AMAR BIN ABDULLAH (MOCK)');
INSERT INTO members_fts (member_id, full_name_normalized) VALUES ('member-uuid-5', 'MOHD TASRANI BIN KAMARI');
