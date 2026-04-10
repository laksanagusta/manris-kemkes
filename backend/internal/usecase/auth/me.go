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
	userRepo     repository.UserRepository
	hierarchySvc *service.OrganizationHierarchy
}

func NewGetCurrentUserUseCase(
	userRepo repository.UserRepository,
	hierarchySvc *service.OrganizationHierarchy,
) *GetCurrentUserUseCase {
	return &GetCurrentUserUseCase{
		userRepo:     userRepo,
		hierarchySvc: hierarchySvc,
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

	userProfile := &entity.UserProfile{
		ID:               user.ID,
		Username:         user.Username,
		Name:             user.Name,
		Role:             user.Role,
		OrganizationID:   user.OrganizationID,
		AccessibleOrgIDs: scope.AccessibleOrgIDs,
		IsGlobal:         scope.IsGlobal,
		Status:           user.Status,
		CreatedAt:        user.CreatedAt,
		UpdatedAt:        user.UpdatedAt,
	}

	return userProfile, nil
}
