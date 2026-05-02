package report

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	repo "github.com/manris/backend/internal/domain/repository"
)

type fakeReportRiskRepo struct {
	listCycleSnapshot func(context.Context, string, []uuid.UUID) ([]*entity.Risk, error)
	listApprovedRisks func(context.Context, []uuid.UUID) ([]*entity.Risk, error)
}

func (r *fakeReportRiskRepo) Create(context.Context, *entity.Risk) error {
	return errors.New("not implemented")
}

func (r *fakeReportRiskRepo) GetByID(_ context.Context, _ uuid.UUID, _ []uuid.UUID) (*entity.Risk, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeReportRiskRepo) Update(context.Context, *entity.Risk) error {
	return errors.New("not implemented")
}

func (r *fakeReportRiskRepo) Delete(context.Context, uuid.UUID) error {
	return errors.New("not implemented")
}

func (r *fakeReportRiskRepo) List(context.Context, []uuid.UUID, string, string) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeReportRiskRepo) ListRegister(context.Context, repo.RiskRegisterFilter) ([]*entity.Risk, int, error) {
	return nil, 0, errors.New("not implemented")
}

func (r *fakeReportRiskRepo) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeReportRiskRepo) NextRiskCode(context.Context) (string, error) {
	return "", errors.New("not implemented")
}

func (r *fakeReportRiskRepo) ListApprovedRisks(ctx context.Context, orgIDs []uuid.UUID, _ string) ([]*entity.Risk, error) {
	if r.listApprovedRisks != nil {
		return r.listApprovedRisks(ctx, orgIDs)
	}
	return nil, errors.New("not implemented")
}

func (r *fakeReportRiskRepo) DashboardSummary(context.Context, string, []uuid.UUID) (*entity.DashboardSummary, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeReportRiskRepo) DashboardCategoryCounts(context.Context, string, []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeReportRiskRepo) HeatmapData(context.Context, string, []uuid.UUID) ([]*entity.HeatmapCell, error) {
	return nil, errors.New("not implemented")
}
func (r *fakeReportRiskRepo) HeatmapMultiPhase(context.Context, int, []uuid.UUID) (*entity.HeatmapMultiPhase, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeReportRiskRepo) TopRisks(context.Context, string, int, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeReportRiskRepo) ListVersions(context.Context, uuid.UUID) ([]*entity.Risk, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeReportRiskRepo) ListCycleSnapshot(ctx context.Context, cycle string, orgIDs []uuid.UUID) ([]*entity.Risk, error) {
	if r.listCycleSnapshot != nil {
		return r.listCycleSnapshot(ctx, cycle, orgIDs)
	}
	return nil, errors.New("not implemented")
}

func (r *fakeReportRiskRepo) ActivateApprovedVersion(context.Context, uuid.UUID) error {
	return errors.New("not implemented")
}

func (r *fakeReportRiskRepo) ListReviewQueue(context.Context, string, []uuid.UUID, string, string, int, int) ([]*entity.RiskReviewQueueItem, int, error) {
	return nil, 0, errors.New("not implemented")
}

func (r *fakeReportRiskRepo) CompareCycles(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeReportRiskRepo) RiskReviewSummary(context.Context, string, []uuid.UUID) (*entity.RiskReviewSummary, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeReportRiskRepo) GetHeatmapVelocity(context.Context, string, string, []uuid.UUID) ([]entity.HeatmapVelocityCell, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeReportRiskRepo) GetOverdueMitigationTimeline(context.Context, []uuid.UUID) ([]entity.OverdueMitigationTimelineItem, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeReportRiskRepo) GetKRIBreachSummary(context.Context, []uuid.UUID) ([]entity.KRIBreachItem, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeReportRiskRepo) GetUnitResponseTime(context.Context, []uuid.UUID) ([]entity.UnitResponseTime, error) {
	return nil, errors.New("not implemented")
}

type fakeReportIncidentRepo struct {
	list func(context.Context, []uuid.UUID) ([]*entity.Incident, error)
}

func (r *fakeReportIncidentRepo) Create(context.Context, *entity.Incident) error {
	return errors.New("not implemented")
}

func (r *fakeReportIncidentRepo) GetByID(_ context.Context, _ string, _ []uuid.UUID) (*entity.Incident, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeReportIncidentRepo) Update(context.Context, *entity.Incident) error {
	return errors.New("not implemented")
}

func (r *fakeReportIncidentRepo) Delete(context.Context, string) error {
	return errors.New("not implemented")
}

func (r *fakeReportIncidentRepo) List(ctx context.Context, orgIDs []uuid.UUID) ([]*entity.Incident, error) {
	if r.list != nil {
		return r.list(ctx, orgIDs)
	}
	return nil, nil
}

func (r *fakeReportIncidentRepo) GetSummary(context.Context, []uuid.UUID) (map[string]interface{}, error) {
	return nil, errors.New("not implemented")
}

type fakeReportKRIRepo struct {
	list func(context.Context, []uuid.UUID, bool) ([]*entity.KRI, error)
}

func (r *fakeReportKRIRepo) Create(context.Context, *entity.KRI) error {
	return errors.New("not implemented")
}

func (r *fakeReportKRIRepo) GetByID(_ context.Context, _ uuid.UUID, _ []uuid.UUID) (*entity.KRI, error) {
	return nil, errors.New("not implemented")
}

func (r *fakeReportKRIRepo) Update(context.Context, *entity.KRI) error {
	return errors.New("not implemented")
}

func (r *fakeReportKRIRepo) Delete(context.Context, uuid.UUID) error {
	return errors.New("not implemented")
}

func (r *fakeReportKRIRepo) Archive(context.Context, uuid.UUID, string) error {
	return errors.New("not implemented")
}

func (r *fakeReportKRIRepo) List(ctx context.Context, orgIDs []uuid.UUID, includeArchived bool) ([]*entity.KRI, error) {
	if r.list != nil {
		return r.list(ctx, orgIDs, includeArchived)
	}
	return nil, nil
}

func (r *fakeReportKRIRepo) GetDashboard(context.Context, []uuid.UUID) (map[string]interface{}, error) {
	return nil, errors.New("not implemented")
}

func TestGenerateReportUseCase_ExecuteUsesEffectiveSemanticsForPrimaryOutputs(t *testing.T) {
	alpha := approvedRiskWithReviewedBundle("R-ALPHA", "Alpha", entity.RiskCategoryKebijakan, "2026-H1", 5, 4, 23)
	alpha.Mitigations = []entity.Mitigation{{Action: "Escalate vendor"}}

	beta := approvedRiskWithReviewedBundle("R-BETA", "Beta", entity.RiskCategoryOperasional, "2026-H1", 1, 1, 1)
	gamma := approvedRiskWithReviewedBundle("R-GAMMA", "Gamma", entity.RiskCategoryKepatuhan, "2026-H1", 5, 2, 12)

	trendExtreme := approvedRiskWithReviewedBundle("R-TREND-1", "Trend Extreme", entity.RiskCategoryKebijakan, "2025-H2", 5, 4, 23)
	trendLow := approvedRiskWithReviewedBundle("R-TREND-2", "Trend Low", entity.RiskCategoryOperasional, "2026-H1", 1, 1, 1)
	trendMedium := approvedRiskWithReviewedBundle("R-TREND-3", "Trend Medium", entity.RiskCategoryKepatuhan, "2026-H1", 5, 2, 12)

	riskRepo := &fakeReportRiskRepo{
		listCycleSnapshot: func(_ context.Context, cycle string, _ []uuid.UUID) ([]*entity.Risk, error) {
			if cycle != "2026-H1" {
				return nil, nil
			}
			return []*entity.Risk{beta, gamma, alpha}, nil
		},
		listApprovedRisks: func(_ context.Context, _ []uuid.UUID) ([]*entity.Risk, error) {
			return []*entity.Risk{trendMedium, trendLow, trendExtreme}, nil
		},
	}

	incidentRepo := &fakeReportIncidentRepo{}
	kriRepo := &fakeReportKRIRepo{}
	uc := NewGenerateReportUseCase(riskRepo, incidentRepo, kriRepo)

	reportData, err := uc.Execute(context.Background(), GenerateReportInput{Cycle: "2026-H1"})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}

	if reportData.Summary.TotalRisks != 3 {
		t.Fatalf("Summary.TotalRisks = %d, want 3", reportData.Summary.TotalRisks)
	}
	if reportData.Summary.HighExtremeCount != 2 {
		t.Fatalf("Summary.HighExtremeCount = %d, want 2 from effective scores", reportData.Summary.HighExtremeCount)
	}
	if reportData.Summary.AvgExposureScore != 12 {
		t.Fatalf("Summary.AvgExposureScore = %v, want 12 from effective scores", reportData.Summary.AvgExposureScore)
	}

	if reportData.Heatmap[4][3] != 1 {
		t.Fatalf("Heatmap[4][3] = %d, want 1 for reviewed 5x4 risk", reportData.Heatmap[4][3])
	}
	if reportData.Heatmap[0][0] != 1 {
		t.Fatalf("Heatmap[0][0] = %d, want 1 for reviewed 1x1 risk", reportData.Heatmap[0][0])
	}
	if reportData.Heatmap[4][1] != 1 {
		t.Fatalf("Heatmap[4][1] = %d, want 1 for reviewed 5x2 risk", reportData.Heatmap[4][1])
	}

	if len(reportData.Risks) != 3 {
		t.Fatalf("len(Risks) = %d, want 3", len(reportData.Risks))
	}
	if reportData.Risks[0].Code != "R-ALPHA" || reportData.Risks[1].Code != "R-GAMMA" || reportData.Risks[2].Code != "R-BETA" {
		t.Fatalf("Risks order = [%s %s %s], want [R-ALPHA R-GAMMA R-BETA] by effective score", reportData.Risks[0].Code, reportData.Risks[1].Code, reportData.Risks[2].Code)
	}
	if len(reportData.TopRisks) != 3 {
		t.Fatalf("len(TopRisks) = %d, want 3", len(reportData.TopRisks))
	}
	if reportData.TopRisks[0].Code != "R-ALPHA" || reportData.TopRisks[1].Code != "R-GAMMA" || reportData.TopRisks[2].Code != "R-BETA" {
		t.Fatalf("TopRisks order = [%s %s %s], want [R-ALPHA R-GAMMA R-BETA] by effective score", reportData.TopRisks[0].Code, reportData.TopRisks[1].Code, reportData.TopRisks[2].Code)
	}

	if len(reportData.TrendData) != 2 {
		t.Fatalf("len(TrendData) = %d, want 2", len(reportData.TrendData))
	}
	if reportData.TrendData[0].Cycle != "2025-H2" || reportData.TrendData[0].Ekstrem != 1 {
		t.Fatalf("TrendData[0] = %+v, want 2025-H2 with Ekstrem=1 from effective score", reportData.TrendData[0])
	}
	if reportData.TrendData[1].Cycle != "2026-H1" || reportData.TrendData[1].SangatRendah != 1 || reportData.TrendData[1].Sedang != 1 {
		t.Fatalf("TrendData[1] = %+v, want 2026-H1 with SangatRendah=1 and Sedang=1 from effective scores", reportData.TrendData[1])
	}
}

func TestGenerateReportUseCase_ExecuteKeepsFallbackAndDraftIsolationCompatible(t *testing.T) {
	legacyApproved := approvedRiskWithPartialReviewedBundle("R-LEGACY", "Legacy", entity.RiskCategoryOperasional, "2026-H1", 5, 4, 20)
	draftReviewed := nonFinalizedRiskWithReviewedDraft("R-DRAFT", "Draft", entity.RiskCategoryKebijakan, "2026-H1", entity.RiskStatusInReview, 4, 4, 16)
	finalizedZero := approvedRiskWithReviewedBundle("R-ZERO", "Zero", entity.RiskCategoryKepatuhan, "2026-H1", 1, 1, 1)

	riskRepo := &fakeReportRiskRepo{
		listCycleSnapshot: func(_ context.Context, cycle string, _ []uuid.UUID) ([]*entity.Risk, error) {
			if cycle != "2026-H1" {
				return nil, nil
			}
			return []*entity.Risk{finalizedZero, draftReviewed, legacyApproved}, nil
		},
		listApprovedRisks: func(_ context.Context, _ []uuid.UUID) ([]*entity.Risk, error) {
			return []*entity.Risk{legacyApproved, draftReviewed, finalizedZero}, nil
		},
	}

	uc := NewGenerateReportUseCase(riskRepo, &fakeReportIncidentRepo{}, &fakeReportKRIRepo{})
	reportData, err := uc.Execute(context.Background(), GenerateReportInput{Cycle: "2026-H1"})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}

	if reportData.Risks[0].Code != "R-LEGACY" || reportData.Risks[1].Code != "R-DRAFT" || reportData.Risks[2].Code != "R-ZERO" {
		t.Fatalf("Risks order = [%s %s %s], want [R-LEGACY R-DRAFT R-ZERO] using fallback/inherent parity and explicit zero reviewed handling", reportData.Risks[0].Code, reportData.Risks[1].Code, reportData.Risks[2].Code)
	}
	if reportData.Summary.HighExtremeCount != 2 {
		t.Fatalf("Summary.HighExtremeCount = %d, want 2 from approved fallback + non-finalized inherent semantics", reportData.Summary.HighExtremeCount)
	}
	if reportData.Heatmap[4][3] != 1 || reportData.Heatmap[3][3] != 1 || reportData.Heatmap[0][0] != 1 {
		t.Fatalf("Heatmap = %+v, want fallback approved at 5x4, draft isolation at 4x4, and zero reviewed finalized at 1x1", reportData.Heatmap)
	}
	if reportData.TrendData[0].Cycle != "2026-H1" || reportData.TrendData[0].SangatRendah != 1 || reportData.TrendData[0].Tinggi != 1 || reportData.TrendData[0].Ekstrem != 1 {
		t.Fatalf("TrendData[0] = %+v, want one SangatRendah, one Tinggi, and one Ekstrem bucket", reportData.TrendData[0])
	}
}

func TestReportExcludesSiblingOrgData(t *testing.T) {
	orgA := uuid.New()
	orgB := uuid.New()

	riskA := approvedRiskWithReviewedBundle("R-ORGA", "OrgA Risk", entity.RiskCategoryOperasional, "2026-H1", 3, 3, 9)
	riskB := approvedRiskWithReviewedBundle("R-ORGB", "OrgB Risk", entity.RiskCategoryOperasional, "2026-H1", 4, 4, 16)

	incidentA := &entity.Incident{ID: uuid.New(), Title: "OrgA Incident", LinkedRiskID: &riskA.ID, OrganizationID: &orgA}
	incidentB := &entity.Incident{ID: uuid.New(), Title: "OrgB Incident", LinkedRiskID: &riskB.ID, OrganizationID: &orgB}

	kriA := &entity.KRI{ID: uuid.New(), RiskID: riskA.ID, Name: "OrgA KRI", OrganizationID: &orgA}
	kriB := &entity.KRI{ID: uuid.New(), RiskID: riskB.ID, Name: "OrgB KRI", OrganizationID: &orgB}

	riskRepo := &fakeReportRiskRepo{
		listCycleSnapshot: func(_ context.Context, cycle string, orgIDs []uuid.UUID) ([]*entity.Risk, error) {
			if cycle != "2026-H1" {
				return nil, nil
			}
			return []*entity.Risk{riskA}, nil
		},
		listApprovedRisks: func(_ context.Context, _ []uuid.UUID) ([]*entity.Risk, error) {
			return []*entity.Risk{riskA}, nil
		},
	}

	incidentRepo := &fakeReportIncidentRepo{
		list: func(_ context.Context, orgIDs []uuid.UUID) ([]*entity.Incident, error) {
			if len(orgIDs) == 0 {
				t.Fatal("incidentRepo.List called with nil/empty orgIDs — data leak")
			}
			var result []*entity.Incident
			allowed := make(map[uuid.UUID]struct{}, len(orgIDs))
			for _, id := range orgIDs {
				allowed[id] = struct{}{}
			}
			for _, inc := range []*entity.Incident{incidentA, incidentB} {
				if inc.OrganizationID != nil {
					if _, ok := allowed[*inc.OrganizationID]; ok {
						result = append(result, inc)
					}
				}
			}
			return result, nil
		},
	}

	kriRepo := &fakeReportKRIRepo{
		list: func(_ context.Context, orgIDs []uuid.UUID, _ bool) ([]*entity.KRI, error) {
			if len(orgIDs) == 0 {
				t.Fatal("kriRepo.List called with nil/empty orgIDs — data leak")
			}
			var result []*entity.KRI
			allowed := make(map[uuid.UUID]struct{}, len(orgIDs))
			for _, id := range orgIDs {
				allowed[id] = struct{}{}
			}
			for _, kri := range []*entity.KRI{kriA, kriB} {
				if kri.OrganizationID != nil {
					if _, ok := allowed[*kri.OrganizationID]; ok {
						result = append(result, kri)
					}
				}
			}
			return result, nil
		},
	}

	uc := NewGenerateReportUseCase(riskRepo, incidentRepo, kriRepo)
	report, err := uc.Execute(context.Background(), GenerateReportInput{
		Cycle:  "2026-H1",
		OrgIDs: []uuid.UUID{orgA},
	})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}

	// Verify only orgA incidents are present
	for _, inc := range report.Incidents {
		if inc.OrganizationID != nil && *inc.OrganizationID == orgB {
			t.Fatalf("report contains sibling org B incident %q — data leak", inc.Title)
		}
	}
	if len(report.Incidents) != 1 || report.Incidents[0].Title != "OrgA Incident" {
		t.Fatalf("Incidents = %v, want exactly 1 OrgA Incident", report.Incidents)
	}

	// Verify only orgA KRIs are present
	for _, kri := range report.KRIs {
		if kri.OrganizationID != nil && *kri.OrganizationID == orgB {
			t.Fatalf("report contains sibling org B KRI %q — data leak", kri.Name)
		}
	}
	if len(report.KRIs) != 1 || report.KRIs[0].Name != "OrgA KRI" {
		t.Fatalf("KRIs = %v, want exactly 1 OrgA KRI", report.KRIs)
	}
}

func TestGenerateReportUseCase_IgnoresNilItems(t *testing.T) {
	risk := approvedRiskWithReviewedBundle("R-NIL", "Nil Guard", entity.RiskCategoryOperasional, "2026-H1", 5, 4, 20)
	riskRepo := &fakeReportRiskRepo{
		listCycleSnapshot: func(_ context.Context, cycle string, _ []uuid.UUID) ([]*entity.Risk, error) {
			return []*entity.Risk{nil, risk}, nil
		},
		listApprovedRisks: func(_ context.Context, _ []uuid.UUID) ([]*entity.Risk, error) {
			return []*entity.Risk{nil, risk}, nil
		},
	}

	incidentRepo := &fakeReportIncidentRepo{
		list: func(context.Context, []uuid.UUID) ([]*entity.Incident, error) {
			return []*entity.Incident{nil}, nil
		},
	}
	kriRepo := &fakeReportKRIRepo{
		list: func(context.Context, []uuid.UUID, bool) ([]*entity.KRI, error) {
			return []*entity.KRI{nil}, nil
		},
	}

	uc := NewGenerateReportUseCase(riskRepo, incidentRepo, kriRepo)
	reportData, err := uc.Execute(context.Background(), GenerateReportInput{Cycle: "2026-H1"})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}

	if len(reportData.Risks) != 1 || reportData.Risks[0].Code != "R-NIL" {
		t.Fatalf("Risks = %#v, want only the non-nil risk", reportData.Risks)
	}
	if len(reportData.Incidents) != 0 {
		t.Fatalf("Incidents = %#v, want empty after nil filtering", reportData.Incidents)
	}
	if len(reportData.KRIs) != 0 {
		t.Fatalf("KRIs = %#v, want empty after nil filtering", reportData.KRIs)
	}
}

func approvedRiskWithReviewedBundle(code string, title string, category string, cycle string, probability int, impact int, inherentScore int) *entity.Risk {
	return &entity.Risk{
		ID:              uuid.New(),
		VersionGroupID:  uuid.New(),
		Code:            code,
		Title:           title,
		Category:        category,
		Status:          entity.RiskStatusApproved,
		AssessmentCycle: cycle,
		Probability:     probability,
		Impact:          impact,
		InherentScore:   inherentScore,
	}
}

func approvedRiskWithPartialReviewedBundle(code string, title string, category string, cycle string, probability int, impact int, inherentScore int) *entity.Risk {
	return &entity.Risk{
		ID:              uuid.New(),
		VersionGroupID:  uuid.New(),
		Code:            code,
		Title:           title,
		Category:        category,
		Status:          entity.RiskStatusApproved,
		AssessmentCycle: cycle,
		Probability:     probability,
		Impact:          impact,
		InherentScore:   inherentScore,
	}
}

func nonFinalizedRiskWithReviewedDraft(code string, title string, category string, cycle string, status string, probability int, impact int, inherentScore int) *entity.Risk {
	return &entity.Risk{
		ID:              uuid.New(),
		VersionGroupID:  uuid.New(),
		Code:            code,
		Title:           title,
		Category:        category,
		Status:          status,
		AssessmentCycle: cycle,
		Probability:     probability,
		Impact:          impact,
		InherentScore:   inherentScore,
	}
}
