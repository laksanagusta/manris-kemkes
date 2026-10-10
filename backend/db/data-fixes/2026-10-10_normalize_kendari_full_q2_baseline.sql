-- One-time continuation: complete Kendari's administrative Q2 baseline.
-- ORGANIZATION: 523e381b-5d02-4afa-94c8-f6a2140c7131 (BKK Kelas I Kendari).
-- PREREQUISITE: the previous 15-Q2-draft finalization has already succeeded.
-- Expected input: 63 current groups; 49 Q2 finals, 8 legacy Q4 finals,
-- 6 archived Q3 score-only drafts; 16 current Q2 profiles and 47 current Q3 profiles.
-- Expected output: 63 official Q2 finals, 63 current Q3 profiles, NO drafts.
-- All 40 unarchived / 23 archived groups retain their archive state.
-- Historical/superseded risk versions keep their history; only official current
-- profiles are all Q3. No future Q3/Q4 monitoring transactions are generated.
-- Preserve all completed mitigation reports byte-for-byte. Move 8 untouched
-- pending 2027-Q1 tasks on the 8 corrected results to Q3. Skip only unreported
-- pending Q3 tasks on superseded intermediate versions (retain original rows).
-- Production has 4 pending + 4 done intermediate tasks; local has 6 + 2.
-- Validate each of the 8 tasks rather than assuming a fixed pending count.
-- Do not attribute administrative finalization to another user or backdate it.
-- Independent backup name: never drop the earlier data-fix backup to run this.
-- Run manually: psql -X -v ON_ERROR_STOP=1 -f <this-file>
-- PREVIEW: replace the final COMMIT with ROLLBACK; review the summary before it.
-- A server with different data will abort BEFORE persistent modifications.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path = public, pg_temp;
LOCK TABLE risks, risk_monitorings, mitigations, mitigation_tasks,
           risk_monitoring_periods, working_paper_risks
    IN SHARE ROW EXCLUSIVE MODE NOWAIT;

CREATE TEMP TABLE _baseline_groups ON COMMIT DROP AS
SELECT r.id AS original_current_risk_id, r.version_group_id, r.code,
       r.archived_at, r.archived_reason
FROM risks r
WHERE r.organization_id='523e381b-5d02-4afa-94c8-f6a2140c7131'::uuid AND r.is_current;

CREATE TEMP TABLE _baseline_previous15 (monitoring_id uuid PRIMARY KEY) ON COMMIT DROP;
INSERT INTO _baseline_previous15 (monitoring_id) VALUES
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


CREATE TEMP TABLE _baseline_expected (
    monitoring_id uuid PRIMARY KEY, risk_code text NOT NULL, repair text NOT NULL
) ON COMMIT DROP;
INSERT INTO _baseline_expected VALUES
    ('6a2ca216-d32a-401c-9bca-4503cf336345'::uuid,'R-216','finalize_draft'),
    ('3a136014-983b-4f09-841e-d7481f782d0c'::uuid,'R-217','finalize_draft'),
    ('b27f9944-d178-4cd4-8480-52c6c2523779'::uuid,'R-221','finalize_draft'),
    ('010616f0-5f2f-4897-ad49-dd5535276837'::uuid,'R-222','finalize_draft'),
    ('fb913ec4-56f1-4e06-bc67-3dfdb93cb8f4'::uuid,'R-223','finalize_draft'),
    ('4e972eec-5161-4aea-8e0d-4394ff1faedc'::uuid,'R-229','finalize_draft'),
    ('aeb5d79c-700b-424f-84c4-5f0c2b337be7'::uuid,'R-205','correct_q4'),
    ('d695b50f-4b38-4c22-bba3-e1c30f330662'::uuid,'R-225','correct_q4'),
    ('f4d09955-a94c-4473-864d-779b3bdd7287'::uuid,'R-228','correct_q4'),
    ('9a277d98-6d2e-42f4-85bb-37d35885cc74'::uuid,'R-230','correct_q4'),
    ('e5030ae8-7772-4593-866d-b559b7f9448f'::uuid,'R-231','correct_q4'),
    ('d90ba478-2ede-48a4-a2c4-96c3ca4b640d'::uuid,'R-232','correct_q4'),
    ('b93f61f1-5eab-43c3-8650-15111b305b88'::uuid,'R-233','correct_q4'),
    ('fd89d0c7-628c-4050-a411-97f4a6f0ecca'::uuid,'R-234','correct_q4'),
    ('e3850f66-26c3-4ee5-bbd6-e80c5e62648d'::uuid,'RPL-12-hg1ym','correct_result'),
    ('639ab9ff-9aac-485b-8b38-9d9b814b614b'::uuid,'RPL-14-gf052','correct_result');

CREATE TEMP TABLE _baseline_drafts ON COMMIT DROP AS
SELECT m.id AS monitoring_id, r.id AS source_risk_id, r.version_group_id,
       gen_random_uuid() AS result_risk_id, r.code,
       m.observed_probability AS probability, m.observed_impact AS impact,
       m.started_at, m.conclusion, m.change_reason
FROM _baseline_expected e JOIN risk_monitorings m ON m.id=e.monitoring_id
JOIN risks r ON r.id=m.source_risk_id
JOIN _baseline_groups g ON g.version_group_id=m.version_group_id
WHERE e.repair='finalize_draft' AND m.status='draft' AND m.assessment_cycle='2026-Q3'
  AND r.is_current AND r.code=e.risk_code;

CREATE TEMP TABLE _baseline_q4 ON COMMIT DROP AS
SELECT m.id AS monitoring_id, m.version_group_id, original.id AS baseline_risk_id,
       middle.id AS intermediate_risk_id, result.id AS result_risk_id, result.code
FROM _baseline_expected e JOIN risk_monitorings m ON m.id=e.monitoring_id
JOIN risks middle ON middle.id=m.source_risk_id
JOIN risks original ON original.id=middle.previous_risk_id
JOIN risks result ON result.id=m.result_risk_id
JOIN _baseline_groups g ON g.version_group_id=m.version_group_id
WHERE e.repair='correct_q4' AND m.assessment_cycle='2026-Q4' AND m.status='final'
  AND result.is_current AND result.code=e.risk_code;

CREATE TEMP TABLE _baseline_wrong_results ON COMMIT DROP AS
SELECT m.id AS monitoring_id, m.version_group_id, r.id AS result_risk_id, r.code
FROM _baseline_expected e JOIN risk_monitorings m ON m.id=e.monitoring_id
JOIN risks r ON r.id=m.result_risk_id
JOIN _baseline_groups g ON g.version_group_id=m.version_group_id
WHERE e.repair='correct_result' AND m.assessment_cycle='2026-Q2' AND m.status='final'
  AND r.is_current AND r.assessment_cycle='2026-Q2' AND r.code=e.risk_code;

DO $$
BEGIN
    IF to_regclass('public.data_fix_20261010_kendari_full_q2_backup') IS NOT NULL THEN
        RAISE EXCEPTION 'Full-baseline backup already exists; verify completion, do not rerun';
    END IF;
    IF (SELECT count(*) FROM _baseline_groups) <> 63
       OR (SELECT count(DISTINCT version_group_id) FROM _baseline_groups) <> 63
       OR (SELECT count(*) FROM _baseline_groups WHERE archived_at IS NULL) <> 40
       OR (SELECT count(DISTINCT version_group_id) FROM risks
           WHERE organization_id='523e381b-5d02-4afa-94c8-f6a2140c7131'::uuid) <> 63 THEN
        RAISE EXCEPTION 'Expected 63 current risk groups (40 unarchived, 23 archived)';
    END IF;
    IF EXISTS (SELECT 1 FROM risks r JOIN _baseline_groups g ON g.version_group_id=r.version_group_id
               WHERE r.organization_id IS DISTINCT FROM '523e381b-5d02-4afa-94c8-f6a2140c7131'::uuid)
       OR EXISTS (SELECT 1 FROM risks r JOIN _baseline_groups g ON r.id=g.original_current_risk_id
                  WHERE r.status<>'final' OR r.superseded_by_risk_id IS NOT NULL
                     OR r.assessment_cycle NOT IN ('2026-Q2','2026-Q3') OR r.assessment_cycle IS NULL)
       OR (SELECT count(*) FROM risks r JOIN _baseline_groups g ON r.id=g.original_current_risk_id
           WHERE r.assessment_cycle='2026-Q2') <> 16 THEN
        RAISE EXCEPTION 'Current profile cohort differs from inspected data';
    END IF;
    IF (SELECT count(*) FROM _baseline_previous15 e JOIN risk_monitorings m ON m.id=e.monitoring_id
        JOIN risks src ON src.id=m.source_risk_id JOIN risks result ON result.id=m.result_risk_id
        JOIN _baseline_groups g ON g.version_group_id=m.version_group_id
        WHERE m.status='final' AND m.assessment_cycle='2026-Q2'
          AND result.is_current AND result.assessment_cycle='2026-Q3'
          AND result.archived_at IS NOT NULL AND result.previous_risk_id=src.id
          AND src.organization_id='523e381b-5d02-4afa-94c8-f6a2140c7131'::uuid) <> 15 THEN
        RAISE EXCEPTION 'Previous 15-draft Q2 finalization is not complete; inspect before proceeding';
    END IF;
    IF (SELECT count(*) FROM _baseline_drafts) <> 6
       OR (SELECT count(*) FROM _baseline_q4) <> 8
       OR (SELECT count(*) FROM _baseline_wrong_results) <> 2 THEN
        RAISE EXCEPTION 'Expected exactly 6 specified drafts, 8 specified Q4 finals and 2 Q2 result repairs';
    END IF;
    IF (SELECT count(*) FROM risk_monitorings m JOIN _baseline_groups g ON g.version_group_id=m.version_group_id
        WHERE m.status='final' AND m.assessment_cycle='2026-Q2') <> 49
       OR (SELECT count(*) FROM risk_monitorings m JOIN _baseline_groups g ON g.version_group_id=m.version_group_id
           WHERE m.status='draft') <> 6
       OR (SELECT count(*) FROM risk_monitorings m JOIN _baseline_groups g ON g.version_group_id=m.version_group_id
           WHERE m.status IN ('draft','final')) <> 63
       OR EXISTS (SELECT 1 FROM risk_monitorings m JOIN _baseline_groups g ON g.version_group_id=m.version_group_id
                  JOIN risks src ON src.id=m.source_risk_id
                  WHERE src.version_group_id<>m.version_group_id
                     OR src.organization_id IS DISTINCT FROM '523e381b-5d02-4afa-94c8-f6a2140c7131'::uuid)
       OR EXISTS (SELECT 1 FROM risk_monitorings m JOIN _baseline_groups g ON g.version_group_id=m.version_group_id
                  WHERE m.status IN ('draft','final') GROUP BY m.version_group_id HAVING count(*)<>1) THEN
        RAISE EXCEPTION 'Unexpected active monitoring counts or cross-group source links';
    END IF;
    IF EXISTS (
        SELECT 1 FROM _baseline_drafts f JOIN risk_monitorings m ON m.id=f.monitoring_id
        JOIN risks r ON r.id=f.source_risk_id
        WHERE m.mode<>'score_only' OR m.result_risk_id IS NOT NULL OR m.finalized_at IS NOT NULL
          OR m.superseded_by_monitoring_id IS NOT NULL OR r.archived_at IS NULL
          OR r.assessment_cycle IS DISTINCT FROM '2026-Q2'
          OR f.probability IS NULL OR f.probability NOT BETWEEN 1 AND 5
          OR f.impact IS NULL OR f.impact NOT BETWEEN 1 AND 5
          OR r.target_probability IS NULL OR r.target_probability NOT BETWEEN 1 AND 5
          OR r.target_impact IS NULL OR r.target_impact NOT BETWEEN 1 AND 5
          OR EXISTS (SELECT 1 FROM risks other WHERE other.version_group_id=f.version_group_id
                     AND other.id<>r.id AND (other.version_number>=r.version_number OR other.is_cycle_current))
          OR EXISTS (SELECT 1 FROM mitigation_tasks t WHERE t.risk_id=r.id OR t.monitoring_id=m.id)
    ) THEN
        RAISE EXCEPTION 'Invalid draft source, changed version chain, score, or unexpected task reports';
    END IF;
    IF EXISTS (
        SELECT 1 FROM _baseline_q4 f JOIN risk_monitorings m ON m.id=f.monitoring_id
        JOIN risks original ON original.id=f.baseline_risk_id
        JOIN risks middle ON middle.id=f.intermediate_risk_id
        JOIN risks result ON result.id=f.result_risk_id
        WHERE m.mode<>'with_profile_revision' OR m.finalized_at IS NULL
          OR m.started_at>=TIMESTAMPTZ '2026-10-01 00:00:00+07'
          OR m.finalized_at>=TIMESTAMPTZ '2026-10-01 00:00:00+07'
          OR original.version_group_id<>f.version_group_id OR middle.version_group_id<>f.version_group_id
          OR result.version_group_id<>f.version_group_id
          OR original.status<>'final' OR middle.status<>'final' OR result.status<>'final'
          OR original.version_number<>1 OR middle.version_number<>2 OR result.version_number<>3
          OR original.is_current OR middle.is_current
          OR original.superseded_by_risk_id IS NOT NULL OR middle.superseded_by_risk_id IS NOT NULL
          OR result.previous_risk_id<>middle.id OR result.assessment_cycle IS DISTINCT FROM '2026-Q2'
          OR original.probability IS NULL OR original.probability NOT BETWEEN 1 AND 5
          OR original.impact IS NULL OR original.impact NOT BETWEEN 1 AND 5
          OR original.assessment_cycle NOT IN ('2026-Q2','2026-Q3')
          OR middle.assessment_cycle IS DISTINCT FROM '2026-Q3'
          OR EXISTS (SELECT 1 FROM mitigation_tasks t WHERE t.monitoring_id=m.id)
    ) THEN
        RAISE EXCEPTION 'Q4 legacy chain no longer matches verified v1 -> v2 -> v3 cohort';
    END IF;
    IF EXISTS (
        SELECT 1 FROM risk_monitoring_periods p JOIN _baseline_groups g ON g.version_group_id=p.version_group_id
        WHERE p.status='completed' AND NOT EXISTS (
            SELECT 1 FROM risk_monitorings m WHERE m.id=p.completed_monitoring_id
              AND m.version_group_id=p.version_group_id AND m.status='final'
              AND m.assessment_cycle=p.period_label
        )
    ) OR EXISTS (
        SELECT 1 FROM risk_monitoring_periods p JOIN _baseline_groups g ON g.version_group_id=p.version_group_id
        WHERE p.period_label='2026-Q3' AND (p.status='completed' OR p.completed_monitoring_id IS NOT NULL)
    ) THEN
        RAISE EXCEPTION 'Unexpected completed monitoring periods; no genuine Q3 work may be overwritten';
    END IF;
    IF (SELECT count(*) FROM mitigation_tasks t JOIN _baseline_q4 f ON t.risk_id=f.result_risk_id) <> 8
       OR EXISTS (
           SELECT 1 FROM mitigation_tasks t JOIN _baseline_q4 f ON t.risk_id=f.result_risk_id
           WHERE t.period_label<>'2027-Q1' OR t.period_start<>DATE '2027-01-01'
             OR t.period_end<>DATE '2027-03-31' OR t.due_date<>DATE '2027-03-31'
             OR t.status<>'pending' OR t.monitoring_id IS NOT NULL OR t.reported_at IS NOT NULL
             OR t.reported_by IS NOT NULL OR coalesce(btrim(t.notes),'')<>''
             OR coalesce(btrim(t.evidence_url),'')<>'' OR btrim(t.report_output)<>'' OR btrim(t.report_obstacle)<>''
       ) THEN
        RAISE EXCEPTION 'Expected 8 untouched pending Q1-2027 tasks; do not overwrite genuine reports';
    END IF;
    IF (SELECT count(*) FROM mitigation_tasks t JOIN _baseline_q4 f ON t.risk_id=f.intermediate_risk_id) <> 8
       OR (SELECT count(DISTINCT t.risk_id) FROM mitigation_tasks t
           JOIN _baseline_q4 f ON t.risk_id=f.intermediate_risk_id) <> 8
       OR EXISTS (SELECT 1 FROM mitigation_tasks t JOIN _baseline_q4 f ON t.risk_id=f.intermediate_risk_id
                  WHERE t.period_label<>'2026-Q3'
                     OR t.status NOT IN ('pending','overdue','done')
                     OR (t.status IN ('pending','overdue') AND
                         (t.reported_at IS NOT NULL OR t.reported_by IS NOT NULL
                          OR coalesce(btrim(t.notes),'')<>'' OR coalesce(btrim(t.evidence_url),'')<>''
                          OR btrim(t.report_output)<>'' OR btrim(t.report_obstacle)<>''))
                     OR (t.status='done' AND
                         (t.reported_at IS NULL OR coalesce(btrim(t.notes),'')=''))) THEN
        RAISE EXCEPTION 'Unexpected actionable tasks on intermediate versions; inspect before supersession';
    END IF;
END $$;

-- Snapshot every original row in this organization before ANY persistent change.
CREATE TABLE data_fix_20261010_kendari_full_q2_backup (
    entity_type text NOT NULL, entity_id uuid NOT NULL, row_data jsonb NOT NULL,
    backed_up_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (entity_type,entity_id)
);
INSERT INTO data_fix_20261010_kendari_full_q2_backup (entity_type,entity_id,row_data)
SELECT 'risks',r.id,to_jsonb(r) FROM risks r JOIN _baseline_groups g ON g.version_group_id=r.version_group_id
UNION ALL
SELECT 'risk_monitorings',m.id,to_jsonb(m) FROM risk_monitorings m JOIN _baseline_groups g ON g.version_group_id=m.version_group_id
UNION ALL
SELECT 'risk_monitoring_periods',p.id,to_jsonb(p) FROM risk_monitoring_periods p JOIN _baseline_groups g ON g.version_group_id=p.version_group_id
UNION ALL
SELECT 'mitigations',m.id,to_jsonb(m) FROM mitigations m JOIN risks r ON r.id=m.risk_id
JOIN _baseline_groups g ON g.version_group_id=r.version_group_id
UNION ALL
SELECT 'mitigation_tasks',t.id,to_jsonb(t) FROM mitigation_tasks t JOIN risks r ON r.id=t.risk_id
JOIN _baseline_groups g ON g.version_group_id=r.version_group_id
UNION ALL
SELECT 'working_paper_risks',w.id,to_jsonb(w) FROM working_paper_risks w JOIN risks r ON r.id=w.risk_id
JOIN _baseline_groups g ON g.version_group_id=r.version_group_id
UNION ALL
SELECT 'manifest_groups',g.version_group_id,to_jsonb(g) FROM _baseline_groups g
UNION ALL
SELECT 'manifest_new_risks',f.result_risk_id,to_jsonb(f) FROM _baseline_drafts f;

-- Canonical weight matrix: internal/domain/entity/risk.go (probability rows).
CREATE TEMP TABLE _baseline_weights (probability int, impact int, weight numeric,
    PRIMARY KEY (probability, impact)) ON COMMIT DROP;
INSERT INTO _baseline_weights VALUES
    (1,1,1.00),(1,2,1.50),(1,3,2.00),(1,4,3.00),(1,5,4.00),
    (2,1,1.00),(2,2,1.80),(2,3,1.83),(2,4,1.90),(2,5,2.10),
    (3,1,1.17),(3,2,1.42),(3,3,1.43),(3,4,1.46),(3,5,1.47),
    (4,1,1.20),(4,2,1.19),(4,3,1.30),(4,4,1.16),(4,5,1.20),
    (5,1,1.50),(5,2,1.40),(5,3,1.13),(5,4,1.15),(5,5,1.00);

CREATE TEMP TABLE _baseline_mitigations ON COMMIT DROP AS
SELECT m.id AS source_mitigation_id, gen_random_uuid() AS result_mitigation_id,
       f.result_risk_id, m.is_existing_control
FROM mitigations m JOIN _baseline_drafts f ON f.source_risk_id = m.risk_id;


INSERT INTO data_fix_20261010_kendari_full_q2_backup (entity_type,entity_id,row_data)
SELECT 'manifest_new_mitigations',x.result_mitigation_id,to_jsonb(x) FROM _baseline_mitigations x;

-- Clear cycle-current flags before reassignment to avoid per-cycle unique-index collisions.
UPDATE risks r SET is_cycle_current=FALSE,updated_at=now()
FROM _baseline_groups g WHERE r.version_group_id=g.version_group_id AND r.is_cycle_current;
UPDATE risks r SET is_current=FALSE,updated_at=now()
FROM _baseline_drafts f WHERE r.id=f.source_risk_id;

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
FROM risks r JOIN _baseline_drafts f ON r.id=f.source_risk_id
JOIN _baseline_weights w ON w.probability=f.probability AND w.impact=f.impact
JOIN _baseline_weights tw ON tw.probability=r.target_probability AND tw.impact=r.target_impact;

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
FROM mitigations m JOIN _baseline_mitigations x ON x.source_mitigation_id=m.id;

-- Convert the 6 legacy Q3 drafts into Q2 baseline outcomes; keep their IDs,
-- including existing working-paper references. Administrative completion is now.
UPDATE risk_monitorings m SET assessment_cycle='2026-Q2',status='final',
    result_risk_id=f.result_risk_id,finalized_by=NULL,finalized_at=now(),updated_at=now(),
    conclusion=CASE WHEN btrim(m.conclusion)='' THEN
        'Finalisasi administratif baseline Q2; draft lama Q3 dinormalisasi memakai nilai observasi tersimpan.'
        ELSE m.conclusion END
FROM _baseline_drafts f WHERE m.id=f.monitoring_id;

-- For the 8 mislabelled Q4 outcomes, use the original profile as Q2 baseline
-- and keep the latest substantive result as the official Q3 profile.
UPDATE risks r SET assessment_cycle='2026-Q2',effective_from=DATE '2026-04-01',updated_at=now()
FROM _baseline_q4 f WHERE r.id=f.baseline_risk_id;
UPDATE risks r SET superseded_by_risk_id=f.result_risk_id,
    is_current=FALSE,is_cycle_current=FALSE,updated_at=now()
FROM _baseline_q4 f WHERE r.id=f.intermediate_risk_id;
UPDATE risks r SET assessment_cycle='2026-Q3',effective_from=DATE '2026-07-01',
    previous_risk_id=f.baseline_risk_id,updated_at=now()
FROM _baseline_q4 f WHERE r.id=f.result_risk_id;
UPDATE risk_monitorings m SET assessment_cycle='2026-Q2',source_risk_id=src.id,
    source_probability=src.probability,source_impact=src.impact,source_weight=src.weight,
    source_nilai=round(coalesce(src.nilai,0)),source_version_number=src.version_number,
    source_level=CASE WHEN round(coalesce(src.nilai,0))>=20 THEN 'sangat_tinggi'
                      WHEN round(coalesce(src.nilai,0))>=15 THEN 'tinggi'
                      WHEN round(coalesce(src.nilai,0))>=10 THEN 'sedang'
                      WHEN round(coalesce(src.nilai,0))>=5 THEN 'rendah' ELSE 'sangat_rendah' END,
    updated_at=now()
FROM _baseline_q4 f JOIN risks src ON src.id=f.baseline_risk_id WHERE m.id=f.monitoring_id;

-- Two existing Q2 outcomes already have valid final monitoring; fix result labels only.
UPDATE risks r SET assessment_cycle='2026-Q3',effective_from=DATE '2026-07-01',updated_at=now()
FROM _baseline_wrong_results f WHERE r.id=f.result_risk_id;

-- Official per-quarter snapshots: one source for Q2 and one current result for Q3.
UPDATE risks r SET is_cycle_current=TRUE,updated_at=now()
FROM risk_monitorings m JOIN _baseline_groups g ON g.version_group_id=m.version_group_id
WHERE m.status='final' AND m.assessment_cycle='2026-Q2' AND r.id=m.source_risk_id;
UPDATE risks r SET is_cycle_current=TRUE,updated_at=now()
FROM _baseline_groups g WHERE r.version_group_id=g.version_group_id AND r.is_current;

INSERT INTO risk_monitoring_periods (
    version_group_id,period_label,period_start,period_end,due_date,status,completed_monitoring_id,completed_at
)
SELECT m.version_group_id,'2026-Q2',DATE '2026-04-01',DATE '2026-06-30',DATE '2026-06-30',
       'completed',m.id,m.finalized_at
FROM risk_monitorings m JOIN _baseline_groups g ON g.version_group_id=m.version_group_id
WHERE m.status='final' AND m.assessment_cycle='2026-Q2'
ON CONFLICT (version_group_id,period_label) DO UPDATE
SET period_start=EXCLUDED.period_start,period_end=EXCLUDED.period_end,due_date=EXCLUDED.due_date,
    status='completed',completed_monitoring_id=EXCLUDED.completed_monitoring_id,
    completed_at=EXCLUDED.completed_at,updated_at=now();

-- Q3 and Q4 obligations are open, with no fabricated completion records.
INSERT INTO risk_monitoring_periods (version_group_id,period_label,period_start,period_end,due_date)
SELECT g.version_group_id,q.label,q.start_date,q.end_date,q.end_date
FROM _baseline_groups g CROSS JOIN (VALUES
    ('2026-Q3',DATE '2026-07-01',DATE '2026-09-30'),
    ('2026-Q4',DATE '2026-10-01',DATE '2026-12-31')
) q(label,start_date,end_date)
ON CONFLICT (version_group_id,period_label) DO UPDATE
SET status='pending',completed_monitoring_id=NULL,completed_at=NULL,updated_at=now();

-- Preserve all done reports. Remove only unreported tasks from the actionable
-- queue on superseded middle versions, without deleting their audit history.
UPDATE mitigation_tasks t SET status='skipped',
    notes='[Migrasi baseline Q2] Tugas ditutup karena versi profil digantikan; laporan tidak dibuat.',
    updated_at=now()
FROM _baseline_q4 f WHERE t.risk_id=f.intermediate_risk_id AND t.status IN ('pending','overdue');
UPDATE mitigation_tasks t SET period_label='2026-Q3',period_start=DATE '2026-07-01',
    period_end=DATE '2026-09-30',due_date=DATE '2026-09-30',updated_at=now()
FROM _baseline_q4 f WHERE t.risk_id=f.result_risk_id;

INSERT INTO audit_logs (actor_user_id,entity_type,entity_id,action,source,metadata)
SELECT NULL,'risk_monitoring',m.id,'normalize_q2_baseline','migration',
       jsonb_build_object('dataFix','2026-10-10-kendari-full-q2-baseline',
           'organizationId','523e381b-5d02-4afa-94c8-f6a2140c7131',
           'administrativeNormalization',TRUE,'assessmentCycle','2026-Q2','resultCycle','2026-Q3',
           'sourceRiskId',m.source_risk_id,'resultRiskId',m.result_risk_id,
           'originalCurrentRiskId',g.original_current_risk_id,
           'originalMonitoringCycle',b.row_data->>'assessment_cycle',
           'originalMonitoringStatus',b.row_data->>'status',
           'preserveArchiveState',TRUE,'backupTable','data_fix_20261010_kendari_full_q2_backup')
FROM risk_monitorings m JOIN _baseline_groups g ON g.version_group_id=m.version_group_id
JOIN data_fix_20261010_kendari_full_q2_backup b ON b.entity_type='risk_monitorings' AND b.entity_id=m.id
WHERE m.status='final' AND m.assessment_cycle='2026-Q2';

-- Abort the entire transaction if the ORGANIZATION-WIDE target is not met.
DO $$
BEGIN
    IF (SELECT count(*) FROM risks r JOIN _baseline_groups g ON g.version_group_id=r.version_group_id
        WHERE r.is_current AND r.status='final' AND r.assessment_cycle='2026-Q3' AND r.is_cycle_current
          AND r.effective_from=DATE '2026-07-01') <> 63
       OR EXISTS (SELECT 1 FROM risks r JOIN _baseline_groups g ON g.version_group_id=r.version_group_id
                  WHERE r.is_current GROUP BY r.version_group_id HAVING count(*)<>1)
       OR EXISTS (SELECT 1 FROM risks r JOIN _baseline_groups g ON g.version_group_id=r.version_group_id
                  WHERE r.is_current AND (r.assessment_cycle IS DISTINCT FROM '2026-Q3'
                     OR r.archived_at IS DISTINCT FROM g.archived_at
                     OR r.archived_reason IS DISTINCT FROM g.archived_reason))
       OR (SELECT count(*) FROM risk_monitorings m JOIN _baseline_groups g ON g.version_group_id=m.version_group_id
           WHERE m.status='final' AND m.assessment_cycle='2026-Q2') <> 63
       OR EXISTS (SELECT 1 FROM risk_monitorings m JOIN _baseline_groups g ON g.version_group_id=m.version_group_id
                  WHERE m.status='draft' OR (m.status='final' AND m.assessment_cycle<>'2026-Q2'))
       OR (SELECT count(*) FROM risk_monitorings m JOIN _baseline_groups g ON g.version_group_id=m.version_group_id
           JOIN risks src ON src.id=m.source_risk_id JOIN risks res ON res.id=m.result_risk_id
           WHERE m.status='final' AND m.assessment_cycle='2026-Q2'
             AND src.assessment_cycle='2026-Q2' AND src.is_cycle_current AND NOT src.is_current
             AND res.assessment_cycle='2026-Q3' AND res.is_current AND res.is_cycle_current
             AND res.previous_risk_id=src.id AND res.version_group_id=m.version_group_id
             AND m.finalized_at IS NOT NULL) <> 63
       OR (SELECT count(*) FROM risk_monitoring_periods p JOIN _baseline_groups g ON g.version_group_id=p.version_group_id
           JOIN risk_monitorings m ON m.id=p.completed_monitoring_id
           WHERE p.period_label='2026-Q2' AND p.status='completed'
             AND m.version_group_id=p.version_group_id AND m.status='final' AND m.assessment_cycle='2026-Q2') <> 63
       OR (SELECT count(*) FROM risk_monitoring_periods p JOIN _baseline_groups g ON g.version_group_id=p.version_group_id
           WHERE p.period_label IN ('2026-Q3','2026-Q4') AND p.status='pending'
             AND p.completed_monitoring_id IS NULL AND p.completed_at IS NULL) <> 126 THEN
        RAISE EXCEPTION 'Organization-wide postconditions failed; all changes will roll back';
    END IF;
    IF EXISTS (SELECT 1 FROM data_fix_20261010_kendari_full_q2_backup b
               LEFT JOIN mitigation_tasks t ON t.id=b.entity_id
               WHERE b.entity_type='mitigation_tasks' AND b.row_data->>'status'='done'
                 AND to_jsonb(t) IS DISTINCT FROM b.row_data)
       OR EXISTS (SELECT 1 FROM data_fix_20261010_kendari_full_q2_backup b
                  LEFT JOIN working_paper_risks w ON w.id=b.entity_id
                  WHERE b.entity_type='working_paper_risks' AND to_jsonb(w) IS DISTINCT FROM b.row_data)
       OR EXISTS (SELECT 1 FROM mitigation_tasks t JOIN _baseline_drafts f ON t.risk_id=f.result_risk_id)
       OR (SELECT count(*) FROM mitigation_tasks t JOIN _baseline_q4 f ON t.risk_id=f.result_risk_id
           WHERE t.period_label='2026-Q3' AND t.status='pending') <> 8
       OR EXISTS (SELECT 1 FROM mitigation_tasks t JOIN _baseline_q4 f ON t.risk_id=f.intermediate_risk_id
                  WHERE t.status IN ('pending','overdue')) THEN
        RAISE EXCEPTION 'Task/report preservation or working-paper postconditions failed';
    END IF;
END $$;

SELECT 'current_q3_profiles' AS check_name,count(*) AS actual,63 AS expected
FROM risks r JOIN _baseline_groups g ON g.version_group_id=r.version_group_id
WHERE r.is_current AND r.assessment_cycle='2026-Q3'
UNION ALL
SELECT 'official_q2_final_monitorings',count(*),63
FROM risk_monitorings m JOIN _baseline_groups g ON g.version_group_id=m.version_group_id
WHERE m.status='final' AND m.assessment_cycle='2026-Q2'
UNION ALL
SELECT 'remaining_drafts',count(*),0
FROM risk_monitorings m JOIN _baseline_groups g ON g.version_group_id=m.version_group_id WHERE m.status='draft'
UNION ALL
SELECT 'archived_current_profiles',count(*),23
FROM risks r JOIN _baseline_groups g ON g.version_group_id=r.version_group_id WHERE r.is_current AND r.archived_at IS NOT NULL;

ANALYZE risks;
ANALYZE risk_monitorings;
ANALYZE risk_monitoring_periods;
ANALYZE mitigations;
ANALYZE mitigation_tasks;
COMMIT;
