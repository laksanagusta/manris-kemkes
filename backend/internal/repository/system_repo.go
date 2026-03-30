package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type SystemRepo interface {
	GetSlowQueries(ctx context.Context, limit int) ([]map[string]interface{}, error)
}

type systemRepo struct {
	pool *pgxpool.Pool
}

func NewSystemRepo(pool *pgxpool.Pool) SystemRepo {
	return &systemRepo{pool: pool}
}

func (r *systemRepo) GetSlowQueries(ctx context.Context, limit int) ([]map[string]interface{}, error) {
	// Require pg_stat_statements to be enabled in DB
	query := `
		SELECT query, mean_exec_time, calls
		FROM pg_stat_statements
		ORDER BY mean_exec_time DESC
		LIMIT $1
	`
	rows, err := r.pool.Query(ctx, query, limit)
	if err != nil {
		// If pg_stat_statements is not enabled, fallback gently
		return nil, nil // Return empty without failing the app
	}
	defer rows.Close()

	var queries []map[string]interface{}
	for rows.Next() {
		var q string
		var mean float64
		var calls int64
		if err := rows.Scan(&q, &mean, &calls); err == nil {
			queries = append(queries, map[string]interface{}{
				"query":          q,
				"meanExecTimeMs": mean,
				"calls":          calls,
			})
		}
	}
	return queries, nil
}
