package evaluation

import (
	"context"
	"fmt"
	"strings"
	"time"
	"unicode"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
)

type riskSummarySource interface {
	ListCycleSnapshot(ctx context.Context, cycle string, orgIDs []uuid.UUID) ([]*entity.Risk, error)
}

var monitoringRiskLevels = []struct {
	key   string
	label string
}{
	{entity.RiskLevelSangatTinggi, "Risiko Sangat Tinggi"},
	{entity.RiskLevelTinggi, "Risiko Tinggi"},
	{entity.RiskLevelSedang, "Risiko Sedang"},
	{entity.RiskLevelRendah, "Risiko Rendah"},
	{entity.RiskLevelSangatRendah, "Risiko Sangat Rendah"},
}

type organizationGetter interface {
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Organization, error)
}

type ExportPDFUseCase struct {
	repo     repository.EvaluationRepository
	orgRepo  organizationGetter
	riskRepo riskSummarySource
	renderer service.FormalReportPDFRenderer
}

func NewExportPDFUseCase(
	repo repository.EvaluationRepository,
	orgRepo organizationGetter,
	riskRepo riskSummarySource,
	renderer service.FormalReportPDFRenderer,
) *ExportPDFUseCase {
	return &ExportPDFUseCase{
		repo:     repo,
		orgRepo:  orgRepo,
		riskRepo: riskRepo,
		renderer: renderer,
	}
}

type ExportPDFInput struct {
	ID    uuid.UUID
	Scope *entity.AccessScope
}

type ExportPDFOutput struct {
	Filename string
	Bytes    []byte
}

func (uc *ExportPDFUseCase) Execute(ctx context.Context, input ExportPDFInput) (*ExportPDFOutput, error) {
	if uc == nil || uc.repo == nil || uc.orgRepo == nil || uc.renderer == nil {
		return nil, errors.Wrap(errors.ErrInternal, "evaluation pdf export dependencies are not configured")
	}

	evaluation, err := uc.repo.GetByID(ctx, input.ID)
	if err != nil || evaluation == nil {
		return nil, errors.ErrNotFound
	}
	if !canRead(input.Scope, evaluation.OrganizationID) {
		return nil, errors.ErrForbidden
	}

	org, err := uc.orgRepo.GetByID(ctx, evaluation.OrganizationID)
	if err != nil || org == nil {
		return nil, errors.ErrNotFound
	}

	risks := []*entity.Risk{}
	if uc.riskRepo != nil {
		fetchedRisks, riskErr := uc.riskRepo.ListCycleSnapshot(ctx, evaluation.Period, []uuid.UUID{evaluation.OrganizationID})
		if riskErr != nil {
			return nil, errors.Wrap(riskErr, "failed to load evaluation mitigation summary")
		}
		risks = compactRisks(fetchedRisks)
	}

	reportData := buildMonitoringEvaluationData(evaluation, org, risks)
	pdfBytes, err := uc.renderer.RenderFormal(ctx, &entity.KMKFormalReportData{
		GeneratedAt:                time.Now().UTC(),
		Organization:               org,
		Period:                     evaluation.Period,
		MonitoringEvaluationReport: reportData,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to render evaluation pdf")
	}
	if len(pdfBytes) == 0 {
		return nil, errors.Wrap(errors.ErrInternal, "evaluation pdf renderer returned empty bytes")
	}

	return &ExportPDFOutput{
		Filename: fmt.Sprintf("evaluasi-mr-%s.pdf", sanitizeFilename(evaluation.Period)),
		Bytes:    pdfBytes,
	}, nil
}

func buildMonitoringEvaluationData(evaluation *entity.Evaluation, org *entity.Organization, risks []*entity.Risk) *entity.MonitoringEvaluationReportData {
	data := &entity.MonitoringEvaluationReportData{
		Organization:           org,
		EvaluationStatus:       strings.ToUpper(string(evaluation.Status)),
		OrganizationName:       "",
		Year:                   "",
		SemesterLabel:          "",
		ReportNumber:           evaluation.ReportNumber,
		ReportDate:             formatTimePtr(evaluation.ReportDate),
		AssignmentLetterNumber: evaluation.AssignmentLetterNumber,
		AssignmentLetterDate:   formatTimePtr(evaluation.AssignmentLetterDate),
		MonitoringDateRange:    evaluation.MonitoringDateRange,
		UnitCode:               evaluation.UnitCode,
		UnitLocation:           evaluation.UnitLocation,
		UnitAddress:            evaluation.UnitAddress,
		UnitEselonI:            evaluation.UnitEselonI,
		UnitLeaderName:         evaluation.UnitLeaderName,
		MitigationSummary:      buildMonitoringMitigationSummary(risks),
	}
	if org != nil {
		data.OrganizationName = org.Name
	}
	data.Year, data.SemesterLabel = monitoringYearAndSemester(evaluation.Period)

	if section := sectionByKey(evaluation, "document_completeness"); section != nil {
		data.DocumentChecklist = checklistRowsFromSection(*section)
		data.DocumentConclusion = section.Conclusion
	}
	if section := sectionByKey(evaluation, "infrastructure_adequacy"); section != nil {
		data.InfrastructureChecklist = checklistRowsFromSection(*section)
		data.InfrastructureConclusion = section.Conclusion
	}
	if section := sectionByKey(evaluation, "implementation_result"); section != nil {
		data.ResultChecklist = checklistRowsFromSection(*section)
		data.ResultConclusion = section.Conclusion
	}
	if section := sectionByKey(evaluation, "mitigation_monitoring"); section != nil {
		data.MitigationConclusion = section.Conclusion
	}
	return data
}

func sectionByKey(evaluation *entity.Evaluation, key string) *entity.EvaluationSection {
	if evaluation == nil {
		return nil
	}
	normalized := strings.TrimSpace(strings.ToLower(key))
	for i := range evaluation.Sections {
		section := &evaluation.Sections[i]
		if strings.TrimSpace(strings.ToLower(section.SectionKey)) == normalized {
			return section
		}
	}
	return nil
}

func checklistRowsFromSection(section entity.EvaluationSection) []entity.MonitoringEvaluationChecklistRow {
	rows := make([]entity.MonitoringEvaluationChecklistRow, 0, len(section.Items))
	for _, item := range section.Items {
		yes, no := answerFlags(item.Answer)
		rows = append(rows, entity.MonitoringEvaluationChecklistRow{
			No:          item.ItemNo,
			Item:        item.Label,
			Yes:         yes,
			NoChecked:   no,
			Condition:   item.Condition,
			Description: item.Description,
			Analysis:    item.Analysis,
		})
	}
	return rows
}

func answerFlags(answer entity.EvaluationAnswer) (yes bool, no bool) {
	switch answer {
	case entity.EvaluationAnswerYes:
		return true, false
	case entity.EvaluationAnswerNo:
		return false, true
	default:
		return false, false
	}
}

func buildMonitoringMitigationSummary(risks []*entity.Risk) []entity.MonitoringEvaluationMitigationSummaryRow {
	compact := compactRisks(risks)
	rows := make([]entity.MonitoringEvaluationMitigationSummaryRow, 0, len(monitoringRiskLevels)+1)
	total := entity.MonitoringEvaluationMitigationSummaryRow{LevelLabel: "Jumlah", Total: true}

	for idx, level := range monitoringRiskLevels {
		row := entity.MonitoringEvaluationMitigationSummaryRow{
			No:         fmt.Sprintf("%d", idx+1),
			LevelKey:   level.key,
			LevelLabel: level.label,
		}
		for _, risk := range compact {
			if risk == nil || risk.GetRiskLevel() != level.key {
				continue
			}
			row.RiskCount++
			row.MitigationPlanCount += len(risk.Mitigations)
			row.MitigationRealizationCount += len(risk.Mitigations)
			switch monitoringMovement(risk) {
			case "down":
				row.DownCount++
			case "up":
				row.UpCount++
			case "new":
				row.NewCount++
			default:
				row.SameCount++
			}
		}

		total.RiskCount += row.RiskCount
		total.MitigationPlanCount += row.MitigationPlanCount
		total.MitigationRealizationCount += row.MitigationRealizationCount
		total.DownCount += row.DownCount
		total.SameCount += row.SameCount
		total.UpCount += row.UpCount
		total.NewCount += row.NewCount

		rows = append(rows, row)
	}

	rows = append(rows, total)
	return rows
}

func compactRisks(risks []*entity.Risk) []*entity.Risk {
	if len(risks) == 0 {
		return []*entity.Risk{}
	}
	filtered := make([]*entity.Risk, 0, len(risks))
	for _, risk := range risks {
		if risk != nil {
			filtered = append(filtered, risk)
		}
	}
	return filtered
}

func monitoringMovement(risk *entity.Risk) string {
	if risk == nil || risk.BeforeMonitoringNilai == nil {
		return "new"
	}
	if risk.MonitoringResultNilai == nil {
		return "same"
	}
	switch {
	case *risk.BeforeMonitoringNilai > *risk.MonitoringResultNilai:
		return "down"
	case *risk.BeforeMonitoringNilai < *risk.MonitoringResultNilai:
		return "up"
	default:
		return "same"
	}
}

func formatTimePtr(value *time.Time) string {
	if value == nil || value.IsZero() {
		return ""
	}
	return value.Format("02-01-2006")
}

func monitoringYearAndSemester(period string) (string, string) {
	trimmed := strings.TrimSpace(period)
	if trimmed == "" {
		return "", ""
	}

	parts := strings.FieldsFunc(trimmed, func(r rune) bool {
		return r == '-' || r == '/' || r == ' ' || r == '_'
	})
	year := parts[0]
	semester := ""
	if len(parts) > 1 {
		switch strings.ToUpper(parts[1]) {
		case "H1", "1", "I":
			semester = "SEMESTER I"
		case "H2", "2", "II":
			semester = "SEMESTER II"
		}
	}
	return year, semester
}

func sanitizeFilename(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "evaluation"
	}

	builder := strings.Builder{}
	for _, r := range trimmed {
		switch {
		case unicode.IsLetter(r), unicode.IsDigit(r):
			builder.WriteRune(r)
		case r == '-', r == '_':
			builder.WriteRune(r)
		default:
			builder.WriteRune('-')
		}
	}

	result := strings.Trim(builder.String(), "-_")
	if result == "" {
		return "evaluation"
	}
	return result
}
