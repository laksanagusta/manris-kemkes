package performancerisk

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type fakePerformanceRiskRepo struct {
	nodes       []*entity.PerformanceRiskPlanningNode
	risks       []*entity.PerformanceRiskRiskRow
	mitigations []*entity.PerformanceRiskMitigationRow
	unlinked    []*entity.PerformanceRiskRiskRow
}

func (f fakePerformanceRiskRepo) ListPlanningNodes(context.Context, entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskPlanningNode, error) {
	return f.nodes, nil
}

func (f fakePerformanceRiskRepo) ListRiskRows(context.Context, entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskRiskRow, error) {
	return f.risks, nil
}

func (f fakePerformanceRiskRepo) ListMitigationRowsByROID(context.Context, uuid.UUID, entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskMitigationRow, error) {
	return f.mitigations, nil
}

func (f fakePerformanceRiskRepo) ListUnlinkedRiskRows(context.Context, entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskRiskRow, error) {
	return f.unlinked, nil
}

func TestPlanningMapUseCaseSortsByExposureAndKeepsZeroRiskNodes(t *testing.T) {
	roA := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	roB := uuid.MustParse("22222222-2222-2222-2222-222222222222")

	repo := fakePerformanceRiskRepo{
		nodes: []*entity.PerformanceRiskPlanningNode{
			{ROID: roA, ROTitle: "RO A", PlanningPeriod: "2026-H1"},
			{ROID: roB, ROTitle: "RO B", PlanningPeriod: "2026-H1"},
		},
		risks: []*entity.PerformanceRiskRiskRow{
			{ID: uuid.New(), ROID: &roA, Code: "R-1", Title: "Risk A", Probability: 3, Impact: 3, InherentScore: 9, MitigationDoneCount: 1, MitigationPendingCount: 1, MitigationDueDates: []string{"2026-06-01"}},
			{ID: uuid.New(), ROID: &roB, Code: "R-2", Title: "Risk B", Probability: 5, Impact: 4, InherentScore: 20, MitigationDoneCount: 1, MitigationOverdueCount: 1, MitigationDueDates: []string{"2026-01-01"}},
		},
	}

	got, err := NewPlanningMapUseCase(repo).Execute(context.Background(), Input{Period: "2026-H1"})
	if err != nil {
		t.Fatalf("Execute error = %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("len(got) = %d, want 2", len(got))
	}
	if got[0].ROID != roB {
		t.Fatalf("first ROID = %s, want %s", got[0].ROID, roB)
	}
	if got[0].TotalExposure != 20 || got[1].TotalExposure != 9 {
		t.Fatalf("unexpected exposure order: %#v", got)
	}
	if got[0].MitigationProgressDone != 1 || got[0].MitigationProgressOverdue != 1 || got[0].MitigationProgressPercent != 50 {
		t.Fatalf("unexpected mitigation progress metrics: %#v", got[0])
	}
}

func TestSummaryUseCaseCountsLinkedUnlinkedAndOverdue(t *testing.T) {
	roA := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	roB := uuid.MustParse("22222222-2222-2222-2222-222222222222")

	repo := fakePerformanceRiskRepo{
		nodes: []*entity.PerformanceRiskPlanningNode{
			{ROID: roA, ROTitle: "RO A", PlanningPeriod: "2026-H1"},
			{ROID: roB, ROTitle: "RO B", PlanningPeriod: "2026-H1"},
		},
		risks: []*entity.PerformanceRiskRiskRow{
			{ID: uuid.New(), ROID: &roA, Code: "R-1", Title: "Risk A", Probability: 5, Impact: 4, InherentScore: 20, MitigationOverdueCount: 1, MitigationDueDates: []string{"2026-01-01"}},
		},
		unlinked: []*entity.PerformanceRiskRiskRow{
			{ID: uuid.New(), Code: "R-X", Title: "Unlinked", Probability: 3, Impact: 3, InherentScore: 9},
		},
	}

	got, err := NewSummaryUseCase(repo).Execute(context.Background(), Input{Period: "2026-H1"})
	if err != nil {
		t.Fatalf("Execute error = %v", err)
	}
	if got.TotalRO != 2 || got.LinkedRO != 1 || got.UnlinkedRO != 1 {
		t.Fatalf("unexpected RO counts: %#v", got)
	}
	if got.TotalRisks != 2 || got.UnlinkedRisks != 1 {
		t.Fatalf("unexpected risk counts: %#v", got)
	}
	if got.TotalMitigations != 1 || got.OverdueMitigations != 1 {
		t.Fatalf("unexpected mitigation counts: %#v", got)
	}
	if got.LinkedRO != 1 || got.UnlinkedRO != 1 {
		t.Fatalf("unexpected linked/unlinked RO counts: %#v", got)
	}
	if got.HighOrExtremeRO != 1 {
		t.Fatalf("HighOrExtremeRO = %d, want 1", got.HighOrExtremeRO)
	}
}

func TestDetailUseCaseReturnsSelectedRORisksAndUnits(t *testing.T) {
	roA := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	roB := uuid.MustParse("22222222-2222-2222-2222-222222222222")
	orgA := uuid.MustParse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")

	repo := fakePerformanceRiskRepo{
		nodes: []*entity.PerformanceRiskPlanningNode{
			{ROID: roA, ROTitle: "RO A", ProgramTitle: "Program A", KegiatanTitle: "Kegiatan A", IKUTitle: "IKU A", SasaranTitle: "Sasaran A", TujuanTitle: "Tujuan A", PlanningPeriod: "2026-H1"},
		},
		risks: []*entity.PerformanceRiskRiskRow{
			{ID: uuid.New(), ROID: &roA, Code: "R-1", Title: "Risk A", OrganizationID: &orgA, OrganizationName: "Unit A", Probability: 5, Impact: 4, InherentScore: 20, MitigationDueDates: []string{"2026-01-01"}},
			{ID: uuid.New(), ROID: &roB, Code: "R-2", Title: "Risk B", OrganizationName: "Unit B", Probability: 3, Impact: 3, InherentScore: 9},
		},
		mitigations: []*entity.PerformanceRiskMitigationRow{
			{ID: uuid.New(), RiskID: uuid.New(), RiskCode: "R-1", RiskTitle: "Risk A", Action: "Mitigasi A", Owner: "Owner A", Status: "pending", OrganizationName: "Unit A"},
		},
	}

	got, err := NewDetailUseCase(repo).Execute(context.Background(), DetailInput{Input: Input{Period: "2026-H1"}, ROID: roA})
	if err != nil {
		t.Fatalf("Execute error = %v", err)
	}
	if got.Node.ROID != roA {
		t.Fatalf("Node ROID = %s, want %s", got.Node.ROID, roA)
	}
	if len(got.Risks) != 1 || got.Risks[0].Code != "R-1" {
		t.Fatalf("Risks = %#v, want only R-1", got.Risks)
	}
	if len(got.Mitigations) != 1 || got.Mitigations[0].Action != "Mitigasi A" {
		t.Fatalf("Mitigations = %#v, want Mitigasi A", got.Mitigations)
	}
	if len(got.Units) != 1 || got.Units[0].OrganizationName != "Unit A" {
		t.Fatalf("Units = %#v, want Unit A", got.Units)
	}
}

func TestUnlinkedUseCaseReturnsUnlinkedRisks(t *testing.T) {
	repo := fakePerformanceRiskRepo{
		unlinked: []*entity.PerformanceRiskRiskRow{
			{ID: uuid.New(), Code: "R-X", Title: "Unlinked", Probability: 3, Impact: 3, InherentScore: 9},
		},
	}

	got, err := NewUnlinkedUseCase(repo).Execute(context.Background(), Input{Period: "2026-H1"})
	if err != nil {
		t.Fatalf("Execute error = %v", err)
	}
	if len(got) != 1 || got[0].Code != "R-X" {
		t.Fatalf("got = %#v, want unlinked risk", got)
	}
}
