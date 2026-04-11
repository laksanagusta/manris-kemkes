-- Add employee profile fields (NIP, Jabatan, Pangkat) to users table
-- All fields are free text for now, NOT NULL with empty string default
ALTER TABLE users ADD COLUMN nip TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN jabatan TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN pangkat TEXT NOT NULL DEFAULT '';
