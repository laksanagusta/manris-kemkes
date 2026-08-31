-- Best-effort rollback. Q1/Q3 cannot be represented by the legacy H1/H2 model.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM risks WHERE assessment_cycle ~ '^[0-9]{4}-Q[13]$'
    ) OR EXISTS (
        SELECT 1 FROM risk_monitorings WHERE assessment_cycle ~ '^[0-9]{4}-Q[13]$'
    ) OR EXISTS (
        SELECT 1 FROM working_papers WHERE assessment_cycle ~ '^[0-9]{4}-Q[13]$'
    ) OR EXISTS (
        SELECT 1 FROM working_paper_risk_exclusions WHERE assessment_cycle ~ '^[0-9]{4}-Q[13]$'
    ) THEN
        RAISE EXCEPTION 'Cannot roll back quarterly data containing Q1 or Q3 cycles';
    END IF;
END;
$$;

DROP TABLE IF EXISTS risk_monitoring_periods;

ALTER TABLE risks
    DROP CONSTRAINT IF EXISTS risks_status_check,
    DROP CONSTRAINT IF EXISTS risks_assessment_cycle_quarter_check;

ALTER TABLE risk_monitorings
    DROP CONSTRAINT IF EXISTS risk_monitorings_status_check,
    DROP CONSTRAINT IF EXISTS risk_monitorings_assessment_cycle_check;

ALTER TABLE working_papers
    DROP CONSTRAINT IF EXISTS working_papers_assessment_cycle_quarter_check;

ALTER TABLE working_paper_risk_exclusions
    DROP CONSTRAINT IF EXISTS working_paper_risk_exclusions_cycle_quarter_check;

UPDATE risks
SET assessment_cycle = LEFT(assessment_cycle, 4) || '-H1'
WHERE assessment_cycle ~ '^[0-9]{4}-Q[12]$';

UPDATE risks
SET assessment_cycle = LEFT(assessment_cycle, 4) || '-H2'
WHERE assessment_cycle ~ '^[0-9]{4}-Q[34]$';

UPDATE risk_monitorings
SET assessment_cycle = LEFT(assessment_cycle, 4) || '-H1'
WHERE assessment_cycle ~ '^[0-9]{4}-Q[12]$';

UPDATE risk_monitorings
SET assessment_cycle = LEFT(assessment_cycle, 4) || '-H2'
WHERE assessment_cycle ~ '^[0-9]{4}-Q[34]$';

UPDATE working_papers
SET assessment_cycle = LEFT(assessment_cycle, 4) || '-H1'
WHERE assessment_cycle ~ '^[0-9]{4}-Q[12]$';

UPDATE working_papers
SET assessment_cycle = LEFT(assessment_cycle, 4) || '-H2'
WHERE assessment_cycle ~ '^[0-9]{4}-Q[34]$';

UPDATE working_paper_risk_exclusions
SET assessment_cycle = LEFT(assessment_cycle, 4) || '-H1'
WHERE assessment_cycle ~ '^[0-9]{4}-Q[12]$';

UPDATE working_paper_risk_exclusions
SET assessment_cycle = LEFT(assessment_cycle, 4) || '-H2'
WHERE assessment_cycle ~ '^[0-9]{4}-Q[34]$';

UPDATE risks
SET status = CASE WHEN status = 'final' THEN 'approved' ELSE 'assessment_draft' END;

ALTER TABLE risks
    DROP COLUMN IF EXISTS finalized_by,
    DROP COLUMN IF EXISTS finalized_at,
    DROP COLUMN IF EXISTS effective_from;
