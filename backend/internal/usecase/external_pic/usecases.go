package external_pic

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type GetOrCreateByNameUseCase struct {
	picRepo repository.ExternalPICRepository
}

func NewGetOrCreateByNameUseCase(picRepo repository.ExternalPICRepository) *GetOrCreateByNameUseCase {
	return &GetOrCreateByNameUseCase{
		picRepo: picRepo,
	}
}

func (uc *GetOrCreateByNameUseCase) Execute(ctx context.Context, name string) (*entity.ExternalPIC, error) {
	return uc.picRepo.GetOrCreateByName(ctx, name)
}

type ListExternalPICsUseCase struct {
	picRepo repository.ExternalPICRepository
}

func NewListExternalPICsUseCase(picRepo repository.ExternalPICRepository) *ListExternalPICsUseCase {
	return &ListExternalPICsUseCase{
		picRepo: picRepo,
	}
}

func (uc *ListExternalPICsUseCase) Execute(ctx context.Context) ([]*entity.ExternalPIC, error) {
	return uc.picRepo.List(ctx)
}

type DeleteExternalPICUseCase struct {
	picRepo repository.ExternalPICRepository
}

func NewDeleteExternalPICUseCase(picRepo repository.ExternalPICRepository) *DeleteExternalPICUseCase {
	return &DeleteExternalPICUseCase{
		picRepo: picRepo,
	}
}

func (uc *DeleteExternalPICUseCase) Execute(ctx context.Context, id uuid.UUID) error {
	return uc.picRepo.Delete(ctx, id)
}
