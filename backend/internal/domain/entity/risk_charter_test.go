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
				Title:          "Piagam Direktorat",
				OrganizationID: orgID,
				UPRLevel:       "upr_t1",
				Period:         "2026",
			},
			wantErr: false,
		},
		{
			name: "invalid upr level",
			charter: RiskCharter{
				Title:          "Piagam Direktorat",
				OrganizationID: orgID,
				UPRLevel:       "foo",
				Period:         "2026",
			},
			wantErr: true,
		},
		{
			name: "missing period",
			charter: RiskCharter{
				Title:          "Piagam Direktorat",
				OrganizationID: orgID,
				UPRLevel:       "upr_t1",
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

func TestRiskCharterValidateForFinalization(t *testing.T) {
	charter := RiskCharter{
		Title:           "Piagam Direktorat",
		OrganizationID:  uuid.MustParse("11111111-1111-1111-1111-111111111111"),
		UPRLevel:        "upr_t1",
		Period:          "2026",
		Scope:           "Seluruh tugas dan fungsi direktorat.",
		LegalBases:      []RiskCharterLegalBasis{{ID: "legal-1", Reference: "Permenkes 1/2026"}},
		InternalContext: "Kapasitas organisasi.",
		ExternalContext: "Perubahan regulasi.",
		Stakeholders: []RiskCharterStakeholder{{
			ID: "stakeholder-1", Name: "Masyarakat", Relationship: "Penerima layanan",
		}},
		UPRStructure: []RiskCharterUPRMember{
			{ID: "chair", Role: RiskCharterRoleChair, Name: "Ketua", Position: "Direktur"},
			{ID: "secretary", Role: RiskCharterRoleSecretary, Name: "Sekretaris", Position: "Analis"},
			{ID: "member", Role: RiskCharterRoleMember, Name: "Anggota", Position: "Pengelola"},
			{ID: "supervisor", Role: RiskCharterRoleSupervisor, Name: "Pengawas", Position: "Auditor"},
		},
	}

	if err := charter.ValidateForFinalization(); err != nil {
		t.Fatalf("ValidateForFinalization() error = %v", err)
	}

	charter.Stakeholders = nil
	if err := charter.ValidateForFinalization(); err == nil {
		t.Fatal("ValidateForFinalization() expected missing stakeholder error")
	}
}
