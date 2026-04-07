package system_setting

import (
	"context"
	"sync"
	"time"

	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type GetSettingUseCase interface {
	Get(ctx context.Context, key string) (*entity.SystemSetting, error)
	GetAll(ctx context.Context) ([]*entity.SystemSetting, error)
	GetByCategory(ctx context.Context, category string) ([]*entity.SystemSetting, error)
	GetAIModels(ctx context.Context) (*entity.AIModels, error)
}

type UpsertSettingUseCase interface {
	Upsert(ctx context.Context, setting *entity.SystemSetting) error
}

type DeleteSettingUseCase interface {
	Delete(ctx context.Context, key string) error
}

type SettingCache struct {
	aiModels   *entity.AIModels
	lastUpdate time.Time
	mu         sync.RWMutex
	ttl        time.Duration
}

type GetSettingService struct {
	repo  repository.SystemSettingRepository
	cache *SettingCache
}

type UpsertSettingService struct {
	repo  repository.SystemSettingRepository
	cache *SettingCache
}

type DeleteSettingService struct {
	repo  repository.SystemSettingRepository
	cache *SettingCache
}

func NewGetSettingService(repo repository.SystemSettingRepository) *GetSettingService {
	return &GetSettingService{
		repo: repo,
		cache: &SettingCache{
			ttl: 5 * time.Minute,
		},
	}
}

func NewUpsertSettingService(repo repository.SystemSettingRepository, cache *SettingCache) *UpsertSettingService {
	return &UpsertSettingService{
		repo:  repo,
		cache: cache,
	}
}

func NewDeleteSettingService(repo repository.SystemSettingRepository, cache *SettingCache) *DeleteSettingService {
	return &DeleteSettingService{
		repo:  repo,
		cache: cache,
	}
}

func GetSharedCache(services ...any) *SettingCache {
	for _, s := range services {
		switch svc := s.(type) {
		case *GetSettingService:
			return svc.cache
		case *UpsertSettingService:
			return svc.cache
		case *DeleteSettingService:
			return svc.cache
		}
	}
	return nil
}

func (s *GetSettingService) Get(ctx context.Context, key string) (*entity.SystemSetting, error) {
	return s.repo.Get(ctx, key)
}

func (s *GetSettingService) GetAll(ctx context.Context) ([]*entity.SystemSetting, error) {
	return s.repo.GetAll(ctx)
}

func (s *GetSettingService) GetByCategory(ctx context.Context, category string) ([]*entity.SystemSetting, error) {
	return s.repo.GetByCategory(ctx, category)
}

func (s *GetSettingService) GetAIModels(ctx context.Context) (*entity.AIModels, error) {
	s.cache.mu.RLock()
	if s.cache.aiModels != nil && time.Since(s.cache.lastUpdate) < s.cache.ttl {
		defer s.cache.mu.RUnlock()
		return s.cache.aiModels, nil
	}
	s.cache.mu.RUnlock()

	models, err := s.repo.GetAIModels(ctx)
	if err != nil {
		return nil, err
	}

	s.cache.mu.Lock()
	s.cache.aiModels = models
	s.cache.lastUpdate = time.Now()
	s.cache.mu.Unlock()

	return models, nil
}

func (s *UpsertSettingService) Upsert(ctx context.Context, setting *entity.SystemSetting) error {
	err := s.repo.Upsert(ctx, setting)
	if err != nil {
		return err
	}

	if setting.Category == "ai" {
		s.cache.mu.Lock()
		s.cache.aiModels = nil
		s.cache.mu.Unlock()
	}

	return nil
}

func (s *DeleteSettingService) Delete(ctx context.Context, key string) error {
	setting, err := s.repo.Get(ctx, key)
	if err != nil {
		return err
	}

	err = s.repo.Delete(ctx, key)
	if err != nil {
		return err
	}

	if setting.Category == "ai" {
		s.cache.mu.Lock()
		s.cache.aiModels = nil
		s.cache.mu.Unlock()
	}

	return nil
}
