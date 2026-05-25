package postgres

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type evaluationRepository struct {
	pool *pgxpool.Pool
}

type evaluationReader interface {
	QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row
	Query(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error)
}

type evaluationExecer interface {
	Exec(ctx context.Context, sql string, args ...interface{}) (pgconn.CommandTag, error)
	QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row
}

func NewEvaluationRepository(pool *pgxpool.Pool) repository.EvaluationRepository {
	return &evaluationRepository{pool: pool}
}

func (r *evaluationRepository) GetActiveTemplate(ctx context.Context, templateKey string) (*entity.EvaluationTemplate, error) {
	template := &entity.EvaluationTemplate{}
	if err := r.pool.QueryRow(ctx, `
		SELECT id, template_key, name, version, status, created_at, updated_at
		FROM evaluation_templates
		WHERE template_key = $1 AND status = 'active'
		ORDER BY version DESC
		LIMIT 1
	`, strings.TrimSpace(templateKey)).Scan(
		&template.ID,
		&template.TemplateKey,
		&template.Name,
		&template.Version,
		&template.Status,
		&template.CreatedAt,
		&template.UpdatedAt,
	); err != nil {
		return nil, fmt.Errorf("get active evaluation template: %w", err)
	}

	sections, err := r.listTemplateSections(ctx, template.ID)
	if err != nil {
		return nil, err
	}
	template.Sections = sections
	return template, nil
}

func (r *evaluationRepository) Create(ctx context.Context, evaluation *entity.Evaluation) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin evaluation create tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if err := insertEvaluation(ctx, tx, evaluation); err != nil {
		return err
	}
	if err := upsertEvaluationSections(ctx, tx, evaluation); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit evaluation create tx: %w", err)
	}
	return nil
}

func (r *evaluationRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.Evaluation, error) {
	evaluation := &entity.Evaluation{}
	var (
		reportDate           pgtype.Date
		assignmentLetterDate pgtype.Date
		createdBy            uuid.NullUUID
		finalizedAt          pgtype.Timestamptz
		templateName         string
	)
	if err := r.pool.QueryRow(ctx, `
		SELECT e.id, e.organization_id, e.period, e.template_id, COALESCE(et.name, ''), e.status,
		       e.report_number, e.report_date, e.assignment_letter_number, e.assignment_letter_date,
		       e.monitoring_date_range, e.unit_code, e.unit_location, e.unit_address, e.unit_eselon_i,
		       e.unit_leader_name, e.team_coordinator, e.team_lead, e.team_members, e.problems,
		       e.recommendations, e.created_by, e.finalized_at, e.created_at, e.updated_at
		FROM evaluations e
		LEFT JOIN evaluation_templates et ON et.id = e.template_id
		WHERE e.id = $1
	`, id).Scan(
		&evaluation.ID,
		&evaluation.OrganizationID,
		&evaluation.Period,
		&evaluation.TemplateID,
		&templateName,
		&evaluation.Status,
		&evaluation.ReportNumber,
		&reportDate,
		&evaluation.AssignmentLetterNumber,
		&assignmentLetterDate,
		&evaluation.MonitoringDateRange,
		&evaluation.UnitCode,
		&evaluation.UnitLocation,
		&evaluation.UnitAddress,
		&evaluation.UnitEselonI,
		&evaluation.UnitLeaderName,
		&evaluation.TeamCoordinator,
		&evaluation.TeamLead,
		&evaluation.TeamMembers,
		&evaluation.Problems,
		&evaluation.Recommendations,
		&createdBy,
		&finalizedAt,
		&evaluation.CreatedAt,
		&evaluation.UpdatedAt,
	); err != nil {
		return nil, fmt.Errorf("get evaluation by id: %w", err)
	}
	evaluation.TemplateName = templateName
	evaluation.ReportDate = nullableDatePtr(reportDate)
	evaluation.AssignmentLetterDate = nullableDatePtr(assignmentLetterDate)
	evaluation.CreatedBy = evaluationNullableUUIDPtr(createdBy)
	evaluation.FinalizedAt = nullableTimestamptzPtr(finalizedAt)

	sections, err := r.loadEvaluationSections(ctx, evaluation.ID)
	if err != nil {
		return nil, err
	}
	evaluation.Sections = sections
	return evaluation, nil
}

func (r *evaluationRepository) Update(ctx context.Context, evaluation *entity.Evaluation) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin evaluation update tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, `
		UPDATE evaluations
		SET report_number = $2,
			report_date = $3,
			assignment_letter_number = $4,
			assignment_letter_date = $5,
			monitoring_date_range = $6,
			unit_code = $7,
			unit_location = $8,
			unit_address = $9,
			unit_eselon_i = $10,
			unit_leader_name = $11,
			team_coordinator = $12,
			team_lead = $13,
			team_members = $14,
			problems = $15,
			recommendations = $16,
			status = $17,
			finalized_at = $18,
			updated_at = now()
		WHERE id = $1
	`, evaluation.ID, evaluation.ReportNumber, evaluation.ReportDate, evaluation.AssignmentLetterNumber, evaluation.AssignmentLetterDate,
		evaluation.MonitoringDateRange, evaluation.UnitCode, evaluation.UnitLocation, evaluation.UnitAddress, evaluation.UnitEselonI,
		evaluation.UnitLeaderName, evaluation.TeamCoordinator, evaluation.TeamLead, evaluation.TeamMembers, evaluation.Problems,
		evaluation.Recommendations, evaluation.Status, evaluation.FinalizedAt); err != nil {
		return fmt.Errorf("update evaluation: %w", err)
	}

	if err := upsertEvaluationSections(ctx, tx, evaluation); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit evaluation update tx: %w", err)
	}
	return nil
}

func (r *evaluationRepository) List(ctx context.Context, filter repository.EvaluationListFilter) ([]*entity.Evaluation, int, error) {
	countQuery := `
		SELECT COUNT(*)
		FROM evaluations e
		LEFT JOIN organizations o ON o.id = e.organization_id
		LEFT JOIN evaluation_templates et ON et.id = e.template_id
		WHERE 1=1
	`
	dataQuery := `
		SELECT e.id, e.organization_id, e.period, e.template_id, COALESCE(et.name, ''), e.status,
		       e.report_number, e.report_date, e.assignment_letter_number, e.assignment_letter_date,
		       e.monitoring_date_range, e.unit_code, e.unit_location, e.unit_address, e.unit_eselon_i,
		       e.unit_leader_name, e.team_coordinator, e.team_lead, e.team_members, e.problems,
		       e.recommendations, e.created_by, e.finalized_at, e.created_at, e.updated_at
		FROM evaluations e
		LEFT JOIN organizations o ON o.id = e.organization_id
		LEFT JOIN evaluation_templates et ON et.id = e.template_id
		WHERE 1=1
	`

	var (
		args   []any
		argPos = 1
	)

	if filter.OrganizationID != nil {
		clause := fmt.Sprintf(" AND e.organization_id = $%d", argPos)
		countQuery += clause
		dataQuery += clause
		args = append(args, *filter.OrganizationID)
		argPos++
	}
	if strings.TrimSpace(filter.Period) != "" {
		clause := fmt.Sprintf(" AND e.period = $%d", argPos)
		countQuery += clause
		dataQuery += clause
		args = append(args, strings.TrimSpace(filter.Period))
		argPos++
	}
	if strings.TrimSpace(filter.Status) != "" {
		clause := fmt.Sprintf(" AND e.status = $%d", argPos)
		countQuery += clause
		dataQuery += clause
		args = append(args, strings.TrimSpace(filter.Status))
		argPos++
	}
	if strings.TrimSpace(filter.Query) != "" {
		clause := fmt.Sprintf(" AND (e.period ILIKE $%d OR o.name ILIKE $%d OR et.name ILIKE $%d)", argPos, argPos, argPos)
		countQuery += clause
		dataQuery += clause
		args = append(args, "%"+strings.TrimSpace(filter.Query)+"%")
		argPos++
	}

	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count evaluations: %w", err)
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

	dataQuery += fmt.Sprintf(" ORDER BY e.updated_at DESC, e.created_at DESC LIMIT $%d OFFSET $%d", argPos, argPos+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list evaluations: %w", err)
	}
	defer rows.Close()

	items := make([]*entity.Evaluation, 0)
	for rows.Next() {
		evaluation, err := scanEvaluationRow(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, evaluation)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate evaluations: %w", err)
	}

	return items, total, nil
}

func (r *evaluationRepository) ExistsByOrgPeriodTemplate(ctx context.Context, orgID uuid.UUID, period string, templateID uuid.UUID, excludeID *uuid.UUID) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1
			FROM evaluations
			WHERE organization_id = $1
			  AND period = $2
			  AND template_id = $3
		`
	args := []any{orgID, strings.TrimSpace(period), templateID}
	if excludeID != nil {
		query += ` AND id <> $4`
		args = append(args, *excludeID)
	}
	query += `)`

	var exists bool
	if err := r.pool.QueryRow(ctx, query, args...).Scan(&exists); err != nil {
		return false, fmt.Errorf("check evaluation uniqueness: %w", err)
	}
	return exists, nil
}

func (r *evaluationRepository) listTemplateSections(ctx context.Context, templateID uuid.UUID) ([]entity.EvaluationTemplateSection, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, template_id, section_key, title, description, sort_order, created_at, updated_at
		FROM evaluation_template_sections
		WHERE template_id = $1
		ORDER BY sort_order ASC, created_at ASC
	`, templateID)
	if err != nil {
		return nil, fmt.Errorf("list evaluation template sections: %w", err)
	}
	defer rows.Close()

	sections := make([]entity.EvaluationTemplateSection, 0)
	for rows.Next() {
		section := entity.EvaluationTemplateSection{}
		if err := rows.Scan(
			&section.ID,
			&section.TemplateID,
			&section.SectionKey,
			&section.Title,
			&section.Description,
			&section.SortOrder,
			&section.CreatedAt,
			&section.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan evaluation template section: %w", err)
		}
		items, err := r.listTemplateItems(ctx, section.ID)
		if err != nil {
			return nil, err
		}
		section.Items = items
		sections = append(sections, section)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate evaluation template sections: %w", err)
	}
	return sections, nil
}

func (r *evaluationRepository) listTemplateItems(ctx context.Context, sectionID uuid.UUID) ([]entity.EvaluationTemplateItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, section_id, item_key, item_no, label, default_condition, default_description, default_analysis, sort_order, created_at, updated_at
		FROM evaluation_template_items
		WHERE section_id = $1
		ORDER BY sort_order ASC, created_at ASC
	`, sectionID)
	if err != nil {
		return nil, fmt.Errorf("list evaluation template items: %w", err)
	}
	defer rows.Close()

	items := make([]entity.EvaluationTemplateItem, 0)
	for rows.Next() {
		item := entity.EvaluationTemplateItem{}
		if err := rows.Scan(
			&item.ID,
			&item.SectionID,
			&item.ItemKey,
			&item.ItemNo,
			&item.Label,
			&item.DefaultCondition,
			&item.DefaultDescription,
			&item.DefaultAnalysis,
			&item.SortOrder,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan evaluation template item: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate evaluation template items: %w", err)
	}
	return items, nil
}

func (r *evaluationRepository) loadEvaluationSections(ctx context.Context, evaluationID uuid.UUID) ([]entity.EvaluationSection, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, evaluation_id, template_section_id, section_key, title, description, conclusion, sort_order, created_at, updated_at
		FROM evaluation_sections
		WHERE evaluation_id = $1
		ORDER BY sort_order ASC, created_at ASC
	`, evaluationID)
	if err != nil {
		return nil, fmt.Errorf("list evaluation sections: %w", err)
	}
	defer rows.Close()

	sections := make([]entity.EvaluationSection, 0)
	for rows.Next() {
		section := entity.EvaluationSection{}
		var templateSectionID uuid.NullUUID
		if err := rows.Scan(
			&section.ID,
			&section.EvaluationID,
			&templateSectionID,
			&section.SectionKey,
			&section.Title,
			&section.Description,
			&section.Conclusion,
			&section.SortOrder,
			&section.CreatedAt,
			&section.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan evaluation section: %w", err)
		}
		section.TemplateSectionID = evaluationNullableUUIDPtr(templateSectionID)

		items, err := r.loadEvaluationItems(ctx, section.ID)
		if err != nil {
			return nil, err
		}
		section.Items = items
		sections = append(sections, section)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate evaluation sections: %w", err)
	}
	return sections, nil
}

func (r *evaluationRepository) loadEvaluationItems(ctx context.Context, sectionID uuid.UUID) ([]entity.EvaluationItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, section_id, template_item_id, item_key, item_no, label, answer, condition, description, analysis, sort_order, created_at, updated_at
		FROM evaluation_items
		WHERE section_id = $1
		ORDER BY sort_order ASC, created_at ASC
	`, sectionID)
	if err != nil {
		return nil, fmt.Errorf("list evaluation items: %w", err)
	}
	defer rows.Close()

	items := make([]entity.EvaluationItem, 0)
	for rows.Next() {
		item := entity.EvaluationItem{}
		var templateItemID uuid.NullUUID
		if err := rows.Scan(
			&item.ID,
			&item.SectionID,
			&templateItemID,
			&item.ItemKey,
			&item.ItemNo,
			&item.Label,
			&item.Answer,
			&item.Condition,
			&item.Description,
			&item.Analysis,
			&item.SortOrder,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan evaluation item: %w", err)
		}
		item.TemplateItemID = evaluationNullableUUIDPtr(templateItemID)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate evaluation items: %w", err)
	}
	return items, nil
}

func insertEvaluation(ctx context.Context, q evaluationExecer, evaluation *entity.Evaluation) error {
	if evaluation.ID == uuid.Nil {
		evaluation.ID = uuid.New()
	}
	if evaluation.Status == "" {
		evaluation.Status = entity.EvaluationStatusDraft
	}

	var reportDate any = evaluation.ReportDate
	if evaluation.ReportDate == nil {
		reportDate = nil
	}
	var assignmentLetterDate any = evaluation.AssignmentLetterDate
	if evaluation.AssignmentLetterDate == nil {
		assignmentLetterDate = nil
	}

	if err := q.QueryRow(ctx, `
		INSERT INTO evaluations (
			id, organization_id, period, template_id, status, report_number, report_date,
			assignment_letter_number, assignment_letter_date, monitoring_date_range, unit_code,
			unit_location, unit_address, unit_eselon_i, unit_leader_name, team_coordinator,
			team_lead, team_members, problems, recommendations, created_by, finalized_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
		)
		RETURNING created_at, updated_at
	`, evaluation.ID, evaluation.OrganizationID, evaluation.Period, evaluation.TemplateID, evaluation.Status,
		evaluation.ReportNumber, reportDate, evaluation.AssignmentLetterNumber, assignmentLetterDate,
		evaluation.MonitoringDateRange, evaluation.UnitCode, evaluation.UnitLocation, evaluation.UnitAddress,
		evaluation.UnitEselonI, evaluation.UnitLeaderName, evaluation.TeamCoordinator, evaluation.TeamLead,
		evaluation.TeamMembers, evaluation.Problems, evaluation.Recommendations, evaluation.CreatedBy, evaluation.FinalizedAt,
	).Scan(&evaluation.CreatedAt, &evaluation.UpdatedAt); err != nil {
		return fmt.Errorf("create evaluation: %w", err)
	}
	return nil
}

func upsertEvaluationSections(ctx context.Context, q evaluationExecer, evaluation *entity.Evaluation) error {
	keepSectionIDs := make([]uuid.UUID, 0, len(evaluation.Sections))
	for sectionIndex := range evaluation.Sections {
		section := &evaluation.Sections[sectionIndex]
		section.EvaluationID = evaluation.ID
		if section.ID == uuid.Nil {
			section.ID = uuid.New()
		}
		keepSectionIDs = append(keepSectionIDs, section.ID)

		var templateSectionID any = section.TemplateSectionID
		if section.TemplateSectionID == nil {
			templateSectionID = nil
		}

		if err := q.QueryRow(ctx, `
			INSERT INTO evaluation_sections (
				id, evaluation_id, template_section_id, section_key, title, description, conclusion, sort_order
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
			ON CONFLICT (id) DO UPDATE SET
				template_section_id = EXCLUDED.template_section_id,
				section_key = EXCLUDED.section_key,
				title = EXCLUDED.title,
				description = EXCLUDED.description,
				conclusion = EXCLUDED.conclusion,
				sort_order = EXCLUDED.sort_order,
				updated_at = now()
			RETURNING created_at, updated_at
		`, section.ID, section.EvaluationID, templateSectionID, section.SectionKey, section.Title, section.Description, section.Conclusion, section.SortOrder,
		).Scan(&section.CreatedAt, &section.UpdatedAt); err != nil {
			return fmt.Errorf("upsert evaluation section: %w", err)
		}

		if err := upsertEvaluationItems(ctx, q, section); err != nil {
			return err
		}
	}

	if len(keepSectionIDs) > 0 {
		if _, err := q.Exec(ctx, `
			DELETE FROM evaluation_sections
			WHERE evaluation_id = $1
			  AND NOT (id = ANY($2::uuid[]))
		`, evaluation.ID, uuidArrayToStrings(keepSectionIDs)); err != nil {
			return fmt.Errorf("prune evaluation sections: %w", err)
		}
	}
	return nil
}

func upsertEvaluationItems(ctx context.Context, q evaluationExecer, section *entity.EvaluationSection) error {
	keepItemIDs := make([]uuid.UUID, 0, len(section.Items))
	for itemIndex := range section.Items {
		item := &section.Items[itemIndex]
		item.SectionID = section.ID
		if item.ID == uuid.Nil {
			item.ID = uuid.New()
		}
		keepItemIDs = append(keepItemIDs, item.ID)

		var templateItemID any = item.TemplateItemID
		if item.TemplateItemID == nil {
			templateItemID = nil
		}

		if err := q.QueryRow(ctx, `
			INSERT INTO evaluation_items (
				id, section_id, template_item_id, item_key, item_no, label, answer, condition, description, analysis, sort_order
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
			ON CONFLICT (id) DO UPDATE SET
				template_item_id = EXCLUDED.template_item_id,
				item_key = EXCLUDED.item_key,
				item_no = EXCLUDED.item_no,
				label = EXCLUDED.label,
				answer = EXCLUDED.answer,
				condition = EXCLUDED.condition,
				description = EXCLUDED.description,
				analysis = EXCLUDED.analysis,
				sort_order = EXCLUDED.sort_order,
				updated_at = now()
			RETURNING created_at, updated_at
		`, item.ID, item.SectionID, templateItemID, item.ItemKey, item.ItemNo, item.Label, item.Answer, item.Condition, item.Description, item.Analysis, item.SortOrder,
		).Scan(&item.CreatedAt, &item.UpdatedAt); err != nil {
			return fmt.Errorf("upsert evaluation item: %w", err)
		}
	}

	if len(keepItemIDs) > 0 {
		if _, err := q.Exec(ctx, `
			DELETE FROM evaluation_items
			WHERE section_id = $1
			  AND NOT (id = ANY($2::uuid[]))
		`, section.ID, uuidArrayToStrings(keepItemIDs)); err != nil {
			return fmt.Errorf("prune evaluation items: %w", err)
		}
	}
	return nil
}

func scanEvaluationRow(row pgx.Row) (*entity.Evaluation, error) {
	evaluation := &entity.Evaluation{}
	var (
		reportDate           pgtype.Date
		assignmentLetterDate pgtype.Date
		createdBy            uuid.NullUUID
		finalizedAt          pgtype.Timestamptz
		templateName         string
	)
	if err := row.Scan(
		&evaluation.ID,
		&evaluation.OrganizationID,
		&evaluation.Period,
		&evaluation.TemplateID,
		&templateName,
		&evaluation.Status,
		&evaluation.ReportNumber,
		&reportDate,
		&evaluation.AssignmentLetterNumber,
		&assignmentLetterDate,
		&evaluation.MonitoringDateRange,
		&evaluation.UnitCode,
		&evaluation.UnitLocation,
		&evaluation.UnitAddress,
		&evaluation.UnitEselonI,
		&evaluation.UnitLeaderName,
		&evaluation.TeamCoordinator,
		&evaluation.TeamLead,
		&evaluation.TeamMembers,
		&evaluation.Problems,
		&evaluation.Recommendations,
		&createdBy,
		&finalizedAt,
		&evaluation.CreatedAt,
		&evaluation.UpdatedAt,
	); err != nil {
		return nil, fmt.Errorf("scan evaluation: %w", err)
	}

	evaluation.TemplateName = templateName
	evaluation.ReportDate = nullableDatePtr(reportDate)
	evaluation.AssignmentLetterDate = nullableDatePtr(assignmentLetterDate)
	evaluation.CreatedBy = nullableUUIDPtr(createdBy)
	evaluation.FinalizedAt = nullableTimestamptzPtr(finalizedAt)
	return evaluation, nil
}

func evaluationNullableUUIDPtr(value uuid.NullUUID) *uuid.UUID {
	if !value.Valid {
		return nil
	}
	copy := value.UUID
	return &copy
}

func nullableDatePtr(value pgtype.Date) *time.Time {
	if !value.Valid {
		return nil
	}
	copy := value.Time
	return &copy
}

func nullableTimestamptzPtr(value pgtype.Timestamptz) *time.Time {
	if !value.Valid {
		return nil
	}
	copy := value.Time
	return &copy
}

var _ interface {
	GetActiveTemplate(ctx context.Context, templateKey string) (*entity.EvaluationTemplate, error)
	Create(ctx context.Context, evaluation *entity.Evaluation) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Evaluation, error)
	Update(ctx context.Context, evaluation *entity.Evaluation) error
	List(ctx context.Context, filter repository.EvaluationListFilter) ([]*entity.Evaluation, int, error)
	ExistsByOrgPeriodTemplate(ctx context.Context, orgID uuid.UUID, period string, templateID uuid.UUID, excludeID *uuid.UUID) (bool, error)
} = &evaluationRepository{}
