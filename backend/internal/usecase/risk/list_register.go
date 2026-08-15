package risk

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type ListRiskRegisterUseCase struct {
	riskRepo repository.RiskRepository
}

func NewListRiskRegisterUseCase(riskRepo repository.RiskRepository) *ListRiskRegisterUseCase {
	return &ListRiskRegisterUseCase{riskRepo: riskRepo}
}

type ListRiskRegisterInput struct {
	View            string
	OrgIDs          []uuid.UUID
	Status          string
	Lifecycle       string
	Category        string
	AssessmentCycle string
	CreatedAt       string
	Query           string
	Page            int
	Limit           int
	SortBy          string
	SortOrder       string
}

type ListRiskRegisterResult struct {
	Data  []*entity.Risk
	Total int
	Page  int
	Limit int
}

func (uc *ListRiskRegisterUseCase) Execute(ctx context.Context, input ListRiskRegisterInput) (*ListRiskRegisterResult, error) {
	input.Status = canonicalRiskStatus(input.Status)
	if input.Category != "" && !entity.IsValidRiskCategory(input.Category) {
		return nil, domainerrors.ErrInvalidRiskCategory
	}
	if input.Page <= 0 {
		input.Page = 1
	}
	if input.Limit <= 0 {
		input.Limit = 20
	}
	if input.Limit > 100 {
		input.Limit = 100
	}

	risks, total, err := uc.riskRepo.ListRegister(ctx, repository.RiskRegisterFilter{
		View:            input.View,
		OrgIDs:          input.OrgIDs,
		Status:          input.Status,
		Lifecycle:       input.Lifecycle,
		Category:        input.Category,
		AssessmentCycle: input.AssessmentCycle,
		CreatedAt:       input.CreatedAt,
		Query:           input.Query,
		Page:            input.Page,
		Limit:           input.Limit,
		SortBy:          input.SortBy,
		SortOrder:       input.SortOrder,
	})
	if err != nil {
		return nil, err
	}
	if risks == nil {
		risks = []*entity.Risk{}
	}

	return &ListRiskRegisterResult{
		Data:  risks,
		Total: total,
		Page:  input.Page,
		Limit: input.Limit,
	}, nil
}
