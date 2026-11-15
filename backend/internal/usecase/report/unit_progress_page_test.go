package report

import (
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func TestUnitProgressPageFiltersBeforeCountingAndKeepsCompleteSummary(t *testing.T) {
	orgID, otherID := uuid.New(), uuid.New()
	source := &entity.UnitProgressReport{
		Cycle: "2026-Q4", MonitoringAvailable: true,
		Organizations: []entity.QuarterlyReportOrganization{{ID: orgID, Name: "Unit A"}, {ID: otherID, Name: "Unit B"}},
	}
	for i := 0; i < 25; i++ {
		status := "reported"
		if i%2 == 0 {
			status = "pending"
		}
		source.Mitigations = append(source.Mitigations, entity.UnitProgressMitigation{UnitProgressItem: entity.UnitProgressItem{
			ID: uuid.New(), OrganizationID: orgID, Title: fmt.Sprint(i), Status: status,
		}})
	}
	page := PaginateUnitProgressReport(source, UnitProgressPageFilter{Tab: "mitigations", Query: "Unit A", Status: "pending", Page: 2, Limit: 10})
	if page.Total != 13 || page.Page != 2 || len(page.Groups) != 1 || len(page.Groups[0].Mitigations) != 3 {
		t.Fatalf("unexpected page %#v", page)
	}
	group := page.Groups[0]
	if group.MitigationTotal != 25 || group.MitigationReported != 12 || len(page.Statuses) != 2 {
		t.Fatalf("incomplete summary or filter options %#v", group)
	}
	if source.Mitigations[0].Title != "0" || len(source.Mitigations) != 25 {
		t.Fatal("source report mutated")
	}
}

func TestUnitProgressPageIncludesMissingDocumentsAndBoundsPages(t *testing.T) {
	first, second := uuid.New(), uuid.New()
	source := &entity.UnitProgressReport{
		Organizations: []entity.QuarterlyReportOrganization{{ID: first, Name: "First"}, {ID: second, Name: "Second"}},
		WorkingPapers: []entity.UnitProgressWorkingPaper{{UnitProgressItem: entity.UnitProgressItem{ID: uuid.New(), OrganizationID: first, Status: "draft"}}},
	}
	page := PaginateUnitProgressReport(source, UnitProgressPageFilter{Tab: "papers", Status: "missing", Page: 20, Limit: 1})
	if page.Total != 1 || page.Page != 1 || len(page.Groups) != 1 || page.Groups[0].ID != second || len(page.Groups[0].Papers) != 0 {
		t.Fatalf("missing-document page %#v", page)
	}
	attention := PaginateUnitProgressReport(source, UnitProgressPageFilter{Tab: "summary", AttentionOnly: true})
	if attention.Total != 1 || attention.Groups[0].ID != first {
		t.Fatal("follow-up filter lost complete report context")
	}
}

func TestUnitProgressMonitoringDetailPaginatesRiskRows(t *testing.T) {
	orgID := uuid.New()
	source := &entity.UnitProgressReport{MonitoringAvailable: true, Organizations: []entity.QuarterlyReportOrganization{{ID: orgID, Name: "Unit"}}}
	for i := 0; i < 12; i++ {
		source.Risks = append(source.Risks, entity.UnitProgressRisk{UnitProgressItem: entity.UnitProgressItem{ID: uuid.New(), OrganizationID: orgID, Status: "final"}})
	}
	page := PaginateUnitProgressReport(source, UnitProgressPageFilter{Tab: "monitoring", UnitID: orgID.String(), Page: 2, Limit: 10})
	if page.Total != 12 || len(page.Groups) != 1 || len(page.Groups[0].Risks) != 2 || page.SelectedUnit.Monitoring.NotStarted != 12 {
		t.Fatalf("monitoring detail page %#v", page)
	}
	if len(page.SelectedUnit.Risks) != 0 {
		t.Fatal("selected unit metadata exposes full collection")
	}
}
