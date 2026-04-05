-- Add nilai columns to risks table
ALTER TABLE risks ADD COLUMN IF NOT EXISTS nilai NUMERIC(10,4) DEFAULT 0;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS target_nilai NUMERIC(10,4) DEFAULT 0;

-- Update existing risks to calculate nilai based on current values
UPDATE risks SET nilai = probability::numeric * impact::numeric * weight
WHERE nilai = 0 OR nilai IS NULL;

UPDATE risks SET target_nilai = target_probability::numeric * target_impact::numeric * target_weight
WHERE target_nilai = 0 OR target_nilai IS NULL;
