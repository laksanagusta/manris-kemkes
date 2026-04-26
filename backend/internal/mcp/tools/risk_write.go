package tools

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/mcp/mapping"
	"github.com/manris/backend/internal/mcp/session"
	approvaluc "github.com/manris/backend/internal/usecase/approval"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

// ErrRiskNotDraft is returned when an update is attempted on a non-draft risk.
var ErrRiskNotDraft = errors.New("can only update risks in draft status")

// RiskCreateUseCaseI defines the interface for creating a risk.
type RiskCreateUseCaseI interface {
	Execute(ctx context.Context, input riskuc.CreateRiskInput) (*riskuc.CreateRiskOutput, error)
}

// RiskUpdateUseCaseI defines the interface for updating a risk.
type RiskUpdateUseCaseI interface {
	Execute(ctx context.Context, input riskuc.UpdateRiskInput, orgIDs []uuid.UUID) (*riskuc.UpdateRiskOutput, error)
}

// ApprovalSubmitUseCaseI defines the interface for submitting an approval.
type ApprovalSubmitUseCaseI interface {
	Execute(ctx context.Context, input approvaluc.SubmitApprovalInput) (*approvaluc.SubmitApprovalOutput, error)
}

// HandleCreateAndApproveRisk creates a risk and immediately submits it for approval.
// When the risk approval workflow flag is disabled inside SubmitApprovalUseCase, the
// usecase auto-approves the risk via its flag=false branch (returning ApprovalID="").
// This handler does NOT call any ApprovalActionUseCase; only SubmitApproval is invoked.
func HandleCreateRisk(
	ctx context.Context,
	createUC RiskCreateUseCaseI,
	getUC RiskGetUseCaseI,
	sess *session.Session,
	args map[string]any,
) (map[string]interface{}, error) {
	if sess == nil {
		return nil, ErrNotAuthenticated
	}

	createInput, err := mapping.ToCreateRiskInput(args, sess)
	if err != nil {
		return nil, err
	}

	createOutput, err := createUC.Execute(ctx, createInput)
	if err != nil {
		return nil, err
	}

	// approverIDs := parseApproverIDs(args)

	// submitInput := approvaluc.SubmitApprovalInput{
	// 	RequestType:    "risk",
	// 	EntityID:       createOutput.ID.String(),
	// 	RequestedBy:    sess.UserID.String(),
	// 	ActorName:      sess.Name,
	// 	Role:           sess.Role,
	// 	ApproverIDs:    approverIDs,
	// 	SubmissionType: "approval",
	// 	OrgIDs:         sess.AccessibleOrgIDs,
	// }
	// if notes, ok := args["notes"].(string); ok {
	// 	submitInput.Notes = notes
	// }

	// submitOutput, err := submitUC.Execute(ctx, submitInput)
	// if err != nil {
	// 	return nil, err
	// }

	refetched, err := getUC.Execute(ctx, createOutput.ID, sess.AccessibleOrgIDs)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"risk":         riskToMap(refetched),
		"final_status": refetched.Status,
	}, nil
}

func HandleUpdateRiskDraft(
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
		return nil, ErrRiskNotDraft
	}

	mergeRiskUpdateInputWithCurrent(&input, args, current)

	if _, err := updateUC.Execute(ctx, input, sess.AccessibleOrgIDs); err != nil {
		return nil, err
	}

	updated, err := getUC.Execute(ctx, input.ID, sess.AccessibleOrgIDs)
	if err != nil {
		return nil, err
	}

	return riskToMap(updated), nil
}

func parseApproverIDs(args map[string]any) []string {
	raw, ok := args["riskApproverIds"].([]interface{})
	if !ok {
		return nil
	}
	ids := make([]string, 0, len(raw))
	for _, v := range raw {
		if s, ok := v.(string); ok && s != "" {
			ids = append(ids, s)
		}
	}
	return ids
}
