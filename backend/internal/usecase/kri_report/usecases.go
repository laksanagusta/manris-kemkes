package kri_report

import (
	"context"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// ============================================================================
// ListReportsUseCase — list KRI reports by KRI or by user
// ============================================================================

type ListReportsUseCase struct {
	reportRepo repository.KRIReportRepository
}

func NewListReportsUseCase(reportRepo repository.KRIReportRepository) *ListReportsUseCase {
	return &ListReportsUseCase{reportRepo: reportRepo}
}

type ListReportsInput struct {
	KRIID  *uuid.UUID
	UserID *uuid.UUID
	Status string
}

func (uc *ListReportsUseCase) Execute(ctx context.Context, input ListReportsInput) ([]*entity.KRIReport, error) {
	if input.KRIID != nil {
		return uc.reportRepo.ListByKRI(ctx, *input.KRIID)
	}
	if input.UserID != nil {
		return uc.reportRepo.ListByUser(ctx, *input.UserID, input.Status)
	}
	return nil, fmt.Errorf("one of kriID or userID is required")
}

// ============================================================================
// SubmitReportUseCase — user submits a KRI report value
// ============================================================================

type SubmitReportUseCase struct {
	reportRepo repository.KRIReportRepository
	kriRepo    repository.KRIRepository
}

func NewSubmitReportUseCase(
	reportRepo repository.KRIReportRepository,
	kriRepo repository.KRIRepository,
) *SubmitReportUseCase {
	return &SubmitReportUseCase{
		reportRepo: reportRepo,
		kriRepo:    kriRepo,
	}
}

type SubmitReportInput struct {
	ReportID    uuid.UUID `json:"reportId"`
	Value       float64   `json:"value"`
	Notes       string    `json:"notes"`
	SubmittedBy uuid.UUID `json:"-"`
}

func (uc *SubmitReportUseCase) Execute(ctx context.Context, input SubmitReportInput) (*entity.KRIReport, error) {
	if math.IsNaN(input.Value) || math.IsInf(input.Value, 0) || input.Value < 0 {
		return nil, domainerrors.ErrInvalidKRIValue
	}

	notes := strings.TrimSpace(input.Notes)
	if len(notes) > 1000 {
		return nil, domainerrors.ErrInvalidNotes
	}

	// 1. Get the report
	report, err := uc.reportRepo.GetByID(ctx, input.ReportID)
	if err != nil {
		return nil, fmt.Errorf("report not found: %w", err)
	}

	// 2. Validate status
	if report.Status == "submitted" {
		return nil, fmt.Errorf("report has already been submitted")
	}

	// 3. Update report fields
	now := time.Now()
	report.Value = &input.Value
	report.Notes = notes
	report.Status = "submitted"
	report.SubmittedBy = &input.SubmittedBy
	report.SubmittedAt = &now

	if err := uc.reportRepo.Update(ctx, report); err != nil {
		return nil, fmt.Errorf("update report: %w", err)
	}

	// 4. Update the KRI's current value from this latest report
	kri, err := uc.kriRepo.GetByID(ctx, report.KRIID)
	if err == nil {
		kri.CurrentValue = input.Value
		_ = uc.kriRepo.Update(ctx, kri)
	}

	// 5. Re-fetch to get joined fields
	return uc.reportRepo.GetByID(ctx, report.ID)
}

// ============================================================================
// GenerateReportsUseCase — auto-generate pending reports (called by cron)
// ============================================================================

type GenerateReportsUseCase struct {
	reportRepo repository.KRIReportRepository
}

func NewGenerateReportsUseCase(reportRepo repository.KRIReportRepository) *GenerateReportsUseCase {
	return &GenerateReportsUseCase{reportRepo: reportRepo}
}

func (uc *GenerateReportsUseCase) Execute(ctx context.Context, now time.Time) (int, error) {
	kris, err := uc.reportRepo.GetAllKRIs(ctx)
	if err != nil {
		return 0, fmt.Errorf("get all kris: %w", err)
	}

	created := 0

	for _, kri := range kris {
		var periodStart, periodEnd, dueDate time.Time
		var periodLabel string

		switch kri.Frequency {
		case "harian":
			periodStart = now.Truncate(24 * time.Hour)
			periodEnd = periodStart
			dueDate = periodStart.Add(23*time.Hour + 59*time.Minute)
			periodLabel = now.Format("2 Jan 2006")

		case "mingguan":
			weekday := int(now.Weekday())
			if weekday == 0 {
				weekday = 7
			}
			periodStart = now.AddDate(0, 0, -(weekday - 1)).Truncate(24 * time.Hour)
			periodEnd = periodStart.AddDate(0, 0, 6)
			dueDate = periodEnd // Due at end of week
			_, weekNum := now.ISOWeek()
			periodLabel = fmt.Sprintf("Minggu %d, %s", weekNum, now.Format("Jan 2006"))

		case "bulanan":
			periodStart = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
			periodEnd = periodStart.AddDate(0, 1, -1)
			// Due date = 5th of the NEXT month
			dueMonth := periodStart.AddDate(0, 1, 0)
			reportDate := 5
			maxDay := time.Date(dueMonth.Year(), dueMonth.Month()+1, 0, 0, 0, 0, 0, now.Location()).Day()
			if reportDate > maxDay {
				reportDate = maxDay
			}
			dueDate = time.Date(dueMonth.Year(), dueMonth.Month(), reportDate, 0, 0, 0, 0, now.Location())
			periodLabel = fmt.Sprintf("%s %d", now.Month().String(), now.Year())

		default:
			continue
		}

		pStart := periodStart.Format("2006-01-02")
		pEnd := periodEnd.Format("2006-01-02")

		// Check if report already exists for this period
		exists, err := uc.reportRepo.ReportExistsForPeriod(ctx, kri.ID, pStart, pEnd)
		if err != nil {
			continue
		}
		if exists {
			continue
		}

		report := &entity.KRIReport{
			KRIID:       kri.ID,
			PeriodLabel: periodLabel,
			PeriodStart: pStart,
			PeriodEnd:   pEnd,
			DueDate:     dueDate.Format("2006-01-02"),
			Status:      "pending",
			GeneratedBy: "cron",
		}

		err = uc.reportRepo.Create(ctx, report)
		if err != nil {
			fmt.Printf("Create KRI report error: %v\n", err)
			continue
		}
		fmt.Printf("Successfully created KRI report ID: %s for KRI: %s\n", report.ID, kri.ID)
		created++
	}

	return created, nil
}

// ============================================================================
// MarkOverdueUseCase — marks pending reports past due_date as overdue
// ============================================================================

type MarkOverdueUseCase struct {
	reportRepo repository.KRIReportRepository
}

func NewMarkOverdueUseCase(reportRepo repository.KRIReportRepository) *MarkOverdueUseCase {
	return &MarkOverdueUseCase{reportRepo: reportRepo}
}

func (uc *MarkOverdueUseCase) Execute(ctx context.Context, refDate time.Time) (int, error) {
	reports, err := uc.reportRepo.ListPendingOverdue(ctx, refDate)
	if err != nil {
		return 0, err
	}

	marked := 0
	for _, rpt := range reports {
		rpt.Status = "overdue"
		if err := uc.reportRepo.Update(ctx, rpt); err != nil {
			continue
		}
		marked++
	}
	return marked, nil
}
