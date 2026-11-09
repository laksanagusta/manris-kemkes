package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/timeutil"
)

// Connect establishes a connection pool to the PostgreSQL database.
func Connect(databaseURL string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("unable to parse database URL: %w", err)
	}

	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnLifetime = 1 * time.Hour
	config.MaxConnIdleTime = 30 * time.Minute
	config.HealthCheckPeriod = 1 * time.Minute

	at, err := timeutil.SimulationTime()
	if err != nil {
		return nil, err
	}
	if !at.IsZero() {
		switch config.ConnConfig.Host {
		case "localhost", "127.0.0.1", "::1":
			config.ConnConfig.RuntimeParams["manris.simulated_now"] = at.Format(time.RFC3339Nano)
		default:
			return nil, fmt.Errorf("simulated time requires a loopback database")
		}
		for _, fallback := range config.ConnConfig.Fallbacks {
			switch fallback.Host {
			case "localhost", "127.0.0.1", "::1":
			default:
				return nil, fmt.Errorf("simulated time requires loopback database fallbacks")
			}
		}
	}

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("unable to connect to database: %w", err)
	}

	// Verify connection
	if err := pool.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("unable to ping database: %w", err)
	}

	return pool, nil
}
