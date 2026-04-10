package incident

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	domainrepo "github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
)

// GetIncidentUseCase retrieves a single incident by ID
type GetIncidentUseCase struct {
	incidentRepo domainrepo.IncidentRepository
}

func NewGetIncidentUseCase(incidentRepo domainrepo.IncidentRepository) *GetIncidentUseCase {
	return &GetIncidentUseCase{
		incidentRepo: incidentRepo,
	}
}

func (uc *GetIncidentUseCase) Execute(ctx context.Context, id string, orgIDs []uuid.UUID) (*entity.Incident, error) {
	incident, err := uc.incidentRepo.GetByID(ctx, id, orgIDs)
	if err != nil {
		return nil, errors.ErrIncidentNotFound
	}

	return incident, nil
}

// ListIncidentsUseCase retrieves a list of incidents with optional filters
type ListIncidentsUseCase struct {
	incidentRepo domainrepo.IncidentRepository
}

func NewListIncidentsUseCase(incidentRepo domainrepo.IncidentRepository, orgSvc *service.OrganizationHierarchy) *ListIncidentsUseCase {
	return &ListIncidentsUseCase{
		incidentRepo: incidentRepo,
	}
}

type ListIncidentsInput struct {
	OrgIDs []uuid.UUID
}

func (uc *ListIncidentsUseCase) Execute(ctx context.Context, input ListIncidentsInput) ([]*entity.Incident, error) {
	incidents, err := uc.incidentRepo.List(ctx, input.OrgIDs)
	if err != nil {
		return nil, err
	}

	return incidents, nil
}

// UpdateIncidentUseCase handles incident update business logic
type UpdateIncidentUseCase struct {
	incidentRepo domainrepo.IncidentRepository
	riskRepo     domainrepo.RiskRepository
}

func NewUpdateIncidentUseCase(
	incidentRepo domainrepo.IncidentRepository,
	riskRepo domainrepo.RiskRepository,
) *UpdateIncidentUseCase {
	return &UpdateIncidentUseCase{
		incidentRepo: incidentRepo,
		riskRepo:     riskRepo,
	}
}

type UpdateIncidentInput struct {
	ID               uuid.UUID
	Title            string
	What             string
	Who              string
	When             *time.Time
	Where            string
	WhyHow           string
	Severity         string
	Status           string
	CorrectiveAction string
	PreventiveAction string
	LinkedRiskIDs    []string
	OrganizationID   *uuid.UUID
}

type UpdateIncidentOutput struct {
	ID        uuid.UUID
	Message   string
	UpdatedAt time.Time
}

func (uc *UpdateIncidentUseCase) Execute(ctx context.Context, input UpdateIncidentInput, orgIDs []uuid.UUID, scope *entity.AccessScope) (*UpdateIncidentOutput, error) {
	// 1. Get existing incident
	existingIncident, err := uc.incidentRepo.GetByID(ctx, input.ID.String(), orgIDs)
	if err != nil {
		return nil, errors.ErrIncidentNotFound
	}

	// 1b. Enforce write scope
	if scope != nil && existingIncident.OrganizationID != nil && !scope.CanWrite(*existingIncident.OrganizationID) {
		return nil, errors.ErrForbidden
	}

	// 2. Validate linked risk if changed
	linkedRiskIDs, err := parseLinkedRiskIDs(input.LinkedRiskIDs)
	if err != nil {
		return nil, err
	}

	for _, riskID := range linkedRiskIDs {
		_, err := uc.riskRepo.GetByID(ctx, riskID, orgIDs)
		if err != nil {
			return nil, errors.Wrap(err, "linked risk not found")
		}
	}

	// 3. Update incident entity
	existingIncident.Title = input.Title
	existingIncident.What = input.What
	existingIncident.Who = input.Who
	existingIncident.When = input.When
	existingIncident.Where = input.Where
	existingIncident.WhyHow = input.WhyHow
	existingIncident.Severity = input.Severity
	existingIncident.Status = input.Status
	existingIncident.CorrectiveAction = input.CorrectiveAction
	existingIncident.PreventiveAction = input.PreventiveAction
	existingIncident.LinkedRisks = buildIncidentRiskLinks(linkedRiskIDs)
	existingIncident.LinkedRiskID = nil
	existingIncident.OrganizationID = input.OrganizationID

	// 4. Validate incident entity
	if err := existingIncident.Validate(); err != nil {
		return nil, err
	}

	// 5. Save to database
	if err := uc.incidentRepo.Update(ctx, existingIncident); err != nil {
		return nil, errors.Wrap(err, "failed to update incident")
	}

	// 6. Return result
	return &UpdateIncidentOutput{
		ID:        existingIncident.ID,
		Message:   "Incident updated successfully",
		UpdatedAt: existingIncident.UpdatedAt,
	}, nil
}

// GetIncidentSummaryUseCase retrieves aggregated incident summary counters.
type GetIncidentSummaryUseCase struct {
	incidentRepo domainrepo.IncidentRepository
}

func NewGetIncidentSummaryUseCase(incidentRepo domainrepo.IncidentRepository) *GetIncidentSummaryUseCase {
	return &GetIncidentSummaryUseCase{
		incidentRepo: incidentRepo,
	}
}

type GetIncidentSummaryInput struct {
	OrgIDs []uuid.UUID
}

func (uc *GetIncidentSummaryUseCase) Execute(ctx context.Context, input GetIncidentSummaryInput) (map[string]interface{}, error) {
	return uc.incidentRepo.GetSummary(ctx, input.OrgIDs)
}

// DeleteIncidentUseCase handles incident deletion business logic
type DeleteIncidentUseCase struct {
	incidentRepo domainrepo.IncidentRepository
}

func NewDeleteIncidentUseCase(incidentRepo domainrepo.IncidentRepository) *DeleteIncidentUseCase {
	return &DeleteIncidentUseCase{
		incidentRepo: incidentRepo,
	}
}

type DeleteIncidentOutput struct {
	Message string
}

func (uc *DeleteIncidentUseCase) Execute(ctx context.Context, id string, orgIDs []uuid.UUID, scope *entity.AccessScope) (*DeleteIncidentOutput, error) {
	// 1. Get existing incident to check if it exists
	incident, err := uc.incidentRepo.GetByID(ctx, id, orgIDs)
	if err != nil {
		return nil, errors.ErrIncidentNotFound
	}

	// 1b. Enforce write scope
	if scope != nil && incident.OrganizationID != nil && !scope.CanWrite(*incident.OrganizationID) {
		return nil, errors.ErrForbidden
	}

	// 2. Business rule: Cannot delete resolved/closed incidents
	if incident.Status == "resolved" || incident.Status == "closed" {
		return nil, errors.Wrap(errors.ErrInvalidStatus, "cannot delete resolved/closed incident")
	}

	// 3. Delete from database
	if err := uc.incidentRepo.Delete(ctx, id); err != nil {
		return nil, err
	}

	return &DeleteIncidentOutput{
		Message: "Incident deleted successfully",
	}, nil
}
