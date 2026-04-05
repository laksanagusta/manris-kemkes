-- Remove nilai columns from risks table
ALTER TABLE risks DROP COLUMN IF EXISTS nilai;
ALTER TABLE risks DROP COLUMN IF EXISTS target_nilai;
