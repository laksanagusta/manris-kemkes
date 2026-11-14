package risk

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/timeutil"
)

type monitoringSourceResolver interface {
	ResolveMonitoringSource(context.Context, uuid.UUID, string, []uuid.UUID) (*entity.Risk, error)
}

func monitoringObservationDate(value string, now time.Time) (string, string, error) {
	today := now.In(timeutil.JakartaLocation()).Format("2006-01-02")
	if value == "" {
		value = today
	}
	date, err := time.ParseInLocation("2006-01-02", value, timeutil.JakartaLocation())
	if err != nil || value > today {
		return "", "", &domainerrors.AppError{Code: "INVALID_INPUT", Message: "Tanggal pemantauan harus valid dan tidak boleh melewati hari ini."}
	}
	return value, fmt.Sprintf("%04d-Q%d", date.Year(), (int(date.Month())-1)/3+1), nil
}

// ResolveMonitoringObservation also supports existing callers that only send a
// quarter. In that case use the last available calendar day in that quarter.
func ResolveMonitoringObservation(value, legacyCycle string, now time.Time) (string, string, error) {
	if value == "" && legacyCycle != "" {
		if !IsValidQuarterFormat(legacyCycle) {
			return "", "", domainerrors.ErrCycleFormat
		}
		year, err := CycleYear(legacyCycle)
		if err != nil {
			return "", "", err
		}
		quarter := int(legacyCycle[6] - '0')
		localNow := now.In(timeutil.JakartaLocation())
		start := time.Date(year, time.Month(quarter*3-2), 1, 0, 0, 0, 0, localNow.Location())
		if localNow.Before(start) {
			return "", "", &domainerrors.AppError{Code: "INVALID_INPUT", Message: "Periode pemantauan belum dimulai."}
		}
		end := start.AddDate(0, 3, -1)
		value = min(end.Format(time.DateOnly), localNow.Format(time.DateOnly))
	}
	return monitoringObservationDate(value, now)
}

func validateObservationAfterSource(source *entity.Risk, value string) error {
	effective := source.CreatedAt
	if source.EffectiveFrom != nil {
		effective = *source.EffectiveFrom
	}
	if !effective.IsZero() && value < effective.In(timeutil.JakartaLocation()).Format("2006-01-02") {
		return domainerrors.ErrMonitoringBeforeRiskEffective
	}
	return nil
}

func findOpenMonitoringDraft(ctx context.Context, repo monitoringTransactionRepository, groupID uuid.UUID, cycle string) (*entity.RiskMonitoring, error) {
	if drafts, ok := repo.(interface {
		GetOpenDraftByVersionGroup(context.Context, uuid.UUID) (*entity.RiskMonitoring, error)
	}); ok {
		return drafts.GetOpenDraftByVersionGroup(ctx, groupID)
	}
	return repo.GetByVersionGroupAndCycle(ctx, groupID, cycle)
}

func monitoringDraftOutput(m *entity.RiskMonitoring, existing bool) *StartMonitoringOutput {
	return &StartMonitoringOutput{Monitoring: m, ExistingDraft: existing, Message: "Draf pemantauan tersedia.", RedirectURL: "/risk/monitoring/" + m.ID.String()}
}

func findMonitoringForContext(ctx context.Context, repo monitoringTransactionRepository, group uuid.UUID, profile, period *uuid.UUID, cycle string) (*entity.RiskMonitoring, error) {
	if profile != nil && period != nil {
		if configured, ok := repo.(interface {
			GetByProfilePeriod(context.Context, uuid.UUID, uuid.UUID, uuid.UUID) (*entity.RiskMonitoring, error)
		}); ok {
			return configured.GetByProfilePeriod(ctx, group, *profile, *period)
		}
		return nil, domainerrors.ErrInvalidInput
	}
	return findOpenMonitoringDraft(ctx, repo, group, cycle)
}
