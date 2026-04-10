package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// OrganizationHierarchy provides organization hierarchy operations
type OrganizationHierarchy struct {
	orgRepo repository.OrganizationRepository
}

// NewOrganizationHierarchy creates a new organization hierarchy service
func NewOrganizationHierarchy(orgRepo repository.OrganizationRepository) *OrganizationHierarchy {
	return &OrganizationHierarchy{
		orgRepo: orgRepo,
	}
}

// GetAccessibleOrgs returns all organization IDs the user can access
// This includes the user's own organization and all its descendants
func (s *OrganizationHierarchy) GetAccessibleOrgs(ctx context.Context, userOrgID uuid.UUID) ([]uuid.UUID, error) {
	// Get all descendants including the org itself
	descendants, err := s.orgRepo.GetDescendants(ctx, userOrgID)
	if err != nil {
		return nil, err
	}

	// If no descendants found, return at least the user's org
	if len(descendants) == 0 {
		return []uuid.UUID{userOrgID}, nil
	}

	return descendants, nil
}

// IsDescendantOf checks if targetOrg is a descendant of parentOrg
func (s *OrganizationHierarchy) IsDescendantOf(ctx context.Context, targetOrg, parentOrg uuid.UUID) (bool, error) {
	accessible, err := s.GetAccessibleOrgs(ctx, parentOrg)
	if err != nil {
		return false, err
	}

	for _, id := range accessible {
		if id == targetOrg {
			return true, nil
		}
	}

	return false, nil
}

// ResolveAccessScope builds an AccessScope from raw JWT claims and the org hierarchy.
func (s *OrganizationHierarchy) ResolveAccessScope(ctx context.Context, userID uuid.UUID, rawRole string, orgID *uuid.UUID) (*entity.AccessScope, error) {
	normalizedRole := entity.NormalizeRole(rawRole)

	scope := &entity.AccessScope{
		UserID:         userID,
		Role:           normalizedRole,
		OrganizationID: orgID,
	}

	if normalizedRole == entity.RoleSuperAdmin {
		scope.IsGlobal = true
		return scope, nil
	}

	if orgID == nil {
		return nil, errors.ErrForbidden
	}

	accessibleOrgs, err := s.GetAccessibleOrgs(ctx, *orgID)
	if err != nil {
		return nil, err
	}
	scope.AccessibleOrgIDs = accessibleOrgs
	return scope, nil
}
