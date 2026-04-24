package auth

import "github.com/manris/backend/internal/domain/entity"

func buildUserProfile(user *entity.User, scope *entity.AccessScope, riskApprovalWorkflowEnabled bool) *entity.UserProfile {
	return &entity.UserProfile{
		ID:               user.ID,
		Username:         user.Username,
		Name:             user.Name,
		Email:            user.Email,
		Role:             user.Role,
		OrganizationID:   user.OrganizationID,
		OrgName:          user.OrgName,
		AccessibleOrgIDs: scope.AccessibleOrgIDs,
		IsGlobal:         scope.IsGlobal,
		Status:           user.Status,
		NIP:              user.NIP,
		Jabatan:          user.Jabatan,
		Pangkat:          user.Pangkat,
		Capabilities: entity.UserCapabilities{
			RiskApprovalWorkflowEnabled: riskApprovalWorkflowEnabled,
		},
		MustChangePassword: user.MustChangePassword,
		CreatedAt:          user.CreatedAt,
		UpdatedAt:          user.UpdatedAt,
	}
}

func buildUserPublic(user *entity.User, scope *entity.AccessScope, riskApprovalWorkflowEnabled bool) *entity.UserPublic {
	return buildUserProfile(user, scope, riskApprovalWorkflowEnabled).ToPublic()
}
