package agentreport

import (
	"fmt"
	"strings"

	"github.com/manris/backend/internal/agent"
)

// Flatten only persisted widget data. Exports never refetch live risk records.
func exportWidget(w agent.Widget) agent.Widget {
	switch w.Type {
	case "risk_detail":
		if w.Risk == nil {
			break
		}
		r := w.Risk
		mitigations := []string{}
		for _, m := range r.Mitigations {
			mitigations = append(mitigations, fmt.Sprintf("%s | PIC: %s | Tenggat: %s", m.Action, m.Owner, m.DueDate))
		}
		w.Columns = []agent.Column{{Key: "code", Label: "Kode"}, {Key: "title", Label: "Risiko"}, {Key: "score", Label: "Nilai"}, {Key: "level", Label: "Tingkat"}, {Key: "status", Label: "Status"}, {Key: "cycle", Label: "Periode"}, {Key: "causes", Label: "Penyebab"}, {Key: "impacts", Label: "Dampak"}, {Key: "control", Label: "Pengendalian"}, {Key: "mitigations", Label: "Rencana mitigasi"}}
		w.Rows = []map[string]any{{"code": r.Code, "title": r.Title, "score": optionalInt(r.Score), "level": r.Level, "status": r.Status, "cycle": r.Cycle, "causes": strings.Join(r.Causes, "\n"), "impacts": strings.Join(r.Impacts, "\n"), "control": r.Control, "mitigations": strings.Join(mitigations, "\n")}}
	case "priority_list":
		if w.Priorities == nil {
			break
		}
		p := w.Priorities
		w.Columns = []agent.Column{{Key: "code", Label: "Kode"}, {Key: "title", Label: "Risiko"}, {Key: "score", Label: "Nilai"}, {Key: "level", Label: "Tingkat"}, {Key: "status", Label: "Status"}, {Key: "cycle", Label: "Periode"}, {Key: "overdue", Label: "Total tugas terlambat"}, {Key: "days", Label: "Keterlambatan terlama (hari)"}, {Key: "tasks", Label: "Tugas ditampilkan (maksimal 5 per risiko)"}}
		w.Rows = []map[string]any{}
		for _, item := range p.Items {
			tasks := []string{}
			for _, task := range item.Tasks {
				tasks = append(tasks, fmt.Sprintf("%s | PIC: %s | Tenggat: %s | %s", task.Action, task.Owner, task.DueDate, task.Href))
			}
			w.Rows = append(w.Rows, map[string]any{"code": item.Risk.Code, "title": item.Risk.Title, "score": optionalInt(item.Risk.Score), "level": item.Risk.Level, "status": item.Risk.Status, "cycle": p.Cycle, "overdue": item.OverdueCount, "days": item.OverdueDays, "tasks": strings.Join(tasks, "\n")})
		}
		w.Description += fmt.Sprintf(" Snapshot halaman %d: %d dari %d risiko; limit %d.", p.Page, len(p.Items), p.Total, p.Limit)
	case "period_comparison":
		if w.Comparison == nil {
			break
		}
		c := w.Comparison
		w.Columns = []agent.Column{{Key: "label", Label: "Metrik"}, {Key: "previous", Label: c.ComparisonCycle}, {Key: "current", Label: c.Cycle}, {Key: "delta", Label: "Perubahan absolut"}}
		w.Rows = []map[string]any{}
		for _, row := range c.Rows {
			w.Rows = append(w.Rows, map[string]any{"label": row.Label, "previous": optionalInt(row.Previous), "current": optionalInt(row.Current), "delta": optionalInt(row.Delta)})
		}
		w.Description += " " + strings.Join(c.Warnings, " ") + " Nilai tidak tersedia bukan nol."
	}
	w.Description += " " + strings.Join(w.Warnings, " ")
	return w
}

func optionalInt(value *int) any {
	if value == nil {
		return nil
	}
	return *value
}

// Excel cells have a character limit; continuation rows retain long mitigation
// plans instead of letting the workbook writer silently truncate the snapshot.
func expandedExportRow(values []any) [][]any {
	parts := make([][]any, len(values))
	height := 1
	for column, value := range values {
		if text, ok := value.(string); ok && len([]rune(text)) > 30000 {
			for _, part := range chunks(text, 30000) {
				parts[column] = append(parts[column], part)
			}
		} else {
			parts[column] = []any{value}
		}
		height = max(height, len(parts[column]))
	}
	rows := make([][]any, height)
	for index := range rows {
		rows[index] = make([]any, len(values))
		for column := range values {
			if index < len(parts[column]) {
				rows[index][column] = parts[column][index]
			}
		}
	}
	return rows
}
