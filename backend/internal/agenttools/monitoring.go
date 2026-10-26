package agenttools

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/agent"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/repository/postgres"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

func (t *Toolkit) readMonitoring(ctx context.Context, tx pgx.Tx, scope *entity.AccessScope, ids []uuid.UUID, args readArgs) (agent.ToolResult, error) {
	repo := postgres.NewRiskMonitoringRepositoryWithTx(tx)
	var monitoring *entity.RiskMonitoring
	var err error
	if args.ID != "" {
		id, e := uuid.Parse(args.ID)
		if e != nil || id == uuid.Nil || args.RiskID != "" || args.Cycle != "" {
			return agent.ToolResult{}, agent.ErrInvalid
		}
		monitoring, err = riskuc.NewGetMonitoringUseCase(repo).Execute(ctx, id, ids)
	} else {
		id, e := uuid.Parse(args.RiskID)
		if e != nil || id == uuid.Nil || !riskuc.IsValidQuarterFormat(args.Cycle) {
			return agent.ToolResult{}, invalid("gunakan id pemantauan, atau riskId dan cycle")
		}
		source, e := postgres.NewRiskRepositoryWithTx(tx).GetByID(ctx, id, ids)
		if e != nil {
			return agent.ToolResult{}, e
		}
		monitoring, err = repo.GetByVersionGroupAndCycle(ctx, source.VersionGroupID, args.Cycle)
	}
	if err != nil {
		return agent.ToolResult{}, err
	}
	if monitoring == nil {
		return agent.ToolResult{}, agent.ErrNotFound
	}
	source := monitoring.SourceRisk
	if source == nil || source.OrganizationID == nil || !scope.CanRead(*source.OrganizationID) {
		return agent.ToolResult{}, agent.ErrForbidden
	}
	ids = sourceScope(ids, *source.OrganizationID)
	w := t.widget("table", "Draf dan hasil pemantauan", scope, ids)
	w.Columns = []agent.Column{{Key: "riskCode", Label: "Risiko"}, {Key: "cycle", Label: "Periode"}, {Key: "status", Label: "Status"}, {Key: "mode", Label: "Jenis"}, {Key: "score", Label: "Nilai observasi"}}
	w.Rows = []map[string]any{{"id": monitoring.ID.String(), "riskCode": source.Code, "cycle": monitoring.AssessmentCycle, "status": monitoring.Status, "mode": monitoring.Mode, "score": monitoring.ObservedNilai, "updatedAt": monitoring.UpdatedAt.UTC().Format(time.RFC3339Nano), "href": "/risk/monitoring/" + monitoring.ID.String()}}
	w.SourceIDs = []string{"/risk/monitoring/" + monitoring.ID.String(), "/risk/register/" + source.ID.String()}
	plans := t.widget("table", "Rencana dalam draf pemantauan", scope, ids)
	plans.Columns = []agent.Column{{Key: "id", Label: "ID rencana"}, {Key: "action", Label: "Rencana mitigasi"}, {Key: "owner", Label: "PIC"}, {Key: "dueDate", Label: "Tenggat"}}
	plans.Rows = []map[string]any{}
	for _, mitigation := range monitoring.DraftPayloadSnapshot().Mitigations {
		var due any
		if mitigation.DueDate != nil {
			due = *mitigation.DueDate
		}
		plans.Rows = append(plans.Rows, map[string]any{"id": mitigation.ID.String(), "action": mitigation.Action, "owner": mitigation.Owner, "dueDate": due, "href": "/risk/monitoring/" + monitoring.ID.String()})
	}
	plans.SourceIDs = w.SourceIDs
	return agent.ToolResult{Content: content(map[string]any{"monitoring": monitoring, "values": monitoringValues(monitoring), "expectedUpdatedAt": monitoring.UpdatedAt.UTC().Format(time.RFC3339Nano), "sourceRiskId": source.ID.String(), "sourceUpdatedAt": source.UpdatedAt.UTC().Format(time.RFC3339Nano), "organizationId": source.OrganizationID.String(), "snapshotAt": w.SnapshotAt, "limitations": "patch_monitoring hanya mengubah draf; finalisasi dan tanda tangan dilakukan pada halaman pemantauan."}), Widgets: []agent.Widget{w, plans}, OrganizationIDs: ids}, nil
}

func monitoringValues(monitoring *entity.RiskMonitoring) map[string]any {
	values := jsonMap(monitoring.DraftPayloadSnapshot())
	values["changeReason"] = monitoring.ChangeReason
	return values
}

func (t *Toolkit) validateMonitoringPatch(ctx context.Context, tx pgx.Tx, scope *entity.AccessScope, op agent.Operation, orgID uuid.UUID, lock bool) (agent.Operation, error) {
	monitorings := postgres.NewRiskMonitoringRepositoryWithTx(tx)
	id, _ := uuid.Parse(op.TargetID)
	monitoring, err := monitorings.GetByID(ctx, id, []uuid.UUID{orgID})
	if err != nil {
		return op, err
	}
	if err = checkExpected(op.ExpectedUpdatedAt, monitoring.UpdatedAt); err != nil {
		return op, err
	}
	source := monitoring.SourceRisk
	if source == nil || source.OrganizationID == nil || *source.OrganizationID != orgID || !scope.CanWrite(orgID) {
		return op, agent.ErrForbidden
	}
	if monitoring.Status != entity.RiskMonitoringStatusDraft || monitoring.SupersededByMonitoringID != nil {
		return op, invalid("hanya draf pemantauan aktif yang dapat diubah")
	}
	if !source.CanBeReassessed() || source.ArchivedAt != nil {
		return op, invalid("risiko sumber harus final, aktif, dan tidak diarsipkan")
	}
	// Read the full source entity rather than the monitoring repository's compact
	// join, so authorization and snapshot binding include its actual updated_at.
	risks := postgres.NewRiskRepositoryWithTx(tx)
	source, err = risks.GetByID(ctx, monitoring.SourceRiskID, []uuid.UUID{orgID})
	if err != nil {
		return op, err
	}
	if !source.CanBeReassessed() || source.ArchivedAt != nil {
		return op, invalid("risiko sumber harus final, aktif, dan tidak diarsipkan")
	}
	if lock && content(op.Before["riskUpdatedAt"]) != content(source.UpdatedAt.UTC().Format(time.RFC3339Nano)) {
		return op, agent.ErrStale
	}
	var blocked bool
	if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM working_paper_risks wpr JOIN working_papers wp ON wp.id=wpr.working_paper_id WHERE (wpr.monitoring_id=$1 OR wpr.risk_id=$2) AND wp.status IN ('signing','completed'))`, id, source.ID).Scan(&blocked); err != nil {
		return op, err
	}
	if blocked {
		return op, invalid("pemantauan terkunci oleh kertas kerja yang ditandatangani")
	}
	if _, supplied := op.After["mitigationCompletionPercent"]; supplied {
		var hasTasks bool
		if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM mitigation_tasks WHERE monitoring_id=$1)`, id).Scan(&hasTasks); err != nil {
			return op, err
		}
		if hasTasks {
			return op, invalid("persentase penyelesaian dihitung dari tugas pemantauan; gunakan report_mitigation_task untuk melaporkan progres")
		}
	}
	input, err := monitoringUpdatePayload(monitoring, op.After)
	if err != nil {
		return op, err
	}
	input.MonitoringID, input.OrgIDs = id, []uuid.UUID{orgID}
	if err = t.validateMitigationOwners(ctx, tx, input.Values.Mitigations, orgID, lock); err != nil {
		return op, err
	}
	capture := &captureMonitoringRepository{RiskMonitoringRepository: monitorings}
	if _, err = riskuc.NewUpdateMonitoringUseCase(risks, capture).Execute(ctx, input); err != nil {
		return op, err
	}
	op.Before = map[string]any{"id": id.String(), "status": monitoring.Status, "updatedAt": monitoring.UpdatedAt.UTC().Format(time.RFC3339Nano), "riskId": source.ID.String(), "riskUpdatedAt": source.UpdatedAt.UTC().Format(time.RFC3339Nano)}
	current := map[string]any{"observedProbability": monitoring.ObservedProbability, "observedImpact": monitoring.ObservedImpact, "conclusion": monitoring.Conclusion, "mitigationProgressSummary": monitoring.MitigationProgressSummary, "mitigationCompletionPercent": monitoring.MitigationCompletionPercent, "values": monitoringValues(monitoring)}
	for field := range op.After {
		op.Before[field] = current[field]
	}
	return op, nil
}

type monitoringPatch struct {
	ObservedProbability         *int           `json:"observedProbability"`
	ObservedImpact              *int           `json:"observedImpact"`
	Conclusion                  *string        `json:"conclusion"`
	MitigationProgressSummary   *string        `json:"mitigationProgressSummary"`
	MitigationCompletionPercent *int           `json:"mitigationCompletionPercent"`
	Values                      map[string]any `json:"values"`
}

func monitoringUpdatePayload(monitoring *entity.RiskMonitoring, after map[string]any) (riskuc.UpdateMonitoringInput, error) {
	input := riskuc.UpdateMonitoringInput{ObservedProbability: monitoring.ObservedProbability, ObservedImpact: monitoring.ObservedImpact, Conclusion: monitoring.Conclusion, MitigationProgressSummary: monitoring.MitigationProgressSummary, MitigationCompletionPercent: monitoring.MitigationCompletionPercent}
	for _, value := range after {
		if value == nil {
			return input, invalid("bidang pemantauan tidak boleh null")
		}
	}
	raw, err := json.Marshal(after)
	if err != nil {
		return input, agent.ErrInvalid
	}
	var patch monitoringPatch
	if err = strictDecode(raw, &patch); err != nil {
		return input, err
	}
	if patch.ObservedProbability != nil {
		input.ObservedProbability = *patch.ObservedProbability
	}
	if patch.ObservedImpact != nil {
		input.ObservedImpact = *patch.ObservedImpact
	}
	if patch.Conclusion != nil {
		input.Conclusion = *patch.Conclusion
	}
	if patch.MitigationProgressSummary != nil {
		input.MitigationProgressSummary = *patch.MitigationProgressSummary
	}
	if patch.MitigationCompletionPercent != nil {
		input.MitigationCompletionPercent = *patch.MitigationCompletionPercent
	}
	if input.ObservedProbability < 1 || input.ObservedProbability > 5 || input.ObservedImpact < 1 || input.ObservedImpact > 5 || input.MitigationCompletionPercent < 0 || input.MitigationCompletionPercent > 100 {
		return input, invalid("skor observasi harus 1 sampai 5 dan progres harus 0 sampai 100")
	}
	values := monitoringValues(monitoring)
	if patch.Values != nil {
		if err = checkFields(patch.Values, monitoringValueFields()); err != nil {
			return input, err
		}
		for key, value := range patch.Values {
			values[key] = value
		}
		if value, present := patch.Values["mitigations"]; present {
			mitigations, e := mergeMonitoringMitigations(monitoring.DraftPayloadSnapshot().Mitigations, value)
			if e != nil {
				return input, e
			}
			values["mitigations"] = mitigations
		}
	}
	raw, err = json.Marshal(values)
	if err != nil {
		return input, agent.ErrInvalid
	}
	if err = strictDecode(raw, &input.Values); err != nil {
		return input, err
	}
	if strings.TrimSpace(input.Values.Title) == "" || !entity.IsValidRiskCategory(input.Values.Category) {
		return input, invalid("judul dan kategori profil pemantauan wajib valid")
	}
	return input, nil
}

func mergeMonitoringMitigations(current []entity.Mitigation, value any) ([]entity.Mitigation, error) {
	raw, err := json.Marshal(value)
	if err != nil {
		return nil, agent.ErrInvalid
	}
	var patches []map[string]any
	if err = strictDecode(raw, &patches); err != nil || patches == nil || len(patches) > 100 {
		return nil, invalid("daftar rencana mitigasi tidak valid")
	}
	existing := map[uuid.UUID]entity.Mitigation{}
	for _, mitigation := range current {
		if mitigation.ID != uuid.Nil {
			existing[mitigation.ID] = mitigation
		}
	}
	allowed := mitigationFields()
	allowed["id"] = str()
	seen := map[uuid.UUID]bool{}
	result := make([]entity.Mitigation, 0, len(patches))
	for _, patch := range patches {
		if err = checkFields(patch, allowed); err != nil {
			return nil, err
		}
		var mitigation entity.Mitigation
		if value, exists := patch["id"]; exists {
			text, ok := value.(string)
			if !ok {
				return nil, agent.ErrInvalid
			}
			id, e := uuid.Parse(text)
			if e != nil {
				return nil, agent.ErrInvalid
			}
			if id != uuid.Nil {
				var exists bool
				mitigation, exists = existing[id]
				if !exists || seen[id] {
					return nil, invalid("ID rencana wajib berasal dari draf dan tidak berulang")
				}
				seen[id] = true
			}
		}
		merged := jsonMap(mitigation)
		for field, value := range patch {
			merged[field] = value
		}
		raw, err = json.Marshal(merged)
		if err != nil {
			return nil, agent.ErrInvalid
		}
		if err = strictDecode(raw, &mitigation); err != nil {
			return nil, err
		}
		if err = mitigation.Validate(); err != nil {
			return nil, err
		}
		result = append(result, mitigation)
	}
	if len(seen) != len(existing) {
		return nil, invalid("seluruh ID rencana aktual wajib dipertahankan; penghapusan tidak didukung")
	}
	return result, nil
}

func (r *captureMonitoringRepository) UpdateDraft(_ context.Context, value *entity.RiskMonitoring) error {
	return value.Validate()
}
