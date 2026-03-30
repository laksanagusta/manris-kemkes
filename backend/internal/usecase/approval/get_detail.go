package approval

import (
	"context"

	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// GetApprovalDetailUseCase handles getting approval request details
type GetApprovalDetailUseCase struct {
	approvalRepo repository.ApprovalRepository
}

// NewGetApprovalDetailUseCase creates a new get approval detail usecase
func NewGetApprovalDetailUseCase(approvalRepo repository.ApprovalRepository) *GetApprovalDetailUseCase {
	return &GetApprovalDetailUseCase{
		approvalRepo: approvalRepo,
	}
}

// Input represents the input for getting approval detail
type GetApprovalDetailInput struct {
	ApprovalID string
}

// Output represents the output of getting approval detail
type GetApprovalDetailOutput struct {
	ID                  string
	RequestType         string
	EntityID            string
	EntityCode          *string
	EntityTitle         *string
	EntityOrgName       *string
	RequestedBy         string
	RequestedByName     string
	RequestedAt         string
	CurrentStatus       string
	CurrentApproverRole string
	Notes               string
	CreatedAt           string
	UpdatedAt           string
	History             []HistoryOutput
}

// HistoryOutput represents history in the output
type HistoryOutput struct {
	ID        string
	Action    string
	ActorID   string
	ActorName string
	ActorRole string
	Comments  string
	CreatedAt string
}

// Execute executes the get approval detail usecase
func (uc *GetApprovalDetailUseCase) Execute(ctx context.Context, input GetApprovalDetailInput) (*GetApprovalDetailOutput, error) {
	// Parse approval ID
	approvalID, err := uuid.Parse(input.ApprovalID)
	if err != nil {
		return nil, domainerrors.ErrInvalidInput
	}

	// Get approval request
	req, err := uc.approvalRepo.FindByID(ctx, approvalID)
	if err != nil {
		return nil, domainerrors.ErrApprovalNotFound
	}

	// Convert history to output format
	history := make([]HistoryOutput, len(req.History))
	for i, h := range req.History {
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

	return &GetApprovalDetailOutput{
		ID:                  req.ID.String(),
		RequestType:         req.RequestType,
		EntityID:            req.EntityID.String(),
		EntityCode:          req.EntityCode,
		EntityTitle:         req.EntityTitle,
		EntityOrgName:       req.EntityOrgName,
		RequestedBy:         req.RequestedBy.String(),
		RequestedByName:     req.RequestedByName,
		RequestedAt:         req.RequestedAt.Format("2006-01-02T15:04:05Z07:00"),
		CurrentStatus:       req.CurrentStatus,
		CurrentApproverRole: req.CurrentApproverRole,
		Notes:               req.Notes,
		CreatedAt:           req.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:           req.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		History:             history,
	}, nil
}
