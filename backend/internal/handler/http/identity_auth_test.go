package http

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http/httptest"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/identity/domain"
	identity "github.com/manris/backend/internal/identity/service"
	"github.com/manris/backend/internal/middleware"
	"golang.org/x/crypto/bcrypt"
)

const manrisTestKey = "auth_app_AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8"

const sharedTestSecret = "dummy-secret-for-identity-tests-32-bytes"

type memoryIdentityStore struct {
	apps     map[string]*domain.Application
	sessions map[uuid.UUID]*domain.Session
	err      error
}

func (s *memoryIdentityStore) Application(_ context.Context, id string) (*domain.Application, error) {
	if s.err != nil {
		return nil, s.err
	}
	a := s.apps[id]
	if a == nil || !a.Active {
		return nil, domainerrors.ErrUnauthorized
	}
	return a, nil
}
func (s *memoryIdentityStore) ApplicationByKey(_ context.Context, hash string) (*domain.Application, error) {
	if s.err != nil {
		return nil, s.err
	}
	for _, a := range s.apps {
		if a.Active && a.KeyHash == hash {
			return a, nil
		}
	}
	return nil, domainerrors.ErrUnauthorized
}
func (s *memoryIdentityStore) CreateApplication(_ context.Context, a *domain.Application, _ uuid.UUID) error {
	if s.apps[a.ID] != nil {
		return domainerrors.ErrConflict
	}
	s.apps[a.ID] = a
	return nil
}
func (s *memoryIdentityStore) ListApplications(context.Context) ([]*domain.Application, error) {
	apps := make([]*domain.Application, 0)
	for _, a := range s.apps {
		apps = append(apps, a)
	}
	return apps, nil
}
func (s *memoryIdentityStore) RotateKey(_ context.Context, id, hash string, _ uuid.UUID) error {
	a := s.apps[id]
	if a == nil {
		return domainerrors.ErrNotFound
	}
	a.KeyHash = hash
	a.KeyVersion++
	return nil
}
func (s *memoryIdentityStore) DisableApplication(_ context.Context, id string, _ uuid.UUID) error {
	a := s.apps[id]
	if a == nil {
		return domainerrors.ErrNotFound
	}
	a.Active = false
	a.KeyVersion++
	return nil
}
func (s *memoryIdentityStore) CreateSession(_ context.Context, session *domain.Session) error {
	a := s.apps[session.ApplicationID]
	if a == nil || !a.Active || a.KeyVersion != session.KeyVersion {
		return domainerrors.ErrUnauthorized
	}
	s.sessions[session.ID] = session
	return nil
}
func (s *memoryIdentityStore) Session(_ context.Context, id uuid.UUID) (*domain.Session, error) {
	session := s.sessions[id]
	if session == nil {
		return nil, domainerrors.ErrUnauthorized
	}
	return session, nil
}
func (s *memoryIdentityStore) RevokeSession(_ context.Context, id uuid.UUID) error {
	delete(s.sessions, id)
	return nil
}

type sharedOrgDirectory struct {
	org   *domain.Organization
	child *domain.Organization
}

func (o *sharedOrgDirectory) GetByID(_ context.Context, id uuid.UUID) (*domain.Organization, error) {
	if id == o.org.ID {
		return o.org, nil
	}
	if id == o.child.ID {
		return o.child, nil
	}
	return nil, domainerrors.ErrNotFound
}
func (o *sharedOrgDirectory) GetDescendants(context.Context, uuid.UUID) ([]uuid.UUID, error) {
	return []uuid.UUID{o.org.ID, o.child.ID}, nil
}
func (o *sharedOrgDirectory) List(context.Context) ([]*domain.Organization, error) {
	return []*domain.Organization{o.org, o.child}, nil
}

type sharedAuthFixture struct {
	app   *fiber.App
	svc   *identity.Service
	store *memoryIdentityStore
	users *sharedUserDirectory
	orgs  *sharedOrgDirectory
}

func newSharedAuthFixture(t *testing.T) *sharedAuthFixture {
	t.Helper()
	hash, err := bcrypt.GenerateFromPassword([]byte("Password123!"), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	users := &sharedUserDirectory{loginStubUserRepo: loginStubUserRepo{user: &entity.User{ID: uuid.New(), Username: "dika", Name: "Dika", Email: "dummy@example.test", NIP: "123", Role: entity.RoleSuperAdmin, Status: entity.UserStatusActive, PasswordHash: string(hash)}}}
	store := &memoryIdentityStore{apps: map[string]*domain.Application{"manris": {ID: "manris", Name: "Manris", Active: true, KeyVersion: 1, KeyHash: fmt.Sprintf("%x", sha256.Sum256([]byte(manrisTestKey)))}}, sessions: make(map[uuid.UUID]*domain.Session)}
	orgs := &sharedOrgDirectory{org: &domain.Organization{ID: uuid.New(), Name: "Direktorat A"}, child: &domain.Organization{ID: uuid.New(), Name: "Unit A"}}
	svc, err := identity.New(store, users, orgs, sharedTestSecret, time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	app := fiber.New()
	api := app.Group("/api/v1")
	h := NewIdentityAuthHandler(svc, true)
	h.RegisterPublicRoutes(api)
	api.Get("/auth/register/organizations", func(c *fiber.Ctx) error { return c.SendStatus(200) })
	api.Post("/auth/register", func(c *fiber.Ctx) error { return c.SendStatus(201) })
	h.RegisterManagementRoutes(api)
	protected := api.Group("", middleware.IdentityRequired(svc, "manris"), middleware.RequireFullSession())
	protected.Get("/products", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"role": c.Locals("role"), "name": c.Locals("username"), "scope": middleware.GetAccessScope(c)})
	})
	return &sharedAuthFixture{app: app, svc: svc, store: store, users: users, orgs: orgs}
}
func (f *sharedAuthFixture) request(t *testing.T, method, path, token, key string, body any, want int) []byte {
	t.Helper()
	var data []byte
	if body != nil {
		var err error
		data, err = json.Marshal(body)
		if err != nil {
			t.Fatal(err)
		}
	}
	req := httptest.NewRequest(method, "/api/v1"+path, bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	if key != "" {
		req.Header.Set("X-App-Key", key)
	}
	res, err := f.app.Test(req, 5000)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	data, err = io.ReadAll(res.Body)
	if err != nil {
		t.Fatal(err)
	}
	if res.StatusCode != want {
		t.Fatalf("%s %s got %d want %d: %s", method, path, res.StatusCode, want, data)
	}
	if strings.HasPrefix(path, "/auth/") && !strings.HasPrefix(path, "/auth/register") && res.Header.Get("Cache-Control") != "no-store" && want < 400 {
		t.Fatal("missing no-store")
	}
	return data
}
func (f *sharedAuthFixture) login(t *testing.T, key string) domain.LoginResult {
	t.Helper()
	data := f.request(t, "POST", "/auth/login", "", key, map[string]string{"nip": "123", "password": "Password123!"}, 200)
	var body struct {
		Data domain.LoginResult `json:"data"`
	}
	if err := json.Unmarshal(data, &body); err != nil {
		t.Fatal(err)
	}
	if body.Data.Token == "" {
		t.Fatal("missing token")
	}
	return body.Data
}
func (f *sharedAuthFixture) createApp(t *testing.T, id, manrisToken string) string {
	t.Helper()
	data := f.request(t, "POST", "/auth/apps", manrisToken, manrisTestKey, map[string]string{"id": id, "name": "Application " + id}, 201)
	var body struct {
		Data identity.GeneratedApplication `json:"data"`
	}
	if err := json.Unmarshal(data, &body); err != nil {
		t.Fatal(err)
	}
	return body.Data.AppKey
}

func TestSharedAuthApplicationIsolationAndGlobalIdentity(t *testing.T) {
	f := newSharedAuthFixture(t)
	manris := f.login(t, manrisTestKey)
	key := f.createApp(t, "products", manris.Token)
	otherKey := f.createApp(t, "inventory", manris.Token)
	external := f.login(t, key)
	if manris.User.ID != external.User.ID || manris.User.Role != external.User.Role {
		t.Fatal("identity or global role differs by application")
	}
	f.request(t, "GET", "/auth/me", external.Token, key, nil, 200)
	f.request(t, "GET", "/auth/me", external.Token, otherKey, nil, 401)
	f.request(t, "GET", "/auth/me", external.Token, "", nil, 401)
	f.request(t, "GET", "/auth/organizations", external.Token, "", nil, 401)
	f.request(t, "GET", "/auth/organizations", external.Token, key, nil, 200)
	f.request(t, "GET", "/auth/organizations", manris.Token, manrisTestKey, nil, 200)
	f.request(t, "GET", "/auth/me", manris.Token, key, nil, 401)
	f.request(t, "GET", "/products", external.Token, key, nil, 401)
	f.request(t, "GET", "/products", manris.Token, "", nil, 200)
	me := f.request(t, "GET", "/auth/me", external.Token, key, nil, 200)
	if bytes.Contains(me, []byte("capabilities")) || bytes.Contains(me, []byte("PasswordHash")) {
		t.Fatal("external identity leaks application flags or password data")
	}
	internalMe := f.request(t, "GET", "/auth/me", manris.Token, manrisTestKey, nil, 200)
	if !bytes.Contains(internalMe, []byte(`"riskApprovalWorkflowEnabled":true`)) {
		t.Fatal("Manris feature flags missing")
	}
	f.request(t, "GET", "/auth/apps", external.Token, key, nil, 401)
	f.request(t, "GET", "/auth/apps", manris.Token, key, nil, 401)
	apps := f.request(t, "GET", "/auth/apps", manris.Token, manrisTestKey, nil, 200)
	if bytes.Contains(apps, []byte(key)) || bytes.Contains(apps, []byte("keyHash")) {
		t.Fatal("application listing leaks credentials")
	}
	f.request(t, "POST", "/auth/register", "", manrisTestKey, map[string]string{}, 201)
	f.request(t, "GET", "/auth/register/organizations", "", manrisTestKey, nil, 200)
	f.request(t, "GET", "/auth/roles", external.Token, key, nil, 200)
	// Roles, organization membership and hierarchy are read live for both applications.
	f.users.user.Role = entity.RoleReviewer
	f.users.user.OrganizationID = &f.orgs.org.ID
	for _, entry := range []struct{ token, key string }{{manris.Token, manrisTestKey}, {external.Token, key}} {
		data := f.request(t, "GET", "/auth/me", entry.token, entry.key, nil, 200)
		if !bytes.Contains(data, []byte(`"role":"reviewer"`)) || !bytes.Contains(data, []byte(f.orgs.child.ID.String())) {
			t.Fatal("shared role or organization change is stale")
		}
	}
	f.request(t, "GET", "/auth/apps", manris.Token, manrisTestKey, nil, 403)
	f.request(t, "GET", "/auth/organizations", external.Token, key, nil, 200)
}
func TestSharedAuthSessionRevocation(t *testing.T) {
	cases := []struct {
		name   string
		change func(*testing.T, *sharedAuthFixture, string, string) string
	}{
		{"logout", func(t *testing.T, f *sharedAuthFixture, key, token string) string {
			f.request(t, "POST", "/auth/logout", token, key, nil, 204)
			return key
		}},
		{"inactive user", func(t *testing.T, f *sharedAuthFixture, key, _ string) string {
			f.users.user.Status = entity.UserStatusInactive
			return key
		}},
		{"password changed", func(t *testing.T, f *sharedAuthFixture, key, _ string) string {
			f.users.user.PasswordHash = "changed-password-hash"
			return key
		}},
		{"application disabled", func(t *testing.T, f *sharedAuthFixture, key, _ string) string {
			if err := f.svc.DisableApplication(context.Background(), "products", f.users.user.ID); err != nil {
				t.Fatal(err)
			}
			return key
		}},
		{"key rotated", func(t *testing.T, f *sharedAuthFixture, _, _ string) string {
			key, err := f.svc.RotateKey(context.Background(), "products", f.users.user.ID)
			if err != nil {
				t.Fatal(err)
			}
			return key
		}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			f := newSharedAuthFixture(t)
			manris := f.login(t, manrisTestKey)
			key := f.createApp(t, "products", manris.Token)
			external := f.login(t, key)
			newKey := tc.change(t, f, key, external.Token)
			f.request(t, "GET", "/auth/me", external.Token, newKey, nil, 401)
			if tc.name == "key rotated" {
				f.request(t, "POST", "/auth/login", "", key, map[string]string{"nip": "123", "password": "Password123!"}, 401)
				f.login(t, newKey)
			}
		})
	}
}
func TestSharedAuthPasswordChangeRevokesAllApplications(t *testing.T) {
	f := newSharedAuthFixture(t)
	manris := f.login(t, manrisTestKey)
	key := f.createApp(t, "products", manris.Token)
	external := f.login(t, key)
	f.request(t, "POST", "/auth/change-password", external.Token, key, map[string]string{"newPassword": "NewPassword123!", "confirmPassword": "NewPassword123!"}, 401)
	data := f.request(t, "POST", "/auth/change-password", external.Token, key, map[string]string{"currentPassword": "Password123!", "newPassword": "NewPassword123!", "confirmPassword": "NewPassword123!"}, 200)
	var body struct {
		Data domain.LoginResult `json:"data"`
	}
	if err := json.Unmarshal(data, &body); err != nil {
		t.Fatal(err)
	}
	if body.Data.AppID != "products" {
		t.Fatal("password change issued token for wrong application")
	}
	f.request(t, "GET", "/auth/me", external.Token, key, nil, 401)
	f.request(t, "GET", "/products", manris.Token, "", nil, 401)
	f.request(t, "GET", "/auth/me", body.Data.Token, key, nil, 200)
	f.request(t, "GET", "/products", body.Data.Token, "", nil, 401)
}
func TestSharedAuthProfileUpdateAndSetupSession(t *testing.T) {
	f := newSharedAuthFixture(t)
	manris := f.login(t, manrisTestKey)
	key := f.createApp(t, "products", manris.Token)
	external := f.login(t, key)
	f.request(t, "PUT", "/auth/me", external.Token, key, map[string]string{"name": "Updated Name", "email": "updated@example.test", "nip": "123", "role": "unit"}, 200)
	me := f.request(t, "GET", "/auth/me", manris.Token, manrisTestKey, nil, 200)
	if !bytes.Contains(me, []byte(`"name":"Updated Name"`)) || !bytes.Contains(me, []byte(`"role":"superadmin"`)) {
		t.Fatal("profile update was not shared or allowed role self-assignment")
	}
	f.users.user.MustChangePassword = true
	f.request(t, "GET", "/products", manris.Token, "", nil, 403)
	f.request(t, "GET", "/auth/me", external.Token, key, nil, 401)
	f.request(t, "POST", "/auth/login", "", key, map[string]string{"nip": "123", "password": "Password123!"}, 401)
	setup := f.login(t, manrisTestKey)
	if setup.SessionMode != "setup" {
		t.Fatal("missing restricted setup session")
	}
	f.request(t, "GET", "/products", setup.Token, "", nil, 403)
	f.request(t, "POST", "/auth/change-password", setup.Token, manrisTestKey, map[string]string{"newPassword": "NewPassword123!", "confirmPassword": "NewPassword123!"}, 200)
}
func TestSharedAuthInvalidTokensAndUnavailableService(t *testing.T) {
	f := newSharedAuthFixture(t)
	manris := f.login(t, manrisTestKey)
	var claims jwt.RegisteredClaims
	_, err := jwt.ParseWithClaims(manris.Token, &claims, func(_ *jwt.Token) (any, error) { return []byte(sharedTestSecret), nil })
	if err != nil {
		t.Fatal(err)
	}
	cases := []struct {
		name   string
		claims jwt.RegisteredClaims
		method jwt.SigningMethod
	}{
		{"wrong issuer", claims, jwt.SigningMethodHS256}, {"missing expiry", claims, jwt.SigningMethodHS256},
		{"expired", claims, jwt.SigningMethodHS256}, {"wrong algorithm", claims, jwt.SigningMethodHS384},
		{"multiple audiences", claims, jwt.SigningMethodHS256}, {"missing session", claims, jwt.SigningMethodHS256},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			switch tc.name {
			case "wrong issuer":
				tc.claims.Issuer = "wrong"
			case "missing expiry":
				tc.claims.ExpiresAt = nil
			case "expired":
				tc.claims.ExpiresAt = jwt.NewNumericDate(time.Now().Add(-time.Hour))
			case "multiple audiences":
				tc.claims.Audience = jwt.ClaimStrings{"manris", "products"}
			case "missing session":
				tc.claims.ID = uuid.New().String()
			}
			token, err := jwt.NewWithClaims(tc.method, tc.claims).SignedString([]byte(sharedTestSecret))
			if err != nil {
				t.Fatal(err)
			}
			f.request(t, "GET", "/products", token, "", nil, 401)
		})
	}
	f.request(t, "GET", "/products", "malformed", "", nil, 401)
	f.request(t, "GET", "/products", "", "", nil, 401)
	legacy, err := middleware.GenerateToken(f.users.user.ID, "dummy", "superadmin", "", false, sharedTestSecret, 1)
	if err != nil {
		t.Fatal(err)
	}
	f.request(t, "GET", "/products", legacy, "", nil, 401)
	f.store.err = errors.New("database outage with secret details")
	data := f.request(t, "GET", "/auth/me", manris.Token, manrisTestKey, nil, 503)
	if bytes.Contains(data, []byte("secret details")) {
		t.Fatal("error leaks backend details")
	}
	f.request(t, "GET", "/products", manris.Token, "", nil, 503)
}
func TestSharedAuthLoginRateLimit(t *testing.T) {
	f := newSharedAuthFixture(t)
	for range 20 {
		f.request(t, "POST", "/auth/login", "", manrisTestKey, map[string]string{"nip": "123", "password": "wrong"}, 401)
	}
	f.request(t, "POST", "/auth/login", "", manrisTestKey, map[string]string{"nip": "123", "password": "wrong"}, 429)
	f.request(t, "POST", "/auth/login", "", manrisTestKey, map[string]string{"nip": "456", "password": "wrong"}, 401)
}

type sharedUserDirectory struct {
	loginStubUserRepo
	directoryUsers []*domain.User
}

func (r *sharedUserDirectory) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	var u *domain.User
	for _, candidate := range append([]*domain.User{r.user}, r.directoryUsers...) {
		if candidate.ID == id {
			u = candidate
			break
		}
	}
	if u == nil {
		return nil, domainerrors.ErrNotFound
	}
	var err error
	if u == nil || err != nil {
		return u, err
	}
	copy := *u
	return &copy, nil
}
func (r *sharedUserDirectory) GetByNIP(ctx context.Context, nip string) (*domain.User, error) {
	u, err := r.loginStubUserRepo.GetByNIP(ctx, nip)
	if u == nil || err != nil {
		return u, err
	}
	copy := *u
	return &copy, nil
}
func (r *sharedUserDirectory) UpdateProfile(_ context.Context, _ uuid.UUID, p domain.ProfileUpdate) error {
	r.user.Name = p.Name
	r.user.Email = p.Email
	r.user.NIP = p.NIP
	r.user.Jabatan = p.Jabatan
	r.user.Pangkat = p.Pangkat
	return nil
}
func (r *sharedUserDirectory) ChangePassword(_ context.Context, _ uuid.UUID, expected, newHash string) error {
	if r.user.PasswordHash != expected {
		return domainerrors.ErrUnauthorized
	}
	r.user.PasswordHash = newHash
	r.user.MustChangePassword = false
	return nil
}

func TestSharedAuthEmptyApplicationKeyCannotFallBack(t *testing.T) {
	f := newSharedAuthFixture(t)
	req := httptest.NewRequest("POST", "/api/v1/auth/login", strings.NewReader(`{"nip":"123","password":"Password123!"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-App-Key", "")
	res, err := f.app.Test(req, 5000)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != 401 {
		t.Fatalf("empty app key fell back to Manris login: %d", res.StatusCode)
	}
}
func TestSharedAuthExpiredStoredSessionIsRejected(t *testing.T) {
	f := newSharedAuthFixture(t)
	r := f.login(t, manrisTestKey)
	for _, session := range f.store.sessions {
		session.ExpiresAt = time.Now().Add(-time.Minute)
	}
	f.request(t, "GET", "/products", r.Token, "", nil, 401)
}

func TestSharedAuthRequiresApplicationKeyForAllRoutes(t *testing.T) {
	f := newSharedAuthFixture(t)
	manris := f.login(t, manrisTestKey)
	for _, entry := range []struct{ method, path string }{
		{"POST", "/auth/login"}, {"GET", "/auth/me"}, {"PUT", "/auth/me"},
		{"POST", "/auth/logout"}, {"GET", "/auth/organizations"}, {"GET", "/auth/roles"}, {"GET", "/auth/users"}, {"GET", "/auth/users/" + f.users.user.ID.String()},
		{"POST", "/auth/change-password"}, {"GET", "/auth/apps"}, {"POST", "/auth/apps"},
		{"POST", "/auth/apps/products/rotate-key"}, {"DELETE", "/auth/apps/products"},
		{"POST", "/auth/register"}, {"GET", "/auth/register/organizations"},
	} {
		t.Run(entry.method+entry.path, func(t *testing.T) {
			f.request(t, entry.method, entry.path, manris.Token, "", nil, 401)
			f.request(t, entry.method, entry.path, manris.Token, "invalid-key", nil, 401)
		})
	}
}

func (r *sharedUserDirectory) ListDirectory(_ context.Context, f domain.DirectoryFilter) ([]*domain.DirectoryUser, int, error) {
	matches := make([]*domain.DirectoryUser, 0)
	for _, u := range append([]*domain.User{r.user}, r.directoryUsers...) {
		visible := f.Global
		for _, id := range f.AllowedOrgIDs {
			if u.OrganizationID != nil && *u.OrganizationID == id {
				visible = true
			}
		}
		if !visible || (f.OrganizationID != nil && (u.OrganizationID == nil || *u.OrganizationID != *f.OrganizationID)) {
			continue
		}
		if f.Role != "" && u.Role != f.Role || f.Status != "" && u.Status != f.Status {
			continue
		}
		if f.Q != "" && !strings.Contains(strings.ToLower(u.Name+" "+u.Username+" "+u.Email+" "+u.NIP), strings.ToLower(f.Q)) {
			continue
		}
		matches = append(matches, domain.DirectoryUserFrom(u))
	}
	sort.Slice(matches, func(i, j int) bool { return matches[i].ID.String() > matches[j].ID.String() })
	total := len(matches)
	offset := (f.Page - 1) * f.Limit
	if offset >= total {
		return []*domain.DirectoryUser{}, total, nil
	}
	end := offset + f.Limit
	if end > total {
		end = total
	}
	return matches[offset:end], total, nil
}
