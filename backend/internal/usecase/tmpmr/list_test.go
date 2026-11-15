package tmpmr

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type listRepository struct {
	repository.TMPMRRepository
	filter                repository.TMPMRListFilter
	summaryOrganizationID *uuid.UUID
}

func (r *listRepository) List(_ context.Context, filter repository.TMPMRListFilter) ([]*entity.TMPMRAssessment, int, error) {
	r.filter = filter
	return []*entity.TMPMRAssessment{{ID: uuid.New()}}, 23, nil
}

func (r *listRepository) Summary(_ context.Context, organizationID *uuid.UUID) (repository.TMPMRSummary, error) {
	r.summaryOrganizationID = organizationID
	return repository.TMPMRSummary{Total: 40, Periods: []string{"2026", "2025"}}, nil
}

func TestListPagesFilteredRowsAndKeepsScopeSummary(t *testing.T) {
	ownID, childID := uuid.New(), uuid.New()
	repo := &listRepository{}
	output, err := NewListUseCase(repo).Execute(context.Background(), ListInput{
		OrganizationID: &childID, Period: " 2026 ", Status: " draft ", Query: " unit ",
		SortBy: "score", SortOrder: "asc", Page: 3, Limit: 10,
		Scope: &entity.AccessScope{OrganizationID: &ownID, AccessibleOrgIDs: []uuid.UUID{ownID, childID}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if repo.filter.OrganizationID == nil || *repo.filter.OrganizationID != childID || repo.filter.Period != "2026" || repo.filter.Status != "draft" || repo.filter.Query != "unit" || repo.filter.SortBy != "score" || repo.filter.SortOrder != "asc" || repo.filter.Page != 3 || repo.filter.Limit != 10 {
		t.Fatalf("unexpected filter %+v", repo.filter)
	}
	if repo.summaryOrganizationID == nil || *repo.summaryOrganizationID != ownID || output.Total != 23 || output.Summary.Total != 40 || len(output.Summary.Periods) != 2 || len(output.Data) != 1 {
		t.Fatalf("unexpected page or scope summary %+v", output)
	}
}
