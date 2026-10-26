package agenttools

import (
	"context"
	"encoding/json"
	"net/url"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/agent"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/repository/postgres"
	reportuc "github.com/manris/backend/internal/usecase/report"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

// AnalysisDefinitions is appended only when the reports skill is loaded.
func (t *Toolkit) AnalysisDefinitions() []agent.ToolDefinition {
	return []agent.ToolDefinition{
		definition("analyze_report", "Analisis laporan ad hoc dari seluruh snapshot kuartalan resmi, bukan sampel daftar. Menghasilkan grafik batang bar_chart, tabel dan metrik. Gunakan untuk permintaan grafik/bar chart atau perbandingan per kategori (groupBy=category), unit (organization), tingkat risiko (level); jumlah risiko memakai metric=risks. Kelompokkan menurut organization/category/level. Metrik risks/high_risks/above_appetite menerima filter risiko; overdue_tasks/incidents hanya menurut organisasi tanpa filter risiko. high_risks mencakup tinggi dan sangat_tinggi (nilai dibulatkan >=15); jangan isi level untuk metrik tersebut. Untuk satu tingkat saja gunakan risks + level. Di atas selera >=10. Gunakan list_report_units untuk mencocokkan nama unit dan pilih organizationIds eksplisit; bawaan organisasi sendiri atau cakupan global bila tanpa organisasi. limit hanya membatasi kelompok tampilan, total tetap lengkap. Periode bawaan kuartal selesai terakhir; tidak menyimpan laporan bisnis.", object(map[string]any{
			"organizationIds": list(str()), "cycle": str(), "comparisonCycle": str(),
			"groupBy": enum("organization", "category", "level"), "metric": enum("risks", "high_risks", "above_appetite", "overdue_tasks", "incidents"),
			"category": enum("operasional", "kebijakan", "kepatuhan", "fraud_korupsi", "reputasi", "legal", "unavailable"),
			"level":    enum("sangat_rendah", "rendah", "sedang", "tinggi", "sangat_tinggi", "unavailable"), "query": str(), "limit": num(1, 100),
		})),
		definition("list_report_units", "Cari nama dan ID unit yang boleh dibaca untuk memilih cakupan laporan. Hanya direktori organisasi, tanpa data pribadi. Organisasi turunan tidak otomatis masuk analisis; pilih ID secara eksplisit. Hasil dipaginasi dengan total lengkap.", object(map[string]any{"query": str(), "page": num(1, 10000), "limit": num(1, 100)})),
	}
}

func (t *Toolkit) ExecuteAnalysis(ctx context.Context, actor uuid.UUID, name string, raw json.RawMessage) (agent.ToolResult, error) {
	switch name {
	case "analyze_report":
		var input reportuc.AnalysisInput
		if err := strictDecode(raw, &input); err != nil {
			return agent.ToolResult{}, err
		}
		input, err := reportuc.NormalizeAnalysisInput(input)
		if err != nil {
			return agent.ToolResult{}, safeDomainError(err)
		}
		scope, err := t.resolveScope(ctx, t.pool, actor, false)
		if err != nil {
			return agent.ToolResult{}, err
		}
		ids, err := reportAnalysisScope(scope, input.OrganizationIDs)
		if err != nil {
			return agent.ToolResult{}, err
		}
		input.OrganizationIDs = ids
		data, err := reportuc.NewQuarterlyReportUseCase(postgres.NewQuarterlyReportRepository(t.pool)).Execute(ctx, reportuc.QuarterlyReportInput{Cycle: input.Cycle, ComparisonCycle: input.ComparisonCycle, OrgIDs: ids})
		if err != nil {
			return agent.ToolResult{}, safeDomainError(err)
		}
		result, err := reportuc.AnalyzeQuarterlyReport(data, input)
		if err != nil {
			return agent.ToolResult{}, safeDomainError(err)
		}
		sourceOrgs := reportAnalysisSourceScope(data, ids)
		// Snapshot reads and calculation never freeze the actor's authorization.
		if err = t.Authorize(ctx, actor, sourceOrgs); err != nil {
			return agent.ToolResult{}, err
		}
		return t.reportAnalysisResult(scope, sourceOrgs, data, result), nil
	case "list_report_units":
		return t.listReportUnits(ctx, actor, raw)
	default:
		return agent.ToolResult{}, invalid("tool laporan tidak dikenal")
	}
}

func reportAnalysisScope(scope *entity.AccessScope, requested []uuid.UUID) ([]uuid.UUID, error) {
	if scope == nil {
		return nil, agent.ErrForbidden
	}
	if len(requested) == 0 {
		return readScope(scope, "")
	}
	if len(requested) > 100 {
		return nil, agent.ErrInvalid
	}
	ids := []uuid.UUID{}
	for _, id := range requested {
		if id == uuid.Nil || !scope.CanRead(id) {
			return nil, agent.ErrForbidden
		}
		ids = sourceScope(ids, id)
	}
	return ids, nil
}

func reportAnalysisSourceScope(data *entity.QuarterlyReportData, requested []uuid.UUID) []uuid.UUID {
	ids := sourceScope(nil, requested...)
	for _, org := range data.Organizations {
		ids = sourceScope(ids, org.ID)
	}
	for _, risks := range [][]*entity.QuarterlyReportRisk{data.Risks, data.PreviousRisks} {
		for _, risk := range risks {
			if risk != nil && risk.Risk != nil && risk.OrganizationID != nil {
				ids = sourceScope(ids, *risk.OrganizationID)
			}
		}
	}
	for _, tasks := range [][]*entity.QuarterlyReportTask{data.Tasks, data.PreviousTasks} {
		for _, task := range tasks {
			if task != nil {
				ids = sourceScope(ids, task.OrganizationID)
			}
		}
	}
	for _, event := range data.Events {
		if event != nil {
			ids = sourceScope(ids, event.OrganizationID)
		}
	}
	return ids
}

func (t *Toolkit) reportAnalysisResult(scope *entity.AccessScope, sourceOrgs []uuid.UUID, data *entity.QuarterlyReportData, result *reportuc.AnalysisResult) agent.ToolResult {
	title := reportAnalysisMetricLabel(result.Input.Metric)
	href := reportAnalysisHref(result.Cycle, result.ComparisonCycle, result.Input.OrganizationIDs)
	description := "Populasi lengkap dari snapshot laporan resmi; filter diterapkan sama pada kedua periode. Kelompok tampilan dapat dibatasi; total dihitung sebelum pembatasan. Nilai yang tidak tersedia tidak dihitung sebagai nol."
	filters := []string{"Periode " + result.Cycle + "; pembanding " + result.ComparisonCycle + "."}
	if result.Input.Category != "" {
		filters = append(filters, "Kategori: "+result.Input.Category+".")
	}
	if result.Input.Level != "" {
		filters = append(filters, "Tingkat: "+result.Input.Level+".")
	}
	if result.Input.Query != "" {
		filters = append(filters, "Pencarian: "+result.Input.Query+".")
	}
	description += " " + strings.Join(filters, " ")
	table := t.widget("table", title+" per "+reportAnalysisGroupingLabel(result.Input.GroupBy), scope, result.Input.OrganizationIDs)
	table.SnapshotAt, table.Description = result.SnapshotAt, description
	table.Columns = []agent.Column{{Key: "label", Label: "Kelompok"}, {Key: "value", Label: result.Cycle}, {Key: "knownCount", Label: "Terkonfirmasi"}, {Key: "population", Label: "Populasi"}, {Key: "unavailable", Label: "Nilai tidak tersedia"}, {Key: "previous", Label: result.ComparisonCycle}, {Key: "delta", Label: "Perubahan"}}
	table.Rows = []map[string]any{}
	chart := t.widget("bar_chart", title, scope, result.Input.OrganizationIDs)
	chart.SnapshotAt = result.SnapshotAt
	chart.Description = "Kelompok dengan nilai yang belum lengkap tidak digambar. Lihat tabel untuk jumlah terkonfirmasi dan nilai yang tidak tersedia."
	chart.Columns = []agent.Column{{Key: "label", Label: "Kelompok"}, {Key: "value", Label: "Jumlah"}}
	chart.Rows = []map[string]any{}
	for _, group := range result.Groups {
		var previous, delta any
		if group.Previous != nil {
			previous = reportAnalysisValue(*group.Previous)
		}
		if group.Delta != nil {
			delta = *group.Delta
		}
		rowHref := href
		if result.Input.GroupBy == reportuc.AnalysisByOrganization {
			if id, err := uuid.Parse(group.Key); err == nil {
				rowHref = reportAnalysisHref(result.Cycle, result.ComparisonCycle, []uuid.UUID{id})
			}
		}
		table.Rows = append(table.Rows, map[string]any{"label": group.Label, "value": reportAnalysisValue(group.Current), "knownCount": group.Current.Count, "population": group.Current.Population, "unavailable": group.Current.Unavailable, "previous": previous, "delta": delta, "href": rowHref})
		if group.Current.Complete {
			chart.Rows = append(chart.Rows, map[string]any{"label": group.Label, "value": group.Current.Count, "href": rowHref})
		}
	}
	metrics := t.widget("metrics", "Cakupan analisis", scope, result.Input.OrganizationIDs)
	metrics.SnapshotAt = result.SnapshotAt
	metrics.Description = strings.Join(append(filters, result.Warnings...), " ")
	currentValue := any(result.Current.Count)
	if !result.Current.Complete {
		currentValue = "Tidak tersedia lengkap"
	}
	metrics.Metrics = []agent.Metric{{Label: title, Value: currentValue, Description: "Jumlah pada seluruh populasi yang lolos filter, sebelum pembatasan kelompok."}, {Label: "Populasi", Value: result.Current.Population}, {Label: "Nilai tidak tersedia", Value: result.Current.Unavailable}, {Label: "Kelompok", Value: result.TotalGroups}}
	if !result.Current.Complete {
		metrics.Metrics = append(metrics.Metrics, agent.Metric{Label: "Jumlah terkonfirmasi", Value: result.Current.Count})
	}
	if result.Previous != nil && result.Previous.Complete {
		metrics.Metrics = append(metrics.Metrics, agent.Metric{Label: "Pembanding " + result.ComparisonCycle, Value: result.Previous.Count})
	} else {
		metrics.Metrics = append(metrics.Metrics, agent.Metric{Label: "Pembanding " + result.ComparisonCycle, Value: "Tidak tersedia lengkap"})
	}
	sources := []string{href}
	for _, risks := range [][]*entity.QuarterlyReportRisk{data.Risks, data.PreviousRisks} {
		for _, risk := range risks {
			if risk != nil && risk.Risk != nil && len(sources) < 200 {
				sources = appendUniqueSource(sources, "/risk/register/"+risk.ID.String())
			}
		}
	}
	for _, tasks := range [][]*entity.QuarterlyReportTask{data.Tasks, data.PreviousTasks} {
		for _, task := range tasks {
			if task != nil && task.MitigationTask != nil && len(sources) < 200 {
				sources = appendUniqueSource(sources, taskHref(task.MitigationTask))
			}
		}
	}
	for _, event := range data.Events {
		if event != nil && len(sources) < 200 {
			sources = appendUniqueSource(sources, "/risk-events/"+event.ID.String())
		}
	}
	metrics.SourceIDs, table.SourceIDs, chart.SourceIDs = sources, sources, sources
	return agent.ToolResult{Content: content(struct {
		Analysis *reportuc.AnalysisResult `json:"analysis"`
		Source   string                   `json:"source"`
		Href     string                   `json:"href"`
	}{result, "canonical_quarterly_report", href}), Widgets: []agent.Widget{metrics, table, chart}, OrganizationIDs: sourceOrgs}
}

func reportAnalysisValue(measure reportuc.AnalysisMeasure) any {
	if !measure.Complete {
		return nil
	}
	return measure.Count
}
func reportAnalysisHref(cycle, comparison string, ids []uuid.UUID) string {
	stringsIDs := make([]string, len(ids))
	for i, id := range ids {
		stringsIDs[i] = id.String()
	}
	values := url.Values{"cycle": []string{cycle}, "compare_cycle": []string{comparison}, "org_id": []string{strings.Join(stringsIDs, ",")}}
	return "/reports?" + values.Encode()
}
func reportAnalysisMetricLabel(metric reportuc.AnalysisMetric) string {
	switch metric {
	case reportuc.AnalysisHighRisks:
		return "Risiko tinggi dan sangat tinggi"
	case reportuc.AnalysisAboveAppetite:
		return "Risiko di atas selera"
	case reportuc.AnalysisOverdueTasks:
		return "Tugas mitigasi terlambat"
	case reportuc.AnalysisIncidents:
		return "Kejadian"
	default:
		return "Profil risiko"
	}
}
func reportAnalysisGroupingLabel(grouping reportuc.AnalysisGrouping) string {
	switch grouping {
	case reportuc.AnalysisByCategory:
		return "kategori"
	case reportuc.AnalysisByLevel:
		return "tingkat risiko"
	default:
		return "organisasi"
	}
}

type reportUnitArgs struct {
	Query string `json:"query,omitempty"`
	Page  int    `json:"page,omitempty"`
	Limit int    `json:"limit,omitempty"`
}

func (t *Toolkit) listReportUnits(ctx context.Context, actor uuid.UUID, raw json.RawMessage) (agent.ToolResult, error) {
	var args reportUnitArgs
	if err := strictDecode(raw, &args); err != nil {
		return agent.ToolResult{}, err
	}
	args.Query = strings.TrimSpace(args.Query)
	if args.Page == 0 {
		args.Page = 1
	}
	if args.Limit == 0 {
		args.Limit = 20
	}
	if len(args.Query) > 500 || args.Page < 1 || args.Page > 10000 || args.Limit < 1 || args.Limit > 100 {
		return agent.ToolResult{}, agent.ErrInvalid
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
	var total int
	var allSourceIDs []uuid.UUID
	if err = tx.QueryRow(ctx, `SELECT count(*),array_agg(id ORDER BY id) FROM organizations WHERE ($1::boolean OR id=ANY($2::uuid[])) AND ($3::text='' OR name ILIKE '%'||$3||'%')`, scope.IsGlobal, scope.AccessibleOrgIDs, args.Query).Scan(&total, &allSourceIDs); err != nil {
		return agent.ToolResult{}, safeDomainError(err)
	}
	rows, err := tx.Query(ctx, `SELECT id,name FROM organizations WHERE ($1::boolean OR id=ANY($2::uuid[])) AND ($3::text='' OR name ILIKE '%'||$3||'%') ORDER BY LOWER(name),id LIMIT $4 OFFSET $5`, scope.IsGlobal, scope.AccessibleOrgIDs, args.Query, args.Limit, (args.Page-1)*args.Limit)
	if err != nil {
		return agent.ToolResult{}, safeDomainError(err)
	}
	units := []entity.QuarterlyReportOrganization{}
	for rows.Next() {
		var unit entity.QuarterlyReportOrganization
		if err = rows.Scan(&unit.ID, &unit.Name); err != nil {
			rows.Close()
			return agent.ToolResult{}, safeDomainError(err)
		}
		units = append(units, unit)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return agent.ToolResult{}, safeDomainError(err)
	}
	if err = tx.Commit(ctx); err != nil {
		return agent.ToolResult{}, safeDomainError(err)
	}
	if err = t.Authorize(ctx, actor, allSourceIDs); err != nil {
		return agent.ToolResult{}, err
	}
	cycle, _ := riskuc.PreviousQuarterCycle(t.currentCycle())
	comparison, _ := riskuc.PreviousQuarterCycle(cycle)
	widget := t.widget("table", "Unit yang dapat dipilih untuk laporan", scope, allSourceIDs)
	widget.Description = "Direktori unit yang diizinkan. Cakupan analisis tetap organisasi sendiri sampai unit lain dipilih eksplisit."
	widget.Columns = []agent.Column{{Key: "name", Label: "Unit"}, {Key: "id", Label: "Referensi unit"}}
	widget.Rows = []map[string]any{}
	for _, unit := range units {
		widget.Rows = append(widget.Rows, map[string]any{"id": unit.ID.String(), "name": unit.Name, "href": reportAnalysisHref(cycle, comparison, []uuid.UUID{unit.ID})})
		widget.SourceIDs = append(widget.SourceIDs, reportAnalysisHref(cycle, comparison, []uuid.UUID{unit.ID}))
	}
	return agent.ToolResult{Content: content(map[string]any{"units": units, "total": total, "page": args.Page, "limit": args.Limit, "hasMore": args.Page*args.Limit < total, "populationComplete": true, "defaultOrganizationId": scope.OrganizationID, "instruction": "Pilih organizationIds eksplisit untuk analisis unit turunan. Nama unit bukan bukti bahwa data risikonya sudah dibaca."}), Widgets: []agent.Widget{widget}, OrganizationIDs: allSourceIDs}, nil
}
