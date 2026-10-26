package agenttools

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/agent"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/repository/postgres"
	mtuc "github.com/manris/backend/internal/usecase/mitigation_task"
	riskuc "github.com/manris/backend/internal/usecase/risk"
	eventuc "github.com/manris/backend/internal/usecase/risk_event"
)

const maxOperations = 30

func checkFields(after map[string]any, allowed map[string]any) error {
	if len(after) == 0 {
		return invalid("isi perubahan wajib tersedia")
	}
	for key := range after {
		if _, ok := allowed[key]; !ok {
			return invalid("kolom tidak didukung: " + key)
		}
	}
	return nil
}

func validateOperationShape(op agent.Operation) error {
	if len(op.ID) > 100 || strings.TrimSpace(op.Title) == "" || len(op.Title) > 300 || len(op.Reason) > 4000 {
		return agent.ErrInvalid
	}
	var allowed map[string]any
	switch op.Kind {
	case "create_risk":
		allowed = riskFields()
		allowed["mitigations"] = list(object(mitigationFields()))
	case "patch_risk":
		allowed = riskFields()
	case "add_mitigation":
		allowed = mitigationFields()
	case "patch_mitigation":
		allowed = mitigationFields()
		allowed["mitigationId"] = str()
	case "report_mitigation_task":
		allowed = reportFields()
	case "create_risk_event":
		allowed = eventFields()
	case "reassess_risk":
		allowed = map[string]any{"cycle": str()}
	case "patch_monitoring":
		allowed = monitoringFields()
	case "link_risk_event":
		allowed = map[string]any{"riskIds": list(str())}
	default:
		return invalid("jenis operasi tidak didukung")
	}
	if err := checkFields(op.After, allowed); err != nil {
		return err
	}
	if op.Kind == "report_mitigation_task" {
		if _, err := mitigationReportInput(op.After); err != nil {
			return err
		}
	}
	if op.Kind == "create_risk" || op.Kind == "create_risk_event" {
		if op.TargetID != "" || op.ExpectedUpdatedAt != "" {
			return agent.ErrInvalid
		}
	} else {
		if id, err := uuid.Parse(op.TargetID); err != nil || id == uuid.Nil {
			return invalid("ID target wajib tersedia")
		}
		if _, err := time.Parse(time.RFC3339Nano, op.ExpectedUpdatedAt); err != nil {
			return invalid("expectedUpdatedAt wajib berasal dari pembacaan target terbaru")
		}
	}
	return nil
}

func (t *Toolkit) AuthorizeInTx(ctx context.Context, tx pgx.Tx, actor uuid.UUID, ids []uuid.UUID) error {
	scope, err := t.resolveScope(ctx, tx, actor, false)
	if err != nil {
		return err
	}
	for _, id := range ids {
		if id == uuid.Nil || !scope.CanRead(id) {
			return agent.ErrForbidden
		}
	}
	return nil
}

func (t *Toolkit) ValidateOperations(ctx context.Context, actor uuid.UUID, operations []agent.Operation) ([]agent.Operation, error) {
	tx, err := t.pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return nil, safeDomainError(err)
	}
	defer tx.Rollback(ctx)
	ops, err := t.ValidateOperationsInTx(ctx, tx, actor, operations)
	if err != nil {
		return nil, err
	}
	if err = tx.Commit(ctx); err != nil {
		return nil, safeDomainError(err)
	}
	return ops, nil
}

func (t *Toolkit) ValidateOperationsInTx(ctx context.Context, tx pgx.Tx, actor uuid.UUID, operations []agent.Operation) ([]agent.Operation, error) {
	scope, err := t.resolveScope(ctx, tx, actor, false)
	if err != nil {
		return nil, err
	}
	return t.validateOperations(ctx, tx, actor, scope, operations, false)
}

func (t *Toolkit) validateOperations(ctx context.Context, tx pgx.Tx, actor uuid.UUID, scope *entity.AccessScope, operations []agent.Operation, lock bool) ([]agent.Operation, error) {
	if len(operations) == 0 || len(operations) > maxOperations {
		return nil, agent.ErrInvalid
	}
	result := make([]agent.Operation, 0, len(operations))
	seen := map[string]bool{}
	for _, original := range operations {
		op := original
		if err := validateOperationShape(op); err != nil {
			return nil, err
		}
		if op.ID == "" {
			op.ID = uuid.NewString()
		}
		if seen[op.ID] {
			return nil, invalid("ID operasi harus unik")
		}
		seen[op.ID] = true
		validated, err := t.validateOne(ctx, tx, actor, scope, op, lock)
		if err != nil {
			return nil, safeDomainError(err)
		}
		result = append(result, validated)
	}
	return result, nil
}

func (t *Toolkit) validateOne(ctx context.Context, tx pgx.Tx, actor uuid.UUID, scope *entity.AccessScope, op agent.Operation, lock bool) (agent.Operation, error) {
	previousBefore := op.Before
	orgID, err := writeOrg(scope, op.OrganizationID)
	if err != nil {
		return op, err
	}
	op.OrganizationID = orgID.String()
	// Exclusion must remain possible when an old target has been finalized or
	// deleted. Excluded items cannot execute and retain their reviewed snapshot.
	if !op.Included {
		return op, nil
	}
	if op.Kind == "patch_monitoring" {
		return t.validateMonitoringPatch(ctx, tx, scope, op, orgID, lock)
	}
	if op.Kind == "link_risk_event" {
		return t.validateEventLinks(ctx, tx, scope, actor, op, orgID, lock)
	}
	risks := postgres.NewRiskRepositoryWithTx(tx)
	tasks := postgres.NewMitigationTaskRepositoryWithTx(tx)
	users := postgres.NewUserRepositoryWithTx(tx)
	orgs := postgres.NewOrganizationRepositoryWithTx(tx)
	var target *entity.Risk
	if op.TargetID != "" {
		id, _ := uuid.Parse(op.TargetID)
		var updated time.Time
		query := `SELECT updated_at FROM risks WHERE id=$1 AND organization_id=$2`
		if lock {
			query += ` FOR UPDATE`
		}
		if op.Kind == "report_mitigation_task" {
			query = `SELECT t.updated_at FROM mitigation_tasks t JOIN risks r ON r.id=t.risk_id WHERE t.id=$1 AND r.organization_id=$2`
			if lock {
				query += ` FOR UPDATE OF t,r`
			}
		}
		if err = tx.QueryRow(ctx, query, id, orgID).Scan(&updated); err != nil {
			return op, err
		}
		if op.Included {
			if err = checkExpected(op.ExpectedUpdatedAt, updated); err != nil {
				return op, err
			}
		}
		if op.Kind == "report_mitigation_task" {
			task, e := tasks.GetByID(ctx, id, []uuid.UUID{orgID})
			if e != nil {
				return op, e
			}
			target, e = risks.GetByID(ctx, task.RiskID, []uuid.UUID{orgID})
			if e != nil {
				return op, e
			}
			op.Before = taskRow(task)
			op.Before["riskUpdatedAt"] = target.UpdatedAt.UTC().Format(time.RFC3339Nano)
			if lock && fmt.Sprint(previousBefore["riskUpdatedAt"]) != fmt.Sprint(op.Before["riskUpdatedAt"]) {
				return op, agent.ErrStale
			}
			if task.MonitoringID != nil {
				var status string
				var updated time.Time
				if e = tx.QueryRow(ctx, `SELECT status,updated_at FROM risk_monitorings WHERE id=$1`, *task.MonitoringID).Scan(&status, &updated); e != nil {
					return op, e
				}
				if status != entity.RiskMonitoringStatusDraft {
					return op, invalid("laporan pada pemantauan final atau dibatalkan tidak dapat diubah")
				}
				op.Before["monitoringUpdatedAt"] = updated.UTC().Format(time.RFC3339Nano)
			}
			if lock && content(previousBefore["monitoringUpdatedAt"]) != content(op.Before["monitoringUpdatedAt"]) {
				return op, agent.ErrStale
			}
		} else {
			target, err = risks.GetByID(ctx, id, []uuid.UUID{orgID})
			if err != nil {
				return op, err
			}
			op.Before = map[string]any{"id": target.ID.String(), "code": target.Code, "status": target.Status, "updatedAt": target.UpdatedAt.UTC().Format(time.RFC3339Nano)}
		}
		if target.OrganizationID == nil || *target.OrganizationID != orgID || !scope.CanWrite(*target.OrganizationID) {
			return op, agent.ErrForbidden
		}
	}
	raw, err := json.Marshal(op.After)
	if err != nil || len(raw) > 128*1024 {
		return op, agent.ErrInvalid
	}
	switch op.Kind {
	case "create_risk":
		input, e := createRiskPayload(op.After, orgID, actor)
		if e != nil {
			return op, e
		}
		if e = t.validateMitigationOwners(ctx, tx, input.Mitigations, orgID, lock); e != nil {
			return op, e
		}
		capture := &captureRiskRepository{RiskRepository: risks}
		if _, e = riskuc.NewCreateRiskUseCase(capture, users, orgs).Execute(ctx, input); e != nil {
			return op, e
		}
		op.Before = nil
	case "patch_risk", "add_mitigation", "patch_mitigation":
		if err = editableDraft(target); err != nil {
			return op, err
		}
		input, e := draftUpdatePayload(target, op)
		if e != nil {
			return op, e
		}
		if e = t.validateMitigationOwners(ctx, tx, input.Mitigations, orgID, lock); e != nil {
			return op, e
		}
		capture := &captureRiskRepository{RiskRepository: risks}
		if _, e = riskuc.NewUpdateRiskUseCase(capture, users, orgs, postgres.NewWorkingPaperRepositoryWithTx(tx), nil).Execute(ctx, input, []uuid.UUID{orgID}); e != nil {
			return op, e
		}
		if op.Kind == "patch_risk" {
			for key := range op.After {
				op.Before[key] = jsonMap(target)[key]
			}
		}
		if op.Kind == "patch_mitigation" {
			id, _ := uuid.Parse(fmt.Sprint(op.After["mitigationId"]))
			for _, m := range target.Mitigations {
				if m.ID == id {
					op.Before["mitigation"] = jsonMap(m)
				}
			}
		}
	case "report_mitigation_task":
		input, e := mitigationReportInput(op.After)
		if e != nil {
			return op, e
		}
		op.After = map[string]any{"notes": input.Notes, "evidenceUrl": input.EvidenceURL}
		input.TaskID, _ = uuid.Parse(op.TargetID)
		input.ReportedBy = actor
		input.OrgIDs = []uuid.UUID{orgID}
		capture := &captureTaskRepository{MitigationTaskRepository: tasks}
		if _, err = mtuc.NewSubmitMonitoringReportUseCase(capture, risks).Execute(ctx, input); err != nil {
			return op, err
		}
	case "create_risk_event":
		input, e := eventPayload(op.After, orgID, actor)
		if e != nil {
			return op, e
		}
		capture := &captureEventRepository{RiskEventRepository: postgres.NewRiskEventRepositoryWithTx(tx)}
		if _, e = eventuc.NewService(capture, risks).Create(ctx, input); e != nil {
			return op, e
		}
		op.Before = nil
	case "reassess_risk":
		cycle, ok := op.After["cycle"].(string)
		if !ok || !riskuc.IsValidQuarterFormat(cycle) {
			return op, agent.ErrInvalid
		}
		if target.ArchivedAt != nil {
			return op, invalid("risiko yang diarsipkan tidak dapat dipantau")
		}
		condition, e := monitoringCondition(ctx, tx, target.VersionGroupID, cycle)
		if e != nil {
			return op, e
		}
		if lock && op.Included && content(previousBefore["monitoringCondition"]) != content(condition) {
			return op, agent.ErrStale
		}
		op.Before["monitoringCondition"] = condition
		capture := &captureMonitoringRepository{RiskMonitoringRepository: postgres.NewRiskMonitoringRepositoryWithTx(tx)}
		periods := captureMonitoringPeriods{MonitoringPeriodRepository: postgres.NewRiskMonitoringPeriodRepositoryWithTx(tx)}
		if _, err = riskuc.NewStartMonitoringUseCase(risks, capture, nil, nil, periods).Execute(ctx, riskuc.StartMonitoringInput{SourceRiskID: target.ID, Cycle: cycle, OrgIDs: []uuid.UUID{orgID}, StartedBy: actor}); err != nil {
			return op, err
		}
	}
	return op, nil
}

// Agent reporting uses the same two inputs and done transition as Penanganan.
func mitigationReportInput(after map[string]any) (mtuc.SubmitMonitoringReportInput, error) {
	input := mtuc.SubmitMonitoringReportInput{Status: "done"}
	notes, ok := after["notes"].(string)
	input.Notes = strings.TrimSpace(notes)
	if !ok || len(input.Notes) < 10 || len(input.Notes) > 1000 {
		return input, invalid("catatan pelaksanaan wajib 10–1000 karakter")
	}
	if value, exists := after["evidenceUrl"]; exists {
		evidence, ok := value.(string)
		if !ok {
			return input, invalid("link bukti harus berupa teks")
		}
		input.EvidenceURL = strings.TrimSpace(evidence)
		if input.EvidenceURL != "" {
			u, err := url.ParseRequestURI(input.EvidenceURL)
			if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" || strings.ContainsAny(input.EvidenceURL, "\r\n") {
				return input, invalid("link bukti harus berupa satu URL HTTP/HTTPS")
			}
		}
	}
	return input, nil
}

func checkExpected(expected string, current time.Time) error {
	parsed, err := time.Parse(time.RFC3339Nano, expected)
	if err != nil {
		return invalid("expectedUpdatedAt tidak valid")
	}
	if !parsed.Equal(current) {
		return agent.ErrStale
	}
	return nil
}

func editableDraft(r *entity.Risk) error {
	if r == nil {
		return agent.ErrNotFound
	}
	if r.Status != entity.RiskStatusDraft {
		return invalid("profil final tidak dapat diedit; buat usulan reassess_risk untuk draf penilaian periode berikutnya")
	}
	if r.ArchivedAt != nil {
		return invalid("draf yang diarsipkan tidak dapat diedit")
	}
	return nil
}

func createRiskPayload(after map[string]any, org, actor uuid.UUID) (riskuc.CreateRiskInput, error) {
	var input riskuc.CreateRiskInput
	raw, err := json.Marshal(after)
	if err != nil {
		return input, agent.ErrInvalid
	}
	if err = strictDecode(raw, &input); err != nil {
		return input, err
	}
	input.Status = entity.RiskStatusDraft
	if strings.TrimSpace(input.Title) == "" {
		return input, invalid("judul risiko wajib diisi")
	}
	input.OrganizationID = &org
	input.CreatedBy = &actor
	if value, ok := after["mitigations"]; ok {
		var values []map[string]any
		raw, err = json.Marshal(value)
		if err != nil {
			return input, agent.ErrInvalid
		}
		if err = json.Unmarshal(raw, &values); err != nil {
			return input, agent.ErrInvalid
		}
		if len(values) > 100 {
			return input, agent.ErrInvalid
		}
		for _, v := range values {
			if err = checkFields(v, mitigationFields()); err != nil {
				return input, err
			}
		}
	}
	if err = validateDates(after); err != nil {
		return input, err
	}
	if err = validateRiskTargets(input.TargetProbability, input.TargetImpact, input.RiskPriority); err != nil {
		return input, err
	}
	return input, nil
}

func draftUpdatePayload(r *entity.Risk, op agent.Operation) (riskuc.UpdateRiskInput, error) {
	input := riskuc.UpdateRiskInput{ID: r.ID, Title: r.Title, Description: r.Description, Category: r.Category, Status: r.Status, OrganizationID: r.OrganizationID, Cause: r.Cause, RiskSource: r.RiskSource, Controllability: r.Controllability, ImpactDesc: r.ImpactDesc, ExistingControl: r.ExistingControl, ControlEffectiveness: r.ControlEffectiveness, Probability: r.Probability, Impact: r.Impact, Weight: r.Weight, RiskPriority: r.RiskPriority, RiskAppetite: r.RiskAppetite, TreatmentOption: r.TreatmentOption, Mitigations: append([]entity.Mitigation(nil), r.Mitigations...), TargetProbability: r.TargetProbability, TargetImpact: r.TargetImpact, TargetWeight: r.TargetWeight, NextReviewDate: r.NextReviewDate, ReviewScheduleText: r.ReviewScheduleText, AssessmentCycle: r.AssessmentCycle, ReviewType: r.ReviewType, ChangeReason: r.ChangeReason, ReviewSummary: r.ReviewSummary, DraftApprovalLine: r.DraftApprovalLine, ObjectiveID: r.ObjectiveID, ROID: r.ROID}
	if op.Kind == "patch_risk" {
		if err := validateDates(op.After); err != nil {
			return input, err
		}
		merged := jsonMap(input)
		for k, v := range op.After {
			merged[k] = v
		}
		raw, err := json.Marshal(merged)
		if err != nil {
			return input, agent.ErrInvalid
		}
		if err = strictDecode(raw, &input); err != nil {
			return input, err
		}
	} else {
		patch := map[string]any{}
		for k, v := range op.After {
			if k != "mitigationId" {
				patch[k] = v
			}
		}
		if err := checkFields(patch, mitigationFields()); err != nil {
			return input, err
		}
		if err := validateDates(patch); err != nil {
			return input, err
		}
		if op.Kind == "add_mitigation" {
			var m entity.Mitigation
			raw, err := json.Marshal(patch)
			if err != nil {
				return input, agent.ErrInvalid
			}
			if err = strictDecode(raw, &m); err != nil {
				return input, err
			}
			input.Mitigations = append(input.Mitigations, m)
		} else {
			id, err := uuid.Parse(fmt.Sprint(op.After["mitigationId"]))
			if err != nil {
				return input, agent.ErrInvalid
			}
			found := false
			for i, m := range input.Mitigations {
				if m.ID != id {
					continue
				}
				found = true
				merged := jsonMap(m)
				for k, v := range patch {
					merged[k] = v
				}
				raw, e := json.Marshal(merged)
				if e != nil {
					return input, agent.ErrInvalid
				}
				if e = strictDecode(raw, &input.Mitigations[i]); e != nil {
					return input, e
				}
			}
			if !found {
				return input, agent.ErrNotFound
			}
		}
	}
	if len(input.Mitigations) > 100 {
		return input, invalid("maksimal 100 rencana mitigasi")
	}
	if strings.TrimSpace(input.Title) == "" {
		return input, invalid("judul risiko wajib diisi")
	}
	if err := validateRiskTargets(input.TargetProbability, input.TargetImpact, input.RiskPriority); err != nil {
		return input, err
	}
	return input, nil
}

func validateRiskTargets(probability, impact, priority int) error {
	if probability < 0 || probability > 5 || impact < 0 || impact > 5 || priority < 0 || priority > 5 {
		return invalid("target probabilitas, dampak, dan prioritas harus 0 sampai 5")
	}
	return nil
}

func validateDates(values map[string]any) error {
	for _, key := range []string{"dueDate", "nextReviewDate"} {
		if value, ok := values[key]; ok && value != nil {
			str, ok := value.(string)
			if !ok {
				return agent.ErrInvalid
			}
			if str != "" {
				if _, err := time.Parse("2006-01-02", str); err != nil {
					return invalid(key + " harus YYYY-MM-DD")
				}
			}
		}
	}
	return nil
}

func (t *Toolkit) validateMitigationOwners(ctx context.Context, db queryDB, mitigations []entity.Mitigation, orgID uuid.UUID, lock bool) error {
	for _, m := range mitigations {
		if err := m.Validate(); err != nil {
			return err
		}
		if m.TargetCost < 0 {
			return agent.ErrInvalid
		}
		if m.Frequency != "" && m.Frequency != "rutin" && m.Frequency != "insidental" {
			return invalid("frekuensi mitigasi tidak valid")
		}
		if m.RecurringInterval != nil {
			switch *m.RecurringInterval {
			case "harian", "mingguan", "bulanan", "triwulan":
			default:
				return invalid("interval mitigasi tidak valid")
			}
		}
		if m.ReportDay != nil && (*m.ReportDay < 0 || *m.ReportDay > 6) {
			return invalid("hari pelaporan harus 0 sampai 6")
		}
		if m.ReportDate != nil && (*m.ReportDate < 1 || *m.ReportDate > 31) {
			return invalid("tanggal pelaporan harus 1 sampai 31")
		}
		if m.DueDate != nil && *m.DueDate != "" {
			if _, err := time.Parse("2006-01-02", *m.DueDate); err != nil {
				return invalid("tenggat mitigasi harus YYYY-MM-DD")
			}
		}
		if m.OwnerUserID == nil {
			continue
		}
		var valid bool
		query := `SELECT true FROM users WHERE id=$1 AND organization_id=$2 AND status='active'`
		if lock {
			query += ` FOR SHARE`
		}
		if err := db.QueryRow(ctx, query, *m.OwnerUserID, orgID).Scan(&valid); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return invalid("PIC harus pengguna aktif organisasi tujuan")
			}
			return err
		}
		if !valid {
			return invalid("PIC harus pengguna aktif organisasi tujuan")
		}
	}
	return nil
}

type captureMonitoringRepository struct {
	repository.RiskMonitoringRepository
}

func (r *captureMonitoringRepository) Create(_ context.Context, value *entity.RiskMonitoring) error {
	return value.Validate()
}

type captureMonitoringPeriods struct {
	riskuc.MonitoringPeriodRepository
}

func (captureMonitoringPeriods) EnsureMonitoringPeriods(context.Context, uuid.UUID, time.Time, int) error {
	return nil
}

// The approved proposal binds the two monitoring records that determine whether
// starting this cycle is allowed. A newly created/finalized record needs review.
func monitoringCondition(ctx context.Context, tx pgx.Tx, group uuid.UUID, cycle string) ([]map[string]any, error) {
	previous, err := riskuc.PreviousQuarterCycle(cycle)
	if err != nil {
		return nil, err
	}
	rows, err := tx.Query(ctx, `SELECT id,assessment_cycle,status,updated_at FROM risk_monitorings WHERE version_group_id=$1 AND assessment_cycle=ANY($2::text[]) ORDER BY id`, group, []string{cycle, previous})
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []map[string]any{}
	for rows.Next() {
		var id uuid.UUID
		var period, status string
		var updated time.Time
		if err = rows.Scan(&id, &period, &status, &updated); err != nil {
			return nil, err
		}
		result = append(result, map[string]any{"id": id.String(), "cycle": period, "status": status, "updatedAt": updated.UTC().Format(time.RFC3339Nano)})
	}
	return result, rows.Err()
}

type eventInput struct {
	Description           string                     `json:"description"`
	OccurredAt            time.Time                  `json:"occurredAt"`
	ImpactTypes           []string                   `json:"impactTypes"`
	OtherImpactType       string                     `json:"otherImpactType"`
	ActualImpact          string                     `json:"actualImpact"`
	Severity              string                     `json:"severity"`
	ImmediateResponse     string                     `json:"immediateResponse"`
	PostResponseCondition string                     `json:"postResponseCondition"`
	Location              string                     `json:"location"`
	AffectedParties       string                     `json:"affectedParties"`
	SuspectedCause        string                     `json:"suspectedCause"`
	DisruptionDuration    string                     `json:"disruptionDuration"`
	ExtraordinaryReason   string                     `json:"extraordinaryReason"`
	OngoingAction         string                     `json:"ongoingAction"`
	EvidenceURL           string                     `json:"evidenceUrl"`
	FinancialLoss         *float64                   `json:"financialLoss"`
	FinancialLossKnown    *bool                      `json:"financialLossKnown"`
	RiskIDs               []uuid.UUID                `json:"riskIds"`
	SourceDocumentName    string                     `json:"sourceDocumentName"`
	SourceRefs            []entity.DocumentSourceRef `json:"sourceRefs"`
	ExtractionKey         string                     `json:"extractionKey"`
}

func eventPayload(after map[string]any, org, actor uuid.UUID) (eventuc.CreateInput, error) {
	var p eventInput
	raw, err := json.Marshal(after)
	if err != nil {
		return eventuc.CreateInput{}, agent.ErrInvalid
	}
	if err = strictDecode(raw, &p); err != nil {
		return eventuc.CreateInput{}, err
	}
	if p.FinancialLoss != nil && *p.FinancialLoss < 0 {
		return eventuc.CreateInput{}, agent.ErrInvalid
	}
	if p.EvidenceURL != "" {
		u, e := url.ParseRequestURI(p.EvidenceURL)
		if e != nil || (u.Scheme != "http" && u.Scheme != "https") {
			return eventuc.CreateInput{}, invalid("URL bukti tidak valid")
		}
	}
	return eventuc.CreateInput{Description: p.Description, OccurredAt: p.OccurredAt, ImpactTypes: p.ImpactTypes, OtherImpactType: p.OtherImpactType, ActualImpact: p.ActualImpact, Severity: p.Severity, ImmediateResponse: p.ImmediateResponse, PostResponseCondition: p.PostResponseCondition, Location: p.Location, AffectedParties: p.AffectedParties, SuspectedCause: p.SuspectedCause, DisruptionDuration: p.DisruptionDuration, ExtraordinaryReason: p.ExtraordinaryReason, OngoingAction: p.OngoingAction, EvidenceURL: p.EvidenceURL, FinancialLoss: p.FinancialLoss, FinancialLossKnown: p.FinancialLossKnown, RiskIDs: p.RiskIDs, SourceDocumentName: p.SourceDocumentName, SourceRefs: p.SourceRefs, ExtractionKey: p.ExtractionKey, OrganizationID: org, ActorID: actor, OrgIDs: []uuid.UUID{org}}, nil
}

// Capturing repositories run the actual usecases' validation without writes.
// All reads still use the supplied transaction and current authorization.
type captureRiskRepository struct {
	repository.RiskRepository
	candidate *entity.Risk
}

func (r *captureRiskRepository) Create(_ context.Context, value *entity.Risk) error {
	r.candidate = value
	return nil
}
func (r *captureRiskRepository) Update(_ context.Context, value *entity.Risk) error {
	r.candidate = value
	return nil
}
func (r *captureRiskRepository) NextRiskCode(context.Context) (string, error) {
	return "R-PROPOSAL", nil
}

type captureTaskRepository struct {
	repository.MitigationTaskRepository
	candidate *entity.MitigationTask
}

func (r *captureTaskRepository) Update(_ context.Context, value *entity.MitigationTask) error {
	r.candidate = value
	return nil
}
func (r *captureTaskRepository) GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.MitigationTask, error) {
	if r.candidate != nil && r.candidate.ID == id {
		return r.candidate, nil
	}
	return r.MitigationTaskRepository.GetByID(ctx, id, orgIDs)
}

type captureEventRepository struct {
	repository.RiskEventRepository
	candidate *entity.RiskEvent
}

func (r *captureEventRepository) Create(_ context.Context, value *entity.RiskEvent, _ []uuid.UUID) error {
	value.ID = uuid.New()
	r.candidate = value
	return nil
}
func (r *captureEventRepository) GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.RiskEvent, error) {
	if r.candidate != nil && r.candidate.ID == id {
		return r.candidate, nil
	}
	return r.RiskEventRepository.GetByID(ctx, id, orgIDs)
}
