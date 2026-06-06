package organizationgroup

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type ResolveUseCase struct {
	groupRepo repository.OrganizationGroupRepository
}

func NewResolveUseCase(groupRepo repository.OrganizationGroupRepository) *ResolveUseCase {
	return &ResolveUseCase{groupRepo: groupRepo}
}

type ResolveInput struct {
	GroupID uuid.UUID
	Scope   *entity.AccessScope
}

func (uc *ResolveUseCase) Execute(ctx context.Context, input ResolveInput) ([]uuid.UUID, error) {
	group, err := uc.groupRepo.GetByID(ctx, input.GroupID)
	if err != nil {
		return nil, errors.ErrNotFound
	}
	if err := requireOwnOrganization(input.Scope, group.OwnerOrganizationID); err != nil {
		return nil, err
	}

	memberIDs, err := uc.groupRepo.ListMemberIDs(ctx, input.GroupID)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load organization group members")
	}
	if memberIDs == nil {
		memberIDs = []uuid.UUID{}
	}

	return memberIDs, nil
}

func (uc *ResolveUseCase) ResolveReportGroup(ctx context.Context, groupID uuid.UUID, scope *entity.AccessScope) ([]uuid.UUID, error) {
	return uc.Execute(ctx, ResolveInput{GroupID: groupID, Scope: scope})
}
