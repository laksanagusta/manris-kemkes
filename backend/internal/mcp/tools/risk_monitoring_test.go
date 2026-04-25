package tools

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/mcp/session"
	approvaluc "github.com/manris/backend/internal/usecase/approval"
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
	approvalOutput := &approvaluc.SubmitApprovalOutput{
		ApprovalID: uuid.New().String(),
		Status:     "approved",
		Message:    "successfully approved",
	}
	mockApprovalUC := &mockApprovalSubmitUC{output: approvalOutput}

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

	output, err := HandleMonitorAndApproveRisk(context.Background(), mockReassessmentUC, mockApprovalUC, sess, args)
	if err != nil {
		t.Fatalf("HandleMonitorAndApproveRisk failed: %v", err)
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
	mockApprovalUC := &mockApprovalSubmitUC{}

	output, err := HandleMonitorAndApproveRisk(context.Background(), mockReassessmentUC, mockApprovalUC, nil, map[string]any{})
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

	output, err := HandleUpdateMonitoringDraft(context.Background(), mockUpdateUC, sess, args)
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

func TestHandleUpdateMonitoringDraft_NoSession(t *testing.T) {
	mockUpdateUC := &mockRiskUpdateUC{}

	output, err := HandleUpdateMonitoringDraft(context.Background(), mockUpdateUC, nil, map[string]any{})
	if err != ErrNotAuthenticated {
		t.Errorf("expected ErrNotAuthenticated, got %v", err)
	}
	if output != nil {
		t.Errorf("expected nil output on auth error")
	}
}
