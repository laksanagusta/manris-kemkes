-- Reject ambiguous collapses. The migration must never silently choose between
-- two active records that would occupy the same semester.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM risk_monitorings
        WHERE status IN ('draft', 'finalized')
        GROUP BY version_group_id,
            CASE
                WHEN assessment_cycle ~ '^[0-9]{4}-Q[12]$' THEN LEFT(assessment_cycle, 4) || '-H1'
                WHEN assessment_cycle ~ '^[0-9]{4}-Q[34]$' THEN LEFT(assessment_cycle, 4) || '-H2'
                ELSE assessment_cycle
            END
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'duplicate active risk monitoring would exist after semester normalization';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM risks
        WHERE is_cycle_current = TRUE
        GROUP BY version_group_id,
            CASE
                WHEN assessment_cycle ~ '^[0-9]{4}-Q[12]$' THEN LEFT(assessment_cycle, 4) || '-H1'
                WHEN assessment_cycle ~ '^[0-9]{4}-Q[34]$' THEN LEFT(assessment_cycle, 4) || '-H2'
                ELSE assessment_cycle
            END
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'duplicate cycle-current risk would exist after semester normalization';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM mitigation_tasks
        WHERE period_label ~ '^[0-9]{4}-(Q[1-4]|H[12])$'
        GROUP BY mitigation_id,
            CASE
                WHEN period_label ~ '^[0-9]{4}-Q[12]$' THEN LEFT(period_label, 4) || '-H1'
                WHEN period_label ~ '^[0-9]{4}-Q[34]$' THEN LEFT(period_label, 4) || '-H2'
                ELSE period_label
            END
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'duplicate mitigation task would exist after semester normalization';
    END IF;
END
$$;

DROP INDEX IF EXISTS idx_risk_monitorings_active_draft;
DROP INDEX IF EXISTS idx_risk_monitorings_finalized_source_cycle;
DROP INDEX IF EXISTS uq_risk_monitorings_group_cycle_active;
DROP INDEX IF EXISTS idx_risks_cycle_current_unique;
DROP INDEX IF EXISTS idx_mitigation_tasks_unique_period;

ALTER TABLE risk_monitorings
    DROP CONSTRAINT IF EXISTS risk_monitorings_assessment_cycle_check;

UPDATE risk_monitorings
SET assessment_cycle = CASE
    WHEN assessment_cycle ~ '^[0-9]{4}-Q[12]$' THEN LEFT(assessment_cycle, 4) || '-H1'
    WHEN assessment_cycle ~ '^[0-9]{4}-Q[34]$' THEN LEFT(assessment_cycle, 4) || '-H2'
    ELSE assessment_cycle
END;

UPDATE risks
SET assessment_cycle = CASE
    WHEN assessment_cycle ~ '^[0-9]{4}-Q[12]$' THEN LEFT(assessment_cycle, 4) || '-H1'
    WHEN assessment_cycle ~ '^[0-9]{4}-Q[34]$' THEN LEFT(assessment_cycle, 4) || '-H2'
    ELSE assessment_cycle
END;

UPDATE working_papers
SET assessment_cycle = CASE
    WHEN assessment_cycle ~ '^[0-9]{4}-Q[12]$' THEN LEFT(assessment_cycle, 4) || '-H1'
    WHEN assessment_cycle ~ '^[0-9]{4}-Q[34]$' THEN LEFT(assessment_cycle, 4) || '-H2'
    ELSE assessment_cycle
END;

UPDATE working_paper_risk_exclusions
SET assessment_cycle = CASE
    WHEN assessment_cycle ~ '^[0-9]{4}-Q[12]$' THEN LEFT(assessment_cycle, 4) || '-H1'
    WHEN assessment_cycle ~ '^[0-9]{4}-Q[34]$' THEN LEFT(assessment_cycle, 4) || '-H2'
    ELSE assessment_cycle
END;

UPDATE mitigation_tasks
SET period_label = CASE
        WHEN period_label ~ '^[0-9]{4}-Q[12]$' THEN LEFT(period_label, 4) || '-H1'
        WHEN period_label ~ '^[0-9]{4}-Q[34]$' THEN LEFT(period_label, 4) || '-H2'
        ELSE period_label
    END,
    period_start = CASE
        WHEN period_label ~ '^[0-9]{4}-Q[12]$' THEN (LEFT(period_label, 4) || '-01-01')::date
        WHEN period_label ~ '^[0-9]{4}-Q[34]$' THEN (LEFT(period_label, 4) || '-07-01')::date
        ELSE period_start
    END,
    period_end = CASE
        WHEN period_label ~ '^[0-9]{4}-Q[12]$' THEN (LEFT(period_label, 4) || '-06-30')::date
        WHEN period_label ~ '^[0-9]{4}-Q[34]$' THEN (LEFT(period_label, 4) || '-12-31')::date
        ELSE period_end
    END,
    due_date = CASE
        WHEN period_label ~ '^[0-9]{4}-Q[12]$' THEN (LEFT(period_label, 4) || '-06-30')::date
        WHEN period_label ~ '^[0-9]{4}-Q[34]$' THEN (LEFT(period_label, 4) || '-12-31')::date
        ELSE due_date
    END;

ALTER TABLE risk_monitorings
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
