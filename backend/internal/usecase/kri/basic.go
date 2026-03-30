package kri

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// GetKRIUseCase retrieves a single KRI by ID
type GetKRIUseCase struct {
	kriRepo repository.KRIRepository
}

func NewGetKRIUseCase(kriRepo repository.KRIRepository) *GetKRIUseCase {
	return &GetKRIUseCase{
		kriRepo: kriRepo,
	}
}

func (uc *GetKRIUseCase) Execute(ctx context.Context, id uuid.UUID) (*entity.KRI, error) {
	kri, err := uc.kriRepo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	return kri, nil
}

// ListKRIsUseCase retrieves KRIs with optional filters
type ListKRIsUseCase struct {
	kriRepo repository.KRIRepository
}

func NewListKRIsUseCase(kriRepo repository.KRIRepository) *ListKRIsUseCase {
	return &ListKRIsUseCase{
		kriRepo: kriRepo,
	}
}

type ListKRIsInput struct {
	OrgID *uuid.UUID
}

func (uc *ListKRIsUseCase) Execute(ctx context.Context, input ListKRIsInput) ([]*entity.KRI, error) {
	kris, err := uc.kriRepo.List(ctx, input.OrgID)
	if err != nil {
		return nil, err
	}

	return kris, nil
}

// UpdateKRIUseCase handles KRI update business logic
type UpdateKRIUseCase struct {
	kriRepo  repository.KRIRepository
	riskRepo repository.RiskRepository
	orgRepo  repository.OrganizationRepository
}

func NewUpdateKRIUseCase(
	kriRepo repository.KRIRepository,
	riskRepo repository.RiskRepository,
	orgRepo repository.OrganizationRepository,
) *UpdateKRIUseCase {
	return &UpdateKRIUseCase{
		kriRepo:  kriRepo,
		riskRepo: riskRepo,
		orgRepo:  orgRepo,
	}
}

type UpdateKRIInput struct {
	ID             uuid.UUID
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
}

type UpdateKRIOutput struct {
	ID          uuid.UUID
	Message     string
	LastUpdated time.Time
}

func (uc *UpdateKRIUseCase) Execute(ctx context.Context, input UpdateKRIInput) (*UpdateKRIOutput, error) {
	// 1. Get existing KRI
	existingKRI, err := uc.kriRepo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	// 2. Validate linked risk
	_, err = uc.riskRepo.GetByID(ctx, input.RiskID)
	if err != nil {
		return nil, errors.Wrap(err, "linked risk not found")
	}

	// 3. Validate organization if changed
	if input.OrganizationID != nil {
		_, err := uc.orgRepo.GetByID(ctx, *input.OrganizationID)
		if err != nil {
			return nil, errors.Wrap(err, "organization not found")
		}
	}

	// 4. Update KRI entity
	existingKRI.RiskID = input.RiskID
	existingKRI.Name = input.Name
	existingKRI.Description = input.Description
	existingKRI.Metric = input.Metric
	existingKRI.ThresholdMin = input.ThresholdMin
	existingKRI.ThresholdMax = input.ThresholdMax
	existingKRI.CurrentValue = input.CurrentValue
	existingKRI.Direction = input.Direction
	existingKRI.Frequency = input.Frequency
	existingKRI.OrganizationID = input.OrganizationID

	// 5. Validate KRI entity
	if err := existingKRI.Validate(); err != nil {
		return nil, err
	}

	// 6. Save to database
	if err := uc.kriRepo.Update(ctx, existingKRI); err != nil {
		return nil, errors.Wrap(err, "failed to update KRI")
	}

	// 7. Return result
	return &UpdateKRIOutput{
		ID:          existingKRI.ID,
		Message:     "KRI updated successfully",
		LastUpdated: existingKRI.LastUpdated,
	}, nil
}

// DeleteKRIUseCase handles KRI deletion business logic
type DeleteKRIUseCase struct {
	kriRepo repository.KRIRepository
}

func NewDeleteKRIUseCase(kriRepo repository.KRIRepository) *DeleteKRIUseCase {
	return &DeleteKRIUseCase{
		kriRepo: kriRepo,
	}
}

type DeleteKRIOutput struct {
	Message string
}

func (uc *DeleteKRIUseCase) Execute(ctx context.Context, id uuid.UUID) (*DeleteKRIOutput, error) {
	// 1. Get existing KRI to check if it exists
	_, err := uc.kriRepo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	// 2. Delete from database
	if err := uc.kriRepo.Delete(ctx, id); err != nil {
		return nil, err
	}

	return &DeleteKRIOutput{
		Message: "KRI deleted successfully",
	}, nil
}

// KRIDashboardUseCase retrieves dashboard metrics for KRIs
type KRIDashboardUseCase struct {
	kriRepo repository.KRIRepository
}

func NewKRIDashboardUseCase(kriRepo repository.KRIRepository) *KRIDashboardUseCase {
	return &KRIDashboardUseCase{
		kriRepo: kriRepo,
	}
}

type KRIDashboardInput struct {
	OrgID *uuid.UUID
}

func (uc *KRIDashboardUseCase) Execute(ctx context.Context, input KRIDashboardInput) (map[string]interface{}, error) {
	metrics, err := uc.kriRepo.GetDashboard(ctx, input.OrgID)
	if err != nil {
		return nil, err
	}

	return metrics, nil
}
