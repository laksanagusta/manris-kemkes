package postgres

// Mirrors the submission criteria used by QuarterlyTaskReported.
const mitigationReportedSQL = `t.status IN ('pending','done','skipped') AND t.reported_at IS NOT NULL
 AND octet_length(regexp_replace(COALESCE(t.notes, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g')) BETWEEN 10 AND 1000`

// Reporting deadlines use Jakarta calendar dates, matching the operator preview
// eligibility window. This table filter never changes the underlying task status.
func reportingDuePredicate() string {
	return `t.status IN ('pending','overdue') AND t.reported_at IS NULL
 AND EXISTS(SELECT 1 FROM risk_monitorings rm
     LEFT JOIN monitoring_rule_periods rp ON rp.id=rm.monitoring_period_id
     WHERE rm.id=t.monitoring_id AND rm.status='draft' AND rm.transaction_kind='monitoring'
       AND (rp.id IS NULL OR  ` + businessDateSQL + ` BETWEEN rp.opens_on AND rp.closes_on))
 AND r.status='final'
 AND EXISTS(SELECT 1 FROM risks active_risk WHERE active_risk.version_group_id=r.version_group_id AND active_risk.is_current AND active_risk.status='final' AND active_risk.archived_at IS NULL)`
}
