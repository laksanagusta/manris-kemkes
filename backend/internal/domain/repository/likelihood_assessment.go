package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type LikelihoodAssessmentFilter struct {
	RiskID *uuid.UUID
}

type LikelihoodAssessmentRepository interface {
	Create(ctx context.Context, assessment *entity.LikelihoodAssessment) error
	GetByRiskID(ctx context.Context, riskID uuid.UUID) (*entity.LikelihoodAssessment, error)
	UpsertByRiskID(ctx context.Context, assessment *entity.LikelihoodAssessment) error
	DeleteByRiskID(ctx context.Context, riskID uuid.UUID) error
}
