package postgres

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type systemSettingRepository struct {
	pool *pgxpool.Pool
}

func NewSystemSettingRepository(pool *pgxpool.Pool) repository.SystemSettingRepository {
	return &systemSettingRepository{pool: pool}
}

func (r *systemSettingRepository) Get(ctx context.Context, key string) (*entity.SystemSetting, error) {
	query := `
		SELECT key, value, description, category, created_at, updated_at
		FROM system_settings
		WHERE key = $1
	`

	var setting entity.SystemSetting
	err := r.pool.QueryRow(ctx, query, key).Scan(
		&setting.Key,
		&setting.Value,
		&setting.Description,
		&setting.Category,
		&setting.CreatedAt,
		&setting.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &setting, nil
}

func (r *systemSettingRepository) GetAll(ctx context.Context) ([]*entity.SystemSetting, error) {
	query := `
		SELECT key, value, description, category, created_at, updated_at
		FROM system_settings
		ORDER BY category, key
	`

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var settings []*entity.SystemSetting
	for rows.Next() {
		var s entity.SystemSetting
		if err := rows.Scan(
			&s.Key,
			&s.Value,
			&s.Description,
			&s.Category,
			&s.CreatedAt,
			&s.UpdatedAt,
		); err != nil {
			return nil, err
		}
		settings = append(settings, &s)
	}

	if settings == nil {
		settings = []*entity.SystemSetting{}
	}

	return settings, nil
}

func (r *systemSettingRepository) GetByCategory(ctx context.Context, category string) ([]*entity.SystemSetting, error) {
	query := `
		SELECT key, value, description, category, created_at, updated_at
		FROM system_settings
		WHERE category = $1
		ORDER BY key
	`

	rows, err := r.pool.Query(ctx, query, category)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var settings []*entity.SystemSetting
	for rows.Next() {
		var s entity.SystemSetting
		if err := rows.Scan(
			&s.Key,
			&s.Value,
			&s.Description,
			&s.Category,
			&s.CreatedAt,
			&s.UpdatedAt,
		); err != nil {
			return nil, err
		}
		settings = append(settings, &s)
	}

	if settings == nil {
		settings = []*entity.SystemSetting{}
	}

	return settings, nil
}

func (r *systemSettingRepository) Upsert(ctx context.Context, setting *entity.SystemSetting) error {
	now := time.Now()
	query := `
		INSERT INTO system_settings (key, value, description, category, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (key) DO UPDATE SET
			value = EXCLUDED.value,
			description = EXCLUDED.description,
			category = EXCLUDED.category,
			updated_at = EXCLUDED.updated_at
	`

	_, err := r.pool.Exec(ctx, query,
		setting.Key,
		setting.Value,
		setting.Description,
		setting.Category,
		now,
		now,
	)

	return err
}

func (r *systemSettingRepository) Delete(ctx context.Context, key string) error {
	query := `DELETE FROM system_settings WHERE key = $1`
	_, err := r.pool.Exec(ctx, query, key)
	return err
}

func (r *systemSettingRepository) GetAIModels(ctx context.Context) (*entity.AIModels, error) {
	settings, err := r.GetByCategory(ctx, "ai")
	if err != nil {
		return nil, err
	}

	models := &entity.AIModels{}
	for _, s := range settings {
		switch s.Key {
		case "ai.model.default":
			models.Default = s.Value
		case "ai.model.cause":
			models.Cause = s.Value
		case "ai.model.impact":
			models.Impact = s.Value
		case "ai.model.mitigation":
			models.Mitigation = s.Value
		case "ai.model.transcript":
			models.Transcript = s.Value
		case "ai.model.predictive":
			models.Predictive = s.Value
		case "ai.model.minutes":
			models.Minutes = s.Value
		case "ai.model.kri":
			models.KRI = s.Value
		case "ai.model.risk-suggestion":
			models.RiskSuggestion = s.Value
		case "ai.model.incident":
			models.Incident = s.Value
		case "ai.model.cba":
			models.CBA = s.Value
		}
	}

	return models, nil
}
