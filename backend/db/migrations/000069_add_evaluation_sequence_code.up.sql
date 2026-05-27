ALTER TABLE evaluations
    ADD COLUMN sequence_no INTEGER,
    ADD COLUMN code TEXT;

WITH numbered AS (
    SELECT
        id,
        ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY created_at ASC, id ASC) AS sequence_no
    FROM evaluations
)
UPDATE evaluations e
SET sequence_no = numbered.sequence_no,
    code = 'EV-' || LPAD(numbered.sequence_no::text, 4, '0')
FROM numbered
WHERE e.id = numbered.id;

ALTER TABLE evaluations
    ALTER COLUMN sequence_no SET NOT NULL,
    ALTER COLUMN code SET NOT NULL;

ALTER TABLE evaluations
    ADD CONSTRAINT evaluations_organization_sequence_no_key UNIQUE (organization_id, sequence_no);

CREATE INDEX idx_evaluations_org_code ON evaluations(organization_id, code);
