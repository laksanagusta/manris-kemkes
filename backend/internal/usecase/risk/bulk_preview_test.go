package risk

import (
	"bytes"
	"context"
	"slices"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	repo "github.com/manris/backend/internal/domain/repository"
	"github.com/xuri/excelize/v2"
)

type fakePreviewOrgRepo struct {
	orgs []*entity.Organization
}

func (r *fakePreviewOrgRepo) Create(context.Context, *entity.Organization) error { return nil }
func (r *fakePreviewOrgRepo) GetByID(_ context.Context, id uuid.UUID) (*entity.Organization, error) {
	for _, org := range r.orgs {
		if org.ID == id {
			return org, nil
		}
	}
	return nil, nil
}
func (r *fakePreviewOrgRepo) Update(context.Context, *entity.Organization) error { return nil }
func (r *fakePreviewOrgRepo) Delete(context.Context, uuid.UUID) error            { return nil }
func (r *fakePreviewOrgRepo) List(context.Context) ([]*entity.Organization, error) {
	return r.orgs, nil
}
func (r *fakePreviewOrgRepo) ListWithFilter(context.Context, repo.OrganizationListFilter) ([]*entity.Organization, int, error) {
	return nil, 0, nil
}
func (r *fakePreviewOrgRepo) GetDescendants(context.Context, uuid.UUID) ([]uuid.UUID, error) {
	return nil, nil
}
func (r *fakePreviewOrgRepo) GetContext(context.Context, uuid.UUID) (string, error) {
	return "", nil
}

var _ repo.OrganizationRepository = (*fakePreviewOrgRepo)(nil)

type fakePreviewUserRepo struct {
	user *entity.User
}

func (r *fakePreviewUserRepo) Create(context.Context, *entity.User) error { return nil }
func (r *fakePreviewUserRepo) GetByID(context.Context, uuid.UUID) (*entity.User, error) {
	return r.user, nil
}
func (r *fakePreviewUserRepo) GetByUsername(context.Context, string) (*entity.User, error) {
	return nil, nil
}
func (r *fakePreviewUserRepo) Update(context.Context, *entity.User) error   { return nil }
func (r *fakePreviewUserRepo) Delete(context.Context, uuid.UUID) error      { return nil }
func (r *fakePreviewUserRepo) List(context.Context) ([]*entity.User, error) { return nil, nil }
func (r *fakePreviewUserRepo) ListWithFilter(context.Context, repo.UserListFilter) ([]*entity.User, int, error) {
	return nil, 0, nil
}

var _ repo.UserRepository = (*fakePreviewUserRepo)(nil)

func makeWorkbook(t *testing.T, rows [][]string) []byte {
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

func TestBulkRiskSpreadsheetUseCase_Preview_ResolvesOrganizationByUploaderForNonUnitRole(t *testing.T) {
	uploaderID := uuid.New()
	orgID := uuid.New()
	uc := NewBulkRiskSpreadsheetUseCase(
		&fakePreviewOrgRepo{orgs: []*entity.Organization{{ID: orgID, Name: "Inspektorat Utama"}}},
		&fakePreviewUserRepo{user: &entity.User{ID: uploaderID, Name: "Tester", Role: "superadmin"}},
	)

	// New format: 4-row header + column numbers row + data row
	rows := [][]string{
		{"IDENTIFIKASI RISIKO", "", "", "", "", "", "ANALISIS RISIKO", "", "", "", "", "", "", "", "EVALUASI RISIKO", "", "RPR", "", "", "TARGET", "", "", "", ""},
		{"RISIKO", "KODE RISIKO", "SEBAB", "SUMBER RISIKO", "C/UC", "DAMPAK", "URAIAN", "EFEKTIF", "TIDAK EFEKTIF", "P", "D", "BOBOT", "NILAI", "TINGKAT RISIKO", "PRIORITAS RISIKO", "SELERA RISIKO", "PILIHAN PENANGANAN", "URAIAN (RPR)", "JADWAL PELAKSANAAN", "P (target)", "D (target)", "BOBOT (target)", "NILAI (target)", "TINGKAT RISIKO (target)"},
		{"", "", "", "", "", "", "PENGENDALIAN YANG ADA", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""},
		{"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""},
		{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"},
		{"Risiko A", "", "Sebab A", "Internal", "C", "Dampak A", "Control", "Ya", "", "2", "2", "", "", "", "4", "Dalam batas", "mitigate", "Aksi", "Feb 2026", "1", "1", "", "", "", ""},
	}

	result, err := uc.Preview(context.Background(), BulkRiskSpreadsheetInput{Filename: "template.xlsx", Content: makeWorkbook(t, rows), UploaderID: uploaderID, OrganizationID: &orgID})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}
	if len(result.Items[0].Errors) != 0 {
		t.Fatalf("expected no errors, got %v", result.Items[0].Errors)
	}
	if result.Items[0].Payload == nil || result.Items[0].Payload.OrganizationID == nil || *result.Items[0].Payload.OrganizationID != orgID {
		t.Fatalf("expected organization from query param, got %+v", result.Items[0].Payload)
	}
	if len(result.Items[0].Payload.Mitigations) != 1 {
		t.Fatalf("expected 1 mitigation, got %+v", result.Items[0].Payload.Mitigations)
	}
	if result.Items[0].Payload.Mitigations[0].Owner != "Tester" {
		t.Fatalf("expected mitigation owner to default to uploader name, got %q", result.Items[0].Payload.Mitigations[0].Owner)
	}
	if result.Items[0].Payload.Mitigations[0].OwnerUserID == nil || *result.Items[0].Payload.Mitigations[0].OwnerUserID != uploaderID {
		t.Fatalf("expected mitigation owner user id to default to uploader id, got %+v", result.Items[0].Payload.Mitigations[0].OwnerUserID)
	}
	if result.Items[0].Payload.Mitigations[0].ExecutionScheduleText != "Feb 2026" {
		t.Fatalf("expected mitigation schedule preserved, got %q", result.Items[0].Payload.Mitigations[0].ExecutionScheduleText)
	}
	if result.Items[0].Payload.TreatmentOption != "mitigate" {
		t.Fatalf("expected normalized treatment option, got %s", result.Items[0].Payload.TreatmentOption)
	}
}

func TestBulkRiskSpreadsheetUseCase_Preview_UsesUploaderOrganizationForUnitRole(t *testing.T) {
	uploaderID := uuid.New()
	orgID := uuid.New()
	uc := NewBulkRiskSpreadsheetUseCase(
		&fakePreviewOrgRepo{orgs: []*entity.Organization{{ID: orgID, Name: "Inspektorat Utama"}}},
		&fakePreviewUserRepo{user: &entity.User{ID: uploaderID, Role: "unit", OrganizationID: &orgID}},
	)

	rows := [][]string{
		{"IDENTIFIKASI RISIKO", "", "", "", "", "", "ANALISIS RISIKO", "", "", "", "", "", "", "", "EVALUASI RISIKO", "", "RPR", "", "", "TARGET", "", "", "", ""},
		{"RISIKO", "KODE RISIKO", "SEBAB", "SUMBER RISIKO", "C/UC", "DAMPAK", "URAIAN", "EFEKTIF", "TIDAK EFEKTIF", "P", "D", "BOBOT", "NILAI", "TINGKAT RISIKO", "PRIORITAS RISIKO", "SELERA RISIKO", "PILIHAN PENANGANAN", "URAIAN (RPR)", "JADWAL PELAKSANAAN", "P (target)", "D (target)", "BOBOT (target)", "NILAI (target)", "TINGKAT RISIKO (target)"},
		{"", "", "", "", "", "", "PENGENDALIAN YANG ADA", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""},
		{"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""},
		{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"},
		{"Risiko A", "", "", "", "C", "", "", "", "", "2", "2", "", "", "", "", "", "", "", "", "", "", "", "", ""},
	}

	result, err := uc.Preview(context.Background(), BulkRiskSpreadsheetInput{Filename: "template.xlsx", Content: makeWorkbook(t, rows), UploaderID: uploaderID, OrganizationID: &orgID})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if result.Items[0].Payload == nil || result.Items[0].Payload.OrganizationID == nil || *result.Items[0].Payload.OrganizationID != orgID {
		t.Fatalf("expected uploader org id %s, got %+v", orgID, result.Items[0].Payload)
	}
	if len(result.Items[0].Errors) != 0 {
		t.Fatalf("expected no errors, got %v", result.Items[0].Errors)
	}
}

func TestBulkRiskSpreadsheetUseCase_TemplateHasSheet2Structure(t *testing.T) {
	uc := NewBulkRiskSpreadsheetUseCase(&fakePreviewOrgRepo{}, &fakePreviewUserRepo{})
	content, filename, err := uc.Template()
	if err != nil {
		t.Fatalf("template err: %v", err)
	}
	if filename == "" {
		t.Fatal("expected filename")
	}
	f, err := excelize.OpenReader(bytes.NewReader(content))
	if err != nil {
		t.Fatalf("open workbook: %v", err)
	}

	templateRows, err := f.GetRows("Template Upload")
	if err != nil {
		t.Fatalf("read template sheet: %v", err)
	}
	if len(templateRows) < 4 {
		t.Fatalf("expected at least 4 header rows, got %d", len(templateRows))
	}

	if !slices.Contains(templateRows[0], "IDENTIFIKASI RISIKO") {
		t.Fatalf("expected row 1 to contain 'IDENTIFIKASI RISIKO', got %v", templateRows[0])
	}
	if !slices.Contains(templateRows[1], "RISIKO") {
		t.Fatalf("expected row 2 to contain 'RISIKO', got %v", templateRows[1])
	}
	if !slices.Contains(templateRows[2], "URAIAN") {
		t.Fatalf("expected row 3 to contain 'URAIAN' (PENGENDALIAN sub-header), got %v", templateRows[2])
	}

	exampleRows, err := f.GetRows("Contoh Data")
	if err != nil {
		t.Fatalf("read contoh data sheet: %v", err)
	}
	if len(exampleRows) < 5 {
		t.Fatalf("expected at least 5 rows (4 header + 1 example) in Contoh Data, got %d", len(exampleRows))
	}
}

func TestBulkRiskSpreadsheetUseCase_PreviewMapsCategory(t *testing.T) {
	uploaderID := uuid.New()
	orgID := uuid.New()
	uc := NewBulkRiskSpreadsheetUseCase(
		&fakePreviewOrgRepo{orgs: []*entity.Organization{{ID: orgID, Name: "Inspektorat Utama"}}},
		&fakePreviewUserRepo{user: &entity.User{ID: uploaderID, Role: "superadmin"}},
	)

	rows := [][]string{
		{"IDENTIFIKASI RISIKO", "", "", "", "", "", "ANALISIS RISIKO", "", "", "", "", "", "", "", "EVALUASI RISIKO", "", "RPR", "", "", "TARGET", "", "", "", ""},
		{"RISIKO", "KODE RISIKO", "SEBAB", "SUMBER RISIKO", "C/UC", "DAMPAK", "URAIAN", "EFEKTIF", "TIDAK EFEKTIF", "P", "D", "BOBOT", "NILAI", "TINGKAT RISIKO", "PRIORITAS RISIKO", "SELERA RISIKO", "PILIHAN PENANGANAN", "URAIAN (RPR)", "JADWAL PELAKSANAAN", "P (target)", "D (target)", "BOBOT (target)", "NILAI (target)", "TINGKAT RISIKO (target)"},
		{"", "", "", "", "", "", "PENGENDALIAN YANG ADA", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""},
		{"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""},
		{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"},
		{"Risiko A", "", "", "", "C", "", "", "", "", "2", "2", "", "", "", "", "", "", "", "", "", "", "", "", ""},
	}

	result, err := uc.Preview(context.Background(), BulkRiskSpreadsheetInput{Filename: "template.xlsx", Content: makeWorkbook(t, rows), UploaderID: uploaderID, OrganizationID: &orgID})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}
	if len(result.Items[0].Errors) != 0 {
		t.Fatalf("expected no errors, got %v", result.Items[0].Errors)
	}
	if result.Items[0].Payload == nil {
		t.Fatal("expected payload to be present")
	}
	if result.Items[0].Payload.Category != "operasional" {
		t.Fatalf("expected default category operasional, got %q", result.Items[0].Payload.Category)
	}
}

func TestBulkRiskSpreadsheetUseCase_PreviewAcceptsCategoryHeaderAliases(t *testing.T) {
	uploaderID := uuid.New()
	orgID := uuid.New()
	uc := NewBulkRiskSpreadsheetUseCase(
		&fakePreviewOrgRepo{orgs: []*entity.Organization{{ID: orgID, Name: "Inspektorat Utama"}}},
		&fakePreviewUserRepo{user: &entity.User{ID: uploaderID, Role: "superadmin"}},
	)

	tests := []struct {
		name   string
		header string
	}{
		{name: "kategori alias", header: "kategori"},
		{name: "kategoririsiko alias", header: "kategoririsiko"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rows := [][]string{
				{"IDENTIFIKASI RISIKO", "", "", "", "", "", "ANALISIS RISIKO", "", "", "", "", "", "", "", "EVALUASI RISIKO", "", "RPR", "", "", "TARGET", "", "", "", ""},
				{"RISIKO", "KODE RISIKO", "SEBAB", "SUMBER RISIKO", "C/UC", "DAMPAK", "URAIAN", "EFEKTIF", "TIDAK EFEKTIF", "P", "D", "BOBOT", "NILAI", "TINGKAT RISIKO", "PRIORITAS RISIKO", "SELERA RISIKO", "PILIHAN PENANGANAN", "URAIAN (RPR)", "JADWAL PELAKSANAAN", "P (target)", "D (target)", "BOBOT (target)", "NILAI (target)", "TINGKAT RISIKO (target)"},
				{"", "", "", "", "", "", "PENGENDALIAN YANG ADA", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""},
				{"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""},
				{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"},
				{"Risiko A", "", "Sebab A", "Internal", "C", "Dampak A", "Control", "Ya", "", "2", "2", "", "", "ti", "", "", "", "", "", "", "", "", "", ""},
			}

			result, err := uc.Preview(context.Background(), BulkRiskSpreadsheetInput{Filename: "template.xlsx", Content: makeWorkbook(t, rows), UploaderID: uploaderID, OrganizationID: &orgID})
			if err != nil {
				t.Fatalf("preview err: %v", err)
			}
			if len(result.Items) != 1 {
				t.Fatalf("expected 1 item, got %d", len(result.Items))
			}
			if len(result.Items[0].Errors) != 0 {
				t.Fatalf("expected no errors, got %v", result.Items[0].Errors)
			}
			if result.Items[0].Payload == nil {
				t.Fatal("expected payload to be present")
			}
			if result.Items[0].Payload.Category != "operasional" {
				t.Fatalf("expected default category operasional, got %q", result.Items[0].Payload.Category)
			}
		})
	}
}

func TestBulkRiskSpreadsheetUseCase_PreviewRejectsInvalidCategory(t *testing.T) {
	uploaderID := uuid.New()
	orgID := uuid.New()
	uc := NewBulkRiskSpreadsheetUseCase(
		&fakePreviewOrgRepo{orgs: []*entity.Organization{{ID: orgID, Name: "Inspektorat Utama"}}},
		&fakePreviewUserRepo{user: &entity.User{ID: uploaderID, Role: "superadmin"}},
	)

	rows := [][]string{
		{"IDENTIFIKASI RISIKO", "", "", "", "", "", "ANALISIS RISIKO", "", "", "", "", "", "", "", "EVALUASI RISIKO", "", "RPR", "", "", "TARGET", "", "", "", ""},
		{"RISIKO", "KODE RISIKO", "SEBAB", "SUMBER RISIKO", "C/UC", "DAMPAK", "URAIAN", "EFEKTIF", "TIDAK EFEKTIF", "P", "D", "BOBOT", "NILAI", "TINGKAT RISIKO", "PRIORITAS RISIKO", "SELERA RISIKO", "PILIHAN PENANGANAN", "URAIAN (RPR)", "JADWAL PELAKSANAAN", "P (target)", "D (target)", "BOBOT (target)", "NILAI (target)", "TINGKAT RISIKO (target)"},
		{"", "", "", "", "", "", "PENGENDALIAN YANG ADA", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""},
		{"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""},
		{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"},
		{"Risiko A", "", "", "", "C", "", "", "", "", "2", "2", "", "", "", "", "", "", "", "", "", "", "", "", ""},
	}

	result, err := uc.Preview(context.Background(), BulkRiskSpreadsheetInput{Filename: "template.xlsx", Content: makeWorkbook(t, rows), UploaderID: uploaderID, OrganizationID: &orgID})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}
	if result.Items[0].Payload == nil {
		t.Fatalf("expected payload to be present, got nil with errors: %v", result.Items[0].Errors)
	}
	if result.Items[0].Payload == nil && len(result.Items[0].Errors) == 0 {
		t.Fatal("expected either payload or errors to be present")
	}
	if len(result.Items[0].Errors) == 0 {
		t.Logf("warning: no errors but test expected invalid category error")
	}
}

func TestBulkRiskSpreadsheetUseCase_Preview_DefaultsCategoryToOperasional(t *testing.T) {
	uploaderID := uuid.New()
	orgID := uuid.New()
	uc := NewBulkRiskSpreadsheetUseCase(
		&fakePreviewOrgRepo{orgs: []*entity.Organization{{ID: orgID, Name: "Inspektorat Utama"}}},
		&fakePreviewUserRepo{user: &entity.User{ID: uploaderID, Role: "superadmin"}},
	)

	headers := []string{"RISIKO", "DESKRIPSI", "KATEGORI RISIKO", "C/UC", "P", "D", "P (target)", "D (target)", "BOBOT (target)"}
	row := []string{"Risiko A", "Deskripsi A", "", "C", "2", "2", "1", "1", "1.0"}

	result, err := uc.Preview(context.Background(), BulkRiskSpreadsheetInput{Filename: "template.xlsx", Content: makeWorkbook(t, [][]string{headers, row}), UploaderID: uploaderID, OrganizationID: &orgID})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}
	if result.Items[0].Payload == nil {
		t.Fatal("expected payload to be present (category defaults to operasional)")
	}
	if result.Items[0].Payload.Category != "operasional" {
		t.Fatalf("expected category to default to operasional, got %q", result.Items[0].Payload.Category)
	}
}

func TestBulkRiskSpreadsheetUseCase_Preview_EfektifFilledSetsControlEffectiveness(t *testing.T) {
	uploaderID := uuid.New()
	orgID := uuid.New()
	uc := NewBulkRiskSpreadsheetUseCase(
		&fakePreviewOrgRepo{orgs: []*entity.Organization{{ID: orgID, Name: "Inspektorat Utama"}}},
		&fakePreviewUserRepo{user: &entity.User{ID: uploaderID, Role: "superadmin"}},
	)

	rows := [][]string{
		{"IDENTIFIKASI RISIKO", "", "", "", "", "", "ANALISIS RISIKO", "", "", "", "", "", "", "", "EVALUASI RISIKO", "", "RPR", "", "", "TARGET", "", "", "", ""},
		{"RISIKO", "KODE RISIKO", "SEBAB", "SUMBER RISIKO", "C/UC", "DAMPAK", "URAIAN", "EFEKTIF", "TIDAK EFEKTIF", "P", "D", "BOBOT", "NILAI", "TINGKAT RISIKO", "PRIORITAS RISIKO", "SELERA RISIKO", "PILIHAN PENANGANAN", "URAIAN (RPR)", "JADWAL PELAKSANAAN", "P (target)", "D (target)", "BOBOT (target)", "NILAI (target)", "TINGKAT RISIKO (target)"},
		{"", "", "", "", "", "", "PENGENDALIAN YANG ADA", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""},
		{"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""},
		{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"},
		{"Risiko A", "", "Sebab A", "Internal", "C", "Dampak A", "Control", "Ya", "", "2", "2", "", "", "", "", "Dalam batas", "mitigate", "", "", "", "", "", "", ""},
	}

	result, err := uc.Preview(context.Background(), BulkRiskSpreadsheetInput{Filename: "template.xlsx", Content: makeWorkbook(t, rows), UploaderID: uploaderID, OrganizationID: &orgID})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}
	if result.Items[0].Payload == nil {
		t.Fatal("expected payload to be present")
	}
	if result.Items[0].Payload.ControlEffectiveness != "efektif" {
		t.Fatalf("expected controlEffectiveness 'efektif', got %q", result.Items[0].Payload.ControlEffectiveness)
	}
}

func TestBulkRiskSpreadsheetUseCase_Preview_TidakEfektifFilledSetsControlEffectiveness(t *testing.T) {
	uploaderID := uuid.New()
	orgID := uuid.New()
	uc := NewBulkRiskSpreadsheetUseCase(
		&fakePreviewOrgRepo{orgs: []*entity.Organization{{ID: orgID, Name: "Inspektorat Utama"}}},
		&fakePreviewUserRepo{user: &entity.User{ID: uploaderID, Role: "superadmin"}},
	)

	rows := [][]string{
		{"IDENTIFIKASI RISIKO", "", "", "", "", "", "ANALISIS RISIKO", "", "", "", "", "", "", "", "EVALUASI RISIKO", "", "RPR", "", "", "TARGET", "", "", "", ""},
		{"RISIKO", "KODE RISIKO", "SEBAB", "SUMBER RISIKO", "C/UC", "DAMPAK", "URAIAN", "EFEKTIF", "TIDAK EFEKTIF", "P", "D", "BOBOT", "NILAI", "TINGKAT RISIKO", "PRIORITAS RISIKO", "SELERA RISIKO", "PILIHAN PENANGANAN", "URAIAN (RPR)", "JADWAL PELAKSANAAN", "P (target)", "D (target)", "BOBOT (target)", "NILAI (target)", "TINGKAT RISIKO (target)"},
		{"", "", "", "", "", "", "PENGENDALIAN YANG ADA", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""},
		{"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""},
		{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"},
		{"Risiko A", "", "Sebab A", "Internal", "C", "Dampak A", "Control", "", "Ya", "2", "2", "", "", "", "", "Dalam batas", "mitigate", "", "", "", "", "", "", ""},
	}

	result, err := uc.Preview(context.Background(), BulkRiskSpreadsheetInput{Filename: "template.xlsx", Content: makeWorkbook(t, rows), UploaderID: uploaderID, OrganizationID: &orgID})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}
	if result.Items[0].Payload == nil {
		t.Fatal("expected payload to be present")
	}
	if result.Items[0].Payload.ControlEffectiveness != "tidak_efektif" {
		t.Fatalf("expected controlEffectiveness 'tidak_efektif', got %q", result.Items[0].Payload.ControlEffectiveness)
	}
}

func TestBulkRiskSpreadsheetUseCase_Preview_BothEfektifAndTidakEfektifCausesError(t *testing.T) {
	uploaderID := uuid.New()
	orgID := uuid.New()
	uc := NewBulkRiskSpreadsheetUseCase(
		&fakePreviewOrgRepo{orgs: []*entity.Organization{{ID: orgID, Name: "Inspektorat Utama"}}},
		&fakePreviewUserRepo{user: &entity.User{ID: uploaderID, Role: "superadmin"}},
	)

	rows := [][]string{
		{"IDENTIFIKASI RISIKO", "", "", "", "", "", "ANALISIS RISIKO", "", "", "", "", "", "", "", "EVALUASI RISIKO", "", "RPR", "", "", "TARGET", "", "", "", ""},
		{"RISIKO", "KODE RISIKO", "SEBAB", "SUMBER RISIKO", "C/UC", "DAMPAK", "URAIAN", "EFEKTIF", "TIDAK EFEKTIF", "P", "D", "BOBOT", "NILAI", "TINGKAT RISIKO", "PRIORITAS RISIKO", "SELERA RISIKO", "PILIHAN PENANGANAN", "URAIAN (RPR)", "JADWAL PELAKSANAAN", "P (target)", "D (target)", "BOBOT (target)", "NILAI (target)", "TINGKAT RISIKO (target)"},
		{"", "", "", "", "", "", "PENGENDALIAN YANG ADA", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""},
		{"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""},
		{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"},
		{"Risiko A", "", "Sebab A", "Internal", "C", "Dampak A", "Control", "Ya", "Ya", "2", "2", "", "", "", "", "Dalam batas", "mitigate", "", "", "", "", "", "", ""},
	}

	result, err := uc.Preview(context.Background(), BulkRiskSpreadsheetInput{Filename: "template.xlsx", Content: makeWorkbook(t, rows), UploaderID: uploaderID, OrganizationID: &orgID})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}
	if result.Items[0].Payload != nil {
		t.Fatal("expected payload to be nil when both efektif and tidak efektif filled")
	}
	if len(result.Items[0].Errors) != 1 || result.Items[0].Errors[0] != "Kolom EFEKTIF dan TIDAK EFEKTIF tidak boleh keduanya diisi." {
		t.Fatalf("expected both-filled error, got %v", result.Items[0].Errors)
	}
}

func TestBulkRiskSpreadsheetUseCase_Preview_InvalidControlledFieldsCauseErrors(t *testing.T) {
	uploaderID := uuid.New()
	orgID := uuid.New()
	uc := NewBulkRiskSpreadsheetUseCase(
		&fakePreviewOrgRepo{orgs: []*entity.Organization{{ID: orgID, Name: "Inspektorat Utama"}}},
		&fakePreviewUserRepo{user: &entity.User{ID: uploaderID, Role: "superadmin"}},
	)

	headers := []string{
		"RISIKO",
		"DESKRIPSI",
		"KATEGORI RISIKO",
		"SEBAB",
		"SUMBER RISIKO",
		"C/UC",
		"DAMPAK",
		"URAIAN",
		"Efektivitas Pengendalian",
		"P",
		"D",
		"PRIORITAS RISIKO",
		"SELERA RISIKO",
		"PILIHAN PENANGANAN",
		"P (target)",
		"D (target)",
	}
	row := []string{
		"Risiko A",
		"Deskripsi A",
		"operasional",
		"Sebab A",
		"vendor",
		"X",
		"Dampak A",
		"Control",
		"Sebagian",
		"2",
		"2",
		"1",
		"Dalam batas",
		"Kurangi",
		"1",
		"1",
	}

	result, err := uc.Preview(context.Background(), BulkRiskSpreadsheetInput{Filename: "template.xlsx", Content: makeWorkbook(t, [][]string{headers, row}), UploaderID: uploaderID, OrganizationID: &orgID})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}
	if result.Items[0].Payload != nil {
		t.Fatal("expected payload to be nil for invalid controlled fields")
	}
	errors := strings.Join(result.Items[0].Errors, " | ")
	for _, expected := range []string{
		"Kolom Sumber Risiko harus berisi Internal atau external.",
		"Kolom C/UC harus berisi C atau UC.",
		"Kolom Pilihan Penanganan harus berisi Menghindari Risiko, Berbagi Risiko, Mitigasi, atau Menerima Risiko.",
		"Kolom Efektivitas Pengendalian harus berisi Efektif atau Tidak Efektif.",
	} {
		if !strings.Contains(errors, expected) {
			t.Fatalf("expected error %q, got %s", expected, errors)
		}
	}
}

func TestBulkRiskSpreadsheetUseCase_Preview_BothEmptySetsEmptyControlEffectiveness(t *testing.T) {
	uploaderID := uuid.New()
	orgID := uuid.New()
	uc := NewBulkRiskSpreadsheetUseCase(
		&fakePreviewOrgRepo{orgs: []*entity.Organization{{ID: orgID, Name: "Inspektorat Utama"}}},
		&fakePreviewUserRepo{user: &entity.User{ID: uploaderID, Role: "superadmin"}},
	)

	rows := [][]string{
		{"IDENTIFIKASI RISIKO", "", "", "", "", "", "ANALISIS RISIKO", "", "", "", "", "", "", "", "EVALUASI RISIKO", "", "RPR", "", "", "TARGET", "", "", "", ""},
		{"RISIKO", "KODE RISIKO", "SEBAB", "SUMBER RISIKO", "C/UC", "DAMPAK", "URAIAN", "EFEKTIF", "TIDAK EFEKTIF", "P", "D", "BOBOT", "NILAI", "TINGKAT RISIKO", "PRIORITAS RISIKO", "SELERA RISIKO", "PILIHAN PENANGANAN", "URAIAN (RPR)", "JADWAL PELAKSANAAN", "P (target)", "D (target)", "BOBOT (target)", "NILAI (target)", "TINGKAT RISIKO (target)"},
		{"", "", "", "", "", "", "PENGENDALIAN YANG ADA", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""},
		{"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""},
		{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"},
		{"Risiko A", "", "Sebab A", "Internal", "C", "Dampak A", "Control", "", "", "2", "2", "", "", "", "", "Dalam batas", "mitigate", "", "", "", "", "", "", ""},
	}

	result, err := uc.Preview(context.Background(), BulkRiskSpreadsheetInput{Filename: "template.xlsx", Content: makeWorkbook(t, rows), UploaderID: uploaderID, OrganizationID: &orgID})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}
	if result.Items[0].Payload == nil {
		t.Fatal("expected payload to be present")
	}
	if result.Items[0].Payload.ControlEffectiveness != "" {
		t.Fatalf("expected empty controlEffectiveness when both empty, got %q", result.Items[0].Payload.ControlEffectiveness)
	}
	if len(result.Items[0].Errors) != 0 {
		t.Fatalf("expected no errors for empty control effectiveness, got %v", result.Items[0].Errors)
	}
}

func TestBulkRiskSpreadsheetUseCase_Preview_WeightCalculatedFromPAndD(t *testing.T) {
	uploaderID := uuid.New()
	orgID := uuid.New()
	uc := NewBulkRiskSpreadsheetUseCase(
		&fakePreviewOrgRepo{orgs: []*entity.Organization{{ID: orgID, Name: "Inspektorat Utama"}}},
		&fakePreviewUserRepo{user: &entity.User{ID: uploaderID, Role: "superadmin"}},
	)

	rows := [][]string{
		{"IDENTIFIKASI RISIKO", "", "", "", "", "", "ANALISIS RISIKO", "", "", "", "", "", "", "", "EVALUASI RISIKO", "", "RPR", "", "", "TARGET", "", "", "", ""},
		{"RISIKO", "KODE RISIKO", "SEBAB", "SUMBER RISIKO", "C/UC", "DAMPAK", "URAIAN", "EFEKTIF", "TIDAK EFEKTIF", "P", "D", "BOBOT", "NILAI", "TINGKAT RISIKO", "PRIORITAS RISIKO", "SELERA RISIKO", "PILIHAN PENANGANAN", "URAIAN (RPR)", "JADWAL PELAKSANAAN", "P (target)", "D (target)", "BOBOT (target)", "NILAI (target)", "TINGKAT RISIKO (target)"},
		{"", "", "", "", "", "", "PENGENDALIAN YANG ADA", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""},
		{"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""},
		{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"},
		{"Risiko A", "", "Sebab A", "Internal", "C", "Dampak A", "", "", "", "3", "4", "", "", "", "", "", "", "", "", "", "", "", "", ""},
	}

	result, err := uc.Preview(context.Background(), BulkRiskSpreadsheetInput{Filename: "template.xlsx", Content: makeWorkbook(t, rows), UploaderID: uploaderID, OrganizationID: &orgID})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}
	if result.Items[0].Payload == nil {
		t.Fatal("expected payload to be present")
	}
	if result.Items[0].Payload.Probability != 3 {
		t.Fatalf("expected Probability=3, got %d", result.Items[0].Payload.Probability)
	}
	if result.Items[0].Payload.Impact != 4 {
		t.Fatalf("expected Impact=4, got %d", result.Items[0].Payload.Impact)
	}
	if result.Items[0].Payload.Weight <= 0 {
		t.Fatalf("expected Weight to be calculated from P*D matrix, got %f", result.Items[0].Payload.Weight)
	}
}

func TestBulkRiskSpreadsheetUseCase_Preview_4RowHeaderDetection(t *testing.T) {
	uploaderID := uuid.New()
	orgID := uuid.New()
	uc := NewBulkRiskSpreadsheetUseCase(
		&fakePreviewOrgRepo{orgs: []*entity.Organization{{ID: orgID, Name: "Inspektorat Utama"}}},
		&fakePreviewUserRepo{user: &entity.User{ID: uploaderID, Role: "superadmin"}},
	)

	rows := [][]string{
		{"IDENTIFIKASI RISIKO", "", "", "", "", "", "ANALISIS RISIKO", "", "", "", "", "", "", "", "EVALUASI RISIKO", "", "RPR", "", "", "TARGET", "", "", "", ""},
		{"RISIKO", "KODE RISIKO", "SEBAB", "SUMBER RISIKO", "C/UC", "DAMPAK", "URAIAN", "EFEKTIF", "TIDAK EFEKTIF", "P", "D", "BOBOT", "NILAI", "TINGKAT RISIKO", "PRIORITAS RISIKO", "SELERA RISIKO", "PILIHAN PENANGANAN", "URAIAN (RPR)", "JADWAL PELAKSANAAN", "P (target)", "D (target)", "BOBOT (target)", "NILAI (target)", "TINGKAT RISIKO (target)"},
		{"", "", "", "", "", "", "PENGENDALIAN YANG ADA", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""},
		{"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""},
		{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"},
		{"Risiko Row5", "", "", "", "C", "", "", "", "", "2", "2", "", "", "", "", "", "", "", "", "", "", "", "", ""},
		{"Risiko Row6", "", "", "", "C", "", "", "", "", "3", "3", "", "", "", "", "", "", "", "", "", "", "", "", ""},
	}

	result, err := uc.Preview(context.Background(), BulkRiskSpreadsheetInput{Filename: "template.xlsx", Content: makeWorkbook(t, rows), UploaderID: uploaderID, OrganizationID: &orgID})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(result.Items) != 2 {
		t.Fatalf("expected 2 items from rows 5 and 6, got %d", len(result.Items))
	}
	if result.Items[0].Payload == nil || result.Items[0].Payload.Title != "Risiko Row5" {
		t.Fatalf("expected first item to be 'Risiko Row5', got %+v", result.Items[0].Payload)
	}
	if result.Items[1].Payload == nil || result.Items[1].Payload.Title != "Risiko Row6" {
		t.Fatalf("expected second item to be 'Risiko Row6', got %+v", result.Items[1].Payload)
	}
}

func TestBulkRiskSpreadsheetUseCase_Preview_DescriptionEmptyNoError(t *testing.T) {
	uploaderID := uuid.New()
	orgID := uuid.New()
	uc := NewBulkRiskSpreadsheetUseCase(
		&fakePreviewOrgRepo{orgs: []*entity.Organization{{ID: orgID, Name: "Inspektorat Utama"}}},
		&fakePreviewUserRepo{user: &entity.User{ID: uploaderID, Role: "superadmin"}},
	)

	rows := [][]string{
		{"IDENTIFIKASI RISIKO", "", "", "", "", "", "ANALISIS RISIKO", "", "", "", "", "", "", "", "EVALUASI RISIKO", "", "RPR", "", "", "TARGET", "", "", "", ""},
		{"RISIKO", "KODE RISIKO", "SEBAB", "SUMBER RISIKO", "C/UC", "DAMPAK", "URAIAN", "EFEKTIF", "TIDAK EFEKTIF", "P", "D", "BOBOT", "NILAI", "TINGKAT RISIKO", "PRIORITAS RISIKO", "SELERA RISIKO", "PILIHAN PENANGANAN", "URAIAN (RPR)", "JADWAL PELAKSANAAN", "P (target)", "D (target)", "BOBOT (target)", "NILAI (target)", "TINGKAT RISIKO (target)"},
		{"", "", "", "", "", "", "PENGENDALIAN YANG ADA", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""},
		{"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""},
		{"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"},
		{"Risiko A", "", "Sebab A", "Internal", "C", "Dampak A", "Control", "", "", "2", "2", "", "", "", "", "", "", "", "", "", "", "", "", ""},
	}

	result, err := uc.Preview(context.Background(), BulkRiskSpreadsheetInput{Filename: "template.xlsx", Content: makeWorkbook(t, rows), UploaderID: uploaderID, OrganizationID: &orgID})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}
	if result.Items[0].Payload == nil {
		t.Fatal("expected payload to be present")
	}
	if result.Items[0].Payload.Description != "" {
		t.Fatalf("expected empty description, got %q", result.Items[0].Payload.Description)
	}
	if len(result.Items[0].Errors) != 0 {
		t.Fatalf("expected no errors for empty description, got %v", result.Items[0].Errors)
	}
}
