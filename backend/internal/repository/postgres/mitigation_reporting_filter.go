package postgres

// Reporting deadlines use Jakarta calendar dates, matching the operator preview
// eligibility window. This table filter never changes the underlying task status.
func reportingDuePredicate() string {
	return `t.status IN ('pending','overdue')
 AND r.status='final' AND r.is_current
 AND r.archived_at IS NULL AND r.archived_reason IS DISTINCT FROM 'superseded'
 AND t.due_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date + 7
 AND (t.period_end = t.due_date OR t.period_end < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date)`
}
