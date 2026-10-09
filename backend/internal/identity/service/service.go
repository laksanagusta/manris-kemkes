// Package service implements shared identity authentication independently of Manris features.
package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/identity/domain"
	"golang.org/x/crypto/bcrypt"
)

const Issuer = "shared-identity"
const keyPrefix = "auth_app_"

var appIDPattern = regexp.MustCompile(`^[a-z][a-z0-9_-]{1,63}$`)
var ErrUnavailable = errors.New("identity service unavailable")

type Service struct {
	store    Store
	users    Directory
	orgs     Organizations
	secret   string
	lifetime time.Duration
}

func New(store Store, users Directory, orgs Organizations, secret string, lifetime time.Duration) (*Service, error) {
	if len(secret) < 32 || lifetime <= 0 {
		return nil, errors.New("identity auth requires a JWT secret of at least 32 bytes and a positive token lifetime")
	}
	return &Service{store: store, users: users, orgs: orgs, secret: secret, lifetime: lifetime}, nil
}
func fingerprint(value string) string {
	h := sha256.Sum256([]byte(value))
	return hex.EncodeToString(h[:])
}
func NewAppKey() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return keyPrefix + base64.RawURLEncoding.EncodeToString(b), nil
}
func (s *Service) ResolveApplication(ctx context.Context, key string) (*domain.Application, error) {
	if !strings.HasPrefix(key, keyPrefix) {
		return nil, domainerrors.ErrUnauthorized
	}
	b, err := base64.RawURLEncoding.DecodeString(strings.TrimPrefix(key, keyPrefix))
	if err != nil || len(b) != 32 {
		return nil, domainerrors.ErrUnauthorized
	}
	a, err := s.store.ApplicationByKey(ctx, fingerprint(key))
	if err != nil {
		return nil, err
	}
	if a == nil || !a.Active {
		return nil, domainerrors.ErrUnauthorized
	}
	return a, nil
}
func (s *Service) application(ctx context.Context, id string) (*domain.Application, error) {
	a, err := s.store.Application(ctx, id)
	if err != nil {
		return nil, err
	}
	if a == nil || !a.Active {
		return nil, domainerrors.ErrUnauthorized
	}
	return a, nil
}
func validRole(role string) bool {
	switch domain.NormalizeRole(role) {
	case domain.RoleSuperAdmin, domain.RoleUnit, domain.RoleReviewer, domain.RolePimpinan:
		return true
	}
	return false
}
func (s *Service) profile(ctx context.Context, u *domain.User) (*domain.Profile, error) {
	if !validRole(u.Role) {
		return nil, domainerrors.ErrUnauthorized
	}
	p := &domain.Profile{ID: u.ID, Username: u.Username, Name: u.Name, Email: u.Email, Role: domain.NormalizeRole(u.Role), OrganizationID: u.OrganizationID, OrgName: u.OrgName,
		Status: u.Status, NIP: u.NIP, Jabatan: u.Jabatan, Pangkat: u.Pangkat, PhoneNumber: u.PhoneNumber, MustChangePassword: u.MustChangePassword, CreatedAt: u.CreatedAt, UpdatedAt: u.UpdatedAt}
	p.IsGlobal = p.Role == domain.RoleSuperAdmin
	if u.OrganizationID != nil {
		o, err := s.orgs.GetByID(ctx, *u.OrganizationID)
		if err != nil {
			return nil, err
		}
		if o == nil {
			return nil, domainerrors.ErrUnauthorized
		}
		p.Organization = o
		p.OrgName = o.Name
		if !p.IsGlobal {
			ids, err := s.orgs.GetDescendants(ctx, *u.OrganizationID)
			if err != nil {
				return nil, err
			}
			if len(ids) == 0 {
				ids = []uuid.UUID{*u.OrganizationID}
			}
			p.AccessibleOrgIDs = ids
		}
	} else if !p.IsGlobal {
		return nil, domainerrors.ErrUnauthorized
	}
	return p, nil
}
func (s *Service) Login(ctx context.Context, appID, nip, password string) (*domain.LoginResult, error) {
	if nip == "" || password == "" {
		return nil, domainerrors.ErrInvalidCredentials
	}
	a, err := s.application(ctx, appID)
	if err != nil {
		return nil, err
	}
	return s.login(ctx, a, nip, password)
}
func (s *Service) LoginWithKey(ctx context.Context, key, nip, password string) (*domain.LoginResult, error) {
	a, err := s.ResolveApplication(ctx, key)
	if err != nil {
		return nil, err
	}
	return s.login(ctx, a, nip, password)
}
func (s *Service) login(ctx context.Context, a *domain.Application, nip, password string) (*domain.LoginResult, error) {
	appID := a.ID
	if nip == "" || password == "" {
		return nil, domainerrors.ErrInvalidCredentials
	}
	u, err := s.users.GetByNIP(ctx, nip)
	if errors.Is(err, domainerrors.ErrNotFound) || (err == nil && u == nil) {
		return nil, domainerrors.ErrInvalidCredentials
	}
	if err != nil {
		return nil, err
	}
	if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)) != nil {
		return nil, domainerrors.ErrInvalidCredentials
	}
	if u.Status != domain.UserStatusActive {
		return nil, domainerrors.ErrAccountInactive
	}
	// Password setup is performed in Manris before granting full external sessions.
	if appID != domain.ManrisApplication && u.MustChangePassword {
		return nil, domainerrors.ErrUnauthorized
	}
	result, err := s.issue(ctx, a, u)
	if err != nil {
		return nil, err
	}
	if err := s.users.RecordLastLogin(ctx, u.ID); err != nil {
		return nil, err
	}
	return result, nil
}

// Issue receives the credential snapshot verified by login or password change.
func (s *Service) Issue(ctx context.Context, appID string, u *domain.User) (*domain.LoginResult, error) {
	if u == nil || u.ID == uuid.Nil || u.Status != domain.UserStatusActive {
		return nil, domainerrors.ErrUnauthorized
	}
	if appID != domain.ManrisApplication && u.MustChangePassword {
		return nil, domainerrors.ErrUnauthorized
	}
	a, err := s.application(ctx, appID)
	if err != nil {
		return nil, err
	}
	return s.issue(ctx, a, u)
}
func (s *Service) issue(ctx context.Context, a *domain.Application, u *domain.User) (*domain.LoginResult, error) {
	p, err := s.profile(ctx, u)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	expiry := now.Add(s.lifetime)
	id := uuid.New()
	claims := jwt.RegisteredClaims{Issuer: Issuer, Subject: u.ID.String(), Audience: jwt.ClaimStrings{a.ID}, ID: id.String(), IssuedAt: jwt.NewNumericDate(now), ExpiresAt: jwt.NewNumericDate(expiry)}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(s.secret))
	if err != nil {
		return nil, err
	}
	session := &domain.Session{ID: id, ApplicationID: a.ID, UserID: u.ID, KeyVersion: a.KeyVersion, PasswordFingerprint: fingerprint(u.PasswordHash), ExpiresAt: expiry}
	if err := s.store.CreateSession(ctx, session); err != nil {
		return nil, err
	}
	mode := "full"
	if u.MustChangePassword {
		mode = "setup"
	}
	return &domain.LoginResult{Token: token, AppID: a.ID, ExpiresAt: expiry, SessionMode: mode, MustChangePassword: u.MustChangePassword, User: p}, nil
}
func (s *Service) Validate(ctx context.Context, appID, token string) (*domain.Identity, error) {
	a, err := s.application(ctx, appID)
	if err != nil {
		return nil, err
	}
	claims := &jwt.RegisteredClaims{}
	parsed, err := jwt.ParseWithClaims(token, claims, func(_ *jwt.Token) (any, error) { return []byte(s.secret), nil }, jwt.WithValidMethods([]string{"HS256"}), jwt.WithIssuer(Issuer), jwt.WithAudience(a.ID), jwt.WithExpirationRequired())
	if err != nil || !parsed.Valid || len(claims.Audience) != 1 {
		return nil, domainerrors.ErrUnauthorized
	}
	sid, err := uuid.Parse(claims.ID)
	if err != nil {
		return nil, domainerrors.ErrUnauthorized
	}
	uid, err := uuid.Parse(claims.Subject)
	if err != nil || uid == uuid.Nil {
		return nil, domainerrors.ErrUnauthorized
	}
	session, err := s.store.Session(ctx, sid)
	if err != nil {
		return nil, err
	}
	if session == nil || session.UserID != uid || session.ApplicationID != a.ID || session.KeyVersion != a.KeyVersion || !session.ExpiresAt.After(time.Now()) {
		return nil, domainerrors.ErrUnauthorized
	}
	u, err := s.users.GetByID(ctx, uid)
	if errors.Is(err, domainerrors.ErrNotFound) {
		return nil, domainerrors.ErrUnauthorized
	}
	if err != nil {
		return nil, err
	}
	if u == nil || u.Status != domain.UserStatusActive || (a.ID != domain.ManrisApplication && u.MustChangePassword) || subtle.ConstantTimeCompare([]byte(session.PasswordFingerprint), []byte(fingerprint(u.PasswordHash))) != 1 {
		return nil, domainerrors.ErrUnauthorized
	}
	p, err := s.profile(ctx, u)
	if err != nil {
		return nil, err
	}
	return &domain.Identity{Profile: p, SessionID: sid, ApplicationID: a.ID}, nil
}
func (s *Service) Logout(ctx context.Context, appID, token string) error {
	i, err := s.Validate(ctx, appID, token)
	if err != nil {
		return err
	}
	return s.store.RevokeSession(ctx, i.SessionID)
}
func (s *Service) requireAdmin(ctx context.Context, actor uuid.UUID) error {
	u, err := s.users.GetByID(ctx, actor)
	if err != nil {
		return err
	}
	if u == nil || !u.CanUseFullSession() || domain.NormalizeRole(u.Role) != domain.RoleSuperAdmin {
		return domainerrors.ErrForbidden
	}
	return nil
}

type GeneratedApplication struct {
	Application *domain.Application `json:"application"`
	AppKey      string              `json:"appKey"`
}

func (s *Service) CreateApplication(ctx context.Context, id, name string, actor uuid.UUID) (*GeneratedApplication, error) {
	if err := s.requireAdmin(ctx, actor); err != nil {
		return nil, err
	}
	name = strings.TrimSpace(name)
	if !appIDPattern.MatchString(id) || id == domain.ManrisApplication || name == "" || utf8.RuneCountInString(name) > 100 {
		return nil, domainerrors.ErrInvalidInput
	}
	key, err := NewAppKey()
	if err != nil {
		return nil, err
	}
	a := &domain.Application{ID: id, Name: name, Active: true, KeyHash: fingerprint(key), KeyVersion: 1}
	if err := s.store.CreateApplication(ctx, a, actor); err != nil {
		return nil, err
	}
	return &GeneratedApplication{Application: a, AppKey: key}, nil
}
func (s *Service) ListApplications(ctx context.Context, actor uuid.UUID) ([]*domain.Application, error) {
	if err := s.requireAdmin(ctx, actor); err != nil {
		return nil, err
	}
	return s.store.ListApplications(ctx)
}
func (s *Service) RotateKey(ctx context.Context, id string, actor uuid.UUID) (string, error) {
	if err := s.requireAdmin(ctx, actor); err != nil {
		return "", err
	}
	key, err := NewAppKey()
	if err != nil {
		return "", err
	}
	if err := s.store.RotateKey(ctx, id, fingerprint(key), actor); err != nil {
		return "", err
	}
	return key, nil
}
func (s *Service) DisableApplication(ctx context.Context, id string, actor uuid.UUID) error {
	if err := s.requireAdmin(ctx, actor); err != nil {
		return err
	}
	if id == domain.ManrisApplication {
		return domainerrors.ErrForbidden
	}
	return s.store.DisableApplication(ctx, id, actor)
}

// ValidateWithKey authenticates the backend application as well as its user token.
func (s *Service) ValidateWithKey(ctx context.Context, key, token string) (*domain.Identity, error) {
	a, err := s.ResolveApplication(ctx, key)
	if err != nil {
		return nil, err
	}
	i, err := s.Validate(ctx, a.ID, token)
	if err != nil {
		return nil, err
	}
	current, err := s.ResolveApplication(ctx, key)
	if err != nil {
		return nil, err
	}
	if current.KeyVersion != a.KeyVersion {
		return nil, domainerrors.ErrUnauthorized
	}
	return i, nil
}

type ProfileInput = domain.ProfileUpdate

func (s *Service) UpdateProfile(ctx context.Context, appID, token string, input ProfileInput) (*domain.Profile, error) {
	i, err := s.Validate(ctx, appID, token)
	if err != nil {
		return nil, err
	}
	if i.Profile.MustChangePassword {
		return nil, domainerrors.ErrForbidden
	}
	u, err := s.users.GetByID(ctx, i.Profile.ID)
	if err != nil {
		return nil, err
	}
	if u == nil {
		return nil, domainerrors.ErrUnauthorized
	}
	u.Name = strings.TrimSpace(input.Name)
	u.Email = strings.TrimSpace(input.Email)
	u.NIP = strings.TrimSpace(input.NIP)
	u.Jabatan = strings.TrimSpace(input.Jabatan)
	u.Pangkat = strings.TrimSpace(input.Pangkat)
	if u.Name == "" || u.Email == "" || u.NIP == "" {
		return nil, domainerrors.ErrInvalidInput
	}
	if err := s.users.UpdateProfile(ctx, u.ID, domain.ProfileUpdate{Name: u.Name, Email: u.Email, NIP: u.NIP, Jabatan: u.Jabatan, Pangkat: u.Pangkat}); err != nil {
		return nil, err
	}
	u, err = s.users.GetByID(ctx, u.ID)
	if err != nil {
		return nil, err
	}
	if u == nil {
		return nil, domainerrors.ErrUnauthorized
	}
	return s.profile(ctx, u)
}
func (s *Service) ChangePassword(ctx context.Context, appID, token, current, newPassword, confirm string) (*domain.LoginResult, error) {
	i, err := s.Validate(ctx, appID, token)
	if err != nil {
		return nil, err
	}
	if newPassword == "" || newPassword != confirm || len(newPassword) > 72 {
		return nil, domainerrors.ErrInvalidInput
	}
	u, err := s.users.GetByID(ctx, i.Profile.ID)
	if err != nil {
		return nil, err
	}
	if u == nil || u.Status != domain.UserStatusActive {
		return nil, domainerrors.ErrUnauthorized
	}
	// A restricted setup session proves the temporary password was verified at login.
	// Full sessions still require the current password for this sensitive operation.
	if !i.Profile.MustChangePassword && bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(current)) != nil {
		return nil, domainerrors.ErrInvalidCredentials
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	oldHash := u.PasswordHash
	u.PasswordHash = string(hash)
	u.MustChangePassword = false
	if err := s.users.ChangePassword(ctx, u.ID, oldHash, u.PasswordHash); err != nil {
		return nil, err
	}
	return s.Issue(ctx, appID, u)
}
func (s *Service) Organizations(ctx context.Context, appID, token string) ([]*domain.Organization, error) {
	i, err := s.Validate(ctx, appID, token)
	if err != nil {
		return nil, err
	}
	if i.Profile.MustChangePassword {
		return nil, domainerrors.ErrForbidden
	}
	if i.Profile.IsGlobal {
		return s.orgs.List(ctx)
	}
	orgs := make([]*domain.Organization, 0, len(i.Profile.AccessibleOrgIDs))
	for _, id := range i.Profile.AccessibleOrgIDs {
		org, err := s.orgs.GetByID(ctx, id)
		if err != nil {
			return nil, err
		}
		if org == nil {
			return nil, domainerrors.ErrUnauthorized
		}
		orgs = append(orgs, org)
	}
	return orgs, nil
}
