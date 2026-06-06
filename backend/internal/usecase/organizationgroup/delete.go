package organizationgroup

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type DeleteUseCase struct {
	groupRepo repository.OrganizationGroupRepository
}

func NewDeleteUseCase(groupRepo repository.OrganizationGroupRepository) *DeleteUseCase {
	return &DeleteUseCase{groupRepo: groupRepo}
}

type DeleteInput struct {
	ID    uuid.UUID
	Scope *entity.AccessScope
}

type DeleteOutput struct {
	Message string `json:"message"`
}

func (uc *DeleteUseCase) Execute(ctx context.Context, input DeleteInput) (*DeleteOutput, error) {
	group, err := uc.groupRepo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrNotFound
	}
	if err := requireOwnOrganization(input.Scope, group.OwnerOrganizationID); err != nil {
		return nil, err
	}

	if err := uc.groupRepo.Delete(ctx, input.ID); err != nil {
		return nil, errors.Wrap(err, "failed to delete organization group")
	}

	return &DeleteOutput{Message: "Organization group deleted successfully"}, nil
}
