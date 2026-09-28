-- One-time reconciliation for the verified 2026 lifecycle cohort.
--
-- For 32 duplicate chains, preserve the first monitoring as superseded audit
-- history, make the later monitoring the official Q2 record, and move its
-- resulting risk profile to Q3. Eight unrelated Q4 final records are left
-- untouched. Fifteen Q4 drafts are relabeled Q3.
-- Run only after migration 67. All changes and backups are transactional.

BEGIN;

LOCK TABLE risk_monitorings IN SHARE ROW EXCLUSIVE MODE NOWAIT;
LOCK TABLE risks IN SHARE ROW EXCLUSIVE MODE NOWAIT;
LOCK TABLE risk_monitoring_periods IN SHARE ROW EXCLUSIVE MODE NOWAIT;

CREATE TEMP TABLE _q2_lifecycle_pairs ON COMMIT DROP AS
SELECT
    latest.id AS latest_monitoring_id,
    prior.id AS prior_monitoring_id,
    latest.version_group_id,
    prior.source_risk_id AS v1_id,
    prior.result_risk_id AS v2_id,
    latest.result_risk_id AS v3_id
FROM risk_monitorings latest
JOIN risk_monitorings prior
  ON prior.version_group_id = latest.version_group_id
 AND prior.assessment_cycle = '2026-Q2'
 AND prior.status = 'final'
 AND prior.result_risk_id = latest.source_risk_id
WHERE latest.assessment_cycle = '2026-Q4'
  AND latest.status = 'final';

CREATE TEMP TABLE _q3_draft_monitorings ON COMMIT DROP AS
SELECT id, version_group_id
FROM risk_monitorings
WHERE assessment_cycle = '2026-Q4'
  AND status = 'draft';

DO $$
DECLARE
    pair_count integer;
    draft_count integer;
    unpaired_final_count integer;
    q4_count integer;
BEGIN
    SELECT COUNT(*) INTO pair_count FROM _q2_lifecycle_pairs;
    SELECT COUNT(*) INTO draft_count FROM _q3_draft_monitorings;
    SELECT COUNT(*) INTO q4_count
    FROM risk_monitorings
    WHERE assessment_cycle = '2026-Q4';
    SELECT COUNT(*) INTO unpaired_final_count
    FROM risk_monitorings latest
    WHERE latest.assessment_cycle = '2026-Q4'
      AND latest.status = 'final'
      AND NOT EXISTS (
          SELECT 1 FROM _q2_lifecycle_pairs pair
          WHERE pair.latest_monitoring_id = latest.id
      );

    IF pair_count <> 32 OR (SELECT COUNT(DISTINCT version_group_id) FROM _q2_lifecycle_pairs) <> 32 THEN
        RAISE EXCEPTION 'Expected 32 unique Q2-to-Q4 monitoring pairs, found %', pair_count;
    END IF;
    IF draft_count <> 15 THEN
        RAISE EXCEPTION 'Expected 15 Q4 draft monitorings, found %', draft_count;
    END IF;
    IF q4_count <> 55 THEN
        RAISE EXCEPTION 'Expected exactly 55 Q4 monitorings, found %', q4_count;
    END IF;
    IF unpaired_final_count <> 8 THEN
        RAISE EXCEPTION 'Expected 8 unrelated Q4 final monitorings to remain untouched, found %', unpaired_final_count;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM _q2_lifecycle_pairs pair
        JOIN risks v1 ON v1.id = pair.v1_id
        JOIN risks v2 ON v2.id = pair.v2_id
        JOIN risks v3 ON v3.id = pair.v3_id
        WHERE v1.status IS DISTINCT FROM 'final'
           OR v2.status IS DISTINCT FROM 'final'
           OR v3.status IS DISTINCT FROM 'final'
           OR v1.version_number IS DISTINCT FROM 1
           OR v2.version_number IS DISTINCT FROM 2
           OR v3.version_number IS DISTINCT FROM 3
           OR v1.assessment_cycle IS DISTINCT FROM '2026-Q2'
           OR v2.assessment_cycle IS DISTINCT FROM '2026-Q2'
           OR v3.assessment_cycle IS DISTINCT FROM '2026-Q2'
           OR v2.previous_risk_id IS DISTINCT FROM v1.id
           OR v3.previous_risk_id IS DISTINCT FROM v2.id
    ) THEN
        RAISE EXCEPTION 'A paired risk chain no longer matches the verified v1 → v2 → v3 cohort';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM _q2_lifecycle_pairs pair
        JOIN risk_monitorings latest ON latest.id = pair.latest_monitoring_id
        WHERE latest.result_risk_id IS NULL
           OR latest.finalized_at IS NULL
           OR latest.mode IS DISTINCT FROM 'with_profile_revision'
           OR EXISTS (
                SELECT 1 FROM mitigation_tasks task
                WHERE task.monitoring_id = latest.id
           )
           OR EXISTS (
                SELECT 1 FROM risk_monitorings current_q3
                WHERE current_q3.version_group_id = pair.version_group_id
                  AND current_q3.assessment_cycle = '2026-Q3'
                  AND current_q3.status IN ('draft', 'final')
           )
           OR EXISTS (
                SELECT 1 FROM risks current_q3
                WHERE current_q3.version_group_id = pair.version_group_id
                  AND current_q3.assessment_cycle = '2026-Q3'
                  AND current_q3.is_cycle_current = TRUE
                  AND current_q3.id <> pair.v3_id
           )
    ) THEN
        RAISE EXCEPTION 'A paired monitoring has a missing result, attached tasks, or an active Q3 collision';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM _q2_lifecycle_pairs pair
        WHERE EXISTS (
            SELECT 1 FROM risk_monitoring_periods period
            WHERE period.version_group_id = pair.version_group_id
              AND period.period_label = '2026-Q2'
        )
           OR NOT EXISTS (
                SELECT 1 FROM risk_monitoring_periods period
                WHERE period.version_group_id = pair.version_group_id
                  AND period.period_label = '2026-Q3'
                  AND period.status = 'pending'
           )
           OR NOT EXISTS (
                SELECT 1 FROM risk_monitoring_periods period
                WHERE period.version_group_id = pair.version_group_id
                  AND period.period_label = '2026-Q4'
                  AND period.status = 'completed'
                  AND period.completed_monitoring_id = pair.latest_monitoring_id
           )
    ) THEN
        RAISE EXCEPTION 'A paired monitoring period ledger no longer matches the verified state';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM _q3_draft_monitorings draft
        WHERE EXISTS (
            SELECT 1 FROM risk_monitorings current_q3
            WHERE current_q3.version_group_id = draft.version_group_id
              AND current_q3.assessment_cycle = '2026-Q3'
              AND current_q3.status IN ('draft', 'final')
        )
    ) THEN
        RAISE EXCEPTION 'A draft already has an active Q3 monitoring';
    END IF;

    IF to_regclass('public.data_fix_20260926_lifecycle_monitorings_backup') IS NOT NULL
       OR to_regclass('public.data_fix_20260926_lifecycle_risks_backup') IS NOT NULL
       OR to_regclass('public.data_fix_20260926_lifecycle_periods_backup') IS NOT NULL THEN
        RAISE EXCEPTION 'A lifecycle backup table already exists; this repair may have been attempted';
    END IF;
END $$;

CREATE TABLE data_fix_20260926_lifecycle_monitorings_backup AS
SELECT monitoring.*
FROM risk_monitorings monitoring
WHERE monitoring.id IN (
    SELECT latest_monitoring_id FROM _q2_lifecycle_pairs
    UNION
    SELECT prior_monitoring_id FROM _q2_lifecycle_pairs
    UNION
    SELECT id FROM _q3_draft_monitorings
);

CREATE TABLE data_fix_20260926_lifecycle_risks_backup AS
SELECT risk.*
FROM risks risk
WHERE risk.id IN (
    SELECT v1_id FROM _q2_lifecycle_pairs
    UNION
    SELECT v2_id FROM _q2_lifecycle_pairs
    UNION
    SELECT v3_id FROM _q2_lifecycle_pairs
);

CREATE TABLE data_fix_20260926_lifecycle_periods_backup AS
SELECT period.*
FROM risk_monitoring_periods period
JOIN _q2_lifecycle_pairs pair ON pair.version_group_id = period.version_group_id
WHERE period.period_label IN ('2026-Q3', '2026-Q4');

DO $$
BEGIN
    IF (SELECT COUNT(*) FROM data_fix_20260926_lifecycle_monitorings_backup) <> 79 THEN
        RAISE EXCEPTION 'Expected 79 monitoring backup rows';
    END IF;
    IF (SELECT COUNT(*) FROM data_fix_20260926_lifecycle_risks_backup) <> 96 THEN
        RAISE EXCEPTION 'Expected 96 risk backup rows';
    END IF;
    IF (SELECT COUNT(*) FROM data_fix_20260926_lifecycle_periods_backup) <> 64 THEN
        RAISE EXCEPTION 'Expected 64 monitoring-period backup rows';
    END IF;
END $$;

DO $$
DECLARE
    changed_count integer;
BEGIN
    UPDATE risk_monitorings prior
    SET status = 'superseded',
        superseded_by_monitoring_id = pair.latest_monitoring_id,
        updated_at = now()
    FROM _q2_lifecycle_pairs pair
    WHERE prior.id = pair.prior_monitoring_id;
    GET DIAGNOSTICS changed_count = ROW_COUNT;
    IF changed_count <> 32 THEN
        RAISE EXCEPTION 'Expected to supersede 32 prior monitorings, changed %', changed_count;
    END IF;

    UPDATE risks middle
    SET superseded_by_risk_id = pair.v3_id,
        is_current = FALSE,
        is_cycle_current = FALSE,
        updated_at = now()
    FROM _q2_lifecycle_pairs pair
    WHERE middle.id = pair.v2_id;
    GET DIAGNOSTICS changed_count = ROW_COUNT;
    IF changed_count <> 32 THEN
        RAISE EXCEPTION 'Expected to supersede 32 middle risk versions, changed %', changed_count;
    END IF;

    UPDATE risks result
    SET assessment_cycle = '2026-Q3',
        effective_from = DATE '2026-07-01',
        previous_risk_id = pair.v1_id,
        is_current = TRUE,
        is_cycle_current = TRUE,
        updated_at = now()
    FROM _q2_lifecycle_pairs pair
    WHERE result.id = pair.v3_id;
    GET DIAGNOSTICS changed_count = ROW_COUNT;
    IF changed_count <> 32 THEN
        RAISE EXCEPTION 'Expected to move 32 result profiles to Q3, changed %', changed_count;
    END IF;

    UPDATE risks source
    SET is_cycle_current = TRUE,
        updated_at = now()
    FROM _q2_lifecycle_pairs pair
    WHERE source.id = pair.v1_id;
    GET DIAGNOSTICS changed_count = ROW_COUNT;
    IF changed_count <> 32 THEN
        RAISE EXCEPTION 'Expected to restore 32 Q2 source profiles as cycle-current, changed %', changed_count;
    END IF;

    UPDATE risk_monitorings latest
    SET assessment_cycle = '2026-Q2',
        source_risk_id = pair.v1_id,
        source_probability = prior.source_probability,
        source_impact = prior.source_impact,
        source_weight = prior.source_weight,
        source_nilai = prior.source_nilai,
        source_level = prior.source_level,
        source_version_number = prior.source_version_number,
        updated_at = now()
    FROM _q2_lifecycle_pairs pair
    JOIN risk_monitorings prior ON prior.id = pair.prior_monitoring_id
    WHERE latest.id = pair.latest_monitoring_id;
    GET DIAGNOSTICS changed_count = ROW_COUNT;
    IF changed_count <> 32 THEN
        RAISE EXCEPTION 'Expected to set 32 latest monitorings as official Q2 records, changed %', changed_count;
    END IF;

    UPDATE risk_monitorings draft
    SET assessment_cycle = '2026-Q3',
        updated_at = now()
    WHERE draft.id IN (SELECT id FROM _q3_draft_monitorings);
    GET DIAGNOSTICS changed_count = ROW_COUNT;
    IF changed_count <> 15 THEN
        RAISE EXCEPTION 'Expected to move 15 draft monitorings to Q3, changed %', changed_count;
    END IF;

    INSERT INTO risk_monitoring_periods (
        version_group_id,
        period_label,
        period_start,
        period_end,
        due_date,
        status,
        completed_monitoring_id,
        completed_at,
        updated_at
    )
    SELECT
        pair.version_group_id,
        '2026-Q2',
        DATE '2026-04-01',
        DATE '2026-06-30',
        DATE '2026-06-30',
        'completed',
        pair.latest_monitoring_id,
        latest.finalized_at,
        now()
    FROM _q2_lifecycle_pairs pair
    JOIN risk_monitorings latest ON latest.id = pair.latest_monitoring_id;
    GET DIAGNOSTICS changed_count = ROW_COUNT;
    IF changed_count <> 32 THEN
        RAISE EXCEPTION 'Expected to add 32 completed Q2 monitoring periods, inserted %', changed_count;
    END IF;

    UPDATE risk_monitoring_periods period
    SET status = 'pending',
        completed_monitoring_id = NULL,
        completed_at = NULL,
        updated_at = now()
    FROM _q2_lifecycle_pairs pair
    WHERE period.version_group_id = pair.version_group_id
      AND period.period_label = '2026-Q4';
    GET DIAGNOSTICS changed_count = ROW_COUNT;
    IF changed_count <> 32 THEN
        RAISE EXCEPTION 'Expected to reopen 32 future Q4 monitoring periods, changed %', changed_count;
    END IF;
END $$;

COMMIT;
