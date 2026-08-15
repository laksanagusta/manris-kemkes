DROP INDEX IF EXISTS idx_risk_monitoring_periods_status;
DROP INDEX IF EXISTS idx_risk_monitoring_periods_group;
DROP TABLE IF EXISTS risk_monitoring_periods;

ALTER TABLE risks
    DROP CONSTRAINT IF EXISTS risks_status_check;

UPDATE risks
SET status = CASE
    WHEN status = 'final' THEN 'approved'
    WHEN status = 'draft' THEN 'assessment_draft'
    ELSE status
END;

ALTER TABLE risk_monitorings
    DROP CONSTRAINT IF EXISTS risk_monitorings_status_check;

UPDATE risk_monitorings
SET status = 'finalized'
WHERE status = 'final';

ALTER TABLE working_paper_risks
    DROP CONSTRAINT IF EXISTS working_paper_risks_risk_id_fkey,
    DROP CONSTRAINT IF EXISTS working_paper_risks_source_risk_id_fkey,
    DROP CONSTRAINT IF EXISTS working_paper_risks_result_risk_id_fkey;

ALTER TABLE working_paper_risks
    ADD CONSTRAINT working_paper_risks_risk_id_fkey
        FOREIGN KEY (risk_id) REFERENCES risks(id),
    ADD CONSTRAINT working_paper_risks_source_risk_id_fkey
        FOREIGN KEY (source_risk_id) REFERENCES risks(id),
    ADD CONSTRAINT working_paper_risks_result_risk_id_fkey
        FOREIGN KEY (result_risk_id) REFERENCES risks(id);

ALTER TABLE risks
    DROP CONSTRAINT IF EXISTS risks_previous_risk_id_fkey;

ALTER TABLE risks
    ADD CONSTRAINT risks_previous_risk_id_fkey
    FOREIGN KEY (previous_risk_id) REFERENCES risks(id);

ALTER TABLE risk_monitorings
    DROP CONSTRAINT IF EXISTS risk_monitorings_assessment_cycle_check,
    DROP CONSTRAINT IF EXISTS risk_monitorings_assessment_cycle_quarter_check;

ALTER TABLE risks
    DROP CONSTRAINT IF EXISTS risks_assessment_cycle_quarter_check;

ALTER TABLE working_papers
    DROP CONSTRAINT IF EXISTS working_papers_assessment_cycle_quarter_check;

ALTER TABLE working_paper_risk_exclusions
    DROP CONSTRAINT IF EXISTS working_paper_risk_exclusions_cycle_quarter_check;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM risks WHERE assessment_cycle ~ '^[0-9]{4}-Q[13]$')
       OR EXISTS (SELECT 1 FROM risk_monitorings WHERE assessment_cycle ~ '^[0-9]{4}-Q[13]$')
       OR EXISTS (SELECT 1 FROM working_papers WHERE assessment_cycle ~ '^[0-9]{4}-Q[13]$')
       OR EXISTS (SELECT 1 FROM working_paper_risk_exclusions WHERE assessment_cycle ~ '^[0-9]{4}-Q[13]$')
       OR EXISTS (SELECT 1 FROM mitigation_tasks WHERE period_label ~ '^[0-9]{4}-Q[13]$') THEN
        RAISE EXCEPTION 'cannot rollback quarterly Q1/Q3 values to H1/H2 without losing period precision';
    END IF;
END
$$;

UPDATE risk_monitorings
SET assessment_cycle = LEFT(assessment_cycle, 4) || '-H1'
WHERE assessment_cycle ~ '^[0-9]{4}-Q2$';

UPDATE risk_monitorings
SET assessment_cycle = LEFT(assessment_cycle, 4) || '-H2'
WHERE assessment_cycle ~ '^[0-9]{4}-Q4$';

UPDATE risks
SET assessment_cycle = LEFT(assessment_cycle, 4) || '-H1'
WHERE assessment_cycle ~ '^[0-9]{4}-Q2$';

UPDATE risks
SET assessment_cycle = LEFT(assessment_cycle, 4) || '-H2'
WHERE assessment_cycle ~ '^[0-9]{4}-Q4$';

UPDATE working_papers
SET assessment_cycle = LEFT(assessment_cycle, 4) || '-H1'
WHERE assessment_cycle ~ '^[0-9]{4}-Q2$';

UPDATE working_papers
SET assessment_cycle = LEFT(assessment_cycle, 4) || '-H2'
WHERE assessment_cycle ~ '^[0-9]{4}-Q4$';

UPDATE working_paper_risk_exclusions
SET assessment_cycle = LEFT(assessment_cycle, 4) || '-H1'
WHERE assessment_cycle ~ '^[0-9]{4}-Q2$';

UPDATE working_paper_risk_exclusions
SET assessment_cycle = LEFT(assessment_cycle, 4) || '-H2'
WHERE assessment_cycle ~ '^[0-9]{4}-Q4$';

UPDATE mitigation_tasks
SET period_label = CASE
        WHEN period_label ~ '^[0-9]{4}-Q2$' THEN LEFT(period_label, 4) || '-H1'
        WHEN period_label ~ '^[0-9]{4}-Q4$' THEN LEFT(period_label, 4) || '-H2'
        ELSE period_label
    END,
    period_start = CASE
        WHEN period_label ~ '^[0-9]{4}-Q2$' THEN (LEFT(period_label, 4) || '-01-01')::date
        WHEN period_label ~ '^[0-9]{4}-Q4$' THEN (LEFT(period_label, 4) || '-07-01')::date
        ELSE period_start
    END,
    period_end = CASE
        WHEN period_label ~ '^[0-9]{4}-Q2$' THEN (LEFT(period_label, 4) || '-06-30')::date
        WHEN period_label ~ '^[0-9]{4}-Q4$' THEN (LEFT(period_label, 4) || '-12-31')::date
        ELSE period_end
    END,
    due_date = CASE
        WHEN period_label ~ '^[0-9]{4}-Q2$' THEN (LEFT(period_label, 4) || '-06-30')::date
        WHEN period_label ~ '^[0-9]{4}-Q4$' THEN (LEFT(period_label, 4) || '-12-31')::date
        ELSE due_date
    END
WHERE period_label ~ '^[0-9]{4}-Q[24]$';

ALTER TABLE risks
    ADD CONSTRAINT risks_status_check
    CHECK (status IN ('assessment_draft', 'assessment_in_review', 'approved'));

ALTER TABLE risk_monitorings
    ADD CONSTRAINT risk_monitorings_status_check
    CHECK (status IN ('draft', 'finalized', 'void')),
    ADD CONSTRAINT risk_monitorings_assessment_cycle_check
    CHECK (assessment_cycle ~ '^[0-9]{4}-H[12]$');

ALTER TABLE risks
    ADD CONSTRAINT risks_assessment_cycle_semester_check
    CHECK (assessment_cycle IS NULL OR assessment_cycle = '' OR assessment_cycle ~ '^[0-9]{4}-H[12]$');

ALTER TABLE working_papers
    ADD CONSTRAINT working_papers_assessment_cycle_semester_check
    CHECK (assessment_cycle IS NULL OR assessment_cycle = '' OR assessment_cycle ~ '^[0-9]{4}-H[12]$');

ALTER TABLE working_paper_risk_exclusions
    ADD CONSTRAINT working_paper_risk_exclusions_cycle_semester_check
    CHECK (assessment_cycle ~ '^[0-9]{4}-H[12]$');

DROP INDEX IF EXISTS idx_risk_monitorings_source_cycle;
DROP INDEX IF EXISTS uq_risk_monitorings_group_cycle_active;
DROP INDEX IF EXISTS idx_risks_ongoing_draft;
DROP INDEX IF EXISTS idx_risks_cycle_current_unique;
DROP INDEX IF EXISTS idx_mitigation_tasks_unique_period;

CREATE UNIQUE INDEX idx_risk_monitorings_active_draft
    ON risk_monitorings(source_risk_id, assessment_cycle)
    WHERE status = 'draft';

CREATE UNIQUE INDEX idx_risk_monitorings_finalized_source_cycle
    ON risk_monitorings(source_risk_id, assessment_cycle)
    WHERE status = 'finalized';

CREATE UNIQUE INDEX uq_risk_monitorings_group_cycle_active
    ON risk_monitorings(version_group_id, assessment_cycle)
    WHERE status IN ('draft', 'finalized');

CREATE UNIQUE INDEX idx_risks_cycle_current_unique
    ON risks(version_group_id, assessment_cycle)
    WHERE is_cycle_current = TRUE;

CREATE UNIQUE INDEX idx_mitigation_tasks_unique_period
    ON mitigation_tasks(mitigation_id, period_start, period_end);

CREATE INDEX idx_risks_ongoing_draft
    ON risks(code, created_at DESC)
    WHERE status IN ('assessment_draft', 'assessment_in_review')
      AND archived_at IS NULL;

ALTER TABLE risks
    DROP COLUMN IF EXISTS finalized_by,
    DROP COLUMN IF EXISTS finalized_at,
    DROP COLUMN IF EXISTS effective_from;
