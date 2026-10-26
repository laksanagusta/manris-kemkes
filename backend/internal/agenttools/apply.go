package agenttools

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/agent"
	"github.com/manris/backend/internal/repository/postgres"
	mtuc "github.com/manris/backend/internal/usecase/mitigation_task"
	riskuc "github.com/manris/backend/internal/usecase/risk"
	eventuc "github.com/manris/backend/internal/usecase/risk_event"
)

// Apply does not begin or commit the outer transaction. Domain repositories
// receive this exact tx; their local Begin/Commit pairs use savepoints only.
func (t *Toolkit) Apply(ctx context.Context, tx pgx.Tx, actor uuid.UUID, operations []agent.Operation) ([]agent.ReceiptItem, error) {
	if tx == nil {
		return nil, agent.ErrInvalid
	}
	scope, err := t.resolveScope(ctx, tx, actor, true)
	if err != nil {
		return nil, err
	}
	if len(operations) == 0 || len(operations) > maxOperations {
		return nil, agent.ErrInvalid
	}
	selected := make([]agent.Operation, 0, len(operations))
	for _, op := range operations {
		if op.Included {
			selected = append(selected, op)
		}
	}
	if len(selected) == 0 {
		return nil, invalid("pilih setidaknya satu perubahan")
	}
	// Task targets and event links also lock their risk. Lock that complete
	// footprint by entity type and ID before validating or executing user order.
	if err = lockOperationTargets(ctx, tx, selected); err != nil {
		return nil, safeDomainError(err)
	}
	validated, err := t.validateOperations(ctx, tx, actor, scope, selected, true)
	if err != nil {
		return nil, err
	}
	byID := map[string]agent.Operation{}
	for _, op := range validated {
		byID[op.ID] = op
	}
	for _, op := range selected {
		if op.ID == "" {
			return nil, invalid("ID usulan wajib tersedia")
		}
	}
	for _, op := range selected {
		if op.Kind == "create_risk" {
			if _, err = tx.Exec(ctx, `SELECT pg_advisory_xact_lock($1::bigint)`, int64(0x4d414e524953)); err != nil {
				return nil, safeDomainError(err)
			}
			break
		}
	}
	risks := postgres.NewRiskRepositoryWithTx(tx)
	tasks := postgres.NewMitigationTaskRepositoryWithTx(tx)
	users := postgres.NewUserRepositoryWithTx(tx)
	orgs := postgres.NewOrganizationRepositoryWithTx(tx)
	receipts := make([]agent.ReceiptItem, 0, len(selected))
	for _, original := range selected {
		op := byID[original.ID]
		orgID, _ := uuid.Parse(op.OrganizationID)
		var entityID uuid.UUID
		entityType := "risk"
		href := ""
		switch op.Kind {
		case "create_risk":
			input, e := createRiskPayload(op.After, orgID, actor)
			if e != nil {
				return nil, e
			}
			out, e := riskuc.NewCreateRiskUseCase(risks, users, orgs).Execute(ctx, input)
			if e != nil {
				return nil, safeDomainError(e)
			}
			entityID = out.ID
			href = "/risk/register/" + entityID.String()
		case "patch_risk", "add_mitigation", "patch_mitigation":
			id, _ := uuid.Parse(op.TargetID)
			current, e := risks.GetByID(ctx, id, []uuid.UUID{orgID})
			if e != nil {
				return nil, safeDomainError(e)
			}
			if e = editableDraft(current); e != nil {
				return nil, e
			}
			input, e := draftUpdatePayload(current, op)
			if e != nil {
				return nil, e
			}
			if _, e = riskuc.NewUpdateRiskUseCase(risks, users, orgs, postgres.NewWorkingPaperRepositoryWithTx(tx), nil).Execute(ctx, input, []uuid.UUID{orgID}); e != nil {
				return nil, safeDomainError(e)
			}
			entityID = id
			href = "/risk/register/" + entityID.String()
		case "report_mitigation_task":
			input, e := mitigationReportInput(op.After)
			if e != nil {
				return nil, e
			}
			input.TaskID, _ = uuid.Parse(op.TargetID)
			input.ReportedBy = actor
			input.OrgIDs = []uuid.UUID{orgID}
			out, e := mtuc.NewSubmitMonitoringReportUseCase(tasks, risks).Execute(ctx, input)
			if e != nil {
				return nil, safeDomainError(e)
			}
			entityID = out.ID
			entityType = "mitigation_task"
			href = taskHref(out)
		case "create_risk_event":
			input, e := eventPayload(op.After, orgID, actor)
			if e != nil {
				return nil, e
			}
			out, e := eventuc.NewService(postgres.NewRiskEventRepositoryWithTx(tx), risks).Create(ctx, input)
			if e != nil {
				return nil, safeDomainError(e)
			}
			entityID = out.ID
			entityType = "incident"
			href = "/risk-events/" + out.ID.String()
		case "link_risk_event":
			id, _ := uuid.Parse(op.TargetID)
			riskIDs, e := eventLinkRiskIDs(op.After)
			if e != nil {
				return nil, e
			}
			out, e := eventuc.NewService(postgres.NewRiskEventRepositoryWithTx(tx), risks).LinkRisks(ctx, id, riskIDs, actor, []uuid.UUID{orgID})
			if e != nil {
				return nil, safeDomainError(e)
			}
			entityID, entityType, href = out.ID, "incident", "/risk-events/"+out.ID.String()
		case "patch_monitoring":
			id, _ := uuid.Parse(op.TargetID)
			monitorings := postgres.NewRiskMonitoringRepositoryWithTx(tx)
			current, e := monitorings.GetByID(ctx, id, []uuid.UUID{orgID})
			if e != nil {
				return nil, safeDomainError(e)
			}
			input, e := monitoringUpdatePayload(current, op.After)
			if e != nil {
				return nil, e
			}
			input.MonitoringID, input.OrgIDs = id, []uuid.UUID{orgID}
			out, e := riskuc.NewUpdateMonitoringUseCase(risks, monitorings).Execute(ctx, input)
			if e != nil {
				return nil, safeDomainError(e)
			}
			entityID, entityType, href = out.Monitoring.ID, "risk_monitoring", "/risk/monitoring/"+out.Monitoring.ID.String()
		case "reassess_risk":
			id, _ := uuid.Parse(op.TargetID)
			cycle, _ := op.After["cycle"].(string)
			monitorings := postgres.NewRiskMonitoringRepositoryWithTx(tx)
			out, e := riskuc.NewStartMonitoringUseCase(risks, monitorings, nil, nil, postgres.NewRiskMonitoringPeriodRepositoryWithTx(tx)).Execute(ctx, riskuc.StartMonitoringInput{SourceRiskID: id, Cycle: cycle, OrgIDs: []uuid.UUID{orgID}, StartedBy: actor})
			if e != nil {
				return nil, safeDomainError(e)
			}
			if !out.ExistingDraft {
				if _, e = mtuc.NewEnsureTasksForRiskVersionUseCase(tasks, risks).Execute(ctx, id, cycle, []uuid.UUID{orgID}); e != nil {
					return nil, safeDomainError(e)
				}
				if e = monitorings.UpdateTaskMonitoringIDs(ctx, out.Monitoring.ID, id, cycle); e != nil {
					return nil, safeDomainError(e)
				}
			}
			entityID = out.Monitoring.ID
			entityType = "risk_monitoring"
			href = out.RedirectURL
		default:
			return nil, agent.ErrInvalid
		}
		metadata, e := json.Marshal(map[string]any{"operationId": op.ID, "kind": op.Kind, "before": op.Before, "after": op.After})
		if e != nil {
			return nil, agent.ErrInvalid
		}
		if _, e = tx.Exec(ctx, `INSERT INTO audit_logs(actor_user_id,entity_type,entity_id,action,source,metadata) VALUES($1,$2,$3,$4,'agent',$5::jsonb)`, actor, entityType, entityID, op.Kind, metadata); e != nil {
			return nil, safeDomainError(e)
		}
		receipts = append(receipts, agent.ReceiptItem{OperationID: op.ID, Title: op.Title, Href: href})
	}
	return receipts, nil
}

func lockOperationTargets(ctx context.Context, tx pgx.Tx, operations []agent.Operation) error {
	riskIDs, taskIDs, eventIDs := []uuid.UUID{}, []uuid.UUID{}, []uuid.UUID{}
	for _, op := range operations {
		if err := validateOperationShape(op); err != nil {
			return err
		}
		if op.TargetID != "" {
			id, _ := uuid.Parse(op.TargetID)
			switch op.Kind {
			case "report_mitigation_task":
				taskIDs = append(taskIDs, id)
				var riskID uuid.UUID
				if err := tx.QueryRow(ctx, `SELECT risk_id FROM mitigation_tasks WHERE id=$1`, id).Scan(&riskID); err != nil {
					return err
				}
				riskIDs = append(riskIDs, riskID)
			case "patch_monitoring":
				var sourceID uuid.UUID
				if err := tx.QueryRow(ctx, `SELECT source_risk_id FROM risk_monitorings WHERE id=$1`, id).Scan(&sourceID); err != nil {
					return err
				}
				riskIDs = append(riskIDs, sourceID)
			case "link_risk_event":
				eventIDs = append(eventIDs, id)
			default:
				riskIDs = append(riskIDs, id)
			}
		}
		if op.Kind == "create_risk_event" || op.Kind == "link_risk_event" {
			raw, err := json.Marshal(op.After["riskIds"])
			if err != nil {
				return agent.ErrInvalid
			}
			var linked []uuid.UUID
			if err = json.Unmarshal(raw, &linked); err != nil {
				return agent.ErrInvalid
			}
			riskIDs = append(riskIDs, linked...)
		}
	}
	for _, target := range []struct {
		query string
		ids   []uuid.UUID
	}{
		{`SELECT id FROM incidents WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE`, eventIDs},
		// Canonical monitoring finalization locks monitoring before its risk and
		// tasks. Use that same entity order to avoid a cross-entry-point cycle.
		{`SELECT id FROM risk_monitorings WHERE version_group_id IN (SELECT version_group_id FROM risks WHERE id=ANY($1::uuid[])) ORDER BY id FOR UPDATE`, riskIDs},
		{`SELECT id FROM risks WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE`, riskIDs},
		{`SELECT id FROM mitigation_tasks WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE`, taskIDs},
		{`SELECT wp.id FROM working_papers wp WHERE EXISTS (SELECT 1 FROM working_paper_risks wpr WHERE wpr.working_paper_id=wp.id AND (wpr.risk_id=ANY($1::uuid[]) OR wpr.monitoring_id IN (SELECT id FROM risk_monitorings WHERE source_risk_id=ANY($1::uuid[])))) ORDER BY wp.id FOR SHARE OF wp`, riskIDs},
	} {
		if len(target.ids) == 0 {
			continue
		}
		rows, err := tx.Query(ctx, target.query, target.ids)
		if err != nil {
			return err
		}
		for rows.Next() {
			var id uuid.UUID
			if err = rows.Scan(&id); err != nil {
				rows.Close()
				return err
			}
		}
		err = rows.Err()
		rows.Close()
		if err != nil {
			return err
		}
	}
	return nil
}
