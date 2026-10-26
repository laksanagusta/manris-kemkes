package report

import (
	"math"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/timeutil"
)

type AgentPriorityItem struct {
	Risk               *entity.Risk
	Score              *int
	Tasks              []*entity.MitigationTask
	LongestOverdueDays int
}
type AgentPriorityPage struct {
	Items []AgentPriorityItem
	Total int
}

// BuildAgentPriorities ranks the complete authorized canonical period snapshot.
// Unknown scores sort after known scores, without being turned into zeros.
func BuildAgentPriorities(data *entity.QuarterlyReportData, page, limit int) (*AgentPriorityPage, error) {
	if data == nil || page < 1 || page > 10000 || limit < 1 || limit > 100 {
		return nil, analysisInvalid("paginasi prioritas tidak valid")
	}
	today := data.GeneratedAt.In(timeutil.JakartaLocation()).Format("2006-01-02")
	tasksByRisk := map[uuid.UUID][]*entity.MitigationTask{}
	seenTasks := map[uuid.UUID]bool{}
	for _, item := range data.Tasks {
		if item == nil || item.MitigationTask == nil || seenTasks[item.ID] {
			continue
		}
		task := item.MitigationTask
		due := quarterlyCalendarDate(task.DueDate, timeutil.JakartaLocation())
		if (task.Status != entity.MitigationTaskStatusPending && task.Status != entity.MitigationTaskStatusOverdue) || due == "" || due >= today {
			continue
		}
		seenTasks[task.ID] = true
		group := item.VersionGroupID
		if group == uuid.Nil {
			group = task.RiskID
		}
		tasksByRisk[group] = append(tasksByRisk[group], task)
	}
	items := []AgentPriorityItem{}
	seenRisks := map[uuid.UUID]bool{}
	for _, item := range data.Risks {
		if item == nil || item.Risk == nil || seenRisks[item.ID] {
			continue
		}
		r := item.Risk
		seenRisks[r.ID] = true
		entry := AgentPriorityItem{Risk: r, Tasks: append([]*entity.MitigationTask{}, tasksByRisk[quarterlyRiskGroupID(r)]...)}
		entry.Score = RiskProfileScore(r)
		if (entry.Score == nil || *entry.Score < 15) && len(entry.Tasks) == 0 {
			continue
		}
		sort.Slice(entry.Tasks, func(i, j int) bool {
			a, b := quarterlyCalendarDate(entry.Tasks[i].DueDate, timeutil.JakartaLocation()), quarterlyCalendarDate(entry.Tasks[j].DueDate, timeutil.JakartaLocation())
			if a != b {
				return a < b
			}
			return entry.Tasks[i].ID.String() < entry.Tasks[j].ID.String()
		})
		if len(entry.Tasks) > 0 {
			// Calendar-day arithmetic avoids UTC and daylight-saving boundary errors.
			due := quarterlyCalendarDate(entry.Tasks[0].DueDate, timeutil.JakartaLocation())
			entry.LongestOverdueDays = calendarDaysBetween(due, today)
		}
		items = append(items, entry)
	}
	sort.Slice(items, func(i, j int) bool {
		a, b := items[i], items[j]
		if a.Score == nil && b.Score != nil {
			return false
		}
		if a.Score != nil && b.Score == nil {
			return true
		}
		if a.Score != nil && b.Score != nil && *a.Score != *b.Score {
			return *a.Score > *b.Score
		}
		if a.LongestOverdueDays != b.LongestOverdueDays {
			return a.LongestOverdueDays > b.LongestOverdueDays
		}
		if a.Risk.Code != b.Risk.Code {
			return a.Risk.Code < b.Risk.Code
		}
		return a.Risk.ID.String() < b.Risk.ID.String()
	})
	total := len(items)
	start := min((page-1)*limit, total)
	return &AgentPriorityPage{Items: items[start:min(start+limit, total)], Total: total}, nil
}

func RiskProfileScore(r *entity.Risk) *int {
	if r == nil {
		return nil
	}
	if score := analysisScore(r); score != nil {
		v := int(math.Round(*score))
		return &v
	}
	return nil
}

func calendarDaysBetween(before, after string) int {
	a, _ := time.Parse("2006-01-02", before)
	b, _ := time.Parse("2006-01-02", after)
	return int(b.Sub(a) / (24 * time.Hour))
}
