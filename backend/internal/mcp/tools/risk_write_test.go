package tools

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/mcp/session"
	approvaluc "github.com/manris/backend/internal/usecase/approval"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

type mockRiskCreateUC struct {
	risk *entity.Risk
	err  error
}

func (m *mockRiskCreateUC) Execute(ctx context.Context, input riskuc.CreateRiskInput) (*entity.Risk, error) {
	return m.risk, m.err
}

type mockRiskUpdateUC struct {
	risk *entity.Risk
	err  error
}

func (m *mockRiskUpdateUC) Execute(ctx context.Context, input riskuc.UpdateRiskInput) (*entity.Risk, error) {
	return m.risk, m.err
}

type mockApprovalSubmitUC struct {
	output *approvaluc.SubmitApprovalOutput
	err    error
}

func (m *mockApprovalSubmitUC) Execute(ctx context.Context, input approvaluc.SubmitApprovalInput) (*approvaluc.SubmitApprovalOutput, error) {
	return m.output, m.err
}

func TestHandleCreateAndApproveRisk_Success(t *testing.T) {
	riskID := uuid.New()
	orgID := uuid.New()
	userID := uuid.New()

	createdRisk := &entity.Risk{
		ID:             riskID,
		Title:          "New Risk",
		OrganizationID: &orgID,
		Status:         "approved",
	}

	mockCreateUC := &mockRiskCreateUC{risk: createdRisk}
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
		"title":           "New Risk",
		"category":        "Category 1",
		"organizationId":  orgID.String(),
		"description":     "Risk description",
		"probability":     3,
		"impact":          4,
		"weight":          12.0,
		"riskApproverIds": []string{userID.String()},
		"submissionType":  "approval",
	}

	output, err := HandleCreateAndApproveRisk(context.Background(), mockCreateUC, mockApprovalUC, sess, args)
	if err != nil {
		t.Fatalf("HandleCreateAndApproveRisk failed: %v", err)
	}

	if output == nil {
		t.Fatalf("Output is nil")
	}

	if output["id"] != riskID.String() {
		t.Errorf("id mismatch")
	}

	if output["status"] != "approved" {
		t.Errorf("expected status 'approved', got %v", output["status"])
	}
}

func TestHandleCreateAndApproveRisk_NoSession(t *testing.T) {
	mockCreateUC := &mockRiskCreateUC{}
	mockApprovalUC := &mockApprovalSubmitUC{}

	output, err := HandleCreateAndApproveRisk(context.Background(), mockCreateUC, mockApprovalUC, nil, map[string]any{})
	if err != ErrNotAuthenticated {
		t.Errorf("expected ErrNotAuthenticated, got %v", err)
	}
	if output != nil {
		t.Errorf("expected nil output on auth error")
	}
}

func TestHandleUpdateRiskDraft_Success(t *testing.T) {
	riskID := uuid.New()
	orgID := uuid.New()
	userID := uuid.New()

	updatedRisk := &entity.Risk{
		ID:             riskID,
		Title:          "Updated Risk",
		OrganizationID: &orgID,
		Status:         "draft",
	}

	mockUpdateUC := &mockRiskUpdateUC{risk: updatedRisk}

	sess := &session.Session{
		UserID:           userID,
		Username:         "testuser",
		AccessibleOrgIDs: []uuid.UUID{orgID},
	}

	args := map[string]any{
		"id":          riskID.String(),
		"title":       "Updated Risk",
		"description": "Updated description",
	}

	output, err := HandleUpdateRiskDraft(context.Background(), mockUpdateUC, sess, args)
	if err != nil {
		t.Fatalf("HandleUpdateRiskDraft failed: %v", err)
	}

	if output == nil {
		t.Fatalf("Output is nil")
	}

	if output["id"] != riskID.String() {
		t.Errorf("id mismatch")
	}

	if output["title"] != "Updated Risk" {
		t.Errorf("title mismatch")
	}
}

func TestHandleUpdateRiskDraft_NoSession(t *testing.T) {
	mockUpdateUC := &mockRiskUpdateUC{}

	output, err := HandleUpdateRiskDraft(context.Background(), mockUpdateUC, nil, map[string]any{})
	if err != ErrNotAuthenticated {
		t.Errorf("expected ErrNotAuthenticated, got %v", err)
	}
	if output != nil {
		t.Errorf("expected nil output on auth error")
	}
}
