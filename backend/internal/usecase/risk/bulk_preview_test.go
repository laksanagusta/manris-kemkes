package risk

import (
	"bytes"
	"context"
	"slices"
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
func (r *fakePreviewOrgRepo) GetDescendants(context.Context, uuid.UUID) ([]uuid.UUID, error) {
	return nil, nil
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

func TestBulkRiskSpreadsheetUseCase_Preview_ResolvesOrganizationByName(t *testing.T) {
	uploaderID := uuid.New()
	orgID := uuid.New()
	uc := NewBulkRiskSpreadsheetUseCase(
		&fakePreviewOrgRepo{orgs: []*entity.Organization{{ID: orgID, Name: "Inspektorat Utama"}}},
		&fakePreviewUserRepo{user: &entity.User{ID: uploaderID, Role: "superadmin"}},
	)

	headers := []string{"Risiko", "Deskripsi", "Kategori Risiko", "Sebab", "Sumber Risiko", "C/UC", "Dampak", "P", "D", "Bobot", "Prioritas Risiko", "Selera Risiko", "Pilihan Penanganan Risiko", "RPR Uraian", "PIC RPR", "Jadwal Pelaksanaan", "Target P", "Target D", "Target Bobot", "Unit Kerja"}
	row := []string{"Risiko A", "Deskripsi A", "operasional", "Sebab A", "Internal", "C", "Dampak A", "2", "2", "1.2", "4", "Dalam batas", "Mitigasi Risiko", "Aksi", "PIC", "Feb 2026", "1", "1", "1.0", "Inspektorat Utama"}

	result, err := uc.Preview(context.Background(), BulkRiskSpreadsheetInput{Filename: "template.xlsx", Content: makeWorkbook(t, [][]string{headers, row}), UploaderID: uploaderID})
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
		t.Fatalf("expected organization id %s, got %+v", orgID, result.Items[0].Payload)
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

	headers := []string{"Risiko", "Deskripsi", "Kategori Risiko", "C/UC", "P", "D", "Target P", "Target D", "Target Bobot"}
	row := []string{"Risiko A", "Deskripsi A", "strategis", "C", "2", "2", "1", "1", "1.0"}

	result, err := uc.Preview(context.Background(), BulkRiskSpreadsheetInput{Filename: "template.xlsx", Content: makeWorkbook(t, [][]string{headers, row}), UploaderID: uploaderID})
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

func TestBulkRiskSpreadsheetUseCase_TemplateIncludesCategoryColumn(t *testing.T) {
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
	if len(f.GetSheetList()) == 0 {
		t.Fatal("expected at least one sheet")
	}
	templateRows, err := f.GetRows("Template Upload")
	if err != nil {
		t.Fatalf("read template sheet: %v", err)
	}
	if len(templateRows) == 0 {
		t.Fatal("expected template header row")
	}
	if !slices.Contains(templateRows[0], "Kategori Risiko") {
		t.Fatalf("expected template to include 'Kategori Risiko' column, got %v", templateRows[0])
	}
}

func TestBulkRiskSpreadsheetUseCase_PreviewMapsCategory(t *testing.T) {
	uploaderID := uuid.New()
	orgID := uuid.New()
	uc := NewBulkRiskSpreadsheetUseCase(
		&fakePreviewOrgRepo{orgs: []*entity.Organization{{ID: orgID, Name: "Inspektorat Utama"}}},
		&fakePreviewUserRepo{user: &entity.User{ID: uploaderID, Role: "superadmin"}},
	)

	headers := []string{"Risiko", "Deskripsi", "Kategori Risiko", "C/UC", "P", "D", "Target P", "Target D", "Target Bobot", "Unit Kerja"}
	row := []string{"Risiko A", "Deskripsi A", "Kepatuhan", "C", "2", "2", "1", "1", "1.0", "Inspektorat Utama"}

	result, err := uc.Preview(context.Background(), BulkRiskSpreadsheetInput{Filename: "template.xlsx", Content: makeWorkbook(t, [][]string{headers, row}), UploaderID: uploaderID})
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
	if result.Items[0].Payload.Category != entity.RiskCategoryKepatuhan {
		t.Fatalf("expected normalized category %q, got %q", entity.RiskCategoryKepatuhan, result.Items[0].Payload.Category)
	}
}

func TestBulkRiskSpreadsheetUseCase_PreviewRejectsInvalidCategory(t *testing.T) {
	uploaderID := uuid.New()
	orgID := uuid.New()
	uc := NewBulkRiskSpreadsheetUseCase(
		&fakePreviewOrgRepo{orgs: []*entity.Organization{{ID: orgID, Name: "Inspektorat Utama"}}},
		&fakePreviewUserRepo{user: &entity.User{ID: uploaderID, Role: "superadmin"}},
	)

	headers := []string{"Risiko", "Deskripsi", "Kategori Risiko", "C/UC", "P", "D", "Target P", "Target D", "Target Bobot", "Unit Kerja"}
	row := []string{"Risiko A", "Deskripsi A", "Kategori Tidak Valid", "C", "2", "2", "1", "1", "1.0", "Inspektorat Utama"}

	result, err := uc.Preview(context.Background(), BulkRiskSpreadsheetInput{Filename: "template.xlsx", Content: makeWorkbook(t, [][]string{headers, row}), UploaderID: uploaderID})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}
	if result.Items[0].Payload != nil {
		t.Fatal("expected payload to be nil for invalid category")
	}
	if len(result.Items[0].Errors) != 1 || result.Items[0].Errors[0] != "Kategori Risiko tidak valid. Gunakan: strategis, operasional, kepatuhan, finansial, reputasi, teknologi_informasi." {
		t.Fatalf("expected explicit invalid category error, got %v", result.Items[0].Errors)
	}
}

func TestBulkRiskSpreadsheetUseCase_PreviewRejectsMissingCategory(t *testing.T) {
	uploaderID := uuid.New()
	orgID := uuid.New()
	uc := NewBulkRiskSpreadsheetUseCase(
		&fakePreviewOrgRepo{orgs: []*entity.Organization{{ID: orgID, Name: "Inspektorat Utama"}}},
		&fakePreviewUserRepo{user: &entity.User{ID: uploaderID, Role: "superadmin"}},
	)

	headers := []string{"Risiko", "Deskripsi", "Kategori Risiko", "C/UC", "P", "D", "Target P", "Target D", "Target Bobot", "Unit Kerja"}
	row := []string{"Risiko A", "Deskripsi A", "", "C", "2", "2", "1", "1", "1.0", "Inspektorat Utama"}

	result, err := uc.Preview(context.Background(), BulkRiskSpreadsheetInput{Filename: "template.xlsx", Content: makeWorkbook(t, [][]string{headers, row}), UploaderID: uploaderID})
	if err != nil {
		t.Fatalf("preview err: %v", err)
	}
	if len(result.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(result.Items))
	}
	if result.Items[0].Payload != nil {
		t.Fatal("expected payload to be nil for missing category")
	}
	if len(result.Items[0].Errors) != 1 || result.Items[0].Errors[0] != "Kolom Kategori Risiko wajib diisi." {
		t.Fatalf("expected explicit missing category error, got %v", result.Items[0].Errors)
	}
}
