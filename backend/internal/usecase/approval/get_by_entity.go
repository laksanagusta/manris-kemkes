package approval

import (
	"context"

	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// GetApprovalByEntityUseCase handles getting approval request by entity type and ID
type GetApprovalByEntityUseCase struct {
	approvalRepo repository.ApprovalRepository
}

// NewGetApprovalByEntityUseCase creates a new usecase
func NewGetApprovalByEntityUseCase(approvalRepo repository.ApprovalRepository) *GetApprovalByEntityUseCase {
	return &GetApprovalByEntityUseCase{
		approvalRepo: approvalRepo,
	}
}

// Input represents the input for getting approval by entity
type GetApprovalByEntityInput struct {
	RequestType string
	EntityID    string
}

// Execute executes the get approval by entity usecase
func (uc *GetApprovalByEntityUseCase) Execute(ctx context.Context, input GetApprovalByEntityInput) (*GetApprovalDetailOutput, error) {
	entityID, err := uuid.Parse(input.EntityID)
	if err != nil {
		return nil, domainerrors.ErrInvalidInput
	}

	req, err := uc.approvalRepo.FindByEntity(ctx, input.RequestType, entityID)
	if err != nil {
		return nil, domainerrors.ErrNotFound
	}

	histories, err := uc.approvalRepo.GetHistoryByEntity(ctx, input.RequestType, entityID)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to load approval history by entity")
	}

	// Convert history to output format
	history := make([]HistoryOutput, len(histories))
	for i, h := range histories {
		history[i] = HistoryOutput{
			ID:        h.ID.String(),
			Action:    h.Action,
			ActorID:   h.ActorID.String(),
			ActorName: h.ActorName,
			ActorRole: h.ActorRole,
			Comments:  h.Comments,
			CreatedAt: h.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
	}

	steps := make([]StepOutput, len(req.Steps))
	for i, step := range req.Steps {
		var actedAt *string
		if step.ActedAt != nil {
			value := step.ActedAt.Format("2006-01-02T15:04:05Z07:00")
			actedAt = &value
		}
		steps[i] = StepOutput{
			ID:             step.ID.String(),
			SequenceNo:     step.SequenceNo,
			ApproverUserID: step.ApproverUserID.String(),
			ApproverName:   step.ApproverName,
			ApproverRole:   step.ApproverRole,
			StepType:       step.StepType,
			Status:         step.Status,
			ActedAt:        actedAt,
			Comments:       step.Comments,
		}
	}

	var currentApproverUserID *string
	if req.CurrentApproverUserID != nil {
		value := req.CurrentApproverUserID.String()
		currentApproverUserID = &value
	}

	return &GetApprovalDetailOutput{
		ID:                    req.ID.String(),
		RequestType:           req.RequestType,
		EntityID:              req.EntityID.String(),
		EntityCode:            req.EntityCode,
		EntityTitle:           req.EntityTitle,
		EntityOrgName:         req.EntityOrgName,
		RequestedBy:           req.RequestedBy.String(),
		RequestedByName:       req.RequestedByName,
		RequestedAt:           req.RequestedAt.Format("2006-01-02T15:04:05Z07:00"),
		CurrentStatus:         req.CurrentStatus,
		CurrentApproverRole:   req.CurrentApproverRole,
		CurrentApproverUserID: currentApproverUserID,
		CurrentApproverName:   req.CurrentApproverName,
		Notes:                 req.Notes,
		CreatedAt:             req.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:             req.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		History:               history,
		Steps:                 steps,
	}, nil
}
