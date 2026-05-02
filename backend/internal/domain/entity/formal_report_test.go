package entity

import (
	"testing"

	"github.com/google/uuid"
)

func TestFormalReportValidate(t *testing.T) {
	orgID := uuid.MustParse("22222222-2222-2222-2222-222222222222")

	tests := []struct {
		name    string
		report  FormalReport
		wantErr bool
	}{
		{
			name: "valid generated report",
			report: FormalReport{
				OrganizationID: orgID,
				Period:         "2026-H1",
				ReportType:     FormalReportTypeTMPMR,
				Status:         FormalReportStatusGenerated,
			},
			wantErr: false,
		},
		{
			name: "invalid report type",
			report: FormalReport{
				OrganizationID: orgID,
				Period:         "2026-H1",
				ReportType:     "foo",
				Status:         FormalReportStatusGenerated,
			},
			wantErr: true,
		},
		{
			name: "invalid report status",
			report: FormalReport{
				OrganizationID: orgID,
				Period:         "2026-H1",
				ReportType:     FormalReportTypeTMPMR,
				Status:         "bad",
			},
			wantErr: true,
		},
		{
			name: "missing period",
			report: FormalReport{
				OrganizationID: orgID,
				ReportType:     FormalReportTypeTMPMR,
				Status:         FormalReportStatusGenerated,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.report.Validate()
			if (err != nil) != tt.wantErr {
				t.Fatalf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestFormalReportTypeHelpers(t *testing.T) {
	for _, typ := range []string{
		FormalReportTypeAnnualRiskProfile,
		FormalReportTypeSemiannualImplementation,
		FormalReportTypeSemiannualSupervision,
		FormalReportTypeTMPMR,
	} {
		if !IsValidFormalReportType(typ) {
			t.Fatalf("expected report type %q to be valid", typ)
		}
	}

	if IsValidFormalReportType("unknown") {
		t.Fatal("expected unknown report type to be invalid")
	}
}
