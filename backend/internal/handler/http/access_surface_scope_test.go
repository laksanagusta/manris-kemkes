package http

import (
	"errors"
	"slices"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

func TestReadableScopeIncludesAllDescendantsWithoutGrantingWrite(t *testing.T) {
	own, child, grandchild, outside := uuid.New(), uuid.New(), uuid.New(), uuid.New()
	scope := &entity.AccessScope{OrganizationID: &own, AccessibleOrgIDs: []uuid.UUID{own, child, grandchild}}
	got, err := resolveReadableOrgIDs(scope, "")
	if err != nil || !slices.Equal(got, scope.AccessibleOrgIDs) {
		t.Fatalf("read scope = %v, %v", got, err)
	}
	for _, org := range []uuid.UUID{child, grandchild} {
		got, err := resolveReadableOrgIDs(scope, org.String())
		if err != nil || !slices.Equal(got, []uuid.UUID{org}) {
			t.Fatalf("descendant read scope = %v, %v", got, err)
		}
		if scope.CanWrite(org) {
			t.Fatal("descendant read must not grant write")
		}
		if _, err := resolveOperationalOrgIDs(scope, org.String()); !errors.Is(err, domainerrors.ErrForbidden) {
			t.Fatalf("descendant mutation scope must be forbidden, got %v", err)
		}
	}
	if _, err := resolveReadableOrgIDs(scope, outside.String()); !errors.Is(err, domainerrors.ErrForbidden) {
		t.Fatalf("outside read must be forbidden, got %v", err)
	}
	for _, empty := range []*entity.AccessScope{nil, {}} {
		if _, err := resolveReadableOrgIDs(empty, ""); !errors.Is(err, domainerrors.ErrForbidden) {
			t.Fatalf("empty scope must not become unrestricted, got %v", err)
		}
	}
}

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

func TestResolveReportOrgIDsAllowsMultipleExplicitSelections(t *testing.T) {
	own := uuid.New()
	firstDescendant := uuid.New()
	secondDescendant := uuid.New()
	scope := &entity.AccessScope{
		Role:             entity.RolePimpinan,
		OrganizationID:   &own,
		AccessibleOrgIDs: []uuid.UUID{own, firstDescendant, secondDescendant},
	}

	got, err := resolveReportOrgIDs(
		scope,
		firstDescendant.String()+","+secondDescendant.String(),
	)
	if err != nil {
		t.Fatalf("resolveReportOrgIDs returned error: %v", err)
	}
	if len(got) != 2 || got[0] != firstDescendant || got[1] != secondDescendant {
		t.Fatalf(
			"expected explicit multi-org scope [%s %s], got %v",
			firstDescendant,
			secondDescendant,
			got,
		)
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
