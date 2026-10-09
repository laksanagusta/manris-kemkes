// Identity types are owned by the shared identity domain. Aliases preserve Manris imports.
package entity

import identity "github.com/manris/backend/internal/identity/domain"

type User = identity.User

const (
	RoleSuperAdmin              = identity.RoleSuperAdmin
	RoleUnit                    = identity.RoleUnit
	RoleReviewer                = identity.RoleReviewer
	RolePimpinan                = identity.RolePimpinan
	UserStatusPendingActivation = identity.UserStatusPendingActivation
	UserStatusActive            = identity.UserStatusActive
	UserStatusInactive          = identity.UserStatusInactive
)

func NormalizeRole(role string) string     { return identity.NormalizeRole(role) }
func IsValidUserStatus(status string) bool { return identity.IsValidUserStatus(status) }
