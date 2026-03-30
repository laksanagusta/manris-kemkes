package repository

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
)

// SystemRepository defines the interface for system operations
type SystemRepository interface {
	// GetSlowQueries retrieves the top slowest queries
	GetSlowQueries(ctx context.Context, limit int) ([]*entity.SlowQuery, error)
}
