package postgres

// Reporting deadlines use Jakarta calendar dates, matching the operator preview
// eligibility window. This table filter never changes the underlying task status.
func reportingDuePredicate() string {
	return `t.status IN ('pending','overdue')
 AND r.status='final'
 AND EXISTS(SELECT 1 FROM risks active_risk WHERE active_risk.version_group_id=r.version_group_id AND active_risk.is_current AND active_risk.status='final' AND active_risk.archived_at IS NULL)
 AND t.due_date <= (` + businessNowSQL + ` AT TIME ZONE 'Asia/Jakarta')::date + 7
 AND (t.period_end = t.due_date OR t.period_end < (` + businessNowSQL + ` AT TIME ZONE 'Asia/Jakarta')::date)`
}
