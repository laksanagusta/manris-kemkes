package tools

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/mcp/session"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

func TestHandleMonitorAndApproveRisk_Success(t *testing.T) {
	riskID := uuid.New()
	versionGroupID := uuid.New()
	orgID := uuid.New()
	userID := uuid.New()

	monitoringOutput := &riskuc.StartMonitoringOutput{
		Monitoring: &entity.RiskMonitoring{
			ID:              riskID,
			VersionGroupID:  versionGroupID,
			Status:          entity.RiskMonitoringStatusDraft,
			AssessmentCycle: "2026-Q2",
		},
		Message:       "monitoring transaction created",
		RedirectURL:   "/risk/monitoring/" + riskID.String(),
		ExistingDraft: false,
	}

	mockMonitoringStarter := &mockRiskMonitoringStarter{output: monitoringOutput}

	sess := &session.Session{
		UserID:           userID,
		Username:         "testuser",
		Name:             "Test User",
		Role:             "unit",
		AccessibleOrgIDs: []uuid.UUID{orgID},
	}

	args := map[string]any{
		"riskId":          riskID.String(),
		"assessmentCycle": "2026-Q2",
		"riskApproverIds": []string{userID.String()},
		"submissionType":  "approval",
	}

	output, err := HandleMonitorRisk(context.Background(), mockMonitoringStarter, sess, args)
	if err != nil {
		t.Fatalf("HandleMonitorRisk failed: %v", err)
	}

	if output == nil {
		t.Fatalf("Output is nil")
	}

	if output["id"] != riskID.String() {
		t.Errorf("expected id %q, got %v", riskID.String(), output["id"])
	}

	if output["cycle"] != "2026-Q2" {
		t.Errorf("expected cycle '2026-Q2', got %v", output["cycle"])
	}
}

func TestHandleMonitorAndApproveRisk_NoSession(t *testing.T) {
	mockMonitoringStarter := &mockRiskMonitoringStarter{}

	output, err := HandleMonitorRisk(context.Background(), mockMonitoringStarter, nil, map[string]any{})
	if err != ErrNotAuthenticated {
		t.Errorf("expected ErrNotAuthenticated, got %v", err)
	}
	if output != nil {
		t.Errorf("expected nil output on auth error")
	}
}

func TestHandleUpdateMonitoringDraft_Success(t *testing.T) {
	riskID := uuid.New()
	orgID := uuid.New()
	userID := uuid.New()

	mockMonitoringUC := &mockRiskMonitoringUpdater{output: &riskuc.UpdateMonitoringOutput{
		Monitoring: &entity.RiskMonitoring{ID: riskID},
		Message:    "monitoring draft updated",
	}}

	sess := &session.Session{
		UserID:           userID,
		Username:         "testuser",
		AccessibleOrgIDs: []uuid.UUID{orgID},
	}

	args := map[string]any{
		"id":          riskID.String(),
		"conclusion":  "Annual review completed",
		"probability": 3,
		"impact":      4,
	}

	output, err := HandleUpdateMonitoringDraft(context.Background(), mockMonitoringUC, sess, args)
	if err != nil {
		t.Fatalf("HandleUpdateMonitoringDraft failed: %v", err)
	}

	if output == nil {
		t.Fatalf("Output is nil")
	}

	if output["id"] != riskID.String() {
		t.Errorf("id mismatch")
	}

}

func TestHandleUpdateMonitoringDraft_NotDraft(t *testing.T) {
	riskID := uuid.New()
	orgID := uuid.New()
	userID := uuid.New()

	mockUpdateUC := &mockRiskMonitoringUpdater{err: ErrMonitoringNotDraft}

	sess := &session.Session{
		UserID:           userID,
		AccessibleOrgIDs: []uuid.UUID{orgID},
	}

	args := map[string]any{"id": riskID.String()}

	_, err := HandleUpdateMonitoringDraft(context.Background(), mockUpdateUC, sess, args)
	if err != ErrMonitoringNotDraft {
		t.Errorf("expected ErrMonitoringNotDraft, got %v", err)
	}
}

func TestHandleUpdateMonitoringDraft_NoSession(t *testing.T) {
	mockUpdateUC := &mockRiskMonitoringUpdater{}

	output, err := HandleUpdateMonitoringDraft(context.Background(), mockUpdateUC, nil, map[string]any{})
	if err != ErrNotAuthenticated {
		t.Errorf("expected ErrNotAuthenticated, got %v", err)
	}
	if output != nil {
		t.Errorf("expected nil output on auth error")
	}
}

func TestHandleUpdateMonitoringDraft_MapsMonitoringFields(t *testing.T) {
	riskID := uuid.New()
	orgID := uuid.New()
	userID := uuid.New()

	mockUpdateUC := &mockRiskMonitoringUpdater{output: &riskuc.UpdateMonitoringOutput{
		Monitoring: &entity.RiskMonitoring{ID: riskID},
		Message:    "monitoring draft updated",
	}}

	sess := &session.Session{
		UserID:           userID,
		Username:         "testuser",
		AccessibleOrgIDs: []uuid.UUID{orgID},
	}

	args := map[string]any{
		"id":           riskID.String(),
		"probability":  3,
		"impact":       4,
		"conclusion":   "Updated summary",
		"changeReason": "Kondisi berubah",
	}

	if _, err := HandleUpdateMonitoringDraft(context.Background(), mockUpdateUC, sess, args); err != nil {
		t.Fatalf("HandleUpdateMonitoringDraft failed: %v", err)
	}
}
