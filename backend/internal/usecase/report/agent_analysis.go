package report

import (
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

type AnalysisGrouping string
type AnalysisMetric string

const (
	AnalysisByOrganization AnalysisGrouping = "organization"
	AnalysisByCategory     AnalysisGrouping = "category"
	AnalysisByLevel        AnalysisGrouping = "level"
	AnalysisRisks          AnalysisMetric   = "risks"
	AnalysisHighRisks      AnalysisMetric   = "high_risks"
	AnalysisAboveAppetite  AnalysisMetric   = "above_appetite"
	AnalysisOverdueTasks   AnalysisMetric   = "overdue_tasks"
	AnalysisIncidents      AnalysisMetric   = "incidents"
)

// AnalysisInput is a bounded query over the complete canonical period snapshot.
// OrganizationIDs is already authorized by the caller; it is also applied here
// so a broader supplied snapshot cannot accidentally broaden the calculation.
type AnalysisInput struct {
	OrganizationIDs []uuid.UUID      `json:"organizationIds,omitempty"`
	Cycle           string           `json:"cycle,omitempty"`
	ComparisonCycle string           `json:"comparisonCycle,omitempty"`
	GroupBy         AnalysisGrouping `json:"groupBy"`
	Metric          AnalysisMetric   `json:"metric"`
	Category        string           `json:"category,omitempty"`
	Level           string           `json:"level,omitempty"`
	Query           string           `json:"query,omitempty"`
	Limit           int              `json:"limit"`
}

// Count is the known numerator; Population is its complete filtered denominator.
// Unavailable counts profiles without a score, even when all profiles can still
// be counted for the risks metric. Complete says whether that metric is exact.
// A measure with Complete=false must not be displayed as an exact zero/count.
type AnalysisMeasure struct {
	Count       int  `json:"count"`
	Population  int  `json:"population"`
	Unavailable int  `json:"unavailable"`
	Complete    bool `json:"complete"`
}
type AnalysisGroup struct {
	Key      string           `json:"key"`
	Label    string           `json:"label"`
	Current  AnalysisMeasure  `json:"current"`
	Previous *AnalysisMeasure `json:"previous"`
	Delta    *int             `json:"delta"`
}
type AnalysisResult struct {
	Input                 AnalysisInput    `json:"input"`
	Cycle                 string           `json:"cycle"`
	ComparisonCycle       string           `json:"comparisonCycle"`
	SnapshotAt            time.Time        `json:"snapshotAt"`
	SnapshotHash          string           `json:"snapshotHash"`
	Current               AnalysisMeasure  `json:"current"`
	Previous              *AnalysisMeasure `json:"previous"`
	UnknownScores         int              `json:"unknownScores"`
	PreviousUnknownScores *int             `json:"previousUnknownScores"`
	TotalGroups           int              `json:"totalGroups"`
	ReturnedGroups        int              `json:"returnedGroups"`
	PopulationComplete    bool             `json:"populationComplete"`
	RowsTruncated         bool             `json:"rowsTruncated"`
	Warnings              []string         `json:"warnings"`
	Groups                []AnalysisGroup  `json:"groups"`
}

func NormalizeAnalysisInput(input AnalysisInput) (AnalysisInput, error) {
	if input.GroupBy == "" {
		input.GroupBy = AnalysisByOrganization
	}
	if input.Metric == "" {
		input.Metric = AnalysisRisks
	}
	if input.Limit == 0 {
		input.Limit = 20
	}
	if input.Limit < 1 || input.Limit > 100 || len(input.OrganizationIDs) > 100 {
		return input, analysisInvalid("maksimal 100 unit/baris dan limit harus 1–100")
	}
	for _, cycle := range []string{input.Cycle, input.ComparisonCycle} {
		if cycle != "" && (!riskuc.IsValidQuarterFormat(cycle) || strings.HasPrefix(cycle, "0000-")) {
			return input, analysisInvalid("periode harus YYYY-Q[1-4]")
		}
	}
	if input.GroupBy != AnalysisByOrganization && input.GroupBy != AnalysisByCategory && input.GroupBy != AnalysisByLevel {
		return input, analysisInvalid("pengelompokan tidak didukung")
	}
	switch input.Metric {
	case AnalysisRisks, AnalysisHighRisks, AnalysisAboveAppetite, AnalysisOverdueTasks, AnalysisIncidents:
	default:
		return input, analysisInvalid("metrik tidak didukung")
	}
	input.Category, input.Level, input.Query = strings.TrimSpace(input.Category), strings.TrimSpace(input.Level), strings.TrimSpace(input.Query)
	if (input.Category != "" && input.Category != "unavailable" && !entity.IsValidRiskCategory(input.Category)) || (input.Level != "" && !analysisLevel(input.Level)) || len(input.Query) > 500 {
		return input, analysisInvalid("filter kategori, tingkat, atau pencarian tidak valid")
	}
	if input.Metric == AnalysisHighRisks && input.Level != "" {
		return input, analysisInvalid("high_risks mencakup tinggi dan sangat_tinggi; jangan tambahkan filter level. Untuk satu tingkat tertentu gunakan metric risks dengan level yang diminta")
	}
	if input.Metric == AnalysisOverdueTasks || input.Metric == AnalysisIncidents {
		if input.GroupBy != AnalysisByOrganization || input.Category != "" || input.Level != "" || input.Query != "" {
			return input, analysisInvalid("metrik tugas/kejadian hanya per organisasi dan tidak menerima filter risiko")
		}
	}
	seen := map[uuid.UUID]bool{}
	ids := []uuid.UUID{}
	for _, id := range input.OrganizationIDs {
		if id == uuid.Nil {
			return input, analysisInvalid("ID organisasi tidak valid")
		}
		if !seen[id] {
			ids, seen[id] = append(ids, id), true
		}
	}
	sort.Slice(ids, func(i, j int) bool { return ids[i].String() < ids[j].String() })
	input.OrganizationIDs = ids
	return input, nil
}

func AnalyzeQuarterlyReport(data *entity.QuarterlyReportData, input AnalysisInput) (*AnalysisResult, error) {
	input, err := NormalizeAnalysisInput(input)
	if err != nil {
		return nil, err
	}
	if data == nil || (input.Cycle != "" && input.Cycle != data.Cycle) || (input.ComparisonCycle != "" && input.ComparisonCycle != data.ComparisonCycle) {
		return nil, analysisInvalid("snapshot dan periode analisis tidak sesuai")
	}
	input.Cycle, input.ComparisonCycle = data.Cycle, data.ComparisonCycle
	selected := analysisScopedData(data, input.OrganizationIDs)
	result := &AnalysisResult{Input: input, Cycle: data.Cycle, ComparisonCycle: data.ComparisonCycle, SnapshotAt: data.GeneratedAt, SnapshotHash: data.SnapshotHash, PopulationComplete: true, Warnings: append([]string{}, data.Warnings...), Groups: []AnalysisGroup{}}
	groups := map[string]*AnalysisGroup{}
	previousAvailable := input.Metric != AnalysisIncidents
	group := func(key, label string) *AnalysisGroup {
		if groups[key] == nil {
			g := &AnalysisGroup{Key: key, Label: label, Current: AnalysisMeasure{Complete: true}}
			if previousAvailable {
				g.Previous = &AnalysisMeasure{Complete: true}
			}
			groups[key] = g
		}
		return groups[key]
	}
	if input.GroupBy == AnalysisByOrganization {
		for _, org := range selected.Organizations {
			group(org.ID.String(), org.Name)
		}
	}
	if input.Metric == AnalysisOverdueTasks || input.Metric == AnalysisIncidents {
		// Reuse the canonical per-unit finalization/deadline/deduplication rules.
		current := BuildQuarterlyReportOverview(selected)
		previousData := *selected
		previousData.Cycle, previousData.ComparisonCycle = selected.ComparisonCycle, selected.Cycle
		previousData.Risks, previousData.Tasks, previousData.Events = selected.PreviousRisks, selected.PreviousTasks, nil
		previous := BuildQuarterlyReportOverview(&previousData)
		for period, overview := range []*entity.QuarterlyReportOverview{current, previous} {
			if period == 1 && !previousAvailable {
				continue
			}
			for _, unit := range overview.Units {
				measure := &group(unit.ID, unit.Name).Current
				if period == 1 {
					measure = group(unit.ID, unit.Name).Previous
				}
				if input.Metric == AnalysisOverdueTasks {
					measure.Count, measure.Population = unit.Summary.Mitigation.Overdue, unit.Summary.Mitigation.Total
				} else {
					measure.Count, measure.Population = unit.Summary.Events.Total, unit.Summary.Events.Total
				}
			}
		}
	} else {
		for period, risks := range [][]*entity.QuarterlyReportRisk{selected.Risks, selected.PreviousRisks} {
			for _, item := range risks {
				if item == nil || item.Risk == nil || !analysisRiskMatches(item.Risk, input) {
					continue
				}
				risk := item.Risk
				score := analysisScore(risk)
				if score == nil {
					if period == 0 {
						result.UnknownScores++
					} else {
						if result.PreviousUnknownScores == nil {
							value := 0
							result.PreviousUnknownScores = &value
						}
						*result.PreviousUnknownScores++
					}
				}
				key, label := analysisRiskGroup(risk, score, input.GroupBy)
				g := group(key, label)
				measure := &g.Current
				if period == 1 {
					measure = g.Previous
				}
				measure.Population++
				if score == nil {
					measure.Unavailable++
				}
				if input.Metric == AnalysisRisks {
					measure.Count++
				} else if score == nil {
					measure.Complete = false
				} else if (input.Metric == AnalysisHighRisks && math.Round(*score) >= 15) || (input.Metric == AnalysisAboveAppetite && math.Round(*score) >= 10) {
					measure.Count++
				}
			}
		}
	}
	result.Current.Complete = true
	if previousAvailable {
		result.Previous = &AnalysisMeasure{Complete: true}
		if result.PreviousUnknownScores == nil {
			value := 0
			result.PreviousUnknownScores = &value
		}
	} else {
		result.Warnings = append(result.Warnings, "Kejadian periode pembanding tidak dimuat sumber laporan; nilai pembanding dan perubahan tidak tersedia.")
	}
	for _, g := range groups {
		addAnalysisMeasure(&result.Current, g.Current)
		if previousAvailable {
			addAnalysisMeasure(result.Previous, *g.Previous)
			if g.Current.Complete && g.Previous.Complete {
				delta := g.Current.Count - g.Previous.Count
				g.Delta = &delta
			}
		}
		result.Groups = append(result.Groups, *g)
	}
	sort.Slice(result.Groups, func(i, j int) bool {
		a, b := result.Groups[i], result.Groups[j]
		if a.Current.Count != b.Current.Count {
			return a.Current.Count > b.Current.Count
		}
		if strings.ToLower(a.Label) != strings.ToLower(b.Label) {
			return strings.ToLower(a.Label) < strings.ToLower(b.Label)
		}
		return a.Key < b.Key
	})
	result.TotalGroups = len(result.Groups)
	if len(result.Groups) > input.Limit {
		result.Groups = result.Groups[:input.Limit]
		result.RowsTruncated = true
	}
	result.ReturnedGroups = len(result.Groups)
	if !result.Current.Complete {
		result.Warnings = append(result.Warnings, "Sebagian nilai risiko tidak tersedia; jumlah terkonfirmasi bukan jumlah final untuk profil tanpa nilai.")
	}
	return result, nil
}

func analysisScopedData(data *entity.QuarterlyReportData, ids []uuid.UUID) *entity.QuarterlyReportData {
	selected := *data
	allowed := map[uuid.UUID]bool{}
	for _, id := range ids {
		allowed[id] = true
	}
	includes := func(id uuid.UUID) bool { return len(ids) == 0 || allowed[id] }
	selected.Organizations = []entity.QuarterlyReportOrganization{}
	for _, org := range data.Organizations {
		if includes(org.ID) {
			selected.Organizations = append(selected.Organizations, org)
		}
	}
	filterRisks := func(risks []*entity.QuarterlyReportRisk) []*entity.QuarterlyReportRisk {
		out := []*entity.QuarterlyReportRisk{}
		for _, risk := range risks {
			if risk != nil && risk.Risk != nil && (len(ids) == 0 || (risk.OrganizationID != nil && includes(*risk.OrganizationID))) {
				out = append(out, risk)
			}
		}
		return out
	}
	filterTasks := func(tasks []*entity.QuarterlyReportTask) []*entity.QuarterlyReportTask {
		out := []*entity.QuarterlyReportTask{}
		for _, task := range tasks {
			if task != nil && task.MitigationTask != nil && includes(task.OrganizationID) {
				out = append(out, task)
			}
		}
		return out
	}
	selected.Risks, selected.PreviousRisks = filterRisks(data.Risks), filterRisks(data.PreviousRisks)
	selected.Tasks, selected.PreviousTasks = filterTasks(data.Tasks), filterTasks(data.PreviousTasks)
	selected.Events = []*entity.RiskEvent{}
	for _, event := range data.Events {
		if event != nil && includes(event.OrganizationID) {
			selected.Events = append(selected.Events, event)
		}
	}
	return &selected
}

func analysisRiskMatches(risk *entity.Risk, input AnalysisInput) bool {
	category := risk.Category
	if !entity.IsValidRiskCategory(category) {
		category = "unavailable"
	}
	level := "unavailable"
	if score := analysisScore(risk); score != nil {
		level = entity.GetRiskLevelFromNilai(*score)
	}
	return (input.Category == "" || input.Category == category) && (input.Level == "" || input.Level == level) && (input.Query == "" || strings.Contains(strings.ToLower(risk.Code+" "+risk.Title+" "+risk.Description), strings.ToLower(input.Query)))
}
func analysisRiskGroup(risk *entity.Risk, score *float64, grouping AnalysisGrouping) (string, string) {
	switch grouping {
	case AnalysisByCategory:
		labels := map[string]string{"operasional": "Operasional", "kebijakan": "Kebijakan", "kepatuhan": "Kepatuhan", "fraud_korupsi": "Fraud dan korupsi", "reputasi": "Reputasi", "legal": "Legal"}
		if label := labels[risk.Category]; label != "" {
			return risk.Category, label
		}
		return "unavailable", "Kategori tidak tersedia"
	case AnalysisByLevel:
		if score == nil {
			return "unavailable", "Nilai tidak tersedia"
		}
		level := entity.GetRiskLevelFromNilai(*score)
		return level, entity.GetRiskLevelDisplay(level)
	default:
		if risk.OrganizationID == nil {
			return "unavailable", "Organisasi tidak tersedia"
		}
		label := risk.OrgName
		if label == "" {
			label = risk.OrganizationID.String()
		}
		return risk.OrganizationID.String(), label
	}
}
func analysisScore(risk *entity.Risk) *float64 {
	score := quarterlyProfileValue(risk)
	if score == nil || math.IsNaN(*score) || math.IsInf(*score, 0) {
		return nil
	}
	return score
}
func analysisLevel(level string) bool {
	switch level {
	case "unavailable", entity.RiskLevelSangatRendah, entity.RiskLevelRendah, entity.RiskLevelSedang, entity.RiskLevelTinggi, entity.RiskLevelSangatTinggi:
		return true
	}
	return false
}
func addAnalysisMeasure(total *AnalysisMeasure, value AnalysisMeasure) {
	total.Count += value.Count
	total.Population += value.Population
	total.Unavailable += value.Unavailable
	total.Complete = total.Complete && value.Complete
}
func analysisInvalid(message string) error {
	return fmt.Errorf("%w: %s", domainerrors.ErrInvalidInput, message)
}
