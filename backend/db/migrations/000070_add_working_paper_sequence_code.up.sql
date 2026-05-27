ALTER TABLE working_papers
    ADD COLUMN sequence_no INTEGER,
    ADD COLUMN code TEXT;

WITH numbered AS (
    SELECT
        id,
        ROW_NUMBER() OVER (PARTITION BY org_id ORDER BY created_at ASC, id ASC) AS sequence_no
    FROM working_papers
)
UPDATE working_papers wp
SET sequence_no = numbered.sequence_no,
    code = 'WP-' || LPAD(numbered.sequence_no::text, 4, '0')
FROM numbered
WHERE wp.id = numbered.id;

ALTER TABLE working_papers
    ALTER COLUMN sequence_no SET NOT NULL,
    ALTER COLUMN code SET NOT NULL;

ALTER TABLE working_papers
    ADD CONSTRAINT working_papers_org_sequence_no_key UNIQUE (org_id, sequence_no);

CREATE INDEX idx_working_papers_org_code ON working_papers(org_id, code);
