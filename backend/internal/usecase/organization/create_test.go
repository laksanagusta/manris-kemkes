package organization

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	repo "github.com/manris/backend/internal/domain/repository"
)

type fakeOrgCreateRepo struct {
	created *entity.Organization
}

func (r *fakeOrgCreateRepo) Create(_ context.Context, org *entity.Organization) error {
	r.created = &entity.Organization{
		ID:        org.ID,
		Name:      org.Name,
		ParentID:  org.ParentID,
		UPRLevel:  org.UPRLevel,
		CreatedAt: org.CreatedAt,
	}
	org.ID = uuid.New()
	return nil
}

func (r *fakeOrgCreateRepo) GetByID(_ context.Context, id uuid.UUID) (*entity.Organization, error) {
	if id == uuid.Nil {
		return nil, domainerrors.ErrNotFound
	}
	return &entity.Organization{ID: id, Name: "parent"}, nil
}

func (r *fakeOrgCreateRepo) Update(context.Context, *entity.Organization) error { return nil }
func (r *fakeOrgCreateRepo) Delete(context.Context, uuid.UUID) error            { return nil }
func (r *fakeOrgCreateRepo) List(context.Context) ([]*entity.Organization, error) {
	return nil, nil
}
func (r *fakeOrgCreateRepo) ListWithFilter(context.Context, repo.OrganizationListFilter) ([]*entity.Organization, int, error) {
	return nil, 0, nil
}
func (r *fakeOrgCreateRepo) GetContext(context.Context, uuid.UUID) (string, error) {
	return "", nil
}
func (r *fakeOrgCreateRepo) GetDescendants(context.Context, uuid.UUID) ([]uuid.UUID, error) {
	return []uuid.UUID{}, nil
}

var _ repo.OrganizationRepository = (*fakeOrgCreateRepo)(nil)

func TestCreateOrganizationUseCase_ExecutePersistsUprLevel(t *testing.T) {
	repo := &fakeOrgCreateRepo{}
	uc := NewCreateOrganizationUseCase(repo)
	parentID := uuid.New()

	result, err := uc.Execute(context.Background(), CreateOrganizationInput{
		Name:     "Unit A",
		ParentID: &parentID,
		UPRLevel: "upr_t1",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result == nil {
		t.Fatal("expected output")
	}
	if repo.created == nil {
		t.Fatal("expected organization to be created")
	}
	if repo.created.UPRLevel != "upr_t1" {
		t.Fatalf("expected upr level upr_t1, got %q", repo.created.UPRLevel)
	}
}

func TestCreateOrganizationUseCase_ExecuteRejectsInvalidUprLevel(t *testing.T) {
	repo := &fakeOrgCreateRepo{}
	uc := NewCreateOrganizationUseCase(repo)

	_, err := uc.Execute(context.Background(), CreateOrganizationInput{
		Name:     "Unit A",
		UPRLevel: "invalid",
	})
	if err == nil {
		t.Fatal("expected error")
	}
	if !errors.Is(err, domainerrors.ErrInvalidInput) {
		t.Fatalf("expected invalid input error, got %v", err)
	}
}
