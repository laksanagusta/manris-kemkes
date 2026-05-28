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
	"github.com/manris/backend/internal/timeutil"
)

// ============================================================================
// ListReportsUseCase
// ============================================================================

type ListReportsUseCase struct {
	reportRepo repository.KRIReportRepository
	kriRepo    repository.KRIRepository
}

func NewListReportsUseCase(
	reportRepo repository.KRIReportRepository,
	kriRepo repository.KRIRepository,
) *ListReportsUseCase {
	return &ListReportsUseCase{reportRepo: reportRepo, kriRepo: kriRepo}
}

type ListReportsInput struct {
	KRIID  *uuid.UUID
	UserID *uuid.UUID
	Status string
	OrgIDs []uuid.UUID
}

func (uc *ListReportsUseCase) Execute(ctx context.Context, input ListReportsInput) ([]*entity.KRIReport, error) {
	if input.KRIID != nil {
		if _, err := uc.kriRepo.GetByID(ctx, *input.KRIID, input.OrgIDs); err != nil {
			return nil, fmt.Errorf("KRI not found or not accessible: %w", err)
		}
	}

	var reports []*entity.KRIReport
	var err error

	if input.KRIID != nil {
		reports, err = uc.reportRepo.ListByKRI(ctx, *input.KRIID, input.OrgIDs)
	} else if input.UserID != nil {
		reports, err = uc.reportRepo.ListByUser(ctx, *input.UserID, input.Status, input.OrgIDs)
	} else if input.Status != "" {
		reports, err = uc.reportRepo.ListByStatus(ctx, input.Status, input.OrgIDs)
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
// SubmitReportUseCase
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
	OrgIDs      []uuid.UUID
}

func (uc *SubmitReportUseCase) Execute(ctx context.Context, input SubmitReportInput) (*entity.KRIReport, error) {
	if math.IsNaN(input.Value) || math.IsInf(input.Value, 0) || input.Value < 0 {
		return nil, domainerrors.ErrInvalidKRIValue
	}

	notes := strings.TrimSpace(input.Notes)
	if len(notes) > 1000 {
		return nil, domainerrors.ErrInvalidNotes
	}

	report, err := uc.reportRepo.GetByID(ctx, input.ReportID, input.OrgIDs)
	if err != nil {
		return nil, fmt.Errorf("report not found: %w", err)
	}

	if _, err := uc.kriRepo.GetByID(ctx, report.KRIID, input.OrgIDs); err != nil {
		return nil, domainerrors.ErrForbidden
	}

	if report.Status == "submitted" {
		return nil, fmt.Errorf("report has already been submitted")
	}

	periodEnd, err := time.Parse("2006-01-02", report.PeriodEnd)
	if err != nil {
		return nil, fmt.Errorf("invalid period end date: %w", err)
	}

	loc := timeutil.JakartaLocation()
	now := time.Now().In(loc)
	hPlus1Start := time.Date(periodEnd.Year(), periodEnd.Month(), periodEnd.Day()+1, 0, 0, 0, 0, loc)
	hPlus3End := time.Date(periodEnd.Year(), periodEnd.Month(), periodEnd.Day()+3, 23, 59, 59, 0, loc)

	if now.Before(hPlus1Start) || now.After(hPlus3End) {
		return nil, domainerrors.ErrSubmissionWindowClosed
	}

	report.Value = &input.Value
	report.Notes = notes
	report.Status = "submitted"
	report.SubmittedBy = &input.SubmittedBy
	report.SubmittedAt = &now
	report.EvidenceURL = input.EvidenceURL

	report.ReviewedBy = nil
	report.ReviewedAt = nil
	report.ReviewNote = ""

	if err := uc.reportRepo.Update(ctx, report); err != nil {
		return nil, fmt.Errorf("update report: %w", err)
	}

	return uc.reportRepo.GetByID(ctx, report.ID, input.OrgIDs)
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
			dueDate = periodEnd
			_, weekNum := now.ISOWeek()
			periodLabel = fmt.Sprintf("Minggu %d, %s", weekNum, now.Format("Jan 2006"))

		case "bulanan":
			periodStart = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
			periodEnd = periodStart.AddDate(0, 1, -1)
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
// MarkOverdueUseCase
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
// AcceptReportUseCase
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
	OrgIDs     []uuid.UUID
}

func (uc *AcceptReportUseCase) Execute(ctx context.Context, input AcceptReportInput) (*entity.KRIReport, error) {
	report, err := uc.reportRepo.GetByID(ctx, input.ReportID, input.OrgIDs)
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
		kri, err := uc.kriRepo.GetByID(ctx, report.KRIID, input.OrgIDs)
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
// RequestRevisionUseCase
// ============================================================================

type RequestRevisionUseCase struct {
	reportRepo repository.KRIReportRepository
	kriRepo    repository.KRIRepository
}

func NewRequestRevisionUseCase(
	reportRepo repository.KRIReportRepository,
	kriRepo repository.KRIRepository,
) *RequestRevisionUseCase {
	return &RequestRevisionUseCase{reportRepo: reportRepo, kriRepo: kriRepo}
}

type RequestRevisionInput struct {
	ReportID   uuid.UUID `json:"-"`
	ReviewedBy uuid.UUID `json:"-"`
	ReviewNote string    `json:"review_note"`
	OrgIDs     []uuid.UUID
}

func (uc *RequestRevisionUseCase) Execute(ctx context.Context, input RequestRevisionInput) (*entity.KRIReport, error) {
	if strings.TrimSpace(input.ReviewNote) == "" {
		return nil, fmt.Errorf("review_note is required for revision request")
	}

	report, err := uc.reportRepo.GetByID(ctx, input.ReportID, input.OrgIDs)
	if err != nil {
		return nil, fmt.Errorf("report not found: %w", err)
	}

	if _, err := uc.kriRepo.GetByID(ctx, report.KRIID, input.OrgIDs); err != nil {
		return nil, domainerrors.ErrForbidden
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

	return uc.reportRepo.GetByID(ctx, report.ID, input.OrgIDs)
}

// ============================================================================
// SkipReportUseCase
// ============================================================================

type SkipReportUseCase struct {
	reportRepo repository.KRIReportRepository
	kriRepo    repository.KRIRepository
}

func NewSkipReportUseCase(
	reportRepo repository.KRIReportRepository,
	kriRepo repository.KRIRepository,
) *SkipReportUseCase {
	return &SkipReportUseCase{reportRepo: reportRepo, kriRepo: kriRepo}
}

type SkipReportInput struct {
	ReportID    uuid.UUID `json:"-"`
	SubmittedBy uuid.UUID `json:"-"`
	SkipReason  string    `json:"skip_reason"`
	OrgIDs      []uuid.UUID
}

func (uc *SkipReportUseCase) Execute(ctx context.Context, input SkipReportInput) (*entity.KRIReport, error) {
	if strings.TrimSpace(input.SkipReason) == "" {
		return nil, fmt.Errorf("skip_reason is required")
	}

	report, err := uc.reportRepo.GetByID(ctx, input.ReportID, input.OrgIDs)
	if err != nil {
		return nil, fmt.Errorf("report not found: %w", err)
	}

	if _, err := uc.kriRepo.GetByID(ctx, report.KRIID, input.OrgIDs); err != nil {
		return nil, domainerrors.ErrForbidden
	}

	if report.Status != "pending" && report.Status != "overdue" {
		return nil, fmt.Errorf("report must be pending or overdue to skip, current: %s", report.Status)
	}

	report.Status = "skipped"
	report.Notes = input.SkipReason
	if err := uc.reportRepo.Update(ctx, report); err != nil {
		return nil, fmt.Errorf("update report: %w", err)
	}

	return uc.reportRepo.GetByID(ctx, report.ID, input.OrgIDs)
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
