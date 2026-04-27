package risk

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	repo "github.com/manris/backend/internal/domain/repository"
	"github.com/xuri/excelize/v2"
)

type fakeMonitoringPreviewOrgRepo struct {
	org *entity.Organization
}

func (r *fakeMonitoringPreviewOrgRepo) Create(context.Context, *entity.Organization) error {
	return nil
}
func (r *fakeMonitoringPreviewOrgRepo) GetByID(_ context.Context, id uuid.UUID) (*entity.Organization, error) {
	if r.org != nil && r.org.ID == id {
		return r.org, nil
	}
	return nil, nil
}
func (r *fakeMonitoringPreviewOrgRepo) Update(context.Context, *entity.Organization) error {
	return nil
}
func (r *fakeMonitoringPreviewOrgRepo) Delete(context.Context, uuid.UUID) error { return nil }
func (r *fakeMonitoringPreviewOrgRepo) List(context.Context) ([]*entity.Organization, error) {
	if r.org != nil {
		return []*entity.Organization{r.org}, nil
	}
	return nil, nil
}
func (r *fakeMonitoringPreviewOrgRepo) ListWithFilter(context.Context, repo.OrganizationListFilter) ([]*entity.Organization, int, error) {
	return nil, 0, nil
}
func (r *fakeMonitoringPreviewOrgRepo) GetDescendants(context.Context, uuid.UUID) ([]uuid.UUID, error) {
	return nil, nil
}
func (r *fakeMonitoringPreviewOrgRepo) GetContext(context.Context, uuid.UUID) (string, error) {
	return "", nil
}

var _ repo.OrganizationRepository = (*fakeMonitoringPreviewOrgRepo)(nil)

func makeMonitoringWorkbook(t *testing.T, rows [][]string) []byte {
	t.Helper()
	f := excelize.NewFile()
	index, err := f.NewSheet("Template Upload")
	if err != nil {
		t.Fatalf("new sheet: %v", err)
	}
	f.DeleteSheet("Sheet1")
	f.SetActiveSheet(index)
	for rowIndex, row := range rows {
		cell, err := excelize.CoordinatesToCellName(1, rowIndex+1)
		if err != nil {
			t.Fatalf("coordinates: %v", err)
		}
		if err := f.SetSheetRow("Template Upload", cell, &row); err != nil {
			t.Fatalf("set row: %v", err)
		}
	}
	buf, err := f.WriteToBuffer()
	if err != nil {
		t.Fatalf("buffer: %v", err)
	}
	return buf.Bytes()
}

func makeMonitoringUC(orgRepo repo.OrganizationRepository, userRepo repo.UserRepository, riskRepo repo.RiskRepository) *BulkMonitoringSpreadsheetUseCase {
	return NewBulkMonitoringSpreadsheetUseCase(orgRepo, userRepo, riskRepo)
}

func TestPreview_InvalidCycleFormat(t *testing.T) {
	orgID := uuid.New()
	uploaderID := uuid.New()
	uc := makeMonitoringUC(&fakeMonitoringPreviewOrgRepo{}, &fakeMonitoringUserRepo{}, &fakeMonitoringRiskRepo{})

	_, err := uc.Preview(context.Background(), BulkMonitoringSpreadsheetInput{
		Filename:       "test.xlsx",
		Content:        []byte{},
		UploaderID:     uploaderID,
		OrganizationID: orgID,
		Cycle:          "invalid",
	})
	if err == nil {
		t.Fatal("expected error for invalid cycle format")
	}
}

func TestPreview_PositionBasedParsing(t *testing.T) {
	orgID := uuid.New()
	uploaderID := uuid.New()
	risk1ID := uuid.New()
	vg1ID := uuid.New()

	risk1 := &entity.Risk{
		ID:                risk1ID,
		Code:              "R-001",
		Title:             "Risiko Test",
		Status:            entity.RiskStatusApproved,
		VersionGroupID:    vg1ID,
		IsCurrent:         true,
		OrganizationID:    &orgID,
		TargetProbability: 2,
		TargetImpact:      3,
		TargetWeight:      entity.GetBobot(2, 3),
		TargetNilai:       entity.CalculateNilai(2, 3, entity.GetBobot(2, 3)),
	}

	riskRepo := &fakeMonitoringRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{
			risk1ID: risk1,
		},
		versions: []*entity.Risk{
			{ID: risk1ID, VersionGroupID: vg1ID, Status: entity.RiskStatusApproved, AssessmentCycle: "2025-H2"},
		},
	}

	uc := makeMonitoringUC(&fakeMonitoringPreviewOrgRepo{org: &entity.Organization{ID: orgID, Name: "Test Org"}}, &fakeMonitoringUserRepo{}, riskRepo)

	rows := [][]string{
		{"NO", "IDENTIFIKASI RISIKO", "", "TARGET PENURUNAN RISIKO", "", "", "", "", "REALISASI", "", "", "", "", "SIMPULAN", "EFEKTIVITAS", "JADWAL PELAKSANAAN"},
		{"", "Kode Risiko", "Uraian Risiko", "P", "D", "Bobot", "Nilai", "Tingkat Risiko", "P", "D", "Bobot", "Nilai", "Tingkat Risiko", "Simpulan Tingkat Risiko", "Efektivitas", "Jadwal Pelaksanaan"},
		{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16"},
		{"1", "R-001", "Risiko Test", "2", "3", "", "", "", "3", "4", "", "", "", "", "", ""},
	}

	result, err := uc.Preview(context.Background(), BulkMonitoringSpreadsheetInput{
		Filename:       "test.xlsx",
		Content:        makeMonitoringWorkbook(t, rows),
		UploaderID:     uploaderID,
		OrganizationID: orgID,
		Cycle:          "2026-H1",
	})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}

	item := result.Items[0]
	if item.Code != "R-001" {
		t.Fatalf("expected code R-001, got %q", item.Code)
	}
	if item.RealisasiP != 3 {
		t.Fatalf("expected RealisasiP=3, got %d", item.RealisasiP)
	}
	if item.RealisasiD != 4 {
		t.Fatalf("expected RealisasiD=4, got %d", item.RealisasiD)
	}
	if item.TargetP != 2 {
		t.Fatalf("expected TargetP=2, got %d", item.TargetP)
	}
	if item.TargetD != 3 {
		t.Fatalf("expected TargetD=3, got %d", item.TargetD)
	}

	expectedBobot := entity.GetBobot(3, 4)
	if item.ComputedBobot != expectedBobot {
		t.Fatalf("expected ComputedBobot=%f, got %f", expectedBobot, item.ComputedBobot)
	}

	expectedNilai := entity.CalculateNilai(3, 4, expectedBobot)
	if item.ComputedNilai != expectedNilai {
		t.Fatalf("expected ComputedNilai=%f, got %f", expectedNilai, item.ComputedNilai)
	}

	if item.ComputedTingkat == "" {
		t.Fatal("expected ComputedTingkat to be set")
	}

	if item.Simpulan == "" {
		t.Fatal("expected Simpulan to be computed")
	}
	if item.Efektivitas == "" {
		t.Fatal("expected Efektivitas to be computed")
	}

	if len(item.Errors) != 0 {
		t.Fatalf("expected no errors, got %v", item.Errors)
	}
	if item.Payload == nil {
		t.Fatal("expected payload to be set for valid item")
	}
}

func TestPreview_CodeNotFound(t *testing.T) {
	orgID := uuid.New()
	uploaderID := uuid.New()

	riskRepo := &fakeMonitoringRiskRepo{
		risks:    map[uuid.UUID]*entity.Risk{},
		versions: []*entity.Risk{},
	}

	uc := makeMonitoringUC(&fakeMonitoringPreviewOrgRepo{org: &entity.Organization{ID: orgID, Name: "Test Org"}}, &fakeMonitoringUserRepo{}, riskRepo)

	rows := [][]string{
		{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16"},
		{"1", "R-999", "Unknown Risk", "2", "3", "", "", "", "3", "4", "", "", "", "", "", ""},
	}

	result, err := uc.Preview(context.Background(), BulkMonitoringSpreadsheetInput{
		Filename:       "test.xlsx",
		Content:        makeMonitoringWorkbook(t, rows),
		UploaderID:     uploaderID,
		OrganizationID: orgID,
		Cycle:          "2026-H1",
	})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}

	item := result.Items[0]
	if len(item.Errors) == 0 {
		t.Fatal("expected error for unknown code")
	}
	found := false
	for _, e := range item.Errors {
		if e == "Risiko dengan kode 'R-999' tidak ditemukan." {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected 'not found' error, got %v", item.Errors)
	}
	if item.Payload != nil {
		t.Fatal("expected nil payload for item with errors")
	}
}

func TestPreview_EmptyPAndD(t *testing.T) {
	orgID := uuid.New()
	uploaderID := uuid.New()
	risk1ID := uuid.New()
	vg1ID := uuid.New()

	risk1 := &entity.Risk{
		ID:                risk1ID,
		Code:              "R-001",
		Title:             "Test Risk",
		Status:            entity.RiskStatusApproved,
		VersionGroupID:    vg1ID,
		IsCurrent:         true,
		OrganizationID:    &orgID,
		TargetProbability: 2,
		TargetImpact:      3,
		TargetWeight:      entity.GetBobot(2, 3),
		TargetNilai:       entity.CalculateNilai(2, 3, entity.GetBobot(2, 3)),
	}

	riskRepo := &fakeMonitoringRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{risk1ID: risk1},
		versions: []*entity.Risk{
			{ID: risk1ID, VersionGroupID: vg1ID, Status: entity.RiskStatusApproved, AssessmentCycle: "2025-H2"},
		},
	}

	uc := makeMonitoringUC(&fakeMonitoringPreviewOrgRepo{org: &entity.Organization{ID: orgID, Name: "Test Org"}}, &fakeMonitoringUserRepo{}, riskRepo)

	rows := [][]string{
		{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16"},
		{"1", "R-001", "Test Risk", "2", "3", "", "", "", "", "", "", "", "", "", "", ""},
	}

	result, err := uc.Preview(context.Background(), BulkMonitoringSpreadsheetInput{
		Filename:       "test.xlsx",
		Content:        makeMonitoringWorkbook(t, rows),
		UploaderID:     uploaderID,
		OrganizationID: orgID,
		Cycle:          "2026-H1",
	})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}

	item := result.Items[0]
	hasPErr := false
	hasDErr := false
	for _, e := range item.Errors {
		if e == "Kolom Realisasi P wajib diisi." {
			hasPErr = true
		}
		if e == "Kolom Realisasi D wajib diisi." {
			hasDErr = true
		}
	}
	if !hasPErr {
		t.Fatalf("expected 'Realisasi P wajib diisi' error, got %v", item.Errors)
	}
	if !hasDErr {
		t.Fatalf("expected 'Realisasi D wajib diisi' error, got %v", item.Errors)
	}
}

func TestPreview_InvalidPAndD(t *testing.T) {
	orgID := uuid.New()
	uploaderID := uuid.New()
	risk1ID := uuid.New()
	vg1ID := uuid.New()

	risk1 := &entity.Risk{
		ID:                risk1ID,
		Code:              "R-001",
		Title:             "Test Risk",
		Status:            entity.RiskStatusApproved,
		VersionGroupID:    vg1ID,
		IsCurrent:         true,
		OrganizationID:    &orgID,
		TargetProbability: 2,
		TargetImpact:      3,
		TargetWeight:      entity.GetBobot(2, 3),
		TargetNilai:       entity.CalculateNilai(2, 3, entity.GetBobot(2, 3)),
	}

	riskRepo := &fakeMonitoringRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{risk1ID: risk1},
		versions: []*entity.Risk{
			{ID: risk1ID, VersionGroupID: vg1ID, Status: entity.RiskStatusApproved, AssessmentCycle: "2025-H2"},
		},
	}

	uc := makeMonitoringUC(&fakeMonitoringPreviewOrgRepo{org: &entity.Organization{ID: orgID, Name: "Test Org"}}, &fakeMonitoringUserRepo{}, riskRepo)

	rows := [][]string{
		{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16"},
		{"1", "R-001", "Test Risk", "2", "3", "", "", "", "6", "0", "", "", "", "", "", ""},
	}

	result, err := uc.Preview(context.Background(), BulkMonitoringSpreadsheetInput{
		Filename:       "test.xlsx",
		Content:        makeMonitoringWorkbook(t, rows),
		UploaderID:     uploaderID,
		OrganizationID: orgID,
		Cycle:          "2026-H1",
	})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}

	item := result.Items[0]
	hasPErr := false
	hasDErr := false
	for _, e := range item.Errors {
		if e == "Kolom Realisasi P harus angka 1-5." {
			hasPErr = true
		}
		if e == "Kolom Realisasi D harus angka 1-5." {
			hasDErr = true
		}
	}
	if !hasPErr {
		t.Fatalf("expected 'Realisasi P harus angka 1-5' error, got %v", item.Errors)
	}
	if !hasDErr {
		t.Fatalf("expected 'Realisasi D harus angka 1-5' error, got %v", item.Errors)
	}
}

func TestPreview_ExistingDraftWarning(t *testing.T) {
	orgID := uuid.New()
	uploaderID := uuid.New()
	risk1ID := uuid.New()
	vg1ID := uuid.New()

	risk1 := &entity.Risk{
		ID:                risk1ID,
		Code:              "R-001",
		Title:             "Test Risk",
		Status:            entity.RiskStatusApproved,
		VersionGroupID:    vg1ID,
		IsCurrent:         true,
		OrganizationID:    &orgID,
		TargetProbability: 2,
		TargetImpact:      3,
		TargetWeight:      entity.GetBobot(2, 3),
		TargetNilai:       entity.CalculateNilai(2, 3, entity.GetBobot(2, 3)),
	}

	existingDraftID := uuid.New()
	riskRepo := &fakeMonitoringRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{risk1ID: risk1},
		versions: []*entity.Risk{
			{ID: risk1ID, VersionGroupID: vg1ID, Status: entity.RiskStatusApproved, AssessmentCycle: "2025-H2"},
			{ID: existingDraftID, VersionGroupID: vg1ID, Status: entity.RiskStatusDraft, AssessmentCycle: "2026-H1"},
		},
	}

	uc := makeMonitoringUC(&fakeMonitoringPreviewOrgRepo{org: &entity.Organization{ID: orgID, Name: "Test Org"}}, &fakeMonitoringUserRepo{}, riskRepo)

	rows := [][]string{
		{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16"},
		{"1", "R-001", "Test Risk", "2", "3", "", "", "", "3", "4", "", "", "", "", "", ""},
	}

	result, err := uc.Preview(context.Background(), BulkMonitoringSpreadsheetInput{
		Filename:       "test.xlsx",
		Content:        makeMonitoringWorkbook(t, rows),
		UploaderID:     uploaderID,
		OrganizationID: orgID,
		Cycle:          "2026-H1",
	})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}

	item := result.Items[0]
	if len(item.Warnings) == 0 {
		t.Fatal("expected warning for existing draft")
	}
	found := false
	for _, w := range item.Warnings {
		if w == "Risiko 'R-001' sudah memiliki draf pemantauan untuk siklus 2026-H1." {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected existing draft warning, got %v", item.Warnings)
	}
}

func TestPreview_SimpulanAndEfektivitas(t *testing.T) {
	orgID := uuid.New()
	uploaderID := uuid.New()
	risk1ID := uuid.New()
	vg1ID := uuid.New()

	risk1 := &entity.Risk{
		ID:                risk1ID,
		Code:              "R-001",
		Title:             "Test Risk",
		Status:            entity.RiskStatusApproved,
		VersionGroupID:    vg1ID,
		IsCurrent:         true,
		OrganizationID:    &orgID,
		TargetProbability: 2,
		TargetImpact:      3,
		TargetWeight:      entity.GetBobot(2, 3),
		TargetNilai:       entity.CalculateNilai(2, 3, entity.GetBobot(2, 3)),
	}

	riskRepo := &fakeMonitoringRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{risk1ID: risk1},
		versions: []*entity.Risk{
			{ID: risk1ID, VersionGroupID: vg1ID, Status: entity.RiskStatusApproved, AssessmentCycle: "2025-H2"},
		},
	}

	uc := makeMonitoringUC(&fakeMonitoringPreviewOrgRepo{org: &entity.Organization{ID: orgID, Name: "Test Org"}}, &fakeMonitoringUserRepo{}, riskRepo)

	tests := []struct {
		name                string
		realisasiP          string
		realisasiD          string
		expectedSimpulan    string
		expectedEfektivitas string
	}{
		{name: "menurun_when_nilai_lower", realisasiP: "1", realisasiD: "2", expectedSimpulan: "Menurun", expectedEfektivitas: "Efektif"},
		{name: "meningkat_when_nilai_higher", realisasiP: "5", realisasiD: "5", expectedSimpulan: "Meningkat", expectedEfektivitas: "Tidak Efektif"},
		{name: "tetap_when_nilai_equal", realisasiP: "2", realisasiD: "3", expectedSimpulan: "Tetap", expectedEfektivitas: "Efektif"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rows := [][]string{
				{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16"},
				{"1", "R-001", "Test Risk", "2", "3", "", "", "", tt.realisasiP, tt.realisasiD, "", "", "", "", "", ""},
			}

			result, err := uc.Preview(context.Background(), BulkMonitoringSpreadsheetInput{
				Filename:       "test.xlsx",
				Content:        makeMonitoringWorkbook(t, rows),
				UploaderID:     uploaderID,
				OrganizationID: orgID,
				Cycle:          "2026-H1",
			})
			if err != nil {
				t.Fatalf("preview err: %v", err)
			}
			if len(result.Items) != 1 {
				t.Fatalf("expected 1 item, got %d", len(result.Items))
			}

			item := result.Items[0]
			if item.Simpulan != tt.expectedSimpulan {
				t.Fatalf("expected Simpulan=%q, got %q", tt.expectedSimpulan, item.Simpulan)
			}
			if item.Efektivitas != tt.expectedEfektivitas {
				t.Fatalf("expected Efektivitas=%q, got %q", tt.expectedEfektivitas, item.Efektivitas)
			}
		})
	}
}

func TestPreview_EmptyCodeError(t *testing.T) {
	orgID := uuid.New()
	uploaderID := uuid.New()

	riskRepo := &fakeMonitoringRiskRepo{
		risks:    map[uuid.UUID]*entity.Risk{},
		versions: []*entity.Risk{},
	}

	uc := makeMonitoringUC(&fakeMonitoringPreviewOrgRepo{org: &entity.Organization{ID: orgID, Name: "Test Org"}}, &fakeMonitoringUserRepo{}, riskRepo)

	rows := [][]string{
		{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16"},
		{"1", "", "No Code Risk", "2", "3", "", "", "", "3", "4", "", "", "", "", "", ""},
	}

	result, err := uc.Preview(context.Background(), BulkMonitoringSpreadsheetInput{
		Filename:       "test.xlsx",
		Content:        makeMonitoringWorkbook(t, rows),
		UploaderID:     uploaderID,
		OrganizationID: orgID,
		Cycle:          "2026-H1",
	})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}

	item := result.Items[0]
	found := false
	for _, e := range item.Errors {
		if e == "Kolom Kode Risiko wajib diisi." {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected 'Kode Risiko wajib diisi' error, got %v", item.Errors)
	}
}

func TestPreview_TargetValuesComputedWhenMissing(t *testing.T) {
	orgID := uuid.New()
	uploaderID := uuid.New()
	risk1ID := uuid.New()
	vg1ID := uuid.New()

	risk1 := &entity.Risk{
		ID:                risk1ID,
		Code:              "R-001",
		Title:             "Risk Without Target Nilai",
		Status:            entity.RiskStatusApproved,
		VersionGroupID:    vg1ID,
		IsCurrent:         true,
		OrganizationID:    &orgID,
		TargetProbability: 3,
		TargetImpact:      4,
		TargetWeight:      0,
		TargetNilai:       0,
	}

	riskRepo := &fakeMonitoringRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{risk1ID: risk1},
		versions: []*entity.Risk{
			{ID: risk1ID, VersionGroupID: vg1ID, Status: entity.RiskStatusApproved, AssessmentCycle: "2025-H2"},
		},
	}

	uc := makeMonitoringUC(&fakeMonitoringPreviewOrgRepo{org: &entity.Organization{ID: orgID, Name: "Test Org"}}, &fakeMonitoringUserRepo{}, riskRepo)

	rows := [][]string{
		{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16"},
		{"1", "R-001", "Risk Without Target Nilai", "3", "4", "", "", "", "2", "3", "", "", "", "", "", ""},
	}

	result, err := uc.Preview(context.Background(), BulkMonitoringSpreadsheetInput{
		Filename:       "test.xlsx",
		Content:        makeMonitoringWorkbook(t, rows),
		UploaderID:     uploaderID,
		OrganizationID: orgID,
		Cycle:          "2026-H1",
	})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}

	item := result.Items[0]
	if item.TargetBobot == 0 {
		t.Fatal("expected TargetBobot to be computed from P and D")
	}
	if item.TargetNilai == 0 {
		t.Fatal("expected TargetNilai to be computed from P, D, and Bobot")
	}
	if item.TargetTingkat == "" {
		t.Fatal("expected TargetTingkat to be computed")
	}
}

func TestPreview_CsvParsing(t *testing.T) {
	orgID := uuid.New()
	uploaderID := uuid.New()
	risk1ID := uuid.New()
	vg1ID := uuid.New()

	risk1 := &entity.Risk{
		ID:                risk1ID,
		Code:              "R-001",
		Title:             "CSV Risk",
		Status:            entity.RiskStatusApproved,
		VersionGroupID:    vg1ID,
		IsCurrent:         true,
		OrganizationID:    &orgID,
		TargetProbability: 2,
		TargetImpact:      3,
		TargetWeight:      entity.GetBobot(2, 3),
		TargetNilai:       entity.CalculateNilai(2, 3, entity.GetBobot(2, 3)),
	}

	riskRepo := &fakeMonitoringRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{risk1ID: risk1},
		versions: []*entity.Risk{
			{ID: risk1ID, VersionGroupID: vg1ID, Status: entity.RiskStatusApproved, AssessmentCycle: "2025-H2"},
		},
	}

	uc := makeMonitoringUC(&fakeMonitoringPreviewOrgRepo{org: &entity.Organization{ID: orgID, Name: "Test Org"}}, &fakeMonitoringUserRepo{}, riskRepo)

	csvContent := []byte("KODE RISIKO,URAIAN RISIKO,TARGET P,TARGET D,REALISASI P,REALISASI D\nR-001,CSV Risk,2,3,3,4\n")
	result, err := uc.Preview(context.Background(), BulkMonitoringSpreadsheetInput{
		Filename:       "test.csv",
		Content:        csvContent,
		UploaderID:     uploaderID,
		OrganizationID: orgID,
		Cycle:          "2026-H1",
	})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}
	if result.Items[0].Code != "R-001" {
		t.Fatalf("expected code R-001, got %q", result.Items[0].Code)
	}
	if result.Items[0].RealisasiP != 3 {
		t.Fatalf("expected RealisasiP=3, got %d", result.Items[0].RealisasiP)
	}
}

func TestPreview_MultipleRows(t *testing.T) {
	orgID := uuid.New()
	uploaderID := uuid.New()
	risk1ID := uuid.New()
	risk2ID := uuid.New()
	vg1ID := uuid.New()
	vg2ID := uuid.New()

	risk1 := &entity.Risk{
		ID:                risk1ID,
		Code:              "R-001",
		Title:             "Risk One",
		Status:            entity.RiskStatusApproved,
		VersionGroupID:    vg1ID,
		IsCurrent:         true,
		OrganizationID:    &orgID,
		TargetProbability: 2,
		TargetImpact:      3,
		TargetWeight:      entity.GetBobot(2, 3),
		TargetNilai:       entity.CalculateNilai(2, 3, entity.GetBobot(2, 3)),
	}
	risk2 := &entity.Risk{
		ID:                risk2ID,
		Code:              "R-002",
		Title:             "Risk Two",
		Status:            entity.RiskStatusApproved,
		VersionGroupID:    vg2ID,
		IsCurrent:         true,
		OrganizationID:    &orgID,
		TargetProbability: 4,
		TargetImpact:      4,
		TargetWeight:      entity.GetBobot(4, 4),
		TargetNilai:       entity.CalculateNilai(4, 4, entity.GetBobot(4, 4)),
	}

	riskRepo := &fakeMonitoringRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{
			risk1ID: risk1,
			risk2ID: risk2,
		},
		versions: []*entity.Risk{
			{ID: risk1ID, VersionGroupID: vg1ID, Status: entity.RiskStatusApproved, AssessmentCycle: "2025-H2"},
			{ID: risk2ID, VersionGroupID: vg2ID, Status: entity.RiskStatusApproved, AssessmentCycle: "2025-H2"},
		},
	}

	uc := makeMonitoringUC(&fakeMonitoringPreviewOrgRepo{org: &entity.Organization{ID: orgID, Name: "Test Org"}}, &fakeMonitoringUserRepo{}, riskRepo)

	rows := [][]string{
		{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16"},
		{"1", "R-001", "Risk One", "2", "3", "", "", "", "3", "4", "", "", "", "", "", ""},
		{"2", "R-002", "Risk Two", "4", "4", "", "", "", "2", "2", "", "", "", "", "", ""},
	}

	result, err := uc.Preview(context.Background(), BulkMonitoringSpreadsheetInput{
		Filename:       "test.xlsx",
		Content:        makeMonitoringWorkbook(t, rows),
		UploaderID:     uploaderID,
		OrganizationID: orgID,
		Cycle:          "2026-H1",
	})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(result.Items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(result.Items))
	}
	if result.Items[0].Code != "R-001" {
		t.Fatalf("expected first item code R-001, got %q", result.Items[0].Code)
	}
	if result.Items[1].Code != "R-002" {
		t.Fatalf("expected second item code R-002, got %q", result.Items[1].Code)
	}
}

func TestPreview_TemplateRoundTrip(t *testing.T) {
	orgID := uuid.New()
	uploaderID := uuid.New()
	risk1ID := uuid.New()
	vg1ID := uuid.New()

	risk1 := &entity.Risk{
		ID:                risk1ID,
		Code:              "R-001",
		Title:             "Round Trip Risk",
		Status:            entity.RiskStatusApproved,
		VersionGroupID:    vg1ID,
		IsCurrent:         true,
		OrganizationID:    &orgID,
		TargetProbability: 2,
		TargetImpact:      3,
		TargetWeight:      entity.GetBobot(2, 3),
		TargetNilai:       entity.CalculateNilai(2, 3, entity.GetBobot(2, 3)),
	}

	riskRepo := &fakeMonitoringRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{risk1ID: risk1},
		versions: []*entity.Risk{
			{ID: risk1ID, VersionGroupID: vg1ID, Status: entity.RiskStatusApproved, AssessmentCycle: "2025-H2"},
		},
	}

	uc := makeMonitoringUC(&fakeMonitoringPreviewOrgRepo{org: &entity.Organization{ID: orgID, Name: "Test Org"}}, &fakeMonitoringUserRepo{}, riskRepo)

	templateUC := NewBulkMonitoringSpreadsheetUseCase(
		&fakeMonitoringPreviewOrgRepo{org: &entity.Organization{ID: orgID, Name: "Test Org"}},
		&fakeMonitoringUserRepo{},
		riskRepo,
	)

	content, _, err := templateUC.Template(context.Background(), orgID, "2026-H1")
	if err != nil {
		t.Fatalf("template err: %v", err)
	}

	result, err := uc.Preview(context.Background(), BulkMonitoringSpreadsheetInput{
		Filename:       "template.xlsx",
		Content:        content,
		UploaderID:     uploaderID,
		OrganizationID: orgID,
		Cycle:          "2026-H1",
	})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item from template round-trip, got %d", len(result.Items))
	}

	item := result.Items[0]
	if item.Code != "R-001" {
		t.Fatalf("expected code R-001, got %q", item.Code)
	}
	if item.Title != "Round Trip Risk" {
		t.Fatalf("expected title from risk, got %q", item.Title)
	}
	if item.TargetP != 2 {
		t.Fatalf("expected TargetP=2, got %d", item.TargetP)
	}
	if item.TargetD != 3 {
		t.Fatalf("expected TargetD=3, got %d", item.TargetD)
	}
}

func TestIsMonitoringColumnNumbersRow(t *testing.T) {
	tests := []struct {
		name     string
		row      []string
		expected bool
	}{
		{name: "valid_column_numbers", row: []string{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16"}, expected: true},
		{name: "partial_column_numbers", row: []string{"1", "2", "3", "4", "5"}, expected: false},
		{name: "text_row", row: []string{"RISIKO", "KODE", "SEBAB"}, expected: false},
		{name: "empty_row", row: []string{}, expected: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isMonitoringColumnNumbersRow(tt.row)
			if result != tt.expected {
				t.Fatalf("expected %v, got %v", tt.expected, result)
			}
		})
	}
}

func TestParseMonitoringInt(t *testing.T) {
	tests := []struct {
		input    string
		expected int
	}{
		{"1", 1},
		{"5", 5},
		{" 3 ", 3},
		{"", 0},
		{"abc", 0},
		{"0", 0},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := parseMonitoringInt(tt.input)
			if result != tt.expected {
				t.Fatalf("expected %d, got %d", tt.expected, result)
			}
		})
	}
}

func TestPreview_AliasBasedHeaderDetection(t *testing.T) {
	orgID := uuid.New()
	uploaderID := uuid.New()
	risk1ID := uuid.New()
	vg1ID := uuid.New()

	risk1 := &entity.Risk{
		ID:                risk1ID,
		Code:              "R-001",
		Title:             "Alias Risk",
		Status:            entity.RiskStatusApproved,
		VersionGroupID:    vg1ID,
		IsCurrent:         true,
		OrganizationID:    &orgID,
		TargetProbability: 2,
		TargetImpact:      3,
		TargetWeight:      entity.GetBobot(2, 3),
		TargetNilai:       entity.CalculateNilai(2, 3, entity.GetBobot(2, 3)),
	}

	riskRepo := &fakeMonitoringRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{risk1ID: risk1},
		versions: []*entity.Risk{
			{ID: risk1ID, VersionGroupID: vg1ID, Status: entity.RiskStatusApproved, AssessmentCycle: "2025-H2"},
		},
	}

	uc := makeMonitoringUC(&fakeMonitoringPreviewOrgRepo{org: &entity.Organization{ID: orgID, Name: "Test Org"}}, &fakeMonitoringUserRepo{}, riskRepo)

	rows := [][]string{
		{"KODE RISIKO", "URAIAN RISIKO", "TARGET P", "TARGET D", "REALISASI P", "REALISASI D"},
		{"R-001", "Alias Risk", "2", "3", "3", "4"},
	}

	result, err := uc.Preview(context.Background(), BulkMonitoringSpreadsheetInput{
		Filename:       "test.xlsx",
		Content:        makeMonitoringWorkbook(t, rows),
		UploaderID:     uploaderID,
		OrganizationID: orgID,
		Cycle:          "2026-H1",
	})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}
	if result.Items[0].Code != "R-001" {
		t.Fatalf("expected code R-001, got %q", result.Items[0].Code)
	}
	if result.Items[0].RealisasiP != 3 {
		t.Fatalf("expected RealisasiP=3, got %d", result.Items[0].RealisasiP)
	}
}

func BenchmarkPreview_PositionBasedParsing(b *testing.B) {
	orgID := uuid.New()
	uploaderID := uuid.New()
	risk1ID := uuid.New()
	vg1ID := uuid.New()

	risk1 := &entity.Risk{
		ID:                risk1ID,
		Code:              "R-001",
		Title:             "Bench Risk",
		Status:            entity.RiskStatusApproved,
		VersionGroupID:    vg1ID,
		IsCurrent:         true,
		OrganizationID:    &orgID,
		TargetProbability: 2,
		TargetImpact:      3,
		TargetWeight:      entity.GetBobot(2, 3),
		TargetNilai:       entity.CalculateNilai(2, 3, entity.GetBobot(2, 3)),
	}

	riskRepo := &fakeMonitoringRiskRepo{
		risks: map[uuid.UUID]*entity.Risk{risk1ID: risk1},
		versions: []*entity.Risk{
			{ID: risk1ID, VersionGroupID: vg1ID, Status: entity.RiskStatusApproved, AssessmentCycle: "2025-H2"},
		},
	}

	uc := makeMonitoringUC(&fakeMonitoringPreviewOrgRepo{org: &entity.Organization{ID: orgID, Name: "Test Org"}}, &fakeMonitoringUserRepo{}, riskRepo)

	rows := [][]string{
		{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16"},
		{"1", "R-001", "Bench Risk", "2", "3", "", "", "", "3", "4", "", "", "", "", "", ""},
	}
	content := makeMonitoringWorkbook(&testing.T{}, rows)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = uc.Preview(context.Background(), BulkMonitoringSpreadsheetInput{
			Filename:       "bench.xlsx",
			Content:        content,
			UploaderID:     uploaderID,
			OrganizationID: orgID,
			Cycle:          "2026-H1",
		})
	}
}
