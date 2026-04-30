package approval

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	mtuc "github.com/manris/backend/internal/usecase/mitigation_task"
)

// ApprovalActionUseCase handles approve/reject actions
type ApprovalActionUseCase struct {
	approvalRepo repository.ApprovalRepository
	riskRepo     repository.RiskRepository
	incidentRepo repository.IncidentRepository
	taskRepo     repository.MitigationTaskRepository
}

// NewApprovalActionUseCase creates a new approval action usecase
func NewApprovalActionUseCase(
	approvalRepo repository.ApprovalRepository,
	riskRepo repository.RiskRepository,
	incidentRepo repository.IncidentRepository,
	taskRepo repository.MitigationTaskRepository,
) *ApprovalActionUseCase {
	return &ApprovalActionUseCase{
		approvalRepo: approvalRepo,
		riskRepo:     riskRepo,
		incidentRepo: incidentRepo,
		taskRepo:     taskRepo,
	}
}

// Input represents the input for approval action
type ApprovalActionInput struct {
	ApprovalID string `json:"approvalID"`
	Action     string `json:"action"` // 'approve' or 'reject'
	ActorID    string // user ID performing the action (set by handler)
	ActorName  string // user name (set by handler)
	ActorRole  string // user role (set by handler)
	Comments   string `json:"comments"` // optional comments
	OrgIDs     []uuid.UUID
}

// Output represents the output of approval action
type ApprovalActionOutput struct {
	Status  string
	Message string
}

// Execute executes the approval action usecase
func (uc *ApprovalActionUseCase) Execute(ctx context.Context, input ApprovalActionInput) (*ApprovalActionOutput, error) {
	// Validate action
	if input.Action != "approve" && input.Action != "reject" {
		return nil, domainerrors.ErrInvalidAction
	}

	// Parse approval ID
	approvalID, err := uuid.Parse(input.ApprovalID)
	if err != nil {
		return nil, domainerrors.ErrInvalidInput
	}

	// Get approval request
	approvalReq, err := uc.approvalRepo.FindByID(ctx, approvalID, input.OrgIDs)
	if err != nil {
		return nil, domainerrors.ErrApprovalNotFound
	}

	actorID, err := uuid.Parse(input.ActorID)
	if err != nil {
		return nil, domainerrors.ErrInvalidInput
	}

	// Check if request is still pending
	if !approvalReq.IsPending() {
		return nil, domainerrors.ErrNotPending
	}

	if err := validateCurrentApprover(approvalReq, actorID, input.ActorRole); err != nil {
		return nil, err
	}

	// Process the action
	var newStatus string
	var newEntityStatus string
	var historyAction string

	if input.Action == "approve" {
		historyAction = "approved"
	} else {
		newStatus = "rejected"
		newEntityStatus = entity.RiskStatusDraft
		historyAction = "rejected"
	}

	if input.Action == "approve" {
		currentStep, nextStep, err := uc.approvalRepo.ApproveCurrentStep(ctx, approvalID, actorID, input.Comments)
		if err != nil {
			return nil, domainerrors.Wrap(err, "failed to approve current step")
		}
		if nextStep == nil {
			newStatus = "approved"
			if approvalReq.RequestType == "risk" || approvalReq.RequestType == "assessment" {
				if currentStep.StepType == "review" {
					newEntityStatus = entity.RiskStatusInReview
				} else {
					newEntityStatus = entity.RiskStatusApproved
				}
			} else {
				newEntityStatus = "final"
			}
			if err := uc.updateEntityStatus(ctx, approvalReq, newEntityStatus, input); err != nil {
				return nil, domainerrors.Wrap(err, "failed to update entity status")
			}
			if approvalReq.RequestType == "risk" && newEntityStatus == entity.RiskStatusApproved && uc.taskRepo != nil {
				if _, err := mtuc.NewEnsureTasksForApprovedRiskUseCase(uc.taskRepo, uc.riskRepo).Execute(ctx, approvalReq.EntityID, input.OrgIDs); err != nil {
					return nil, domainerrors.Wrap(err, "failed to create mitigation tasks")
				}
			}
			if err := uc.approvalRepo.UpdateStatus(ctx, approvalID, newStatus); err != nil {
				return nil, domainerrors.Wrap(err, "failed to update approval status")
			}
		} else {
			newStatus = "pending"
		}
	} else {
		if err := uc.approvalRepo.RejectCurrentStep(ctx, approvalID, actorID, input.Comments); err != nil {
			return nil, domainerrors.Wrap(err, "failed to reject current step")
		}
		if err := uc.updateEntityStatus(ctx, approvalReq, newEntityStatus, input); err != nil {
			return nil, domainerrors.Wrap(err, "failed to update entity status")
		}
		if err := uc.approvalRepo.UpdateStatus(ctx, approvalID, newStatus); err != nil {
			return nil, domainerrors.Wrap(err, "failed to update approval status")
		}
	}

	// Add history
	history := &entity.ApprovalHistory{
		ApprovalRequestID: approvalReq.ID,
		Action:            historyAction,
		ActorID:           actorID,
		ActorName:         input.ActorName,
		ActorRole:         input.ActorRole,
		Comments:          input.Comments,
	}

	if err := uc.approvalRepo.AddHistory(ctx, history); err != nil {
		// Log error but don't fail
	}

	return &ApprovalActionOutput{
		Status:  newStatus,
		Message: "approval action completed successfully",
	}, nil
}

func validateCurrentApprover(approvalReq *entity.ApprovalRequest, actorID uuid.UUID, actorRole string) error {
	if approvalReq.CurrentApproverUserID != nil && *approvalReq.CurrentApproverUserID != actorID {
		return domainerrors.ErrForbidden
	}

	if approvalReq.CurrentApproverUserID == nil && approvalReq.CurrentApproverRole != "" && actorRole != approvalReq.CurrentApproverRole {
		return domainerrors.ErrForbidden
	}

	return nil
}

// updateEntityStatus updates the status of the entity (risk, assessment, or incident).
func (uc *ApprovalActionUseCase) updateEntityStatus(ctx context.Context, approvalReq *entity.ApprovalRequest, status string, input ApprovalActionInput) error {
	if approvalReq.RequestType == "risk" || approvalReq.RequestType == "assessment" {
		risk, err := uc.riskRepo.GetByID(ctx, approvalReq.EntityID, input.OrgIDs)
		if err != nil {
			return err
		}

		if status == entity.RiskStatusApproved && risk.PreviousRiskID != nil {
			return uc.riskRepo.ActivateApprovedVersion(ctx, approvalReq.EntityID)
		}
		risk.Status = status
		return uc.riskRepo.Update(ctx, risk)
	} else {
		incident, err := uc.incidentRepo.GetByID(ctx, approvalReq.EntityID.String(), input.OrgIDs)
		if err != nil {
			return err
		}
		incident.Status = status
		return uc.incidentRepo.Update(ctx, incident)
	}
}
