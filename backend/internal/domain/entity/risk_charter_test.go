package entity

import (
	"testing"

	"github.com/google/uuid"
)

func TestRiskCharterValidate(t *testing.T) {
	orgID := uuid.MustParse("11111111-1111-1111-1111-111111111111")

	tests := []struct {
		name    string
		charter RiskCharter
		wantErr bool
	}{
		{
			name: "valid charter",
			charter: RiskCharter{
				OrganizationID: orgID,
				UPRLevel:       "upr_t1",
				Period:         "2026-H1",
				RiskOwnerName:  "Direktur A",
				Status:         "draft",
			},
			wantErr: false,
		},
		{
			name: "invalid upr level",
			charter: RiskCharter{
				OrganizationID: orgID,
				UPRLevel:       "foo",
				Period:         "2026-H1",
				RiskOwnerName:  "Direktur A",
				Status:         "draft",
			},
			wantErr: true,
		},
		{
			name: "missing period",
			charter: RiskCharter{
				OrganizationID: orgID,
				UPRLevel:       "upr_t1",
				RiskOwnerName:  "Direktur A",
				Status:         "draft",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.charter.Validate()
			if (err != nil) != tt.wantErr {
				t.Fatalf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
