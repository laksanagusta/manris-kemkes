package report

import (
	"context"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type GenerateReportUseCase struct {
	riskRepo     repository.RiskRepository
	incidentRepo repository.IncidentRepository
	kriRepo      repository.KRIRepository
}

func NewGenerateReportUseCase(
	riskRepo repository.RiskRepository,
	incidentRepo repository.IncidentRepository,
	kriRepo repository.KRIRepository,
) *GenerateReportUseCase {
	return &GenerateReportUseCase{
		riskRepo:     riskRepo,
		incidentRepo: incidentRepo,
		kriRepo:      kriRepo,
	}
}

type GenerateReportInput struct {
	Cycle string
	OrgID *uuid.UUID
}

func (uc *GenerateReportUseCase) Execute(ctx context.Context, input GenerateReportInput) (*entity.ReportData, error) {
	if input.Cycle == "" {
		return nil, errors.ErrInvalidInput
	}

	risks, err := uc.riskRepo.ListCycleSnapshot(ctx, input.Cycle, nil)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load cycle risks")
	}

	if len(risks) == 0 {
		return nil, errors.ErrNotFound
	}

	riskIDs := make(map[uuid.UUID]struct{}, len(risks))
	for _, r := range risks {
		riskIDs[r.ID] = struct{}{}
	}

	summary := uc.computeSummary(risks, input.Cycle)
	heatmap := uc.buildHeatmap(risks)

	sortedRisks := make([]*entity.Risk, len(risks))
	copy(sortedRisks, risks)
	sort.Slice(sortedRisks, func(i, j int) bool {
		return sortedRisks[i].GetInherentScore() > sortedRisks[j].GetInherentScore()
	})

	topRisks := sortedRisks
	if len(topRisks) > 10 {
		topRisks = topRisks[:10]
	}

	incidents, err := uc.filterIncidentsByRiskIDs(ctx, riskIDs)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load incidents")
	}

	kris, err := uc.filterKRIsByRiskIDs(ctx, riskIDs)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load kris")
	}

	trendData, err := uc.computeTrendData(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "failed to compute trend data")
	}

	return &entity.ReportData{
		Summary:   summary,
		Heatmap:   heatmap,
		Risks:     sortedRisks,
		TopRisks:  topRisks,
		Incidents: incidents,
		KRIs:      kris,
		TrendData: trendData,
	}, nil
}

func (uc *GenerateReportUseCase) computeSummary(risks []*entity.Risk, cycle string) entity.ReportSummary {
	var totalScore float64
	highExtreme := 0
	overdueMitig := 0
	categoryMap := make(map[string]int)
	now := time.Now()

	for _, r := range risks {
		score := r.GetInherentScore()
		totalScore += float64(score)

		if score >= 10 {
			highExtreme++
		}

		for _, m := range r.Mitigations {
			if m.DueDate != nil {
				if dueDate, err := time.Parse("2006-01-02", *m.DueDate); err == nil {
					if dueDate.Before(now) {
						overdueMitig++
						break
					}
				}
			}
		}

		categoryMap[r.Category]++
	}

	avgScore := 0.0
	if len(risks) > 0 {
		avgScore = totalScore / float64(len(risks))
	}

	return entity.ReportSummary{
		Cycle:              cycle,
		GeneratedAt:        time.Now(),
		TotalRisks:         len(risks),
		HighExtremeCount:   highExtreme,
		OverdueMitigations: overdueMitig,
		AvgExposureScore:   avgScore,
		CategoryBreakdown:  categoryMap,
	}
}

func (uc *GenerateReportUseCase) buildHeatmap(risks []*entity.Risk) [5][5]int {
	var heatmap [5][5]int
	for _, r := range risks {
		p := r.Probability - 1
		i := r.Impact - 1
		if p >= 0 && p < 5 && i >= 0 && i < 5 {
			heatmap[p][i]++
		}
	}
	return heatmap
}

func (uc *GenerateReportUseCase) filterIncidentsByRiskIDs(ctx context.Context, riskIDs map[uuid.UUID]struct{}) ([]*entity.Incident, error) {
	allIncidents, err := uc.incidentRepo.List(ctx, nil)
	if err != nil {
		return nil, err
	}

	var filtered []*entity.Incident
	for _, inc := range allIncidents {
		if inc.LinkedRiskID != nil {
			if _, ok := riskIDs[*inc.LinkedRiskID]; ok {
				filtered = append(filtered, inc)
				continue
			}
		}
		for _, link := range inc.LinkedRisks {
			if _, ok := riskIDs[link.ID]; ok {
				filtered = append(filtered, inc)
				break
			}
		}
	}
	return filtered, nil
}

func (uc *GenerateReportUseCase) filterKRIsByRiskIDs(ctx context.Context, riskIDs map[uuid.UUID]struct{}) ([]*entity.KRI, error) {
	allKRIs, err := uc.kriRepo.List(ctx, nil, false)
	if err != nil {
		return nil, err
	}

	var filtered []*entity.KRI
	for _, kri := range allKRIs {
		if _, ok := riskIDs[kri.RiskID]; ok {
			filtered = append(filtered, kri)
		}
	}
	return filtered, nil
}

func (uc *GenerateReportUseCase) computeTrendData(ctx context.Context) ([]entity.CycleTrendPoint, error) {
	allRisks, err := uc.riskRepo.ListApprovedRisks(ctx, nil)
	if err != nil {
		return nil, err
	}

	cycleMap := make(map[string][]*entity.Risk)
	for _, r := range allRisks {
		if r.AssessmentCycle == "" {
			continue
		}
		cycleMap[r.AssessmentCycle] = append(cycleMap[r.AssessmentCycle], r)
	}

	var cycles []string
	for c := range cycleMap {
		cycles = append(cycles, c)
	}
	sort.Strings(cycles)

	const maxCycles = 6
	if len(cycles) > maxCycles {
		cycles = cycles[len(cycles)-maxCycles:]
	}

	var trend []entity.CycleTrendPoint
	for _, cycle := range cycles {
		risks := cycleMap[cycle]
		pt := entity.CycleTrendPoint{Cycle: cycle}
		for _, r := range risks {
			score := r.GetInherentScore()
			switch {
			case score >= 15:
				pt.Ekstrem++
			case score >= 10:
				pt.Tinggi++
			case score >= 5:
				pt.Sedang++
			default:
				pt.Rendah++
			}
		}
		trend = append(trend, pt)
	}

	return trend, nil
}

var _ interface {
	Execute(ctx context.Context, input GenerateReportInput) (*entity.ReportData, error)
} = &GenerateReportUseCase{}
