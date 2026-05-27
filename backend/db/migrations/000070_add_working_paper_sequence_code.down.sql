DROP INDEX IF EXISTS idx_working_papers_org_code;

ALTER TABLE working_papers
    DROP CONSTRAINT IF EXISTS working_papers_org_sequence_no_key;

ALTER TABLE working_papers
    DROP COLUMN IF EXISTS code,
    DROP COLUMN IF EXISTS sequence_no;
