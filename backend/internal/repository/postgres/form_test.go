package postgres_test

import (
	"context"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/repository/postgres"
)

func setupPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://postgres:4msterdam@localhost:5439/manris?sslmode=disable"
	}
	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		t.Fatalf("connect to db: %v", err)
	}
	if _, err := pool.Exec(context.Background(), `ALTER TABLE risks ADD COLUMN IF NOT EXISTS ro_id UUID`); err != nil {
		t.Fatalf("ensure ro_id column: %v", err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func TestFormCreateGetByIDRoundtrip(t *testing.T) {
	pool := setupPool(t)
	repo := postgres.NewFormRepository(pool)
	ctx := context.Background()

	userID := uuid.MustParse("10000000-0000-0000-0000-000000000001")

	desc := "Test form description"
	sectionDesc := "Section two description"
	placeholder := "Enter text..."

	form := &entity.Form{
		Title:          "Roundtrip Test Form",
		Description:    &desc,
		Status:         entity.FormStatusDraft,
		TargetAudience: "all",
		CreatedBy:      userID,
		Sections: []entity.FormSection{
			{
				Title:    "Section One",
				Position: 0,
				Fields: []entity.FormField{
					{
						FieldType:   entity.FieldTypeText,
						FieldKey:    "name",
						Label:       "Full Name",
						Placeholder: &placeholder,
						IsRequired:  true,
						Position:    0,
					},
					{
						FieldType:  entity.FieldTypeRadio,
						FieldKey:   "gender",
						Label:      "Gender",
						IsRequired: true,
						Options: []entity.FieldOption{
							{Value: "m", Label: "Male"},
							{Value: "f", Label: "Female"},
						},
						Position: 1,
					},
				},
			},
			{
				Title:       "Section Two",
				Description: &sectionDesc,
				Position:    1,
				Fields: []entity.FormField{
					{
						FieldType:  entity.FieldTypeDropdown,
						FieldKey:   "province",
						Label:      "Province",
						IsRequired: false,
						Options: []entity.FieldOption{
							{Value: "jkt", Label: "DKI Jakarta"},
							{Value: "jbr", Label: "Jawa Barat"},
							{Value: "jtg", Label: "Jawa Tengah"},
						},
						Position: 0,
					},
				},
			},
		},
	}

	created, err := repo.Create(ctx, form)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if created.ID == uuid.Nil {
		t.Fatal("expected non-nil form ID after Create")
	}
	if created.CreatedAt.IsZero() {
		t.Fatal("expected non-zero CreatedAt")
	}

	t.Cleanup(func() {
		_ = repo.Delete(ctx, created.ID)
	})

	got, err := repo.GetByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}

	if got.Title != "Roundtrip Test Form" {
		t.Errorf("title: got %q, want %q", got.Title, "Roundtrip Test Form")
	}
	if got.Description == nil || *got.Description != desc {
		t.Errorf("description mismatch")
	}
	if got.Status != entity.FormStatusDraft {
		t.Errorf("status: got %q, want %q", got.Status, entity.FormStatusDraft)
	}

	if len(got.Sections) != 2 {
		t.Fatalf("sections: got %d, want 2", len(got.Sections))
	}

	s0 := got.Sections[0]
	if s0.Title != "Section One" {
		t.Errorf("section[0].Title: got %q", s0.Title)
	}
	if s0.Position != 0 {
		t.Errorf("section[0].Position: got %d, want 0", s0.Position)
	}
	if len(s0.Fields) != 2 {
		t.Fatalf("section[0].Fields: got %d, want 2", len(s0.Fields))
	}

	nameField := s0.Fields[0]
	if nameField.FieldType != entity.FieldTypeText {
		t.Errorf("field[0].FieldType: got %q", nameField.FieldType)
	}
	if nameField.FieldKey != "name" {
		t.Errorf("field[0].FieldKey: got %q", nameField.FieldKey)
	}
	if !nameField.IsRequired {
		t.Error("field[0].IsRequired: expected true")
	}
	if nameField.Placeholder == nil || *nameField.Placeholder != placeholder {
		t.Error("field[0].Placeholder mismatch")
	}

	genderField := s0.Fields[1]
	if genderField.FieldType != entity.FieldTypeRadio {
		t.Errorf("field[1].FieldType: got %q", genderField.FieldType)
	}
	if len(genderField.Options) != 2 {
		t.Fatalf("field[1].Options: got %d, want 2", len(genderField.Options))
	}
	if genderField.Options[0].Value != "m" || genderField.Options[0].Label != "Male" {
		t.Errorf("field[1].Options[0]: got %+v", genderField.Options[0])
	}
	if genderField.Options[1].Value != "f" || genderField.Options[1].Label != "Female" {
		t.Errorf("field[1].Options[1]: got %+v", genderField.Options[1])
	}

	s1 := got.Sections[1]
	if s1.Title != "Section Two" {
		t.Errorf("section[1].Title: got %q", s1.Title)
	}
	if s1.Position != 1 {
		t.Errorf("section[1].Position: got %d, want 1", s1.Position)
	}
	if len(s1.Fields) != 1 {
		t.Fatalf("section[1].Fields: got %d, want 1", len(s1.Fields))
	}

	provinceField := s1.Fields[0]
	if provinceField.FieldType != entity.FieldTypeDropdown {
		t.Errorf("province.FieldType: got %q", provinceField.FieldType)
	}
	if len(provinceField.Options) != 3 {
		t.Fatalf("province.Options: got %d, want 3", len(provinceField.Options))
	}
	if provinceField.Options[0].Value != "jkt" {
		t.Errorf("province.Options[0].Value: got %q", provinceField.Options[0].Value)
	}

	t.Log("PASS: Create + GetByID roundtrip verified")
	t.Logf("  Form ID: %s", got.ID)
	t.Logf("  Sections: %d", len(got.Sections))
	t.Logf("  Section[0] fields: %d", len(got.Sections[0].Fields))
	t.Logf("  Section[1] fields: %d", len(got.Sections[1].Fields))
	t.Logf("  Radio options decoded: %d", len(genderField.Options))
	t.Logf("  Dropdown options decoded: %d", len(provinceField.Options))
}
