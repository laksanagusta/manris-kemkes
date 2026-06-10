ALTER TABLE risk_monitorings
ADD COLUMN IF NOT EXISTS draft_payload JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE risk_monitorings
SET draft_payload = jsonb_build_object(
    'title', COALESCE(draft_title, ''),
    'category', COALESCE(draft_category, ''),
    'cause', COALESCE(to_jsonb(draft_cause), '[]'::jsonb),
    'riskSource', COALESCE(draft_risk_source, ''),
    'controllability', COALESCE(draft_controllability, ''),
    'impactDesc', COALESCE(to_jsonb(draft_impact_description), '[]'::jsonb),
    'existingControl', COALESCE(draft_existing_control, ''),
    'controlEffectiveness', COALESCE(draft_control_effectiveness, ''),
    'treatmentOption', COALESCE(draft_treatment_option, ''),
    'mitigations', COALESCE(draft_mitigations, '[]'::jsonb)
)
WHERE draft_payload = '{}'::jsonb;

ALTER TABLE risk_monitorings
DROP COLUMN IF EXISTS draft_title,
DROP COLUMN IF EXISTS draft_category,
DROP COLUMN IF EXISTS draft_cause,
DROP COLUMN IF EXISTS draft_risk_source,
DROP COLUMN IF EXISTS draft_controllability,
DROP COLUMN IF EXISTS draft_impact_description,
DROP COLUMN IF EXISTS draft_existing_control,
DROP COLUMN IF EXISTS draft_control_effectiveness,
DROP COLUMN IF EXISTS draft_treatment_option,
DROP COLUMN IF EXISTS draft_mitigations;
