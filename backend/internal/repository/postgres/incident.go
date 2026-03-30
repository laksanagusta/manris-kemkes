package postgres

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// incidentRepository is the PostgreSQL implementation of repository.IncidentRepository
type incidentRepository struct {
	pool *pgxpool.Pool
}

// NewIncidentRepository creates a new incident repository
func NewIncidentRepository(pool *pgxpool.Pool) repository.IncidentRepository {
	return &incidentRepository{pool: pool}
}

// Create inserts a new incident
func (r *incidentRepository) Create(ctx context.Context, incident *entity.Incident) error {
	query := `
		INSERT INTO incidents (
			title, what, who, "when", "where", why_how, severity, status,
			corrective_action, preventive_action, linked_risk_id, reporter_id, organization_id, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, $10, $11, $12, $13, NOW(), NOW()
		) RETURNING id, created_at, updated_at,
		(SELECT code FROM risks WHERE id = $11) as linked_risk_code,
		(SELECT name FROM users WHERE id = $12) as reporter_name
	`
	err := r.pool.QueryRow(ctx, query,
		incident.Title, incident.What, incident.Who, incident.When, incident.Where, incident.WhyHow, incident.Severity, incident.Status,
		incident.CorrectiveAction, incident.PreventiveAction, incident.LinkedRiskID, incident.ReporterID, incident.OrganizationID,
	).Scan(&incident.ID, &incident.CreatedAt, &incident.UpdatedAt, &incident.LinkedRiskCode, &incident.ReporterName)
	if err != nil {
		return fmt.Errorf("create incident: %w", err)
	}

	// generate code based on ID
	code := fmt.Sprintf("INC-%s", strings.ToUpper(strings.Split(incident.ID.String(), "-")[0]))
	_, err = r.pool.Exec(ctx, "UPDATE incidents SET code = $1 WHERE id = $2", code, incident.ID)
	if err == nil {
		incident.Code = &code
	}

	return nil
}

// GetByID retrieves an incident by ID
func (r *incidentRepository) GetByID(ctx context.Context, id string) (*entity.Incident, error) {
	query := `
		SELECT i.id, i.code, i.title, i.what, i.who, i."when", i."where", i.why_how,
		       i.severity, i.status, i.corrective_action, i.preventive_action,
		       i.linked_risk_id, r.code as linked_risk_code,
		       i.reporter_id, u.name as reporter_name, i.organization_id, i.created_at, i.updated_at
		FROM incidents i
		LEFT JOIN risks r ON i.linked_risk_id = r.id
		LEFT JOIN users u ON i.reporter_id = u.id
		WHERE i.id = $1
	`
	var incident entity.Incident
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&incident.ID, &incident.Code, &incident.Title, &incident.What, &incident.Who, &incident.When, &incident.Where, &incident.WhyHow,
		&incident.Severity, &incident.Status, &incident.CorrectiveAction, &incident.PreventiveAction,
		&incident.LinkedRiskID, &incident.LinkedRiskCode, &incident.ReporterID, &incident.ReporterName, &incident.OrganizationID, &incident.CreatedAt, &incident.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get incident: %w", err)
	}
	return &incident, nil
}

// Update updates an incident
func (r *incidentRepository) Update(ctx context.Context, incident *entity.Incident) error {
	query := `
		UPDATE incidents SET
			title = $1, what = $2, who = $3, "when" = $4, "where" = $5, why_how = $6,
			severity = $7, status = $8, corrective_action = $9, preventive_action = $10,
			linked_risk_id = $11, organization_id = $12, updated_at = NOW()
		WHERE id = $13
		RETURNING updated_at,
		(SELECT code FROM risks WHERE id = $11) as linked_risk_code
	`
	err := r.pool.QueryRow(ctx, query,
		incident.Title, incident.What, incident.Who, incident.When, incident.Where, incident.WhyHow,
		incident.Severity, incident.Status, incident.CorrectiveAction, incident.PreventiveAction,
		incident.LinkedRiskID, incident.OrganizationID, incident.ID,
	).Scan(&incident.UpdatedAt, &incident.LinkedRiskCode)
	if err != nil {
		return fmt.Errorf("update incident: %w", err)
	}
	return nil
}

// Delete deletes an incident
func (r *incidentRepository) Delete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, "DELETE FROM incidents WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("delete incident: %w", err)
	}
	return nil
}

// List retrieves incidents with optional filters
func (r *incidentRepository) List(ctx context.Context, filters map[string]string) ([]*entity.Incident, error) {
	query := `
		SELECT i.id, i.code, i.title, i.what, i.who, i."when", i."where", i.why_how,
		       i.severity, i.status, i.corrective_action, i.preventive_action,
		       i.linked_risk_id, r.code as linked_risk_code,
		       i.reporter_id, u.name as reporter_name, i.organization_id, i.created_at, i.updated_at
		FROM incidents i
		LEFT JOIN risks r ON i.linked_risk_id = r.id
		LEFT JOIN users u ON i.reporter_id = u.id
		WHERE ($1 = '' OR i.organization_id = $1::uuid)
		  AND ($2 = '' OR i.severity = $2)
		  AND ($3 = '' OR i.status = $3)
		ORDER BY i."when" DESC NULLS LAST, i.created_at DESC
	`

	orgID := filters["orgId"]
	severity := filters["severity"]
	status := filters["status"]

	if severity == "all" {
		severity = ""
	}
	if status == "all" {
		status = ""
	}

	rows, err := r.pool.Query(ctx, query, orgID, severity, status)
	if err != nil {
		return nil, fmt.Errorf("list incidents: %w", err)
	}
	defer rows.Close()

	var incidents []*entity.Incident
	for rows.Next() {
		var i entity.Incident
		err := rows.Scan(
			&i.ID, &i.Code, &i.Title, &i.What, &i.Who, &i.When, &i.Where, &i.WhyHow,
			&i.Severity, &i.Status, &i.CorrectiveAction, &i.PreventiveAction,
			&i.LinkedRiskID, &i.LinkedRiskCode, &i.ReporterID, &i.ReporterName, &i.OrganizationID, &i.CreatedAt, &i.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan incident row: %w", err)
		}
		incidents = append(incidents, &i)
	}
	return incidents, nil
}

// GetSummary returns incident summary statistics
func (r *incidentRepository) GetSummary(ctx context.Context, orgID string) (map[string]interface{}, error) {
	query := `
		SELECT
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE status = 'open') as open_count,
			COUNT(*) FILTER (WHERE status = 'investigating') as investigating_count,
			COUNT(*) FILTER (WHERE status = 'resolved' OR status = 'closed') as resolved_count
		FROM incidents
		WHERE ($1 = '' OR organization_id = $1::uuid)
	`
	var total, open, investigating, resolved int
	err := r.pool.QueryRow(ctx, query, orgID).Scan(&total, &open, &investigating, &resolved)
	if err != nil {
		return nil, fmt.Errorf("incident summary: %w", err)
	}

	return map[string]interface{}{
		"total":         total,
		"open":          open,
		"investigating": investigating,
		"resolved":      resolved,
	}, nil
}
