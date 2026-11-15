package evaluation

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/timeutil"
)

type CreateUseCase struct {
	repo    repository.EvaluationRepository
	orgRepo repository.OrganizationRepository
}

func NewCreateUseCase(repo repository.EvaluationRepository, orgRepo repository.OrganizationRepository) *CreateUseCase {
	return &CreateUseCase{repo: repo, orgRepo: orgRepo}
}

type CreateInput struct {
	ProfileVersionID   *uuid.UUID          `json:"profileVersionId"`
	MonitoringPeriodID *uuid.UUID          `json:"monitoringPeriodId"`
	TemplateKey        string              `json:"templateKey"`
	CreatedBy          *uuid.UUID          `json:"-"`
	Scope              *entity.AccessScope `json:"-"`
}

func (uc *CreateUseCase) Execute(ctx context.Context, input CreateInput) (*entity.Evaluation, error) {
	if input.Scope == nil || input.Scope.OrganizationID == nil || *input.Scope.OrganizationID == uuid.Nil {
		return nil, errors.Wrap(errors.ErrForbidden, "Akun belum terhubung ke organisasi.")
	}
	if input.CreatedBy == nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, "created by is required")
	}
	orgID := *input.Scope.OrganizationID
	period := evaluationPeriodAt(timeutil.BusinessNow())
	if input.ProfileVersionID == nil && input.MonitoringPeriodID != nil {
		return nil, errors.ErrInvalidInput
	}
	if input.ProfileVersionID != nil && input.MonitoringPeriodID != nil {
		configured, ok := uc.repo.(interface {
			ConfiguredEvaluationPeriod(context.Context, uuid.UUID, uuid.UUID, uuid.UUID) (string, error)
		})
		if !ok {
			return nil, errors.ErrInvalidInput
		}
		var err error
		period, err = configured.ConfiguredEvaluationPeriod(ctx, *input.ProfileVersionID, *input.MonitoringPeriodID, orgID)
		if err != nil {
			return nil, err
		}
	}

	templateKey := normalizeText(input.TemplateKey)
	if templateKey == "" {
		templateKey = DefaultTemplateKey
	}

	template, err := uc.repo.GetActiveTemplate(ctx, templateKey)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load active evaluation template")
	}
	if template == nil {
		return nil, errors.ErrNotFound
	}

	org, err := uc.orgRepo.GetByID(ctx, orgID)
	if err != nil {
		return nil, errors.Wrap(errors.ErrNotFound, "organization not found")
	}

	evaluation := &entity.Evaluation{
		ProfileVersionID: input.ProfileVersionID, MonitoringPeriodID: input.MonitoringPeriodID,
		OrganizationID: orgID,
		Period:         period,
		TemplateID:     template.ID,
		TemplateName:   template.Name,
		Status:         entity.EvaluationStatusDraft,
		CreatedBy:      input.CreatedBy,
		UnitLocation:   strings.TrimSpace(org.Location),
		UnitAddress:    strings.TrimSpace(org.Address),
		Sections:       snapshotFromTemplate(template),
	}

	if err := evaluation.Validate(); err != nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, err.Error())
	}

	if input.MonitoringPeriodID == nil {
		exists, err := uc.repo.ExistsByOrgPeriodTemplate(ctx, evaluation.OrganizationID, evaluation.Period, evaluation.TemplateID, nil)
		if err != nil {
			return nil, errors.Wrap(err, "failed to validate evaluation uniqueness")
		}
		if exists {
			return nil, errors.Wrap(errors.ErrInvalidInput, "Evaluasi untuk organisasi dan triwulan ini sudah ada. Buka dokumen yang ada dari daftar evaluasi.")
		}

	}
	if err := uc.repo.Create(ctx, evaluation); err != nil {
		return nil, errors.Wrap(err, "failed to create evaluation")
	}

	return evaluation, nil
}

func evaluationPeriodAt(now time.Time) string {
	local := now.In(timeutil.JakartaLocation())
	return fmt.Sprintf("%04d-Q%d", local.Year(), (int(local.Month())-1)/3+1)
}

func formatMonitoringDateRange(period string) string {
	trimmed := strings.TrimSpace(period)
	if trimmed == "" {
		return ""
	}

	parts := strings.Split(trimmed, "-")
	if len(parts) != 2 {
		return trimmed
	}

	year := strings.TrimSpace(parts[0])
	half := strings.ToUpper(strings.TrimSpace(parts[1]))

	switch half {
	case "Q1":
		return "Kuartal I Tahun " + year
	case "Q2":
		return "Semester I Tahun " + year
	case "Q3":
		return "Kuartal III Tahun " + year
	case "Q4":
		return "Semester II Tahun " + year
	case "H1":
		return "Semester I Tahun " + year
	case "H2":
		return "Semester II Tahun " + year
	default:
		return trimmed
	}
}
