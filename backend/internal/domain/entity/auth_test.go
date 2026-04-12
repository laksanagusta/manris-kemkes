package entity

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestUserProfileToPublicIncludesLifecycleState(t *testing.T) {
	organizationID := uuid.New()
	accessibleOrgID := uuid.New()
	now := time.Now()

	profile := &UserProfile{
		ID:                 uuid.New(),
		Username:           "test-user",
		Name:               "Test User",
		Role:               RoleReviewer,
		OrganizationID:     &organizationID,
		AccessibleOrgIDs:   []uuid.UUID{accessibleOrgID},
		IsGlobal:           false,
		Status:             UserStatusPendingActivation,
		MustChangePassword: true,
		CreatedAt:          now,
		UpdatedAt:          now,
	}

	public := profile.ToPublic()

	if public.Status != profile.Status {
		t.Fatalf("Status = %q, want %q", public.Status, profile.Status)
	}

	if public.MustChangePassword != profile.MustChangePassword {
		t.Fatalf("MustChangePassword = %v, want %v", public.MustChangePassword, profile.MustChangePassword)
	}

	if public.OrganizationID == nil || *public.OrganizationID != organizationID {
		t.Fatalf("OrganizationID = %v, want %v", public.OrganizationID, organizationID)
	}

	if len(public.AccessibleOrgIDs) != 1 || public.AccessibleOrgIDs[0] != accessibleOrgID {
		t.Fatalf("AccessibleOrgIDs = %v, want [%v]", public.AccessibleOrgIDs, accessibleOrgID)
	}
}
