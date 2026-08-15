-- Canonical risk lifecycle and quarterly reporting flow.
--
-- Legacy H1/H2 values are mapped to the end quarter of the corresponding
-- semester: H1 -> Q2 and H2 -> Q4. This preserves the old semester meaning
-- while making every new read/write path use YYYY-Q1..YYYY-Q4.

ALTER TABLE risks
    ADD COLUMN IF NOT EXISTS finalized_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS effective_from DATE;

-- Remove checks and derived unique indexes before normalising legacy values.
-- Versions 072-082 already created most of these objects; the IF EXISTS
-- clauses keep this migration safe for databases that were upgraded from an
-- earlier point in the chain.
ALTER TABLE risks
    DROP CONSTRAINT IF EXISTS risks_assessment_cycle_semester_check,
    DROP CONSTRAINT IF EXISTS risks_assessment_cycle_check,
    DROP CONSTRAINT IF EXISTS risks_assessment_cycle_quarter_check,
    DROP CONSTRAINT IF EXISTS risks_status_check;

ALTER TABLE risk_monitorings
    DROP CONSTRAINT IF EXISTS risk_monitorings_assessment_cycle_check,
    DROP CONSTRAINT IF EXISTS risk_monitorings_assessment_cycle_quarter_check,
    DROP CONSTRAINT IF EXISTS risk_monitorings_status_check;

ALTER TABLE working_papers
    DROP CONSTRAINT IF EXISTS working_papers_assessment_cycle_semester_check,
    DROP CONSTRAINT IF EXISTS working_papers_assessment_cycle_check,
    DROP CONSTRAINT IF EXISTS working_papers_assessment_cycle_quarter_check;

ALTER TABLE working_paper_risk_exclusions
    DROP CONSTRAINT IF EXISTS working_paper_risk_exclusions_cycle_semester_check,
    DROP CONSTRAINT IF EXISTS working_paper_risk_exclusions_cycle_check,
    DROP CONSTRAINT IF EXISTS working_paper_risk_exclusions_cycle_quarter_check;

-- A draft is disposable, including draft-only working-paper links. Final
-- risks cannot reach this path through the use case, while monitoring history
-- remains protected by its RESTRICT source-risk foreign key below.
ALTER TABLE risks
    DROP CONSTRAINT IF EXISTS risks_previous_risk_id_fkey;

ALTER TABLE working_paper_risks
    DROP CONSTRAINT IF EXISTS working_paper_risks_risk_id_fkey,
    DROP CONSTRAINT IF EXISTS working_paper_risks_source_risk_id_fkey,
    DROP CONSTRAINT IF EXISTS working_paper_risks_result_risk_id_fkey;

ALTER TABLE risks
    ADD CONSTRAINT risks_previous_risk_id_fkey
    FOREIGN KEY (previous_risk_id) REFERENCES risks(id) ON DELETE SET NULL;

ALTER TABLE working_paper_risks
    ADD CONSTRAINT working_paper_risks_risk_id_fkey
        FOREIGN KEY (risk_id) REFERENCES risks(id) ON DELETE CASCADE,
    ADD CONSTRAINT working_paper_risks_source_risk_id_fkey
        FOREIGN KEY (source_risk_id) REFERENCES risks(id) ON DELETE CASCADE,
    ADD CONSTRAINT working_paper_risks_result_risk_id_fkey
        FOREIGN KEY (result_risk_id) REFERENCES risks(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS idx_risk_monitorings_active_draft;
DROP INDEX IF EXISTS idx_risk_monitorings_finalized_source_cycle;
DROP INDEX IF EXISTS idx_risk_monitorings_final_source_cycle;
DROP INDEX IF EXISTS uq_risk_monitorings_group_cycle_active;
DROP INDEX IF EXISTS idx_risks_cycle_current_unique;
DROP INDEX IF EXISTS idx_risks_ongoing_draft;
DROP INDEX IF EXISTS idx_mitigation_tasks_unique_period;

UPDATE risks
SET status = CASE
        WHEN status IN ('approved', 'final', 'reviewed') THEN 'final'
        ELSE 'draft'
    END;

UPDATE risk_monitorings
SET status = 'final'
WHERE status = 'finalized';

UPDATE risks
SET finalized_at = COALESCE(finalized_at, review_approved_at, updated_at, created_at),
    finalized_by = COALESCE(finalized_by, created_by),
    effective_from = COALESCE(effective_from, (COALESCE(review_approved_at, updated_at, created_at))::date)
WHERE status = 'final';

-- Seed/demo rows created before assessment_cycle was mandatory for final risks
-- receive a deterministic cycle from their effective date.
UPDATE risks
SET assessment_cycle = EXTRACT(YEAR FROM effective_from)::text || '-Q' ||
    CEIL(EXTRACT(MONTH FROM effective_from) / 3.0)::int
WHERE status = 'final'
  AND (assessment_cycle IS NULL OR assessment_cycle = '')
  AND effective_from IS NOT NULL;

UPDATE risks
SET assessment_cycle = CASE
    WHEN assessment_cycle ~ '^[0-9]{4}-H1$' THEN LEFT(assessment_cycle, 4) || '-Q2'
    WHEN assessment_cycle ~ '^[0-9]{4}-H2$' THEN LEFT(assessment_cycle, 4) || '-Q4'
    ELSE assessment_cycle
END;

UPDATE risk_monitorings
SET assessment_cycle = CASE
    WHEN assessment_cycle ~ '^[0-9]{4}-H1$' THEN LEFT(assessment_cycle, 4) || '-Q2'
    WHEN assessment_cycle ~ '^[0-9]{4}-H2$' THEN LEFT(assessment_cycle, 4) || '-Q4'
    ELSE assessment_cycle
END;

UPDATE working_papers
SET assessment_cycle = CASE
    WHEN assessment_cycle ~ '^[0-9]{4}-H1$' THEN LEFT(assessment_cycle, 4) || '-Q2'
    WHEN assessment_cycle ~ '^[0-9]{4}-H2$' THEN LEFT(assessment_cycle, 4) || '-Q4'
    ELSE assessment_cycle
END;

UPDATE working_paper_risk_exclusions
SET assessment_cycle = CASE
    WHEN assessment_cycle ~ '^[0-9]{4}-H1$' THEN LEFT(assessment_cycle, 4) || '-Q2'
    WHEN assessment_cycle ~ '^[0-9]{4}-H2$' THEN LEFT(assessment_cycle, 4) || '-Q4'
    ELSE assessment_cycle
END;

-- Mitigation tasks also carry the reporting period. Preserve their dates when
-- already quarterly, and repair the dates for legacy semester rows.
UPDATE mitigation_tasks
SET period_label = CASE
        WHEN period_label ~ '^[0-9]{4}-H1$' THEN LEFT(period_label, 4) || '-Q2'
        WHEN period_label ~ '^[0-9]{4}-H2$' THEN LEFT(period_label, 4) || '-Q4'
        ELSE period_label
    END,
    period_start = CASE
        WHEN period_label ~ '^[0-9]{4}-H1$' THEN (LEFT(period_label, 4) || '-04-01')::date
        WHEN period_label ~ '^[0-9]{4}-H2$' THEN (LEFT(period_label, 4) || '-10-01')::date
        ELSE period_start
    END,
    period_end = CASE
        WHEN period_label ~ '^[0-9]{4}-H1$' THEN (LEFT(period_label, 4) || '-06-30')::date
        WHEN period_label ~ '^[0-9]{4}-H2$' THEN (LEFT(period_label, 4) || '-12-31')::date
        ELSE period_end
    END,
    due_date = CASE
        WHEN period_label ~ '^[0-9]{4}-H1$' THEN (LEFT(period_label, 4) || '-06-30')::date
        WHEN period_label ~ '^[0-9]{4}-H2$' THEN (LEFT(period_label, 4) || '-12-31')::date
        ELSE due_date
    END
WHERE period_label ~ '^[0-9]{4}-H[12]$';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM risk_monitorings
        WHERE status IN ('draft', 'final')
        GROUP BY version_group_id, assessment_cycle
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'duplicate active risk monitoring exists after quarterly normalisation';
    END IF;

    IF EXISTS (
        SELECT 1 FROM risks
        WHERE is_cycle_current = TRUE
        GROUP BY version_group_id, assessment_cycle
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'duplicate cycle-current risk exists after quarterly normalisation';
    END IF;

    IF EXISTS (
        SELECT 1 FROM mitigation_tasks
        WHERE period_label ~ '^[0-9]{4}-Q[1-4]$'
        GROUP BY mitigation_id, period_start, period_end
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'duplicate mitigation task period exists after quarterly normalisation';
    END IF;
END
$$;

ALTER TABLE risks
    ADD CONSTRAINT risks_status_check CHECK (status IN ('draft', 'final')),
    ADD CONSTRAINT risks_assessment_cycle_quarter_check
        CHECK (assessment_cycle IS NULL OR assessment_cycle = '' OR assessment_cycle ~ '^[0-9]{4}-Q[1-4]$');

ALTER TABLE risk_monitorings
    ADD CONSTRAINT risk_monitorings_status_check CHECK (status IN ('draft', 'final', 'void')),
    ADD CONSTRAINT risk_monitorings_assessment_cycle_check
        CHECK (assessment_cycle ~ '^[0-9]{4}-Q[1-4]$');

ALTER TABLE working_papers
    ADD CONSTRAINT working_papers_assessment_cycle_quarter_check
        CHECK (assessment_cycle IS NULL OR assessment_cycle = '' OR assessment_cycle ~ '^[0-9]{4}-Q[1-4]$');

ALTER TABLE working_paper_risk_exclusions
    ADD CONSTRAINT working_paper_risk_exclusions_cycle_quarter_check
        CHECK (assessment_cycle ~ '^[0-9]{4}-Q[1-4]$');

-- One active transaction per logical risk and quarter. Void corrections do
-- not occupy this slot, so a correction can reopen the same period safely.
CREATE UNIQUE INDEX uq_risk_monitorings_group_cycle_active
    ON risk_monitorings(version_group_id, assessment_cycle)
    WHERE status IN ('draft', 'final');

-- Supports the draft lookup and final-history lookup by source risk.
CREATE INDEX idx_risk_monitorings_source_cycle
    ON risk_monitorings(source_risk_id, assessment_cycle)
    WHERE status IN ('draft', 'final');

CREATE UNIQUE INDEX idx_risks_cycle_current_unique
    ON risks(version_group_id, assessment_cycle)
    WHERE is_cycle_current = TRUE;

CREATE UNIQUE INDEX idx_mitigation_tasks_unique_period
    ON mitigation_tasks(mitigation_id, period_start, period_end);

CREATE INDEX idx_risks_ongoing_draft
    ON risks(code, created_at DESC)
    WHERE status = 'draft' AND archived_at IS NULL;

-- A period is an obligation, not an empty monitoring form. The form row is
-- created only when the user starts monitoring.
CREATE TABLE IF NOT EXISTS risk_monitoring_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_group_id UUID NOT NULL,
    period_label VARCHAR(7) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'overdue', 'completed')),
    completed_monitoring_id UUID REFERENCES risk_monitorings(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT risk_monitoring_periods_label_check CHECK (period_label ~ '^[0-9]{4}-Q[1-4]$'),
    CONSTRAINT risk_monitoring_periods_dates_check CHECK (period_start <= period_end AND period_end <= due_date),
    CONSTRAINT uq_risk_monitoring_period UNIQUE (version_group_id, period_label)
);

CREATE INDEX IF NOT EXISTS idx_risk_monitoring_periods_status
    ON risk_monitoring_periods(status, due_date);
CREATE INDEX IF NOT EXISTS idx_risk_monitoring_periods_group
    ON risk_monitoring_periods(version_group_id, period_label);

INSERT INTO risk_monitoring_periods (
    version_group_id, period_label, period_start, period_end, due_date
)
SELECT
    r.version_group_id,
    EXTRACT(YEAR FROM r.effective_from)::text || '-Q' || q.quarter,
    make_date(EXTRACT(YEAR FROM r.effective_from)::int, ((q.quarter - 1) * 3) + 1, 1),
    (make_date(EXTRACT(YEAR FROM r.effective_from)::int + CASE WHEN q.quarter = 4 THEN 1 ELSE 0 END,
        CASE WHEN q.quarter = 4 THEN 1 ELSE (q.quarter * 3) + 1 END, 1) - INTERVAL '1 day')::date,
    (make_date(EXTRACT(YEAR FROM r.effective_from)::int + CASE WHEN q.quarter = 4 THEN 1 ELSE 0 END,
        CASE WHEN q.quarter = 4 THEN 1 ELSE (q.quarter * 3) + 1 END, 1) - INTERVAL '1 day')::date
FROM risks r
CROSS JOIN (VALUES (1), (2), (3), (4)) AS q(quarter)
WHERE r.status = 'final'
  AND r.is_current = TRUE
  AND r.effective_from IS NOT NULL
  AND (make_date(EXTRACT(YEAR FROM r.effective_from)::int + CASE WHEN q.quarter = 4 THEN 1 ELSE 0 END,
        CASE WHEN q.quarter = 4 THEN 1 ELSE (q.quarter * 3) + 1 END, 1) - INTERVAL '1 day')::date >= r.effective_from
ON CONFLICT (version_group_id, period_label) DO NOTHING;

-- Preserve monitoring history: existing final transactions complete their
-- corresponding obligation instead of appearing as newly pending periods.
UPDATE risk_monitoring_periods period
SET status = 'completed',
    completed_monitoring_id = monitoring.id,
    completed_at = COALESCE(monitoring.finalized_at, monitoring.updated_at),
    updated_at = now()
FROM risk_monitorings monitoring
WHERE monitoring.status = 'final'
  AND monitoring.version_group_id = period.version_group_id
  AND monitoring.assessment_cycle = period.period_label;

ALTER TABLE risk_monitorings
    DROP CONSTRAINT IF EXISTS risk_monitorings_source_risk_id_fkey;

ALTER TABLE risk_monitorings
    ADD CONSTRAINT risk_monitorings_source_risk_id_fkey
    FOREIGN KEY (source_risk_id) REFERENCES risks(id) ON DELETE RESTRICT;
