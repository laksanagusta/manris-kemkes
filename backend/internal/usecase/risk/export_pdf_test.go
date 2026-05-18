package risk

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

type stubRiskDetailGetter struct {
	risk *entity.Risk
	err  error
}

func (s *stubRiskDetailGetter) GetByID(context.Context, uuid.UUID, []uuid.UUID) (*entity.Risk, error) {
	if s.err != nil {
		return nil, s.err
	}
	if s.risk == nil {
		return nil, errors.New("not found")
	}
	copy := *s.risk
	return &copy, nil
}

type stubRiskPDFRenderer struct {
	data      *entity.RiskDetailPDFData
	bytes     []byte
	renderErr error
}

func (s *stubRiskPDFRenderer) RenderRiskDetail(_ context.Context, data *entity.RiskDetailPDFData) ([]byte, error) {
	s.data = data
	if s.renderErr != nil {
		return nil, s.renderErr
	}
	if s.bytes != nil {
		return s.bytes, nil
	}
	return []byte("%PDF-1.4 fake risk export"), nil
}

func TestExportRiskPDFUseCase_Execute_Success(t *testing.T) {
	orgID := uuid.New()
	riskID := uuid.New()
	getter := &stubRiskDetailGetter{
		risk: &entity.Risk{
			ID:                   riskID,
			Code:                 "R-001",
			Title:                "Gangguan distribusi vaksin",
			Status:               entity.RiskStatusApproved,
			OrganizationID:       &orgID,
			OrgName:              "Direktorat Contoh",
			Category:             entity.RiskCategoryOperasional,
			RiskSource:           "internal",
			Controllability:      "C",
			AssessmentCycle:      "2025-H2",
			Description:          "Distribusi vaksin dapat tertunda ketika rantai pasok terganggu.",
			Cause:                []string{"Cuaca ekstrem"},
			ImpactDesc:           []string{"Pelayanan kesehatan tertunda"},
			ExistingControl:      "Jadwal distribusi terkoordinasi",
			ControlEffectiveness: "efektif",
			Probability:          4,
			Impact:               4,
			Weight:               1.2,
			Nilai:                19.2,
			InherentScore:        19,
			RiskPriority:         2,
			RiskAppetite:         "di_atas_batas",
			TreatmentOption:      "mitigate",
			ReviewSummary:        "Perlu penguatan pengawasan distribusi",
			TargetProbability:    2,
			TargetImpact:         3,
			TargetWeight:         1.0,
			TargetNilai:          6.0,
			Mitigations: []entity.Mitigation{
				{Action: "Koordinasi vendor", Owner: "Tim logistik"},
			},
			CreatedByName: "Petugas Contoh",
		},
	}
	renderer := &stubRiskPDFRenderer{bytes: []byte("%PDF-1.4 fake risk export")}

	uc := NewExportRiskPDFUseCase(getter, renderer)
	result, err := uc.Execute(context.Background(), ExportRiskPDFInput{
		ID:    riskID,
		Scope: &entity.AccessScope{IsGlobal: true},
	})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}
	if result == nil || string(result.Bytes) != "%PDF-1.4 fake risk export" {
		t.Fatalf("unexpected result = %#v", result)
	}
	if result.Filename != "lampiran-risiko-R-001.pdf" {
		t.Fatalf("Filename = %q, want %q", result.Filename, "lampiran-risiko-R-001.pdf")
	}
	if renderer.data == nil {
		t.Fatal("renderer did not receive data")
	}
	if renderer.data.Title != "Gangguan distribusi vaksin" {
		t.Fatalf("renderer title = %q", renderer.data.Title)
	}
	if renderer.data.RiskLevelLabel != "Tinggi" {
		t.Fatalf("risk level label = %q", renderer.data.RiskLevelLabel)
	}
	if renderer.data.IsRiskUtamaLabel != "Ya" {
		t.Fatalf("isRiskUtama label = %q", renderer.data.IsRiskUtamaLabel)
	}
}

func TestExportRiskPDFUseCase_Execute_RejectsNonFinalRisk(t *testing.T) {
	orgID := uuid.New()
	getter := &stubRiskDetailGetter{
		risk: &entity.Risk{
			ID:             uuid.New(),
			Status:         entity.RiskStatusDraft,
			OrganizationID: &orgID,
		},
	}
	uc := NewExportRiskPDFUseCase(getter, &stubRiskPDFRenderer{})

	_, err := uc.Execute(context.Background(), ExportRiskPDFInput{
		ID:    getter.risk.ID,
		Scope: &entity.AccessScope{IsGlobal: true},
	})
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !errors.Is(err, domainerrors.ErrInvalidStatus) {
		t.Fatalf("expected ErrInvalidStatus, got %v", err)
	}
}

func TestExportRiskPDFUseCase_Execute_RejectsMissingScopeOrgAccess(t *testing.T) {
	uc := NewExportRiskPDFUseCase(&stubRiskDetailGetter{}, &stubRiskPDFRenderer{})
	_, err := uc.Execute(context.Background(), ExportRiskPDFInput{
		ID:    uuid.New(),
		Scope: &entity.AccessScope{IsGlobal: false},
	})
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !errors.Is(err, domainerrors.ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
}
