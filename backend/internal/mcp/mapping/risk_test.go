package mapping

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/mcp/session"
)

func TestToCreateRiskInput_Happy(t *testing.T) {
	orgID := uuid.New()
	sess := &session.Session{
		UserID:           uuid.New(),
		Username:         "testuser",
		Name:             "Test",
		Role:             "unit",
		AccessibleOrgIDs: []uuid.UUID{orgID},
		ExpiresAt:        time.Now().Add(1 * time.Hour),
	}

	args := map[string]any{
		"title":                "Risk A",
		"description":          "High risk",
		"category":             "operational",
		"organizationId":       orgID.String(),
		"probability":          3,
		"impact":               4,
		"weight":               0.5,
		"cause":                []interface{}{"cause1", "cause2"},
		"impactDesc":           []interface{}{"impact1"},
		"riskSource":           "external",
		"controllability":      "manageable",
		"existingControl":      "procedure",
		"controlEffectiveness": "moderate",
		"riskPriority":         2,
		"riskAppetite":         "low",
		"treatmentOption":      "mitigate",
		"targetProbability":    2,
		"targetImpact":         2,
		"targetWeight":         0.3,
		"assessmentCycle":      "H1",
		"reviewType":           "periodic",
	}

	input, err := ToCreateRiskInput(args, sess)
	if err != nil {
		t.Fatalf("ToCreateRiskInput failed: %v", err)
	}

	if input.Title != "Risk A" {
		t.Errorf("Title mismatch: expected 'Risk A', got %s", input.Title)
	}
	if input.OrganizationID == nil || *input.OrganizationID != orgID {
		t.Errorf("OrganizationID mismatch")
	}
	if input.Probability != 3 {
		t.Errorf("Probability mismatch: expected 3, got %d", input.Probability)
	}
}

func TestToCreateRiskInput_MissingRequired(t *testing.T) {
	sess := &session.Session{
		UserID:           uuid.New(),
		Username:         "testuser",
		Name:             "Test",
		Role:             "unit",
		AccessibleOrgIDs: []uuid.UUID{uuid.New()},
		ExpiresAt:        time.Now().Add(1 * time.Hour),
	}

	args := map[string]any{
		"description": "Missing title",
		"category":    "operational",
	}

	_, err := ToCreateRiskInput(args, sess)
	if err == nil {
		t.Fatalf("ToCreateRiskInput should fail with missing title")
	}
}

func TestToCreateRiskInput_InvalidOrgScope(t *testing.T) {
	orgID := uuid.New()
	accessibleOrgID := uuid.New()
	sess := &session.Session{
		UserID:           uuid.New(),
		Username:         "testuser",
		Name:             "Test",
		Role:             "unit",
		AccessibleOrgIDs: []uuid.UUID{accessibleOrgID},
		ExpiresAt:        time.Now().Add(1 * time.Hour),
	}

	args := map[string]any{
		"title":          "Risk B",
		"description":    "Out of scope",
		"category":       "operational",
		"organizationId": orgID.String(),
		"probability":    2,
		"impact":         2,
	}

	_, err := ToCreateRiskInput(args, sess)
	if err == nil {
		t.Fatalf("ToCreateRiskInput should fail with org outside accessible scope")
	}
}

func TestToListRisksInput_DefaultOrgScope(t *testing.T) {
	orgID := uuid.New()
	sess := &session.Session{
		UserID:           uuid.New(),
		Username:         "testuser",
		Name:             "Test",
		Role:             "unit",
		AccessibleOrgIDs: []uuid.UUID{orgID},
		ExpiresAt:        time.Now().Add(1 * time.Hour),
	}

	args := map[string]any{
		"status":   "in_review",
		"category": "operational",
	}

	input, err := ToListRisksInput(args, sess)
	if err != nil {
		t.Fatalf("ToListRisksInput failed: %v", err)
	}

	if len(input.OrgIDs) != 1 || input.OrgIDs[0] != orgID {
		t.Errorf("OrgIDs should default to session AccessibleOrgIDs")
	}
	if input.Status != "in_review" {
		t.Errorf("Status mismatch")
	}
}

func TestToListRisksInput_OverrideOrgScope(t *testing.T) {
	orgID1 := uuid.New()
	orgID2 := uuid.New()
	sess := &session.Session{
		UserID:           uuid.New(),
		Username:         "testuser",
		Name:             "Test",
		Role:             "super_admin",
		AccessibleOrgIDs: []uuid.UUID{orgID1, orgID2},
		ExpiresAt:        time.Now().Add(1 * time.Hour),
	}

	args := map[string]any{
		"organizationIds": []interface{}{orgID1.String()},
	}

	input, err := ToListRisksInput(args, sess)
	if err != nil {
		t.Fatalf("ToListRisksInput failed: %v", err)
	}

	if len(input.OrgIDs) != 1 || input.OrgIDs[0] != orgID1 {
		t.Errorf("OrgIDs should be overridden when provided")
	}
}

func TestToUpdateRiskInput_Happy(t *testing.T) {
	riskID := uuid.New()
	orgID := uuid.New()
	sess := &session.Session{
		UserID:           uuid.New(),
		Username:         "testuser",
		Name:             "Test",
		Role:             "unit",
		AccessibleOrgIDs: []uuid.UUID{orgID},
		ExpiresAt:        time.Now().Add(1 * time.Hour),
	}

	args := map[string]any{
		"id":          riskID.String(),
		"title":       "Updated Risk",
		"description": "Updated desc",
		"status":      "assessment_draft",
		"probability": 2,
		"impact":      3,
		"reviewType":  "corrective",
	}

	input, err := ToUpdateRiskInput(args, sess)
	if err != nil {
		t.Fatalf("ToUpdateRiskInput failed: %v", err)
	}

	if input.ID != riskID {
		t.Errorf("ID mismatch")
	}
	if input.Title != "Updated Risk" {
		t.Errorf("Title mismatch")
	}
	if input.Status != "assessment_draft" {
		t.Errorf("Status mismatch")
	}
}

func TestToUpdateRiskInput_MissingID(t *testing.T) {
	sess := &session.Session{
		UserID:           uuid.New(),
		Username:         "testuser",
		Name:             "Test",
		Role:             "unit",
		AccessibleOrgIDs: []uuid.UUID{uuid.New()},
		ExpiresAt:        time.Now().Add(1 * time.Hour),
	}

	args := map[string]any{
		"title": "Missing ID",
	}

	_, err := ToUpdateRiskInput(args, sess)
	if err == nil {
		t.Fatalf("ToUpdateRiskInput should fail with missing id")
	}
}

func TestToUpdateRiskInput_InvalidOrgScope(t *testing.T) {
	riskID := uuid.New()
	orgID := uuid.New()
	accessibleOrgID := uuid.New()
	sess := &session.Session{
		UserID:           uuid.New(),
		Username:         "testuser",
		Name:             "Test",
		Role:             "unit",
		AccessibleOrgIDs: []uuid.UUID{accessibleOrgID},
		ExpiresAt:        time.Now().Add(1 * time.Hour),
	}

	args := map[string]any{
		"id":             riskID.String(),
		"title":          "Out of scope",
		"organizationId": orgID.String(),
	}

	_, err := ToUpdateRiskInput(args, sess)
	if err == nil {
		t.Fatalf("ToUpdateRiskInput should fail with org outside accessible scope")
	}
}
