package postgres

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

func ensureMonitoringPeriodsForRisk(ctx context.Context, q riskQueryer, versionGroupID uuid.UUID, effectiveFrom time.Time, cycle string) error {
	year := effectiveFrom.UTC().Year()
	if len(cycle) >= 4 {
		parsed, err := strconv.Atoi(strings.TrimSpace(cycle[:4]))
		if err != nil || parsed < 1 {
			return fmt.Errorf("invalid monitoring cycle %q", cycle)
		}
		year = parsed
	}
	if versionGroupID == uuid.Nil || year < 1 {
		return fmt.Errorf("invalid monitoring period inputs")
	}
	_, err := q.Exec(ctx, `
		INSERT INTO risk_monitoring_periods (
			version_group_id, period_label, period_start, period_end, due_date
		)
		SELECT
			$1,
			y.y || '-Q' || q.quarter,
			make_date(y.y, ((q.quarter - 1) * 3) + 1, 1),
			(
				make_date(
					y.y + CASE WHEN q.quarter = 4 THEN 1 ELSE 0 END,
					CASE WHEN q.quarter = 4 THEN 1 ELSE (q.quarter * 3) + 1 END,
					1
				) - INTERVAL '1 day'
			)::date,
			(
				make_date(
					y.y + CASE WHEN q.quarter = 4 THEN 1 ELSE 0 END,
					CASE WHEN q.quarter = 4 THEN 1 ELSE (q.quarter * 3) + 1 END,
					1
				) - INTERVAL '1 day'
			)::date
		FROM generate_series(EXTRACT(YEAR FROM $3::date)::int, $2) AS y(y)
		CROSS JOIN (VALUES (1), (2), (3), (4)) AS q(quarter)
		WHERE (
			make_date(
				y.y + CASE WHEN q.quarter = 4 THEN 1 ELSE 0 END,
				CASE WHEN q.quarter = 4 THEN 1 ELSE (q.quarter * 3) + 1 END,
				1
			) - INTERVAL '1 day'
		)::date >= $3::date
		ON CONFLICT (version_group_id, period_label) DO NOTHING
	`, versionGroupID, year, effectiveFrom.UTC())
	if err != nil {
		return fmt.Errorf("ensure monitoring periods: %w", err)
	}
	return nil
}

// EnsureMonitoringPeriods creates quarterly obligations without creating
// monitoring form rows. The effective date excludes quarters that ended before
// the risk became final, which supports risks finalised mid-year.
func (r *riskRepository) EnsureMonitoringPeriods(ctx context.Context, versionGroupID uuid.UUID, effectiveFrom time.Time, year int) error {
	if versionGroupID == uuid.Nil || year < 1 {
		return fmt.Errorf("invalid monitoring period inputs")
	}
	if err := ensureMonitoringPeriodsForRisk(ctx, r.pool, versionGroupID, effectiveFrom, fmt.Sprintf("%d-Q1", year)); err != nil {
		return err
	}

	_, err := r.pool.Exec(ctx, `
		UPDATE risk_monitoring_periods
		SET status = 'overdue', updated_at = now()
		WHERE version_group_id = $1 AND status = 'pending' AND due_date < CURRENT_DATE
	`, versionGroupID)
	if err != nil {
		return fmt.Errorf("mark overdue monitoring periods: %w", err)
	}
	return nil
}

// AssertPreviousMonitoringTransactionCompleted blocks a new cycle only when
// the previous cycle already has an unfinished monitoring transaction. A
// missing transaction means that period was skipped and is allowed.
func (r *riskRepository) AssertPreviousMonitoringTransactionCompleted(ctx context.Context, versionGroupID uuid.UUID, previousCycle string) error {
	if versionGroupID == uuid.Nil || previousCycle == "" {
		return fmt.Errorf("invalid previous monitoring transaction inputs")
	}

	var hasUnfinishedTransaction bool
	if err := r.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM risk_monitorings
			WHERE version_group_id = $1
			  AND assessment_cycle = $2
			  AND status = 'draft'
		)
	`, versionGroupID, previousCycle).Scan(&hasUnfinishedTransaction); err != nil {
		return fmt.Errorf("check previous monitoring transaction: %w", err)
	}
	if hasUnfinishedTransaction {
		return domainerrors.ErrPreviousMonitoringNotCompleted
	}
	return nil
}
