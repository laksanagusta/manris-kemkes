package riskcascade

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type cascadeListRepository struct {
	repository.RiskCascadeRepository
	filter        repository.RiskCascadeListFilter
	summaryOrgIDs []uuid.UUID
}

func (r *cascadeListRepository) List(_ context.Context, filter repository.RiskCascadeListFilter) ([]*entity.RiskCascade, int, error) {
	r.filter = filter
	return []*entity.RiskCascade{{ID: uuid.New()}}, 15, nil
}

func (r *cascadeListRepository) Summary(_ context.Context, orgIDs []uuid.UUID) (repository.RiskCascadeSummary, error) {
	r.summaryOrgIDs = orgIDs
	return repository.RiskCascadeSummary{Total: 90, Pending: 40}, nil
}

func TestListPagesFiltersAndKeepsAuthorizedSummary(t *testing.T) {
	ownID, childID := uuid.New(), uuid.New()
	repo := &cascadeListRepository{}
	output, err := NewListUseCase(repo).Execute(context.Background(), ListInput{
		OrgIDs: []uuid.UUID{ownID, childID}, OrganizationID: &childID,
		Status: " proposed ", CascadeType: " bottom_up_escalation ", Query: " risiko ",
		SortBy: "risk", SortOrder: "asc", Page: 2, Limit: 10,
	})
	if err != nil {
		t.Fatal(err)
	}
	if repo.filter.OrganizationID == nil || *repo.filter.OrganizationID != childID || len(repo.filter.OrgIDs) != 2 || repo.filter.Status != "proposed" || repo.filter.CascadeType != "bottom_up_escalation" || repo.filter.Query != "risiko" || repo.filter.SortBy != "risk" || repo.filter.SortOrder != "asc" || repo.filter.Page != 2 || repo.filter.Limit != 10 {
		t.Fatalf("unexpected filter %+v", repo.filter)
	}
	if len(repo.summaryOrgIDs) != 2 || output.Total != 15 || output.Summary.Total != 90 || output.Summary.Pending != 40 || len(output.Data) != 1 {
		t.Fatalf("unexpected page or summary %+v", output)
	}
}
