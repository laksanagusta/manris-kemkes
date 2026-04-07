package repository

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
)

type SystemSettingRepository interface {
	Get(ctx context.Context, key string) (*entity.SystemSetting, error)
	GetAll(ctx context.Context) ([]*entity.SystemSetting, error)
	GetByCategory(ctx context.Context, category string) ([]*entity.SystemSetting, error)
	Upsert(ctx context.Context, setting *entity.SystemSetting) error
	Delete(ctx context.Context, key string) error
	GetAIModels(ctx context.Context) (*entity.AIModels, error)
}
