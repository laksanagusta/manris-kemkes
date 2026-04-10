package form

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type scopeFormRepo struct {
	forms []*entity.Form
}

func (r *scopeFormRepo) Create(_ context.Context, f *entity.Form) (*entity.Form, error) {
	return f, nil
}

func (r *scopeFormRepo) GetByID(_ context.Context, id uuid.UUID) (*entity.Form, error) {
	for _, f := range r.forms {
		if f.ID == id {
			copy := *f
			return &copy, nil
		}
	}
	return nil, fmt.Errorf("not found")
}

func (r *scopeFormRepo) Update(_ context.Context, f *entity.Form) (*entity.Form, error) {
	return f, nil
}

func (r *scopeFormRepo) Delete(_ context.Context, _ uuid.UUID) error { return nil }

func (r *scopeFormRepo) List(_ context.Context, filter repository.FormListFilter) ([]*entity.Form, error) {
	var result []*entity.Form
	for _, f := range r.forms {
		if filter.Status != nil && f.Status != *filter.Status {
			continue
		}
		if len(filter.OrganizationIDs) > 0 {
			if f.OrganizationID == nil {
				continue
			}
			found := false
			for _, oid := range filter.OrganizationIDs {
				if *f.OrganizationID == oid {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}
		result = append(result, f)
	}
	return result, nil
}

func (r *scopeFormRepo) UpdateStatus(_ context.Context, id uuid.UUID, status string) error {
	for _, f := range r.forms {
		if f.ID == id {
			f.Status = status
			return nil
		}
	}
	return fmt.Errorf("not found")
}

func (r *scopeFormRepo) HasResponses(_ context.Context, _ uuid.UUID) (bool, error) {
	return false, nil
}

func (r *scopeFormRepo) GetResponseCount(_ context.Context, _ uuid.UUID) (int, error) {
	return 0, nil
}

type scopeAssignmentRepo struct {
	orgToFormIDs map[uuid.UUID][]uuid.UUID
}

func (r *scopeAssignmentRepo) SetAssignments(_ context.Context, _ uuid.UUID, _ []uuid.UUID) error {
	return nil
}

func (r *scopeAssignmentRepo) GetByFormID(_ context.Context, formID uuid.UUID) ([]*entity.FormAssignment, error) {
	return nil, nil
}

func (r *scopeAssignmentRepo) GetFormIDsForOrganization(_ context.Context, orgID uuid.UUID) ([]uuid.UUID, error) {
	if r.orgToFormIDs == nil {
		return nil, nil
	}
	return r.orgToFormIDs[orgID], nil
}

func validDraftForm(id uuid.UUID, orgID *uuid.UUID) *entity.Form {
	sectionID := uuid.New()
	fieldID := uuid.New()
	return &entity.Form{
		ID:             id,
		Title:          "Test Form",
		Status:         entity.FormStatusDraft,
		TargetAudience: "all",
		OrganizationID: orgID,
		CreatedBy:      uuid.New(),
		Sections: []entity.FormSection{{
			ID:       sectionID,
			FormID:   id,
			Title:    "Section 1",
			Position: 0,
			Fields: []entity.FormField{{
				ID:        fieldID,
				SectionID: sectionID,
				FormID:    id,
				FieldType: entity.FieldTypeText,
				FieldKey:  "name",
				Label:     "Name",
				Position:  0,
				CreatedAt: time.Now(),
			}},
			CreatedAt: time.Now(),
		}},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

func TestFormListRejectsNilScope(t *testing.T) {
	formRepo := &scopeFormRepo{}
	assignRepo := &scopeAssignmentRepo{}
	uc := NewListFormsUseCase(formRepo, assignRepo)

	_, err := uc.Execute(context.Background(), ListFormsInput{Scope: nil})
	if !errors.IsForbidden(err) {
		t.Fatalf("expected ErrForbidden for nil scope, got %v", err)
	}
}

func TestFormListScopedExcludesSiblingOrgs(t *testing.T) {
	orgA := uuid.New()
	orgB := uuid.New()

	formA := &entity.Form{
		ID:             uuid.New(),
		Title:          "Form A",
		Status:         entity.FormStatusDraft,
		TargetAudience: "all",
		OrganizationID: &orgA,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
	formB := &entity.Form{
		ID:             uuid.New(),
		Title:          "Form B",
		Status:         entity.FormStatusDraft,
		TargetAudience: "all",
		OrganizationID: &orgB,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	formRepo := &scopeFormRepo{forms: []*entity.Form{formA, formB}}
	assignRepo := &scopeAssignmentRepo{}
	uc := NewListFormsUseCase(formRepo, assignRepo)

	scope := &entity.AccessScope{
		UserID:           uuid.New(),
		Role:             "unit",
		OrganizationID:   &orgA,
		AccessibleOrgIDs: []uuid.UUID{orgA},
	}

	result, err := uc.Execute(context.Background(), ListFormsInput{Scope: scope})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	for _, s := range result {
		if s.ID == formB.ID {
			t.Fatalf("sibling org form %s should not appear in scoped list", formB.ID)
		}
	}

	foundA := false
	for _, s := range result {
		if s.ID == formA.ID {
			foundA = true
		}
	}
	if !foundA {
		t.Fatal("expected orgA's form in results but not found")
	}
}

func TestFormGetParentCanReadDescendantForm(t *testing.T) {
	parentOrg := uuid.New()
	childOrg := uuid.New()
	formID := uuid.New()

	form := &entity.Form{
		ID:             formID,
		Title:          "Child Form",
		Status:         entity.FormStatusPublished,
		TargetAudience: "all",
		OrganizationID: &childOrg,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	formRepo := &scopeFormRepo{forms: []*entity.Form{form}}
	assignRepo := &scopeAssignmentRepo{}
	uc := NewGetFormUseCase(formRepo, assignRepo)

	scope := &entity.AccessScope{
		UserID:           uuid.New(),
		Role:             "unit",
		OrganizationID:   &parentOrg,
		AccessibleOrgIDs: []uuid.UUID{parentOrg, childOrg},
	}

	result, err := uc.Execute(context.Background(), GetFormInput{
		FormID: formID,
		Scope:  scope,
	})
	if err != nil {
		t.Fatalf("expected parent to read descendant form, got %v", err)
	}
	if result.ID != formID {
		t.Fatalf("expected form %s, got %s", formID, result.ID)
	}
}

func TestFormGetRejectsNilScope(t *testing.T) {
	formRepo := &scopeFormRepo{}
	assignRepo := &scopeAssignmentRepo{}
	uc := NewGetFormUseCase(formRepo, assignRepo)

	_, err := uc.Execute(context.Background(), GetFormInput{
		FormID: uuid.New(),
		Scope:  nil,
	})
	if !errors.IsForbidden(err) {
		t.Fatalf("expected ErrForbidden for nil scope, got %v", err)
	}
}

func TestFormUpdateRejectsParentWritingChildOwnedForm(t *testing.T) {
	parentOrg := uuid.New()
	childOrg := uuid.New()
	formID := uuid.New()

	form := validDraftForm(formID, &childOrg)
	formRepo := &scopeFormRepo{forms: []*entity.Form{form}}
	assignRepo := &scopeAssignmentRepo{}
	uc := NewUpdateFormUseCase(formRepo, assignRepo)

	scope := &entity.AccessScope{
		UserID:           uuid.New(),
		Role:             "unit",
		OrganizationID:   &parentOrg,
		AccessibleOrgIDs: []uuid.UUID{parentOrg, childOrg},
	}

	_, err := uc.Execute(context.Background(), UpdateFormInput{
		FormID:    formID,
		UpdaterID: scope.UserID,
		Scope:     scope,
		Title:     "Updated Title",
		Sections: []SectionInput{{
			Title:    "S1",
			Position: 0,
			Fields: []FieldInput{{
				FieldType: entity.FieldTypeText,
				Label:     "Name",
				Position:  0,
			}},
		}},
		TargetAudience: "all",
	})
	if !errors.IsForbidden(err) {
		t.Fatalf("expected ErrForbidden when parent writes child-owned form, got %v", err)
	}
}

func TestFormUpdateRejectsNilScope(t *testing.T) {
	formRepo := &scopeFormRepo{}
	assignRepo := &scopeAssignmentRepo{}
	uc := NewUpdateFormUseCase(formRepo, assignRepo)

	_, err := uc.Execute(context.Background(), UpdateFormInput{
		FormID: uuid.New(),
		Scope:  nil,
	})
	if !errors.IsForbidden(err) {
		t.Fatalf("expected ErrForbidden for nil scope, got %v", err)
	}
}

func TestFormUpdateAllowsOwnerWrite(t *testing.T) {
	orgA := uuid.New()
	formID := uuid.New()

	form := validDraftForm(formID, &orgA)
	formRepo := &scopeFormRepo{forms: []*entity.Form{form}}
	assignRepo := &scopeAssignmentRepo{}
	uc := NewUpdateFormUseCase(formRepo, assignRepo)

	scope := &entity.AccessScope{
		UserID:           uuid.New(),
		Role:             "unit",
		OrganizationID:   &orgA,
		AccessibleOrgIDs: []uuid.UUID{orgA},
	}

	_, err := uc.Execute(context.Background(), UpdateFormInput{
		FormID:    formID,
		UpdaterID: scope.UserID,
		Scope:     scope,
		Title:     "Updated Title",
		Sections: []SectionInput{{
			Title:    "S1",
			Position: 0,
			Fields: []FieldInput{{
				FieldType: entity.FieldTypeText,
				Label:     "Name",
				Position:  0,
			}},
		}},
		TargetAudience: "all",
	})
	if err != nil {
		t.Fatalf("expected owner to write own form, got %v", err)
	}
}

func TestFormPublishRejectsParentOnChildOwnedForm(t *testing.T) {
	parentOrg := uuid.New()
	childOrg := uuid.New()
	formID := uuid.New()

	form := validDraftForm(formID, &childOrg)
	formRepo := &scopeFormRepo{forms: []*entity.Form{form}}
	assignRepo := &scopeAssignmentRepo{}
	uc := NewPublishFormUseCase(formRepo, assignRepo)

	scope := &entity.AccessScope{
		UserID:           uuid.New(),
		Role:             "unit",
		OrganizationID:   &parentOrg,
		AccessibleOrgIDs: []uuid.UUID{parentOrg, childOrg},
	}

	_, err := uc.Execute(context.Background(), PublishFormInput{
		FormID: formID,
		Scope:  scope,
	})
	if !errors.IsForbidden(err) {
		t.Fatalf("expected ErrForbidden when parent publishes child-owned form, got %v", err)
	}
}

func TestFormPublishRejectsNilScope(t *testing.T) {
	formRepo := &scopeFormRepo{}
	assignRepo := &scopeAssignmentRepo{}
	uc := NewPublishFormUseCase(formRepo, assignRepo)

	_, err := uc.Execute(context.Background(), PublishFormInput{
		FormID: uuid.New(),
		Scope:  nil,
	})
	if !errors.IsForbidden(err) {
		t.Fatalf("expected ErrForbidden for nil scope, got %v", err)
	}
}

func TestFormPublishAllowsOwner(t *testing.T) {
	orgA := uuid.New()
	formID := uuid.New()

	form := validDraftForm(formID, &orgA)
	formRepo := &scopeFormRepo{forms: []*entity.Form{form}}
	assignRepo := &scopeAssignmentRepo{}
	uc := NewPublishFormUseCase(formRepo, assignRepo)

	scope := &entity.AccessScope{
		UserID:           uuid.New(),
		Role:             "unit",
		OrganizationID:   &orgA,
		AccessibleOrgIDs: []uuid.UUID{orgA},
	}

	result, err := uc.Execute(context.Background(), PublishFormInput{
		FormID: formID,
		Scope:  scope,
	})
	if err != nil {
		t.Fatalf("expected owner to publish own form, got %v", err)
	}
	if result.Status != entity.FormStatusPublished {
		t.Fatalf("expected status published, got %s", result.Status)
	}
}

func TestFormDeleteRejectsParentOnChildOwnedForm(t *testing.T) {
	parentOrg := uuid.New()
	childOrg := uuid.New()
	formID := uuid.New()

	form := validDraftForm(formID, &childOrg)
	formRepo := &scopeFormRepo{forms: []*entity.Form{form}}
	uc := NewDeleteFormUseCase(formRepo)

	scope := &entity.AccessScope{
		UserID:           uuid.New(),
		Role:             "unit",
		OrganizationID:   &parentOrg,
		AccessibleOrgIDs: []uuid.UUID{parentOrg, childOrg},
	}

	_, err := uc.Execute(context.Background(), DeleteFormInput{
		FormID: formID,
		Scope:  scope,
	})
	if !errors.IsForbidden(err) {
		t.Fatalf("expected ErrForbidden when parent deletes child-owned form, got %v", err)
	}
}

func TestFormDeleteRejectsNilScope(t *testing.T) {
	formRepo := &scopeFormRepo{}
	uc := NewDeleteFormUseCase(formRepo)

	_, err := uc.Execute(context.Background(), DeleteFormInput{
		FormID: uuid.New(),
		Scope:  nil,
	})
	if !errors.IsForbidden(err) {
		t.Fatalf("expected ErrForbidden for nil scope, got %v", err)
	}
}
