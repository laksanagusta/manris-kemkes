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
	var reports []*entity.KRIReport
	var err error

	if input.KRIID != nil {
		reports, err = uc.reportRepo.ListByKRI(ctx, *input.KRIID)
	} else if input.UserID != nil {
		reports, err = uc.reportRepo.ListByUser(ctx, *input.UserID, input.Status)
	} else if input.Status != "" {
		reports, err = uc.reportRepo.ListByStatus(ctx, input.Status)
	} else {
		return nil, fmt.Errorf("one of kriID, userID, or status is required")
	}

	if err != nil {
		return nil, err
	}

	now := time.Now()
	for _, report := range reports {
		if report.Status == "pending" || report.Status == "revision_requested" {
			dueDate, parseErr := time.Parse("2006-01-02", report.DueDate)
			if parseErr == nil && dueDate.Before(now) {
				report.IsOverdue = true
			}
		}
	}

	return reports, nil
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
	EvidenceURL string    `json:"evidenceUrl"`
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
	report.EvidenceURL = input.EvidenceURL

	// Reset review metadata on resubmit
	report.ReviewedBy = nil
	report.ReviewedAt = nil
	report.ReviewNote = ""

	if err := uc.reportRepo.Update(ctx, report); err != nil {
		return nil, fmt.Errorf("update report: %w", err)
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

		today := now.Truncate(24 * time.Hour)
		if !today.Equal(periodStart) {
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

// ============================================================================
// AcceptReportUseCase — reviewer accepts a submitted report
// ============================================================================

type AcceptReportUseCase struct {
	reportRepo repository.KRIReportRepository
	kriRepo    repository.KRIRepository
}

func NewAcceptReportUseCase(
	reportRepo repository.KRIReportRepository,
	kriRepo repository.KRIRepository,
) *AcceptReportUseCase {
	return &AcceptReportUseCase{reportRepo: reportRepo, kriRepo: kriRepo}
}

type AcceptReportInput struct {
	ReportID   uuid.UUID
	ReviewedBy uuid.UUID
	ReviewNote string
}

func (uc *AcceptReportUseCase) Execute(ctx context.Context, input AcceptReportInput) (*entity.KRIReport, error) {
	report, err := uc.reportRepo.GetByID(ctx, input.ReportID)
	if err != nil {
		return nil, fmt.Errorf("report not found: %w", err)
	}

	if report.Status != "submitted" {
		return nil, fmt.Errorf("cannot accept report with status '%s'", report.Status)
	}

	now := time.Now()
	report.Status = "accepted"
	report.ReviewedBy = &input.ReviewedBy
	report.ReviewedAt = &now
	report.ReviewNote = input.ReviewNote

	if err := uc.reportRepo.Update(ctx, report); err != nil {
		return nil, fmt.Errorf("update report: %w", err)
	}

	if report.Value != nil {
		kri, err := uc.kriRepo.GetByID(ctx, report.KRIID)
		if err == nil {
			kri.CurrentValue = *report.Value
			if updateErr := uc.kriRepo.Update(ctx, kri); updateErr != nil {
				report.Status = "submitted"
				report.ReviewedBy = nil
				report.ReviewedAt = nil
				report.ReviewNote = ""
				_ = uc.reportRepo.Update(ctx, report)
				return nil, fmt.Errorf("update kri after accepting report: %w", updateErr)
			}
		}
	}

	return report, nil
}

// ============================================================================
// RequestRevisionUseCase — reviewer requests revision on a submitted report
// ============================================================================

type RequestRevisionUseCase struct {
	reportRepo repository.KRIReportRepository
}

func NewRequestRevisionUseCase(reportRepo repository.KRIReportRepository) *RequestRevisionUseCase {
	return &RequestRevisionUseCase{reportRepo: reportRepo}
}

type RequestRevisionInput struct {
	ReportID   uuid.UUID `json:"-"`
	ReviewedBy uuid.UUID `json:"-"`
	ReviewNote string    `json:"review_note"`
}

func (uc *RequestRevisionUseCase) Execute(ctx context.Context, input RequestRevisionInput) (*entity.KRIReport, error) {
	if strings.TrimSpace(input.ReviewNote) == "" {
		return nil, fmt.Errorf("review_note is required for revision request")
	}

	report, err := uc.reportRepo.GetByID(ctx, input.ReportID)
	if err != nil {
		return nil, fmt.Errorf("report not found: %w", err)
	}

	if report.Status != "submitted" {
		return nil, fmt.Errorf("report must be in submitted status to request revision, current: %s", report.Status)
	}

	now := time.Now()
	report.Status = "revision_requested"
	report.ReviewedBy = &input.ReviewedBy
	report.ReviewedAt = &now
	report.ReviewNote = input.ReviewNote

	if err := uc.reportRepo.Update(ctx, report); err != nil {
		return nil, fmt.Errorf("update report: %w", err)
	}

	return uc.reportRepo.GetByID(ctx, report.ID)
}

// ============================================================================
// SkipReportUseCase — skip a pending report
// ============================================================================

type SkipReportUseCase struct {
	reportRepo repository.KRIReportRepository
}

func NewSkipReportUseCase(reportRepo repository.KRIReportRepository) *SkipReportUseCase {
	return &SkipReportUseCase{reportRepo: reportRepo}
}

type SkipReportInput struct {
	ReportID    uuid.UUID `json:"-"`
	SubmittedBy uuid.UUID `json:"-"`
	SkipReason  string    `json:"skip_reason"`
}

func (uc *SkipReportUseCase) Execute(ctx context.Context, input SkipReportInput) (*entity.KRIReport, error) {
	if strings.TrimSpace(input.SkipReason) == "" {
		return nil, fmt.Errorf("skip_reason is required")
	}

	report, err := uc.reportRepo.GetByID(ctx, input.ReportID)
	if err != nil {
		return nil, fmt.Errorf("report not found: %w", err)
	}

	if report.Status != "pending" && report.Status != "overdue" {
		return nil, fmt.Errorf("report must be pending or overdue to skip, current: %s", report.Status)
	}

	report.Status = "skipped"
	report.Notes = input.SkipReason
	if err := uc.reportRepo.Update(ctx, report); err != nil {
		return nil, fmt.Errorf("update report: %w", err)
	}

	return uc.reportRepo.GetByID(ctx, report.ID)
}

// ============================================================================
// Role helpers
// ============================================================================

func CanSubmitOrSkip(role string) bool {
	return role == "unit" || role == "super_admin"
}

func CanReview(role string) bool {
	return role == "reviewer" || role == "super_admin"
}
