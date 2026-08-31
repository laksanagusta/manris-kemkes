package formalreport

import (
	"context"
	stdErrors "errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type fakeDownloadFormalReportRepo struct {
	reports map[uuid.UUID]*entity.FormalReport
}

func (f fakeDownloadFormalReportRepo) UpsertGenerated(ctx context.Context, report *entity.FormalReport) error {
	return nil
}

func (f fakeDownloadFormalReportRepo) GetByID(ctx context.Context, id uuid.UUID) (*entity.FormalReport, error) {
	if f.reports == nil {
		return nil, errors.ErrNotFound
	}
	report := f.reports[id]
	if report == nil {
		return nil, errors.ErrNotFound
	}
	return report, nil
}

func (f fakeDownloadFormalReportRepo) List(ctx context.Context, filter repository.FormalReportListFilter) ([]*entity.FormalReport, int, error) {
	return nil, 0, nil
}

type fakeDownloadOrgRepo struct {
	org *entity.Organization
}

func (f fakeDownloadOrgRepo) Create(ctx context.Context, org *entity.Organization) error { return nil }
func (f fakeDownloadOrgRepo) GetByID(ctx context.Context, id uuid.UUID) (*entity.Organization, error) {
	if f.org == nil || f.org.ID != id {
		return nil, errors.ErrNotFound
	}
	return f.org, nil
}
func (f fakeDownloadOrgRepo) Update(ctx context.Context, org *entity.Organization) error { return nil }
func (f fakeDownloadOrgRepo) Delete(ctx context.Context, id uuid.UUID) error             { return nil }
func (f fakeDownloadOrgRepo) List(ctx context.Context) ([]*entity.Organization, error) {
	return nil, nil
}
func (f fakeDownloadOrgRepo) ListWithFilter(ctx context.Context, filter repository.OrganizationListFilter) ([]*entity.Organization, int, error) {
	return nil, 0, nil
}
func (f fakeDownloadOrgRepo) GetContext(ctx context.Context, orgID uuid.UUID) (string, error) {
	return "", nil
}
func (f fakeDownloadOrgRepo) GetDescendants(ctx context.Context, orgID uuid.UUID) ([]uuid.UUID, error) {
	return []uuid.UUID{orgID}, nil
}

type fakeAnnualRiskRepo struct {
	risks []*entity.Risk
}

func (f fakeAnnualRiskRepo) ListCycleSnapshot(ctx context.Context, cycle string, orgIDs []uuid.UUID) ([]*entity.Risk, error) {
	return f.risks, nil
}

type capturingFormalRenderer struct {
	data *entity.KMKFormalReportData
}

func (r *capturingFormalRenderer) RenderFormal(ctx context.Context, data *entity.KMKFormalReportData) ([]byte, error) {
	r.data = data
	return []byte("%PDF-1.4 fake formal report"), nil
}

func TestDownloadUseCase_Execute(t *testing.T) {
	orgID := uuid.MustParse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
	reportID := uuid.MustParse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
	generatedAt := time.Date(2026, 5, 3, 9, 15, 0, 0, time.UTC)

	report := &entity.FormalReport{
		ID:             reportID,
		OrganizationID: orgID,
		Period:         "2025-H2",
		ReportType:     entity.FormalReportTypeMonitoringEvaluation,
		Status:         entity.FormalReportStatusGenerated,
		GeneratedAt:    &generatedAt,
		CreatedAt:      generatedAt.Add(-time.Hour),
		Metadata: map[string]any{
			"summary": map[string]any{
				"riskCount":     12,
				"incidentCount": 3,
				"tmpmrScore":    4.2,
			},
		},
	}

	renderer := &capturingFormalRenderer{}
	uc := NewDownloadUseCase(
		fakeDownloadFormalReportRepo{reports: map[uuid.UUID]*entity.FormalReport{reportID: report}},
		fakeDownloadOrgRepo{org: &entity.Organization{ID: orgID, Name: "Direktorat Contoh"}},
		fakeAnnualRiskRepo{},
		fakeTMPMRRepo{},
		renderer,
	)

	output, err := uc.Execute(context.Background(), DownloadInput{
		ID:    reportID,
		Scope: &entity.AccessScope{IsGlobal: true},
	})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}

	if output.Filename != "formal-report-monitoring_evaluation_report-2025-H2.pdf" {
		t.Fatalf("Filename = %q, want %q", output.Filename, "formal-report-monitoring_evaluation_report-2025-H2.pdf")
	}
	if string(output.Bytes) != "%PDF-1.4 fake formal report" {
		t.Fatalf("unexpected PDF bytes: %q", string(output.Bytes))
	}
	if renderer.data == nil || renderer.data.MonitoringEvaluationReport == nil {
		t.Fatal("renderer did not receive monitoring evaluation data")
	}
	if renderer.data.Organization == nil || renderer.data.Organization.Name != "Direktorat Contoh" {
		t.Fatalf("Organization = %#v, want Direktorat Contoh", renderer.data.Organization)
	}
	if !renderer.data.GeneratedAt.Equal(generatedAt) {
		t.Fatalf("GeneratedAt = %v, want %v", renderer.data.GeneratedAt, generatedAt)
	}
}

func TestDownloadUseCase_RejectsLegacyReportType(t *testing.T) {
	orgID := uuid.MustParse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
	reportID := uuid.MustParse("cccccccc-cccc-cccc-cccc-cccccccccccc")

	report := &entity.FormalReport{
		ID:             reportID,
		OrganizationID: orgID,
		Period:         "2025-H2",
		ReportType:     "tmpmr_report",
		Status:         entity.FormalReportStatusGenerated,
	}

	renderer := &capturingFormalRenderer{}
	uc := NewDownloadUseCase(
		fakeDownloadFormalReportRepo{reports: map[uuid.UUID]*entity.FormalReport{reportID: report}},
		fakeDownloadOrgRepo{org: &entity.Organization{ID: orgID, Name: "Direktorat Contoh"}},
		fakeAnnualRiskRepo{},
		fakeTMPMRRepo{},
		renderer,
	)

	_, err := uc.Execute(context.Background(), DownloadInput{
		ID:    reportID,
		Scope: &entity.AccessScope{IsGlobal: true},
	})
	if !stdErrors.Is(err, errors.ErrNotFound) {
		t.Fatalf("expected not found for legacy report type, got %v", err)
	}
}
