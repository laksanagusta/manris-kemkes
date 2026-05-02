ALTER TABLE mitigations
    ADD COLUMN IF NOT EXISTS mitigation_type TEXT NOT NULL DEFAULT 'reduce_probability'
        CHECK (mitigation_type IN ('reduce_probability', 'reduce_impact', 'reduce_both')),
    ADD COLUMN IF NOT EXISTS activity_stage TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS expected_output TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS quantitative_target TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS supporting_unit TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS resources_required TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS contingency_plan TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS potential_obstacle TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS cost_benefit_note TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS is_breakthrough_activity BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_existing_control BOOLEAN NOT NULL DEFAULT FALSE;
