package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type riskEventRepository struct{ pool *pgxpool.Pool }

func NewRiskEventRepository(pool *pgxpool.Pool) repository.RiskEventRepository {
	return &riskEventRepository{pool: pool}
}

func (r *riskEventRepository) Create(ctx context.Context, event *entity.RiskEvent, riskIDs []uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin risk event: %w", err)
	}
	defer tx.Rollback(ctx)

	err = tx.QueryRow(ctx, `
		INSERT INTO incidents (
			title, what, "when", severity, status, reporter_id, organization_id,
			impact_types, other_impact_type, actual_impact, immediate_response, post_response_condition,
			"where", who, why_how, financial_loss, financial_loss_known,
			disruption_duration, extraordinary_reason, ongoing_action, evidence_url,
			created_by, updated_by
		) VALUES (
			LEFT($1, 120), $1, $2, $3, 'recorded', $4, $5,
			$6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $4, NULL
		)
		RETURNING id, created_at, updated_at
	`, event.Description, event.OccurredAt, event.Severity, event.CreatedBy, event.OrganizationID,
		event.ImpactTypes, event.OtherImpactType, event.ActualImpact, event.ImmediateResponse, event.PostResponseCondition,
		event.Location, event.AffectedParties, event.SuspectedCause, event.FinancialLoss, event.FinancialLossKnown,
		event.DisruptionDuration, event.ExtraordinaryReason, event.OngoingAction, event.EvidenceURL,
	).Scan(&event.ID, &event.CreatedAt, &event.UpdatedAt)
	if err != nil {
		return fmt.Errorf("insert risk event: %w", err)
	}

	event.Code = fmt.Sprintf("KJR-%s", event.ID.String()[:8])
	if _, err = tx.Exec(ctx, `UPDATE incidents SET code=$1 WHERE id=$2`, event.Code, event.ID); err != nil {
		return fmt.Errorf("assign risk event code: %w", err)
	}
	for _, riskID := range uniqueUUIDs(riskIDs) {
		if _, err = tx.Exec(ctx, `INSERT INTO incident_risk_links (incident_id, risk_id, created_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, event.ID, riskID, event.CreatedBy); err != nil {
			return fmt.Errorf("link risk event: %w", err)
		}
	}
	if len(riskIDs) > 0 {
		_, err = tx.Exec(ctx, `UPDATE incidents SET linked_risk_id=$1 WHERE id=$2`, riskIDs[0], event.ID)
		if err != nil {
			return fmt.Errorf("set primary risk: %w", err)
		}
	}
	if err = tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit risk event: %w", err)
	}
	return nil
}

const riskEventSelect = `
	SELECT i.id, COALESCE(i.code,''), i.what, i."when", i.impact_types, i.other_impact_type, i.actual_impact,
		i.severity, i.immediate_response, i.post_response_condition, i."where", i.who,
		i.why_how, i.financial_loss, i.financial_loss_known, i.disruption_duration,
		i.extraordinary_reason, i.ongoing_action, i.evidence_url, i.organization_id,
		COALESCE(o.name,''), i.created_by, COALESCE(u.name,''), i.updated_by,
		i.created_at, i.updated_at
	FROM incidents i
	LEFT JOIN organizations o ON o.id=i.organization_id
	LEFT JOIN users u ON u.id=i.created_by`

func scanRiskEvent(row pgx.Row) (*entity.RiskEvent, error) {
	var event entity.RiskEvent
	err := row.Scan(&event.ID, &event.Code, &event.Description, &event.OccurredAt, &event.ImpactTypes, &event.OtherImpactType,
		&event.ActualImpact, &event.Severity, &event.ImmediateResponse, &event.PostResponseCondition,
		&event.Location, &event.AffectedParties, &event.SuspectedCause, &event.FinancialLoss,
		&event.FinancialLossKnown, &event.DisruptionDuration, &event.ExtraordinaryReason,
		&event.OngoingAction, &event.EvidenceURL, &event.OrganizationID, &event.OrganizationName,
		&event.CreatedBy, &event.CreatedByName, &event.UpdatedBy, &event.CreatedAt, &event.UpdatedAt)
	return &event, err
}

func (r *riskEventRepository) GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.RiskEvent, error) {
	query := riskEventSelect + ` WHERE i.id=$1 AND i.status='recorded'`
	args := []any{id}
	if len(orgIDs) > 0 {
		query += ` AND i.organization_id=ANY($2)`
		args = append(args, orgIDs)
	}
	event, err := scanRiskEvent(r.pool.QueryRow(ctx, query, args...))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainerrors.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get risk event: %w", err)
	}
	links, err := r.loadLinks(ctx, []uuid.UUID{id})
	if err != nil {
		return nil, err
	}
	event.LinkedRisks = links[id]
	return event, nil
}

func (r *riskEventRepository) List(ctx context.Context, orgIDs []uuid.UUID, riskID *uuid.UUID) ([]*entity.RiskEvent, error) {
	query := riskEventSelect + ` WHERE i.status='recorded'`
	args := []any{}
	if len(orgIDs) > 0 {
		args = append(args, orgIDs)
		query += fmt.Sprintf(` AND i.organization_id=ANY($%d)`, len(args))
	}
	if riskID != nil {
		args = append(args, *riskID)
		query += fmt.Sprintf(` AND EXISTS (SELECT 1 FROM incident_risk_links l WHERE l.incident_id=i.id AND l.risk_id=$%d)`, len(args))
	}
	query += ` ORDER BY i."when" DESC, i.created_at DESC`
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list risk events: %w", err)
	}
	defer rows.Close()
	items := make([]*entity.RiskEvent, 0)
	ids := make([]uuid.UUID, 0)
	for rows.Next() {
		event, scanErr := scanRiskEvent(rows)
		if scanErr != nil {
			return nil, fmt.Errorf("scan risk event: %w", scanErr)
		}
		items = append(items, event)
		ids = append(ids, event.ID)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	links, err := r.loadLinks(ctx, ids)
	if err != nil {
		return nil, err
	}
	for _, item := range items {
		item.LinkedRisks = links[item.ID]
	}
	return items, nil
}

func (r *riskEventRepository) AddRiskLinks(ctx context.Context, eventID uuid.UUID, riskIDs []uuid.UUID, actorID uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	for _, riskID := range uniqueUUIDs(riskIDs) {
		if _, err = tx.Exec(ctx, `INSERT INTO incident_risk_links (incident_id,risk_id,created_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, eventID, riskID, actorID); err != nil {
			return err
		}
	}
	if len(riskIDs) > 0 {
		_, err = tx.Exec(ctx, `UPDATE incidents SET linked_risk_id=COALESCE(linked_risk_id,$1), updated_by=$2, updated_at=now() WHERE id=$3`, riskIDs[0], actorID, eventID)
		if err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (r *riskEventRepository) loadLinks(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID][]entity.IncidentRiskLink, error) {
	result := make(map[uuid.UUID][]entity.IncidentRiskLink, len(ids))
	if len(ids) == 0 {
		return result, nil
	}
	rows, err := r.pool.Query(ctx, `SELECT l.incident_id,r.id,COALESCE(r.code,''),COALESCE(r.title,'') FROM incident_risk_links l JOIN risks r ON r.id=l.risk_id WHERE l.incident_id=ANY($1) ORDER BY l.created_at`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var eventID uuid.UUID
		var link entity.IncidentRiskLink
		if err = rows.Scan(&eventID, &link.ID, &link.Code, &link.Title); err != nil {
			return nil, err
		}
		result[eventID] = append(result[eventID], link)
	}
	return result, rows.Err()
}

func uniqueUUIDs(values []uuid.UUID) []uuid.UUID {
	seen := map[uuid.UUID]struct{}{}
	result := make([]uuid.UUID, 0, len(values))
	for _, value := range values {
		if value == uuid.Nil {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}
