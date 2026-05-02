package formalreport

import (
	"bytes"
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/service/pdfreport"
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
		Period:         "2025",
		ReportType:     entity.FormalReportTypeTMPMR,
		Status:         entity.FormalReportStatusGenerated,
		GeneratedAt:    &generatedAt,
		CreatedAt:      generatedAt.Add(-time.Hour),
		Metadata: map[string]any{
			"summary": map[string]any{
				"riskCount":     12,
				"incidentCount": 3,
				"kriCount":      5,
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

	if output.Filename != "formal-report-tmpmr_report-2025.pdf" {
		t.Fatalf("Filename = %q, want %q", output.Filename, "formal-report-tmpmr_report-2025.pdf")
	}
	if string(output.Bytes) != "%PDF-1.4 fake formal report" {
		t.Fatalf("unexpected PDF bytes: %q", string(output.Bytes))
	}
	if renderer.data == nil {
		t.Fatal("renderer did not receive data")
	}
	if renderer.data.Organization == nil || renderer.data.Organization.Name != "Direktorat Contoh" {
		t.Fatalf("Organization = %#v, want Direktorat Contoh", renderer.data.Organization)
	}
	if !renderer.data.GeneratedAt.Equal(generatedAt) {
		t.Fatalf("GeneratedAt = %v, want %v", renderer.data.GeneratedAt, generatedAt)
	}
	if renderer.data.TMPMR == nil {
		t.Fatal("expected TMPMR data to be attached")
	}
}

func TestDownloadUseCase_ExecuteUsesDistinctFormalTemplatesPerType(t *testing.T) {
	orgID := uuid.MustParse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
	annualID := uuid.MustParse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
	tmpmrID := uuid.MustParse("cccccccc-cccc-cccc-cccc-cccccccccccc")
	implID := uuid.MustParse("dddddddd-dddd-dddd-dddd-dddddddddddd")
	supervID := uuid.MustParse("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee")
	generatedAt := time.Date(2026, 5, 3, 9, 15, 0, 0, time.UTC)

	reports := map[uuid.UUID]*entity.FormalReport{
		annualID: &entity.FormalReport{
			ID:             annualID,
			OrganizationID: orgID,
			Period:         "2025",
			ReportType:     entity.FormalReportTypeAnnualRiskProfile,
			Status:         entity.FormalReportStatusGenerated,
			GeneratedAt:    &generatedAt,
			Metadata: map[string]any{
				"summary": map[string]any{
					"riskCount": 1,
				},
			},
		},
		tmpmrID: &entity.FormalReport{
			ID:             tmpmrID,
			OrganizationID: orgID,
			Period:         "2025",
			ReportType:     entity.FormalReportTypeTMPMR,
			Status:         entity.FormalReportStatusGenerated,
			GeneratedAt:    &generatedAt,
			Metadata: map[string]any{
				"summary": map[string]any{
					"riskCount": 1,
				},
			},
		},
		implID: &entity.FormalReport{
			ID:             implID,
			OrganizationID: orgID,
			Period:         "2025",
			ReportType:     entity.FormalReportTypeSemiannualImplementation,
			Status:         entity.FormalReportStatusGenerated,
			GeneratedAt:    &generatedAt,
			Metadata: map[string]any{
				"summary": map[string]any{
					"riskCount": 1,
				},
			},
		},
		supervID: &entity.FormalReport{
			ID:             supervID,
			OrganizationID: orgID,
			Period:         "2025",
			ReportType:     entity.FormalReportTypeSemiannualSupervision,
			Status:         entity.FormalReportStatusGenerated,
			GeneratedAt:    &generatedAt,
			Metadata: map[string]any{
				"summary": map[string]any{
					"riskCount": 1,
				},
			},
		},
	}

	renderer, ok := pdfreport.NewPDFReportRenderer().(interface {
		RenderFormal(context.Context, *entity.KMKFormalReportData) ([]byte, error)
	})
	if !ok {
		t.Fatal("renderer does not expose RenderFormal")
	}

	uc := NewDownloadUseCase(
		fakeDownloadFormalReportRepo{reports: reports},
		fakeDownloadOrgRepo{org: &entity.Organization{ID: orgID, Name: "Direktorat Contoh"}},
		fakeAnnualRiskRepo{risks: []*entity.Risk{
			{Code: "R-1", Title: "Latensi API", Probability: 5, Impact: 4, Weight: 1, Nilai: 20},
			{Code: "R-2", Title: "Kontrol Akses", Probability: 4, Impact: 4, Weight: 1, Nilai: 16},
		}},
		fakeTMPMRRepo{},
		renderer,
	)

	tests := []struct {
		name           string
		id             uuid.UUID
		wantContain    []string
		wantNotContain []string
	}{
		{
			name: "annual risk profile",
			id:   annualID,
			wantContain: []string{
				"Ringkasan Profil Risiko Tahunan",
				"Top Risiko Prioritas Tahunan",
				"Lampiran Heatmap Tahunan",
			},
			wantNotContain: []string{
				"TMPMR / Tingkat Kematangan Manajemen Risiko",
				"Ringkasan Skor TMPMR",
			},
		},
		{
			name: "tmpmr report",
			id:   tmpmrID,
			wantContain: []string{
				"Ringkasan Skor TMPMR",
				"Dimensi TMPMR",
				"Prioritas Perbaikan TMPMR",
			},
			wantNotContain: []string{
				"Ringkasan Profil Risiko Tahunan",
				"Top Risiko Prioritas Tahunan",
			},
		},
		{
			name: "semiannual implementation",
			id:   implID,
			wantContain: []string{
				"Tahapan Proses Penerapan MR",
				"Matriks Evidence per Tahapan",
				"Progres Penanganan Risiko",
				"Ringkasan Gap Implementasi",
			},
			wantNotContain: []string{
				"Ringkasan Profil Risiko Tahunan",
				"Top Risiko Prioritas Tahunan",
				"TMPMR / Tingkat Kematangan Manajemen Risiko",
			},
		},
		{
			name: "semiannual supervision",
			id:   supervID,
			wantContain: []string{
				"Ringkasan Eksekutif Pengawasan",
				"Daftar Temuan Pengawasan",
				"Saran Perbaikan",
				"Status Tindak Lanjut",
			},
			wantNotContain: []string{
				"Ringkasan Profil Risiko Tahunan",
				"Top Risiko Prioritas Tahunan",
				"TMPMR / Tingkat Kematangan Manajemen Risiko",
				"Tahapan Proses Penerapan MR",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			output, err := uc.Execute(context.Background(), DownloadInput{
				ID:    tt.id,
				Scope: &entity.AccessScope{IsGlobal: true},
			})
			if err != nil {
				t.Fatalf("Execute() error = %v", err)
			}
			for _, want := range tt.wantContain {
				if !bytes.Contains(output.Bytes, []byte(want)) {
					t.Fatalf("download output missing %q", want)
				}
			}
			for _, unwanted := range tt.wantNotContain {
				if bytes.Contains(output.Bytes, []byte(unwanted)) {
					t.Fatalf("download output unexpectedly contained %q", unwanted)
				}
			}
		})
	}
}

func TestDownloadUseCase_ExecutePopulatesTypeSpecificPayloads(t *testing.T) {
	orgID := uuid.MustParse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
	annualID := uuid.MustParse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
	tmpmrID := uuid.MustParse("cccccccc-cccc-cccc-cccc-cccccccccccc")
	implID := uuid.MustParse("dddddddd-dddd-dddd-dddd-dddddddddddd")
	generatedAt := time.Date(2026, 5, 3, 9, 15, 0, 0, time.UTC)

	reports := map[uuid.UUID]*entity.FormalReport{
		annualID: &entity.FormalReport{
			ID:             annualID,
			OrganizationID: orgID,
			Period:         "2025",
			ReportType:     entity.FormalReportTypeAnnualRiskProfile,
			Status:         entity.FormalReportStatusGenerated,
			GeneratedAt:    &generatedAt,
			Metadata: map[string]any{
				"summary": map[string]any{"riskCount": 1},
			},
		},
		tmpmrID: &entity.FormalReport{
			ID:             tmpmrID,
			OrganizationID: orgID,
			Period:         "2025",
			ReportType:     entity.FormalReportTypeTMPMR,
			Status:         entity.FormalReportStatusGenerated,
			GeneratedAt:    &generatedAt,
			Metadata: map[string]any{
				"summary": map[string]any{"riskCount": 1},
			},
		},
		implID: &entity.FormalReport{
			ID:             implID,
			OrganizationID: orgID,
			Period:         "2025",
			ReportType:     entity.FormalReportTypeSemiannualImplementation,
			Status:         entity.FormalReportStatusGenerated,
			GeneratedAt:    &generatedAt,
			Metadata: map[string]any{
				"summary": map[string]any{"riskCount": 1},
			},
		},
	}

	testRisks := []*entity.Risk{
		{Code: "R-10", Title: "Ketergantungan Vendor", Probability: 5, Impact: 4, Weight: 1, Nilai: 20, TreatmentOption: "Mitigasi vendor"},
	}

	renderer := &capturingFormalRenderer{}
	uc := NewDownloadUseCase(
		fakeDownloadFormalReportRepo{reports: reports},
		fakeDownloadOrgRepo{org: &entity.Organization{ID: orgID, Name: "Direktorat Contoh"}},
		fakeAnnualRiskRepo{risks: testRisks},
		fakeTMPMRRepo{},
		renderer,
	)

	// Annual profile
	_, err := uc.Execute(context.Background(), DownloadInput{
		ID:    annualID,
		Scope: &entity.AccessScope{IsGlobal: true},
	})
	if err != nil {
		t.Fatalf("Execute(annual) error = %v", err)
	}
	if renderer.data == nil || renderer.data.AnnualProfile == nil {
		t.Fatal("expected annual payload to be populated")
	}
	if renderer.data.ImplementationReport != nil || renderer.data.SupervisionReport != nil || renderer.data.TMPMRReport != nil {
		t.Fatalf("annual payload populated unexpected type-specific fields: %#v", renderer.data)
	}
	if len(renderer.data.AnnualProfile.Risks) == 0 || len(renderer.data.AnnualProfile.TopRisks) == 0 {
		t.Fatalf("annual payload missing risk content: %#v", renderer.data.AnnualProfile)
	}
	if renderer.data.AnnualProfile.Heatmap == [5][5]int{} {
		t.Fatalf("annual payload missing heatmap: %#v", renderer.data.AnnualProfile)
	}

	// TMPMR report
	renderer.data = nil
	_, err = uc.Execute(context.Background(), DownloadInput{
		ID:    tmpmrID,
		Scope: &entity.AccessScope{IsGlobal: true},
	})
	if err != nil {
		t.Fatalf("Execute(tmpmr) error = %v", err)
	}
	if renderer.data == nil || renderer.data.TMPMRReport == nil {
		t.Fatal("expected tmpmr payload to be populated")
	}
	if renderer.data.AnnualProfile != nil || renderer.data.ImplementationReport != nil || renderer.data.SupervisionReport != nil {
		t.Fatalf("tmpmr payload populated unexpected type-specific fields: %#v", renderer.data)
	}

	// Implementation report
	renderer.data = nil
	_, err = uc.Execute(context.Background(), DownloadInput{
		ID:    implID,
		Scope: &entity.AccessScope{IsGlobal: true},
	})
	if err != nil {
		t.Fatalf("Execute(implementation) error = %v", err)
	}
	if renderer.data == nil || renderer.data.ImplementationReport == nil {
		t.Fatal("expected implementation payload to be populated")
	}
	if renderer.data.AnnualProfile != nil || renderer.data.SupervisionReport != nil || renderer.data.TMPMRReport != nil {
		t.Fatalf("implementation payload populated unexpected type-specific fields: %#v", renderer.data)
	}
	// Verify implementation report has KMK process-stage section statuses
	if len(renderer.data.ImplementationReport.SectionStatus) == 0 {
		t.Fatal("expected implementation report to have KMK section statuses populated")
	}
	hasContextCriteria := false
	hasRiskIdentification := false
	hasRiskTreatment := false
	for _, section := range renderer.data.ImplementationReport.SectionStatus {
		switch section.Key {
		case "context_criteria":
			hasContextCriteria = true
		case "risk_identification":
			hasRiskIdentification = true
		case "risk_treatment":
			hasRiskTreatment = true
		}
	}
	if !hasContextCriteria || !hasRiskIdentification || !hasRiskTreatment {
		t.Fatalf("implementation report missing expected KMK section keys: context=%v, riskId=%v, riskTreatment=%v", hasContextCriteria, hasRiskIdentification, hasRiskTreatment)
	}
}
