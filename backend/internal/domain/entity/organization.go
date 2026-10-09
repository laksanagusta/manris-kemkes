// Organization types are owned by the shared identity domain.
package entity

import identity "github.com/manris/backend/internal/identity/domain"

type Organization = identity.Organization

const (
	OrganizationUPRLevelKementerian = identity.OrganizationUPRLevelKementerian
	OrganizationUPRLevelUPRT1       = identity.OrganizationUPRLevelUPRT1
	OrganizationUPRLevelUPRT2       = identity.OrganizationUPRLevelUPRT2
)

func IsValidOrganizationUPRLevel(level string) bool {
	return identity.IsValidOrganizationUPRLevel(level)
}
