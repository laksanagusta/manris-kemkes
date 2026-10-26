package agenttools

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/agent"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/repository/postgres"
	eventuc "github.com/manris/backend/internal/usecase/risk_event"
)

func eventLinkRiskIDs(after map[string]any) ([]uuid.UUID, error) {
	var payload struct {
		RiskIDs []uuid.UUID `json:"riskIds"`
	}
	raw, err := json.Marshal(after)
	if err != nil {
		return nil, agent.ErrInvalid
	}
	if err = strictDecode(raw, &payload); err != nil {
		return nil, err
	}
	if len(payload.RiskIDs) == 0 || len(payload.RiskIDs) > 100 {
		return nil, invalid("pilih satu sampai 100 risiko untuk dihubungkan")
	}
	seen := map[uuid.UUID]bool{}
	for _, id := range payload.RiskIDs {
		if id == uuid.Nil || seen[id] {
			return nil, invalid("ID risiko harus valid dan tidak berulang")
		}
		seen[id] = true
	}
	return payload.RiskIDs, nil
}

func (t *Toolkit) validateEventLinks(ctx context.Context, tx pgx.Tx, scope *entity.AccessScope, actor uuid.UUID, op agent.Operation, orgID uuid.UUID, lock bool) (agent.Operation, error) {
	riskIDs, err := eventLinkRiskIDs(op.After)
	if err != nil {
		return op, err
	}
	id, _ := uuid.Parse(op.TargetID)
	events := postgres.NewRiskEventRepositoryWithTx(tx)
	event, err := events.GetByID(ctx, id, []uuid.UUID{orgID})
	if err != nil {
		return op, err
	}
	if event.OrganizationID != orgID || !scope.CanWrite(event.OrganizationID) {
		return op, agent.ErrForbidden
	}
	if err = checkExpected(op.ExpectedUpdatedAt, event.UpdatedAt); err != nil {
		return op, err
	}
	risks := postgres.NewRiskRepositoryWithTx(tx)
	conditions := []map[string]any{}
	for _, riskID := range riskIDs {
		risk, e := risks.GetByID(ctx, riskID, []uuid.UUID{orgID})
		if e != nil {
			return op, e
		}
		if risk.OrganizationID == nil || *risk.OrganizationID != orgID || !scope.CanWrite(*risk.OrganizationID) {
			return op, agent.ErrForbidden
		}
		conditions = append(conditions, map[string]any{"id": risk.ID.String(), "updatedAt": risk.UpdatedAt.UTC().Format(time.RFC3339Nano)})
	}
	if lock && content(op.Before["riskConditions"]) != content(conditions) {
		return op, agent.ErrStale
	}
	capture := &captureEventRepository{RiskEventRepository: events}
	if _, err = eventuc.NewService(capture, risks).LinkRisks(ctx, id, riskIDs, actor, []uuid.UUID{orgID}); err != nil {
		return op, err
	}
	op.Before = map[string]any{"id": id.String(), "code": event.Code, "description": event.Description, "updatedAt": event.UpdatedAt.UTC().Format(time.RFC3339Nano), "linkedRisks": event.LinkedRisks, "riskConditions": conditions}
	return op, nil
}

func (r *captureEventRepository) AddRiskLinks(context.Context, uuid.UUID, []uuid.UUID, uuid.UUID) error {
	return nil
}
