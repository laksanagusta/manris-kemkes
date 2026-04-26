package tools

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/mcp/session"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

func TestHandleCreateAndApproveRisk_Success(t *testing.T) {
	riskID := uuid.New()
	orgID := uuid.New()
	userID := uuid.New()

	createOutput := &riskuc.CreateRiskOutput{
		ID:   riskID,
		Code: "R001",
	}

	refetchedRisk := &entity.Risk{
		ID:             riskID,
		Title:          "New Risk",
		OrganizationID: &orgID,
		Status:         "approved",
	}

	mockCreateUC := &mockRiskCreateUC{output: createOutput}
	mockGetUC := &mockRiskGetUC{risk: refetchedRisk}

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

	output, err := HandleCreateRisk(context.Background(), mockCreateUC, mockGetUC, sess, args)
	if err != nil {
		t.Fatalf("HandleCreateAndApproveRisk failed: %v", err)
	}

	if output == nil {
		t.Fatalf("Output is nil")
	}

	if risk, ok := output["risk"].(map[string]interface{}); ok {
		if risk["id"] != riskID.String() {
			t.Errorf("risk id mismatch")
		}
	} else {
		t.Errorf("risk not in output")
	}
}

func TestHandleCreateAndApproveRisk_NoSession(t *testing.T) {
	mockCreateUC := &mockRiskCreateUC{}
	mockGetUC := &mockRiskGetUC{}

	output, err := HandleCreateRisk(context.Background(), mockCreateUC, mockGetUC, nil, map[string]any{})
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

	draftRisk := &entity.Risk{
		ID:             riskID,
		Title:          "Draft Risk",
		OrganizationID: &orgID,
		Status:         entity.RiskStatusDraft,
	}

	updateOutput := &riskuc.UpdateRiskOutput{
		ID:   riskID,
		Code: "R001",
	}

	mockGetUC := &mockRiskGetUC{risk: draftRisk}
	mockUpdateUC := &mockRiskUpdateUC{output: updateOutput}

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

	output, err := HandleUpdateRiskDraft(context.Background(), mockUpdateUC, mockGetUC, sess, args)
	if err != nil {
		t.Fatalf("HandleUpdateRiskDraft failed: %v", err)
	}

	if output == nil {
		t.Fatalf("Output is nil")
	}

	if output["id"] != riskID.String() {
		t.Errorf("id mismatch")
	}
}

func TestHandleUpdateRiskDraft_NoSession(t *testing.T) {
	mockUpdateUC := &mockRiskUpdateUC{}
	mockGetUC := &mockRiskGetUC{}

	output, err := HandleUpdateRiskDraft(context.Background(), mockUpdateUC, mockGetUC, nil, map[string]any{})
	if err != ErrNotAuthenticated {
		t.Errorf("expected ErrNotAuthenticated, got %v", err)
	}
	if output != nil {
		t.Errorf("expected nil output on auth error")
	}
}

func TestHandleUpdateRiskDraft_NotDraftStatus(t *testing.T) {
	riskID := uuid.New()
	orgID := uuid.New()
	userID := uuid.New()

	approvedRisk := &entity.Risk{
		ID:             riskID,
		Title:          "Approved Risk",
		OrganizationID: &orgID,
		Status:         entity.RiskStatusApproved,
	}

	mockGetUC := &mockRiskGetUC{risk: approvedRisk}
	mockUpdateUC := &mockRiskUpdateUC{}

	sess := &session.Session{
		UserID:           userID,
		Username:         "testuser",
		AccessibleOrgIDs: []uuid.UUID{orgID},
	}

	args := map[string]any{
		"id":    riskID.String(),
		"title": "Updated",
	}

	output, err := HandleUpdateRiskDraft(context.Background(), mockUpdateUC, mockGetUC, sess, args)
	if err != ErrRiskNotDraft {
		t.Errorf("expected ErrRiskNotDraft, got %v", err)
	}
	if output != nil {
		t.Errorf("expected nil output when risk not in draft")
	}
}

func TestHandleUpdateRiskDraft_MergesCurrentFieldsForStatusOnlyUpdate(t *testing.T) {
	riskID := uuid.New()
	orgID := uuid.New()
	userID := uuid.New()

	currentRisk := &entity.Risk{
		ID:             riskID,
		Code:           "R001",
		Title:          "Existing Risk",
		Description:    "Existing description",
		Category:       entity.RiskCategoryKebijakan,
		Status:         entity.RiskStatusDraft,
		OrganizationID: &orgID,
		Probability:    4,
		Impact:         3,
	}

	mockGetUC := &mockRiskGetUC{risk: currentRisk}
	mockUpdateUC := &mockRiskUpdateUC{output: &riskuc.UpdateRiskOutput{ID: riskID, Code: "R001"}}

	sess := &session.Session{
		UserID:           userID,
		Username:         "testuser",
		AccessibleOrgIDs: []uuid.UUID{orgID},
	}

	args := map[string]any{
		"id":     riskID.String(),
		"status": entity.RiskStatusApproved,
	}

	if _, err := HandleUpdateRiskDraft(context.Background(), mockUpdateUC, mockGetUC, sess, args); err != nil {
		t.Fatalf("HandleUpdateRiskDraft failed: %v", err)
	}

	if mockUpdateUC.input.Title != currentRisk.Title {
		t.Fatalf("expected title %q, got %q", currentRisk.Title, mockUpdateUC.input.Title)
	}
	if mockUpdateUC.input.Description != currentRisk.Description {
		t.Fatalf("expected description %q, got %q", currentRisk.Description, mockUpdateUC.input.Description)
	}
	if mockUpdateUC.input.Category != currentRisk.Category {
		t.Fatalf("expected category %q, got %q", currentRisk.Category, mockUpdateUC.input.Category)
	}
	if mockUpdateUC.input.Status != entity.RiskStatusApproved {
		t.Fatalf("expected status %q, got %q", entity.RiskStatusApproved, mockUpdateUC.input.Status)
	}
	if mockUpdateUC.input.OrganizationID == nil || *mockUpdateUC.input.OrganizationID != orgID {
		t.Fatalf("expected organization id %s, got %v", orgID, mockUpdateUC.input.OrganizationID)
	}
	if mockUpdateUC.input.Probability != currentRisk.Probability {
		t.Fatalf("expected probability %d, got %d", currentRisk.Probability, mockUpdateUC.input.Probability)
	}
	if mockUpdateUC.input.Impact != currentRisk.Impact {
		t.Fatalf("expected impact %d, got %d", currentRisk.Impact, mockUpdateUC.input.Impact)
	}
	if len(mockUpdateUC.orgIDs) != 1 || mockUpdateUC.orgIDs[0] != orgID {
		t.Fatalf("expected org scope [%s], got %v", orgID, mockUpdateUC.orgIDs)
	}
}

func TestHandleCreateAndApproveRisk_CreateUseCaseError(t *testing.T) {
	orgID := uuid.New()
	userID := uuid.New()

	wantErr := errors.New("db unavailable")
	mockCreateUC := &mockRiskCreateUC{err: wantErr}
	mockGetUC := &mockRiskGetUC{}

	sess := &session.Session{
		UserID:           userID,
		Username:         "testuser",
		Name:             "Test User",
		Role:             "unit",
		AccessibleOrgIDs: []uuid.UUID{orgID},
	}

	args := map[string]any{
		"title":          "New Risk",
		"category":       "Category 1",
		"organizationId": orgID.String(),
		"probability":    3,
		"impact":         4,
		"weight":         12.0,
	}

	output, err := HandleCreateRisk(context.Background(), mockCreateUC, mockGetUC, sess, args)
	if !errors.Is(err, wantErr) {
		t.Errorf("expected create UC error, got %v", err)
	}
	if output != nil {
		t.Errorf("expected nil output on create error")
	}
}
