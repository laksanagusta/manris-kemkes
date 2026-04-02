package postgres

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// incidentRepository is the PostgreSQL implementation of repository.IncidentRepository.
type incidentRepository struct {
	pool *pgxpool.Pool
}

// NewIncidentRepository creates a new incident repository.
func NewIncidentRepository(pool *pgxpool.Pool) repository.IncidentRepository {
	return &incidentRepository{pool: pool}
}

// Create inserts a new incident and its linked risks.
func (r *incidentRepository) Create(ctx context.Context, incident *entity.Incident) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin create incident tx: %w", err)
	}
	defer func() {
		if tx != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	riskIDs := extractIncidentRiskIDs(incident)
	primaryRiskID := firstUUID(riskIDs)

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

	err = tx.QueryRow(ctx, query,
		incident.Title, incident.What, incident.Who, incident.When, incident.Where, incident.WhyHow, incident.Severity, incident.Status,
		incident.CorrectiveAction, incident.PreventiveAction, primaryRiskID, incident.ReporterID, incident.OrganizationID,
	).Scan(&incident.ID, &incident.CreatedAt, &incident.UpdatedAt, &incident.LinkedRiskCode, &incident.ReporterName)
	if err != nil {
		return fmt.Errorf("create incident: %w", err)
	}

	if err := syncIncidentRiskLinks(ctx, tx, incident.ID, riskIDs); err != nil {
		return err
	}

	code := fmt.Sprintf("INC-%s", strings.ToUpper(strings.Split(incident.ID.String(), "-")[0]))
	if _, err := tx.Exec(ctx, "UPDATE incidents SET code = $1 WHERE id = $2", code, incident.ID); err != nil {
		return fmt.Errorf("assign incident code: %w", err)
	}
	incident.Code = &code
	incident.LinkedRiskID = primaryRiskID

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit create incident tx: %w", err)
	}
	tx = nil

	incident.LinkedRisks, err = r.loadLinkedRisks(ctx, []uuid.UUID{incident.ID})
	if err != nil {
		return fmt.Errorf("load created incident risks: %w", err)
	}
	setIncidentLegacyRiskFields(incident)

	return nil
}

// GetByID retrieves an incident by ID.
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
	if err := r.pool.QueryRow(ctx, query, id).Scan(
		&incident.ID, &incident.Code, &incident.Title, &incident.What, &incident.Who, &incident.When, &incident.Where, &incident.WhyHow,
		&incident.Severity, &incident.Status, &incident.CorrectiveAction, &incident.PreventiveAction,
		&incident.LinkedRiskID, &incident.LinkedRiskCode, &incident.ReporterID, &incident.ReporterName, &incident.OrganizationID, &incident.CreatedAt, &incident.UpdatedAt,
	); err != nil {
		return nil, fmt.Errorf("get incident: %w", err)
	}

	linkedRisks, err := r.loadLinkedRisks(ctx, []uuid.UUID{incident.ID})
	if err != nil {
		return nil, fmt.Errorf("load incident risks: %w", err)
	}
	incident.LinkedRisks = linkedRisks
	setIncidentLegacyRiskFields(&incident)

	return &incident, nil
}

// Update updates an incident and replaces its linked risks.
func (r *incidentRepository) Update(ctx context.Context, incident *entity.Incident) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin update incident tx: %w", err)
	}
	defer func() {
		if tx != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	riskIDs := extractIncidentRiskIDs(incident)
	primaryRiskID := firstUUID(riskIDs)

	query := `
		UPDATE incidents SET
			title = $1, what = $2, who = $3, "when" = $4, "where" = $5, why_how = $6,
			severity = $7, status = $8, corrective_action = $9, preventive_action = $10,
			linked_risk_id = $11, organization_id = $12, updated_at = NOW()
		WHERE id = $13
		RETURNING updated_at,
		(SELECT code FROM risks WHERE id = $11) as linked_risk_code
	`
	if err := tx.QueryRow(ctx, query,
		incident.Title, incident.What, incident.Who, incident.When, incident.Where, incident.WhyHow,
		incident.Severity, incident.Status, incident.CorrectiveAction, incident.PreventiveAction,
		primaryRiskID, incident.OrganizationID, incident.ID,
	).Scan(&incident.UpdatedAt, &incident.LinkedRiskCode); err != nil {
		return fmt.Errorf("update incident: %w", err)
	}

	if err := syncIncidentRiskLinks(ctx, tx, incident.ID, riskIDs); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit update incident tx: %w", err)
	}
	tx = nil

	incident.LinkedRiskID = primaryRiskID
	incident.LinkedRisks, err = r.loadLinkedRisks(ctx, []uuid.UUID{incident.ID})
	if err != nil {
		return fmt.Errorf("load updated incident risks: %w", err)
	}
	setIncidentLegacyRiskFields(incident)

	return nil
}

// Delete deletes an incident.
func (r *incidentRepository) Delete(ctx context.Context, id string) error {
	if _, err := r.pool.Exec(ctx, "DELETE FROM incidents WHERE id = $1", id); err != nil {
		return fmt.Errorf("delete incident: %w", err)
	}
	return nil
}

// List retrieves incidents with optional filters.
func (r *incidentRepository) List(ctx context.Context, orgIDs []uuid.UUID) ([]*entity.Incident, error) {
	query := `
		SELECT i.id, i.code, i.title, i.what, i.who, i."when", i."where", i.why_how,
		       i.severity, i.status, i.corrective_action, i.preventive_action,
		       i.linked_risk_id, r.code as linked_risk_code,
		       i.reporter_id, u.name as reporter_name, i.organization_id, i.created_at, i.updated_at
		FROM incidents i
		LEFT JOIN risks r ON i.linked_risk_id = r.id
		LEFT JOIN users u ON i.reporter_id = u.id
		WHERE 1=1`

	var args []interface{}
	argIdx := 1

	if len(orgIDs) > 0 {
		query += fmt.Sprintf(" AND i.organization_id = ANY($%d)", argIdx)
		args = append(args, orgIDs)
		argIdx++
	}

	query += ` ORDER BY i."when" DESC NULLS LAST, i.created_at DESC`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list incidents: %w", err)
	}
	defer rows.Close()

	var incidents []*entity.Incident
	var incidentIDs []uuid.UUID
	for rows.Next() {
		var incident entity.Incident
		if err := rows.Scan(
			&incident.ID, &incident.Code, &incident.Title, &incident.What, &incident.Who, &incident.When, &incident.Where, &incident.WhyHow,
			&incident.Severity, &incident.Status, &incident.CorrectiveAction, &incident.PreventiveAction,
			&incident.LinkedRiskID, &incident.LinkedRiskCode, &incident.ReporterID, &incident.ReporterName, &incident.OrganizationID, &incident.CreatedAt, &incident.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan incident row: %w", err)
		}
		incidentIDs = append(incidentIDs, incident.ID)
		incidents = append(incidents, &incident)
	}

	if len(incidentIDs) == 0 {
		return incidents, nil
	}

	linkedRiskMap, err := r.loadLinkedRisksByIncident(ctx, incidentIDs)
	if err != nil {
		return nil, fmt.Errorf("load incident list risks: %w", err)
	}

	for _, incident := range incidents {
		incident.LinkedRisks = linkedRiskMap[incident.ID]
		setIncidentLegacyRiskFields(incident)
	}

	return incidents, nil
}

// GetSummary returns incident summary statistics.
func (r *incidentRepository) GetSummary(ctx context.Context, orgID string) (map[string]interface{}, error) {
	query := `
		SELECT
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
			COUNT(*) FILTER (WHERE status = 'final') as final_count,
			COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
			COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
			COUNT(*) FILTER (WHERE status = 'open') as open_count,
			COUNT(*) FILTER (WHERE status = 'investigating') as investigating_count,
			COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
			COUNT(*) FILTER (WHERE status = 'closed') as closed_count
		FROM incidents
		WHERE ($1 = '' OR organization_id = $1::uuid)
	`

	var total, draft, final, approved, rejected, open, investigating, resolved, closed int
	if err := r.pool.QueryRow(ctx, query, orgID).Scan(
		&total, &draft, &final, &approved, &rejected, &open, &investigating, &resolved, &closed,
	); err != nil {
		return nil, fmt.Errorf("incident summary: %w", err)
	}

	return map[string]interface{}{
		"total":         total,
		"draft":         draft,
		"final":         final,
		"approved":      approved,
		"rejected":      rejected,
		"open":          open,
		"investigating": investigating,
		"resolved":      resolved,
		"closed":        closed,
	}, nil
}

func (r *incidentRepository) loadLinkedRisks(ctx context.Context, incidentIDs []uuid.UUID) ([]entity.IncidentRiskLink, error) {
	riskMap, err := r.loadLinkedRisksByIncident(ctx, incidentIDs)
	if err != nil {
		return nil, err
	}
	if len(incidentIDs) == 0 {
		return []entity.IncidentRiskLink{}, nil
	}
	return riskMap[incidentIDs[0]], nil
}

func (r *incidentRepository) loadLinkedRisksByIncident(ctx context.Context, incidentIDs []uuid.UUID) (map[uuid.UUID][]entity.IncidentRiskLink, error) {
	result := make(map[uuid.UUID][]entity.IncidentRiskLink, len(incidentIDs))
	if len(incidentIDs) == 0 {
		return result, nil
	}

	rows, err := r.pool.Query(ctx, `
		SELECT l.incident_id, r.id, COALESCE(r.code, ''), COALESCE(r.title, '')
		FROM incident_risk_links l
		JOIN risks r ON r.id = l.risk_id
		WHERE l.incident_id = ANY($1)
		ORDER BY l.created_at ASC, r.code ASC, r.title ASC
	`, incidentIDs)
	if err != nil {
		return nil, fmt.Errorf("query incident risk links: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var incidentID uuid.UUID
		var link entity.IncidentRiskLink
		if err := rows.Scan(&incidentID, &link.ID, &link.Code, &link.Title); err != nil {
			return nil, fmt.Errorf("scan incident risk link: %w", err)
		}
		result[incidentID] = append(result[incidentID], link)
	}

	return result, nil
}

func syncIncidentRiskLinks(ctx context.Context, tx pgx.Tx, incidentID uuid.UUID, riskIDs []uuid.UUID) error {
	if _, err := tx.Exec(ctx, "DELETE FROM incident_risk_links WHERE incident_id = $1", incidentID); err != nil {
		return fmt.Errorf("clear incident risk links: %w", err)
	}

	for _, riskID := range riskIDs {
		if _, err := tx.Exec(ctx, `
			INSERT INTO incident_risk_links (incident_id, risk_id, created_at)
			VALUES ($1, $2, NOW())
		`, incidentID, riskID); err != nil {
			return fmt.Errorf("insert incident risk link: %w", err)
		}
	}

	return nil
}

func extractIncidentRiskIDs(incident *entity.Incident) []uuid.UUID {
	seen := make(map[uuid.UUID]struct{})
	var riskIDs []uuid.UUID

	for _, risk := range incident.LinkedRisks {
		if risk.ID == uuid.Nil {
			continue
		}
		if _, ok := seen[risk.ID]; ok {
			continue
		}
		seen[risk.ID] = struct{}{}
		riskIDs = append(riskIDs, risk.ID)
	}

	if incident.LinkedRiskID != nil && *incident.LinkedRiskID != uuid.Nil {
		if _, ok := seen[*incident.LinkedRiskID]; !ok {
			riskIDs = append(riskIDs, *incident.LinkedRiskID)
		}
	}

	return riskIDs
}

func setIncidentLegacyRiskFields(incident *entity.Incident) {
	if len(incident.LinkedRisks) == 0 {
		return
	}

	incident.LinkedRiskID = &incident.LinkedRisks[0].ID
	code := incident.LinkedRisks[0].Code
	incident.LinkedRiskCode = &code
}

func firstUUID(ids []uuid.UUID) *uuid.UUID {
	if len(ids) == 0 {
		return nil
	}
	return &ids[0]
}

func normalizeAllFilter(value string) string {
	if value == "all" {
		return ""
	}
	return value
}
