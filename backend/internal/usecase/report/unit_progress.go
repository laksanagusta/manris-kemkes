package report

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
	"github.com/manris/backend/internal/timeutil"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

type unitProgressReader interface {
	ListUnitProgressProfiles(context.Context, []uuid.UUID) ([]entity.UnitProgressProfile, error)
	ReadUnitProgress(context.Context, repository.QuarterlyReportPeriod, []uuid.UUID) (*entity.UnitProgressSnapshot, error)
}

type UnitProgressUseCase struct {
	repo unitProgressReader
}

func NewUnitProgressUseCase(repo unitProgressReader) *UnitProgressUseCase {
	return &UnitProgressUseCase{repo: repo}
}

func (uc *UnitProgressUseCase) Execute(ctx context.Context, cycle string, orgIDs []uuid.UUID) (*entity.UnitProgressReport, error) {
	now := timeutil.BusinessNow().In(timeutil.JakartaLocation())
	current := fmt.Sprintf("%04d-Q%d", now.Year(), (int(now.Month())-1)/3+1)
	if cycle == "" {
		cycle, _ = riskuc.PreviousQuarterCycle(current)
	}
	if !riskuc.IsValidQuarterFormat(cycle) || cycle < "2000-Q1" || cycle > current {
		return nil, domainerrors.Wrap(domainerrors.ErrInvalidInput, "periode harus berupa kuartal yang sudah dimulai")
	}
	start, end := service.QuarterlyPeriodBounds(cycle)
	data, err := uc.repo.ReadUnitProgress(ctx, repository.QuarterlyReportPeriod{Cycle: cycle, Start: start, End: end}, orgIDs)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to read unit progress")
	}

	windowStart, _, err := entity.MonitoringWindow(cycle)
	if err != nil {
		return nil, err
	}
	return buildUnitProgressReport(data, cycle, !now.Before(windowStart), now), nil
}

func buildUnitProgressReport(data *entity.UnitProgressSnapshot, cycle string, available bool, now time.Time) *entity.UnitProgressReport {
	result := &entity.UnitProgressReport{
		Cycle: cycle, MonitoringAvailable: available, Organizations: data.Organizations,
		Risks: data.Risks, WorkingPapers: data.WorkingPapers, Evaluations: data.Evaluations,
		Mitigations: make([]entity.UnitProgressMitigation, 0, len(data.Tasks)),
	}
	for _, task := range data.Tasks {
		status := service.QuarterlyTaskReportingStatus(task.MitigationTask, cycle, now)
		overdue := status == "overdue"
		if task.Status == entity.MitigationTaskStatusDone && status != "reported" {
			status = "incomplete"
		}
		result.Mitigations = append(result.Mitigations, entity.UnitProgressMitigation{
			UnitProgressItem: entity.UnitProgressItem{
				ID: task.ID, OrganizationID: task.OrganizationID, Code: task.RiskCode, Title: task.MitigationAction,
				Status: status, UpdatedAt: task.UpdatedAt,
			},
			RiskTitle: task.RiskTitle, Owner: task.MitigationOwner, DueDate: task.DueDate,
			ExecutionStatus: task.Status,
			Overdue:         overdue, ReportedLate: service.QuarterlyTaskReportLate(task.MitigationTask),
		})
	}
	return result
}

func (uc *UnitProgressUseCase) Profiles(ctx context.Context, orgIDs []uuid.UUID) ([]entity.UnitProgressProfile, error) {
	return uc.repo.ListUnitProgressProfiles(ctx, orgIDs)
}

func (uc *UnitProgressUseCase) ExecuteProfile(ctx context.Context, profileID, periodID string, orgIDs []uuid.UUID) (*entity.UnitProgressReport, error) {
	profiles, err := uc.Profiles(ctx, orgIDs)
	if err != nil {
		return nil, err
	}
	var profile *entity.UnitProgressProfile
	for i := range profiles {
		if profiles[i].ID == profileID {
			profile = &profiles[i]
			break
		}
	}
	if profile == nil {
		return nil, domainerrors.Wrap(domainerrors.ErrInvalidInput, "profil tidak tersedia dalam lingkup unit yang dipilih")
	}
	period, available, err := unitProgressProfilePeriod(*profile, periodID, timeutil.BusinessNow())
	if err != nil {
		return nil, err
	}
	data, err := uc.repo.ReadUnitProgress(ctx, period, orgIDs)
	if err != nil {
		return nil, fmt.Errorf("read profile unit progress: %w", err)
	}
	return buildUnitProgressReport(data, period.Cycle, available, timeutil.BusinessNow()), nil
}

func unitProgressProfilePeriod(profile entity.UnitProgressProfile, id string, now time.Time) (repository.QuarterlyReportPeriod, bool, error) {
	out := repository.QuarterlyReportPeriod{ProfileYear: profile.Year, RuleID: profile.RuleID}
	invalid := domainerrors.Wrap(domainerrors.ErrInvalidInput, "periode harus sesuai rules profil yang dipilih")
	if profile.RuleID == nil {
		if !riskuc.IsValidQuarterFormat(id) || id[:4] != fmt.Sprintf("%04d", profile.Year) {
			return out, false, invalid
		}
		out.Cycle = id
		out.Start, out.End = service.QuarterlyPeriodBounds(id)
		start, _, err := entity.MonitoringWindow(id)
		return out, !now.Before(start), err
	}
	for _, p := range profile.Periods {
		if p.ID.String() != id {
			continue
		}
		start, end, err := entity.MonitoringPeriodCalendarBounds(profile.Year, profile.Frequency, p.Ordinal)
		if err != nil {
			return out, false, err
		}
		out.Start = start
		out.End = end.AddDate(0, 0, 1)
		out.MonitoringPeriodID = &p.ID
		out.Cycle = p.Label
		today := now.In(timeutil.JakartaLocation()).Format(time.DateOnly)
		return out, today >= p.OpensOn, nil
	}
	return out, false, invalid
}
