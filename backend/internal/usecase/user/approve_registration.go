package user

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type ApproveRegistrationUseCase struct {
	userRepo repository.UserRepository
}

func NewApproveRegistrationUseCase(userRepo repository.UserRepository) *ApproveRegistrationUseCase {
	return &ApproveRegistrationUseCase{userRepo: userRepo}
}

type ApproveRegistrationOutput struct {
	Message   string
	UpdatedAt time.Time
}

func (uc *ApproveRegistrationUseCase) Execute(ctx context.Context, id uuid.UUID) (*ApproveRegistrationOutput, error) {
	user, err := uc.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.ErrNotFound
	}
	if user.Status != entity.UserStatusPendingActivation {
		return nil, errors.ErrNotPending
	}

	user.Status = entity.UserStatusActive
	user.MustChangePassword = false

	if err := uc.userRepo.Update(ctx, user); err != nil {
		return nil, errors.Wrap(err, "failed to approve registration")
	}

	return &ApproveRegistrationOutput{
		Message:   "Registration approved successfully",
		UpdatedAt: user.UpdatedAt,
	}, nil
}
