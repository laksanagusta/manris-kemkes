package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type formResponseRepository struct {
	pool *pgxpool.Pool
}

// NewFormResponseRepository creates a PostgreSQL-backed FormResponseRepository.
func NewFormResponseRepository(pool *pgxpool.Pool) repository.FormResponseRepository {
	return &formResponseRepository{pool: pool}
}

// Create inserts a new form response. Returns ErrDuplicateResponse on unique
// violation for (form_id, respondent_id).
func (r *formResponseRepository) Create(ctx context.Context, response *entity.FormResponse) (*entity.FormResponse, error) {
	err := r.pool.QueryRow(ctx,
		`INSERT INTO form_responses (form_id, respondent_id, answers)
		 VALUES ($1, $2, $3)
		 RETURNING id, submitted_at`,
		response.FormID, response.RespondentID, response.Answers,
	).Scan(&response.ID, &response.SubmittedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, domainerrors.ErrDuplicateResponse
		}
		return nil, fmt.Errorf("formResponseRepository.Create: %w", err)
	}
	return response, nil
}

// GetByFormID retrieves all responses for a form ordered by most recent first.
func (r *formResponseRepository) GetByFormID(ctx context.Context, formID uuid.UUID) ([]*entity.FormResponse, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, form_id, respondent_id, answers, submitted_at
		 FROM form_responses WHERE form_id = $1
		 ORDER BY submitted_at DESC`, formID)
	if err != nil {
		return nil, fmt.Errorf("formResponseRepository.GetByFormID: %w", err)
	}
	defer rows.Close()

	var responses []*entity.FormResponse
	for rows.Next() {
		resp := &entity.FormResponse{}
		if err := rows.Scan(&resp.ID, &resp.FormID, &resp.RespondentID, &resp.Answers, &resp.SubmittedAt); err != nil {
			return nil, fmt.Errorf("formResponseRepository.GetByFormID: scan: %w", err)
		}
		responses = append(responses, resp)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("formResponseRepository.GetByFormID: iterate: %w", err)
	}
	return responses, nil
}

// GetByFormAndRespondent retrieves a single response; returns (nil, nil) if not found.
func (r *formResponseRepository) GetByFormAndRespondent(ctx context.Context, formID uuid.UUID, respondentID uuid.UUID) (*entity.FormResponse, error) {
	resp := &entity.FormResponse{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, form_id, respondent_id, answers, submitted_at
		 FROM form_responses WHERE form_id = $1 AND respondent_id = $2`,
		formID, respondentID,
	).Scan(&resp.ID, &resp.FormID, &resp.RespondentID, &resp.Answers, &resp.SubmittedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("formResponseRepository.GetByFormAndRespondent: %w", err)
	}
	return resp, nil
}

// CountByFormID returns the number of responses for a form.
func (r *formResponseRepository) CountByFormID(ctx context.Context, formID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM form_responses WHERE form_id = $1`, formID,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("formResponseRepository.CountByFormID: %w", err)
	}
	return count, nil
}

// GetFieldAggregations returns per-field answer summaries for the given form.
//
// For radio/dropdown fields the summary maps option values to their response
// counts. For checkbox fields each selected value is counted independently.
// For text/textarea fields the summary contains "total" (response count) and
// "filled" (non-null answer count).
func (r *formResponseRepository) GetFieldAggregations(ctx context.Context, formID uuid.UUID, fields []entity.FormField) ([]entity.FormFieldAnalytics, error) {
	results := make([]entity.FormFieldAnalytics, 0, len(fields))

	for _, field := range fields {
		analytics := entity.FormFieldAnalytics{
			FieldID:   field.ID,
			FieldKey:  field.FieldKey,
			Label:     field.Label,
			FieldType: field.FieldType,
			Summary:   make(map[string]int),
		}

		switch field.FieldType {
		case entity.FieldTypeRadio, entity.FieldTypeDropdown:
			query := fmt.Sprintf(
				`SELECT answers->>'%s' AS value, COUNT(*)
				 FROM form_responses
				 WHERE form_id = $1 AND answers->>'%s' IS NOT NULL
				 GROUP BY answers->>'%s'`,
				field.FieldKey, field.FieldKey, field.FieldKey,
			)
			rows, err := r.pool.Query(ctx, query, formID)
			if err != nil {
				return nil, fmt.Errorf("formResponseRepository.GetFieldAggregations[%s]: %w", field.FieldKey, err)
			}
			for rows.Next() {
				var value string
				var count int
				if err := rows.Scan(&value, &count); err != nil {
					rows.Close()
					return nil, fmt.Errorf("formResponseRepository.GetFieldAggregations[%s]: scan: %w", field.FieldKey, err)
				}
				analytics.Summary[value] = count
			}
			rows.Close()
			if err := rows.Err(); err != nil {
				return nil, fmt.Errorf("formResponseRepository.GetFieldAggregations[%s]: iterate: %w", field.FieldKey, err)
			}

		case entity.FieldTypeCheckbox:
			query := fmt.Sprintf(
				`SELECT val, COUNT(*)
				 FROM form_responses, jsonb_array_elements_text(answers->'%s') AS val
				 WHERE form_id = $1
				 GROUP BY val`,
				field.FieldKey,
			)
			rows, err := r.pool.Query(ctx, query, formID)
			if err != nil {
				return nil, fmt.Errorf("formResponseRepository.GetFieldAggregations[%s]: %w", field.FieldKey, err)
			}
			for rows.Next() {
				var value string
				var count int
				if err := rows.Scan(&value, &count); err != nil {
					rows.Close()
					return nil, fmt.Errorf("formResponseRepository.GetFieldAggregations[%s]: scan: %w", field.FieldKey, err)
				}
				analytics.Summary[value] = count
			}
			rows.Close()
			if err := rows.Err(); err != nil {
				return nil, fmt.Errorf("formResponseRepository.GetFieldAggregations[%s]: iterate: %w", field.FieldKey, err)
			}

		case entity.FieldTypeText, entity.FieldTypeTextarea:
			query := fmt.Sprintf(
				`SELECT COUNT(*) AS total, COUNT(answers->>'%s') AS filled
				 FROM form_responses
				 WHERE form_id = $1`,
				field.FieldKey,
			)
			var total, filled int
			if err := r.pool.QueryRow(ctx, query, formID).Scan(&total, &filled); err != nil {
				return nil, fmt.Errorf("formResponseRepository.GetFieldAggregations[%s]: %w", field.FieldKey, err)
			}
			analytics.Summary["total"] = total
			analytics.Summary["filled"] = filled
		}

		results = append(results, analytics)
	}

	return results, nil
}

// GetFieldTrends returns time-series answer counts for option-based fields
// (radio, checkbox, dropdown). Non-option field types are silently skipped.
func (r *formResponseRepository) GetFieldTrends(ctx context.Context, formID uuid.UUID, fields []entity.FormField, period string) ([]entity.FormFieldTrends, error) {
	results := make([]entity.FormFieldTrends, 0)

	for _, field := range fields {
		if !entity.FieldTypeHasOptions(field.FieldType) {
			continue
		}

		trends := entity.FormFieldTrends{
			FieldID:   field.ID,
			FieldKey:  field.FieldKey,
			Label:     field.Label,
			FieldType: field.FieldType,
			Trends:    make([]entity.TrendPoint, 0),
		}

		var query string
		switch field.FieldType {
		case entity.FieldTypeRadio, entity.FieldTypeDropdown:
			query = fmt.Sprintf(
				`SELECT date_trunc($2, submitted_at)::text AS period, answers->>'%s' AS value, COUNT(*)
				 FROM form_responses
				 WHERE form_id = $1 AND answers->>'%s' IS NOT NULL
				 GROUP BY period, value
				 ORDER BY period`,
				field.FieldKey, field.FieldKey,
			)
		case entity.FieldTypeCheckbox:
			query = fmt.Sprintf(
				`SELECT date_trunc($2, submitted_at)::text AS period, val, COUNT(*)
				 FROM form_responses, jsonb_array_elements_text(answers->'%s') AS val
				 WHERE form_id = $1
				 GROUP BY period, val
				 ORDER BY period`,
				field.FieldKey,
			)
		}

		rows, err := r.pool.Query(ctx, query, formID, period)
		if err != nil {
			return nil, fmt.Errorf("formResponseRepository.GetFieldTrends[%s]: %w", field.FieldKey, err)
		}

		trendMap := make(map[string]map[string]int)
		var periodOrder []string
		for rows.Next() {
			var p, value string
			var count int
			if err := rows.Scan(&p, &value, &count); err != nil {
				rows.Close()
				return nil, fmt.Errorf("formResponseRepository.GetFieldTrends[%s]: scan: %w", field.FieldKey, err)
			}
			if _, exists := trendMap[p]; !exists {
				trendMap[p] = make(map[string]int)
				periodOrder = append(periodOrder, p)
			}
			trendMap[p][value] = count
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return nil, fmt.Errorf("formResponseRepository.GetFieldTrends[%s]: iterate: %w", field.FieldKey, err)
		}

		for _, p := range periodOrder {
			trends.Trends = append(trends.Trends, entity.TrendPoint{
				Period: p,
				Values: trendMap[p],
			})
		}

		results = append(results, trends)
	}

	return results, nil
}
