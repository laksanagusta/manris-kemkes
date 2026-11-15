package report

import (
	"fmt"
	"sort"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type UnitProgressPageFilter struct {
	Tab           string
	UnitID        string
	Query         string
	AttentionOnly bool
	Status        string
	Page          int
	Limit         int
}

type UnitProgressMonitoringSummary struct {
	Total      int `json:"total"`
	NotStarted int `json:"notStarted"`
	Drafts     int `json:"drafts"`
	Final      int `json:"final"`
}

type UnitProgressGroup struct {
	ID                 uuid.UUID                         `json:"id"`
	Name               string                            `json:"name"`
	Papers             []entity.UnitProgressWorkingPaper `json:"papers"`
	Risks              []entity.UnitProgressRisk         `json:"risks"`
	Evaluations        []entity.UnitProgressItem         `json:"evaluations"`
	Mitigations        []entity.UnitProgressMitigation   `json:"mitigations"`
	Monitoring         UnitProgressMonitoringSummary     `json:"monitoring"`
	RiskDrafts         int                               `json:"riskDrafts"`
	MitigationReported int                               `json:"mitigationReported"`
	MitigationTotal    int                               `json:"mitigationTotal"`
	EvaluationTotal    int                               `json:"evaluationTotal"`
	EvaluationDrafts   int                               `json:"evaluationDrafts"`
	Attention          []string                          `json:"attention"`
}

type UnitProgressPage struct {
	Cycle               string               `json:"cycle"`
	MonitoringAvailable bool                 `json:"monitoringAvailable"`
	Groups              []*UnitProgressGroup `json:"groups"`
	SelectedUnit        *UnitProgressGroup   `json:"selectedUnit,omitempty"`
	Statuses            []string             `json:"statuses"`
	Total               int                  `json:"total"`
	Page                int                  `json:"page"`
	Limit               int                  `json:"limit"`
}

type unitProgressPageRow struct {
	unit   *UnitProgressGroup
	index  int
	status string
}

// PaginateUnitProgressReport projects one table from the consistent report snapshot.
// Counts and follow-up predicates are computed across the entire authorized report.
func PaginateUnitProgressReport(report *entity.UnitProgressReport, filter UnitProgressPageFilter) *UnitProgressPage {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 {
		filter.Limit = 20
	}
	if filter.Limit > 100 {
		filter.Limit = 100
	}
	groups := buildUnitProgressGroups(report)
	result := &UnitProgressPage{
		Cycle: report.Cycle, MonitoringAvailable: report.MonitoringAvailable,
		Groups: []*UnitProgressGroup{}, Statuses: []string{}, Page: filter.Page, Limit: filter.Limit,
	}
	query := strings.ToLower(strings.TrimSpace(filter.Query))
	rows := []unitProgressPageRow{}
	statuses := map[string]bool{}
	for _, group := range groups {
		if filter.Tab != "summary" && filter.UnitID == group.ID.String() {
			result.SelectedUnit = compactUnitProgressGroup(group)
		}
		if !strings.Contains(strings.ToLower(group.Name), query) || (filter.AttentionOnly && len(group.Attention) == 0) {
			continue
		}
		if filter.Tab != "summary" && filter.UnitID != "" && filter.UnitID != group.ID.String() {
			continue
		}
		for _, row := range unitProgressRows(group, filter) {
			if row.status != "" {
				statuses[row.status] = true
			}
			if filter.Status == "" || filter.Status == "all" || row.status == filter.Status {
				rows = append(rows, row)
			}
		}
	}
	for status := range statuses {
		result.Statuses = append(result.Statuses, status)
	}
	sort.Strings(result.Statuses)
	result.Total = len(rows)
	lastPage := max(1, (result.Total+filter.Limit-1)/filter.Limit)
	if result.Page > lastPage {
		result.Page = lastPage
	}
	start := (result.Page - 1) * filter.Limit
	end := min(start+filter.Limit, len(rows))
	byID := map[uuid.UUID]*UnitProgressGroup{}
	for _, row := range rows[start:end] {
		group := byID[row.unit.ID]
		if group == nil {
			group = compactUnitProgressGroup(row.unit)
			byID[group.ID] = group
			result.Groups = append(result.Groups, group)
		}
		switch filter.Tab {
		case "papers":
			if row.index >= 0 {
				group.Papers = append(group.Papers, row.unit.Papers[row.index])
			}
		case "evaluations":
			if row.index >= 0 {
				group.Evaluations = append(group.Evaluations, row.unit.Evaluations[row.index])
			}
		case "mitigations":
			if row.index >= 0 {
				group.Mitigations = append(group.Mitigations, row.unit.Mitigations[row.index])
			}
		case "monitoring":
			if filter.UnitID != "" && row.index >= 0 {
				group.Risks = append(group.Risks, row.unit.Risks[row.index])
			}
		default:
			if len(row.unit.Papers) > 0 {
				group.Papers = row.unit.Papers[:1]
			}
			if len(row.unit.Evaluations) > 0 {
				group.Evaluations = row.unit.Evaluations[:1]
			}
		}
	}
	return result
}

func compactUnitProgressGroup(group *UnitProgressGroup) *UnitProgressGroup {
	copy := *group
	copy.Papers = []entity.UnitProgressWorkingPaper{}
	copy.Risks = []entity.UnitProgressRisk{}
	copy.Evaluations = []entity.UnitProgressItem{}
	copy.Mitigations = []entity.UnitProgressMitigation{}
	return &copy
}

func unitProgressRows(group *UnitProgressGroup, filter UnitProgressPageFilter) []unitProgressPageRow {
	rows := []unitProgressPageRow{}
	switch filter.Tab {
	case "papers":
		for i, item := range group.Papers {
			rows = append(rows, unitProgressPageRow{group, i, item.Status})
		}
		if len(rows) == 0 {
			rows = append(rows, unitProgressPageRow{group, -1, "missing"})
		}
	case "evaluations":
		for i, item := range group.Evaluations {
			rows = append(rows, unitProgressPageRow{group, i, item.Status})
		}
		if len(rows) == 0 {
			rows = append(rows, unitProgressPageRow{group, -1, "missing"})
		}
	case "mitigations":
		for i, item := range group.Mitigations {
			rows = append(rows, unitProgressPageRow{group, i, item.Status})
		}
		if len(rows) == 0 {
			rows = append(rows, unitProgressPageRow{group, -1, "none"})
		}
	case "monitoring":
		if filter.UnitID == "" {
			return []unitProgressPageRow{{group, -1, ""}}
		}
		for i, item := range group.Risks {
			if item.Status != "final" {
				continue
			}
			status := item.MonitoringStatus
			if status == "" {
				status = "not_started"
			}
			rows = append(rows, unitProgressPageRow{group, i, status})
		}
	default:
		return []unitProgressPageRow{{group, -1, ""}}
	}
	return rows
}

func buildUnitProgressGroups(report *entity.UnitProgressReport) []*UnitProgressGroup {
	groups := []*UnitProgressGroup{}
	byID := map[uuid.UUID]*UnitProgressGroup{}
	for _, org := range report.Organizations {
		group := &UnitProgressGroup{ID: org.ID, Name: org.Name, Attention: []string{}}
		groups = append(groups, group)
		byID[org.ID] = group
	}
	for _, item := range report.WorkingPapers {
		if group := byID[item.OrganizationID]; group != nil {
			group.Papers = append(group.Papers, item)
		}
	}
	for _, item := range report.Evaluations {
		if group := byID[item.OrganizationID]; group != nil {
			group.Evaluations = append(group.Evaluations, item)
			group.EvaluationTotal++
			if item.Status == "draft" {
				group.EvaluationDrafts++
			}
		}
	}
	for _, item := range report.Mitigations {
		if group := byID[item.OrganizationID]; group != nil {
			group.Mitigations = append(group.Mitigations, item)
			group.MitigationTotal++
			if item.Status == "reported" {
				group.MitigationReported++
			}
		}
	}
	for _, item := range report.Risks {
		if group := byID[item.OrganizationID]; group != nil {
			group.Risks = append(group.Risks, item)
			if item.Status == "draft" {
				group.RiskDrafts++
				continue
			}
			group.Monitoring.Total++
			switch item.MonitoringStatus {
			case "final":
				group.Monitoring.Final++
			case "draft":
				group.Monitoring.Drafts++
			default:
				group.Monitoring.NotStarted++
			}
		}
	}
	for _, group := range groups {
		overdue, incomplete := 0, 0
		for _, item := range group.Mitigations {
			if item.Overdue || item.Status == "not_reported" {
				overdue++
			}
			if item.Status == "incomplete" && !item.Overdue {
				incomplete++
			}
		}
		addProgressAttention(group, overdue, incomplete, report.MonitoringAvailable)
	}
	return groups
}

func addProgressAttention(group *UnitProgressGroup, overdue, incomplete int, monitoringAvailable bool) {
	if overdue > 0 {
		group.Attention = append(group.Attention, fmt.Sprintf("%d laporan mitigasi lewat tenggat atau tidak dilaporkan", overdue))
	}
	if incomplete > 0 {
		group.Attention = append(group.Attention, fmt.Sprintf("%d laporan mitigasi belum lengkap", incomplete))
	}
	if len(group.Papers) > 0 {
		switch group.Papers[0].Status {
		case "signing":
			group.Attention = append(group.Attention, "KK Pemantauan dan Reviu menunggu TTE")
		case "draft":
			group.Attention = append(group.Attention, "KK Pemantauan dan Reviu masih draf")
		}
	}
	if group.RiskDrafts > 0 {
		group.Attention = append(group.Attention, fmt.Sprintf("%d risiko masih draf", group.RiskDrafts))
	}
	if group.EvaluationDrafts > 0 {
		group.Attention = append(group.Attention, fmt.Sprintf("%d evaluasi masih draf", group.EvaluationDrafts))
	}
	pending := group.Monitoring.Drafts
	if monitoringAvailable {
		pending += group.Monitoring.NotStarted
	}
	if pending > 0 {
		group.Attention = append(group.Attention, fmt.Sprintf("%d pemantauan belum final", pending))
	}
}
