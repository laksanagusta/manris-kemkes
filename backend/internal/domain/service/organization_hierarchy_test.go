package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
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

func (m *mockOrgRepo) GetDescendants(ctx context.Context, orgID uuid.UUID) ([]uuid.UUID, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.descendants, nil
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
