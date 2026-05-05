package user

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type RejectRegistrationUseCase struct {
	userRepo repository.UserRepository
}

func NewRejectRegistrationUseCase(userRepo repository.UserRepository) *RejectRegistrationUseCase {
	return &RejectRegistrationUseCase{userRepo: userRepo}
}

type RejectRegistrationOutput struct {
	Message string
}

func (uc *RejectRegistrationUseCase) Execute(ctx context.Context, id uuid.UUID) (*RejectRegistrationOutput, error) {
	user, err := uc.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.ErrNotFound
	}
	if user.Status != entity.UserStatusPendingActivation {
		return nil, errors.ErrNotPending
	}

	if err := uc.userRepo.Delete(ctx, id); err != nil {
		return nil, errors.Wrap(err, "failed to reject registration")
	}

	return &RejectRegistrationOutput{Message: "Registration rejected successfully"}, nil
}
