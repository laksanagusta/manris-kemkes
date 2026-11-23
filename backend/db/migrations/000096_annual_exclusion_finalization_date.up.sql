ALTER TABLE annual_risk_profile_exclusions ALTER COLUMN effective_from DROP NOT NULL;

UPDATE annual_risk_profile_exclusions x
SET effective_from = NULL
FROM annual_risk_profile_versions p
WHERE p.id = x.profile_version_id AND p.finalized_at IS NULL;
