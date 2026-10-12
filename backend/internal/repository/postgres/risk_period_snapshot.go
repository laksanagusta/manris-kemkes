package postgres

// Explicit effective dates take precedence. Legacy profiles without one retain
// their assessment-period start (including older half-year imports).
const riskEffectiveAtSQL = `COALESCE(
    r.effective_from::timestamp AT TIME ZONE 'Asia/Jakarta',
    CASE
      WHEN r.assessment_cycle ~ '^[0-9]{4}-Q[1-4]$'
      THEN make_date(substring(r.assessment_cycle, 1, 4)::int, (substring(r.assessment_cycle, 7, 1)::int - 1) * 3 + 1, 1)::timestamp AT TIME ZONE 'Asia/Jakarta'
      WHEN r.assessment_cycle ~ '^[0-9]{4}-H[1-2]$'
      THEN make_date(substring(r.assessment_cycle, 1, 4)::int, (substring(r.assessment_cycle, 7, 1)::int - 1) * 6 + 1, 1)::timestamp AT TIME ZONE 'Asia/Jakarta'
      ELSE r.created_at
    END
)`

// $1 is the requested cycle. The cutoff is exclusive at the next period's
// Jakarta midnight, capped at now for periods that have not closed. Resolve the
// group lifecycle after choosing a version so an archived latest profile cannot
// expose an older unarchived version. Audited restores preserve closed periods.
const riskPeriodSnapshotCTE = quarterlyLifecycleCTE + `, period_cutoff AS (
    SELECT LEAST(
      CASE
        WHEN $1::text ~ '^[0-9]{4}-Q[1-4]$'
        THEN (make_date(substring($1, 1, 4)::int, (substring($1, 7, 1)::int - 1) * 3 + 1, 1)::timestamp + interval '3 months') AT TIME ZONE 'Asia/Jakarta'
        WHEN $1::text ~ '^[0-9]{4}-H[1-2]$'
        THEN (make_date(substring($1, 1, 4)::int, (substring($1, 7, 1)::int - 1) * 6 + 1, 1)::timestamp + interval '6 months') AT TIME ZONE 'Asia/Jakarta'
        ELSE CURRENT_TIMESTAMP
      END, CURRENT_TIMESTAMP
    ) AS cutoff
), effective_profiles AS (
    SELECT r.*, ` + riskEffectiveAtSQL + ` AS snapshot_effective_at
    FROM risks r CROSS JOIN period_cutoff p
    WHERE r.status = 'final'
      AND r.superseded_by_risk_id IS NULL
      AND ` + riskEffectiveAtSQL + ` < p.cutoff
      AND (r.finalized_at IS NULL OR r.finalized_at < p.cutoff)
), selected_profiles AS (
    SELECT DISTINCT ON (version_group_id) *
    FROM effective_profiles
    ORDER BY version_group_id, snapshot_effective_at DESC, version_number DESC, created_at DESC, id DESC
), risk_snapshots AS (
    SELECT selected.*
    FROM selected_profiles selected
    CROSS JOIN period_cutoff p
    LEFT JOIN lifecycle ON lifecycle.version_group_id = selected.version_group_id
    LEFT JOIN LATERAL (
      SELECT e.action
      FROM lifecycle_events e
      WHERE e.version_group_id = selected.version_group_id AND e.created_at < p.cutoff
      ORDER BY e.created_at DESC, e.id DESC
      LIMIT 1
    ) last_event ON TRUE
    WHERE CASE
      WHEN last_event.action IS NOT NULL THEN last_event.action <> 'archive'
      ELSE lifecycle.archived_at IS NULL OR lifecycle.archived_at >= p.cutoff
    END
) `
