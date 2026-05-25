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
	repo repository.EvaluationRepository
}

func NewCreateUseCase(repo repository.EvaluationRepository) *CreateUseCase {
	return &CreateUseCase{repo: repo}
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

	evaluation := &entity.Evaluation{
		OrganizationID: input.OrganizationID,
		Period:         strings.TrimSpace(input.Period),
		TemplateID:     template.ID,
		TemplateName:   template.Name,
		Status:         entity.EvaluationStatusDraft,
		CreatedBy:      input.CreatedBy,
		Sections:       snapshotFromTemplate(template),
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
