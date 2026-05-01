ALTER TABLE risks ADD COLUMN IF NOT EXISTS objective_id UUID REFERENCES risk_objectives(id);
CREATE INDEX IF NOT EXISTS idx_risks_objective_id ON risks(objective_id);