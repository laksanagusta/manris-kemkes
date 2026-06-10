ALTER TABLE risk_monitorings
ADD COLUMN IF NOT EXISTS draft_control_effectiveness TEXT NOT NULL DEFAULT '';
