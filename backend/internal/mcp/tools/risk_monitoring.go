package tools

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/mcp/mapping"
	"github.com/manris/backend/internal/mcp/session"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

// ErrMonitoringNotDraft is returned when the monitoring draft update target
// is not in the assessment_draft status.
var ErrMonitoringNotDraft = errors.New("can only update monitoring drafts in assessment_draft status")

type RiskReassessmentUseCaseI interface {
	Execute(ctx context.Context, input riskuc.CreateRiskReassessmentInput) (*riskuc.CreateRiskReassessmentOutput, error)
}

func HandleMonitorRisk(ctx context.Context, reassessmentUC RiskReassessmentUseCaseI, sess *session.Session, args map[string]any) (map[string]interface{}, error) {
	if sess == nil {
		return nil, ErrNotAuthenticated
	}

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

	// approverIDs := make([]string, 0)
	// if approversArg, ok := args["riskApproverIds"].([]interface{}); ok {
	// 	for _, approverID := range approversArg {
	// 		if approverIDStr, ok := approverID.(string); ok {
	// 			approverIDs = append(approverIDs, approverIDStr)
	// 		}
	// 	}
	// }

	// submissionType := "approval"
	// if st, ok := args["submissionType"].(string); ok {
	// 	submissionType = st
	// }

	// approvalInput := approvaluc.SubmitApprovalInput{
	// 	RequestType:    "assessment",
	// 	EntityID:       reassessmentOutput.ID.String(),
	// 	RequestedBy:    sess.UserID.String(),
	// 	ActorName:      sess.Name,
	// 	Role:           sess.Role,
	// 	ApproverIDs:    approverIDs,
	// 	SubmissionType: submissionType,
	// 	OrgIDs:         sess.AccessibleOrgIDs,
	// }

	// if notes, ok := args["notes"].(string); ok {
	// 	approvalInput.Notes = notes
	// }

	// approvalOutput, err := approvalUC.Execute(ctx, approvalInput)
	// if err != nil {
	// 	return nil, err
	// }

	return map[string]interface{}{
		"id": reassessmentOutput.ID.String(),
		// "status":  approvalOutput.Status,
		// "message": approvalOutput.Message,
		"cycle": cycle,
	}, nil
}

func HandleUpdateMonitoringDraft(ctx context.Context, updateUC RiskUpdateUseCaseI, getUC RiskGetUseCaseI, sess *session.Session, args map[string]any) (map[string]interface{}, error) {
	if sess == nil {
		return nil, ErrNotAuthenticated
	}

	updateInput, err := mapping.ToUpdateRiskInput(args, sess)
	if err != nil {
		return nil, fmt.Errorf("invalid update input: %w", err)
	}

	current, err := getUC.Execute(ctx, updateInput.ID, sess.AccessibleOrgIDs)
	if err != nil {
		return nil, err
	}
	if current.Status != entity.RiskStatusDraft {
		return nil, ErrMonitoringNotDraft
	}

	mergeRiskUpdateInputWithCurrent(&updateInput, args, current)

	output, err := updateUC.Execute(ctx, updateInput, sess.AccessibleOrgIDs)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"id":      output.ID.String(),
		"code":    output.Code,
		"message": output.Message,
	}, nil
}
