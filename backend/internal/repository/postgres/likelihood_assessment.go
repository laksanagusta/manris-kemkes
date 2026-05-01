package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type likelihoodAssessmentRepository struct {
	pool *pgxpool.Pool
}

func NewLikelihoodAssessmentRepository(pool *pgxpool.Pool) repository.LikelihoodAssessmentRepository {
	return &likelihoodAssessmentRepository{pool: pool}
}

func (r *likelihoodAssessmentRepository) Create(ctx context.Context, assessment *entity.LikelihoodAssessment) error {
	query := `
		INSERT INTO likelihood_assessments (
			risk_id, method, frequency_type, observation_period_months,
			event_count, population_count, calculated_probability,
			selected_probability_level, justification, data_source
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10
		)
		RETURNING id, created_at, updated_at
	`

	if err := r.pool.QueryRow(ctx, query,
		assessment.RiskID,
		assessment.Method,
		assessment.FrequencyType,
		assessment.ObservationPeriodMonths,
		assessment.EventCount,
		assessment.PopulationCount,
		assessment.CalculatedProbability,
		assessment.SelectedProbabilityLevel,
		assessment.Justification,
		assessment.DataSource,
	).Scan(&assessment.ID, &assessment.CreatedAt, &assessment.UpdatedAt); err != nil {
		return fmt.Errorf("create likelihood assessment: %w", err)
	}

	return nil
}

func (r *likelihoodAssessmentRepository) GetByRiskID(ctx context.Context, riskID uuid.UUID) (*entity.LikelihoodAssessment, error) {
	query := `
		SELECT id, risk_id, method, frequency_type, observation_period_months,
			event_count, population_count, calculated_probability,
			selected_probability_level, justification, data_source,
			created_at, updated_at
		FROM likelihood_assessments
		WHERE risk_id = $1
	`

	a := &entity.LikelihoodAssessment{}
	err := r.pool.QueryRow(ctx, query, riskID).Scan(
		&a.ID,
		&a.RiskID,
		&a.Method,
		&a.FrequencyType,
		&a.ObservationPeriodMonths,
		&a.EventCount,
		&a.PopulationCount,
		&a.CalculatedProbability,
		&a.SelectedProbabilityLevel,
		&a.Justification,
		&a.DataSource,
		&a.CreatedAt,
		&a.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return a, nil
}

func (r *likelihoodAssessmentRepository) UpsertByRiskID(ctx context.Context, assessment *entity.LikelihoodAssessment) error {
	query := `
		INSERT INTO likelihood_assessments (
			risk_id, method, frequency_type, observation_period_months,
			event_count, population_count, calculated_probability,
			selected_probability_level, justification, data_source
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10
		)
		ON CONFLICT (risk_id) DO UPDATE SET
			method = EXCLUDED.method,
			frequency_type = EXCLUDED.frequency_type,
			observation_period_months = EXCLUDED.observation_period_months,
			event_count = EXCLUDED.event_count,
			population_count = EXCLUDED.population_count,
			calculated_probability = EXCLUDED.calculated_probability,
			selected_probability_level = EXCLUDED.selected_probability_level,
			justification = EXCLUDED.justification,
			data_source = EXCLUDED.data_source,
			updated_at = now()
		RETURNING id, created_at, updated_at
	`

	if err := r.pool.QueryRow(ctx, query,
		assessment.RiskID,
		assessment.Method,
		assessment.FrequencyType,
		assessment.ObservationPeriodMonths,
		assessment.EventCount,
		assessment.PopulationCount,
		assessment.CalculatedProbability,
		assessment.SelectedProbabilityLevel,
		assessment.Justification,
		assessment.DataSource,
	).Scan(&assessment.ID, &assessment.CreatedAt, &assessment.UpdatedAt); err != nil {
		return fmt.Errorf("upsert likelihood assessment: %w", err)
	}

	return nil
}

func (r *likelihoodAssessmentRepository) DeleteByRiskID(ctx context.Context, riskID uuid.UUID) error {
	query := `DELETE FROM likelihood_assessments WHERE risk_id = $1`
	if _, err := r.pool.Exec(ctx, query, riskID); err != nil {
		return fmt.Errorf("delete likelihood assessment: %w", err)
	}
	return nil
}
