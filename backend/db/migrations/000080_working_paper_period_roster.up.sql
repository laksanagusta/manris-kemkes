ALTER TABLE risk_monitorings
    ADD COLUMN version_group_id UUID;

UPDATE risk_monitorings rm
SET version_group_id = r.version_group_id
FROM risks r
WHERE r.id = rm.source_risk_id
  AND rm.version_group_id IS NULL;

ALTER TABLE risk_monitorings
    ALTER COLUMN version_group_id SET NOT NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM risk_monitorings
        WHERE status IN ('draft', 'finalized')
        GROUP BY version_group_id, assessment_cycle
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'duplicate active risk monitoring exists for version_group_id + assessment_cycle';
    END IF;
END
$$;

CREATE INDEX idx_risk_monitorings_version_group
    ON risk_monitorings(version_group_id);

CREATE UNIQUE INDEX uq_risk_monitorings_group_cycle_active
    ON risk_monitorings(version_group_id, assessment_cycle)
    WHERE status IN ('draft', 'finalized');

ALTER TABLE working_paper_risks
    ADD COLUMN version_group_id UUID,
    ADD COLUMN source_risk_id UUID REFERENCES risks(id),
    ADD COLUMN monitoring_id UUID REFERENCES risk_monitorings(id),
    ADD COLUMN result_risk_id UUID REFERENCES risks(id);

UPDATE working_paper_risks wpr
SET source_risk_id = wpr.risk_id,
    version_group_id = r.version_group_id
FROM risks r
WHERE r.id = wpr.risk_id;

CREATE INDEX idx_working_paper_risks_source_risk
    ON working_paper_risks(source_risk_id);

CREATE INDEX idx_working_paper_risks_monitoring
    ON working_paper_risks(monitoring_id);

CREATE UNIQUE INDEX uq_working_paper_risks_group
    ON working_paper_risks(working_paper_id, version_group_id)
    WHERE version_group_id IS NOT NULL;

CREATE TABLE working_paper_risk_exclusions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    working_paper_id UUID NOT NULL REFERENCES working_papers(id) ON DELETE CASCADE,
    version_group_id UUID NOT NULL,
    assessment_cycle VARCHAR(7) NOT NULL,
    reason TEXT NOT NULL CHECK (trim(both ' ' from reason) <> ''),
    excluded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (working_paper_id, version_group_id)
);

CREATE INDEX idx_working_paper_risk_exclusions_working_paper
    ON working_paper_risk_exclusions(working_paper_id);
