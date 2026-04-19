package auth

import (
	"context"
	stderrors "errors"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainErrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
	"github.com/manris/backend/internal/middleware"
	"golang.org/x/crypto/bcrypt"
)

type changePasswordStubUserRepo struct {
	user        *entity.User
	updatedUser *entity.User
	getByIDErr  error
	updateErr   error
}

func (s *changePasswordStubUserRepo) Create(_ context.Context, _ *entity.User) error { return nil }

func (s *changePasswordStubUserRepo) GetByID(_ context.Context, _ uuid.UUID) (*entity.User, error) {
	if s.getByIDErr != nil {
		return nil, s.getByIDErr
	}
	if s.user == nil {
		return nil, domainErrors.ErrNotFound
	}
	userCopy := *s.user
	return &userCopy, nil
}

func (s *changePasswordStubUserRepo) GetByUsername(_ context.Context, username string) (*entity.User, error) {
	if s.user == nil {
		return nil, domainErrors.ErrNotFound
	}
	if username != s.user.Username && username != s.user.Email {
		return nil, domainErrors.ErrNotFound
	}
	userCopy := *s.user
	return &userCopy, nil
}

func (s *changePasswordStubUserRepo) Update(_ context.Context, user *entity.User) error {
	if s.updateErr != nil {
		return s.updateErr
	}
	updatedCopy := *user
	s.updatedUser = &updatedCopy
	s.user = &updatedCopy
	return nil
}

func (s *changePasswordStubUserRepo) Delete(_ context.Context, _ uuid.UUID) error    { return nil }
func (s *changePasswordStubUserRepo) List(_ context.Context) ([]*entity.User, error) { return nil, nil }
func (s *changePasswordStubUserRepo) ListWithFilter(_ context.Context, _ repository.UserListFilter) ([]*entity.User, int, error) {
	return nil, 0, nil
}

func TestChangePasswordExecuteActivatesPendingUserAndReturnsFullSession(t *testing.T) {
	userID := uuid.New()
	temporaryPassword := "TempPass123!"
	newPassword := "N3wPassw0rd!2026"
	tempHash, err := bcrypt.GenerateFromPassword([]byte(temporaryPassword), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}

	userRepo := &changePasswordStubUserRepo{user: &entity.User{
		ID:                 userID,
		Username:           "pending-user",
		Email:              "pending-user@manris.local",
		Name:               "Pending User",
		Role:               entity.RoleSuperAdmin,
		Status:             entity.UserStatusPendingActivation,
		MustChangePassword: true,
		PasswordHash:       string(tempHash),
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}}

	hierarchySvc := service.NewOrganizationHierarchy(&stubOrgRepo{})
	changePasswordUC := NewChangePasswordUseCase(userRepo, hierarchySvc, "secret", 24)

	result, err := changePasswordUC.Execute(context.Background(), ChangePasswordInput{
		UserID:          userID,
		NewPassword:     newPassword,
		ConfirmPassword: newPassword,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if userRepo.updatedUser == nil {
		t.Fatal("expected repository update to be called")
	}
	if userRepo.updatedUser.Status != entity.UserStatusActive {
		t.Fatalf("expected updated status %q, got %q", entity.UserStatusActive, userRepo.updatedUser.Status)
	}
	if userRepo.updatedUser.MustChangePassword {
		t.Fatal("expected mustChangePassword to be cleared")
	}
	if userRepo.updatedUser.PasswordHash == string(tempHash) {
		t.Fatal("expected password hash to change")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(userRepo.updatedUser.PasswordHash), []byte(newPassword)); err != nil {
		t.Fatalf("expected updated password hash to match new password: %v", err)
	}
	if result == nil || result.Token == "" {
		t.Fatal("expected auth token in response")
	}
	if result.SessionMode != entity.AuthSessionModeFull {
		t.Fatalf("expected session mode %q, got %q", entity.AuthSessionModeFull, result.SessionMode)
	}
	if result.MustChangePassword {
		t.Fatal("expected mustChangePassword to be false after activation")
	}
	if result.User == nil {
		t.Fatal("expected user payload")
	}
	if result.User.Status != entity.UserStatusActive {
		t.Fatalf("expected user status %q, got %q", entity.UserStatusActive, result.User.Status)
	}
	if result.User.MustChangePassword {
		t.Fatal("expected user mustChangePassword to be false after activation")
	}

	claims := &middleware.JWTClaims{}
	parsedToken, err := jwt.ParseWithClaims(result.Token, claims, func(token *jwt.Token) (any, error) {
		return []byte("secret"), nil
	})
	if err != nil {
		t.Fatalf("parse jwt claims: %v", err)
	}
	if !parsedToken.Valid {
		t.Fatal("expected generated token to be valid")
	}
	if claims.SetupOnly {
		t.Fatal("expected change-password response to issue full-session token")
	}

	profile, err := NewGetCurrentUserUseCase(userRepo, hierarchySvc).Execute(context.Background(), GetCurrentUserInput{UserID: userID})
	if err != nil {
		t.Fatalf("expected updated /auth/me profile, got %v", err)
	}
	if profile.Status != entity.UserStatusActive {
		t.Fatalf("expected /auth/me status %q, got %q", entity.UserStatusActive, profile.Status)
	}
	if profile.MustChangePassword {
		t.Fatal("expected /auth/me mustChangePassword to be false after activation")
	}
}

func TestChangePasswordExecuteInvalidatesOldTemporaryPassword(t *testing.T) {
	userID := uuid.New()
	temporaryPassword := "TempPass123!"
	newPassword := "N3wPassw0rd!2026"
	tempHash, err := bcrypt.GenerateFromPassword([]byte(temporaryPassword), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}

	userRepo := &changePasswordStubUserRepo{user: &entity.User{
		ID:                 userID,
		Username:           "pending-user",
		Email:              "pending-user@manris.local",
		Name:               "Pending User",
		Role:               entity.RoleSuperAdmin,
		Status:             entity.UserStatusPendingActivation,
		MustChangePassword: true,
		PasswordHash:       string(tempHash),
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}}

	hierarchySvc := service.NewOrganizationHierarchy(&stubOrgRepo{})
	changePasswordUC := NewChangePasswordUseCase(userRepo, hierarchySvc, "secret", 24)
	if _, err := changePasswordUC.Execute(context.Background(), ChangePasswordInput{
		UserID:          userID,
		NewPassword:     newPassword,
		ConfirmPassword: newPassword,
	}); err != nil {
		t.Fatalf("expected no error changing password, got %v", err)
	}

	loginUC := NewLoginUseCase(userRepo, hierarchySvc, "secret", 24)
	if _, err := loginUC.Execute(context.Background(), LoginInput{
		Username: "pending-user",
		Password: temporaryPassword,
	}); err == nil || !stderrors.Is(err, domainErrors.ErrInvalidCredentials) {
		t.Fatalf("expected old password login to fail with invalid credentials, got %v", err)
	}

	result, err := loginUC.Execute(context.Background(), LoginInput{
		Username: "pending-user",
		Password: newPassword,
	})
	if err != nil {
		t.Fatalf("expected new password login to succeed, got %v", err)
	}
	if result.SessionMode != entity.AuthSessionModeFull {
		t.Fatalf("expected new password login session mode %q, got %q", entity.AuthSessionModeFull, result.SessionMode)
	}
	if result.User == nil || result.User.Status != entity.UserStatusActive {
		t.Fatalf("expected active user payload after password change, got %#v", result.User)
	}
}

func TestChangePasswordExecuteRejectsMismatchedConfirmation(t *testing.T) {
	userRepo := &changePasswordStubUserRepo{user: &entity.User{
		ID:                 uuid.New(),
		Username:           "pending-user",
		Email:              "pending-user@manris.local",
		Name:               "Pending User",
		Role:               entity.RoleSuperAdmin,
		Status:             entity.UserStatusPendingActivation,
		MustChangePassword: true,
	}}

	changePasswordUC := NewChangePasswordUseCase(userRepo, service.NewOrganizationHierarchy(&stubOrgRepo{}), "secret", 24)

	_, err := changePasswordUC.Execute(context.Background(), ChangePasswordInput{
		UserID:          userRepo.user.ID,
		NewPassword:     "N3wPassw0rd!2026",
		ConfirmPassword: "does-not-match",
	})
	if err == nil {
		t.Fatal("expected validation error, got nil")
	}
	if !stderrors.Is(err, domainErrors.ErrInvalidInput) {
		t.Fatalf("expected invalid input error, got %v", err)
	}
	if userRepo.updatedUser != nil {
		t.Fatal("expected repository update not to run on invalid input")
	}
}

func TestChangePasswordExecuteAllowsActiveUserWithCurrentPassword(t *testing.T) {
	userID := uuid.New()
	orgID := uuid.New()
	currentPassword := "OldPass123!"
	newPassword := "NewPass123!"
	currentHash, err := bcrypt.GenerateFromPassword([]byte(currentPassword), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}

	userRepo := &changePasswordStubUserRepo{user: &entity.User{
		ID:                 userID,
		Username:           "active-user",
		Email:              "active-user@manris.local",
		Name:               "Active User",
		Role:               entity.RoleUnit,
		OrganizationID:     &orgID,
		Status:             entity.UserStatusActive,
		MustChangePassword: false,
		PasswordHash:       string(currentHash),
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}}

	hierarchySvc := service.NewOrganizationHierarchy(&stubOrgRepo{})
	changePasswordUC := NewChangePasswordUseCase(userRepo, hierarchySvc, "secret", 24)

	result, err := changePasswordUC.Execute(context.Background(), ChangePasswordInput{
		UserID:          userID,
		CurrentPassword: currentPassword,
		NewPassword:     newPassword,
		ConfirmPassword: newPassword,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.SessionMode != entity.AuthSessionModeFull {
		t.Fatalf("expected full session, got %q", result.SessionMode)
	}
	if userRepo.updatedUser == nil {
		t.Fatal("expected repository update")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(userRepo.updatedUser.PasswordHash), []byte(newPassword)); err != nil {
		t.Fatalf("expected new password hash to match, got %v", err)
	}
}

func TestChangePasswordExecuteRejectsActiveUserWithoutCurrentPassword(t *testing.T) {
	userRepo := &changePasswordStubUserRepo{user: &entity.User{
		ID:                 uuid.New(),
		Username:           "active-user",
		Email:              "active-user@manris.local",
		Name:               "Active User",
		Role:               entity.RoleUnit,
		Status:             entity.UserStatusActive,
		MustChangePassword: false,
		PasswordHash:       "hashed",
	}}

	changePasswordUC := NewChangePasswordUseCase(userRepo, service.NewOrganizationHierarchy(&stubOrgRepo{}), "secret", 24)

	_, err := changePasswordUC.Execute(context.Background(), ChangePasswordInput{
		UserID:          userRepo.user.ID,
		NewPassword:     "NewPass123!",
		ConfirmPassword: "NewPass123!",
	})
	if err == nil {
		t.Fatal("expected validation error, got nil")
	}
	if !stderrors.Is(err, domainErrors.ErrInvalidInput) {
		t.Fatalf("expected invalid input error, got %v", err)
	}
	if userRepo.updatedUser != nil {
		t.Fatal("expected repository update not to run")
	}
}
