package report

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
	"github.com/manris/backend/internal/timeutil"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

type unitProgressReader interface {
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
	result := &entity.UnitProgressReport{
		Cycle: cycle, MonitoringAvailable: !now.Before(windowStart), Organizations: data.Organizations,
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
			Overdue: overdue, ReportedLate: service.QuarterlyTaskReportLate(task.MitigationTask),
		})
	}
	return result, nil
}
