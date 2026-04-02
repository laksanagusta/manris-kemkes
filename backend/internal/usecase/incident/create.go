package incident

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// CreateIncidentUseCase handles incident creation business logic
type CreateIncidentUseCase struct {
	incidentRepo repository.IncidentRepository
	userRepo     repository.UserRepository
	orgRepo      repository.OrganizationRepository
	riskRepo     repository.RiskRepository
}

func NewCreateIncidentUseCase(
	incidentRepo repository.IncidentRepository,
	userRepo repository.UserRepository,
	orgRepo repository.OrganizationRepository,
	riskRepo repository.RiskRepository,
) *CreateIncidentUseCase {
	return &CreateIncidentUseCase{
		incidentRepo: incidentRepo,
		userRepo:     userRepo,
		orgRepo:      orgRepo,
		riskRepo:     riskRepo,
	}
}

type CreateIncidentInput struct {
	Title            string
	What             string
	Who              string
	When             *time.Time
	Where            string
	WhyHow           string
	Severity         string
	CorrectiveAction string
	PreventiveAction string
	LinkedRiskIDs    []string
	ReporterID       *uuid.UUID
	OrganizationID   *uuid.UUID
}

type CreateIncidentOutput struct {
	ID        uuid.UUID
	Code      *string
	Message   string
	CreatedAt time.Time
}

func (uc *CreateIncidentUseCase) Execute(ctx context.Context, input CreateIncidentInput) (*CreateIncidentOutput, error) {
	// 1. Validate input
	if input.Title == "" {
		return nil, errors.ErrInvalidTitle
	}
	if input.What == "" || input.Who == "" || input.Where == "" {
		return nil, errors.ErrInvalidDescription
	}
	if input.Severity == "" {
		return nil, errors.ErrInvalidSeverity
	}
	if input.ReporterID == nil {
		return nil, errors.ErrInvalidInput
	}

	linkedRiskIDs, err := parseLinkedRiskIDs(input.LinkedRiskIDs)
	if err != nil {
		return nil, err
	}

	// 2. Validate reporter exists
	_, err = uc.userRepo.GetByID(ctx, *input.ReporterID)
	if err != nil {
		return nil, errors.Wrap(err, "reporter not found")
	}

	// 3. Validate organization if provided
	if input.OrganizationID != nil {
		_, err := uc.orgRepo.GetByID(ctx, *input.OrganizationID)
		if err != nil {
			return nil, errors.Wrap(err, "organization not found")
		}
	}

	// 4. Validate linked risk if provided
	for _, riskID := range linkedRiskIDs {
		_, err := uc.riskRepo.GetByID(ctx, riskID)
		if err != nil {
			return nil, errors.Wrap(err, "linked risk not found")
		}
	}

	// 5. Create incident entity
	incident := &entity.Incident{
		Title:            input.Title,
		What:             input.What,
		Who:              input.Who,
		When:             input.When,
		Where:            input.Where,
		WhyHow:           input.WhyHow,
		Severity:         input.Severity,
		Status:           "draft",
		CorrectiveAction: input.CorrectiveAction,
		PreventiveAction: input.PreventiveAction,
		LinkedRisks:      buildIncidentRiskLinks(linkedRiskIDs),
		ReporterID:       input.ReporterID,
		OrganizationID:   input.OrganizationID,
	}

	// 6. Validate incident entity
	if err := incident.Validate(); err != nil {
		return nil, err
	}

	// 7. Save to database
	if err := uc.incidentRepo.Create(ctx, incident); err != nil {
		return nil, errors.Wrap(err, "failed to create incident")
	}

	// 8. Return result
	return &CreateIncidentOutput{
		ID:        incident.ID,
		Code:      incident.Code,
		Message:   "Incident created successfully",
		CreatedAt: incident.CreatedAt,
	}, nil
}
