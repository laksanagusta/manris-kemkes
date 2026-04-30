package entity

import (
	"testing"

	"github.com/google/uuid"
)

func TestRiskObjectiveValidate(t *testing.T) {
	objective := RiskObjective{
		OrganizationID:        uuid.MustParse("11111111-1111-1111-1111-111111111111"),
		Period:                "2026-H1",
		Tujuan:                "Penguatan tata kelola",
		Sasaran:               "Peningkatan kepatuhan",
		IndikatorKinerjaUtama: "Persentase kepatuhan 95%",
	}
	if err := objective.Validate(); err != nil {
		t.Fatalf("Validate() unexpected error = %v", err)
	}
}
