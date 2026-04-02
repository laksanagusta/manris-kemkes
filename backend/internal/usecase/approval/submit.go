package approval

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// SubmitApprovalUseCase handles submitting entities for approval
type SubmitApprovalUseCase struct {
	approvalRepo repository.ApprovalRepository
	riskRepo     repository.RiskRepository
	incidentRepo repository.IncidentRepository
	userRepo     repository.UserRepository
}

// NewSubmitApprovalUseCase creates a new submit approval usecase
func NewSubmitApprovalUseCase(
	approvalRepo repository.ApprovalRepository,
	riskRepo repository.RiskRepository,
	incidentRepo repository.IncidentRepository,
	userRepo repository.UserRepository,
) *SubmitApprovalUseCase {
	return &SubmitApprovalUseCase{
		approvalRepo: approvalRepo,
		riskRepo:     riskRepo,
		incidentRepo: incidentRepo,
		userRepo:     userRepo,
	}
}

// Input represents the input for submitting approval
type SubmitApprovalInput struct {
	RequestType string   // 'risk' or 'incident'
	EntityID    string   // entity ID as string
	RequestedBy string   // user ID who is submitting
	ActorName   string   // user name who is submitting
	Role        string   // user role (unit, reviewer, pimpinan, etc.)
	ApproverIDs []string `json:"approverIds"`
	Notes       string   // optional notes
}

// Output represents the output of submitting approval
type SubmitApprovalOutput struct {
	ApprovalID string
	Status     string
	Message    string
}

// Execute executes the submit approval usecase
func (uc *SubmitApprovalUseCase) Execute(ctx context.Context, input SubmitApprovalInput) (*SubmitApprovalOutput, error) {
	// Parse entity ID
	entityID, err := uuid.Parse(input.EntityID)
	if err != nil {
		return nil, domainerrors.ErrInvalidInput
	}

	// Parse requested by ID
	requestedBy, err := uuid.Parse(input.RequestedBy)
	if err != nil {
		return nil, domainerrors.ErrInvalidInput
	}

	// Validate request type
	if input.RequestType != "risk" && input.RequestType != "incident" {
		return nil, domainerrors.ErrInvalidRequestType
	}

	if input.RequestType == "risk" && len(input.ApproverIDs) == 0 {
		return nil, domainerrors.ErrInvalidInput
	}

	// Check entity existence and permissions
	if input.RequestType == "risk" {
		if err := uc.validateRisk(ctx, entityID, requestedBy, input.Role); err != nil {
			return nil, err
		}
	} else {
		if err := uc.validateIncident(ctx, entityID, requestedBy, input.Role); err != nil {
			return nil, err
		}
	}

	// Check if already submitted
	existingReq, _ := uc.approvalRepo.FindByEntity(ctx, input.RequestType, entityID)
	if existingReq != nil && existingReq.IsPending() {
		return nil, domainerrors.ErrAlreadyPending
	}

	// Update entity status to pending_approval
	if err := uc.updateEntityStatus(ctx, input.RequestType, entityID, "final"); err != nil {
		return nil, err
	}

	approverIDs := input.ApproverIDs
	if len(approverIDs) == 0 {
		var approverRole string
		switch input.Role {
		case "unit", "superadmin":
			approverRole = "reviewer"
		default:
			approverRole = "pimpinan"
		}
		users, err := uc.userRepo.List(ctx)
		if err != nil {
			return nil, domainerrors.Wrap(err, "failed to load fallback approvers")
		}
		for _, user := range users {
			if user.Role == approverRole {
				approverIDs = []string{user.ID.String()}
				break
			}
		}
	}

	steps := make([]entity.ApprovalStep, 0, len(approverIDs))
	var firstApprover *entity.User
	for index, approverIDStr := range approverIDs {
		approverID, err := uuid.Parse(approverIDStr)
		if err != nil {
			return nil, domainerrors.ErrInvalidInput
		}
		approver, err := uc.userRepo.GetByID(ctx, approverID)
		if err != nil {
			return nil, domainerrors.Wrap(err, "failed to load approver")
		}
		if index == 0 {
			firstApprover = approver
		}
		steps = append(steps, entity.ApprovalStep{SequenceNo: index + 1, ApproverUserID: approverID, Status: "pending"})
	}
	if firstApprover == nil {
		return nil, domainerrors.ErrInvalidInput
	}

	// Create approval request
	approvalReq := &entity.ApprovalRequest{
		RequestType:           input.RequestType,
		EntityID:              entityID,
		RequestedBy:           requestedBy,
		CurrentStatus:         "pending",
		CurrentApproverRole:   firstApprover.Role,
		CurrentApproverUserID: &firstApprover.ID,
		Notes:                 input.Notes,
	}

	if err := uc.approvalRepo.Create(ctx, approvalReq); err != nil {
		return nil, domainerrors.Wrap(err, "failed to create approval request")
	}
	if err := uc.approvalRepo.CreateSteps(ctx, approvalReq.ID, steps); err != nil {
		return nil, domainerrors.Wrap(err, "failed to create approval steps")
	}

	// Add initial history
	history := &entity.ApprovalHistory{
		ApprovalRequestID: approvalReq.ID,
		Action:            "submitted",
		ActorID:           requestedBy,
		ActorName:         input.ActorName,
		ActorRole:         input.Role,
		Comments:          input.Notes,
	}

	if err := uc.approvalRepo.AddHistory(ctx, history); err != nil {
		// Log error but don't fail the request
		// In production, you might want to retry or use a transaction
	}

	return &SubmitApprovalOutput{
		ApprovalID: approvalReq.ID.String(),
		Status:     "pending",
		Message:    "successfully submitted for approval",
	}, nil
}

// validateRisk validates if risk can be submitted for approval
func (uc *SubmitApprovalUseCase) validateRisk(ctx context.Context, riskID uuid.UUID, userID uuid.UUID, userRole string) error {
	risk, err := uc.riskRepo.GetByID(ctx, riskID)
	if err != nil {
		return domainerrors.ErrRiskNotFound
	}

	// Only owner or unit role can submit their own risks
	if userRole == "unit" && risk.CreatedBy != nil && *risk.CreatedBy != userID {
		return domainerrors.ErrForbidden
	}

	return nil
}

// validateIncident validates if incident can be submitted for approval
func (uc *SubmitApprovalUseCase) validateIncident(ctx context.Context, incidentID uuid.UUID, userID uuid.UUID, userRole string) error {
	incident, err := uc.incidentRepo.GetByID(ctx, incidentID.String())
	if err != nil {
		return domainerrors.ErrIncidentNotFound
	}

	// Only owner or unit role can submit their own incidents
	if userRole == "unit" && incident.ReporterID != nil && *incident.ReporterID != userID {
		return domainerrors.ErrForbidden
	}

	return nil
}

// updateEntityStatus updates the status of the entity (risk or incident)
func (uc *SubmitApprovalUseCase) updateEntityStatus(ctx context.Context, requestType string, entityID uuid.UUID, status string) error {
	if requestType == "risk" {
		risk, err := uc.riskRepo.GetByID(ctx, entityID)
		if err != nil {
			return err
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
