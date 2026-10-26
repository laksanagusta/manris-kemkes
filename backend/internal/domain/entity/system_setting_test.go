package entity

import "testing"

func TestAgentModelUsesDedicatedSettingAndSharedFallback(t *testing.T) {
	tests := []struct {
		name   string
		models AIModels
		want   string
	}{
		{"dedicated", AIModels{Default: "shared-model", Agent: "agent-model"}, "agent-model"},
		{"shared fallback", AIModels{Default: "shared-model"}, "shared-model"},
		{"existing fallback", AIModels{}, "gpt-4o-mini"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.models.GetModelForFeature("agent"); got != tt.want {
				t.Fatalf("model = %q, want %q", got, tt.want)
			}
		})
	}
}
