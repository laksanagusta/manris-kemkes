package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type formRepository struct {
	pool *pgxpool.Pool
}

// NewFormRepository creates a PostgreSQL-backed FormRepository.
func NewFormRepository(pool *pgxpool.Pool) repository.FormRepository {
	return &formRepository{pool: pool}
}

// Create inserts a form with its sections and fields in a single transaction.
func (r *formRepository) Create(ctx context.Context, form *entity.Form) (*entity.Form, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("formRepository.Create: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	err = tx.QueryRow(ctx,
		`INSERT INTO forms (title, description, status, target_audience, created_by)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, created_at, updated_at`,
		form.Title, form.Description, form.Status, form.TargetAudience, form.CreatedBy,
	).Scan(&form.ID, &form.CreatedAt, &form.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("formRepository.Create: insert form: %w", err)
	}

	for i := range form.Sections {
		section := &form.Sections[i]
		section.FormID = form.ID

		err = tx.QueryRow(ctx,
			`INSERT INTO form_sections (form_id, title, description, position)
			 VALUES ($1, $2, $3, $4)
			 RETURNING id, created_at`,
			section.FormID, section.Title, section.Description, section.Position,
		).Scan(&section.ID, &section.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("formRepository.Create: insert section: %w", err)
		}

		for j := range section.Fields {
			field := &section.Fields[j]
			field.SectionID = section.ID
			field.FormID = form.ID

			err = tx.QueryRow(ctx,
				`INSERT INTO form_fields (section_id, form_id, field_type, field_key, label, placeholder, is_required, options, position, condition_source_field_id, condition_value)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
				 RETURNING id, created_at`,
				field.SectionID, field.FormID, field.FieldType, field.FieldKey,
				field.Label, field.Placeholder, field.IsRequired,
				mustJSON(field.Options), field.Position,
				field.ConditionSourceFieldID, field.ConditionValue,
			).Scan(&field.ID, &field.CreatedAt)
			if err != nil {
				return nil, fmt.Errorf("formRepository.Create: insert field: %w", err)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("formRepository.Create: commit: %w", err)
	}
	return form, nil
}

// GetByID retrieves a form with all its sections and fields.
func (r *formRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.Form, error) {
	form := &entity.Form{}
	err := r.pool.QueryRow(ctx,
		`SELECT f.id, f.title, f.description, f.status, f.target_audience, f.created_by,
		        f.created_at, f.updated_at, u.organization_id
		 FROM forms f
		 LEFT JOIN users u ON f.created_by = u.id
		 WHERE f.id = $1`, id,
	).Scan(&form.ID, &form.Title, &form.Description, &form.Status,
		&form.TargetAudience, &form.CreatedBy, &form.CreatedAt, &form.UpdatedAt,
		&form.OrganizationID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrFormNotFound
		}
		return nil, fmt.Errorf("formRepository.GetByID: select form: %w", err)
	}

	sectionRows, err := r.pool.Query(ctx,
		`SELECT id, form_id, title, description, position, created_at
		 FROM form_sections WHERE form_id = $1 ORDER BY position`, id)
	if err != nil {
		return nil, fmt.Errorf("formRepository.GetByID: select sections: %w", err)
	}
	defer sectionRows.Close()

	sectionIndex := map[uuid.UUID]int{}
	for sectionRows.Next() {
		var s entity.FormSection
		if err := sectionRows.Scan(&s.ID, &s.FormID, &s.Title, &s.Description, &s.Position, &s.CreatedAt); err != nil {
			return nil, fmt.Errorf("formRepository.GetByID: scan section: %w", err)
		}
		sectionIndex[s.ID] = len(form.Sections)
		form.Sections = append(form.Sections, s)
	}
	if err := sectionRows.Err(); err != nil {
		return nil, fmt.Errorf("formRepository.GetByID: iterate sections: %w", err)
	}

	fieldRows, err := r.pool.Query(ctx,
		`SELECT id, section_id, form_id, field_type, field_key, label, placeholder, is_required,
		        COALESCE(options, '[]'::jsonb), position, condition_source_field_id, condition_value, created_at
		 FROM form_fields WHERE form_id = $1 ORDER BY section_id, position`, id)
	if err != nil {
		return nil, fmt.Errorf("formRepository.GetByID: select fields: %w", err)
	}
	defer fieldRows.Close()

	for fieldRows.Next() {
		var f entity.FormField
		var rawOptions []byte
		if err := fieldRows.Scan(
			&f.ID, &f.SectionID, &f.FormID, &f.FieldType, &f.FieldKey,
			&f.Label, &f.Placeholder, &f.IsRequired,
			&rawOptions, &f.Position,
			&f.ConditionSourceFieldID, &f.ConditionValue, &f.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("formRepository.GetByID: scan field: %w", err)
		}
		if len(rawOptions) > 0 {
			if err := json.Unmarshal(rawOptions, &f.Options); err != nil {
				return nil, fmt.Errorf("formRepository.GetByID: unmarshal options: %w", err)
			}
		}
		idx, ok := sectionIndex[f.SectionID]
		if ok {
			form.Sections[idx].Fields = append(form.Sections[idx].Fields, f)
		}
	}
	if err := fieldRows.Err(); err != nil {
		return nil, fmt.Errorf("formRepository.GetByID: iterate fields: %w", err)
	}

	return form, nil
}

// Update replaces form metadata and re-creates all sections and fields.
func (r *formRepository) Update(ctx context.Context, form *entity.Form) (*entity.Form, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("formRepository.Update: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	err = tx.QueryRow(ctx,
		`UPDATE forms SET title=$1, description=$2, target_audience=$3, updated_at=now()
		 WHERE id=$4
		 RETURNING updated_at`,
		form.Title, form.Description, form.TargetAudience, form.ID,
	).Scan(&form.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrFormNotFound
		}
		return nil, fmt.Errorf("formRepository.Update: update form: %w", err)
	}

	_, err = tx.Exec(ctx, `DELETE FROM form_sections WHERE form_id = $1`, form.ID)
	if err != nil {
		return nil, fmt.Errorf("formRepository.Update: delete sections: %w", err)
	}

	for i := range form.Sections {
		section := &form.Sections[i]
		section.FormID = form.ID

		err = tx.QueryRow(ctx,
			`INSERT INTO form_sections (form_id, title, description, position)
			 VALUES ($1, $2, $3, $4)
			 RETURNING id, created_at`,
			section.FormID, section.Title, section.Description, section.Position,
		).Scan(&section.ID, &section.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("formRepository.Update: insert section: %w", err)
		}

		for j := range section.Fields {
			field := &section.Fields[j]
			field.SectionID = section.ID
			field.FormID = form.ID

			err = tx.QueryRow(ctx,
				`INSERT INTO form_fields (section_id, form_id, field_type, field_key, label, placeholder, is_required, options, position, condition_source_field_id, condition_value)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
				 RETURNING id, created_at`,
				field.SectionID, field.FormID, field.FieldType, field.FieldKey,
				field.Label, field.Placeholder, field.IsRequired,
				mustJSON(field.Options), field.Position,
				field.ConditionSourceFieldID, field.ConditionValue,
			).Scan(&field.ID, &field.CreatedAt)
			if err != nil {
				return nil, fmt.Errorf("formRepository.Update: insert field: %w", err)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("formRepository.Update: commit: %w", err)
	}
	return form, nil
}

// Delete removes a form by ID.
func (r *formRepository) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM forms WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("formRepository.Delete: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrFormNotFound
	}
	return nil
}

// List returns forms matching the given filter without nested sections/fields.
func (r *formRepository) List(ctx context.Context, filter repository.FormListFilter) ([]*entity.Form, error) {
	query := `SELECT f.id, f.title, f.description, f.status, f.target_audience, f.created_by,
	                 f.created_at, f.updated_at, u.organization_id
	          FROM forms f
	          LEFT JOIN users u ON f.created_by = u.id
	          WHERE 1=1`
	var args []interface{}
	argIdx := 1

	if filter.Status != nil {
		query += fmt.Sprintf(" AND f.status = $%d", argIdx)
		args = append(args, *filter.Status)
		argIdx++
	}
	if filter.CreatedBy != nil {
		query += fmt.Sprintf(" AND f.created_by = $%d", argIdx)
		args = append(args, *filter.CreatedBy)
		argIdx++
	}
	if len(filter.OrganizationIDs) > 0 {
		query += fmt.Sprintf(" AND u.organization_id = ANY($%d)", argIdx)
		args = append(args, filter.OrganizationIDs)
		argIdx++
	}
	query += " ORDER BY f.created_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("formRepository.List: %w", err)
	}
	defer rows.Close()

	var forms []*entity.Form
	for rows.Next() {
		f := &entity.Form{}
		if err := rows.Scan(&f.ID, &f.Title, &f.Description, &f.Status, &f.TargetAudience,
			&f.CreatedBy, &f.CreatedAt, &f.UpdatedAt, &f.OrganizationID); err != nil {
			return nil, fmt.Errorf("formRepository.List: scan: %w", err)
		}
		forms = append(forms, f)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("formRepository.List: iterate: %w", err)
	}
	return forms, nil
}

// UpdateStatus changes only the status column of a form.
func (r *formRepository) UpdateStatus(ctx context.Context, id uuid.UUID, newStatus string) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE forms SET status=$1, updated_at=now() WHERE id=$2`,
		newStatus, id)
	if err != nil {
		return fmt.Errorf("formRepository.UpdateStatus: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrFormNotFound
	}
	return nil
}

// HasResponses returns true if at least one response exists for the form.
func (r *formRepository) HasResponses(ctx context.Context, formID uuid.UUID) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM form_responses WHERE form_id = $1)`, formID,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("formRepository.HasResponses: %w", err)
	}
	return exists, nil
}

// GetResponseCount returns the number of responses for a form.
func (r *formRepository) GetResponseCount(ctx context.Context, formID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM form_responses WHERE form_id = $1`, formID,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("formRepository.GetResponseCount: %w", err)
	}
	return count, nil
}

type formAssignmentRepository struct {
	pool *pgxpool.Pool
}

// NewFormAssignmentRepository creates a PostgreSQL-backed FormAssignmentRepository.
func NewFormAssignmentRepository(pool *pgxpool.Pool) repository.FormAssignmentRepository {
	return &formAssignmentRepository{pool: pool}
}

// SetAssignments replaces all organisation assignments for a form.
func (r *formAssignmentRepository) SetAssignments(ctx context.Context, formID uuid.UUID, orgIDs []uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("formAssignmentRepository.SetAssignments: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `DELETE FROM form_assignments WHERE form_id = $1`, formID)
	if err != nil {
		return fmt.Errorf("formAssignmentRepository.SetAssignments: delete: %w", err)
	}

	for _, orgID := range orgIDs {
		_, err = tx.Exec(ctx,
			`INSERT INTO form_assignments (form_id, organization_id) VALUES ($1, $2)`,
			formID, orgID)
		if err != nil {
			return fmt.Errorf("formAssignmentRepository.SetAssignments: insert: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("formAssignmentRepository.SetAssignments: commit: %w", err)
	}
	return nil
}

// GetByFormID returns all assignments for the given form.
func (r *formAssignmentRepository) GetByFormID(ctx context.Context, formID uuid.UUID) ([]*entity.FormAssignment, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, form_id, organization_id, created_at
		 FROM form_assignments WHERE form_id = $1`, formID)
	if err != nil {
		return nil, fmt.Errorf("formAssignmentRepository.GetByFormID: %w", err)
	}
	defer rows.Close()

	var assignments []*entity.FormAssignment
	for rows.Next() {
		a := &entity.FormAssignment{}
		if err := rows.Scan(&a.ID, &a.FormID, &a.OrganizationID, &a.CreatedAt); err != nil {
			return nil, fmt.Errorf("formAssignmentRepository.GetByFormID: scan: %w", err)
		}
		assignments = append(assignments, a)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("formAssignmentRepository.GetByFormID: iterate: %w", err)
	}
	return assignments, nil
}

// GetFormIDsForOrganization returns all form IDs assigned to the given org.
func (r *formAssignmentRepository) GetFormIDsForOrganization(ctx context.Context, orgID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT form_id FROM form_assignments WHERE organization_id = $1`, orgID)
	if err != nil {
		return nil, fmt.Errorf("formAssignmentRepository.GetFormIDsForOrganization: %w", err)
	}
	defer rows.Close()

	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("formAssignmentRepository.GetFormIDsForOrganization: scan: %w", err)
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("formAssignmentRepository.GetFormIDsForOrganization: iterate: %w", err)
	}
	return ids, nil
}
