package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"time"

	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/identity/domain"
	"golang.org/x/crypto/bcrypt"
)

var ErrInvalidResetPassword = errors.New("replacement password must differ from the temporary password and contain at least 8 characters")

const temporaryPasswordLifetime = 24 * time.Hour

type PasswordResetResult struct {
	TemporaryPassword string    `json:"temporaryPassword"`
	ExpiresAt         time.Time `json:"expiresAt"`
}

func temporaryPasswordExpired(user *domain.User) bool {
	return user.TemporaryPasswordExpiresAt != nil && !user.TemporaryPasswordExpiresAt.After(time.Now())
}

func (s *Service) ResetPassword(ctx context.Context, actorID, targetID uuid.UUID, currentPassword string) (*PasswordResetResult, error) {
	if actorID == targetID || targetID == uuid.Nil {
		return nil, domainerrors.ErrInvalidInput
	}
	actor, err := s.users.GetByID(ctx, actorID)
	if err != nil {
		return nil, err
	}
	if actor == nil || !actor.CanUseFullSession() || domain.NormalizeRole(actor.Role) != domain.RoleSuperAdmin {
		return nil, domainerrors.ErrForbidden
	}
	if currentPassword == "" || len(currentPassword) > 72 || bcrypt.CompareHashAndPassword([]byte(actor.PasswordHash), []byte(currentPassword)) != nil {
		return nil, domainerrors.ErrInvalidCredentials
	}

	target, err := s.users.GetByID(ctx, targetID)
	if err != nil {
		return nil, err
	}
	if target == nil || target.Status != domain.UserStatusActive {
		return nil, domainerrors.ErrNotFound
	}

	var secret [18]byte
	if _, err := rand.Read(secret[:]); err != nil {
		return nil, err
	}
	password := base64.RawURLEncoding.EncodeToString(secret[:])
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	expiresAt := time.Now().UTC().Truncate(time.Microsecond).Add(temporaryPasswordLifetime)
	if err := s.store.ResetPassword(ctx, actorID, targetID, actor.PasswordHash, target.PasswordHash, string(hash), expiresAt); err != nil {
		return nil, err
	}
	return &PasswordResetResult{TemporaryPassword: password, ExpiresAt: expiresAt}, nil
}
