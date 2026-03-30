package system

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// GetSlowQueriesInput represents input for getting slow queries
type GetSlowQueriesInput struct {
	Limit int
	Role  string
}

// GetSlowQueriesUseCase handles retrieving slow database queries
type GetSlowQueriesUseCase struct {
	systemRepo repository.SystemRepository
}

// NewGetSlowQueriesUseCase creates a new get slow queries use case
func NewGetSlowQueriesUseCase(systemRepo repository.SystemRepository) *GetSlowQueriesUseCase {
	return &GetSlowQueriesUseCase{
		systemRepo: systemRepo,
	}
}

// Execute retrieves slow queries with authorization check
func (uc *GetSlowQueriesUseCase) Execute(ctx context.Context, input GetSlowQueriesInput) ([]*entity.SlowQuery, error) {
	// 1. Authorization check - only superadmin can access
	if input.Role != "superadmin" {
		return nil, errors.ErrForbidden
	}

	// 2. Set default limit
	limit := input.Limit
	if limit == 0 {
		limit = 10
	}

	// 3. Get slow queries from repository
	queries, err := uc.systemRepo.GetSlowQueries(ctx, limit)
	if err != nil {
		return nil, err
	}

	return queries, nil
}
