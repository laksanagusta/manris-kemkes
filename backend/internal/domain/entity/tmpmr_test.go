package entity

import (
	"testing"

	"github.com/google/uuid"
)

func TestTMPMRAssessmentValidate(t *testing.T) {
	orgID := uuid.MustParse("11111111-1111-1111-1111-111111111111")

	tests := []struct {
		name    string
		assess  TMPMRAssessment
		wantErr bool
	}{
		{
			name: "valid draft assessment",
			assess: TMPMRAssessment{
				OrganizationID: orgID,
				Period:         "2026-H1",
				Status:         TMPMRStatusDraft,
			},
			wantErr: false,
		},
		{
			name: "missing period",
			assess: TMPMRAssessment{
				OrganizationID: orgID,
				Status:         TMPMRStatusDraft,
			},
			wantErr: true,
		},
		{
			name: "invalid status",
			assess: TMPMRAssessment{
				OrganizationID: orgID,
				Period:         "2026-H1",
				Status:         TMPMRStatus("bad"),
			},
			wantErr: true,
		},
		{
			name: "missing organization id",
			assess: TMPMRAssessment{
				Period: "2026-H1",
				Status: TMPMRStatusDraft,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.assess.Validate()
			if (err != nil) != tt.wantErr {
				t.Fatalf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestTMPMRMaturityLevel(t *testing.T) {
	tests := []struct {
		score float64
		want  string
	}{
		{0, "Awal"},
		{1.49, "Awal"},
		{1.50, "Berkembang"},
		{2.49, "Berkembang"},
		{2.50, "Terdefinisi"},
		{3.49, "Terdefinisi"},
		{3.50, "Terkelola"},
		{4.49, "Terkelola"},
		{4.50, "Optimum"},
		{5.00, "Optimum"},
	}

	for _, tt := range tests {
		t.Run(tt.want, func(t *testing.T) {
			if got := TMPMRMaturityLevel(tt.score); got != tt.want {
				t.Fatalf("TMPMRMaturityLevel(%v) = %q, want %q", tt.score, got, tt.want)
			}
		})
	}
}

func TestCalculateTMPMRScore(t *testing.T) {
	items := []TMPMRItem{
		{Score: 2},
		{Score: 3},
		{Score: 4},
		{Score: 5},
		{Score: 4},
		{Score: 3},
	}

	score, level := CalculateTMPMRScore(items)
	if score != 21.0/6.0 {
		t.Fatalf("CalculateTMPMRScore() score = %v, want %v", score, 21.0/6.0)
	}
	if level != "Terkelola" {
		t.Fatalf("CalculateTMPMRScore() level = %q, want %q", level, "Terkelola")
	}
}

func TestDefaultTMPMRItems(t *testing.T) {
	items := DefaultTMPMRItems()
	if len(items) != 6 {
		t.Fatalf("DefaultTMPMRItems() len = %d, want 6", len(items))
	}

	wantDimensions := []string{
		"governance",
		"context_criteria",
		"risk_assessment",
		"risk_treatment",
		"monitoring_review",
		"recording_reporting",
	}

	for i, want := range wantDimensions {
		if items[i].Dimension != want {
			t.Fatalf("DefaultTMPMRItems()[%d].Dimension = %q, want %q", i, items[i].Dimension, want)
		}
		if items[i].Question == "" {
			t.Fatalf("DefaultTMPMRItems()[%d].Question should not be empty", i)
		}
	}
}
