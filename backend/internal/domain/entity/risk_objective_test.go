package entity

import (
	"testing"

	"github.com/google/uuid"
)

func TestRiskObjectiveValidate(t *testing.T) {
	orgID := uuid.MustParse("11111111-1111-1111-1111-111111111111")

	tests := []struct {
		name    string
		obj     RiskObjective
		wantErr bool
	}{
		{
			name: "valid objective",
			obj: RiskObjective{
				OrganizationID:        orgID,
				Period:                "2026-H1",
				Tujuan:                "Penguatan tata kelola",
				Sasaran:               "Peningkatan kepatuhan",
				IndikatorKinerjaUtama: "Persentase kepatuhan 95%",
			},
			wantErr: false,
		},
		{
			name: "missing organization id",
			obj: RiskObjective{
				Period:                "2026-H1",
				Tujuan:                "Penguatan tata kelola",
				Sasaran:               "Peningkatan kepatuhan",
				IndikatorKinerjaUtama: "Persentase kepatuhan 95%",
			},
			wantErr: true,
		},
		{
			name: "missing period",
			obj: RiskObjective{
				OrganizationID:        orgID,
				Tujuan:                "Penguatan tata kelola",
				Sasaran:               "Peningkatan kepatuhan",
				IndikatorKinerjaUtama: "Persentase kepatuhan 95%",
			},
			wantErr: true,
		},
		{
			name: "missing tujuan",
			obj: RiskObjective{
				OrganizationID:        orgID,
				Period:                "2026-H1",
				Sasaran:               "Peningkatan kepatuhan",
				IndikatorKinerjaUtama: "Persentase kepatuhan 95%",
			},
			wantErr: true,
		},
		{
			name: "missing sasaran",
			obj: RiskObjective{
				OrganizationID:        orgID,
				Period:                "2026-H1",
				Tujuan:                "Penguatan tata kelola",
				IndikatorKinerjaUtama: "Persentase kepatuhan 95%",
			},
			wantErr: true,
		},
		{
			name: "missing IKU",
			obj: RiskObjective{
				OrganizationID: orgID,
				Period:          "2026-H1",
				Tujuan:          "Penguatan tata kelola",
				Sasaran:         "Peningkatan kepatuhan",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.obj.Validate()
			if (err != nil) != tt.wantErr {
				t.Fatalf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}