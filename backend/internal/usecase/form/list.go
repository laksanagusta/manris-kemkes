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
	UserRole     string
	UserOrgID    *uuid.UUID
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
	if input.UserRole == "super_admin" || input.UserRole == "admin" {
		return uc.listForAdmin(ctx, input.StatusFilter)
	}
	return uc.listForNonAdmin(ctx, input.UserOrgID)
}

func (uc *ListFormsUseCase) listForAdmin(ctx context.Context, statusFilter *string) ([]FormSummary, error) {
	filter := repository.FormListFilter{Status: statusFilter}
	forms, err := uc.formRepo.List(ctx, filter)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to list forms")
	}
	return uc.toSummaries(ctx, forms), nil
}

func (uc *ListFormsUseCase) listForNonAdmin(ctx context.Context, userOrgID *uuid.UUID) ([]FormSummary, error) {
	if userOrgID == nil {
		return []FormSummary{}, nil
	}

	assignedFormIDs, err := uc.assignmentRepo.GetFormIDsForOrganization(ctx, *userOrgID)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to get assigned form IDs")
	}

	published := entity.FormStatusPublished
	filter := repository.FormListFilter{Status: &published}
	allPublished, err := uc.formRepo.List(ctx, filter)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to list published forms")
	}

	assignedSet := make(map[uuid.UUID]struct{}, len(assignedFormIDs))
	for _, id := range assignedFormIDs {
		assignedSet[id] = struct{}{}
	}

	var result []*entity.Form
	for _, f := range allPublished {
		if f.TargetAudience == "all" {
			result = append(result, f)
			continue
		}
		if _, ok := assignedSet[f.ID]; ok {
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
