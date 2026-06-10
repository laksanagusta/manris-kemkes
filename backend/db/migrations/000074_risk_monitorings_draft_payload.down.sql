ALTER TABLE risk_monitorings
ADD COLUMN IF NOT EXISTS draft_title TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS draft_category TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS draft_cause TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS draft_risk_source TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS draft_controllability TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS draft_impact_description TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS draft_existing_control TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS draft_control_effectiveness TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS draft_treatment_option TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS draft_mitigations JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE risk_monitorings
SET draft_title = COALESCE(draft_payload->>'title', ''),
    draft_category = COALESCE(draft_payload->>'category', ''),
    draft_cause = COALESCE(
        (SELECT array_agg(value) FROM jsonb_array_elements_text(COALESCE(draft_payload->'cause', '[]'::jsonb)) AS value),
        '{}'::text[]
    ),
    draft_risk_source = COALESCE(draft_payload->>'riskSource', ''),
    draft_controllability = COALESCE(draft_payload->>'controllability', ''),
    draft_impact_description = COALESCE(
        (SELECT array_agg(value) FROM jsonb_array_elements_text(COALESCE(draft_payload->'impactDesc', '[]'::jsonb)) AS value),
        '{}'::text[]
    ),
    draft_existing_control = COALESCE(draft_payload->>'existingControl', ''),
    draft_control_effectiveness = COALESCE(draft_payload->>'controlEffectiveness', ''),
    draft_treatment_option = COALESCE(draft_payload->>'treatmentOption', ''),
    draft_mitigations = COALESCE(draft_payload->'mitigations', '[]'::jsonb);

ALTER TABLE risk_monitorings
DROP COLUMN IF EXISTS draft_payload;
