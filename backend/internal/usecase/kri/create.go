package kri

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// CreateKRIUseCase handles KRI creation business logic
type CreateKRIUseCase struct {
	kriRepo  repository.KRIRepository
	riskRepo repository.RiskRepository
	orgRepo  repository.OrganizationRepository
}

func NewCreateKRIUseCase(
	kriRepo repository.KRIRepository,
	riskRepo repository.RiskRepository,
	orgRepo repository.OrganizationRepository,
) *CreateKRIUseCase {
	return &CreateKRIUseCase{
		kriRepo:  kriRepo,
		riskRepo: riskRepo,
		orgRepo:  orgRepo,
	}
}

type CreateKRIInput struct {
	RiskID         uuid.UUID
	Name           string
	Description    string
	Metric         string
	ThresholdMin   float64
	ThresholdMax   float64
	CurrentValue   float64
	Direction      string
	Frequency      string
	OrganizationID *uuid.UUID
	OrgIDs         []uuid.UUID
}

type CreateKRIOutput struct {
	ID        uuid.UUID
	Message   string
	CreatedAt time.Time
}

func (uc *CreateKRIUseCase) Execute(ctx context.Context, input CreateKRIInput) (*CreateKRIOutput, error) {
	// 1. Validate input
	if input.Name == "" {
		return nil, errors.ErrInvalidName
	}
	if input.ThresholdMin >= input.ThresholdMax {
		return nil, errors.ErrInvalidThreshold
	}
	if input.Direction == "" {
		input.Direction = "increasing" // default
	}

	// 2. Validate linked risk
	_, err := uc.riskRepo.GetByID(ctx, input.RiskID, input.OrgIDs)
	if err != nil {
		return nil, errors.Wrap(err, "linked risk not found")
	}

	// 3. Validate organization if provided
	if input.OrganizationID != nil {
		_, err := uc.orgRepo.GetByID(ctx, *input.OrganizationID)
		if err != nil {
			return nil, errors.Wrap(err, "organization not found")
		}
	}

	// 4. Create KRI entity
	kri := &entity.KRI{
		RiskID:         input.RiskID,
		Name:           input.Name,
		Description:    input.Description,
		Metric:         input.Metric,
		ThresholdMin:   input.ThresholdMin,
		ThresholdMax:   input.ThresholdMax,
		CurrentValue:   input.CurrentValue,
		Direction:      input.Direction,
		Frequency:      input.Frequency,
		OrganizationID: input.OrganizationID,
	}

	// 5. Validate KRI entity
	if err := kri.Validate(); err != nil {
		return nil, err
	}

	// 6. Save to database
	if err := uc.kriRepo.Create(ctx, kri); err != nil {
		return nil, errors.Wrap(err, "failed to create KRI")
	}

	// 7. Return result
	return &CreateKRIOutput{
		ID:        kri.ID,
		Message:   "KRI created successfully",
		CreatedAt: kri.CreatedAt,
	}, nil
}
