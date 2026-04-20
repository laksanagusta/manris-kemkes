package repository

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
)

// CBARepository defines the interface for CBA AI operations
type CBARepository interface {
	// RecommendVariables generates CBA variable recommendations based on risk description
	RecommendVariables(ctx context.Context, riskDescription string, orgContext string) (*entity.CBARecommendation, error)
}
