package performancerisk

import (
	"math"
	"time"

	"github.com/manris/backend/internal/domain/entity"
)

func BuildNodeMetrics(risks []*entity.PerformanceRiskRiskRow, now time.Time) entity.PerformanceRiskMetrics {
	var out entity.PerformanceRiskMetrics
	if now.IsZero() {
		now = time.Now()
	}

	if len(risks) == 0 {
		out.AttentionStatus = entity.PerformanceRiskAttentionNoRisk
		return out
	}

	truncatedNow := truncateDate(now)
	totalExposure := 0
	progressTotal := 0
	progressDone := 0
	progressPending := 0
	progressOverdue := 0

	for _, risk := range risks {
		if risk == nil {
			continue
		}

		out.RiskCount++
		totalExposure += risk.InherentScore

		if risk.InherentScore > out.HighestInherentScore {
			out.HighestInherentScore = risk.InherentScore
		}

		level := entity.GetRiskLevelFromNilai(float64(risk.InherentScore))
		if level == entity.RiskLevelTinggi || level == entity.RiskLevelSangatTinggi {
			out.HighExtremeCount++
		}

		if risk.Probability >= 1 && risk.Probability <= 5 && risk.Impact >= 1 && risk.Impact <= 5 {
			out.Heatmap[risk.Probability-1][risk.Impact-1]++
		}

		out.MitigationProgressDone += risk.MitigationDoneCount
		out.MitigationProgressPending += risk.MitigationPendingCount
		out.MitigationProgressOverdue += risk.MitigationOverdueCount

		for _, dueDate := range risk.MitigationDueDates {
			if dueDate == "" {
				continue
			}

			out.MitigationTotal++
			parsed, err := time.Parse("2006-01-02", dueDate)
			if err == nil && parsed.Before(truncatedNow) {
				out.MitigationOverdue++
			} else {
				out.MitigationPending++
			}
		}
	}

	if out.RiskCount == 0 {
		out.AttentionStatus = entity.PerformanceRiskAttentionNoRisk
		return out
	}

	out.TotalExposure = totalExposure
	out.AvgExposure = math.Round((float64(totalExposure)/float64(out.RiskCount))*100) / 100
	out.HighestLevel = entity.GetRiskLevelFromNilai(float64(out.HighestInherentScore))
	progressDone = out.MitigationProgressDone
	progressPending = out.MitigationProgressPending
	progressOverdue = out.MitigationProgressOverdue
	progressTotal = progressDone + progressPending + progressOverdue
	out.MitigationProgressTotal = progressTotal
	if progressTotal > 0 {
		out.MitigationProgressPercent = math.Round((float64(progressDone)/float64(progressTotal))*1000) / 10
	}
	out.AttentionStatus = resolveAttentionStatus(out)
	return out
}

func resolveAttentionStatus(metrics entity.PerformanceRiskMetrics) entity.PerformanceRiskAttentionStatus {
	if metrics.RiskCount == 0 {
		return entity.PerformanceRiskAttentionNoRisk
	}
	if metrics.HighestLevel == entity.RiskLevelSangatTinggi {
		return entity.PerformanceRiskAttentionCritical
	}
	if metrics.HighestLevel == entity.RiskLevelTinggi && metrics.MitigationOverdue > 0 {
		return entity.PerformanceRiskAttentionCritical
	}
	if metrics.HighestLevel == entity.RiskLevelTinggi || metrics.MitigationOverdue > 0 {
		return entity.PerformanceRiskAttentionWatch
	}
	return entity.PerformanceRiskAttentionStable
}

func truncateDate(value time.Time) time.Time {
	y, m, d := value.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, value.Location())
}
