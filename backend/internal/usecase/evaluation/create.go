package evaluation

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type CreateUseCase struct {
	repo    repository.EvaluationRepository
	orgRepo repository.OrganizationRepository
}

func NewCreateUseCase(repo repository.EvaluationRepository, orgRepo repository.OrganizationRepository) *CreateUseCase {
	return &CreateUseCase{repo: repo, orgRepo: orgRepo}
}

type CreateInput struct {
	OrganizationID uuid.UUID           `json:"organizationId"`
	Period         string              `json:"period"`
	TemplateKey    string              `json:"templateKey"`
	CreatedBy      *uuid.UUID          `json:"createdBy"`
	Scope          *entity.AccessScope `json:"-"`
}

func (uc *CreateUseCase) Execute(ctx context.Context, input CreateInput) (*entity.Evaluation, error) {
	if !canWrite(input.Scope, input.OrganizationID) {
		return nil, errors.ErrForbidden
	}
	if input.CreatedBy == nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, "created by is required")
	}

	templateKey := normalizeText(input.TemplateKey)
	if templateKey == "" {
		templateKey = DefaultTemplateKey
	}

	template, err := uc.repo.GetActiveTemplate(ctx, templateKey)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load active evaluation template")
	}
	if template == nil {
		return nil, errors.ErrNotFound
	}

	org, err := uc.orgRepo.GetByID(ctx, input.OrganizationID)
	if err != nil {
		return nil, errors.Wrap(errors.ErrNotFound, "organization not found")
	}

	evaluation := &entity.Evaluation{
		OrganizationID:      input.OrganizationID,
		Period:              strings.TrimSpace(input.Period),
		TemplateID:          template.ID,
		TemplateName:        template.Name,
		Status:              entity.EvaluationStatusDraft,
		CreatedBy:           input.CreatedBy,
		MonitoringDateRange: formatMonitoringDateRange(input.Period),
		UnitLocation:        strings.TrimSpace(org.Location),
		UnitAddress:         strings.TrimSpace(org.Address),
		Sections:            snapshotFromTemplate(template),
	}

	if err := evaluation.Validate(); err != nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, err.Error())
	}

	exists, err := uc.repo.ExistsByOrgPeriodTemplate(ctx, evaluation.OrganizationID, evaluation.Period, evaluation.TemplateID, nil)
	if err != nil {
		return nil, errors.Wrap(err, "failed to validate evaluation uniqueness")
	}
	if exists {
		return nil, errors.Wrap(errors.ErrInvalidInput, "evaluation already exists for organization and period")
	}

	if err := uc.repo.Create(ctx, evaluation); err != nil {
		return nil, errors.Wrap(err, "failed to create evaluation")
	}

	return evaluation, nil
}

func formatMonitoringDateRange(period string) string {
	trimmed := strings.TrimSpace(period)
	if trimmed == "" {
		return ""
	}

	parts := strings.Split(trimmed, "-")
	if len(parts) != 2 {
		return trimmed
	}

	year := strings.TrimSpace(parts[0])
	half := strings.ToUpper(strings.TrimSpace(parts[1]))

	switch half {
	case "Q1":
		return "Kuartal I Tahun " + year
	case "Q2":
		return "Semester I Tahun " + year
	case "Q3":
		return "Kuartal III Tahun " + year
	case "Q4":
		return "Semester II Tahun " + year
	case "H1":
		return "Semester I Tahun " + year
	case "H2":
		return "Semester II Tahun " + year
	default:
		return trimmed
	}
}
