package postgres

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// systemRepository implements repository.SystemRepository
type systemRepository struct {
	pool *pgxpool.Pool
}

// NewSystemRepository creates a new system repository
func NewSystemRepository(pool *pgxpool.Pool) repository.SystemRepository {
	return &systemRepository{
		pool: pool,
	}
}

// GetSlowQueries retrieves the top slowest queries from pg_stat_statements
func (r *systemRepository) GetSlowQueries(ctx context.Context, limit int) ([]*entity.SlowQuery, error) {
	// Require pg_stat_statements to be enabled in DB
	query := `
		SELECT
			queryid,
			query,
			calls,
			total_exec_time,
			mean_exec_time,
			stddev_exec_time
		FROM pg_stat_statements
		ORDER BY mean_exec_time DESC
		LIMIT $1
	`

	rows, err := r.pool.Query(ctx, query, limit)
	if err != nil {
		// If pg_stat_statements is not enabled, return empty without failing
		return []*entity.SlowQuery{}, nil
	}
	defer rows.Close()

	var queries []*entity.SlowQuery
	for rows.Next() {
		var q entity.SlowQuery
		if err := rows.Scan(
			&q.QueryID,
			&q.Query,
			&q.Calls,
			&q.TotalTime,
			&q.MeanTime,
			&q.StdDevTime,
		); err == nil {
			queries = append(queries, &q)
		}
	}

	if queries == nil {
		queries = []*entity.SlowQuery{}
	}

	return queries, nil
}
