package postgres

// Four consecutive calendar quarters, oldest first, including the current WIB quarter.
const riskRegisterRecentMonitoringJoin = `
LEFT JOIN LATERAL (
  SELECT jsonb_agg(jsonb_build_object(
    'cycle', periods.cycle, 'status', latest.status, 'nilai',
    CASE WHEN latest.status = 'final' THEN latest.observed_nilai END
  ) ORDER BY periods.started_at) AS items
  FROM (
    SELECT started_at, to_char(started_at, 'YYYY') || '-Q' || EXTRACT(QUARTER FROM started_at)::int AS cycle
    FROM generate_series(
      date_trunc('quarter', ` + businessNowSQL + ` AT TIME ZONE 'Asia/Jakarta') - interval '9 months',
      date_trunc('quarter', ` + businessNowSQL + ` AT TIME ZONE 'Asia/Jakarta'),
      interval '3 months'
    ) AS started_at
  ) periods
  LEFT JOIN LATERAL (
    SELECT rm.status, rm.observed_nilai
    FROM risk_monitorings rm
    WHERE rm.version_group_id = r.version_group_id
      AND rm.assessment_cycle = periods.cycle
      AND rm.status IN ('draft', 'final')
    ORDER BY rm.updated_at DESC, rm.id DESC
    LIMIT 1
  ) latest ON true
) recent_monitoring ON true
`
