package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// MockOrganizationRepository for testing
type mockOrgRepo struct {
	descendants []uuid.UUID
	err         error
}

func (m *mockOrgRepo) Create(ctx context.Context, org *entity.Organization) error {
	return nil
}

func (m *mockOrgRepo) GetByID(ctx context.Context, id uuid.UUID) (*entity.Organization, error) {
	return nil, nil
}

func (m *mockOrgRepo) Update(ctx context.Context, org *entity.Organization) error {
	return nil
}

func (m *mockOrgRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return nil
}

func (m *mockOrgRepo) List(ctx context.Context) ([]*entity.Organization, error) {
	return nil, nil
}

func (m *mockOrgRepo) ListWithFilter(context.Context, repository.OrganizationListFilter) ([]*entity.Organization, int, error) {
	return nil, 0, nil
}

func (m *mockOrgRepo) GetDescendants(ctx context.Context, orgID uuid.UUID) ([]uuid.UUID, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.descendants, nil
}

func (m *mockOrgRepo) GetContext(_ context.Context, _ uuid.UUID) (string, error) {
	return "", nil
}

func TestOrganizationHierarchy_GetAccessibleOrgs(t *testing.T) {
	t.Run("returns descendants for user's organization", func(t *testing.T) {
		orgID := uuid.New()
		child1 := uuid.New()
		child2 := uuid.New()
		expectedIDs := []uuid.UUID{orgID, child1, child2}

		mockRepo := &mockOrgRepo{descendants: expectedIDs}
		svc := NewOrganizationHierarchy(mockRepo)

		ctx := context.Background()
		result, err := svc.GetAccessibleOrgs(ctx, orgID)

		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if len(result) != 3 {
			t.Errorf("expected 3 orgs, got %d", len(result))
		}
	})

	t.Run("handles organization with no children", func(t *testing.T) {
		orgID := uuid.New()
		svc := NewOrganizationHierarchy(&mockOrgRepo{descendants: nil})

		ctx := context.Background()
		result, err := svc.GetAccessibleOrgs(ctx, orgID)

		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if len(result) != 1 {
			t.Errorf("expected 1 org, got %d", len(result))
		}
		if result[0] != orgID {
			t.Errorf("expected orgID %v, got %v", orgID, result[0])
		}
	})
}

func TestOrganizationHierarchy_IsDescendantOf(t *testing.T) {
	t.Run("returns true for descendant", func(t *testing.T) {
		parent := uuid.New()
		child := uuid.New()

		svc := NewOrganizationHierarchy(&mockOrgRepo{descendants: []uuid.UUID{parent, child}})

		ctx := context.Background()
		isDescendant, err := svc.IsDescendantOf(ctx, child, parent)

		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if !isDescendant {
			t.Error("expected true, got false")
		}
	})

	t.Run("returns false for non-descendant", func(t *testing.T) {
		parent := uuid.New()
		child := uuid.New()
		other := uuid.New()

		svc := NewOrganizationHierarchy(&mockOrgRepo{descendants: []uuid.UUID{parent, child}})

		ctx := context.Background()
		isDescendant, err := svc.IsDescendantOf(ctx, other, parent)

		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if isDescendant {
			t.Error("expected false, got true")
		}
	})
}

func TestResolveAccessScopeIncludesDescendants(t *testing.T) {
	orgID := uuid.New()
	child := uuid.New()
	userID := uuid.New()

	svc := NewOrganizationHierarchy(&mockOrgRepo{descendants: []uuid.UUID{orgID, child}})

	scope, err := svc.ResolveAccessScope(context.Background(), userID, "unit", &orgID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if scope.IsGlobal {
		t.Error("expected IsGlobal = false for unit role")
	}
	if len(scope.AccessibleOrgIDs) != 2 {
		t.Fatalf("expected 2 accessible orgs, got %d", len(scope.AccessibleOrgIDs))
	}

	found := false
	for _, id := range scope.AccessibleOrgIDs {
		if id == child {
			found = true
		}
	}
	if !found {
		t.Error("expected child org in accessible orgs")
	}
}

func TestResolveAccessScopeSuperadminIsGlobal(t *testing.T) {
	userID := uuid.New()
	svc := NewOrganizationHierarchy(&mockOrgRepo{})

	scope, err := svc.ResolveAccessScope(context.Background(), userID, "superadmin", nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !scope.IsGlobal {
		t.Error("expected IsGlobal = true for superadmin")
	}
	if scope.AccessibleOrgIDs != nil {
		t.Error("expected nil AccessibleOrgIDs for global scope")
	}
}

func TestResolveAccessScopeNormalizesRole(t *testing.T) {
	orgID := uuid.New()
	userID := uuid.New()

	svc := NewOrganizationHierarchy(&mockOrgRepo{descendants: []uuid.UUID{orgID}})

	scope, err := svc.ResolveAccessScope(context.Background(), userID, "super_admin", nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if scope.Role != "superadmin" {
		t.Errorf("expected role 'superadmin', got %q", scope.Role)
	}
	if !scope.IsGlobal {
		t.Error("expected IsGlobal = true for normalized superadmin")
	}
}

func TestResolveAccessScopeRejectsMissingProtectedOrg(t *testing.T) {
	userID := uuid.New()
	svc := NewOrganizationHierarchy(&mockOrgRepo{})

	_, err := svc.ResolveAccessScope(context.Background(), userID, "unit", nil)
	if err == nil {
		t.Fatal("expected error for non-superadmin with nil orgID")
	}
}
