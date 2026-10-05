package organization_api_key

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

const KeyPrefix = "mrk_"
const KeyLength = 47 // prefix plus a base64url-encoded 256-bit secret

type UserReader interface {
	GetByID(context.Context, uuid.UUID) (*entity.User, error)
}

type Service struct {
	keys  repository.OrganizationAPIKeyRepository
	users UserReader
}

func NewService(keys repository.OrganizationAPIKeyRepository, users UserReader) *Service {
	return &Service{keys: keys, users: users}
}

// Organization always resolves current membership from the database, not JWT claims.
func (s *Service) Organization(ctx context.Context, actorID uuid.UUID, requestedOrgID *uuid.UUID) (uuid.UUID, error) {
	user, err := s.users.GetByID(ctx, actorID)
	if err != nil {
		return uuid.Nil, err
	}
	if user == nil || !user.CanUseFullSession() {
		return uuid.Nil, domainerrors.ErrForbidden
	}
	if requestedOrgID != nil {
		if *requestedOrgID == uuid.Nil {
			return uuid.Nil, domainerrors.ErrInvalidInput
		}
		if entity.NormalizeRole(user.Role) == entity.RoleSuperAdmin {
			return *requestedOrgID, nil
		}
		if user.OrganizationID == nil || *user.OrganizationID != *requestedOrgID {
			return uuid.Nil, domainerrors.ErrForbidden
		}
	}
	if user.OrganizationID == nil || *user.OrganizationID == uuid.Nil {
		return uuid.Nil, domainerrors.ErrForbidden
	}
	return *user.OrganizationID, nil
}

func (s *Service) Get(ctx context.Context, orgID uuid.UUID) (*entity.OrganizationAPIKey, error) {
	key, err := s.keys.Get(ctx, orgID)
	if errors.Is(err, domainerrors.ErrNotFound) {
		return nil, nil
	}
	return key, err
}

type GeneratedKey struct {
	Key    *entity.OrganizationAPIKey `json:"key"`
	Secret string                     `json:"secret"`
}

func (s *Service) Generate(ctx context.Context, orgID, actorID uuid.UUID, expectedID *uuid.UUID) (*GeneratedKey, error) {
	secretBytes := make([]byte, 32)
	if _, err := rand.Read(secretBytes); err != nil {
		return nil, domainerrors.Wrap(err, "gagal menghasilkan API key")
	}
	secret := KeyPrefix + base64.RawURLEncoding.EncodeToString(secretBytes)
	key := &entity.OrganizationAPIKey{ID: uuid.New(), OrganizationID: orgID, Hash: hashKey(secret), Prefix: secret[:12]}
	if err := s.keys.Save(ctx, key, actorID, expectedID); err != nil {
		return nil, err
	}
	return &GeneratedKey{Key: key, Secret: secret}, nil
}

func (s *Service) Authenticate(ctx context.Context, secret string) (*entity.APIKeyAdmission, error) {
	if len(secret) != KeyLength || !strings.HasPrefix(secret, KeyPrefix) {
		return nil, domainerrors.ErrUnauthorized
	}
	raw, err := base64.RawURLEncoding.DecodeString(strings.TrimPrefix(secret, KeyPrefix))
	if err != nil || len(raw) != 32 {
		return nil, domainerrors.ErrUnauthorized
	}
	return s.keys.AuthenticateAndConsume(ctx, hashKey(secret))
}

func hashKey(secret string) string {
	hash := sha256.Sum256([]byte(secret))
	return hex.EncodeToString(hash[:])
}
