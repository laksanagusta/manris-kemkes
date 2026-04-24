package auth

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
)

type GetCurrentUserInput struct {
	UserID uuid.UUID
}

type GetCurrentUserUseCase struct {
	userRepo                    repository.UserRepository
	hierarchySvc                *service.OrganizationHierarchy
	riskApprovalWorkflowEnabled bool
}

func NewGetCurrentUserUseCase(
	userRepo repository.UserRepository,
	hierarchySvc *service.OrganizationHierarchy,
	riskApprovalWorkflowEnabled bool,
) *GetCurrentUserUseCase {
	return &GetCurrentUserUseCase{
		userRepo:                    userRepo,
		hierarchySvc:                hierarchySvc,
		riskApprovalWorkflowEnabled: riskApprovalWorkflowEnabled,
	}
}

func (uc *GetCurrentUserUseCase) Execute(ctx context.Context, input GetCurrentUserInput) (*entity.UserProfile, error) {
	if input.UserID == uuid.Nil {
		return nil, errors.ErrInvalidInput
	}

	user, err := uc.userRepo.GetByID(ctx, input.UserID)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	scope, err := uc.hierarchySvc.ResolveAccessScope(ctx, user.ID, user.Role, user.OrganizationID)
	if err != nil {
		return nil, err
	}

	return buildUserProfile(user, scope, uc.riskApprovalWorkflowEnabled), nil
}
