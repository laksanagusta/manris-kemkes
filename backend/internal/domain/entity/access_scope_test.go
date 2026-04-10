package entity

import (
	"testing"

	"github.com/google/uuid"
)

func TestAccessScope_CanRead(t *testing.T) {
	ownOrg := uuid.New()
	descendant := uuid.New()
	sibling := uuid.New()

	scope := &AccessScope{
		UserID:           uuid.New(),
		Role:             RoleUnit,
		OrganizationID:   &ownOrg,
		AccessibleOrgIDs: []uuid.UUID{ownOrg, descendant},
	}

	t.Run("own org is readable", func(t *testing.T) {
		if !scope.CanRead(ownOrg) {
			t.Error("expected CanRead(ownOrg) = true")
		}
	})

	t.Run("descendant org is readable", func(t *testing.T) {
		if !scope.CanRead(descendant) {
			t.Error("expected CanRead(descendant) = true")
		}
	})

	t.Run("sibling org is not readable", func(t *testing.T) {
		if scope.CanRead(sibling) {
			t.Error("expected CanRead(sibling) = false")
		}
	})
}

func TestAccessScope_CanWrite(t *testing.T) {
	ownOrg := uuid.New()
	descendant := uuid.New()

	scope := &AccessScope{
		UserID:           uuid.New(),
		Role:             RoleUnit,
		OrganizationID:   &ownOrg,
		AccessibleOrgIDs: []uuid.UUID{ownOrg, descendant},
	}

	t.Run("own org is writable", func(t *testing.T) {
		if !scope.CanWrite(ownOrg) {
			t.Error("expected CanWrite(ownOrg) = true")
		}
	})

	t.Run("descendant org is not writable in phase 1", func(t *testing.T) {
		if scope.CanWrite(descendant) {
			t.Error("expected CanWrite(descendant) = false")
		}
	})

	t.Run("nil org means no write", func(t *testing.T) {
		noOrgScope := &AccessScope{
			UserID: uuid.New(),
			Role:   RoleUnit,
		}
		if noOrgScope.CanWrite(ownOrg) {
			t.Error("expected CanWrite with nil OrganizationID = false")
		}
	})
}

func TestAccessScope_NarrowToOrg(t *testing.T) {
	ownOrg := uuid.New()
	descendant := uuid.New()
	outsider := uuid.New()

	scope := &AccessScope{
		UserID:           uuid.New(),
		Role:             RoleReviewer,
		OrganizationID:   &ownOrg,
		AccessibleOrgIDs: []uuid.UUID{ownOrg, descendant},
	}

	t.Run("narrowing to accessible org succeeds", func(t *testing.T) {
		result, err := scope.NarrowToOrg(descendant)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(result) != 1 || result[0] != descendant {
			t.Errorf("expected [%v], got %v", descendant, result)
		}
	})

	t.Run("narrowing to inaccessible org fails", func(t *testing.T) {
		_, err := scope.NarrowToOrg(outsider)
		if err == nil {
			t.Fatal("expected error for inaccessible org")
		}
	})
}

func TestAccessScope_GlobalScope(t *testing.T) {
	globalScope := &AccessScope{
		UserID:   uuid.New(),
		Role:     RoleSuperAdmin,
		IsGlobal: true,
	}

	randomOrg := uuid.New()

	t.Run("superadmin can read any org", func(t *testing.T) {
		if !globalScope.CanRead(randomOrg) {
			t.Error("expected global scope CanRead = true")
		}
	})

	t.Run("superadmin can write any org", func(t *testing.T) {
		if !globalScope.CanWrite(randomOrg) {
			t.Error("expected global scope CanWrite = true")
		}
	})

	t.Run("superadmin can narrow to any org", func(t *testing.T) {
		result, err := globalScope.NarrowToOrg(randomOrg)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(result) != 1 || result[0] != randomOrg {
			t.Errorf("expected [%v], got %v", randomOrg, result)
		}
	})
}

func TestNormalizeRoleAliases(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"superadmin", RoleSuperAdmin},
		{"super_admin", RoleSuperAdmin},
		{"admin", RoleSuperAdmin},
		{"unit", RoleUnit},
		{"reviewer", RoleReviewer},
		{"pimpinan", RolePimpinan},
		{"unknown", "unknown"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got := NormalizeRole(tt.input)
			if got != tt.want {
				t.Errorf("NormalizeRole(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}
