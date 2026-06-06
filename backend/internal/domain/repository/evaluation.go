package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type EvaluationListFilter struct {
	OrganizationID  *uuid.UUID
	OrganizationIDs []uuid.UUID
	Period          string
	Status          string
	Query           string
	Page            int
	Limit           int
}

type EvaluationRepository interface {
	GetActiveTemplate(ctx context.Context, templateKey string) (*entity.EvaluationTemplate, error)
	Create(ctx context.Context, evaluation *entity.Evaluation) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Evaluation, error)
	Update(ctx context.Context, evaluation *entity.Evaluation) error
	List(ctx context.Context, filter EvaluationListFilter) ([]*entity.Evaluation, int, error)
	ExistsByOrgPeriodTemplate(ctx context.Context, orgID uuid.UUID, period string, templateID uuid.UUID, excludeID *uuid.UUID) (bool, error)
}
