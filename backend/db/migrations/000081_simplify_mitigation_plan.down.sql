-- Restores the schema. Dropped values and migrated control rows cannot be recreated.
ALTER TABLE mitigations
    ADD COLUMN activity_stage text NOT NULL DEFAULT '',
    ADD COLUMN expected_output text NOT NULL DEFAULT '',
    ADD COLUMN quantitative_target text NOT NULL DEFAULT '',
    ADD COLUMN supporting_unit text NOT NULL DEFAULT '',
    ADD COLUMN resources_required text NOT NULL DEFAULT '',
    ADD COLUMN contingency_plan text NOT NULL DEFAULT '',
    ADD COLUMN potential_obstacle text NOT NULL DEFAULT '',
    ADD COLUMN is_breakthrough_activity boolean NOT NULL DEFAULT false,
    ADD COLUMN is_existing_control boolean NOT NULL DEFAULT false;
