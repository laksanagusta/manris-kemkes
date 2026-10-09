package config

import "testing"

func TestLoad_RiskApprovalWorkflowEnabled(t *testing.T) {
	tests := []struct {
		name     string
		value    string
		setValue bool
		want     bool
	}{
		{name: "default false when unset", want: false},
		{name: "explicit false", value: "false", setValue: true, want: false},
		{name: "explicit true", value: "true", setValue: true, want: true},
		{name: "invalid falls back to false", value: "not-a-bool", setValue: true, want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.setValue {
				t.Setenv("RISK_APPROVAL_WORKFLOW_ENABLED", tt.value)
			}

			cfg := Load()
			if cfg.RiskApprovalWorkflowEnabled != tt.want {
				t.Fatalf("RiskApprovalWorkflowEnabled = %v, want %v", cfg.RiskApprovalWorkflowEnabled, tt.want)
			}
		})
	}
}

func TestLoad_SharedAuthTokenLifetime(t *testing.T) {
	t.Setenv("JWT_EXPIRY_HOURS", "2")
	t.Setenv("AUTH_TOKEN_EXPIRY_MINUTES", "")
	if got := Load().AuthTokenExpiryMinutes; got != 120 {
		t.Fatalf("default lifetime=%d want 120", got)
	}
	t.Setenv("AUTH_TOKEN_EXPIRY_MINUTES", "15")
	if got := Load().AuthTokenExpiryMinutes; got != 15 {
		t.Fatalf("explicit lifetime=%d want 15", got)
	}
	t.Setenv("AUTH_TOKEN_EXPIRY_MINUTES", "invalid")
	if got := Load().AuthTokenExpiryMinutes; got != 0 {
		t.Fatalf("invalid lifetime should fail service initialization, got %d", got)
	}
}
