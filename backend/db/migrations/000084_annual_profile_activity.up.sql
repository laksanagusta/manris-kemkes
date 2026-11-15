ALTER TABLE annual_risk_profile_versions ADD COLUMN updated_at timestamptz;
UPDATE annual_risk_profile_versions SET updated_at = GREATEST(created_at, finalized_at);
ALTER TABLE annual_risk_profile_versions
    ALTER COLUMN updated_at SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT now();
