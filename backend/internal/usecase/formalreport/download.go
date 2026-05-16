package formalreport

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	reportgen "github.com/manris/backend/internal/usecase/report"
)

type formalReportPDFRenderer interface {
	RenderFormal(ctx context.Context, data *entity.KMKFormalReportData) ([]byte, error)
}

type organizationGetter interface {
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Organization, error)
}

type annualRiskSnapshotter interface {
	ListCycleSnapshot(ctx context.Context, cycle string, orgIDs []uuid.UUID) ([]*entity.Risk, error)
}

type DownloadUseCase struct {
	reportRepo  repository.FormalReportRepository
	orgRepo     organizationGetter
	riskRepo    annualRiskSnapshotter
	tmpmrRepo   repository.TMPMRRepository
	pdfRenderer formalReportPDFRenderer
}

func NewDownloadUseCase(
	reportRepo repository.FormalReportRepository,
	orgRepo organizationGetter,
	riskRepo annualRiskSnapshotter,
	tmpmrRepo repository.TMPMRRepository,
	pdfRenderer formalReportPDFRenderer,
) *DownloadUseCase {
	return &DownloadUseCase{
		reportRepo:  reportRepo,
		orgRepo:     orgRepo,
		riskRepo:    riskRepo,
		tmpmrRepo:   tmpmrRepo,
		pdfRenderer: pdfRenderer,
	}
}

type DownloadInput struct {
	ID    uuid.UUID
	Scope *entity.AccessScope
}

type DownloadOutput struct {
	Filename string
	Bytes    []byte
}

func (uc *DownloadUseCase) Execute(ctx context.Context, input DownloadInput) (*DownloadOutput, error) {
	if uc == nil || uc.reportRepo == nil || uc.orgRepo == nil || uc.pdfRenderer == nil {
		return nil, errors.Wrap(errors.ErrInternal, "formal report download dependencies are not configured")
	}

	report, err := uc.reportRepo.GetByID(ctx, input.ID)
	if err != nil || report == nil {
		return nil, errors.ErrNotFound
	}

	if err := validateFormalReportAccess(input.Scope, report.OrganizationID, false); err != nil {
		return nil, err
	}

	org, err := uc.orgRepo.GetByID(ctx, report.OrganizationID)
	if err != nil || org == nil {
		return nil, errors.ErrNotFound
	}

	summary := buildFormalReportSummary(report)

	var tmpmr *entity.TMPMRAssessment
	if uc.tmpmrRepo != nil {
		assessments, _, listErr := uc.tmpmrRepo.List(ctx, repository.TMPMRListFilter{
			OrganizationID: &report.OrganizationID,
			Period:         report.Period,
			Page:           1,
			Limit:          10,
		})
		if listErr == nil {
			tmpmr = latestTMPMRAssessment(assessments)
		}
	}

	sections := []entity.KMKReportSectionStatus{}
	if tmpmr != nil {
		sections = append(sections, entity.KMKReportSectionStatus{
			Key:       "tmpmr",
			Label:     "TMPMR",
			Available: true,
			Count:     len(tmpmr.Items),
			Note:      tmpmr.MaturityLevel,
		})
	}

	data := reportgen.BuildKMKFormalReportData(report, org, summary, tmpmr, sections)
	if data == nil {
		return nil, errors.Wrap(errors.ErrInternal, "failed to build formal report data")
	}

	switch report.ReportType {
	case entity.FormalReportTypeAnnualRiskProfile:
		annualProfile, err := uc.buildAnnualProfileData(ctx, report, org, summary, input.Scope)
		if err != nil {
			return nil, err
		}
		data.AnnualProfile = annualProfile
	case entity.FormalReportTypeSemiannualImplementation:
		// payload built after data shell via buildImplementationReportData below
	case entity.FormalReportTypeSemiannualSupervision:
		// payload built after data shell via buildSupervisionReportData below
	case entity.FormalReportTypeTMPMR:
		data.TMPMRReport = reportgen.BuildTMPMRReportData(report, org, summary, tmpmr)
	case entity.FormalReportTypeMonitoringEvaluation:
		// payload built after data shell via buildMonitoringEvaluationData below
	default:
		return nil, errors.Wrap(errors.ErrInvalidInput, "unsupported formal report type")
	}

	// Build implementation-specific section status from available evidence
	if report.ReportType == entity.FormalReportTypeSemiannualImplementation {
		data.ImplementationReport = uc.buildImplementationReportData(ctx, report, org, summary, input.Scope)
	}

	// Build supervision-specific section status
	if report.ReportType == entity.FormalReportTypeSemiannualSupervision {
		data.SupervisionReport = uc.buildSupervisionReportData(ctx, report, org, summary, input.Scope)
	}

	if report.ReportType == entity.FormalReportTypeMonitoringEvaluation {
		monitoringReport, err := uc.buildMonitoringEvaluationData(ctx, report, org, summary, input.Scope)
		if err != nil {
			return nil, err
		}
		data.MonitoringEvaluationReport = monitoringReport
	}

	pdfBytes, err := uc.pdfRenderer.RenderFormal(ctx, data)
	if err != nil {
		return nil, errors.Wrap(err, "failed to render formal report PDF")
	}
	if len(pdfBytes) == 0 {
		return nil, errors.Wrap(errors.ErrInternal, "formal report renderer returned empty PDF bytes")
	}

	return &DownloadOutput{
		Filename: fmt.Sprintf("formal-report-%s-%s.pdf", sanitizeFilename(report.ReportType), sanitizeFilename(report.Period)),
		Bytes:    pdfBytes,
	}, nil
}

func (uc *DownloadUseCase) buildAnnualProfileData(
	ctx context.Context,
	report *entity.FormalReport,
	org *entity.Organization,
	summary entity.ReportSummary,
	scope *entity.AccessScope,
) (*entity.AnnualRiskProfileData, error) {
	if uc.riskRepo == nil {
		return nil, errors.Wrap(errors.ErrInternal, "risk repository is not configured for annual report")
	}

	orgIDs := reportScopeOrgIDs(scope, report.OrganizationID)
	risks, err := uc.riskRepo.ListCycleSnapshot(ctx, report.Period, orgIDs)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load annual risk snapshot")
	}

	risks = compactRisks(risks)
	sortedRisks := make([]*entity.Risk, len(risks))
	copy(sortedRisks, risks)
	sortRisksByScoreDesc(sortedRisks)

	topRisks := sortedRisks
	if len(topRisks) > 10 {
		topRisks = topRisks[:10]
	}

	return reportgen.BuildAnnualRiskProfileData(
		report,
		org,
		summary,
		sortedRisks,
		topRisks,
		buildRiskHeatmap(sortedRisks),
		previousFormalCycle(report.Period),
	), nil
}

func buildFormalReportSummary(report *entity.FormalReport) entity.ReportSummary {
	summary := entity.ReportSummary{
		Cycle:             report.Period,
		GeneratedAt:       formalReportGeneratedAt(report),
		CategoryBreakdown: map[string]int{},
	}

	if raw, ok := report.Metadata["summary"].(map[string]any); ok {
		summary.TotalRisks = toInt(raw["riskCount"])
		summary.HighExtremeCount = toInt(raw["incidentCount"])
		summary.OverdueMitigations = toInt(raw["kriCount"])
		summary.AvgExposureScore = toFloat(raw["tmpmrScore"])
		if breakdown, ok := raw["categoryBreakdown"].(map[string]any); ok {
			summary.CategoryBreakdown = make(map[string]int, len(breakdown))
			for key, value := range breakdown {
				summary.CategoryBreakdown[key] = toInt(value)
			}
		}
	}

	if summary.GeneratedAt.IsZero() {
		summary.GeneratedAt = time.Now().UTC()
	}

	return summary
}

func reportScopeOrgIDs(scope *entity.AccessScope, fallbackOrgID uuid.UUID) []uuid.UUID {
	if scope == nil {
		return []uuid.UUID{fallbackOrgID}
	}
	if len(scope.AccessibleOrgIDs) > 0 {
		return scope.AccessibleOrgIDs
	}
	if scope.OrganizationID != nil {
		return []uuid.UUID{*scope.OrganizationID}
	}
	return []uuid.UUID{fallbackOrgID}
}

func compactRisks(risks []*entity.Risk) []*entity.Risk {
	if len(risks) == 0 {
		return nil
	}
	filtered := make([]*entity.Risk, 0, len(risks))
	for _, risk := range risks {
		if risk != nil {
			filtered = append(filtered, risk)
		}
	}
	return filtered
}

func sortRisksByScoreDesc(risks []*entity.Risk) {
	sort.Slice(risks, func(i, j int) bool {
		if risks[i] == nil {
			return false
		}
		if risks[j] == nil {
			return true
		}
		left := risks[i].GetEffectiveScore()
		right := risks[j].GetEffectiveScore()
		if left == right {
			return risks[i].Code < risks[j].Code
		}
		return left > right
	})
}

func (uc *DownloadUseCase) buildMonitoringEvaluationData(
	ctx context.Context,
	report *entity.FormalReport,
	org *entity.Organization,
	summary entity.ReportSummary,
	scope *entity.AccessScope,
) (*entity.MonitoringEvaluationReportData, error) {
	if uc.riskRepo == nil {
		return buildMonitoringEvaluationReportData(report, org, summary, nil), nil
	}

	orgIDs := reportScopeOrgIDs(scope, report.OrganizationID)
	risks, err := uc.riskRepo.ListCycleSnapshot(ctx, report.Period, orgIDs)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load monitoring evaluation risk snapshot")
	}

	return buildMonitoringEvaluationReportData(report, org, summary, compactRisks(risks)), nil
}

// buildImplementationReportData builds the implementation report payload with KMK process-stage
// section status derived from available evidence in the system.
func (uc *DownloadUseCase) buildImplementationReportData(
	ctx context.Context,
	report *entity.FormalReport,
	org *entity.Organization,
	summary entity.ReportSummary,
	scope *entity.AccessScope,
) *entity.SemiannualImplementationData {
	sections := uc.buildKMKImplementationSectionStatus(ctx, report.Period, scope)
	payload := reportgen.BuildSemiannualImplementationData(report, org, summary, sections)
	if payload != nil {
		payload.Summary = uc.enrichImplementationSummary(ctx, summary, scope, report.OrganizationID)
	}
	return payload
}

// buildKMKImplementationSectionStatus derives KMK process-stage section status from available
// Manris evidence. Each key maps to an ISO 31000:2018 clause. Unavailable evidence gets an
// explicit "Belum tersedia di sistem" note.
func (uc *DownloadUseCase) buildKMKImplementationSectionStatus(
	ctx context.Context,
	period string,
	scope *entity.AccessScope,
) []entity.KMKReportSectionStatus {
	orgIDs := reportScopeOrgIDs(scope, uuid.Nil)
	statuses := make([]entity.KMKReportSectionStatus, 0, 6)

	// 4.1 — Communication and consultation
	statuses = append(statuses, entity.KMKReportSectionStatus{
		Key:       "communication_consultation",
		Label:     "Komunikasi dan Konsultasi (4.1)",
		Available: false,
		Count:     0,
		Note:      "Belum tersedia di sistem",
	})

	// 5.1 — Scope, context and criteria
	charterAvailable, charterCount := uc.resolveCharterAvailability(ctx, orgIDs, period)
	statuses = append(statuses, entity.KMKReportSectionStatus{
		Key:       "context_criteria",
		Label:     "Lingkup, Konteks, dan Kriteria (5.1)",
		Available: charterAvailable,
		Count:     charterCount,
		Note:      pickString(charterAvailable, "Tersedia di modul Piagam", "Belum tersedia di sistem"),
	})

	// 5.2 — Risk identification
	riskAvailable, riskCount := uc.resolveRiskAvailability(ctx, orgIDs, period)
	statuses = append(statuses, entity.KMKReportSectionStatus{
		Key:       "risk_identification",
		Label:     "Identifikasi Risiko (5.2)",
		Available: riskAvailable,
		Count:     riskCount,
		Note:      pickString(riskAvailable, fmt.Sprintf("%d risiko teridentifikasi", riskCount), "Belum tersedia di sistem"),
	})

	// 5.3/5.4 — Risk analysis and evaluation
	riskDetailAvailable, riskHighCount := uc.resolveRiskDetailAvailability(ctx, orgIDs, period)
	statuses = append(statuses, entity.KMKReportSectionStatus{
		Key:       "risk_analysis_evaluation",
		Label:     "Analisis dan Evaluasi Risiko (5.3/5.4)",
		Available: riskDetailAvailable,
		Count:     riskHighCount,
		Note:      pickString(riskDetailAvailable, fmt.Sprintf("%d risiko dengan penilaian lengkap", riskHighCount), "Belum tersedia di sistem"),
	})

	// 5.5 — Risk treatment
	treatmentAvailable, treatmentCount := uc.resolveTreatmentAvailability(ctx, orgIDs, period)
	statuses = append(statuses, entity.KMKReportSectionStatus{
		Key:       "risk_treatment",
		Label:     "Perlakuan Risiko (5.5)",
		Available: treatmentAvailable,
		Count:     treatmentCount,
		Note:      pickString(treatmentAvailable, fmt.Sprintf("%d rencana penanganan terdefinisi", treatmentCount), "Belum tersedia di sistem"),
	})

	// 5.6 / 8.2 — Monitoring and review
	monitorAvailable, monitorCount := uc.resolveMonitoringAvailability(ctx, period, reportScopeOrgIDs(scope, uuid.Nil))
	statuses = append(statuses, entity.KMKReportSectionStatus{
		Key:       "monitoring_review",
		Label:     "Pemantauan dan Reviu (5.6/8.2)",
		Available: monitorAvailable,
		Count:     monitorCount,
		Note:      pickString(monitorAvailable, fmt.Sprintf("%d aktivitas pemantauan tercatat", monitorCount), "Belum tersedia di sistem"),
	})

	// 5.7 / 7.5 — Recording and reporting
	statuses = append(statuses, entity.KMKReportSectionStatus{
		Key:       "recording_reporting",
		Label:     "Pencatatan dan Pelaporan (5.7/7.5)",
		Available: false,
		Count:     0,
		Note:      "Belum tersedia di sistem",
	})

	return statuses
}

func (uc *DownloadUseCase) resolveCharterAvailability(ctx context.Context, orgIDs []uuid.UUID, period string) (bool, int) {
	if uc.riskRepo == nil {
		return false, 0
	}
	// Count approved risks that have a linked charter — use cycle snapshot for period-specific data
	if risks, err := uc.riskRepo.ListCycleSnapshot(ctx, period, orgIDs); err == nil && len(risks) > 0 {
		return true, len(risks)
	}
	return false, 0
}

func (uc *DownloadUseCase) resolveRiskAvailability(ctx context.Context, orgIDs []uuid.UUID, period string) (bool, int) {
	if uc.riskRepo == nil {
		return false, 0
	}
	if risks, err := uc.riskRepo.ListCycleSnapshot(ctx, period, orgIDs); err == nil && len(risks) > 0 {
		return true, len(risks)
	}
	return false, 0
}

func (uc *DownloadUseCase) resolveRiskDetailAvailability(ctx context.Context, orgIDs []uuid.UUID, period string) (bool, int) {
	if uc.riskRepo == nil {
		return false, 0
	}
	if risks, err := uc.riskRepo.ListCycleSnapshot(ctx, period, orgIDs); err == nil && len(risks) > 0 {
		highCount := 0
		for _, r := range risks {
			if r != nil && r.GetEffectiveScore() >= 15 {
				highCount++
			}
		}
		return true, highCount
	}
	return false, 0
}

func (uc *DownloadUseCase) resolveTreatmentAvailability(ctx context.Context, orgIDs []uuid.UUID, period string) (bool, int) {
	if uc.riskRepo == nil {
		return false, 0
	}
	if risks, err := uc.riskRepo.ListCycleSnapshot(ctx, period, orgIDs); err == nil && len(risks) > 0 {
		count := 0
		for _, r := range risks {
			if r != nil && r.TreatmentOption != "" {
				count++
			}
		}
		return count > 0, count
	}
	return false, 0
}

func (uc *DownloadUseCase) resolveMonitoringAvailability(ctx context.Context, period string, orgIDs []uuid.UUID) (bool, int) {
	if uc.riskRepo == nil {
		return false, 0
	}
	if risks, err := uc.riskRepo.ListCycleSnapshot(ctx, period, orgIDs); err == nil && len(risks) > 0 {
		count := 0
		for _, r := range risks {
			if r != nil && len(r.Mitigations) > 0 {
				count += len(r.Mitigations)
			}
		}
		return count > 0, count
	}
	return false, 0
}

func (uc *DownloadUseCase) enrichImplementationSummary(
	ctx context.Context,
	base entity.ReportSummary,
	scope *entity.AccessScope,
	orgID uuid.UUID,
) entity.ReportSummary {
	summary := base
	if uc.riskRepo != nil {
		orgIDs := reportScopeOrgIDs(scope, orgID)
		if risks, err := uc.riskRepo.ListCycleSnapshot(ctx, summary.Cycle, orgIDs); err == nil {
			treatmentCount := 0
			approvedCount := 0
			for _, r := range risks {
				if r != nil {
					if r.TreatmentOption != "" {
						treatmentCount++
					}
					if r.Status == entity.RiskStatusApproved {
						approvedCount++
					}
				}
			}
			summary.OverdueMitigations = treatmentCount
			summary.HighExtremeCount = approvedCount
		}
	}
	return summary
}

// buildSupervisionReportData builds the supervision report payload with findings-oriented
// section status derived from available Manris evidence. Focuses on gaps, overdue items,
// approval bottlenecks, and evidence completeness.
func (uc *DownloadUseCase) buildSupervisionReportData(
	ctx context.Context,
	report *entity.FormalReport,
	org *entity.Organization,
	summary entity.ReportSummary,
	scope *entity.AccessScope,
) *entity.SemiannualSupervisionData {
	sections := uc.buildKMKSupervisionSectionStatus(ctx, report.Period, scope, report.OrganizationID)
	payload := reportgen.BuildSemiannualSupervisionData(report, org, summary, sections)
	if payload != nil {
		payload.Summary = uc.enrichSupervisionSummary(ctx, summary, scope, report.OrganizationID)
	}
	return payload
}

// buildKMKSupervisionSectionStatus derives supervision-oriented section status. Focuses on
// findings, gaps, overdue mitigations, and evidence completeness rather than process stages.
func (uc *DownloadUseCase) buildKMKSupervisionSectionStatus(
	ctx context.Context,
	period string,
	scope *entity.AccessScope,
	fallbackOrgID uuid.UUID,
) []entity.KMKReportSectionStatus {
	orgIDs := reportScopeOrgIDs(scope, fallbackOrgID)
	statuses := make([]entity.KMKReportSectionStatus, 0, 5)

	// Findings — high/extreme risks in the period
	findingAvailable, findingCount := uc.resolveFindings(ctx, orgIDs, period)
	statuses = append(statuses, entity.KMKReportSectionStatus{
		Key:       "findings",
		Label:     "Temuan Risiko Tinggi dan Ekstrem",
		Available: findingAvailable,
		Count:     findingCount,
		Note:      pickString(findingAvailable, fmt.Sprintf("%d temuan risiko kritis", findingCount), "Belum tersedia di sistem"),
	})

	// Overdue mitigations
	overdueAvailable, overdueCount := uc.resolveOverdueMitigations(ctx, orgIDs, period)
	statuses = append(statuses, entity.KMKReportSectionStatus{
		Key:       "overdue_mitigations",
		Label:     "Mitigasi Terlambat",
		Available: overdueAvailable,
		Count:     overdueCount,
		Note:      pickString(overdueAvailable, fmt.Sprintf("%d mitigasi melewati tenggat", overdueCount), "Belum tersedia di sistem"),
	})

	// Approval bottlenecks — risks in review for too long
	bottleneckAvailable, bottleneckCount := uc.resolveApprovalBottlenecks(ctx, orgIDs, period)
	statuses = append(statuses, entity.KMKReportSectionStatus{
		Key:       "approval_bottlenecks",
		Label:     "Kendala Persetujuan",
		Available: bottleneckAvailable,
		Count:     bottleneckCount,
		Note:      pickString(bottleneckAvailable, fmt.Sprintf("%d risiko tertunda persetujuan", bottleneckCount), "Belum tersedia di sistem"),
	})

	// Evidence completeness — risks with documented controls and treatments
	evidenceAvailable, evidenceCount := uc.resolveEvidenceCompleteness(ctx, orgIDs, period)
	statuses = append(statuses, entity.KMKReportSectionStatus{
		Key:       "evidence_completeness",
		Label:     "Kelengkapan Evidence",
		Available: evidenceAvailable,
		Count:     evidenceCount,
		Note:      pickString(evidenceAvailable, fmt.Sprintf("%d risiko dengan kontrol terdocumentasi", evidenceCount), "Belum tersedia di sistem"),
	})

	// Follow-up status — mitigations with progress updates
	followUpAvailable, followUpCount := uc.resolveFollowUpStatus(ctx, orgIDs, period)
	statuses = append(statuses, entity.KMKReportSectionStatus{
		Key:       "follow_up_status",
		Label:     "Status Tindak Lanjut",
		Available: followUpAvailable,
		Count:     followUpCount,
		Note:      pickString(followUpAvailable, fmt.Sprintf("%d aktivitas tindak lanjut tercatat", followUpCount), "Belum tersedia di sistem"),
	})

	return statuses
}

func (uc *DownloadUseCase) resolveFindings(ctx context.Context, orgIDs []uuid.UUID, period string) (bool, int) {
	if uc.riskRepo == nil {
		return false, 0
	}
	if risks, err := uc.riskRepo.ListCycleSnapshot(ctx, period, orgIDs); err == nil && len(risks) > 0 {
		highCount := 0
		for _, r := range risks {
			if r != nil && r.GetEffectiveScore() >= 15 {
				highCount++
			}
		}
		return highCount > 0, highCount
	}
	return false, 0
}

func (uc *DownloadUseCase) resolveOverdueMitigations(ctx context.Context, orgIDs []uuid.UUID, period string) (bool, int) {
	if uc.riskRepo == nil {
		return false, 0
	}
	now := time.Now()
	if risks, err := uc.riskRepo.ListCycleSnapshot(ctx, period, orgIDs); err == nil && len(risks) > 0 {
		count := 0
		for _, r := range risks {
			if r == nil {
				continue
			}
			for _, m := range r.Mitigations {
				if m.DueDate != nil {
					if dueDate, err := time.Parse("2006-01-02", *m.DueDate); err == nil && dueDate.Before(now) {
						count++
						break
					}
				}
			}
		}
		return count > 0, count
	}
	return false, 0
}

func (uc *DownloadUseCase) resolveApprovalBottlenecks(ctx context.Context, orgIDs []uuid.UUID, period string) (bool, int) {
	if uc.riskRepo == nil {
		return false, 0
	}
	if risks, err := uc.riskRepo.ListCycleSnapshot(ctx, period, orgIDs); err == nil && len(risks) > 0 {
		count := 0
		for _, r := range risks {
			if r != nil && (r.Status == entity.RiskStatusInReview || r.Status == entity.RiskStatusDraft) {
				count++
			}
		}
		return count > 0, count
	}
	return false, 0
}

func (uc *DownloadUseCase) resolveEvidenceCompleteness(ctx context.Context, orgIDs []uuid.UUID, period string) (bool, int) {
	if uc.riskRepo == nil {
		return false, 0
	}
	if risks, err := uc.riskRepo.ListCycleSnapshot(ctx, period, orgIDs); err == nil && len(risks) > 0 {
		count := 0
		for _, r := range risks {
			if r != nil && r.ExistingControl != "" {
				count++
			}
		}
		return count > 0, count
	}
	return false, 0
}

func (uc *DownloadUseCase) resolveFollowUpStatus(ctx context.Context, orgIDs []uuid.UUID, period string) (bool, int) {
	if uc.riskRepo == nil {
		return false, 0
	}
	if risks, err := uc.riskRepo.ListCycleSnapshot(ctx, period, orgIDs); err == nil && len(risks) > 0 {
		count := 0
		for _, r := range risks {
			if r != nil && len(r.Mitigations) > 0 {
				count++
			}
		}
		return count > 0, count
	}
	return false, 0
}

func (uc *DownloadUseCase) enrichSupervisionSummary(
	ctx context.Context,
	base entity.ReportSummary,
	scope *entity.AccessScope,
	orgID uuid.UUID,
) entity.ReportSummary {
	summary := base
	if uc.riskRepo != nil {
		orgIDs := reportScopeOrgIDs(scope, orgID)
		if risks, err := uc.riskRepo.ListCycleSnapshot(ctx, summary.Cycle, orgIDs); err == nil {
			overdueCount := 0
			treatmentCount := 0
			now := time.Now()
			for _, r := range risks {
				if r == nil {
					continue
				}
				if r.TreatmentOption != "" {
					treatmentCount++
				}
				for _, m := range r.Mitigations {
					if m.DueDate != nil {
						if dueDate, err := time.Parse("2006-01-02", *m.DueDate); err == nil && dueDate.Before(now) {
							overdueCount++
							break
						}
					}
				}
			}
			summary.OverdueMitigations = overdueCount
			summary.HighExtremeCount = treatmentCount
		}
	}
	return summary
}

func pickString(available bool, availableMsg, unavailableMsg string) string {
	if available {
		return availableMsg
	}
	return unavailableMsg
}

func buildRiskHeatmap(risks []*entity.Risk) [5][5]int {
	var heatmap [5][5]int
	for _, risk := range risks {
		if risk == nil {
			continue
		}
		p := risk.EffectiveProbability() - 1
		i := risk.EffectiveImpact() - 1
		if p >= 0 && p < 5 && i >= 0 && i < 5 {
			heatmap[p][i]++
		}
	}
	return heatmap
}

func previousFormalCycle(period string) string {
	period = strings.TrimSpace(period)
	if period == "" {
		return ""
	}

	if strings.Contains(period, "-") {
		parts := strings.SplitN(period, "-", 2)
		year, err := strconv.Atoi(strings.TrimSpace(parts[0]))
		if err != nil {
			return ""
		}
		switch strings.ToUpper(strings.TrimSpace(parts[1])) {
		case "H1":
			return fmt.Sprintf("%d-H2", year-1)
		case "H2":
			return fmt.Sprintf("%d-H1", year)
		default:
			return fmt.Sprintf("%d", year-1)
		}
	}

	year, err := strconv.Atoi(period)
	if err != nil {
		return ""
	}
	return fmt.Sprintf("%d", year-1)
}

func formalReportGeneratedAt(report *entity.FormalReport) time.Time {
	if report == nil {
		return time.Now().UTC()
	}

	if report.GeneratedAt != nil && !report.GeneratedAt.IsZero() {
		return report.GeneratedAt.UTC()
	}

	if !report.CreatedAt.IsZero() {
		return report.CreatedAt.UTC()
	}

	return time.Now().UTC()
}

func toInt(value any) int {
	switch v := value.(type) {
	case int:
		return v
	case int8:
		return int(v)
	case int16:
		return int(v)
	case int32:
		return int(v)
	case int64:
		return int(v)
	case uint:
		return int(v)
	case uint8:
		return int(v)
	case uint16:
		return int(v)
	case uint32:
		return int(v)
	case uint64:
		return int(v)
	case float32:
		return int(math.Round(float64(v)))
	case float64:
		return int(math.Round(v))
	default:
		return 0
	}
}

func toFloat(value any) float64 {
	switch v := value.(type) {
	case int:
		return float64(v)
	case int8:
		return float64(v)
	case int16:
		return float64(v)
	case int32:
		return float64(v)
	case int64:
		return float64(v)
	case uint:
		return float64(v)
	case uint8:
		return float64(v)
	case uint16:
		return float64(v)
	case uint32:
		return float64(v)
	case uint64:
		return float64(v)
	case float32:
		return float64(v)
	case float64:
		return v
	default:
		return 0
	}
}

func sanitizeFilename(value string) string {
	if value == "" {
		return "report"
	}

	var b []rune
	for _, r := range value {
		switch {
		case r >= 'a' && r <= 'z':
			b = append(b, r)
		case r >= 'A' && r <= 'Z':
			b = append(b, r)
		case r >= '0' && r <= '9':
			b = append(b, r)
		case r == '-' || r == '_' || r == '.':
			b = append(b, r)
		default:
			b = append(b, '-')
		}
	}
	return string(b)
}
