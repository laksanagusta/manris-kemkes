package risk

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// DeleteRiskUseCase handles risk deletion business logic
type DeleteRiskUseCase struct {
	riskRepo repository.RiskRepository
}

func NewDeleteRiskUseCase(riskRepo repository.RiskRepository) *DeleteRiskUseCase {
	return &DeleteRiskUseCase{
		riskRepo: riskRepo,
	}
}

type DeleteRiskOutput struct {
	Message string
}

func (uc *DeleteRiskUseCase) Execute(ctx context.Context, id uuid.UUID) (*DeleteRiskOutput, error) {
	// 1. Get existing risk to check if it exists
	risk, err := uc.riskRepo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}

	// 2. Business rule: Cannot delete approved risks
	if risk.Status == "approved" {
		return nil, errors.Wrap(errors.ErrInvalidStatus, "cannot delete approved risk")
	}

	// 3. Delete from database
	if err := uc.riskRepo.Delete(ctx, id); err != nil {
		return nil, err
	}

	return &DeleteRiskOutput{
		Message: "Risk deleted successfully",
	}, nil
}
