package control

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
)

type stubControlRepo struct {
	listOrgIDs      []uuid.UUID
	dashboardOrgIDs []uuid.UUID
}

func (r *stubControlRepo) Create(context.Context, *entity.Control) error { return nil }
func (r *stubControlRepo) GetByID(context.Context, uuid.UUID, []uuid.UUID) (*entity.Control, error) {
	return nil, nil
}
func (r *stubControlRepo) Update(context.Context, *entity.Control) error { return nil }
func (r *stubControlRepo) Delete(context.Context, uuid.UUID) error       { return nil }
func (r *stubControlRepo) List(_ context.Context, orgIDs []uuid.UUID) ([]*entity.Control, error) {
	r.listOrgIDs = append([]uuid.UUID(nil), orgIDs...)
	return []*entity.Control{}, nil
}
func (r *stubControlRepo) GetDashboard(_ context.Context, orgIDs []uuid.UUID) (map[string]interface{}, error) {
	r.dashboardOrgIDs = append([]uuid.UUID(nil), orgIDs...)
	return map[string]interface{}{}, nil
}

type stubOrgRepo struct{}

func (r *stubOrgRepo) Create(context.Context, *entity.Organization) error { return nil }
func (r *stubOrgRepo) GetByID(context.Context, uuid.UUID) (*entity.Organization, error) {
	return nil, nil
}
func (r *stubOrgRepo) Update(context.Context, *entity.Organization) error   { return nil }
func (r *stubOrgRepo) Delete(context.Context, uuid.UUID) error              { return nil }
func (r *stubOrgRepo) List(context.Context) ([]*entity.Organization, error) { return nil, nil }
func (r *stubOrgRepo) ListWithFilter(context.Context, repository.OrganizationListFilter) ([]*entity.Organization, int, error) {
	return nil, 0, nil
}
func (r *stubOrgRepo) GetDescendants(context.Context, uuid.UUID) ([]uuid.UUID, error) {
	return nil, nil
}
func (r *stubOrgRepo) GetContext(context.Context, uuid.UUID) (string, error) {
	return "", nil
}

func TestListControls_PassesOrgIDsDirectly(t *testing.T) {
	repo := &stubControlRepo{}
	orgSvc := service.NewOrganizationHierarchy(&stubOrgRepo{})
	uc := NewListControlsUseCase(repo, orgSvc)

	orgA := uuid.New()
	orgB := uuid.New()

	_, err := uc.Execute(context.Background(), ListControlsInput{
		OrgIDs: []uuid.UUID{orgA, orgB},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(repo.listOrgIDs) != 2 {
		t.Fatalf("expected 2 orgIDs, got %d", len(repo.listOrgIDs))
	}
	if repo.listOrgIDs[0] != orgA || repo.listOrgIDs[1] != orgB {
		t.Fatalf("orgIDs mismatch: got %v, want [%s, %s]", repo.listOrgIDs, orgA, orgB)
	}
}

func TestListControls_NilOrgIDsPassedThrough(t *testing.T) {
	repo := &stubControlRepo{}
	orgSvc := service.NewOrganizationHierarchy(&stubOrgRepo{})
	uc := NewListControlsUseCase(repo, orgSvc)

	_, err := uc.Execute(context.Background(), ListControlsInput{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(repo.listOrgIDs) != 0 {
		t.Fatalf("expected empty orgIDs, got %d", len(repo.listOrgIDs))
	}
}

func TestControlDashboard_PassesOrgIDsDirectly(t *testing.T) {
	repo := &stubControlRepo{}
	orgSvc := service.NewOrganizationHierarchy(&stubOrgRepo{})
	uc := NewControlDashboardUseCase(repo, orgSvc)

	orgA := uuid.New()

	_, err := uc.Execute(context.Background(), ControlDashboardInput{
		OrgIDs: []uuid.UUID{orgA},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(repo.dashboardOrgIDs) != 1 || repo.dashboardOrgIDs[0] != orgA {
		t.Fatalf("orgIDs mismatch: got %v, want [%s]", repo.dashboardOrgIDs, orgA)
	}
}
