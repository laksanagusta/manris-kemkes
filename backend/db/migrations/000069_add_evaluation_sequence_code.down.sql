DROP INDEX IF EXISTS idx_evaluations_org_code;

ALTER TABLE evaluations
    DROP CONSTRAINT IF EXISTS evaluations_organization_sequence_no_key;

ALTER TABLE evaluations
    DROP COLUMN IF EXISTS code,
    DROP COLUMN IF EXISTS sequence_no;
