package tmpmr

import (
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func TestNormalizeTMPMRItemsDefaultsAndSorts(t *testing.T) {
	items, err := normalizeTMPMRItems(nil)
	if err != nil {
		t.Fatalf("normalizeTMPMRItems(nil) error = %v", err)
	}
	if len(items) != 6 {
		t.Fatalf("normalizeTMPMRItems(nil) len = %d, want 6", len(items))
	}
	if items[0].Dimension != "governance" || items[5].Dimension != "recording_reporting" {
		t.Fatalf("normalizeTMPMRItems(nil) order incorrect: first=%q last=%q", items[0].Dimension, items[5].Dimension)
	}
	for _, item := range items {
		if item.ID == uuid.Nil {
			t.Fatal("expected generated IDs for default TMPMR items")
		}
	}
}

func TestScoreTMPMRAssessment(t *testing.T) {
	assessment := &entity.TMPMRAssessment{
		Items: []entity.TMPMRItem{
			{Score: 2},
			{Score: 3},
			{Score: 4},
			{Score: 5},
			{Score: 4},
			{Score: 3},
		},
	}

	scoreTMPMRAssessment(assessment)

	if assessment.Score != 21.0/6.0 {
		t.Fatalf("assessment score = %v, want %v", assessment.Score, 21.0/6.0)
	}
	if assessment.MaturityLevel != "Terkelola" {
		t.Fatalf("assessment maturity = %q, want %q", assessment.MaturityLevel, "Terkelola")
	}
}
