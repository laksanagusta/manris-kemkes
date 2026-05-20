ALTER TABLE risks ADD COLUMN IF NOT EXISTS ro_id UUID REFERENCES planning_ros(id);
CREATE INDEX IF NOT EXISTS idx_risks_ro_id ON risks(ro_id);
