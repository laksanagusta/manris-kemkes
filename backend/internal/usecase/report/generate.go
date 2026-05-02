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
	Cycle  string
	OrgIDs []uuid.UUID
}

func (uc *GenerateReportUseCase) Execute(ctx context.Context, input GenerateReportInput) (*entity.ReportData, error) {
	if input.Cycle == "" {
		return nil, errors.ErrInvalidInput
	}

	risks, err := uc.riskRepo.ListCycleSnapshot(ctx, input.Cycle, input.OrgIDs)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load cycle risks")
	}

	risks = compactRisks(risks)
	if len(risks) == 0 {
		return nil, errors.Wrap(errors.ErrNotFound, "no risks found for cycle "+input.Cycle+" with status approved")
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
		if sortedRisks[i] == nil {
			return false
		}
		if sortedRisks[j] == nil {
			return true
		}
		return sortedRisks[i].GetEffectiveScore() > sortedRisks[j].GetEffectiveScore()
	})

	topRisks := sortedRisks
	if len(topRisks) > 10 {
		topRisks = topRisks[:10]
	}

	incidents, err := uc.filterIncidentsByRiskIDs(ctx, riskIDs, input.OrgIDs)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load incidents")
	}

	kris, err := uc.filterKRIsByRiskIDs(ctx, riskIDs, input.OrgIDs)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load kris")
	}

	trendData, err := uc.computeTrendData(ctx, input.OrgIDs)
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

// BuildKMKFormalReportData assembles the data bundle required to render a formal KMK report.
func BuildKMKFormalReportData(
	report *entity.FormalReport,
	org *entity.Organization,
	summary entity.ReportSummary,
	tmpmr *entity.TMPMRAssessment,
	sections []entity.KMKReportSectionStatus,
) *entity.KMKFormalReportData {
	generatedAt := summary.GeneratedAt
	if generatedAt.IsZero() {
		generatedAt = time.Now()
	}

	return &entity.KMKFormalReportData{
		Report:        report,
		GeneratedAt:   generatedAt,
		Organization:  org,
		Period:        summary.Cycle,
		RiskSummary:   summary,
		TMPMR:         tmpmr,
		SectionStatus: sections,
	}
}

func BuildAnnualRiskProfileData(
	report *entity.FormalReport,
	org *entity.Organization,
	summary entity.ReportSummary,
	risks []*entity.Risk,
	topRisks []*entity.Risk,
	heatmap [5][5]int,
	previousCycle string,
) *entity.AnnualRiskProfileData {
	return &entity.AnnualRiskProfileData{
		Report:        report,
		Organization:  org,
		Summary:       summary,
		Risks:         risks,
		TopRisks:      topRisks,
		Heatmap:       heatmap,
		PreviousCycle: previousCycle,
	}
}

func BuildSemiannualImplementationData(
	report *entity.FormalReport,
	org *entity.Organization,
	summary entity.ReportSummary,
	sections []entity.KMKReportSectionStatus,
) *entity.SemiannualImplementationData {
	return &entity.SemiannualImplementationData{
		Report:        report,
		Organization:  org,
		Summary:       summary,
		SectionStatus: sections,
	}
}

func BuildSemiannualSupervisionData(
	report *entity.FormalReport,
	org *entity.Organization,
	summary entity.ReportSummary,
	sections []entity.KMKReportSectionStatus,
) *entity.SemiannualSupervisionData {
	return &entity.SemiannualSupervisionData{
		Report:        report,
		Organization:  org,
		Summary:       summary,
		SectionStatus: sections,
	}
}

func BuildTMPMRReportData(
	report *entity.FormalReport,
	org *entity.Organization,
	summary entity.ReportSummary,
	tmpmr *entity.TMPMRAssessment,
) *entity.TMPMRReportData {
	return &entity.TMPMRReportData{
		Report:       report,
		Organization: org,
		Summary:      summary,
		TMPMR:        tmpmr,
	}
}

func (uc *GenerateReportUseCase) computeSummary(risks []*entity.Risk, cycle string) entity.ReportSummary {
	var totalScore float64
	highExtreme := 0
	overdueMitig := 0
	categoryMap := make(map[string]int)
	now := time.Now()

	for _, r := range risks {
		if r == nil {
			continue
		}
		score := r.GetEffectiveScore()
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
		if r == nil {
			continue
		}
		p := r.EffectiveProbability() - 1
		i := r.EffectiveImpact() - 1
		if p >= 0 && p < 5 && i >= 0 && i < 5 {
			heatmap[p][i]++
		}
	}
	return heatmap
}

func (uc *GenerateReportUseCase) filterIncidentsByRiskIDs(ctx context.Context, riskIDs map[uuid.UUID]struct{}, orgIDs []uuid.UUID) ([]*entity.Incident, error) {
	allIncidents, err := uc.incidentRepo.List(ctx, orgIDs)
	if err != nil {
		return nil, err
	}

	var filtered []*entity.Incident
	for _, inc := range allIncidents {
		if inc == nil {
			continue
		}
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

func (uc *GenerateReportUseCase) filterKRIsByRiskIDs(ctx context.Context, riskIDs map[uuid.UUID]struct{}, orgIDs []uuid.UUID) ([]*entity.KRI, error) {
	allKRIs, err := uc.kriRepo.List(ctx, orgIDs, false)
	if err != nil {
		return nil, err
	}

	var filtered []*entity.KRI
	for _, kri := range allKRIs {
		if kri == nil {
			continue
		}
		if _, ok := riskIDs[kri.RiskID]; ok {
			filtered = append(filtered, kri)
		}
	}
	return filtered, nil
}

func (uc *GenerateReportUseCase) computeTrendData(ctx context.Context, orgIDs []uuid.UUID) ([]entity.CycleTrendPoint, error) {
	allRisks, err := uc.riskRepo.ListApprovedRisks(ctx, orgIDs, "")
	if err != nil {
		return nil, err
	}

	cycleMap := make(map[string][]*entity.Risk)
	for _, r := range allRisks {
		if r == nil {
			continue
		}
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
			score := r.GetEffectiveScore()
			switch {
			case score >= 20:
				pt.Ekstrem++
			case score >= 15:
				pt.Tinggi++
			case score >= 10:
				pt.Sedang++
			case score >= 5:
				pt.Rendah++
			default:
				pt.SangatRendah++
			}
		}
		trend = append(trend, pt)
	}

	return trend, nil
}

func compactRisks(risks []*entity.Risk) []*entity.Risk {
	if len(risks) == 0 {
		return risks
	}

	compact := make([]*entity.Risk, 0, len(risks))
	for _, risk := range risks {
		if risk != nil {
			compact = append(compact, risk)
		}
	}
	return compact
}

var _ interface {
	Execute(ctx context.Context, input GenerateReportInput) (*entity.ReportData, error)
} = &GenerateReportUseCase{}
