package entity

import (
	"testing"

	"github.com/google/uuid"
)

func TestRiskCascadeValidate(t *testing.T) {
	sourceRiskID := uuid.New()
	sourceOrgID := uuid.New()
	targetOrgID := uuid.New()

	tests := []struct {
		name    string
		cascade RiskCascade
		wantErr bool
	}{
		{
			name: "valid cascade",
			cascade: RiskCascade{
				SourceRiskID: sourceRiskID,
				SourceOrgID:  sourceOrgID,
				TargetOrgID:  targetOrgID,
				CascadeType:  "mandatory_top_down",
				Status:       "proposed",
				AdoptionType: "full",
			},
		},
		{
			name: "invalid type",
			cascade: RiskCascade{
				SourceRiskID: sourceRiskID,
				SourceOrgID:  sourceOrgID,
				TargetOrgID:  targetOrgID,
				CascadeType:  "invalid",
				Status:       "proposed",
			},
			wantErr: true,
		},
		{
			name: "invalid status",
			cascade: RiskCascade{
				SourceRiskID: sourceRiskID,
				SourceOrgID:  sourceOrgID,
				TargetOrgID:  targetOrgID,
				CascadeType:  "bottom_up_escalation",
				Status:       "foo",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.cascade.Validate()
			if (err != nil) != tt.wantErr {
				t.Fatalf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
