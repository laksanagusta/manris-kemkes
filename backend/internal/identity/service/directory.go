package service

import (
	"context"
	"strings"

	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/identity/domain"
)

func directoryCanRead(p *domain.Profile, orgID *uuid.UUID) bool {
	if p.IsGlobal {
		return true
	}
	if orgID == nil {
		return false
	}
	for _, allowed := range p.AccessibleOrgIDs {
		if allowed == *orgID {
			return true
		}
	}
	return false
}

func (s *Service) ListUsers(ctx context.Context, appID, token string, filter domain.DirectoryFilter) (*domain.DirectoryPage, error) {
	i, err := s.Validate(ctx, appID, token)
	if err != nil {
		return nil, err
	}
	if i.Profile.MustChangePassword {
		return nil, domainerrors.ErrForbidden
	}
	if filter.Page == 0 {
		filter.Page = 1
	}
	if filter.Limit == 0 {
		filter.Limit = 10
	}
	filter.Q = strings.TrimSpace(filter.Q)
	if filter.Page < 1 || filter.Page > 1000000 || filter.Limit < 1 || filter.Limit > 100 || len(filter.Q) > 200 ||
		(filter.Role != "" && !validRole(filter.Role)) || (filter.Status != "" && !domain.IsValidUserStatus(filter.Status)) {
		return nil, domainerrors.ErrInvalidInput
	}
	if filter.Role != "" {
		filter.Role = domain.NormalizeRole(filter.Role)
	}
	if filter.OrganizationID != nil && !directoryCanRead(i.Profile, filter.OrganizationID) {
		return nil, domainerrors.ErrForbidden
	}
	// Always overwrite scope supplied by callers with the current authenticated scope.
	filter.Global = i.Profile.IsGlobal
	filter.AllowedOrgIDs = i.Profile.AccessibleOrgIDs
	users, total, err := s.users.ListDirectory(ctx, filter)
	if err != nil {
		return nil, err
	}
	if users == nil {
		users = make([]*domain.DirectoryUser, 0)
	}
	return &domain.DirectoryPage{Data: users, Total: total, Page: filter.Page, Limit: filter.Limit}, nil
}

func (s *Service) GetUser(ctx context.Context, appID, token string, id uuid.UUID) (*domain.DirectoryUser, error) {
	i, err := s.Validate(ctx, appID, token)
	if err != nil {
		return nil, err
	}
	if i.Profile.MustChangePassword {
		return nil, domainerrors.ErrForbidden
	}
	u, err := s.users.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if u == nil || !directoryCanRead(i.Profile, u.OrganizationID) {
		return nil, domainerrors.ErrNotFound
	}
	return domain.DirectoryUserFrom(u), nil
}
