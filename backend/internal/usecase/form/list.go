package form

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type ListFormsUseCase struct {
	formRepo       repository.FormRepository
	assignmentRepo repository.FormAssignmentRepository
}

func NewListFormsUseCase(
	formRepo repository.FormRepository,
	assignmentRepo repository.FormAssignmentRepository,
) *ListFormsUseCase {
	return &ListFormsUseCase{
		formRepo:       formRepo,
		assignmentRepo: assignmentRepo,
	}
}

type ListFormsInput struct {
	Scope        *entity.AccessScope
	StatusFilter *string
}

type FormSummary struct {
	ID            uuid.UUID
	Title         string
	Status        string
	CreatedAt     string
	ResponseCount int
}

func (uc *ListFormsUseCase) Execute(ctx context.Context, input ListFormsInput) ([]FormSummary, error) {
	if input.Scope == nil {
		return nil, domainerrors.ErrForbidden
	}
	if input.Scope.IsGlobal {
		return uc.listGlobal(ctx, input.StatusFilter)
	}
	return uc.listScoped(ctx, input.Scope.AccessibleOrgIDs, input.StatusFilter)
}

func (uc *ListFormsUseCase) listGlobal(ctx context.Context, statusFilter *string) ([]FormSummary, error) {
	filter := repository.FormListFilter{Status: statusFilter}
	forms, err := uc.formRepo.List(ctx, filter)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to list forms")
	}
	return uc.toSummaries(ctx, forms), nil
}

func (uc *ListFormsUseCase) listScoped(ctx context.Context, orgIDs []uuid.UUID, statusFilter *string) ([]FormSummary, error) {
	if len(orgIDs) == 0 {
		return []FormSummary{}, nil
	}

	ownedFilter := repository.FormListFilter{
		Status:          statusFilter,
		OrganizationIDs: orgIDs,
	}
	ownedForms, err := uc.formRepo.List(ctx, ownedFilter)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to list owned forms")
	}

	seen := make(map[uuid.UUID]struct{}, len(ownedForms))
	var result []*entity.Form
	for _, f := range ownedForms {
		seen[f.ID] = struct{}{}
		result = append(result, f)
	}

	assignedSet := make(map[uuid.UUID]struct{})
	for _, orgID := range orgIDs {
		ids, err := uc.assignmentRepo.GetFormIDsForOrganization(ctx, orgID)
		if err != nil {
			return nil, domainerrors.Wrap(err, "failed to get assigned form IDs")
		}
		for _, id := range ids {
			assignedSet[id] = struct{}{}
		}
	}

	published := entity.FormStatusPublished
	pubFilter := repository.FormListFilter{Status: &published}
	publishedForms, err := uc.formRepo.List(ctx, pubFilter)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to list published forms")
	}

	for _, f := range publishedForms {
		if _, ok := seen[f.ID]; ok {
			continue
		}
		if f.TargetAudience == "all" {
			result = append(result, f)
			continue
		}
		if _, assigned := assignedSet[f.ID]; assigned {
			result = append(result, f)
		}
	}

	return uc.toSummaries(ctx, result), nil
}

func (uc *ListFormsUseCase) toSummaries(ctx context.Context, forms []*entity.Form) []FormSummary {
	summaries := make([]FormSummary, 0, len(forms))
	for _, f := range forms {
		count, _ := uc.formRepo.GetResponseCount(ctx, f.ID)
		summaries = append(summaries, FormSummary{
			ID:            f.ID,
			Title:         f.Title,
			Status:        f.Status,
			CreatedAt:     f.CreatedAt.Format("2006-01-02T15:04:05Z"),
			ResponseCount: count,
		})
	}
	return summaries
}
