package likelihoodassessment

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

var ErrNotFound = errors.New("likelihood assessment not found")

type GetByRiskIDUseCase struct {
	repo repository.LikelihoodAssessmentRepository
}

func NewGetByRiskIDUseCase(repo repository.LikelihoodAssessmentRepository) *GetByRiskIDUseCase {
	return &GetByRiskIDUseCase{repo: repo}
}

func (uc *GetByRiskIDUseCase) Execute(ctx context.Context, riskID uuid.UUID, scope *entity.AccessScope) (*entity.LikelihoodAssessment, error) {
	if scope == nil {
		return nil, domainerrors.ErrForbidden
	}
	assessment, err := uc.repo.GetByRiskID(ctx, riskID, scope)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return assessment, nil
}
