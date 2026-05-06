package auth

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
)

type UpdateProfileInput struct {
	UserID   uuid.UUID
	Name     string
	Email    string
	NIP      string
	Jabatan  string
	Pangkat  string
}

type UpdateProfileUseCase struct {
	userRepo                    repository.UserRepository
	hierarchySvc                *service.OrganizationHierarchy
	riskApprovalWorkflowEnabled bool
}

func NewUpdateProfileUseCase(
	userRepo repository.UserRepository,
	hierarchySvc *service.OrganizationHierarchy,
	riskApprovalWorkflowEnabled bool,
) *UpdateProfileUseCase {
	return &UpdateProfileUseCase{userRepo: userRepo, hierarchySvc: hierarchySvc, riskApprovalWorkflowEnabled: riskApprovalWorkflowEnabled}
}

func (uc *UpdateProfileUseCase) Execute(ctx context.Context, input UpdateProfileInput) (*entity.UserProfile, error) {
	if input.UserID == uuid.Nil {
		return nil, errors.ErrInvalidInput
	}

	user, err := uc.userRepo.GetByID(ctx, input.UserID)
	if err != nil {
		return nil, errors.ErrNotFound
	}
	if user == nil {
		return nil, errors.ErrNotFound
	}

	user.Name = strings.TrimSpace(input.Name)
	user.Email = strings.TrimSpace(input.Email)
	user.NIP = strings.TrimSpace(input.NIP)
	user.Jabatan = strings.TrimSpace(input.Jabatan)
	user.Pangkat = strings.TrimSpace(input.Pangkat)

	if err := user.Validate(); err != nil {
		return nil, err
	}
	if err := uc.userRepo.Update(ctx, user); err != nil {
		return nil, errors.Wrap(err, "failed to update profile")
	}

	scope, err := uc.hierarchySvc.ResolveAccessScope(ctx, user.ID, user.Role, user.OrganizationID)
	if err != nil {
		return nil, err
	}

	return buildUserProfile(user, scope, uc.riskApprovalWorkflowEnabled), nil
}
