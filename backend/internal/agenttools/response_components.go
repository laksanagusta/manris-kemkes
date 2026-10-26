package agenttools

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/agent"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/repository/postgres"
	reportuc "github.com/manris/backend/internal/usecase/report"
)

func (t *Toolkit) responseDefinitions() []agent.ToolDefinition {
	return []agent.ToolDefinition{
		definition("list_priority_risks", "Tampilkan prioritas tindak lanjut sebagai daftar per risiko dari seluruh snapshot Final aktif periode. Hanya tinggi/sangat tinggi atau tugas pending/overdue yang telah lewat tenggat. Urutan skor tertinggi lalu keterlambatan terlama; paginasi setelah pengurutan. Bawaan kuartal berjalan, 5 hasil. Gunakan untuk pertanyaan mana yang perlu perhatian, bukan menggabungkan sampel tools lain.", object(map[string]any{"organizationIds": list(str()), "cycle": str(), "page": num(1, 10000), "limit": num(1, 100)})),
		definition("compare_periods", "Tampilkan perbandingan ringkasan unit antarkuartal: total risiko, tinggi/sangat tinggi, tugas mitigasi terlambat. Kedua periode dan perubahan absolut berasal dari agregasi laporan resmi, bukan hitungan sampel. Bawaan kuartal selesai terakhir dibanding kuartal sebelumnya. Gunakan untuk ringkasan perubahan antarperiode. Tidak menghasilkan grafik batang atau pengelompokan kategori; untuk grafik atau distribusi per kategori/unit/tingkat gunakan analyze_report.", object(map[string]any{"organizationIds": list(str()), "cycle": str(), "comparisonCycle": str()})),
	}
}

type responseArgs struct {
	OrganizationIDs []uuid.UUID `json:"organizationIds,omitempty"`
	Cycle           string      `json:"cycle,omitempty"`
	ComparisonCycle string      `json:"comparisonCycle,omitempty"`
	Page            int         `json:"page,omitempty"`
	Limit           int         `json:"limit,omitempty"`
}

func (t *Toolkit) executeResponse(ctx context.Context, actor uuid.UUID, name string, raw json.RawMessage) (agent.ToolResult, error) {
	var provided map[string]json.RawMessage
	if err := strictDecode(raw, &provided); err != nil {
		return agent.ToolResult{}, err
	}
	for _, definition := range t.responseDefinitions() {
		if definition.Name != name {
			continue
		}
		var schema struct {
			Properties map[string]any `json:"properties"`
		}
		if err := json.Unmarshal(definition.Parameters, &schema); err != nil {
			return agent.ToolResult{}, agent.ErrInvalid
		}
		for field := range provided {
			if _, ok := schema.Properties[field]; !ok {
				return agent.ToolResult{}, invalid("kolom tool tidak dikenal: " + field)
			}
		}
	}
	var args responseArgs
	if err := strictDecode(raw, &args); err != nil {
		return agent.ToolResult{}, err
	}
	if name == "list_priority_risks" {
		if args.ComparisonCycle != "" {
			return agent.ToolResult{}, agent.ErrInvalid
		}
		if args.Page == 0 {
			args.Page = 1
		}
		if args.Limit == 0 {
			args.Limit = 5
		}
		if args.Page < 1 || args.Page > 10000 || args.Limit < 1 || args.Limit > 100 {
			return agent.ToolResult{}, agent.ErrInvalid
		}
		if args.Cycle == "" {
			args.Cycle = t.currentCycle()
		}
	} else if name != "compare_periods" || args.Page != 0 || args.Limit != 0 {
		return agent.ToolResult{}, agent.ErrInvalid
	}
	if _, err := reportuc.NormalizeAnalysisInput(reportuc.AnalysisInput{OrganizationIDs: args.OrganizationIDs, Cycle: args.Cycle, ComparisonCycle: args.ComparisonCycle}); err != nil {
		return agent.ToolResult{}, safeDomainError(err)
	}
	scope, err := t.resolveScope(ctx, t.pool, actor, false)
	if err != nil {
		return agent.ToolResult{}, err
	}
	ids, err := reportAnalysisScope(scope, args.OrganizationIDs)
	if err != nil {
		return agent.ToolResult{}, err
	}
	data, err := reportuc.NewQuarterlyReportUseCase(postgres.NewQuarterlyReportRepository(t.pool)).Execute(ctx, reportuc.QuarterlyReportInput{Cycle: args.Cycle, ComparisonCycle: args.ComparisonCycle, OrgIDs: ids})
	if err != nil {
		return agent.ToolResult{}, safeDomainError(err)
	}
	sources := reportAnalysisSourceScope(data, ids)
	if err = t.Authorize(ctx, actor, sources); err != nil {
		return agent.ToolResult{}, err
	}
	var w agent.Widget
	if name == "list_priority_risks" {
		w, err = t.priorityWidget(scope, ids, data, args)
	} else {
		w, err = t.comparisonWidget(scope, ids, data)
	}
	if err != nil {
		return agent.ToolResult{}, safeDomainError(err)
	}
	return agent.ToolResult{Content: content(w), Widgets: []agent.Widget{w}, OrganizationIDs: sources}, nil
}

func riskDetail(r *entity.Risk, cycle string) agent.RiskDetail {
	if cycle == "" {
		cycle = r.AssessmentCycle
	}
	d := agent.RiskDetail{ID: r.ID.String(), Code: r.Code, Title: r.Title, Score: reportuc.RiskProfileScore(r), Status: r.Status, Cycle: cycle, Href: "/risk/register/" + r.ID.String(), Causes: r.Cause, Impacts: r.ImpactDesc, Control: r.ExistingControl, Mitigations: []agent.RiskMitigation{}}
	if d.Score != nil {
		d.Level = entity.GetRiskLevelFromNilai(float64(*d.Score))
	}
	if r.OrganizationID != nil {
		d.OrganizationID = r.OrganizationID.String()
	}
	for _, m := range r.Mitigations {
		due := ""
		if m.DueDate != nil {
			due = *m.DueDate
		}
		d.Mitigations = append(d.Mitigations, agent.RiskMitigation{Action: m.Action, Owner: m.Owner, DueDate: due})
	}
	context := fmt.Sprintf("risiko ID %s, organizationId %s, periode %s", d.ID, d.OrganizationID, d.Cycle)
	d.Actions = []agent.WidgetAction{
		{Label: "Lihat mitigasi", Prompt: "Baca rencana dan tugas mitigasi untuk " + context + ". Pertahankan cakupan dan periode ini; jangan mengubah data.", Skills: []string{"risks", "mitigations"}},
		{Label: "Telusuri kejadian", Prompt: "Telusuri kejadian dengan relasi tersimpan untuk " + context + ". Jika alat tidak mendukung filter periode, nyatakan batasnya dan jangan menyebut hasil sebagai khusus periode tersebut.", Skills: []string{"incidents"}},
		{Label: "Susun tindak lanjut", Prompt: "Siapkan usulan tindak lanjut untuk " + context + ". Baca kondisi terbaru; tanyakan informasi wajib yang belum ada. Jangan menyimpan perubahan; tampilkan usulan untuk ditinjau sebelum Terapkan.", Skills: []string{"risks", "mitigations"}},
	}
	return d
}

func scopePrompt(ids []uuid.UUID) string {
	encoded, _ := json.Marshal(ids)
	if len(ids) == 0 {
		return "cakupan global yang diizinkan (organizationIds kosong; jangan menggantinya dengan organisasi sendiri)"
	}
	return "organizationIds " + string(encoded) + " saja"
}

func (t *Toolkit) priorityWidget(scope *entity.AccessScope, ids []uuid.UUID, data *entity.QuarterlyReportData, args responseArgs) (agent.Widget, error) {
	page, err := reportuc.BuildAgentPriorities(data, args.Page, args.Limit)
	if err != nil {
		return agent.Widget{}, err
	}
	w := t.widget("priority_list", "Prioritas tindak lanjut", scope, ids)
	w.SnapshotAt = data.GeneratedAt
	w.Description = fmt.Sprintf("%d dari %d risiko · %s · halaman %d. Urutan skor tertinggi, lalu keterlambatan terlama.", len(page.Items), page.Total, data.Cycle, args.Page)
	w.Warnings = append([]string{}, data.Warnings...)
	w.Priorities = &agent.PriorityList{Items: []agent.PriorityRisk{}, Total: page.Total, Page: args.Page, Limit: args.Limit, Cycle: data.Cycle}
	for _, item := range page.Items {
		d := riskDetail(item.Risk, data.Cycle)
		// A priority preview carries compact profile data, not hidden full details.
		d.Causes = nil
		d.Impacts = nil
		d.Control = ""
		d.Mitigations = nil
		entry := agent.PriorityRisk{Risk: d, Tasks: []agent.PriorityTask{}, OverdueDays: item.LongestOverdueDays, OverdueCount: len(item.Tasks)}
		for _, task := range item.Tasks[:min(5, len(item.Tasks))] {
			entry.Tasks = append(entry.Tasks, agent.PriorityTask{ID: task.ID.String(), Action: task.MitigationAction, Owner: task.MitigationOwner, DueDate: task.DueDate, Href: taskHref(task)})
		}
		w.Priorities.Items = append(w.Priorities.Items, entry)
		w.SourceIDs = appendUniqueSource(w.SourceIDs, d.Href)
	}
	prompt := func(page int) string {
		return fmt.Sprintf("Tampilkan list_priority_risks untuk %s, cycle %s, page %d, limit %d. Pertahankan filter dan urutan yang sama.", scopePrompt(ids), data.Cycle, page, args.Limit)
	}
	w.RefreshAction = &agent.WidgetAction{Label: "Perbarui prioritas", Prompt: prompt(args.Page), Skills: []string{"risks", "mitigations"}}
	if args.Page*args.Limit < page.Total {
		w.Actions = []agent.WidgetAction{{Label: "Lihat lebih banyak", Prompt: prompt(args.Page + 1), Skills: []string{"risks", "mitigations"}}}
	}
	return w, nil
}

func (t *Toolkit) comparisonWidget(scope *entity.AccessScope, ids []uuid.UUID, data *entity.QuarterlyReportData) (agent.Widget, error) {
	w := t.widget("period_comparison", "Perbandingan periode", scope, ids)
	w.SnapshotAt = data.GeneratedAt
	w.Description = "Ringkasan pada unit yang sama. Selisih adalah perubahan jumlah, bukan penilaian otomatis kondisi risiko."
	if len(data.Organizations) == 1 {
		w.Description = "Unit: " + data.Organizations[0].Name + ". " + w.Description
	} else {
		w.Description = fmt.Sprintf("%d unit dalam cakupan. ", len(data.Organizations)) + w.Description
	}
	c := &agent.PeriodComparison{Cycle: data.Cycle, ComparisonCycle: data.ComparisonCycle, Rows: []agent.ComparisonRow{}, Warnings: append([]string{}, data.Warnings...), Href: quarterlyReportHref(data.Cycle, data.ComparisonCycle, ids)}
	for _, metric := range []reportuc.AnalysisMetric{reportuc.AnalysisRisks, reportuc.AnalysisHighRisks, reportuc.AnalysisOverdueTasks} {
		result, err := reportuc.AnalyzeQuarterlyReport(data, reportuc.AnalysisInput{OrganizationIDs: ids, Metric: metric})
		if err != nil {
			return agent.Widget{}, err
		}
		row := agent.ComparisonRow{Label: reportAnalysisMetricLabel(metric)}
		if result.Current.Complete {
			v := result.Current.Count
			row.Current = &v
		}
		if result.Previous != nil && result.Previous.Complete {
			v := result.Previous.Count
			row.Previous = &v
		}
		if row.Current != nil && row.Previous != nil {
			v := *row.Current - *row.Previous
			row.Delta = &v
		}
		c.Rows = append(c.Rows, row)
		for _, warning := range result.Warnings {
			if !strings.Contains(strings.Join(c.Warnings, "\n"), warning) {
				c.Warnings = append(c.Warnings, warning)
			}
		}
	}
	w.Comparison = c
	w.SourceIDs = []string{c.Href}
	w.RefreshAction = &agent.WidgetAction{Label: "Perbarui perbandingan", Prompt: fmt.Sprintf("Gunakan compare_periods untuk %s, cycle %s dan comparisonCycle %s.", scopePrompt(ids), data.Cycle, data.ComparisonCycle), Skills: []string{"reports"}}
	return w, nil
}
