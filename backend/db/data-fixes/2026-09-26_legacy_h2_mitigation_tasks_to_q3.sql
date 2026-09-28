-- One-time repair for the verified local dataset. Do not add this to the
-- generic schema migration chain: a future, genuine Q4 task must stay Q4.
-- The backup table preserves complete pre-change rows for recovery.
BEGIN;

DO $$
BEGIN
    IF (SELECT COUNT(*) FROM mitigation_tasks WHERE period_label = '2026-Q4') <> 202 THEN
        RAISE EXCEPTION 'Expected exactly 202 legacy Q4 mitigation tasks';
    END IF;
    IF EXISTS (
        SELECT 1 FROM mitigation_tasks
        WHERE period_label = '2026-Q4'
          AND (period_start <> DATE '2026-10-01'
            OR period_end <> DATE '2026-12-31'
            OR due_date <> DATE '2026-12-31'
            OR created_at >= TIMESTAMPTZ '2026-10-01 00:00:00+00')
    ) THEN
        RAISE EXCEPTION 'A Q4 task does not match the verified legacy cohort';
    END IF;
    IF EXISTS (
        SELECT 1 FROM mitigation_tasks q4
        JOIN mitigation_tasks q3 ON q3.mitigation_id = q4.mitigation_id
        WHERE q4.period_label = '2026-Q4'
          AND q3.period_start = DATE '2026-07-01'
          AND q3.period_end = DATE '2026-09-30'
    ) THEN
        RAISE EXCEPTION 'Existing Q3 task would conflict with the repair';
    END IF;
    IF to_regclass('public.data_fix_20260926_mitigation_q4_backup') IS NOT NULL THEN
        RAISE EXCEPTION 'Backup table already exists; this repair was already attempted';
    END IF;
END $$;

CREATE TABLE data_fix_20260926_mitigation_q4_backup AS
SELECT * FROM mitigation_tasks WHERE period_label = '2026-Q4';

DO $$
DECLARE changed_count integer;
BEGIN
    UPDATE mitigation_tasks
    SET period_label = '2026-Q3',
        period_start = DATE '2026-07-01',
        period_end = DATE '2026-09-30',
        due_date = DATE '2026-09-30',
        updated_at = now()
    WHERE id IN (SELECT id FROM data_fix_20260926_mitigation_q4_backup);
    GET DIAGNOSTICS changed_count = ROW_COUNT;
    IF changed_count <> 202 THEN
        RAISE EXCEPTION 'Expected to repair 202 tasks, changed %', changed_count;
    END IF;
END $$;

COMMIT;
