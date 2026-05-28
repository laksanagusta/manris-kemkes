package http

import (
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func TestResolveOperationalOrgIDsUsesOwnOrgOnly(t *testing.T) {
	own := uuid.New()
	descendant := uuid.New()
	scope := &entity.AccessScope{
		Role:             entity.RoleUnit,
		OrganizationID:   &own,
		AccessibleOrgIDs: []uuid.UUID{own, descendant},
	}

	got, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		t.Fatalf("resolveOperationalOrgIDs returned error: %v", err)
	}
	if len(got) != 1 || got[0] != own {
		t.Fatalf("expected own-org-only scope [%s], got %v", own, got)
	}
}

func TestResolveOperationalOrgIDsReturnsEmptySliceForGlobalScope(t *testing.T) {
	got, err := resolveOperationalOrgIDs(&entity.AccessScope{IsGlobal: true}, "")
	if err != nil {
		t.Fatalf("resolveOperationalOrgIDs returned error: %v", err)
	}
	if got == nil {
		t.Fatal("expected empty slice, got nil")
	}
	if len(got) != 0 {
		t.Fatalf("expected empty slice, got %v", got)
	}
}

func TestResolveOperationalOrgIDsRejectsDescendantQuery(t *testing.T) {
	own := uuid.New()
	descendant := uuid.New()
	scope := &entity.AccessScope{
		Role:             entity.RoleReviewer,
		OrganizationID:   &own,
		AccessibleOrgIDs: []uuid.UUID{own, descendant},
	}

	_, err := resolveOperationalOrgIDs(scope, descendant.String())
	if err == nil {
		t.Fatal("expected descendant org query to be rejected on operational surface")
	}
}

func TestResolveReportOrgIDsReturnsEmptySliceForGlobalScope(t *testing.T) {
	got, err := resolveReportOrgIDs(&entity.AccessScope{IsGlobal: true}, "")
	if err != nil {
		t.Fatalf("resolveReportOrgIDs returned error: %v", err)
	}
	if got == nil {
		t.Fatal("expected empty slice, got nil")
	}
	if len(got) != 0 {
		t.Fatalf("expected empty slice, got %v", got)
	}
}

func TestResolveReportOrgIDsAllowsExplicitDescendantSelection(t *testing.T) {
	own := uuid.New()
	descendant := uuid.New()
	scope := &entity.AccessScope{
		Role:             entity.RolePimpinan,
		OrganizationID:   &own,
		AccessibleOrgIDs: []uuid.UUID{own, descendant},
	}

	got, err := resolveReportOrgIDs(scope, descendant.String())
	if err != nil {
		t.Fatalf("resolveReportOrgIDs returned error: %v", err)
	}
	if len(got) != 1 || got[0] != descendant {
		t.Fatalf("expected explicit descendant scope [%s], got %v", descendant, got)
	}
}

func TestResolveReportOrgIDsDefaultsToOwnOrgWhenFilterMissing(t *testing.T) {
	own := uuid.New()
	descendant := uuid.New()
	scope := &entity.AccessScope{
		Role:             entity.RoleUnit,
		OrganizationID:   &own,
		AccessibleOrgIDs: []uuid.UUID{own, descendant},
	}

	got, err := resolveReportOrgIDs(scope, "")
	if err != nil {
		t.Fatalf("resolveReportOrgIDs returned error: %v", err)
	}
	if len(got) != 1 || got[0] != own {
		t.Fatalf("expected own-org-only fallback [%s], got %v", own, got)
	}
}
