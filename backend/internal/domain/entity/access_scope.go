package entity

import (
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
)

// AccessScope is the single source of truth for organization-based authorization.
// It captures who the user is, their normalized role, their home organization,
// and the full set of organization IDs they may read.
type AccessScope struct {
	UserID           uuid.UUID   `json:"userId"`
	Role             string      `json:"role"`
	OrganizationID   *uuid.UUID  `json:"organizationId,omitempty"`
	AccessibleOrgIDs []uuid.UUID `json:"accessibleOrgIds,omitempty"`
	IsGlobal         bool        `json:"isGlobal"`
}

// CanRead returns true if the scope includes the target org.
// Global scopes (superadmin) can read any organization.
func (s *AccessScope) CanRead(targetOrgID uuid.UUID) bool {
	if s.IsGlobal {
		return true
	}
	for _, id := range s.AccessibleOrgIDs {
		if id == targetOrgID {
			return true
		}
	}
	return false
}

// CanWrite returns true only for the user's own organization.
// Phase 1: no inherited write — descendants are read-only.
func (s *AccessScope) CanWrite(targetOrgID uuid.UUID) bool {
	if s.IsGlobal {
		return true
	}
	if s.OrganizationID == nil {
		return false
	}
	return *s.OrganizationID == targetOrgID
}

// NarrowToOrg validates that requestedOrgID is within the accessible orgs
// and returns the single-element slice for downstream filtering.
// Returns ErrForbidden if the requested org is not accessible.
func (s *AccessScope) NarrowToOrg(requestedOrgID uuid.UUID) ([]uuid.UUID, error) {
	if s.IsGlobal {
		return []uuid.UUID{requestedOrgID}, nil
	}
	for _, id := range s.AccessibleOrgIDs {
		if id == requestedOrgID {
			return []uuid.UUID{requestedOrgID}, nil
		}
	}
	return nil, errors.ErrForbidden
}
