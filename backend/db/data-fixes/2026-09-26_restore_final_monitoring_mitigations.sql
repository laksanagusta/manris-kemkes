-- Restore mitigation plans omitted from 45 active risk profiles created by
-- finalized monitoring. Copy the immediate previous version's plan fields and
-- create fresh pending tasks for the next cycle; historical task reports and
-- completion statuses are deliberately not copied.
--
-- This is a one-time local data repair. Backups and an ID map are retained in
-- permanent data_fix_* tables so the inserted rows can be audited or removed.

BEGIN;

LOCK TABLE risk_monitorings IN SHARE ROW EXCLUSIVE MODE NOWAIT;
LOCK TABLE risks IN SHARE ROW EXCLUSIVE MODE NOWAIT;
LOCK TABLE mitigations IN SHARE ROW EXCLUSIVE MODE NOWAIT;
LOCK TABLE mitigation_tasks IN SHARE ROW EXCLUSIVE MODE NOWAIT;

CREATE TEMP TABLE _monitoring_mitigation_restore_targets ON COMMIT DROP AS
SELECT
    current_risk.id AS target_risk_id,
    current_risk.version_group_id,
    current_risk.previous_risk_id AS source_risk_id,
    current_risk.code AS risk_code,
    current_risk.assessment_cycle AS active_cycle,
    monitoring.id AS monitoring_id,
    monitoring.assessment_cycle AS monitoring_cycle
FROM risks current_risk
JOIN risks source_risk
  ON source_risk.id = current_risk.previous_risk_id
 AND source_risk.version_group_id = current_risk.version_group_id
JOIN risk_monitorings monitoring
  ON monitoring.result_risk_id = current_risk.id
 AND monitoring.status = 'final'
WHERE current_risk.is_current = TRUE
  AND current_risk.is_cycle_current = TRUE
  AND current_risk.status = 'final'
  AND NOT EXISTS (
      SELECT 1 FROM mitigations current_plan
      WHERE current_plan.risk_id = current_risk.id
  )
  AND EXISTS (
      SELECT 1 FROM mitigations prior_plan
      WHERE prior_plan.risk_id = source_risk.id
  );

DO $$
BEGIN
    IF (SELECT COUNT(*) FROM _monitoring_mitigation_restore_targets) <> 45
       OR (SELECT COUNT(DISTINCT target_risk_id) FROM _monitoring_mitigation_restore_targets) <> 45 THEN
        RAISE EXCEPTION 'Expected exactly 45 unique active finalized risks needing mitigation restore';
    END IF;
    IF EXISTS (
        SELECT 1 FROM _monitoring_mitigation_restore_targets
        WHERE monitoring_cycle !~ '^[0-9]{4}-Q[1-4]$'
    ) THEN
        RAISE EXCEPTION 'A monitoring cycle is not a valid quarterly cycle';
    END IF;
    IF EXISTS (
        SELECT 1 FROM _monitoring_mitigation_restore_targets target
        JOIN risk_monitorings monitoring ON monitoring.id = target.monitoring_id
        WHERE monitoring.finalized_at IS NULL
    ) THEN
        RAISE EXCEPTION 'A linked final monitoring has no finalized_at timestamp';
    END IF;
    IF EXISTS (
        SELECT 1 FROM mitigation_tasks task
        JOIN _monitoring_mitigation_restore_targets target ON target.target_risk_id = task.risk_id
    ) THEN
        RAISE EXCEPTION 'An active target already has mitigation tasks; inspect before restoring';
    END IF;
    IF to_regclass('public.data_fix_20260926_mitigation_restore_targets_backup') IS NOT NULL
       OR to_regclass('public.data_fix_20260926_mitigation_restore_source_backup') IS NOT NULL
       OR to_regclass('public.data_fix_20260926_mitigation_restore_map') IS NOT NULL THEN
        RAISE EXCEPTION 'A mitigation restore backup already exists; this repair may already have run';
    END IF;
END $$;

CREATE TEMP TABLE _monitoring_mitigation_restore_rows ON COMMIT DROP AS
SELECT
    gen_random_uuid() AS new_mitigation_id,
    target.target_risk_id,
    target.source_risk_id,
    target.monitoring_id,
    target.risk_code,
    target.active_cycle,
    target.monitoring_cycle,
    source_plan.id AS source_mitigation_id,
    source_plan.action,
    source_plan.owner,
    source_plan.owner_user_id,
    source_plan.due_date,
    source_plan.frequency,
    source_plan.recurring_interval,
    source_plan.target_cost,
    source_plan.sort_order,
    source_plan.report_day,
    source_plan.report_date,
    source_plan.execution_schedule_text,
    source_plan.mitigation_type,
    source_plan.activity_stage,
    source_plan.expected_output,
    source_plan.quantitative_target,
    source_plan.supporting_unit,
    source_plan.resources_required,
    source_plan.contingency_plan,
    source_plan.potential_obstacle,
    source_plan.is_breakthrough_activity,
    source_plan.is_existing_control,
    CASE WHEN source_plan.is_existing_control THEN NULL::uuid ELSE gen_random_uuid() END AS new_task_id,
    next_period.period_start,
    (next_period.period_start + INTERVAL '3 months' - INTERVAL '1 day')::date AS period_end,
    to_char(next_period.period_start, 'YYYY') || '-Q' || EXTRACT(QUARTER FROM next_period.period_start)::int AS next_cycle
FROM _monitoring_mitigation_restore_targets target
JOIN mitigations source_plan ON source_plan.risk_id = target.source_risk_id
CROSS JOIN LATERAL (
    SELECT make_date(
        split_part(target.monitoring_cycle, '-Q', 1)::int
            + CASE WHEN split_part(target.monitoring_cycle, '-Q', 2)::int = 4 THEN 1 ELSE 0 END,
        (split_part(target.monitoring_cycle, '-Q', 2)::int % 4) * 3 + 1,
        1
    ) AS period_start
) next_period;

DO $$
BEGIN
    IF (SELECT COUNT(*) FROM _monitoring_mitigation_restore_rows) <> 76 THEN
        RAISE EXCEPTION 'Expected 76 source mitigation plans, found %',
            (SELECT COUNT(*) FROM _monitoring_mitigation_restore_rows);
    END IF;
    IF (SELECT COUNT(*) FROM _monitoring_mitigation_restore_rows WHERE NOT is_existing_control) <> 75
       OR (SELECT COUNT(*) FROM _monitoring_mitigation_restore_rows WHERE is_existing_control) <> 1 THEN
        RAISE EXCEPTION 'Expected 75 actionable plans and 1 existing control';
    END IF;
END $$;

CREATE TABLE data_fix_20260926_mitigation_restore_targets_backup AS
SELECT target.target_risk_id, current_risk.*
FROM _monitoring_mitigation_restore_targets target
JOIN risks current_risk ON current_risk.id = target.target_risk_id;

CREATE TABLE data_fix_20260926_mitigation_restore_source_backup AS
SELECT target.target_risk_id, target.monitoring_id, source_plan.*
FROM _monitoring_mitigation_restore_targets target
JOIN mitigations source_plan ON source_plan.risk_id = target.source_risk_id;

CREATE TABLE data_fix_20260926_mitigation_restore_map AS
SELECT
    new_mitigation_id,
    target_risk_id,
    source_risk_id,
    source_mitigation_id,
    monitoring_id,
    new_task_id,
    next_cycle,
    period_start,
    period_end,
    is_existing_control
FROM _monitoring_mitigation_restore_rows;

DO $$
BEGIN
    IF (SELECT COUNT(*) FROM data_fix_20260926_mitigation_restore_targets_backup) <> 45
       OR (SELECT COUNT(*) FROM data_fix_20260926_mitigation_restore_source_backup) <> 76
       OR (SELECT COUNT(*) FROM data_fix_20260926_mitigation_restore_map) <> 76 THEN
        RAISE EXCEPTION 'Backup row counts do not match expected restore scope';
    END IF;
END $$;

INSERT INTO mitigations (
    id, risk_id, action, owner, owner_user_id, due_date, frequency,
    recurring_interval, target_cost, sort_order, report_day, report_date,
    execution_schedule_text, mitigation_type, activity_stage, expected_output,
    quantitative_target, supporting_unit, resources_required, contingency_plan,
    potential_obstacle, is_breakthrough_activity, is_existing_control
)
SELECT
    new_mitigation_id, target_risk_id, action, owner, owner_user_id, due_date,
    frequency, recurring_interval, target_cost, sort_order, report_day, report_date,
    execution_schedule_text, mitigation_type, activity_stage, expected_output,
    quantitative_target, supporting_unit, resources_required, contingency_plan,
    potential_obstacle, is_breakthrough_activity, is_existing_control
FROM _monitoring_mitigation_restore_rows;

INSERT INTO mitigation_tasks (
    id, mitigation_id, risk_id, monitoring_id, period_label, period_start,
    period_end, due_date, status, generated_by, report_output, report_obstacle
)
SELECT
    new_task_id, new_mitigation_id, target_risk_id, NULL, next_cycle,
    period_start, period_end, period_end, 'pending', 'manual', '', ''
FROM _monitoring_mitigation_restore_rows
WHERE new_task_id IS NOT NULL;

DO $$
BEGIN
    IF (SELECT COUNT(*)
        FROM mitigations restored
        JOIN data_fix_20260926_mitigation_restore_map mapping
          ON mapping.new_mitigation_id = restored.id
         AND mapping.target_risk_id = restored.risk_id) <> 76 THEN
        RAISE EXCEPTION 'Not all 76 mitigation plans were restored';
    END IF;
    IF (SELECT COUNT(*)
        FROM mitigation_tasks task
        JOIN data_fix_20260926_mitigation_restore_map mapping ON mapping.new_task_id = task.id
        WHERE task.status = 'pending'
          AND task.period_label = mapping.next_cycle
          AND task.period_start = mapping.period_start
          AND task.period_end = mapping.period_end) <> 75 THEN
        RAISE EXCEPTION 'Expected 75 fresh pending mitigation tasks';
    END IF;
    IF EXISTS (
        SELECT 1 FROM _monitoring_mitigation_restore_targets target
        WHERE (SELECT COUNT(*) FROM mitigations restored WHERE restored.risk_id = target.target_risk_id)
           <> (SELECT COUNT(*) FROM mitigations prior WHERE prior.risk_id = target.source_risk_id)
    ) THEN
        RAISE EXCEPTION 'Restored plan count differs from the immediate previous version';
    END IF;
END $$;

COMMIT;
