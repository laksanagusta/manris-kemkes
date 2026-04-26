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

	reassessmentOutput := &riskuc.CreateRiskReassessmentOutput{
		ID:             riskID,
		VersionGroupID: versionGroupID,
		Status:         "assessment_draft",
		Message:        "risk reassessment draft created",
		ExistingDraft:  false,
	}

	mockReassessmentUC := &mockRiskReassessmentUC{output: reassessmentOutput}

	sess := &session.Session{
		UserID:           userID,
		Username:         "testuser",
		Name:             "Test User",
		Role:             "unit",
		AccessibleOrgIDs: []uuid.UUID{orgID},
	}

	args := map[string]any{
		"riskId":          riskID.String(),
		"assessmentCycle": "2026-H1",
		"riskApproverIds": []string{userID.String()},
		"submissionType":  "approval",
	}

	output, err := HandleMonitorRisk(context.Background(), mockReassessmentUC, sess, args)
	if err != nil {
		t.Fatalf("HandleMonitorRisk failed: %v", err)
	}

	if output == nil {
		t.Fatalf("Output is nil")
	}

	if output["status"] != "approved" {
		t.Errorf("expected status 'approved', got %v", output["status"])
	}
}

func TestHandleMonitorAndApproveRisk_NoSession(t *testing.T) {
	mockReassessmentUC := &mockRiskReassessmentUC{}

	output, err := HandleMonitorRisk(context.Background(), mockReassessmentUC, nil, map[string]any{})
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

	updateOutput := &riskuc.UpdateRiskOutput{
		ID:   riskID,
		Code: "R001",
	}

	mockUpdateUC := &mockRiskUpdateUC{output: updateOutput}
	mockGetUC := &mockRiskGetUC{risk: &entity.Risk{ID: riskID, Status: entity.RiskStatusDraft}}

	sess := &session.Session{
		UserID:           userID,
		Username:         "testuser",
		AccessibleOrgIDs: []uuid.UUID{orgID},
	}

	args := map[string]any{
		"id":              riskID.String(),
		"reviewSummary":   "Annual review completed",
		"assessmentCycle": "2026-H1",
	}

	output, err := HandleUpdateMonitoringDraft(context.Background(), mockUpdateUC, mockGetUC, sess, args)
	if err != nil {
		t.Fatalf("HandleUpdateMonitoringDraft failed: %v", err)
	}

	if output == nil {
		t.Fatalf("Output is nil")
	}

	if output["id"] != riskID.String() {
		t.Errorf("id mismatch")
	}

	if output["code"] != "R001" {
		t.Errorf("expected code 'R001', got %v", output["code"])
	}
}

func TestHandleUpdateMonitoringDraft_NotDraft(t *testing.T) {
	riskID := uuid.New()
	orgID := uuid.New()
	userID := uuid.New()

	mockUpdateUC := &mockRiskUpdateUC{}
	mockGetUC := &mockRiskGetUC{risk: &entity.Risk{ID: riskID, Status: entity.RiskStatusApproved}}

	sess := &session.Session{
		UserID:           userID,
		AccessibleOrgIDs: []uuid.UUID{orgID},
	}

	args := map[string]any{"id": riskID.String()}

	_, err := HandleUpdateMonitoringDraft(context.Background(), mockUpdateUC, mockGetUC, sess, args)
	if err != ErrMonitoringNotDraft {
		t.Errorf("expected ErrMonitoringNotDraft, got %v", err)
	}
}

func TestHandleUpdateMonitoringDraft_NoSession(t *testing.T) {
	mockUpdateUC := &mockRiskUpdateUC{}
	mockGetUC := &mockRiskGetUC{}

	output, err := HandleUpdateMonitoringDraft(context.Background(), mockUpdateUC, mockGetUC, nil, map[string]any{})
	if err != ErrNotAuthenticated {
		t.Errorf("expected ErrNotAuthenticated, got %v", err)
	}
	if output != nil {
		t.Errorf("expected nil output on auth error")
	}
}
