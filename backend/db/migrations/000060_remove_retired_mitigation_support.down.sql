ALTER TABLE mitigations
    ADD COLUMN IF NOT EXISTS cost_benefit_note text DEFAULT ''::text NOT NULL;
