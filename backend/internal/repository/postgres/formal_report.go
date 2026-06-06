package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type formalReportRepository struct {
	pool *pgxpool.Pool
}

func NewFormalReportRepository(pool *pgxpool.Pool) repository.FormalReportRepository {
	return &formalReportRepository{pool: pool}
}

func (r *formalReportRepository) UpsertGenerated(ctx context.Context, report *entity.FormalReport) error {
	report.Status = entity.FormalReportStatusGenerated
	report.EnsureMetadata()

	rawMeta, err := json.Marshal(report.Metadata)
	if err != nil {
		return fmt.Errorf("marshal formal report metadata: %w", err)
	}

	var idArg any
	if report.ID == uuid.Nil {
		idArg = nil
	} else {
		idArg = report.ID
	}

	query := `
		INSERT INTO formal_reports (
			id, organization_id, period, report_type, status, generated_file_url, generated_by, generated_at, metadata
		) VALUES (
			COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9
		)
		ON CONFLICT (organization_id, period, report_type) DO UPDATE SET
			status = EXCLUDED.status,
			generated_file_url = EXCLUDED.generated_file_url,
			generated_by = EXCLUDED.generated_by,
			generated_at = EXCLUDED.generated_at,
			metadata = EXCLUDED.metadata,
			updated_at = now()
		RETURNING id, created_at, updated_at
	`

	if err := r.pool.QueryRow(ctx, query,
		idArg,
		report.OrganizationID,
		report.Period,
		report.ReportType,
		report.Status,
		report.GeneratedFileURL,
		report.GeneratedBy,
		report.GeneratedAt,
		rawMeta,
	).Scan(&report.ID, &report.CreatedAt, &report.UpdatedAt); err != nil {
		return fmt.Errorf("upsert formal report: %w", err)
	}

	return nil
}

func (r *formalReportRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.FormalReport, error) {
	report := &entity.FormalReport{}
	var rawMeta []byte
	if err := r.pool.QueryRow(ctx, `
		SELECT id, organization_id, period, report_type, status, generated_file_url, generated_by, generated_at, metadata, created_at, updated_at
		FROM formal_reports
		WHERE id = $1
	`, id).Scan(
		&report.ID,
		&report.OrganizationID,
		&report.Period,
		&report.ReportType,
		&report.Status,
		&report.GeneratedFileURL,
		&report.GeneratedBy,
		&report.GeneratedAt,
		&rawMeta,
		&report.CreatedAt,
		&report.UpdatedAt,
	); err != nil {
		return nil, fmt.Errorf("get formal report by id: %w", err)
	}

	if len(rawMeta) > 0 {
		if err := json.Unmarshal(rawMeta, &report.Metadata); err != nil {
			return nil, fmt.Errorf("unmarshal formal report metadata: %w", err)
		}
	}
	if report.Metadata == nil {
		report.Metadata = map[string]any{}
	}

	return report, nil
}

func (r *formalReportRepository) List(ctx context.Context, filter repository.FormalReportListFilter) ([]*entity.FormalReport, int, error) {
	countQuery := `SELECT COUNT(*) FROM formal_reports WHERE 1=1`
	dataQuery := `
		SELECT id, organization_id, period, report_type, status, generated_file_url, generated_by, generated_at, metadata, created_at, updated_at
		FROM formal_reports
		WHERE 1=1
	`

	var (
		args   []any
		argPos = 1
	)

	if filter.OrganizationIDs != nil {
		if len(filter.OrganizationIDs) == 0 {
			countQuery += " AND 1=0"
			dataQuery += " AND 1=0"
		} else {
			placeholders := make([]string, 0, len(filter.OrganizationIDs))
			for _, orgID := range filter.OrganizationIDs {
				placeholders = append(placeholders, fmt.Sprintf("$%d", argPos))
				args = append(args, orgID)
				argPos++
			}
			clause := fmt.Sprintf(" AND organization_id IN (%s)", strings.Join(placeholders, ","))
			countQuery += clause
			dataQuery += clause
		}
	} else if filter.OrganizationID != nil {
		clause := fmt.Sprintf(" AND organization_id = $%d", argPos)
		countQuery += clause
		dataQuery += clause
		args = append(args, *filter.OrganizationID)
		argPos++
	}
	if strings.TrimSpace(filter.Period) != "" {
		clause := fmt.Sprintf(" AND period = $%d", argPos)
		countQuery += clause
		dataQuery += clause
		args = append(args, strings.TrimSpace(filter.Period))
		argPos++
	}
	if strings.TrimSpace(filter.ReportType) != "" {
		clause := fmt.Sprintf(" AND report_type = $%d", argPos)
		countQuery += clause
		dataQuery += clause
		args = append(args, strings.TrimSpace(filter.ReportType))
		argPos++
	}
	if strings.TrimSpace(filter.Status) != "" {
		clause := fmt.Sprintf(" AND status = $%d", argPos)
		countQuery += clause
		dataQuery += clause
		args = append(args, strings.TrimSpace(filter.Status))
		argPos++
	}

	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count formal reports: %w", err)
	}

	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 || limit > 100 {
		limit = 10
	}
	offset := (page - 1) * limit

	dataQuery += fmt.Sprintf(" ORDER BY COALESCE(generated_at, created_at) DESC, created_at DESC LIMIT $%d OFFSET $%d", argPos, argPos+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list formal reports: %w", err)
	}
	defer rows.Close()

	items := make([]*entity.FormalReport, 0)
	for rows.Next() {
		report := &entity.FormalReport{}
		var rawMeta []byte
		if err := rows.Scan(
			&report.ID,
			&report.OrganizationID,
			&report.Period,
			&report.ReportType,
			&report.Status,
			&report.GeneratedFileURL,
			&report.GeneratedBy,
			&report.GeneratedAt,
			&rawMeta,
			&report.CreatedAt,
			&report.UpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan formal report: %w", err)
		}
		if len(rawMeta) > 0 {
			if err := json.Unmarshal(rawMeta, &report.Metadata); err != nil {
				return nil, 0, fmt.Errorf("unmarshal formal report metadata: %w", err)
			}
		}
		if report.Metadata == nil {
			report.Metadata = map[string]any{}
		}
		items = append(items, report)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate formal reports: %w", err)
	}

	return items, total, nil
}

var _ interface {
	UpsertGenerated(ctx context.Context, report *entity.FormalReport) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.FormalReport, error)
	List(ctx context.Context, filter repository.FormalReportListFilter) ([]*entity.FormalReport, int, error)
} = &formalReportRepository{}
