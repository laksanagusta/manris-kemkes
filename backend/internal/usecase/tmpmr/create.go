package tmpmr

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type CreateUseCase struct {
	repo repository.TMPMRRepository
}

func NewCreateUseCase(repo repository.TMPMRRepository) *CreateUseCase {
	return &CreateUseCase{repo: repo}
}

type TMPMRItemInput struct {
	ID          *uuid.UUID `json:"id,omitempty"`
	Dimension   string     `json:"dimension"`
	Question    string     `json:"question"`
	Score       int        `json:"score"`
	EvidenceURL string     `json:"evidenceUrl"`
	Notes       string     `json:"notes"`
}

type CreateInput struct {
	OrganizationID uuid.UUID        `json:"organizationId"`
	Period         string           `json:"period"`
	AssessorID     *uuid.UUID       `json:"assessorId"`
	Items          []TMPMRItemInput `json:"items"`
	Scope          *entity.AccessScope
}

func (uc *CreateUseCase) Execute(ctx context.Context, input CreateInput) (*entity.TMPMRAssessment, error) {
	if !canAccessTMPMRWrite(input.Scope, input.OrganizationID) {
		return nil, errors.ErrForbidden
	}

	assessment := &entity.TMPMRAssessment{
		OrganizationID: input.OrganizationID,
		Period:         strings.TrimSpace(input.Period),
		AssessorID:     input.AssessorID,
		Status:         entity.TMPMRStatusDraft,
	}

	if err := assessment.Validate(); err != nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, err.Error())
	}

	exists, err := uc.repo.ExistsByOrgPeriod(ctx, assessment.OrganizationID, assessment.Period, nil)
	if err != nil {
		return nil, errors.Wrap(err, "failed to validate tmpmr uniqueness")
	}
	if exists {
		return nil, errors.ErrTMPMRAssessmentExists
	}

	rawItems := make([]entity.TMPMRItem, 0, len(input.Items))
	if len(input.Items) == 0 {
		rawItems = entity.DefaultTMPMRItems()
	} else {
		for _, item := range input.Items {
			var itemID uuid.UUID
			if item.ID != nil {
				itemID = *item.ID
			}
			rawItems = append(rawItems, entity.TMPMRItem{
				ID:          itemID,
				Dimension:   item.Dimension,
				Question:    item.Question,
				Score:       item.Score,
				EvidenceURL: item.EvidenceURL,
				Notes:       item.Notes,
			})
		}
	}

	normalized, err := normalizeTMPMRItems(rawItems)
	if err != nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, err.Error())
	}

	assessment.Items = normalized
	scoreTMPMRAssessment(assessment)

	if err := uc.repo.Create(ctx, assessment); err != nil {
		return nil, errors.Wrap(err, "failed to create tmpmr assessment")
	}

	return assessment, nil
}
