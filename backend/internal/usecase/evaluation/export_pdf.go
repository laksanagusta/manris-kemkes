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

type organizationGetter interface {
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Organization, error)
}

type ExportPDFUseCase struct {
	repo     repository.EvaluationRepository
	orgRepo  organizationGetter
	renderer service.FormalReportPDFRenderer
}

func NewExportPDFUseCase(
	repo repository.EvaluationRepository,
	orgRepo organizationGetter,
	renderer service.FormalReportPDFRenderer,
) *ExportPDFUseCase {
	return &ExportPDFUseCase{
		repo:     repo,
		orgRepo:  orgRepo,
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

	reportData := buildMonitoringEvaluationReportData(evaluation, org)
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
		Filename: fmt.Sprintf("evaluation-%s-%s.pdf", sanitizeFilename(org.Name), sanitizeFilename(evaluation.Period)),
		Bytes:    pdfBytes,
	}, nil
}

func buildMonitoringEvaluationReportData(evaluation *entity.Evaluation, org *entity.Organization) *entity.MonitoringEvaluationReportData {
	data := &entity.MonitoringEvaluationReportData{
		Organization:           org,
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
	}
	if org != nil {
		data.OrganizationName = org.Name
	}
	data.Year, data.SemesterLabel = monitoringYearAndSemester(evaluation.Period)

	for _, section := range evaluation.Sections {
		rows := make([]entity.MonitoringEvaluationChecklistRow, 0, len(section.Items))
		for _, item := range section.Items {
			rows = append(rows, entity.MonitoringEvaluationChecklistRow{
				No:          item.ItemNo,
				Item:        item.Label,
				Yes:         item.Answer == entity.EvaluationAnswerYes,
				NoChecked:   item.Answer == entity.EvaluationAnswerNo,
				Condition:   item.Condition,
				Description: item.Description,
				Analysis:    item.Analysis,
			})
		}
		switch strings.TrimSpace(strings.ToLower(section.SectionKey)) {
		case "document_completeness":
			data.DocumentChecklist = rows
		case "infrastructure_adequacy":
			data.InfrastructureChecklist = rows
		case "implementation_result":
			data.ResultChecklist = rows
		}
	}
	return data
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
