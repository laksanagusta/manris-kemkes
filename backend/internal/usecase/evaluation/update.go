package evaluation

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type UpdateUseCase struct {
	repo repository.EvaluationRepository
}

func NewUpdateUseCase(repo repository.EvaluationRepository) *UpdateUseCase {
	return &UpdateUseCase{repo: repo}
}

type UpdateInput struct {
	ID                     uuid.UUID           `json:"-"`
	ReportNumber           string              `json:"reportNumber"`
	ReportDate             *time.Time          `json:"reportDate"`
	AssignmentLetterNumber string              `json:"assignmentLetterNumber"`
	AssignmentLetterDate   *time.Time          `json:"assignmentLetterDate"`
	MonitoringDateRange    string              `json:"monitoringDateRange"`
	UnitCode               string              `json:"unitCode"`
	UnitLocation           string              `json:"unitLocation"`
	UnitAddress            string              `json:"unitAddress"`
	UnitEselonI            string              `json:"unitEselonI"`
	UnitLeaderName         string              `json:"unitLeaderName"`
	TeamCoordinator        string              `json:"teamCoordinator"`
	TeamLead               string              `json:"teamLead"`
	TeamMembers            string              `json:"teamMembers"`
	Problems               string              `json:"problems"`
	Recommendations        string              `json:"recommendations"`
	Sections               []SectionInput      `json:"sections"`
	Scope                  *entity.AccessScope `json:"-"`
}

func (uc *UpdateUseCase) Execute(ctx context.Context, input UpdateInput) (*entity.Evaluation, error) {
	existing, err := uc.repo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrNotFound
	}
	if !canWrite(input.Scope, existing.OrganizationID) {
		return nil, errors.ErrForbidden
	}
	if existing.Status == entity.EvaluationStatusFinal {
		return nil, errors.Wrap(errors.ErrInvalidInput, "only draft evaluations can be updated")
	}

	updated := *existing
	updated.ReportNumber = strings.TrimSpace(input.ReportNumber)
	updated.ReportDate = input.ReportDate
	updated.AssignmentLetterNumber = strings.TrimSpace(input.AssignmentLetterNumber)
	updated.AssignmentLetterDate = input.AssignmentLetterDate
	updated.MonitoringDateRange = strings.TrimSpace(input.MonitoringDateRange)
	updated.UnitCode = strings.TrimSpace(input.UnitCode)
	updated.UnitLocation = strings.TrimSpace(input.UnitLocation)
	updated.UnitAddress = strings.TrimSpace(input.UnitAddress)
	updated.UnitEselonI = strings.TrimSpace(input.UnitEselonI)
	updated.UnitLeaderName = strings.TrimSpace(input.UnitLeaderName)
	updated.TeamCoordinator = strings.TrimSpace(input.TeamCoordinator)
	updated.TeamLead = strings.TrimSpace(input.TeamLead)
	updated.TeamMembers = strings.TrimSpace(input.TeamMembers)
	updated.Problems = strings.TrimSpace(input.Problems)
	updated.Recommendations = strings.TrimSpace(input.Recommendations)

	if err := updated.Validate(); err != nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, err.Error())
	}

	exists, err := uc.repo.ExistsByOrgPeriodTemplate(ctx, updated.OrganizationID, updated.Period, updated.TemplateID, &updated.ID)
	if err != nil {
		return nil, errors.Wrap(err, "failed to validate evaluation uniqueness")
	}
	if exists {
		return nil, errors.Wrap(errors.ErrInvalidInput, "evaluation already exists for organization and period")
	}

	if len(input.Sections) > 0 {
		sections, err := sectionsFromInputs(input.Sections)
		if err != nil {
			return nil, errors.Wrap(errors.ErrInvalidInput, err.Error())
		}
		updated.Sections = sections
	} else {
		updated.Sections = cloneSections(existing.Sections)
	}

	if err := validateEvaluationSections(updated.Sections); err != nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, err.Error())
	}

	if err := uc.repo.Update(ctx, &updated); err != nil {
		return nil, errors.Wrap(err, "failed to update evaluation")
	}

	return &updated, nil
}
