package http

import (
	"bytes"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/identity/domain"
	"testing"
)

func TestSharedAuthUserDirectoryScopeAndFilters(t *testing.T) {
	f := newSharedAuthFixture(t)
	manris := f.login(t, manrisTestKey)
	key := f.createApp(t, "products", manris.Token)
	token := f.login(t, key).Token
	otherOrg := uuid.New()
	child := &domain.User{ID: uuid.New(), Name: "Child Reviewer", Email: "child@example.test", Role: domain.RoleReviewer, Status: domain.UserStatusActive, OrganizationID: &f.orgs.child.ID, NIP: "456", PasswordHash: "secret-target-hash"}
	outsider := &domain.User{ID: uuid.New(), Name: "Outside", Role: domain.RoleUnit, Status: domain.UserStatusInactive, OrganizationID: &otherOrg}
	unassigned := &domain.User{ID: uuid.New(), Name: "No organization", Role: domain.RoleUnit, Status: domain.UserStatusActive}
	f.users.directoryUsers = []*domain.User{child, outsider, unassigned}
	f.users.user.OrganizationID = &f.orgs.org.ID
	assertPage := func(path string, wantTotal, wantSize int) {
		t.Helper()
		data := f.request(t, "GET", path, token, key, nil, 200)
		var result domain.DirectoryPage
		if err := json.Unmarshal(data, &result); err != nil {
			t.Fatal(err)
		}
		if result.Total != wantTotal || len(result.Data) != wantSize {
			t.Fatalf("unexpected page %s", data)
		}
		for _, field := range []string{"password", "PasswordHash", "lastLoggedIn", "capabilities", "accessibleOrgIds", "secret-target-hash"} {
			if bytes.Contains(data, []byte(field)) {
				t.Fatalf("directory exposes sensitive field %s", field)
			}
		}
	}
	// Live global superadmin may see all shared accounts, including unassigned users.
	assertPage("/auth/users?page=1&limit=2", 4, 2)
	f.request(t, "GET", "/auth/users/"+outsider.ID.String(), token, key, nil, 200)
	// Changing the caller role immediately narrows both list and detail without re-login.
	f.users.user.Role = domain.RoleUnit
	assertPage("/auth/users", 2, 2)
	assertPage("/auth/users?global=true&allowedOrgIds="+otherOrg.String(), 2, 2)
	assertPage("/auth/users?role=reviewer&status=active&q=456", 1, 1)
	assertPage("/auth/users?organization_id="+f.orgs.child.ID.String(), 1, 1)
	assertPage("/auth/users?page=3&limit=1", 2, 0)
	f.request(t, "GET", "/auth/users?organization_id="+otherOrg.String(), token, key, nil, 403)
	detail := f.request(t, "GET", "/auth/users/"+child.ID.String(), token, key, nil, 200)
	if bytes.Contains(detail, []byte("secret-target-hash")) || bytes.Contains(detail, []byte("mustChangePassword")) {
		t.Fatal("detail leaks security fields")
	}
	for _, id := range []uuid.UUID{outsider.ID, unassigned.ID, uuid.New()} {
		f.request(t, "GET", "/auth/users/"+id.String(), token, key, nil, 404)
	}
	for _, query := range []string{"page=bad", "page=0", "page=1000001", "limit=101", "limit=-1", "role=unknown", "status=unknown", "organization_id=bad"} {
		f.request(t, "GET", "/auth/users?"+query, token, key, nil, 422)
	}
	f.request(t, "GET", "/auth/users/not-a-uuid", token, key, nil, 422)
	f.request(t, "GET", "/auth/users", token, manrisTestKey, nil, 401)
	f.request(t, "GET", "/auth/users/"+child.ID.String(), token, manrisTestKey, nil, 401)
	f.request(t, "GET", "/auth/users", "", key, nil, 401)
	f.users.user.MustChangePassword = true
	f.request(t, "GET", "/auth/users", token, key, nil, 401)
	f.users.user.MustChangePassword = false
	f.request(t, "POST", "/auth/logout", token, key, nil, 204)
	f.request(t, "GET", "/auth/users", token, key, nil, 401)
}

func TestSharedAuthUserDirectoryRejectsSetupSession(t *testing.T) {
	f := newSharedAuthFixture(t)
	f.users.user.MustChangePassword = true
	token := f.login(t, manrisTestKey).Token
	f.request(t, "GET", "/auth/users", token, manrisTestKey, nil, 403)
	f.request(t, "GET", "/auth/users/"+f.users.user.ID.String(), token, manrisTestKey, nil, 403)
}
