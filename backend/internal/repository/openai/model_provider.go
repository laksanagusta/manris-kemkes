package openai

import (
	"context"

	systemsettinguc "github.com/manris/backend/internal/usecase/system_setting"
)

// ModelProviderAdapter adapts the settings service to the AIModelProvider interface
type ModelProviderAdapter struct {
	settingsService *systemsettinguc.GetSettingService
}

// NewModelProviderAdapter creates a new model provider adapter
func NewModelProviderAdapter(settingsService *systemsettinguc.GetSettingService) *ModelProviderAdapter {
	return &ModelProviderAdapter{
		settingsService: settingsService,
	}
}

// GetModelForFeature returns the appropriate model for a given feature
func (a *ModelProviderAdapter) GetModelForFeature(feature string) string {
	ctx := context.Background()
	models, err := a.settingsService.GetAIModels(ctx)
	if err != nil {
		return "gpt-4o-mini"
	}
	return models.GetModelForFeature(feature)
}
