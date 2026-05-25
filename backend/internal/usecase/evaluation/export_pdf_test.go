package evaluation

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
)

type exportPDFOrgRepoStub struct {
	org *entity.Organization
}

func (s exportPDFOrgRepoStub) Create(context.Context, *entity.Organization) error { return nil }
func (s exportPDFOrgRepoStub) GetByID(context.Context, uuid.UUID) (*entity.Organization, error) {
	if s.org == nil {
		return nil, context.Canceled
	}
	copy := *s.org
	return &copy, nil
}
func (s exportPDFOrgRepoStub) Update(context.Context, *entity.Organization) error { return nil }
func (s exportPDFOrgRepoStub) Delete(context.Context, uuid.UUID) error            { return nil }
func (s exportPDFOrgRepoStub) List(context.Context) ([]*entity.Organization, error) {
	return nil, nil
}
func (s exportPDFOrgRepoStub) ListWithFilter(context.Context, repository.OrganizationListFilter) ([]*entity.Organization, int, error) {
	return nil, 0, nil
}
func (s exportPDFOrgRepoStub) GetContext(context.Context, uuid.UUID) (string, error) { return "", nil }
func (s exportPDFOrgRepoStub) GetDescendants(context.Context, uuid.UUID) ([]uuid.UUID, error) {
	return nil, nil
}

var _ repository.OrganizationRepository = exportPDFOrgRepoStub{}

type exportPDFRiskRepoStub struct {
	risks []*entity.Risk
}

func (s exportPDFRiskRepoStub) Create(context.Context, *entity.Risk) error { return nil }
func (s exportPDFRiskRepoStub) GetByID(context.Context, uuid.UUID, []uuid.UUID) (*entity.Risk, error) {
	return nil, nil
}
func (s exportPDFRiskRepoStub) Update(context.Context, *entity.Risk) error { return nil }
func (s exportPDFRiskRepoStub) Delete(context.Context, uuid.UUID) error    { return nil }
func (s exportPDFRiskRepoStub) List(context.Context, []uuid.UUID, string, string) ([]*entity.Risk, error) {
	return nil, nil
}
func (s exportPDFRiskRepoStub) ListRegister(context.Context, repository.RiskRegisterFilter) ([]*entity.Risk, int, error) {
	return nil, 0, nil
}
func (s exportPDFRiskRepoStub) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, nil
}
func (s exportPDFRiskRepoStub) NextRiskCode(context.Context) (string, error) { return "", nil }
func (s exportPDFRiskRepoStub) ListApprovedRisks(context.Context, []uuid.UUID, string) ([]*entity.Risk, error) {
	return nil, nil
}
func (s exportPDFRiskRepoStub) DashboardSummary(context.Context, string, []uuid.UUID) (*entity.DashboardSummary, error) {
	return nil, nil
}
func (s exportPDFRiskRepoStub) DashboardCategoryCounts(context.Context, string, []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	return nil, nil
}
func (s exportPDFRiskRepoStub) HeatmapData(context.Context, string, []uuid.UUID) ([]*entity.HeatmapCell, error) {
	return nil, nil
}
func (s exportPDFRiskRepoStub) HeatmapMultiPhase(context.Context, int, []uuid.UUID) (*entity.HeatmapMultiPhase, error) {
	return nil, nil
}
func (s exportPDFRiskRepoStub) TopRisks(context.Context, string, int, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (s exportPDFRiskRepoStub) ListVersions(context.Context, uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (s exportPDFRiskRepoStub) ListCycleSnapshot(_ context.Context, _ string, _ []uuid.UUID) ([]*entity.Risk, error) {
	return s.risks, nil
}
func (s exportPDFRiskRepoStub) ActivateApprovedVersion(context.Context, uuid.UUID) error { return nil }
func (s exportPDFRiskRepoStub) ListReviewQueue(context.Context, string, []uuid.UUID, string, string, int, int) ([]*entity.RiskReviewQueueItem, int, error) {
	return nil, 0, nil
}
func (s exportPDFRiskRepoStub) CompareCycles(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	return nil, nil
}
func (s exportPDFRiskRepoStub) RiskReviewSummary(context.Context, string, []uuid.UUID) (*entity.RiskReviewSummary, error) {
	return nil, nil
}
func (s exportPDFRiskRepoStub) GetHeatmapVelocity(context.Context, string, string, []uuid.UUID) ([]entity.HeatmapVelocityCell, error) {
	return nil, nil
}
func (s exportPDFRiskRepoStub) GetOverdueMitigationTimeline(context.Context, []uuid.UUID) ([]entity.OverdueMitigationTimelineItem, error) {
	return nil, nil
}
func (s exportPDFRiskRepoStub) GetKRIBreachSummary(context.Context, []uuid.UUID) ([]entity.KRIBreachItem, error) {
	return nil, nil
}
func (s exportPDFRiskRepoStub) GetUnitResponseTime(context.Context, []uuid.UUID) ([]entity.UnitResponseTime, error) {
	return nil, nil
}

var _ repository.RiskRepository = exportPDFRiskRepoStub{}

type exportPDFRendererStub struct {
	data *entity.KMKFormalReportData
}

func (s *exportPDFRendererStub) Render(context.Context, *entity.ReportData) ([]byte, error) {
	return nil, nil
}

func (s *exportPDFRendererStub) RenderFormal(_ context.Context, data *entity.KMKFormalReportData) ([]byte, error) {
	s.data = data
	return []byte("%PDF-1.4 fake"), nil
}

func (s *exportPDFRendererStub) RenderRiskDetail(context.Context, *entity.RiskDetailPDFData) ([]byte, error) {
	return nil, nil
}

var _ service.FormalReportPDFRenderer = (*exportPDFRendererStub)(nil)

func TestBuildMonitoringEvaluationDataUsesEvaluationRows(t *testing.T) {
	org := &entity.Organization{ID: uuid.New(), Name: "Balai Contoh"}
	evaluation := &entity.Evaluation{
		Period:       "2026-H1",
		Status:       entity.EvaluationStatusDraft,
		ReportNumber: "MR/01",
		Sections: []entity.EvaluationSection{
			{
				SectionKey: "document_completeness",
				Title:      "Kelengkapan dokumen",
				Conclusion: "Dokumen lengkap",
				Items: []entity.EvaluationItem{
					{ItemNo: "1", ItemKey: "doc-1", Label: "Dokumen kebijakan", Answer: entity.EvaluationAnswerYes, Condition: "Ada", Description: "Lengkap", Analysis: "Cukup"},
				},
			},
			{
				SectionKey: "infrastructure_adequacy",
				Title:      "Infrastruktur",
				Conclusion: "Infrastruktur cukup",
				Items: []entity.EvaluationItem{
					{ItemNo: "1.a.2", ItemKey: "infra-1", Label: "Penggunaan informasi risiko", Answer: entity.EvaluationAnswerNo, Condition: "Belum", Description: "Belum", Analysis: "Perlu"},
				},
			},
			{
				SectionKey: "implementation_result",
				Title:      "Hasil",
				Conclusion: "Hasil efektif",
				Items: []entity.EvaluationItem{
					{ItemNo: "1.a", ItemKey: "result-1", Label: "Mitigasi berjalan", Answer: entity.EvaluationAnswerUnset},
				},
			},
			{
				SectionKey: "mitigation_monitoring",
				Title:      "Mitigasi",
				Conclusion: "Risiko perlu dipantau",
			},
		},
	}
	risk := &entity.Risk{
		ID:                    uuid.New(),
		Code:                  "R-001",
		Title:                 "Risiko tinggi",
		Status:                entity.RiskStatusApproved,
		Probability:           5,
		Impact:                4,
		Nilai:                 20,
		Mitigations:           []entity.Mitigation{{Action: "A"}},
		BeforeMonitoringNilai: floatPtr(24),
		MonitoringResultNilai: floatPtr(18),
	}

	data := buildMonitoringEvaluationData(evaluation, org, []*entity.Risk{risk})

	if got := data.DocumentChecklist; len(got) != 1 || got[0].Item != "Dokumen kebijakan" || !got[0].Yes {
		t.Fatalf("document checklist mismatch: %#v", got)
	}
	if got := data.InfrastructureChecklist; len(got) != 1 || got[0].Item != "Penggunaan informasi risiko" || !got[0].NoChecked {
		t.Fatalf("infrastructure checklist mismatch: %#v", got)
	}
	if got := data.ResultChecklist; len(got) != 1 || got[0].Item != "Mitigasi berjalan" {
		t.Fatalf("result checklist mismatch: %#v", got)
	}
	if data.DocumentConclusion != "Dokumen lengkap" || data.InfrastructureConclusion != "Infrastruktur cukup" || data.ResultConclusion != "Hasil efektif" || data.MitigationConclusion != "Risiko perlu dipantau" {
		t.Fatalf("unexpected conclusions: %#v", data)
	}
	if len(data.MitigationSummary) == 0 || data.MitigationSummary[0].RiskCount != 1 {
		t.Fatalf("unexpected mitigation summary: %#v", data.MitigationSummary)
	}
	if data.EvaluationStatus != "DRAFT" {
		t.Fatalf("evaluation status = %q, want DRAFT", data.EvaluationStatus)
	}
}

func TestBuildMonitoringEvaluationDataKeepsBlankOptionalMetadata(t *testing.T) {
	evaluation := &entity.Evaluation{
		Period: "2026-H2",
		Status: entity.EvaluationStatusFinal,
		Sections: []entity.EvaluationSection{
			{SectionKey: "document_completeness", Title: "Dokumen"},
		},
	}

	data := buildMonitoringEvaluationData(evaluation, nil, nil)

	if data.OrganizationName != "" {
		t.Fatalf("OrganizationName = %q, want blank", data.OrganizationName)
	}
	if data.ReportNumber != "" || data.ReportDate != "" || data.AssignmentLetterNumber != "" || data.AssignmentLetterDate != "" {
		t.Fatalf("optional metadata should remain blank: %#v", data)
	}
	if data.Year != "2026" || data.SemesterLabel != "SEMESTER II" {
		t.Fatalf("unexpected period parsing: %#v", data)
	}
	if data.EvaluationStatus != "FINAL" {
		t.Fatalf("evaluation status = %q, want FINAL", data.EvaluationStatus)
	}
}

func TestBuildMonitoringEvaluationDataUsesLiveMitigationSummary(t *testing.T) {
	evaluation := &entity.Evaluation{
		Period: "2026-H1",
		Sections: []entity.EvaluationSection{
			{SectionKey: "mitigation_monitoring", Title: "Mitigasi"},
		},
	}

	data := buildMonitoringEvaluationData(evaluation, nil, []*entity.Risk{
		{
			ID:                    uuid.New(),
			Code:                  "R-001",
			Title:                 "Risiko tinggi",
			Status:                entity.RiskStatusApproved,
			Probability:           5,
			Impact:                4,
			Nilai:                 20,
			Mitigations:           []entity.Mitigation{{Action: "A"}, {Action: "B"}},
			BeforeMonitoringNilai: floatPtr(25),
			MonitoringResultNilai: floatPtr(20),
		},
	})

	if len(data.MitigationSummary) != 6 {
		t.Fatalf("mitigation summary length = %d, want 6", len(data.MitigationSummary))
	}
	if data.MitigationSummary[0].RiskCount != 1 || data.MitigationSummary[0].MitigationPlanCount != 2 {
		t.Fatalf("mitigation summary not generated from live risks: %#v", data.MitigationSummary[0])
	}
	if data.MitigationSummary[len(data.MitigationSummary)-1].Total != true {
		t.Fatalf("expected total row at end: %#v", data.MitigationSummary)
	}
}

func TestExportPDFUseCaseRendersFilenameAndPDF(t *testing.T) {
	orgID := uuid.New()
	evalID := uuid.New()
	repo := newFakeEvaluationRepo()
	repo.evals[evalID] = &entity.Evaluation{
		ID:             evalID,
		OrganizationID: orgID,
		Period:         "2026-H1",
		Status:         entity.EvaluationStatusDraft,
		TemplateID:     uuid.New(),
		Sections:       []entity.EvaluationSection{{SectionKey: "document_completeness", Title: "Dok"}},
	}

	renderer := &exportPDFRendererStub{}
	uc := NewExportPDFUseCase(repo, exportPDFOrgRepoStub{org: &entity.Organization{ID: orgID, Name: "Unit A"}}, exportPDFRiskRepoStub{risks: []*entity.Risk{}}, renderer)

	out, err := uc.Execute(context.Background(), ExportPDFInput{
		ID:    evalID,
		Scope: &entity.AccessScope{IsGlobal: true},
	})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}
	if out.Filename != "evaluasi-mr-2026-H1.pdf" {
		t.Fatalf("Filename = %q, want evaluasi-mr-2026-H1.pdf", out.Filename)
	}
	if len(out.Bytes) == 0 {
		t.Fatal("expected PDF bytes")
	}
	if renderer.data == nil || renderer.data.MonitoringEvaluationReport == nil {
		t.Fatal("renderer not called with monitoring evaluation data")
	}
}

func floatPtr(value float64) *float64 {
	return &value
}
