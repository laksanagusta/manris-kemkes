package approval

import (
	"context"

	"github.com/google/uuid"
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

type ListApprovalInput struct {
	Status         string
	ApproverRole   string
	ApproverUserID *uuid.UUID
	OrgIDs         []uuid.UUID
	Page           int
	Limit          int
}

type ListApprovalResult struct {
	Data  []*ApprovalOutput `json:"data"`
	Total int               `json:"total"`
	Page  int               `json:"page"`
	Limit int               `json:"limit"`
}

// ApprovalOutput represents a single approval in the output
type ApprovalOutput struct {
	ID                    string  `json:"id"`
	RequestType           string  `json:"requestType"`
	EntityID              string  `json:"entityId"`
	EntityCode            *string `json:"entityCode"`
	EntityTitle           *string `json:"entityTitle"`
	EntityOrgName         *string `json:"entityOrgName"`
	RequestedBy           string  `json:"requestedBy"`
	RequestedByName       string  `json:"requestedByName"`
	RequestedAt           string  `json:"requestedAt"`
	CurrentStatus         string  `json:"currentStatus"`
	CurrentApproverRole   string  `json:"currentApproverRole"`
	CurrentApproverUserID *string `json:"currentApproverUserId,omitempty"`
	CurrentApproverName   *string `json:"currentApproverName,omitempty"`
	Notes                 string  `json:"notes"`
}

func (uc *ListApprovalUseCase) Execute(ctx context.Context, input ListApprovalInput) (*ListApprovalResult, error) {
	if input.Page <= 0 {
		input.Page = 1
	}
	if input.Limit <= 0 {
		input.Limit = 20
	}
	if input.Limit > 100 {
		input.Limit = 100
	}

	requests, total, err := uc.approvalRepo.List(ctx, input.Status, input.ApproverRole, input.ApproverUserID, input.OrgIDs, input.Page, input.Limit)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to list approvals")
	}

	outputs := make([]*ApprovalOutput, len(requests))
	for i, req := range requests {
		var approverUserID *string
		if req.CurrentApproverUserID != nil {
			value := req.CurrentApproverUserID.String()
			approverUserID = &value
		}
		outputs[i] = &ApprovalOutput{
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
			CurrentApproverUserID: approverUserID,
			CurrentApproverName:   req.CurrentApproverName,
			Notes:                 req.Notes,
		}
	}

	return &ListApprovalResult{
		Data:  outputs,
		Total: total,
		Page:  input.Page,
		Limit: input.Limit,
	}, nil
}
