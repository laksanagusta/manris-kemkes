package tools

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/mcp/mapping"
	"github.com/manris/backend/internal/mcp/session"
	approvaluc "github.com/manris/backend/internal/usecase/approval"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

// RiskReassessmentUseCaseI defines the interface for creating a reassessment
type RiskReassessmentUseCaseI interface {
	Execute(ctx context.Context, input riskuc.CreateRiskReassessmentInput) (*riskuc.CreateRiskReassessmentOutput, error)
}

// HandleMonitorAndApproveRisk creates a risk reassessment and submits it for approval
// When RISK_APPROVAL_WORKFLOW_ENABLED=false, auto-approval happens within SubmitApprovalUC
func HandleMonitorAndApproveRisk(ctx context.Context, reassessmentUC RiskReassessmentUseCaseI, approvalUC ApprovalSubmitUseCaseI, sess *session.Session, args map[string]any) (map[string]interface{}, error) {
	if sess == nil {
		return nil, ErrNotAuthenticated
	}

	// Step 1: Parse risk ID and cycle
	riskIDStr, ok := args["riskId"].(string)
	if !ok || riskIDStr == "" {
		return nil, fmt.Errorf("missing required field: riskId")
	}
	riskID, err := uuid.Parse(riskIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid riskId format: %w", err)
	}

	cycle, ok := args["assessmentCycle"].(string)
	if !ok || cycle == "" {
		return nil, fmt.Errorf("missing required field: assessmentCycle")
	}

	// Step 2: Create reassessment draft
	reassessmentInput := riskuc.CreateRiskReassessmentInput{
		RiskID:    riskID,
		Cycle:     cycle,
		OrgIDs:    sess.AccessibleOrgIDs,
		CreatedBy: sess.UserID,
	}

	reassessmentOutput, err := reassessmentUC.Execute(ctx, reassessmentInput)
	if err != nil {
		return nil, err
	}

	// Step 3: Submit for approval (auto-approve if RISK_APPROVAL_WORKFLOW_ENABLED=false)
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
		RequestType:    "assessment",
		EntityID:       reassessmentOutput.ID.String(),
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

	// Return the final state
	return map[string]interface{}{
		"id":      reassessmentOutput.ID.String(),
		"status":  approvalOutput.Status,
		"message": approvalOutput.Message,
		"cycle":   cycle,
	}, nil
}

// HandleUpdateMonitoringDraft updates a risk reassessment draft
func HandleUpdateMonitoringDraft(ctx context.Context, updateUC RiskUpdateUseCaseI, sess *session.Session, args map[string]any) (map[string]interface{}, error) {
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
