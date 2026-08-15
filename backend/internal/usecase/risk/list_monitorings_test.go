package risk

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	repo "github.com/manris/backend/internal/domain/repository"
)

type fakeMonitoringListRepo struct {
	filter struct {
		OrgIDs          []uuid.UUID
		Query           string
		AssessmentCycle string
		Status          string
		Page            int
		Limit           int
		SortBy          string
		SortOrder       string
	}
	items []*entity.RiskMonitoring
	total int
}

func (r *fakeMonitoringListRepo) List(ctx context.Context, filter repo.RiskMonitoringListFilter) ([]*entity.RiskMonitoring, int, error) {
	r.filter.OrgIDs = append([]uuid.UUID(nil), filter.OrgIDs...)
	r.filter.Query = filter.Query
	r.filter.AssessmentCycle = filter.AssessmentCycle
	r.filter.Status = filter.Status
	r.filter.Page = filter.Page
	r.filter.Limit = filter.Limit
	r.filter.SortBy = filter.SortBy
	r.filter.SortOrder = filter.SortOrder
	return r.items, r.total, nil
}

func TestListRiskMonitoringsUseCase_MapsFilterAndReturnsPaginationEnvelope(t *testing.T) {
	orgID := uuid.New()
	repo := &fakeMonitoringListRepo{
		items: []*entity.RiskMonitoring{
			{
				ID:              uuid.New(),
				AssessmentCycle: "2026-Q2",
				Status:          entity.RiskMonitoringStatusDraft,
			},
		},
		total: 1,
	}

	uc := NewListRiskMonitoringsUseCase(repo)
	result, err := uc.Execute(context.Background(), ListRiskMonitoringsInput{
		OrgIDs:          []uuid.UUID{orgID},
		Query:           "server",
		AssessmentCycle: "2026-Q2",
		Status:          entity.RiskMonitoringStatusDraft,
		Page:            2,
		Limit:           25,
		SortBy:          "started_at",
		SortOrder:       "asc",
	})
	if err != nil {
		t.Fatalf("Execute: %v", err)
	}

	if result == nil {
		t.Fatal("expected result")
	}
	if len(result.Data) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Data))
	}
	if result.Total != 1 {
		t.Fatalf("expected total 1, got %d", result.Total)
	}
	if result.Page != 2 {
		t.Fatalf("expected page 2, got %d", result.Page)
	}
	if result.Limit != 25 {
		t.Fatalf("expected limit 25, got %d", result.Limit)
	}
	if len(repo.filter.OrgIDs) != 1 || repo.filter.OrgIDs[0] != orgID {
		t.Fatalf("expected org filter %s, got %v", orgID, repo.filter.OrgIDs)
	}
	if repo.filter.Query != "server" {
		t.Fatalf("expected query server, got %q", repo.filter.Query)
	}
	if repo.filter.AssessmentCycle != "2026-Q2" {
		t.Fatalf("expected assessment cycle 2026-Q2, got %q", repo.filter.AssessmentCycle)
	}
	if repo.filter.Status != entity.RiskMonitoringStatusDraft {
		t.Fatalf("expected status draft, got %q", repo.filter.Status)
	}
	if repo.filter.SortBy != "started_at" {
		t.Fatalf("expected sort_by started_at, got %q", repo.filter.SortBy)
	}
	if repo.filter.SortOrder != "asc" {
		t.Fatalf("expected sort_order asc, got %q", repo.filter.SortOrder)
	}
}
