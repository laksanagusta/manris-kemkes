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
