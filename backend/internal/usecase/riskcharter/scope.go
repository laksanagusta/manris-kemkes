package riskcharter

import (
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

// Risk charters are deliberately scoped to the user's home organization in
// this phase, including for superadmins. Cross-organization administration is
// not part of the charter workflow yet.
func canAccessRiskCharter(scope *entity.AccessScope, organizationID uuid.UUID) bool {
	return scope != nil && scope.OrganizationID != nil && *scope.OrganizationID == organizationID
}
