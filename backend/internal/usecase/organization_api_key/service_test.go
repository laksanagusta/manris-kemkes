package organization_api_key

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

type userStub struct{ user *entity.User }

func (u userStub) GetByID(context.Context, uuid.UUID) (*entity.User, error) { return u.user, nil }

type keyStub struct {
	key               *entity.OrganizationAPIKey
	authenticatedHash string
}

func (r *keyStub) Get(context.Context, uuid.UUID) (*entity.OrganizationAPIKey, error) {
	if r.key == nil {
		return nil, domainerrors.ErrNotFound
	}
	return r.key, nil
}
func (r *keyStub) Save(_ context.Context, key *entity.OrganizationAPIKey, _ uuid.UUID, expected *uuid.UUID) error {
	if expected == nil && r.key != nil || expected != nil && (r.key == nil || r.key.ID != *expected) {
		return domainerrors.ErrConflict
	}
	r.key = key
	return nil
}
func (r *keyStub) AuthenticateAndConsume(_ context.Context, hash string) (*entity.APIKeyAdmission, error) {
	r.authenticatedHash = hash
	if r.key == nil || hash != r.key.Hash {
		return nil, domainerrors.ErrUnauthorized
	}
	return &entity.APIKeyAdmission{OrganizationID: r.key.OrganizationID, Allowed: true}, nil
}

func TestOrganizationMembershipAndStatus(t *testing.T) {
	own, other := uuid.New(), uuid.New()
	for _, tc := range []struct {
		name, role, status string
		home, request      *uuid.UUID
		want               uuid.UUID
		forbidden          bool
	}{
		{"unit", "unit", "active", &own, nil, own, false},
		{"reviewer", "reviewer", "active", &own, &own, own, false},
		{"pimpinan", "pimpinan", "active", &own, nil, own, false},
		{"other organization", "unit", "active", &own, &other, uuid.Nil, true},
		{"unassigned", "unit", "active", nil, nil, uuid.Nil, true},
		{"inactive", "unit", "inactive", &own, nil, uuid.Nil, true},
		{"pending", "unit", "pending_activation", &own, nil, uuid.Nil, true},
		{"superadmin selected org", "superadmin", "active", nil, &other, other, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			s := NewService(&keyStub{}, userStub{&entity.User{Role: tc.role, Status: tc.status, OrganizationID: tc.home}})
			got, err := s.Organization(context.Background(), uuid.New(), tc.request)
			if tc.forbidden {
				if !errors.Is(err, domainerrors.ErrForbidden) {
					t.Fatalf("error=%v", err)
				}
				return
			}
			if err != nil || got != tc.want {
				t.Fatalf("org=%v, err=%v", got, err)
			}
		})
	}
	s := NewService(&keyStub{}, userStub{&entity.User{Status: "active", OrganizationID: &own, MustChangePassword: true}})
	if _, err := s.Organization(context.Background(), uuid.New(), nil); !errors.Is(err, domainerrors.ErrForbidden) {
		t.Fatalf("setup session admitted: %v", err)
	}
}

func TestGenerateAndRotateDoNotExposeStoredHash(t *testing.T) {
	ctx := context.Background()
	repo := &keyStub{}
	s := NewService(repo, nil)
	orgID, actorID := uuid.New(), uuid.New()
	key, err := s.Generate(ctx, orgID, actorID, nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(key.Secret) != KeyLength || key.Key.Hash == key.Secret || key.Key.Hash != hashKey(key.Secret) {
		t.Fatal("secret generation/storage invalid")
	}
	encoded, _ := json.Marshal(key.Key)
	if strings.Contains(string(encoded), key.Secret) || strings.Contains(string(encoded), key.Key.Hash) {
		t.Fatal("metadata leaks credential")
	}
	if _, err = s.Generate(ctx, orgID, actorID, nil); !errors.Is(err, domainerrors.ErrConflict) {
		t.Fatalf("duplicate generate: %v", err)
	}
	oldSecret, oldID := key.Secret, key.Key.ID
	if _, err = s.Authenticate(ctx, oldSecret); err != nil {
		t.Fatal(err)
	}
	rotated, err := s.Generate(ctx, orgID, actorID, &oldID)
	if err != nil {
		t.Fatal(err)
	}
	if rotated.Secret == oldSecret {
		t.Fatal("rotation reused secret")
	}
	if _, err = s.Authenticate(ctx, oldSecret); !errors.Is(err, domainerrors.ErrUnauthorized) {
		t.Fatalf("old key remains valid: %v", err)
	}
	if _, err = s.Authenticate(ctx, rotated.Secret); err != nil {
		t.Fatal(err)
	}
	if _, err = s.Generate(ctx, orgID, actorID, &oldID); !errors.Is(err, domainerrors.ErrConflict) {
		t.Fatalf("stale rotation: %v", err)
	}
}

func TestMalformedKeysDoNotQueryRepository(t *testing.T) {
	for _, secret := range []string{"", "Bearer abc", strings.Repeat("a", KeyLength), KeyPrefix + strings.Repeat("!", 43)} {
		repo := &keyStub{}
		s := NewService(repo, nil)
		if _, err := s.Authenticate(context.Background(), secret); !errors.Is(err, domainerrors.ErrUnauthorized) {
			t.Fatalf("accepted %q: %v", secret, err)
		}
		if repo.authenticatedHash != "" {
			t.Fatal("malformed key queried database")
		}
	}
}
