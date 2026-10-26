package agenttools

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/agent"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/repository/postgres"
	"github.com/manris/backend/internal/timeutil"
	reportuc "github.com/manris/backend/internal/usecase/report"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

type readArgs struct {
	OrganizationID  string `json:"organizationId,omitempty"`
	ID              string `json:"id,omitempty"`
	Query           string `json:"query,omitempty"`
	Status          string `json:"status,omitempty"`
	Lifecycle       string `json:"lifecycle,omitempty"`
	Category        string `json:"category,omitempty"`
	Cycle           string `json:"cycle,omitempty"`
	ComparisonCycle string `json:"comparisonCycle,omitempty"`
	RiskID          string `json:"riskId,omitempty"`
	OwnerUserID     string `json:"ownerUserId,omitempty"`
	Period          string `json:"period,omitempty"`
	OverdueOnly     bool   `json:"overdueOnly,omitempty"`
	Page            int    `json:"page,omitempty"`
	Limit           int    `json:"limit,omitempty"`
}

func (t *Toolkit) Execute(ctx context.Context, actor uuid.UUID, name string, raw json.RawMessage) (agent.ToolResult, error) {
	if name == "get_risk_charter_context" {
		return t.executeRiskCharterContext(ctx, actor, raw)
	}
	if name == "list_priority_risks" || name == "compare_periods" {
		return t.executeResponse(ctx, actor, name, raw)
	}
	if name == "analyze_report" || name == "list_report_units" {
		return t.ExecuteAnalysis(ctx, actor, name, raw)
	}
	if name == "propose_operations" {
		var input struct {
			Operations []agent.Operation `json:"operations"`
		}
		if err := strictDecode(raw, &input); err != nil {
			return agent.ToolResult{}, err
		}
		operations, err := t.ValidateOperations(ctx, actor, input.Operations)
		if err != nil {
			return agent.ToolResult{}, err
		}
		ids := []uuid.UUID{}
		for _, op := range operations {
			id, _ := uuid.Parse(op.OrganizationID)
			ids = sourceScope(ids, id)
		}
		return agent.ToolResult{Content: content(map[string]any{"status": "proposal_only", "operations": operations, "instruction": "Belum ada data bisnis disimpan. Pengguna harus meninjau dan menekan Terapkan."}), Operations: operations, OrganizationIDs: ids}, nil
	}
	allowed := map[string]bool{"list_risks": true, "list_high_risks": true, "get_risk": true, "get_risk_monitoring": true, "list_mitigation_tasks": true, "get_mitigation_task": true, "list_risk_events": true, "get_risk_event": true, "quarterly_report": true, "lookup_pic": true}
	if !allowed[name] {
		return agent.ToolResult{}, invalid("tool tidak dikenal")
	}
	// Reject fields belonging to a different read tool instead of ignoring them.
	var provided map[string]json.RawMessage
	if err := strictDecode(raw, &provided); err != nil {
		return agent.ToolResult{}, err
	}
	for _, def := range t.Definitions([]string{"risks", "mitigations", "incidents", "reports"}) {
		if def.Name != name {
			continue
		}
		var schema struct {
			Properties map[string]any `json:"properties"`
		}
		if err := json.Unmarshal(def.Parameters, &schema); err != nil {
			return agent.ToolResult{}, agent.ErrInvalid
		}
		for field := range provided {
			if _, ok := schema.Properties[field]; !ok {
				return agent.ToolResult{}, invalid("kolom tool tidak dikenal: " + field)
			}
		}
	}
	var args readArgs
	if err := strictDecode(raw, &args); err != nil {
		return agent.ToolResult{}, err
	}
	if args.Limit == 0 {
		args.Limit = 20
	}
	if args.Page == 0 {
		args.Page = 1
	}
	if args.Limit < 1 || args.Limit > 100 || args.Page < 1 || args.Page > 10000 || len(args.Query) > 500 {
		return agent.ToolResult{}, agent.ErrInvalid
	}
	if args.Cycle != "" && !riskuc.IsValidQuarterFormat(args.Cycle) {
		return agent.ToolResult{}, invalid("periode harus YYYY-Q[1-4]")
	}
	if name == "quarterly_report" {
		return t.readQuarterly(ctx, actor, args)
	}
	tx, err := t.pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return agent.ToolResult{}, safeDomainError(err)
	}
	defer tx.Rollback(ctx)
	scope, err := t.resolveScope(ctx, tx, actor, false)
	if err != nil {
		return agent.ToolResult{}, err
	}
	ids, err := readScope(scope, args.OrganizationID)
	if err != nil {
		return agent.ToolResult{}, err
	}
	var result agent.ToolResult
	switch name {
	case "list_risks", "list_high_risks", "get_risk":
		result, err = t.readRisks(ctx, tx, scope, ids, name, args)
	case "get_risk_monitoring":
		result, err = t.readMonitoring(ctx, tx, scope, ids, args)
	case "list_mitigation_tasks", "get_mitigation_task":
		result, err = t.readTasks(ctx, tx, scope, ids, name, args)
	case "list_risk_events", "get_risk_event":
		result, err = t.readEvents(ctx, tx, scope, ids, name, args)
	case "lookup_pic":
		result, err = t.readPIC(ctx, tx, scope, ids, args)
	}
	if err != nil {
		return agent.ToolResult{}, safeDomainError(err)
	}
	if err = tx.Commit(ctx); err != nil {
		return agent.ToolResult{}, safeDomainError(err)
	}
	return result, nil
}

func riskRow(r *entity.Risk) map[string]any {
	var org any
	if r.OrganizationID != nil {
		org = r.OrganizationID.String()
	}
	return map[string]any{"id": r.ID.String(), "code": r.Code, "title": r.Title, "score": r.GetEffectiveScore(), "level": r.GetRiskLevel(), "status": r.Status, "cycle": r.AssessmentCycle, "organization": r.OrgName, "organizationId": org, "updatedAt": r.UpdatedAt.UTC().Format(time.RFC3339Nano), "href": "/risk/register/" + r.ID.String()}
}

func (t *Toolkit) readRisks(ctx context.Context, tx pgx.Tx, scope *entity.AccessScope, ids []uuid.UUID, name string, args readArgs) (agent.ToolResult, error) {
	repo := postgres.NewRiskRepositoryWithTx(tx)
	if name == "get_risk" {
		id, err := uuid.Parse(args.ID)
		if err != nil {
			return agent.ToolResult{}, agent.ErrInvalid
		}
		r, err := riskuc.NewGetRiskUseCase(repo).Execute(ctx, id, ids)
		if err != nil {
			return agent.ToolResult{}, err
		}
		if r.OrganizationID == nil || !scope.CanRead(*r.OrganizationID) {
			return agent.ToolResult{}, agent.ErrForbidden
		}
		ids = sourceScope(ids, *r.OrganizationID)
		w := t.widget("risk_detail", "Profil risiko", scope, ids)
		detail := riskDetail(r, "")
		w.Risk = &detail
		w.RefreshAction = &agent.WidgetAction{Label: "Perbarui profil risiko", Prompt: fmt.Sprintf("Baca ulang get_risk id %s organizationId %s. Tampilkan profil terbaru, pertahankan sumber periode %s dan jelaskan bila versi periode telah berubah.", detail.ID, detail.OrganizationID, detail.Cycle), Skills: []string{"risks"}}
		w.SourceIDs = []string{"/risk/register/" + r.ID.String()}
		return agent.ToolResult{Content: content(r), Widgets: []agent.Widget{w}, OrganizationIDs: ids}, nil
	}
	var items []*entity.Risk
	var total int
	var err error
	if name == "list_high_risks" {
		cycle := args.Cycle
		if cycle == "" {
			cycle = t.currentCycle()
		}
		all, e := riskuc.NewListRiskCycleSnapshotUseCase(repo, nil).Execute(ctx, riskuc.ListRiskCycleSnapshotInput{Cycle: cycle, OrgIDs: ids})
		if e != nil {
			return agent.ToolResult{}, e
		}
		for _, r := range all {
			if r != nil && (r.GetRiskLevel() == entity.RiskLevelTinggi || r.GetRiskLevel() == entity.RiskLevelSangatTinggi) {
				items = append(items, r)
			}
		}
		sort.SliceStable(items, func(i, j int) bool { return items[i].GetEffectiveScore() > items[j].GetEffectiveScore() })
		total = len(items)
		start := min((args.Page-1)*args.Limit, total)
		items = items[start:min(start+args.Limit, total)]
		args.Cycle = cycle
	} else {
		if args.Status != "" && args.Status != "all" && args.Status != "draft" && args.Status != "final" {
			return agent.ToolResult{}, agent.ErrInvalid
		}
		if args.Lifecycle == "" {
			args.Lifecycle = "active"
		}
		if args.Lifecycle != "active" && args.Lifecycle != "archived" && args.Lifecycle != "all" {
			return agent.ToolResult{}, agent.ErrInvalid
		}
		res, e := riskuc.NewListRiskRegisterUseCase(repo).Execute(ctx, riskuc.ListRiskRegisterInput{OrgIDs: ids, View: "profile", Status: args.Status, Lifecycle: args.Lifecycle, Category: args.Category, AssessmentCycle: args.Cycle, Query: args.Query, Page: args.Page, Limit: args.Limit})
		err = e
		if err == nil {
			items = res.Data
			total = res.Total
		}
	}
	if err != nil {
		return agent.ToolResult{}, err
	}
	w := t.widget("table", "Daftar risiko", scope, ids)
	w.Columns = []agent.Column{{Key: "code", Label: "Kode"}, {Key: "title", Label: "Risiko"}, {Key: "score", Label: "Nilai"}, {Key: "level", Label: "Tingkat"}, {Key: "status", Label: "Status"}, {Key: "organization", Label: "Organisasi"}}
	w.Rows = []map[string]any{}
	for _, r := range items {
		if r.OrganizationID == nil || !scope.CanRead(*r.OrganizationID) {
			return agent.ToolResult{}, agent.ErrForbidden
		}
		ids = sourceScope(ids, *r.OrganizationID)
		w.Rows = append(w.Rows, riskRow(r))
		w.SourceIDs = append(w.SourceIDs, "/risk/register/"+r.ID.String())
	}
	w.Description = fmt.Sprintf("%d dari %d hasil · halaman %d · periode %s", len(w.Rows), total, args.Page, args.Cycle)
	return agent.ToolResult{Content: content(map[string]any{"rows": w.Rows, "total": total, "page": args.Page, "limit": args.Limit, "cycle": args.Cycle, "snapshotAt": w.SnapshotAt, "scope": w.ScopeLabel, "complete": args.Page == 1 && total <= args.Limit}), Widgets: []agent.Widget{w}, OrganizationIDs: ids}, nil
}

func (t *Toolkit) readTasks(ctx context.Context, tx pgx.Tx, scope *entity.AccessScope, ids []uuid.UUID, name string, args readArgs) (agent.ToolResult, error) {
	repo := postgres.NewMitigationTaskRepositoryWithTx(tx)
	if name == "get_mitigation_task" {
		id, err := uuid.Parse(args.ID)
		if err != nil {
			return agent.ToolResult{}, agent.ErrInvalid
		}
		task, err := repo.GetByID(ctx, id, ids)
		if err != nil {
			return agent.ToolResult{}, err
		}
		r, err := postgres.NewRiskRepositoryWithTx(tx).GetByID(ctx, task.RiskID, ids)
		if err != nil {
			return agent.ToolResult{}, err
		}
		if r.OrganizationID == nil {
			return agent.ToolResult{}, agent.ErrForbidden
		}
		ids = sourceScope(ids, *r.OrganizationID)
		w := t.widget("table", "Tugas mitigasi", scope, ids)
		w.Rows = []map[string]any{taskRow(task)}
		w.Columns = taskColumns()
		w.SourceIDs = []string{taskHref(task)}
		return agent.ToolResult{Content: content(task), Widgets: []agent.Widget{w}, OrganizationIDs: ids}, nil
	}
	// This bounded read keeps the canonical task population (tasks joined to
	// their own risk and mitigation), adding exact PIC and calendar-overdue filters.
	where := ` WHERE (cardinality($1::uuid[])=0 OR r.organization_id=ANY($1::uuid[]))`
	params := []any{ids}
	add := func(clause string, value any) {
		params = append(params, value)
		where += fmt.Sprintf(clause, len(params))
	}
	if args.RiskID != "" {
		id, e := uuid.Parse(args.RiskID)
		if e != nil {
			return agent.ToolResult{}, agent.ErrInvalid
		}
		add(` AND t.risk_id=$%d`, id)
	}
	if args.OwnerUserID != "" {
		id, e := uuid.Parse(args.OwnerUserID)
		if e != nil {
			return agent.ToolResult{}, agent.ErrInvalid
		}
		add(` AND m.owner_user_id=$%d`, id)
	}
	if args.Status != "" {
		switch args.Status {
		case "pending", "overdue", "done", "not_reported", "skipped":
		default:
			return agent.ToolResult{}, agent.ErrInvalid
		}
		add(` AND t.status=$%d`, args.Status)
	}
	if args.Period != "" {
		add(` AND t.period_label=$%d`, args.Period)
	}
	if args.Query != "" {
		params = append(params, "%"+args.Query+"%")
		n := len(params)
		where += fmt.Sprintf(` AND (m.action ILIKE $%d OR m.owner ILIKE $%d OR r.code ILIKE $%d OR r.title ILIKE $%d)`, n, n, n, n)
	}
	if args.OverdueOnly {
		add(` AND t.status IN ('pending','overdue') AND t.due_date<$%d::date`, t.now().In(timeutil.JakartaLocation()).Format("2006-01-02"))
	}
	from := ` FROM mitigation_tasks t JOIN mitigations m ON m.id=t.mitigation_id JOIN risks r ON r.id=t.risk_id`
	var total int
	if err := tx.QueryRow(ctx, `SELECT COUNT(*)`+from+where, params...).Scan(&total); err != nil {
		return agent.ToolResult{}, err
	}
	params = append(params, args.Limit, (args.Page-1)*args.Limit)
	rows, err := tx.Query(ctx, `SELECT t.id,r.organization_id`+from+where+fmt.Sprintf(` ORDER BY t.due_date,t.id LIMIT $%d OFFSET $%d`, len(params)-1, len(params)), params...)
	if err != nil {
		return agent.ToolResult{}, err
	}
	defer rows.Close()
	taskIDs := []uuid.UUID{}
	for rows.Next() {
		var id, orgID uuid.UUID
		if err = rows.Scan(&id, &orgID); err != nil {
			return agent.ToolResult{}, err
		}
		taskIDs = append(taskIDs, id)
		ids = sourceScope(ids, orgID)
	}
	if err = rows.Err(); err != nil {
		return agent.ToolResult{}, err
	}
	rows.Close()
	w := t.widget("table", "Tugas mitigasi", scope, ids)
	w.Columns = taskColumns()
	w.Rows = []map[string]any{}
	for _, id := range taskIDs {
		task, e := repo.GetByID(ctx, id, ids)
		if e != nil {
			return agent.ToolResult{}, e
		}
		w.Rows = append(w.Rows, taskRow(task))
		w.SourceIDs = appendUniqueSource(w.SourceIDs, taskHref(task))
	}
	w.Description = fmt.Sprintf("%d dari %d tugas · halaman %d", len(w.Rows), total, args.Page)
	return agent.ToolResult{Content: content(map[string]any{"rows": w.Rows, "total": total, "page": args.Page, "limit": args.Limit, "overdueOnly": args.OverdueOnly, "date": t.now().In(timeutil.JakartaLocation()).Format("2006-01-02"), "scope": w.ScopeLabel, "snapshotAt": w.SnapshotAt, "complete": args.Page == 1 && total <= args.Limit}), Widgets: []agent.Widget{w}, OrganizationIDs: ids}, nil
}

func taskColumns() []agent.Column {
	return []agent.Column{{Key: "riskCode", Label: "Risiko"}, {Key: "action", Label: "Mitigasi"}, {Key: "owner", Label: "PIC"}, {Key: "dueDate", Label: "Tenggat"}, {Key: "status", Label: "Status"}, {Key: "period", Label: "Periode"}}
}
func taskRow(task *entity.MitigationTask) map[string]any {
	return map[string]any{"id": task.ID.String(), "riskId": task.RiskID.String(), "riskCode": task.RiskCode, "action": task.MitigationAction, "owner": task.MitigationOwner, "dueDate": task.DueDate, "status": task.Status, "period": task.PeriodLabel, "notes": task.Notes, "updatedAt": task.UpdatedAt.UTC().Format(time.RFC3339Nano), "href": taskHref(task)}
}

func taskHref(task *entity.MitigationTask) string {
	if task.MonitoringID != nil {
		return "/risk/monitoring/" + task.MonitoringID.String()
	}
	return "/risk/assessment/" + task.RiskID.String()
}

func (t *Toolkit) readEvents(ctx context.Context, tx pgx.Tx, scope *entity.AccessScope, ids []uuid.UUID, name string, args readArgs) (agent.ToolResult, error) {
	repo := postgres.NewRiskEventRepositoryWithTx(tx)
	risks := postgres.NewRiskRepositoryWithTx(tx)
	var events []*entity.RiskEvent
	total := 0
	if name == "get_risk_event" {
		id, e := uuid.Parse(args.ID)
		if e != nil {
			return agent.ToolResult{}, agent.ErrInvalid
		}
		event, e := repo.GetByID(ctx, id, ids)
		if e != nil {
			return agent.ToolResult{}, e
		}
		events = []*entity.RiskEvent{event}
		total = 1
	} else {
		where := ` WHERE i.status='recorded' AND (cardinality($1::uuid[])=0 OR i.organization_id=ANY($1::uuid[]))`
		params := []any{ids}
		if args.RiskID != "" {
			riskID, e := uuid.Parse(args.RiskID)
			if e != nil {
				return agent.ToolResult{}, agent.ErrInvalid
			}
			if _, e = risks.GetByID(ctx, riskID, ids); e != nil {
				return agent.ToolResult{}, e
			}
			params = append(params, riskID)
			where += ` AND EXISTS(SELECT 1 FROM incident_risk_links l WHERE l.incident_id=i.id AND l.risk_id=$2)`
		}
		if e := tx.QueryRow(ctx, `SELECT COUNT(*) FROM incidents i`+where, params...).Scan(&total); e != nil {
			return agent.ToolResult{}, e
		}
		params = append(params, args.Limit, (args.Page-1)*args.Limit)
		rows, e := tx.Query(ctx, `SELECT i.id FROM incidents i`+where+fmt.Sprintf(` ORDER BY i."when" DESC,i.id LIMIT $%d OFFSET $%d`, len(params)-1, len(params)), params...)
		if e != nil {
			return agent.ToolResult{}, e
		}
		defer rows.Close()
		eventIDs := []uuid.UUID{}
		for rows.Next() {
			var id uuid.UUID
			if e = rows.Scan(&id); e != nil {
				return agent.ToolResult{}, e
			}
			eventIDs = append(eventIDs, id)
		}
		if e = rows.Err(); e != nil {
			return agent.ToolResult{}, e
		}
		rows.Close()
		for _, id := range eventIDs {
			event, e := repo.GetByID(ctx, id, ids)
			if e != nil {
				return agent.ToolResult{}, e
			}
			events = append(events, event)
		}
	}
	w := t.widget("table", "Kejadian risiko", scope, ids)
	w.Columns = []agent.Column{{Key: "code", Label: "Kode"}, {Key: "description", Label: "Kejadian"}, {Key: "occurredAt", Label: "Waktu"}, {Key: "severity", Label: "Keparahan"}, {Key: "linkedRisks", Label: "Relasi tersimpan"}}
	w.Rows = []map[string]any{}
	for _, event := range events {
		if !scope.CanRead(event.OrganizationID) {
			return agent.ToolResult{}, agent.ErrForbidden
		}
		ids = sourceScope(ids, event.OrganizationID)
		visible := make([]entity.IncidentRiskLink, 0, len(event.LinkedRisks))
		codes := []string{}
		for _, link := range event.LinkedRisks {
			r, e := risks.GetByID(ctx, link.ID, ids)
			if e == nil && r.OrganizationID != nil && scope.CanRead(*r.OrganizationID) {
				visible = append(visible, link)
				codes = append(codes, link.Code)
			}
		}
		event.LinkedRisks = visible
		w.Rows = append(w.Rows, map[string]any{"id": event.ID.String(), "code": event.Code, "description": event.Description, "occurredAt": event.OccurredAt.Format(time.RFC3339), "severity": event.Severity, "linkedRisks": strings.Join(codes, ", "), "updatedAt": event.UpdatedAt.UTC().Format(time.RFC3339Nano), "href": "/risk-events/" + event.ID.String()})
		w.SourceIDs = append(w.SourceIDs, "/risk-events/"+event.ID.String())
	}
	return agent.ToolResult{Content: content(map[string]any{"events": events, "total": total, "page": args.Page, "limit": args.Limit, "snapshotAt": w.SnapshotAt, "scope": w.ScopeLabel, "relationType": "stored_links", "complete": args.Page == 1 && total <= args.Limit}), Widgets: []agent.Widget{w}, OrganizationIDs: ids}, nil
}

func (t *Toolkit) readPIC(ctx context.Context, tx pgx.Tx, scope *entity.AccessScope, ids []uuid.UUID, args readArgs) (agent.ToolResult, error) {
	limit := min(args.Limit, 50)
	rows, err := tx.Query(ctx, `SELECT u.id,u.name,u.organization_id,COALESCE(o.name,''),u.role FROM users u LEFT JOIN organizations o ON o.id=u.organization_id WHERE u.status='active' AND (cardinality($1::uuid[])=0 OR u.organization_id=ANY($1::uuid[])) AND ($2::text='' OR u.name ILIKE '%'||$2||'%') ORDER BY u.name,u.id LIMIT $3`, ids, args.Query, limit+1)
	if err != nil {
		return agent.ToolResult{}, err
	}
	defer rows.Close()
	w := t.widget("table", "PIC aktif", scope, ids)
	w.Columns = []agent.Column{{Key: "name", Label: "Nama"}, {Key: "organization", Label: "Organisasi"}, {Key: "role", Label: "Peran"}}
	w.Rows = []map[string]any{}
	for rows.Next() {
		var id uuid.UUID
		var org *uuid.UUID
		var name, orgName, role string
		if err = rows.Scan(&id, &name, &org, &orgName, &role); err != nil {
			return agent.ToolResult{}, err
		}
		if org == nil {
			continue
		}
		ids = sourceScope(ids, *org)
		w.Rows = append(w.Rows, map[string]any{"id": id.String(), "name": name, "organizationId": org.String(), "organization": orgName, "role": role})
	}
	if err = rows.Err(); err != nil {
		return agent.ToolResult{}, err
	}
	truncated := len(w.Rows) > limit
	if truncated {
		w.Rows = w.Rows[:limit]
	}
	return agent.ToolResult{Content: content(map[string]any{"users": w.Rows, "truncated": truncated, "snapshotAt": w.SnapshotAt}), Widgets: []agent.Widget{w}, OrganizationIDs: ids}, nil
}

func (t *Toolkit) readQuarterly(ctx context.Context, actor uuid.UUID, args readArgs) (agent.ToolResult, error) {
	scope, err := t.resolveScope(ctx, t.pool, actor, false)
	if err != nil {
		return agent.ToolResult{}, err
	}
	ids, err := readScope(scope, args.OrganizationID)
	if err != nil {
		return agent.ToolResult{}, err
	}
	data, err := reportuc.NewQuarterlyReportUseCase(postgres.NewQuarterlyReportRepository(t.pool)).Execute(ctx, reportuc.QuarterlyReportInput{Cycle: args.Cycle, ComparisonCycle: args.ComparisonCycle, OrgIDs: ids})
	if err != nil {
		return agent.ToolResult{}, safeDomainError(err)
	}
	overview := reportuc.BuildQuarterlyReportOverview(data)
	for _, org := range data.Organizations {
		ids = sourceScope(ids, org.ID)
	}
	reportHref := quarterlyReportHref(data.Cycle, data.ComparisonCycle, ids)
	metrics := t.widget("metrics", "Ringkasan laporan "+data.Cycle, scope, ids)
	metrics.SnapshotAt = data.GeneratedAt
	metrics.Metrics = []agent.Metric{{Label: "Profil risiko", Value: overview.Summary.Total}, {Label: "Di atas selera risiko", Value: overview.Summary.Appetite.Above, Description: fmt.Sprintf("Pembilang %d; penyebut %d", overview.Summary.Appetite.Above, overview.Summary.Appetite.Total)}, {Label: "Tugas terlambat", Value: overview.TaskCounts.Overdue}, {Label: "Kejadian", Value: overview.Summary.Events.Total}}
	chart := t.widget("bar_chart", "Status pelaporan mitigasi", scope, ids)
	chart.SnapshotAt = data.GeneratedAt
	chart.Columns = []agent.Column{{Key: "label", Label: "Status"}, {Key: "value", Label: "Jumlah"}}
	chart.Rows = []map[string]any{{"label": "Dilaporkan", "value": overview.TaskCounts.Reported}, {"label": "Belum selesai", "value": overview.TaskCounts.Pending}, {"label": "Terlambat", "value": overview.TaskCounts.Overdue}, {"label": "Tidak dilaporkan", "value": overview.TaskCounts.NotReported}}
	table := t.widget("table", "Ringkasan per organisasi", scope, ids)
	table.SnapshotAt = data.GeneratedAt
	table.Columns = []agent.Column{{Key: "organization", Label: "Organisasi"}, {Key: "risks", Label: "Risiko"}, {Key: "overdue", Label: "Mitigasi terlambat"}, {Key: "events", Label: "Kejadian"}}
	table.Rows = []map[string]any{}
	for _, unit := range overview.Units {
		if len(table.Rows) < 100 {
			id, err := uuid.Parse(unit.ID)
			if err != nil {
				return agent.ToolResult{}, safeDomainError(err)
			}
			table.Rows = append(table.Rows, map[string]any{"organization": unit.Name, "risks": unit.Summary.Total, "overdue": unit.Summary.Mitigation.Overdue, "events": unit.Summary.Events.Total, "href": quarterlyReportHref(data.Cycle, data.ComparisonCycle, []uuid.UUID{id})})
		}
	}
	metrics.SourceIDs = []string{reportHref}
	for _, r := range data.Risks {
		if r != nil && r.Risk != nil {
			metrics.SourceIDs = append(metrics.SourceIDs, "/risk/register/"+r.Risk.ID.String())
		}
	}
	for _, e := range data.Events {
		metrics.SourceIDs = append(metrics.SourceIDs, "/risk-events/"+e.ID.String())
	}
	if len(metrics.SourceIDs) > 200 {
		metrics.SourceIDs = metrics.SourceIDs[:200]
	}
	chart.SourceIDs = metrics.SourceIDs
	table.SourceIDs = metrics.SourceIDs
	return agent.ToolResult{Content: content(map[string]any{"overview": overview, "scope": metrics.ScopeLabel, "snapshotAt": data.GeneratedAt, "href": reportHref, "source": "canonical_quarterly_report", "unitRowsTruncated": len(overview.Units) > 100}), Widgets: []agent.Widget{metrics, chart, table}, OrganizationIDs: ids}, nil
}

func quarterlyReportHref(cycle, comparison string, ids []uuid.UUID) string {
	organizations := make([]string, 0, len(ids))
	for _, id := range ids {
		organizations = append(organizations, id.String())
	}
	query := url.Values{"cycle": {cycle}, "compare_cycle": {comparison}, "org_id": {strings.Join(organizations, ",")}}
	return "/reports?" + query.Encode()
}

func appendUniqueSource(sources []string, href string) []string {
	for _, source := range sources {
		if source == href {
			return sources
		}
	}
	return append(sources, href)
}
