CREATE TABLE IF NOT EXISTS ifr_participants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ic_number TEXT NOT NULL,
  phone TEXT NOT NULL,
  category TEXT NOT NULL,
  address TEXT NOT NULL,
  shirt_size TEXT NOT NULL,
  emergency_contact_phone TEXT NOT NULL,
  receipt_data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
