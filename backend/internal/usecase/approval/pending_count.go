package approval

import (
	"context"

	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// GetPendingCountUseCase handles getting pending approval count
type GetPendingCountUseCase struct {
	approvalRepo repository.ApprovalRepository
}

// NewGetPendingCountUseCase creates a new get pending count usecase
func NewGetPendingCountUseCase(approvalRepo repository.ApprovalRepository) *GetPendingCountUseCase {
	return &GetPendingCountUseCase{
		approvalRepo: approvalRepo,
	}
}

// Input represents the input for getting pending count
type GetPendingCountInput struct {
	Role   string
	UserID *uuid.UUID
}

// Output represents the output of getting pending count
type GetPendingCountOutput struct {
	Count int
}

// Execute executes the get pending count usecase
func (uc *GetPendingCountUseCase) Execute(ctx context.Context, input GetPendingCountInput) (*GetPendingCountOutput, error) {
	var approverRole string

	// Determine approver role based on user role
	switch input.Role {
	case "reviewer":
		approverRole = "reviewer"
	case "pimpinan":
		approverRole = "pimpinan"
	case "superadmin":
		// Superadmin can see all, return 0 for now
		return &GetPendingCountOutput{Count: 0}, nil
	default:
		// Other roles don't have pending approvals
		return &GetPendingCountOutput{Count: 0}, nil
	}

	count, err := uc.approvalRepo.GetPendingCount(ctx, approverRole, input.UserID)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to get pending count")
	}

	return &GetPendingCountOutput{Count: count}, nil
}
