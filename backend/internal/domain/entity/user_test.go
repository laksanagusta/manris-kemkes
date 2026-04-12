package entity

import (
	"testing"

	domainErrors "github.com/manris/backend/internal/domain/errors"
)

func TestUserValidateRejectsUnknownStatus(t *testing.T) {
	tests := []struct {
		name    string
		status  string
		wantErr bool
	}{
		{name: "pending activation is valid", status: UserStatusPendingActivation, wantErr: false},
		{name: "active is valid", status: UserStatusActive, wantErr: false},
		{name: "inactive is valid", status: UserStatusInactive, wantErr: false},
		{name: "unknown status is invalid", status: "paused", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			user := &User{
				Name:     "Test User",
				Email:    "test@example.com",
				Username: "test-user",
				Role:     RoleUnit,
				Status:   tt.status,
			}

			err := user.Validate()
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected validation error")
				}
				if err != domainErrors.ErrInvalidStatus {
					t.Fatalf("expected ErrInvalidStatus, got %v", err)
				}
				return
			}

			if err != nil {
				t.Fatalf("expected no validation error, got %v", err)
			}
		})
	}
}

func TestUserLifecycleHelpers(t *testing.T) {
	tests := []struct {
		name               string
		status             string
		mustChangePassword bool
		wantPending        bool
		wantFullSession    bool
	}{
		{
			name:               "pending activation requires setup flow",
			status:             UserStatusPendingActivation,
			mustChangePassword: true,
			wantPending:        true,
			wantFullSession:    false,
		},
		{
			name:               "active user can use full session",
			status:             UserStatusActive,
			mustChangePassword: false,
			wantPending:        false,
			wantFullSession:    true,
		},
		{
			name:               "active user with forced password change cannot use full session",
			status:             UserStatusActive,
			mustChangePassword: true,
			wantPending:        false,
			wantFullSession:    false,
		},
		{
			name:               "inactive user cannot use full session",
			status:             UserStatusInactive,
			mustChangePassword: false,
			wantPending:        false,
			wantFullSession:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			user := &User{
				Status:             tt.status,
				MustChangePassword: tt.mustChangePassword,
			}

			if got := user.IsPendingActivation(); got != tt.wantPending {
				t.Fatalf("IsPendingActivation() = %v, want %v", got, tt.wantPending)
			}

			if got := user.CanUseFullSession(); got != tt.wantFullSession {
				t.Fatalf("CanUseFullSession() = %v, want %v", got, tt.wantFullSession)
			}
		})
	}
}
