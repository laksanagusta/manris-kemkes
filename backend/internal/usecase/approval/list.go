package approval

import (
	"context"

	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// ListApprovalUseCase handles listing approval requests
type ListApprovalUseCase struct {
	approvalRepo repository.ApprovalRepository
}

// NewListApprovalUseCase creates a new list approval usecase
func NewListApprovalUseCase(approvalRepo repository.ApprovalRepository) *ListApprovalUseCase {
	return &ListApprovalUseCase{
		approvalRepo: approvalRepo,
	}
}

// Input represents the input for listing approvals
type ListApprovalInput struct {
	Status       string // filter by status: all, pending, approved, rejected
	ApproverRole string // filter by approver role
}

// Output represents the output of listing approvals
type ListApprovalOutput []*ApprovalOutput

// ApprovalOutput represents a single approval in the output
type ApprovalOutput struct {
	ID                  string  `json:"id"`
	RequestType         string  `json:"requestType"`
	EntityID            string  `json:"entityId"`
	EntityCode          *string `json:"entityCode"`
	EntityTitle         *string `json:"entityTitle"`
	EntityOrgName       *string `json:"entityOrgName"`
	RequestedBy         string  `json:"requestedBy"`
	RequestedByName     string  `json:"requestedByName"`
	RequestedAt         string  `json:"requestedAt"`
	CurrentStatus       string  `json:"currentStatus"`
	CurrentApproverRole string  `json:"currentApproverRole"`
	Notes               string  `json:"notes"`
}

// Execute executes the list approval usecase
func (uc *ListApprovalUseCase) Execute(ctx context.Context, input ListApprovalInput) (*ListApprovalOutput, error) {
	// Fetch approvals from repository
	requests, err := uc.approvalRepo.List(ctx, input.Status, input.ApproverRole)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to list approvals")
	}

	// Convert to output format
	outputs := make([]*ApprovalOutput, len(requests))
	for i, req := range requests {
		outputs[i] = &ApprovalOutput{
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
		}
	}

	result := ListApprovalOutput(outputs)
	return &result, nil
}
