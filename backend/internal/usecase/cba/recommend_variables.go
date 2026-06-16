package cba

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type RecommendVariablesInput struct {
	RiskDescription string
	OrganizationID  *uuid.UUID
}

type RecommendVariablesUseCase struct {
	cbaRepo repository.CBARepository
	orgRepo repository.OrganizationRepository
}

func NewRecommendVariablesUseCase(cbaRepo repository.CBARepository, orgRepo repository.OrganizationRepository) *RecommendVariablesUseCase {
	return &RecommendVariablesUseCase{
		cbaRepo: cbaRepo,
		orgRepo: orgRepo,
	}
}

func (uc *RecommendVariablesUseCase) Execute(ctx context.Context, input RecommendVariablesInput) (*entity.CBARecommendation, error) {
	if input.RiskDescription == "" {
		return nil, fmt.Errorf("deskripsi risiko wajib diisi")
	}

	var orgContext string
	if input.OrganizationID != nil {
		orgContext, _ = uc.orgRepo.GetContext(ctx, *input.OrganizationID)
	}

	recommendation, err := uc.cbaRepo.RecommendVariables(ctx, input.RiskDescription, orgContext)
	if err != nil {
		return nil, fmt.Errorf("gagal menghasilkan rekomendasi: %w", err)
	}

	return recommendation, nil
}
