package control

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
)

// GetControlUseCase retrieves a single control by ID
type GetControlUseCase struct {
	controlRepo repository.ControlRepository
}

func NewGetControlUseCase(controlRepo repository.ControlRepository) *GetControlUseCase {
	return &GetControlUseCase{
		controlRepo: controlRepo,
	}
}

func (uc *GetControlUseCase) Execute(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.Control, error) {
	control, err := uc.controlRepo.GetByID(ctx, id, orgIDs)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	return control, nil
}

// ListControlsUseCase retrieves controls with optional filters
type ListControlsUseCase struct {
	controlRepo repository.ControlRepository
}

func NewListControlsUseCase(controlRepo repository.ControlRepository, orgSvc *service.OrganizationHierarchy) *ListControlsUseCase {
	return &ListControlsUseCase{
		controlRepo: controlRepo,
	}
}

type ListControlsInput struct {
	OrgIDs []uuid.UUID
}

func (uc *ListControlsUseCase) Execute(ctx context.Context, input ListControlsInput) ([]*entity.Control, error) {
	controls, err := uc.controlRepo.List(ctx, input.OrgIDs)
	if err != nil {
		return nil, err
	}

	return controls, nil
}

// UpdateControlUseCase handles control update business logic
type UpdateControlUseCase struct {
	controlRepo repository.ControlRepository
	riskRepo    repository.RiskRepository
	orgRepo     repository.OrganizationRepository
}

func NewUpdateControlUseCase(
	controlRepo repository.ControlRepository,
	riskRepo repository.RiskRepository,
	orgRepo repository.OrganizationRepository,
) *UpdateControlUseCase {
	return &UpdateControlUseCase{
		controlRepo: controlRepo,
		riskRepo:    riskRepo,
		orgRepo:     orgRepo,
	}
}

type UpdateControlInput struct {
	ID             uuid.UUID
	RiskID         *uuid.UUID
	Code           string
	Name           string
	Description    string
	Type           string
	Frequency      string
	Method         string
	Owner          string
	Effectiveness  string
	TestDate       *time.Time
	OrganizationID *uuid.UUID
}

type UpdateControlOutput struct {
	ID        uuid.UUID
	Message   string
	UpdatedAt time.Time
}

func (uc *UpdateControlUseCase) Execute(ctx context.Context, input UpdateControlInput, orgIDs []uuid.UUID, scope *entity.AccessScope) (*UpdateControlOutput, error) {
	// 1. Get existing control
	existingControl, err := uc.controlRepo.GetByID(ctx, input.ID, orgIDs)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	// 1b. Enforce write scope
	if scope != nil && existingControl.OrganizationID != nil && !scope.CanWrite(*existingControl.OrganizationID) {
		return nil, errors.ErrForbidden
	}

	// 2. Validate linked risk if changed
	if input.RiskID != nil {
		_, err := uc.riskRepo.GetByID(ctx, *input.RiskID, orgIDs)
		if err != nil {
			return nil, errors.ErrLinkedRiskNotFound
		}
	}

	// 3. Validate organization if changed
	if input.OrganizationID != nil {
		_, err := uc.orgRepo.GetByID(ctx, *input.OrganizationID)
		if err != nil {
			return nil, errors.ErrOrganizationNotFound
		}
	}

	// 4. Update control entity
	existingControl.RiskID = input.RiskID
	existingControl.Code = input.Code
	existingControl.Name = input.Name
	existingControl.Description = input.Description
	existingControl.Type = input.Type
	existingControl.Frequency = input.Frequency
	existingControl.Method = input.Method
	existingControl.Owner = input.Owner
	existingControl.Effectiveness = input.Effectiveness
	existingControl.TestDate = input.TestDate
	existingControl.OrganizationID = input.OrganizationID

	// 5. Validate control entity
	if err := existingControl.Validate(); err != nil {
		return nil, err
	}

	// 6. Save to database
	if err := uc.controlRepo.Update(ctx, existingControl); err != nil {
		return nil, errors.Wrap(err, "failed to update control")
	}

	// 7. Return result
	return &UpdateControlOutput{
		ID:        existingControl.ID,
		Message:   "Control updated successfully",
		UpdatedAt: existingControl.UpdatedAt,
	}, nil
}

// DeleteControlUseCase handles control deletion business logic
type DeleteControlUseCase struct {
	controlRepo repository.ControlRepository
}

func NewDeleteControlUseCase(controlRepo repository.ControlRepository) *DeleteControlUseCase {
	return &DeleteControlUseCase{
		controlRepo: controlRepo,
	}
}

type DeleteControlOutput struct {
	Message string
}

func (uc *DeleteControlUseCase) Execute(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID, scope *entity.AccessScope) (*DeleteControlOutput, error) {
	// 1. Get existing control to check if it exists
	control, err := uc.controlRepo.GetByID(ctx, id, orgIDs)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	if scope != nil && control.OrganizationID != nil && !scope.CanWrite(*control.OrganizationID) {
		return nil, errors.ErrForbidden
	}

	// 2. Delete from database
	if err := uc.controlRepo.Delete(ctx, id); err != nil {
		return nil, err
	}

	return &DeleteControlOutput{
		Message: "Control deleted successfully",
	}, nil
}

// ControlDashboardUseCase retrieves dashboard metrics for controls
type ControlDashboardUseCase struct {
	controlRepo repository.ControlRepository
}

func NewControlDashboardUseCase(controlRepo repository.ControlRepository, orgSvc *service.OrganizationHierarchy) *ControlDashboardUseCase {
	return &ControlDashboardUseCase{
		controlRepo: controlRepo,
	}
}

type ControlDashboardInput struct {
	OrgIDs []uuid.UUID
}

func (uc *ControlDashboardUseCase) Execute(ctx context.Context, input ControlDashboardInput) (map[string]interface{}, error) {
	metrics, err := uc.controlRepo.GetDashboard(ctx, input.OrgIDs)
	if err != nil {
		return nil, err
	}

	return metrics, nil
}
