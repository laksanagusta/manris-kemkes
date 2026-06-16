package control

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// CreateControlUseCase handles control creation business logic
type CreateControlUseCase struct {
	controlRepo repository.ControlRepository
	riskRepo    repository.RiskRepository
	orgRepo     repository.OrganizationRepository
}

func NewCreateControlUseCase(
	controlRepo repository.ControlRepository,
	riskRepo repository.RiskRepository,
	orgRepo repository.OrganizationRepository,
) *CreateControlUseCase {
	return &CreateControlUseCase{
		controlRepo: controlRepo,
		riskRepo:    riskRepo,
		orgRepo:     orgRepo,
	}
}

type CreateControlInput struct {
	RiskID         *uuid.UUID
	Code           string
	Name           string
	Description    string
	Type           string
	Frequency      string
	Method         string
	Owner          string
	OrganizationID *uuid.UUID
	OrgIDs         []uuid.UUID
}

type CreateControlOutput struct {
	ID        uuid.UUID
	Message   string
	CreatedAt time.Time
}

func (uc *CreateControlUseCase) Execute(ctx context.Context, input CreateControlInput) (*CreateControlOutput, error) {
	// 1. Validate input
	if input.Code == "" {
		return nil, errors.ErrInvalidCode
	}
	if input.Name == "" {
		return nil, errors.ErrInvalidName
	}
	if input.Type == "" {
		return nil, errors.ErrInvalidControlType
	}

	// 2. Validate linked risk if provided
	if input.RiskID != nil {
		_, err := uc.riskRepo.GetByID(ctx, *input.RiskID, input.OrgIDs)
		if err != nil {
			return nil, errors.ErrLinkedRiskNotFound
		}
	}

	// 3. Validate organization if provided
	if input.OrganizationID != nil {
		_, err := uc.orgRepo.GetByID(ctx, *input.OrganizationID)
		if err != nil {
			return nil, errors.ErrOrganizationNotFound
		}
	}

	// 4. Create control entity
	control := &entity.Control{
		RiskID:         input.RiskID,
		Code:           input.Code,
		Name:           input.Name,
		Description:    input.Description,
		Type:           input.Type,
		Frequency:      input.Frequency,
		Method:         input.Method,
		Owner:          input.Owner,
		OrganizationID: input.OrganizationID,
	}

	// 5. Validate control entity
	if err := control.Validate(); err != nil {
		return nil, err
	}

	// 6. Save to database
	if err := uc.controlRepo.Create(ctx, control); err != nil {
		return nil, errors.Wrap(err, "failed to create control")
	}

	// 7. Return result
	return &CreateControlOutput{
		ID:        control.ID,
		Message:   "Control created successfully",
		CreatedAt: control.CreatedAt,
	}, nil
}
