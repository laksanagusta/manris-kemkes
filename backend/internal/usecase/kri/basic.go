package kri

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
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

func (uc *GetKRIUseCase) Execute(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.KRI, error) {
	kri, err := uc.kriRepo.GetByID(ctx, id, orgIDs)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	return kri, nil
}

// ListKRIsUseCase retrieves KRIs with optional filters
type ListKRIsUseCase struct {
	kriRepo repository.KRIRepository
}

func NewListKRIsUseCase(kriRepo repository.KRIRepository, orgSvc *service.OrganizationHierarchy) *ListKRIsUseCase {
	return &ListKRIsUseCase{
		kriRepo: kriRepo,
	}
}

type ListKRIsInput struct {
	OrgIDs []uuid.UUID
}

func (uc *ListKRIsUseCase) Execute(ctx context.Context, input ListKRIsInput) ([]*entity.KRI, error) {
	kris, err := uc.kriRepo.List(ctx, input.OrgIDs, false)
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

func (uc *UpdateKRIUseCase) Execute(ctx context.Context, input UpdateKRIInput, orgIDs []uuid.UUID, scope *entity.AccessScope) (*UpdateKRIOutput, error) {
	// 1. Get existing KRI
	existingKRI, err := uc.kriRepo.GetByID(ctx, input.ID, orgIDs)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	if scope != nil && existingKRI.OrganizationID != nil && !scope.CanWrite(*existingKRI.OrganizationID) {
		return nil, errors.ErrForbidden
	}

	// 2. Validate linked risk
	_, err = uc.riskRepo.GetByID(ctx, input.RiskID, orgIDs)
	if err != nil {
		return nil, errors.ErrLinkedRiskNotFound
	}

	// 3. Validate organization if changed
	if input.OrganizationID != nil {
		_, err := uc.orgRepo.GetByID(ctx, *input.OrganizationID)
		if err != nil {
			return nil, errors.ErrOrganizationNotFound
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

func (uc *DeleteKRIUseCase) Execute(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID, scope *entity.AccessScope) (*DeleteKRIOutput, error) {
	kri, err := uc.kriRepo.GetByID(ctx, id, orgIDs)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	if scope != nil && kri.OrganizationID != nil && !scope.CanWrite(*kri.OrganizationID) {
		return nil, errors.ErrForbidden
	}

	if err := uc.kriRepo.Delete(ctx, id); err != nil {
		return nil, err
	}

	return &DeleteKRIOutput{
		Message: "KRI deleted successfully",
	}, nil
}

type ArchiveKRIUseCase struct {
	kriRepo repository.KRIRepository
}

func NewArchiveKRIUseCase(kriRepo repository.KRIRepository) *ArchiveKRIUseCase {
	return &ArchiveKRIUseCase{kriRepo: kriRepo}
}

type ArchiveKRIInput struct {
	ID     uuid.UUID `json:"id"`
	Reason string    `json:"reason"`
}

type ArchiveKRIOutput struct {
	Message        string
	IsArchived     bool
	ArchivedAt     *time.Time
	ArchivedReason string
}

func (uc *ArchiveKRIUseCase) Execute(ctx context.Context, input ArchiveKRIInput, orgIDs []uuid.UUID, scope *entity.AccessScope) (*ArchiveKRIOutput, error) {
	kri, err := uc.kriRepo.GetByID(ctx, input.ID, orgIDs)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	if scope != nil && kri.OrganizationID != nil && !scope.CanWrite(*kri.OrganizationID) {
		return nil, errors.ErrForbidden
	}

	if err := uc.kriRepo.Archive(ctx, input.ID, input.Reason); err != nil {
		return nil, errors.Wrap(err, "failed to archive KRI")
	}

	archived, err := uc.kriRepo.GetByID(ctx, input.ID, orgIDs)
	if err != nil {
		return nil, errors.Wrap(err, "failed to fetch archived KRI")
	}

	return &ArchiveKRIOutput{
		Message:        "KRI archived successfully",
		IsArchived:     archived.IsArchived,
		ArchivedAt:     archived.ArchivedAt,
		ArchivedReason: archived.ArchivedReason,
	}, nil
}

// KRIDashboardUseCase retrieves dashboard metrics for KRIs
type KRIDashboardUseCase struct {
	kriRepo repository.KRIRepository
}

func NewKRIDashboardUseCase(kriRepo repository.KRIRepository, orgSvc *service.OrganizationHierarchy) *KRIDashboardUseCase {
	return &KRIDashboardUseCase{
		kriRepo: kriRepo,
	}
}

type KRIDashboardInput struct {
	OrgIDs []uuid.UUID
}

func (uc *KRIDashboardUseCase) Execute(ctx context.Context, input KRIDashboardInput) (map[string]interface{}, error) {
	metrics, err := uc.kriRepo.GetDashboard(ctx, input.OrgIDs)
	if err != nil {
		return nil, err
	}

	return metrics, nil
}
