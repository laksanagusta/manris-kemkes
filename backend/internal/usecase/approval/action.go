package approval

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// ApprovalActionUseCase handles approve/reject actions
type ApprovalActionUseCase struct {
	approvalRepo repository.ApprovalRepository
	riskRepo     repository.RiskRepository
	incidentRepo repository.IncidentRepository
}

// NewApprovalActionUseCase creates a new approval action usecase
func NewApprovalActionUseCase(
	approvalRepo repository.ApprovalRepository,
	riskRepo repository.RiskRepository,
	incidentRepo repository.IncidentRepository,
) *ApprovalActionUseCase {
	return &ApprovalActionUseCase{
		approvalRepo: approvalRepo,
		riskRepo:     riskRepo,
		incidentRepo: incidentRepo,
	}
}

// Input represents the input for approval action
type ApprovalActionInput struct {
	ApprovalID string // approval request ID
	Action     string // 'approve' or 'reject'
	ActorID    string // user ID performing the action
	ActorName  string // user name
	ActorRole  string // user role
	Comments   string // optional comments
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
	approvalReq, err := uc.approvalRepo.FindByID(ctx, approvalID)
	if err != nil {
		return nil, domainerrors.ErrApprovalNotFound
	}

	actorID := uuid.MustParse(input.ActorID)

	// Check if request is still pending
	if !approvalReq.IsPending() {
		return nil, domainerrors.ErrNotPending
	}

	// Process the action
	var newStatus string
	var newEntityStatus string
	var historyAction string

	if input.Action == "approve" {
		historyAction = "approved"
	} else {
		newStatus = "rejected"
		newEntityStatus = "draft"
		historyAction = "rejected"
	}

	if input.Action == "approve" {
		_, nextStep, err := uc.approvalRepo.ApproveCurrentStep(ctx, approvalID, actorID, input.Comments)
		if err != nil {
			return nil, domainerrors.Wrap(err, "failed to approve current step")
		}
		if nextStep == nil {
			newStatus = "approved"
			newEntityStatus = "approved"
			if err := uc.updateEntityStatus(ctx, approvalReq.RequestType, approvalReq.EntityID, newEntityStatus); err != nil {
				return nil, domainerrors.Wrap(err, "failed to update entity status")
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
		if err := uc.updateEntityStatus(ctx, approvalReq.RequestType, approvalReq.EntityID, newEntityStatus); err != nil {
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

// updateEntityStatus updates the status of the entity (risk or incident)
func (uc *ApprovalActionUseCase) updateEntityStatus(ctx context.Context, requestType string, entityID uuid.UUID, status string) error {
	if requestType == "risk" {
		risk, err := uc.riskRepo.GetByID(ctx, entityID)
		if err != nil {
			return err
		}

		if status == "approved" && risk.PreviousRiskID != nil {
			return uc.riskRepo.ActivateApprovedVersion(ctx, entityID)
		}
		risk.Status = status
		return uc.riskRepo.Update(ctx, risk)
	} else {
		incident, err := uc.incidentRepo.GetByID(ctx, entityID.String())
		if err != nil {
			return err
		}
		incident.Status = status
		return uc.incidentRepo.Update(ctx, incident)
	}
}
