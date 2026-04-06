-- Create external_pics table for storing external PIC (Person In Charge) names
-- These are PICs that are not registered users in the system
CREATE TABLE IF NOT EXISTS external_pics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for fast name lookup
CREATE INDEX IF NOT EXISTS idx_external_pics_name ON external_pics(name);

-- Create unique constraint to prevent duplicate names
CREATE UNIQUE INDEX IF NOT EXISTS idx_external_pics_unique_name ON external_pics(LOWER(name));