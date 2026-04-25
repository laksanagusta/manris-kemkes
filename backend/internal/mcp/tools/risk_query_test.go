package tools

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/mcp/session"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

type mockRiskGetUC struct {
	risk *entity.Risk
	err  error
}

func (m *mockRiskGetUC) Execute(ctx context.Context, id string, user *entity.UserPublic) (*entity.Risk, error) {
	return m.risk, m.err
}

type mockRiskListUC struct {
	risks []*entity.Risk
	err   error
}

func (m *mockRiskListUC) Execute(ctx context.Context, input riskuc.ListRisksInput) ([]*entity.Risk, error) {
	return m.risks, m.err
}

func TestHandleGetRisk_Success(t *testing.T) {
	riskID := uuid.New()
	orgID := uuid.New()
	userID := uuid.New()

	risk := &entity.Risk{
		ID:             riskID,
		Title:          "Test Risk",
		OrganizationID: &orgID,
		Status:         "in_review",
	}

	mockUC := &mockRiskGetUC{risk: risk}

	sess := &session.Session{
		UserID:           userID,
		Username:         "testuser",
		AccessibleOrgIDs: []uuid.UUID{orgID},
	}

	output, err := HandleGetRisk(context.Background(), mockUC, sess, riskID.String())
	if err != nil {
		t.Fatalf("HandleGetRisk failed: %v", err)
	}

	if output == nil {
		t.Fatalf("Output is nil")
	}

	if output["id"] != riskID.String() {
		t.Errorf("id mismatch")
	}

	if output["title"] != "Test Risk" {
		t.Errorf("title mismatch")
	}
}

func TestHandleGetRisk_NoSession(t *testing.T) {
	mockUC := &mockRiskGetUC{}

	output, err := HandleGetRisk(context.Background(), mockUC, nil, uuid.New().String())
	if err != ErrNotAuthenticated {
		t.Errorf("expected ErrNotAuthenticated, got %v", err)
	}
	if output != nil {
		t.Errorf("expected nil output on auth error")
	}
}

func TestHandleListRisks_Happy(t *testing.T) {
	orgID := uuid.New()
	userID := uuid.New()

	risks := []*entity.Risk{
		{
			ID:             uuid.New(),
			Title:          "Risk 1",
			OrganizationID: &orgID,
			Status:         "approved",
		},
		{
			ID:             uuid.New(),
			Title:          "Risk 2",
			OrganizationID: &orgID,
			Status:         "in_review",
		},
	}

	mockUC := &mockRiskListUC{risks: risks}

	sess := &session.Session{
		UserID:           userID,
		Username:         "testuser",
		AccessibleOrgIDs: []uuid.UUID{orgID},
	}

	args := map[string]any{
		"status": "approved",
	}

	output, err := HandleListRisks(context.Background(), mockUC, sess, args)
	if err != nil {
		t.Fatalf("HandleListRisks failed: %v", err)
	}

	if output == nil {
		t.Fatalf("Output is nil")
	}

	if len(output["items"].([]map[string]interface{})) != 2 {
		t.Errorf("expected 2 items")
	}
}

func TestHandleListRisks_NoSession(t *testing.T) {
	mockUC := &mockRiskListUC{}

	output, err := HandleListRisks(context.Background(), mockUC, nil, map[string]any{})
	if err != ErrNotAuthenticated {
		t.Errorf("expected ErrNotAuthenticated, got %v", err)
	}
	if output != nil {
		t.Errorf("expected nil output on auth error")
	}
}
