package entity

import (
	"testing"
)

func TestImpactCriteriaValidate(t *testing.T) {
	tests := []struct {
		name     string
		criteria ImpactCriteria
		wantErr  bool
	}{
		{
			name: "valid operasional tingkat kementerian",
			criteria: ImpactCriteria{
				Category:    "operasional",
				UPRLevel:    "kementerian",
				ImpactLevel: 3,
				ImpactLabel: "Sedang",
				Description: "Terganggunya pelayanan lebih dari 2 hari kerja hingga 3 hari kerja",
			},
			wantErr: false,
		},
		{
			name: "valid fraud_korupsi tingkat upr_t1",
			criteria: ImpactCriteria{
				Category:    "fraud_korupsi",
				UPRLevel:    "upr_t1",
				ImpactLevel: 4,
				ImpactLabel: "Besar",
				Description: "Kerugian Keuangan > 100 Juta - 150 Juta",
			},
			wantErr: false,
		},
		{
			name: "invalid category",
			criteria: ImpactCriteria{
				Category:    "foo",
				UPRLevel:    "kementerian",
				ImpactLevel: 3,
				Description: "desc",
			},
			wantErr: true,
		},
		{
			name: "invalid upr level",
			criteria: ImpactCriteria{
				Category:    "operasional",
				UPRLevel:    "foo",
				ImpactLevel: 3,
				Description: "desc",
			},
			wantErr: true,
		},
		{
			name: "impact level zero",
			criteria: ImpactCriteria{
				Category:    "operasional",
				UPRLevel:    "kementerian",
				ImpactLevel: 0,
				Description: "desc",
			},
			wantErr: true,
		},
		{
			name: "impact level > 5",
			criteria: ImpactCriteria{
				Category:    "operasional",
				UPRLevel:    "kementerian",
				ImpactLevel: 6,
				Description: "desc",
			},
			wantErr: true,
		},
		{
			name: "empty description",
			criteria: ImpactCriteria{
				Category:    "operasional",
				UPRLevel:    "kementerian",
				ImpactLevel: 3,
				Description: "",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.criteria.Validate()
			if (err != nil) != tt.wantErr {
				t.Fatalf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestImpactCriteriaLabels(t *testing.T) {
	levels := map[int]string{
		1: "Tidak Signifikan",
		2: "Kecil",
		3: "Sedang",
		4: "Besar",
		5: "Katastropik",
	}
	for level, label := range levels {
		if label == "" {
			t.Errorf("Empty label for level %d", level)
		}
	}
}