package formalreport

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type fakeFormalReportRepo struct {
	last *entity.FormalReport
}

func (f *fakeFormalReportRepo) UpsertGenerated(ctx context.Context, report *entity.FormalReport) error {
	if report.ID == uuid.Nil {
		report.ID = uuid.New()
	}
	now := time.Now().UTC()
	report.CreatedAt = now
	report.UpdatedAt = now
	f.last = report
	return nil
}

func (f *fakeFormalReportRepo) GetByID(ctx context.Context, id uuid.UUID) (*entity.FormalReport, error) {
	return f.last, nil
}

func (f *fakeFormalReportRepo) List(ctx context.Context, filter repository.FormalReportListFilter) ([]*entity.FormalReport, int, error) {
	if f.last == nil {
		return []*entity.FormalReport{}, 0, nil
	}
	return []*entity.FormalReport{f.last}, 1, nil
}

type fakeRiskRepo struct{}

func (f fakeRiskRepo) ListApprovedRisks(ctx context.Context, orgIDs []uuid.UUID, query string) ([]*entity.Risk, error) {
	return []*entity.Risk{{}}, nil
}

type fakeIncidentRepo struct{}

func (f fakeIncidentRepo) List(ctx context.Context, orgIDs []uuid.UUID) ([]*entity.Incident, error) {
	return []*entity.Incident{{}, {}}, nil
}

type fakeKRIRepo struct{}

func (f fakeKRIRepo) List(ctx context.Context, orgIDs []uuid.UUID, includeArchived bool) ([]*entity.KRI, error) {
	return []*entity.KRI{{}}, nil
}

type fakeTMPMRRepo struct{}

func (f fakeTMPMRRepo) Create(ctx context.Context, assessment *entity.TMPMRAssessment) error {
	return nil
}
func (f fakeTMPMRRepo) GetByID(ctx context.Context, id uuid.UUID) (*entity.TMPMRAssessment, error) {
	return nil, nil
}
func (f fakeTMPMRRepo) Update(ctx context.Context, assessment *entity.TMPMRAssessment) error {
	return nil
}
func (f fakeTMPMRRepo) List(ctx context.Context, filter repository.TMPMRListFilter) ([]*entity.TMPMRAssessment, int, error) {
	return []*entity.TMPMRAssessment{{Score: 3.75, MaturityLevel: "Terkelola"}}, 1, nil
}
func (f fakeTMPMRRepo) ExistsByOrgPeriod(ctx context.Context, organizationID uuid.UUID, period string, excludeID *uuid.UUID) (bool, error) {
	return false, nil
}

func TestGenerateFormalReportUseCase(t *testing.T) {
	orgID := uuid.MustParse("33333333-3333-3333-3333-333333333333")
	userID := uuid.MustParse("44444444-4444-4444-4444-444444444444")
	scope := &entity.AccessScope{
		OrganizationID:   &orgID,
		AccessibleOrgIDs: []uuid.UUID{orgID},
	}

	uc := &GenerateFormalReportUseCase{
		reportRepo:   &fakeFormalReportRepo{},
		riskRepo:     fakeRiskRepo{},
		incidentRepo: fakeIncidentRepo{},
		kriRepo:      fakeKRIRepo{},
		tmpmrRepo:    fakeTMPMRRepo{},
	}

	report, err := uc.Execute(context.Background(), GenerateFormalReportInput{
		OrganizationID: orgID,
		Period:         "2026-H1",
		ReportType:     entity.FormalReportTypeTMPMR,
		GeneratedBy:    &userID,
		Scope:          scope,
	})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}

	if report.ID == uuid.Nil {
		t.Fatal("expected generated report ID")
	}
	if report.Status != entity.FormalReportStatusGenerated {
		t.Fatalf("report status = %q, want %q", report.Status, entity.FormalReportStatusGenerated)
	}
	if report.GeneratedFileURL != "/api/v1/formal-reports/"+report.ID.String()+"/download" {
		t.Fatalf("unexpected generated file url: %s", report.GeneratedFileURL)
	}
	if report.Metadata["reportType"] != entity.FormalReportTypeTMPMR {
		t.Fatalf("metadata reportType = %v, want %v", report.Metadata["reportType"], entity.FormalReportTypeTMPMR)
	}

	summary, ok := report.Metadata["summary"].(map[string]any)
	if !ok {
		t.Fatalf("summary metadata has unexpected type %T", report.Metadata["summary"])
	}
	if summary["riskCount"].(int) != 1 {
		t.Fatalf("riskCount = %v, want 1", summary["riskCount"])
	}
	if summary["incidentCount"].(int) != 2 {
		t.Fatalf("incidentCount = %v, want 2", summary["incidentCount"])
	}
	if summary["kriCount"].(int) != 1 {
		t.Fatalf("kriCount = %v, want 1", summary["kriCount"])
	}
	if summary["tmpmrCount"].(int) != 1 {
		t.Fatalf("tmpmrCount = %v, want 1", summary["tmpmrCount"])
	}
}

func TestGenerateFormalReportUseCase_StoresTypeAwareSummaryMetadata(t *testing.T) {
	orgID := uuid.MustParse("33333333-3333-3333-3333-333333333333")
	scope := &entity.AccessScope{
		OrganizationID:   &orgID,
		AccessibleOrgIDs: []uuid.UUID{orgID},
	}

	uc := &GenerateFormalReportUseCase{
		reportRepo:   &fakeFormalReportRepo{},
		riskRepo:     fakeRiskRepo{},
		incidentRepo: fakeIncidentRepo{},
		kriRepo:      fakeKRIRepo{},
		tmpmrRepo:    fakeTMPMRRepo{},
	}

	tests := []struct {
		name         string
		reportType   string
		wantHeadline string
		wantFocus    string
	}{
		{
			name:         "annual risk profile",
			reportType:   entity.FormalReportTypeAnnualRiskProfile,
			wantHeadline: "Profil risiko tahunan",
			wantFocus:    entity.FormalReportTypeAnnualRiskProfile,
		},
		{
			name:         "tmpmr report",
			reportType:   entity.FormalReportTypeTMPMR,
			wantHeadline: "Laporan TMPMR",
			wantFocus:    entity.FormalReportTypeTMPMR,
		},
		{
			name:         "monitoring evaluation report",
			reportType:   entity.FormalReportTypeMonitoringEvaluation,
			wantHeadline: "Laporan hasil pemantauan dan evaluasi manajemen risiko",
			wantFocus:    entity.FormalReportTypeMonitoringEvaluation,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			report, err := uc.Execute(context.Background(), GenerateFormalReportInput{
				OrganizationID: orgID,
				Period:         "2026-H1",
				ReportType:     tt.reportType,
				Scope:          scope,
			})
			if err != nil {
				t.Fatalf("Execute() error = %v", err)
			}

			summary, ok := report.Metadata["summary"].(map[string]any)
			if !ok {
				t.Fatalf("summary metadata has unexpected type %T", report.Metadata["summary"])
			}
			headline, _ := summary["headline"].(string)
			if headline != tt.wantHeadline {
				t.Fatalf("summary headline = %q, want %q", headline, tt.wantHeadline)
			}
			focus, _ := summary["focus"].(string)
			if focus != tt.wantFocus {
				t.Fatalf("summary focus = %q, want %q", focus, tt.wantFocus)
			}
		})
	}
}

func TestGenerateFormalReportRejectsInvalidType(t *testing.T) {
	orgID := uuid.New()
	scope := &entity.AccessScope{
		OrganizationID:   &orgID,
		AccessibleOrgIDs: []uuid.UUID{orgID},
	}

	uc := &GenerateFormalReportUseCase{
		reportRepo:   &fakeFormalReportRepo{},
		riskRepo:     fakeRiskRepo{},
		incidentRepo: fakeIncidentRepo{},
		kriRepo:      fakeKRIRepo{},
		tmpmrRepo:    fakeTMPMRRepo{},
	}

	_, err := uc.Execute(context.Background(), GenerateFormalReportInput{
		OrganizationID: orgID,
		Period:         "2026-H1",
		ReportType:     "bad",
		Scope:          scope,
	})
	if err == nil {
		t.Fatal("expected error for invalid report type")
	}
}
