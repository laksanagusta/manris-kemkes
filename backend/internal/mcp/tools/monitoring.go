package tools

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/mcp/mapping"
	"github.com/manris/backend/internal/mcp/session"
	approvaluc "github.com/manris/backend/internal/usecase/approval"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

// ErrMonitoringNotDraft is returned when an update is attempted on a
// non-draft monitoring (reassessment) risk version.
var ErrMonitoringNotDraft = errors.New("can only update monitoring drafts")

// RiskReassessUseCaseI defines the interface for creating a reassessment
// (monitoring/penilaian) draft of an existing risk.
type RiskReassessUseCaseI interface {
	Execute(ctx context.Context, input riskuc.CreateRiskReassessmentInput) (*riskuc.CreateRiskReassessmentOutput, error)
}

// HandleMonitorAndApproveRisk performs the full Manris monitoring/penilaian
// workflow:
//  1. create a reassessment draft via CreateRiskReassessmentUseCase,
//  2. optionally apply review-field updates to that draft,
//  3. submit it for approval with RequestType="assessment".
//
// Auto-approval happens inside SubmitApprovalUseCase when the risk approval
// workflow flag is disabled (flag=false branch returns ApprovalID=""). This
// handler does NOT call any ApprovalActionUseCase; only SubmitApproval is
// invoked.
func HandleMonitorAndApproveRisk(
	ctx context.Context,
	reassessUC RiskReassessUseCaseI,
	updateUC RiskUpdateUseCaseI,
	submitUC ApprovalSubmitUseCaseI,
	getUC RiskGetUseCaseI,
	sess *session.Session,
	args map[string]any,
) (map[string]interface{}, error) {
	if sess == nil {
		return nil, ErrNotAuthenticated
	}

	riskIDStr, _ := args["risk_id"].(string)
	if riskIDStr == "" {
		riskIDStr, _ = args["riskId"].(string)
	}
	if riskIDStr == "" {
		return nil, fmt.Errorf("missing required field: risk_id")
	}
	riskID, err := uuid.Parse(riskIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid risk_id: %w", err)
	}

	cycle, _ := args["cycle"].(string)
	if cycle == "" {
		cycle, _ = args["assessmentCycle"].(string)
	}
	if cycle == "" {
		return nil, fmt.Errorf("missing required field: cycle")
	}

	// Step 1: create reassessment draft (a new risk version).
	reassessOutput, err := reassessUC.Execute(ctx, riskuc.CreateRiskReassessmentInput{
		RiskID:    riskID,
		Cycle:     cycle,
		OrgIDs:    sess.AccessibleOrgIDs,
		CreatedBy: sess.UserID,
	})
	if err != nil {
		return nil, err
	}

	newRiskID := reassessOutput.ID

	// Step 2: optionally apply review fields to the new draft.
	if hasReviewFields(args) {
		updateArgs := make(map[string]any, len(args)+1)
		for k, v := range args {
			updateArgs[k] = v
		}
		updateArgs["id"] = newRiskID.String()

		updateInput, err := mapping.ToUpdateRiskInput(updateArgs, sess)
		if err != nil {
			return nil, err
		}
		// Force draft status preservation; ignore any client-supplied transition.
		updateInput.Status = entity.RiskStatusDraft

		if _, err := updateUC.Execute(ctx, updateInput, sess.AccessibleOrgIDs); err != nil {
			return nil, err
		}
	}

	// Step 3: submit for approval with RequestType="assessment".
	submissionType, _ := args["submissionType"].(string)
	if submissionType == "" {
		submissionType = "approval"
	}

	submitInput := approvaluc.SubmitApprovalInput{
		RequestType:    "assessment",
		EntityID:       newRiskID.String(),
		RequestedBy:    sess.UserID.String(),
		ActorName:      sess.Name,
		Role:           sess.Role,
		ApproverIDs:    parseApproverIDs(args),
		SubmissionType: submissionType,
		OrgIDs:         sess.AccessibleOrgIDs,
	}
	if notes, ok := args["notes"].(string); ok {
		submitInput.Notes = notes
	}

	submitOutput, err := submitUC.Execute(ctx, submitInput)
	if err != nil {
		return nil, err
	}

	// Step 4: re-fetch to observe final post-workflow status.
	refetched, err := getUC.Execute(ctx, newRiskID, sess.AccessibleOrgIDs)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"monitoring":       riskToMap(refetched),
		"workflow_skipped": submitOutput.ApprovalID == "",
		"final_status":     refetched.Status,
		"approval_status":  submitOutput.Status,
		"message":          submitOutput.Message,
		"existing_draft":   reassessOutput.ExistingDraft,
	}, nil
}

// HandleUpdateMonitoringDraft updates a reassessment (monitoring) draft while
// keeping it in draft status. It re-fetches the current risk to enforce that
// only draft monitoring versions may be modified from this MCP tool.
func HandleUpdateMonitoringDraft(
	ctx context.Context,
	updateUC RiskUpdateUseCaseI,
	getUC RiskGetUseCaseI,
	sess *session.Session,
	args map[string]any,
) (map[string]interface{}, error) {
	if sess == nil {
		return nil, ErrNotAuthenticated
	}

	input, err := mapping.ToUpdateRiskInput(args, sess)
	if err != nil {
		return nil, err
	}

	current, err := getUC.Execute(ctx, input.ID, sess.AccessibleOrgIDs)
	if err != nil {
		return nil, err
	}
	if current.Status != entity.RiskStatusDraft {
		return nil, ErrMonitoringNotDraft
	}

	// Force draft status preservation; ignore any client-supplied transition.
	input.Status = entity.RiskStatusDraft

	if _, err := updateUC.Execute(ctx, input, sess.AccessibleOrgIDs); err != nil {
		return nil, err
	}

	updated, err := getUC.Execute(ctx, input.ID, sess.AccessibleOrgIDs)
	if err != nil {
		return nil, err
	}

	return riskToMap(updated), nil
}

// hasReviewFields reports whether args contain any update-relevant field
// beyond the monitoring identifiers (risk_id / riskId / cycle / etc.). It
// determines whether the optional update step in HandleMonitorAndApproveRisk
// should run.
func hasReviewFields(args map[string]any) bool {
	reviewKeys := []string{
		"title", "description", "category",
		"cause", "riskSource", "controllability", "impactDesc",
		"existingControl", "controlEffectiveness",
		"probability", "impact", "weight", "nilai", "inheritScore",
		"riskPriority", "riskAppetite", "treatmentOption",
		"mitigations",
		"targetProbability", "targetImpact", "targetWeight",
		"targetNilai", "targetScore",
		"nextReviewDate", "reviewScheduleText",
		"reviewType", "changeReason", "reviewSummary",
		"draftApprovalLine",
		"organizationId",
	}
	for _, k := range reviewKeys {
		if v, ok := args[k]; ok && v != nil {
			return true
		}
	}
	return false
}
