package tmpmr

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type UpdateUseCase struct {
	repo repository.TMPMRRepository
}

func NewUpdateUseCase(repo repository.TMPMRRepository) *UpdateUseCase {
	return &UpdateUseCase{repo: repo}
}

type UpdateInput struct {
	ID             uuid.UUID        `json:"-"`
	OrganizationID uuid.UUID        `json:"organizationId"`
	Period         string           `json:"period"`
	AssessorID     *uuid.UUID       `json:"assessorId"`
	Items          []TMPMRItemInput `json:"items"`
	Scope          *entity.AccessScope
}

func (uc *UpdateUseCase) Execute(ctx context.Context, input UpdateInput) (*entity.TMPMRAssessment, error) {
	existing, err := uc.repo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrNotFound
	}
	if !canAccessTMPMRWrite(input.Scope, existing.OrganizationID) {
		return nil, errors.ErrForbidden
	}
	if input.OrganizationID != existing.OrganizationID {
		return nil, errors.ErrOrganizationIDCannotChange
	}
	if existing.Status != entity.TMPMRStatusDraft {
		return nil, errors.ErrOnlyDraftTMPMRUpdated
	}

	updated := *existing
	updated.Period = strings.TrimSpace(input.Period)
	updated.AssessorID = input.AssessorID

	if err := updated.Validate(); err != nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, err.Error())
	}

	exists, err := uc.repo.ExistsByOrgPeriod(ctx, updated.OrganizationID, updated.Period, &updated.ID)
	if err != nil {
		return nil, errors.Wrap(err, "failed to validate tmpmr uniqueness")
	}
	if exists {
		return nil, errors.ErrTMPMRAssessmentExists
	}

	if len(input.Items) > 0 {
		rawItems := make([]entity.TMPMRItem, 0, len(input.Items))
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

		normalized, err := normalizeTMPMRItems(rawItems)
		if err != nil {
			return nil, errors.Wrap(errors.ErrInvalidInput, err.Error())
		}
		updated.Items = normalized
	} else {
		updated.Items = append([]entity.TMPMRItem(nil), existing.Items...)
	}

	scoreTMPMRAssessment(&updated)

	if err := uc.repo.Update(ctx, &updated); err != nil {
		return nil, errors.Wrap(err, "failed to update tmpmr assessment")
	}

	return &updated, nil
}
