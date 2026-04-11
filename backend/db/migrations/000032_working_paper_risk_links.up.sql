CREATE TABLE IF NOT EXISTS working_paper_risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    working_paper_id UUID NOT NULL REFERENCES working_papers(id) ON DELETE CASCADE,
    risk_id UUID NOT NULL REFERENCES risks(id),
    sort_order INT NOT NULL DEFAULT 0,
    source_mode VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (working_paper_id, risk_id)
);

CREATE INDEX IF NOT EXISTS idx_working_paper_risks_working_paper_id
    ON working_paper_risks(working_paper_id);

CREATE INDEX IF NOT EXISTS idx_working_paper_risks_risk_id
    ON working_paper_risks(risk_id);

WITH backfill AS (
    SELECT
        wp.id AS working_paper_id,
        (snapshot.value ->> 'original_risk_id')::uuid AS risk_id,
        snapshot.ordinality - 1 AS sort_order,
        'latest_approved'::VARCHAR(30) AS source_mode
    FROM working_papers wp
    CROSS JOIN LATERAL jsonb_array_elements(
        CASE
            WHEN jsonb_typeof(wp.risk_snapshots) = 'array' THEN wp.risk_snapshots
            ELSE '[]'::jsonb
        END
    ) WITH ORDINALITY AS snapshot(value, ordinality)
    WHERE jsonb_typeof(snapshot.value) = 'object'
      AND snapshot.value ? 'original_risk_id'
      AND (snapshot.value ->> 'original_risk_id') IS NOT NULL
      AND (snapshot.value ->> 'original_risk_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
)
INSERT INTO working_paper_risks (working_paper_id, risk_id, sort_order, source_mode)
SELECT
    b.working_paper_id,
    b.risk_id,
    b.sort_order,
    b.source_mode
FROM backfill b
WHERE EXISTS (
    SELECT 1
    FROM risks r
    WHERE r.id = b.risk_id
)
ON CONFLICT (working_paper_id, risk_id) DO NOTHING;
