package tools

import (
	"context"
	"fmt"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/mcp/mapping"
	"github.com/manris/backend/internal/mcp/session"
	approvaluc "github.com/manris/backend/internal/usecase/approval"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

// RiskCreateUseCaseI defines the interface for creating a risk
type RiskCreateUseCaseI interface {
	Execute(ctx context.Context, input riskuc.CreateRiskInput) (*entity.Risk, error)
}

// RiskUpdateUseCaseI defines the interface for updating a risk
type RiskUpdateUseCaseI interface {
	Execute(ctx context.Context, input riskuc.UpdateRiskInput) (*entity.Risk, error)
}

// ApprovalSubmitUseCaseI defines the interface for submitting approval
type ApprovalSubmitUseCaseI interface {
	Execute(ctx context.Context, input approvaluc.SubmitApprovalInput) (*approvaluc.SubmitApprovalOutput, error)
}

// HandleCreateAndApproveRisk creates a risk and submits it for approval in a single tool call
// When RISK_APPROVAL_WORKFLOW_ENABLED=false, auto-approval happens within SubmitApprovalUC
func HandleCreateAndApproveRisk(ctx context.Context, createUC RiskCreateUseCaseI, approvalUC ApprovalSubmitUseCaseI, sess *session.Session, args map[string]any) (map[string]interface{}, error) {
	if sess == nil {
		return nil, ErrNotAuthenticated
	}

	// Step 1: Create the risk
	createInput, err := mapping.ToCreateRiskInput(args, sess)
	if err != nil {
		return nil, fmt.Errorf("invalid create input: %w", err)
	}

	risk, err := createUC.Execute(ctx, createInput)
	if err != nil {
		return nil, err
	}

	// Step 2: Submit for approval (auto-approve if RISK_APPROVAL_WORKFLOW_ENABLED=false)
	approverIDs := make([]string, 0)
	if approversArg, ok := args["riskApproverIds"].([]interface{}); ok {
		for _, approverID := range approversArg {
			if approverIDStr, ok := approverID.(string); ok {
				approverIDs = append(approverIDs, approverIDStr)
			}
		}
	}

	submissionType := "approval"
	if st, ok := args["submissionType"].(string); ok {
		submissionType = st
	}

	approvalInput := approvaluc.SubmitApprovalInput{
		RequestType:    "risk",
		EntityID:       risk.ID.String(),
		RequestedBy:    sess.UserID.String(),
		ActorName:      sess.Name,
		Role:           sess.Role,
		ApproverIDs:    approverIDs,
		SubmissionType: submissionType,
		OrgIDs:         sess.AccessibleOrgIDs,
	}

	if notes, ok := args["notes"].(string); ok {
		approvalInput.Notes = notes
	}

	approvalOutput, err := approvalUC.Execute(ctx, approvalInput)
	if err != nil {
		return nil, err
	}

	// Return the final risk state (with Status updated to approved if workflow was disabled)
	return map[string]interface{}{
		"id":      risk.ID.String(),
		"status":  approvalOutput.Status,
		"message": approvalOutput.Message,
	}, nil
}

// HandleUpdateRiskDraft updates a risk in draft status
func HandleUpdateRiskDraft(ctx context.Context, updateUC RiskUpdateUseCaseI, sess *session.Session, args map[string]any) (map[string]interface{}, error) {
	if sess == nil {
		return nil, ErrNotAuthenticated
	}

	// Convert args to usecase input with org-scope validation
	updateInput, err := mapping.ToUpdateRiskInput(args, sess)
	if err != nil {
		return nil, fmt.Errorf("invalid update input: %w", err)
	}

	// Call the usecase
	risk, err := updateUC.Execute(ctx, updateInput)
	if err != nil {
		return nil, err
	}

	// Convert risk to output map
	return riskToMap(risk), nil
}
