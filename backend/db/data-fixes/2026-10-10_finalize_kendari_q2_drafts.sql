-- One-time data fix: finalize exactly 15 verified Q2 2026 score-only drafts.
-- Organization: BKK Kelas I Kendari, 523e381b-5d02-4afa-94c8-f6a2140c7131.
-- Run manually with psql -X -v ON_ERROR_STOP=1 -f <this-file>.
-- For a preview, replace the final COMMIT with ROLLBACK. Summary is before it.
-- No invented mitigation reports or backdated finalization timestamps.
-- finalized_by / actor_user_id are NULL: this is an administrative migration,
-- not an approval attributed to started_by. The original authors stay intact.
-- Existing draft scores are used; all profile content and controls are copied.
-- These 15 source risks are ARCHIVED. Preserve their archive status.
-- No Q3 tasks are generated for archived results; this does not reactivate risks.
-- All changes and backups are atomic. Reruns intentionally abort.
-- Not a generic schema migration; do not add to the automatic migrations chain.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path = public, pg_temp;

-- Short maintenance window: stop concurrent writes while validating the cohort.
LOCK TABLE risks, risk_monitorings, mitigations, mitigation_tasks,
           risk_monitoring_periods, working_paper_risks
    IN SHARE ROW EXCLUSIVE MODE NOWAIT;

CREATE TEMP TABLE _q2_expected (monitoring_id uuid PRIMARY KEY) ON COMMIT DROP;
INSERT INTO _q2_expected (monitoring_id) VALUES
    ('18b471c8-dcff-462a-847c-0da9c785d333'::uuid),
    ('dc58c480-f03a-49c0-ac89-b158b3aa0b95'::uuid),
    ('59ee1931-eda9-473f-92b4-b3e6c3b7c3e1'::uuid),
    ('cfc45fd4-d927-4e2c-8369-2afb7076008e'::uuid),
    ('c9aac864-0f85-469b-a958-fadf5df49207'::uuid),
    ('d0302395-f531-4953-a73d-cd966234bff0'::uuid),
    ('e5399641-7f48-4418-8fd7-aca975c1a6c2'::uuid),
    ('91c169e6-8eac-402f-946b-85c6780ab9f1'::uuid),
    ('ffcdb7f6-21c2-46c5-9adf-a2f2dfbaed61'::uuid),
    ('a16dd3ce-b30c-423f-ae9c-f3c37bcce897'::uuid),
    ('dd9e1ab6-1de6-49dd-8d1d-ac75df406c15'::uuid),
    ('19fa03d4-2722-4d76-aed3-140996661129'::uuid),
    ('434b531d-bd00-4930-a566-289d01b13743'::uuid),
    ('2f736eb8-a61b-45e8-a730-4e0c3eec0a77'::uuid),
    ('b80d9357-168c-4c76-9ee2-9de43e7e1a2b'::uuid);

CREATE TEMP TABLE _q2_finalize ON COMMIT DROP AS
SELECT m.id AS monitoring_id, r.id AS source_risk_id, r.version_group_id,
       gen_random_uuid() AS result_risk_id, r.code,
       m.observed_probability AS probability, m.observed_impact AS impact,
       m.started_at, m.conclusion, m.change_reason
FROM _q2_expected e
JOIN risk_monitorings m ON m.id = e.monitoring_id
JOIN risks r ON r.id = m.source_risk_id
WHERE r.organization_id = '523e381b-5d02-4afa-94c8-f6a2140c7131'::uuid
  AND m.assessment_cycle = '2026-Q2' AND m.status = 'draft';

DO $$
BEGIN
    IF to_regclass('public.data_fix_20261010_kendari_q2_backup') IS NOT NULL THEN
        RAISE EXCEPTION 'Backup already exists; do not rerun this data fix';
    END IF;
    IF (SELECT count(*) FROM _q2_finalize) <> 15
       OR (SELECT count(DISTINCT version_group_id) FROM _q2_finalize) <> 15 THEN
        RAISE EXCEPTION 'Expected the exact 15 verified drafts in 15 risk groups';
    END IF;
    IF EXISTS (
        SELECT 1 FROM _q2_finalize f
        JOIN risks r ON r.id = f.source_risk_id
        JOIN risk_monitorings m ON m.id = f.monitoring_id
        WHERE r.status <> 'final' OR NOT r.is_current
           OR r.archived_at IS NULL OR r.superseded_by_risk_id IS NOT NULL
           OR r.assessment_cycle IS DISTINCT FROM '2026-Q2'
           OR m.version_group_id IS DISTINCT FROM r.version_group_id
           OR m.result_risk_id IS NOT NULL OR m.finalized_at IS NOT NULL
           OR m.mode <> 'score_only'
           OR f.probability IS NULL OR f.probability NOT BETWEEN 1 AND 5
           OR f.impact IS NULL OR f.impact NOT BETWEEN 1 AND 5
           OR r.target_probability IS NULL OR r.target_probability NOT BETWEEN 1 AND 5
           OR r.target_impact IS NULL OR r.target_impact NOT BETWEEN 1 AND 5
           OR EXISTS (
               SELECT 1 FROM risks other
               WHERE other.version_group_id = f.version_group_id AND other.id <> r.id
                 AND (other.is_current OR other.version_number >= r.version_number
                      OR other.assessment_cycle >= '2026-Q3')
           )
           OR EXISTS (
               SELECT 1 FROM risk_monitorings other
               WHERE other.version_group_id = f.version_group_id
                 AND other.id <> f.monitoring_id AND other.status IN ('draft', 'final')
                 AND other.assessment_cycle >= '2026-Q2'
           )
           OR EXISTS (
               SELECT 1 FROM risk_monitoring_periods p
               WHERE p.version_group_id = f.version_group_id
                 AND p.period_label IN ('2026-Q2','2026-Q3','2026-Q4')
                 AND (p.status = 'completed' OR p.completed_monitoring_id IS NOT NULL
                      OR p.completed_at IS NOT NULL)
           )
    ) THEN
        RAISE EXCEPTION 'Invalid draft/source, invalid score, or conflicting later lifecycle';
    END IF;
    -- The inspected cohort has no tasks. Abort rather than destroy new reports
    -- or create duplicated Q3 tasks if someone has worked on it since inspection.
    IF EXISTS (
        SELECT 1 FROM mitigation_tasks t
        JOIN _q2_finalize f ON t.risk_id = f.source_risk_id OR t.monitoring_id = f.monitoring_id
    ) OR (SELECT count(*) FROM mitigations m JOIN _q2_finalize f ON m.risk_id=f.source_risk_id) <> 15 THEN
        RAISE EXCEPTION 'Expected 15 source mitigations and no existing tasks; reinspect changed data';
    END IF;
END $$;

-- Canonical weight matrix: internal/domain/entity/risk.go (probability rows).
CREATE TEMP TABLE _q2_weights (probability int, impact int, weight numeric,
    PRIMARY KEY (probability, impact)) ON COMMIT DROP;
INSERT INTO _q2_weights VALUES
    (1,1,1.00),(1,2,1.50),(1,3,2.00),(1,4,3.00),(1,5,4.00),
    (2,1,1.00),(2,2,1.80),(2,3,1.83),(2,4,1.90),(2,5,2.10),
    (3,1,1.17),(3,2,1.42),(3,3,1.43),(3,4,1.46),(3,5,1.47),
    (4,1,1.20),(4,2,1.19),(4,3,1.30),(4,4,1.16),(4,5,1.20),
    (5,1,1.50),(5,2,1.40),(5,3,1.13),(5,4,1.15),(5,5,1.00);

CREATE TEMP TABLE _q2_mitigations ON COMMIT DROP AS
SELECT m.id AS source_mitigation_id, gen_random_uuid() AS result_mitigation_id,
       f.result_risk_id, m.is_existing_control
FROM mitigations m JOIN _q2_finalize f ON f.source_risk_id = m.risk_id;

-- Complete original rows in JSONB for recovery; manifest records new IDs too.
CREATE TABLE data_fix_20261010_kendari_q2_backup (
    entity_type text NOT NULL, entity_id uuid NOT NULL, row_data jsonb NOT NULL,
    backed_up_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (entity_type, entity_id)
);
INSERT INTO data_fix_20261010_kendari_q2_backup (entity_type, entity_id, row_data)
SELECT 'risks', r.id, to_jsonb(r) FROM risks r JOIN _q2_finalize f ON r.id=f.source_risk_id
UNION ALL
SELECT 'risk_monitorings', m.id, to_jsonb(m) FROM risk_monitorings m JOIN _q2_finalize f ON m.id=f.monitoring_id
UNION ALL
SELECT 'risk_monitoring_periods', p.id, to_jsonb(p) FROM risk_monitoring_periods p
JOIN _q2_finalize f ON p.version_group_id=f.version_group_id
WHERE p.period_label IN ('2026-Q2','2026-Q3','2026-Q4')
UNION ALL
SELECT 'manifest_risks', f.result_risk_id, to_jsonb(f) FROM _q2_finalize f
UNION ALL
SELECT 'manifest_mitigations', m.result_mitigation_id, to_jsonb(m) FROM _q2_mitigations m;

-- Same deactivation as the application finalization transaction.
UPDATE risks r SET is_current=FALSE, is_cycle_current=FALSE, updated_at=now()
FROM _q2_finalize f WHERE r.id=f.source_risk_id;

-- Immutable Q3 result profile. Copy source content; use the draft's observed
-- probability/impact, with canonical weight and nilai (not rounded display nilai).
INSERT INTO risks (
    id, code, title, description, status,
    organization_id, created_by, risk_owner_id, control_owner_id, cause,
    risk_source, controllability, impact_description, fishbone_data, existing_control,
    control_effectiveness, probability, impact, weight, risk_priority,
    risk_appetite, treatment_option, target_probability, target_impact, target_weight,
    next_review_date, created_at, updated_at, version_group_id, previous_risk_id,
    is_current, archived_at, archived_reason, assessment_cycle, review_type,
    change_reason, review_summary, review_started_at, review_submitted_at, review_approved_at,
    draft_approval_line, category, nilai, target_nilai, is_cycle_current,
    version_number, review_schedule_text, objective_id, likelihood_assessment_id, impact_criteria_id,
    impact_justification, residual_acceptance_reason, ro_id, finalized_by, finalized_at,
    effective_from, superseded_by_risk_id
)
SELECT
    f.result_risk_id,
    r.code,
    r.title,
    r.description,
    r.status,
    r.organization_id,
    r.created_by,
    r.risk_owner_id,
    r.control_owner_id,
    r.cause,
    r.risk_source,
    r.controllability,
    r.impact_description,
    r.fishbone_data,
    r.existing_control,
    r.control_effectiveness,
    f.probability,
    f.impact,
    w.weight,
    CASE WHEN round(f.probability*f.impact*w.weight)>=20 THEN 1 WHEN round(f.probability*f.impact*w.weight)>=15 THEN 2 WHEN round(f.probability*f.impact*w.weight)>=10 THEN 3 WHEN round(f.probability*f.impact*w.weight)>=5 THEN 4 ELSE 5 END,
    r.risk_appetite,
    r.treatment_option,
    r.target_probability,
    r.target_impact,
    tw.weight,
    r.next_review_date,
    now(),
    now(),
    r.version_group_id,
    r.id,
    TRUE,
    r.archived_at,
    r.archived_reason,
    '2026-Q3',
    'periodic',
    f.change_reason,
    CASE WHEN btrim(f.conclusion)='' THEN 'Finalisasi administratif draft Q2 melalui migrasi; memakai nilai observasi tersimpan.' ELSE f.conclusion END,
    f.started_at,
    now(),
    now(),
    r.draft_approval_line,
    r.category,
    round(f.probability*f.impact*w.weight,2),
    round(r.target_probability*r.target_impact*tw.weight,2),
    TRUE,
    r.version_number+1,
    r.review_schedule_text,
    r.objective_id,
    r.likelihood_assessment_id,
    r.impact_criteria_id,
    r.impact_justification,
    r.residual_acceptance_reason,
    r.ro_id,
    NULL,
    now(),
    DATE '2026-07-01',
    NULL
FROM risks r JOIN _q2_finalize f ON r.id=f.source_risk_id
JOIN _q2_weights w ON w.probability=f.probability AND w.impact=f.impact
JOIN _q2_weights tw ON tw.probability=r.target_probability AND tw.impact=r.target_impact;

-- Copy every mitigation, including existing controls and unreported plans.
INSERT INTO mitigations (
    id, risk_id, action, owner, owner_user_id,
    due_date, frequency, recurring_interval, target_cost, sort_order,
    created_at, report_day, report_date, execution_schedule_text, mitigation_type,
    activity_stage, expected_output, quantitative_target, supporting_unit, resources_required,
    contingency_plan, potential_obstacle, is_breakthrough_activity, is_existing_control
)
SELECT
    x.result_mitigation_id,
    x.result_risk_id,
    m.action,
    m.owner,
    m.owner_user_id,
    m.due_date,
    m.frequency,
    m.recurring_interval,
    m.target_cost,
    m.sort_order,
    now(),
    m.report_day,
    m.report_date,
    m.execution_schedule_text,
    m.mitigation_type,
    m.activity_stage,
    m.expected_output,
    m.quantitative_target,
    m.supporting_unit,
    m.resources_required,
    m.contingency_plan,
    m.potential_obstacle,
    m.is_breakthrough_activity,
    m.is_existing_control
FROM mitigations m JOIN _q2_mitigations x ON x.source_mitigation_id=m.id;

UPDATE risk_monitorings m
SET status='final', result_risk_id=f.result_risk_id,
    finalized_by=NULL, finalized_at=now(), updated_at=now(),
    conclusion=CASE WHEN btrim(m.conclusion)='' THEN
        'Finalisasi administratif draft Q2 melalui migrasi; memakai nilai observasi tersimpan.'
        ELSE m.conclusion END
FROM _q2_finalize f WHERE m.id=f.monitoring_id;

-- Insert the three missing Q2 obligations too. Future obligations stay open.
INSERT INTO risk_monitoring_periods (
    version_group_id, period_label, period_start, period_end, due_date,
    status, completed_monitoring_id, completed_at
)
SELECT f.version_group_id, q.label, q.start_date, q.end_date, q.end_date,
       CASE WHEN q.label='2026-Q2' THEN 'completed' ELSE 'pending' END,
       CASE WHEN q.label='2026-Q2' THEN f.monitoring_id ELSE NULL END,
       CASE WHEN q.label='2026-Q2' THEN now() ELSE NULL END
FROM _q2_finalize f CROSS JOIN (VALUES
    ('2026-Q2', DATE '2026-04-01', DATE '2026-06-30'),
    ('2026-Q3', DATE '2026-07-01', DATE '2026-09-30'),
    ('2026-Q4', DATE '2026-10-01', DATE '2026-12-31')
) q(label,start_date,end_date)
ON CONFLICT (version_group_id,period_label) DO UPDATE
SET status='completed', completed_monitoring_id=EXCLUDED.completed_monitoring_id,
    completed_at=EXCLUDED.completed_at, updated_at=now()
WHERE EXCLUDED.period_label='2026-Q2';

-- The verified cohort has no tasks to close as not_reported.
-- Preserve archive status: do not generate new Q3 tasks for these results.

INSERT INTO audit_logs (actor_user_id,entity_type,entity_id,action,source,metadata)
SELECT NULL,'risk_monitoring',f.monitoring_id,'finalize','migration',
       jsonb_build_object(
           'dataFix','2026-10-10-kendari-q2-drafts',
           'organizationId','523e381b-5d02-4afa-94c8-f6a2140c7131',
           'administrativeFinalization',TRUE,
           'reactivateArchivedRisks',FALSE,
           'assessmentCycle','2026-Q2','resultCycle','2026-Q3',
           'sourceRiskId',f.source_risk_id,'resultRiskId',f.result_risk_id,
           'usesExistingDraftObservation',TRUE,
           'backupTable','data_fix_20261010_kendari_q2_backup')
FROM _q2_finalize f;

DO $$
BEGIN
    IF (SELECT count(*) FROM risk_monitorings m JOIN _q2_finalize f ON m.id=f.monitoring_id
        WHERE m.status='final' AND m.result_risk_id=f.result_risk_id AND m.finalized_at IS NOT NULL) <> 15
       OR (SELECT count(*) FROM risks r JOIN _q2_finalize f ON r.id=f.result_risk_id
           WHERE r.status='final' AND r.is_current AND r.is_cycle_current
             AND r.assessment_cycle='2026-Q3' AND r.effective_from=DATE '2026-07-01'
             AND r.previous_risk_id=f.source_risk_id) <> 15
       OR (SELECT count(*) FROM risk_monitoring_periods p JOIN _q2_finalize f ON p.version_group_id=f.version_group_id
           WHERE p.period_label='2026-Q2' AND p.status='completed'
             AND p.completed_monitoring_id=f.monitoring_id) <> 15
       OR (SELECT count(*) FROM mitigations m JOIN _q2_mitigations x ON m.id=x.result_mitigation_id
           WHERE m.risk_id=x.result_risk_id) <> 15
       OR EXISTS (SELECT 1 FROM mitigation_tasks t JOIN _q2_finalize f ON t.risk_id=f.result_risk_id)
       OR EXISTS (SELECT 1 FROM risks r JOIN _q2_finalize f ON r.id=f.result_risk_id
                  JOIN risks src ON src.id=f.source_risk_id
                  WHERE r.archived_at IS DISTINCT FROM src.archived_at
                     OR r.archived_reason IS DISTINCT FROM src.archived_reason)
       OR EXISTS (SELECT 1 FROM risks r JOIN _q2_finalize f ON r.id=f.source_risk_id
                  WHERE r.is_current OR r.is_cycle_current) THEN
        RAISE EXCEPTION 'Finalization postconditions failed; rolling back the entire data fix';
    END IF;
END $$;

-- Reviewable result, also printed during a ROLLBACK preview.
SELECT f.code, f.monitoring_id, f.source_risk_id, f.result_risk_id,
       r.probability, r.impact, r.weight, r.nilai, r.assessment_cycle AS result_cycle, r.archived_at
FROM _q2_finalize f JOIN risks r ON r.id=f.result_risk_id ORDER BY f.code;

ANALYZE risks;
ANALYZE risk_monitorings;
ANALYZE mitigations;
ANALYZE mitigation_tasks;
ANALYZE risk_monitoring_periods;

COMMIT;
