package formalreport

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type riskSummarySource interface {
	ListApprovedRisks(ctx context.Context, orgIDs []uuid.UUID, query string) ([]*entity.Risk, error)
}

type incidentSummarySource interface {
	List(ctx context.Context, orgIDs []uuid.UUID) ([]*entity.Incident, error)
}

type tmpmrSummarySource interface {
	List(ctx context.Context, filter repository.TMPMRListFilter) ([]*entity.TMPMRAssessment, int, error)
}

type GenerateFormalReportUseCase struct {
	reportRepo   repository.FormalReportRepository
	riskRepo     riskSummarySource
	incidentRepo incidentSummarySource
	tmpmrRepo    tmpmrSummarySource
}

func NewGenerateFormalReportUseCase(
	reportRepo repository.FormalReportRepository,
	riskRepo repository.RiskRepository,
	incidentRepo repository.IncidentRepository,
	tmpmrRepo repository.TMPMRRepository,
) *GenerateFormalReportUseCase {
	return &GenerateFormalReportUseCase{
		reportRepo:   reportRepo,
		riskRepo:     riskRepo,
		incidentRepo: incidentRepo,
		tmpmrRepo:    tmpmrRepo,
	}
}

type GenerateFormalReportInput struct {
	OrganizationID uuid.UUID  `json:"organizationId"`
	Period         string     `json:"period"`
	ReportType     string     `json:"reportType"`
	GeneratedBy    *uuid.UUID `json:"generatedBy"`
	Scope          *entity.AccessScope
}

func (uc *GenerateFormalReportUseCase) Execute(ctx context.Context, input GenerateFormalReportInput) (*entity.FormalReport, error) {
	if err := validateFormalReportAccess(input.Scope, input.OrganizationID, true); err != nil {
		return nil, errors.ErrForbidden
	}

	reportType := normalizeFormalReportType(input.ReportType)
	if reportType != "" && reportType != entity.FormalReportTypeMonitoringEvaluation {
		return nil, errors.Wrap(errors.ErrInvalidInput, "invalid formal report type")
	}
	reportType = entity.FormalReportTypeMonitoringEvaluation
	report := &entity.FormalReport{
		OrganizationID:   input.OrganizationID,
		Period:           strings.TrimSpace(input.Period),
		ReportType:       reportType,
		Status:           entity.FormalReportStatusGenerated,
		GeneratedBy:      input.GeneratedBy,
		GeneratedFileURL: "",
	}

	if err := report.Validate(); err != nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, err.Error())
	}

	now := time.Now().UTC()
	summary := map[string]any{
		"headline":       formalReportHeadline(reportType),
		"focus":          reportType,
		"riskCount":      0,
		"incidentCount":  0,
		"tmpmrCount":     0,
		"tmpmrScore":     0,
		"tmpmrLevel":     "",
		"sourceWarnings": []string{},
	}

	orgIDs := []uuid.UUID{input.OrganizationID}

	if risks, err := uc.riskRepo.ListApprovedRisks(ctx, orgIDs, ""); err == nil {
		summary["riskCount"] = len(risks)
	} else {
		summary["sourceWarnings"] = append(summary["sourceWarnings"].([]string), "risk data unavailable")
	}

	if incidents, err := uc.incidentRepo.List(ctx, orgIDs); err == nil {
		summary["incidentCount"] = len(incidents)
	} else {
		summary["sourceWarnings"] = append(summary["sourceWarnings"].([]string), "incident data unavailable")
	}

	if assessments, total, err := uc.tmpmrRepo.List(ctx, repository.TMPMRListFilter{
		OrganizationID: &input.OrganizationID,
		Period:         report.Period,
		Page:           1,
		Limit:          100,
	}); err == nil {
		summary["tmpmrCount"] = total
		if latest := latestTMPMRAssessment(assessments); latest != nil {
			summary["tmpmrScore"] = latest.Score
			summary["tmpmrLevel"] = latest.MaturityLevel
		}
	} else {
		summary["sourceWarnings"] = append(summary["sourceWarnings"].([]string), "tmpmr data unavailable")
	}

	report.Metadata = formalReportMetadata(input.OrganizationID, report.Period, report.ReportType, now, summary)
	report.GeneratedAt = &now
	if report.ID == uuid.Nil {
		report.ID = uuid.New()
	}
	report.GeneratedFileURL = buildFormalReportDownloadURL(report.ID)

	if err := uc.reportRepo.UpsertGenerated(ctx, report); err != nil {
		return nil, errors.Wrap(err, "failed to generate formal report")
	}
	return report, nil
}

func latestTMPMRAssessment(assessments []*entity.TMPMRAssessment) *entity.TMPMRAssessment {
	var latest *entity.TMPMRAssessment
	for _, assessment := range assessments {
		if assessment == nil {
			continue
		}
		if latest == nil {
			latest = assessment
			continue
		}

		left := assessment.UpdatedAt
		right := latest.UpdatedAt
		if left.Equal(right) {
			if assessment.CreatedAt.After(latest.CreatedAt) {
				latest = assessment
			}
			continue
		}
		if left.After(right) {
			latest = assessment
		}
	}
	return latest
}
