package mitigation_task

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

const singleMitigationTaskPeriodLabel = "Laporan tunggal"

func mitigationTaskPeriodLabel(assessmentCycle string) string {
	label := strings.TrimSpace(assessmentCycle)
	if label != "" {
		return label
	}
	return singleMitigationTaskPeriodLabel
}

// ListTasksUseCase lists mitigation tasks for a risk
type ListTasksUseCase struct {
	taskRepo repository.MitigationTaskRepository
	riskRepo repository.RiskRepository
}

func NewListTasksUseCase(taskRepo repository.MitigationTaskRepository, riskRepo repository.RiskRepository) *ListTasksUseCase {
	return &ListTasksUseCase{taskRepo: taskRepo, riskRepo: riskRepo}
}

type ListTasksInput struct {
	RiskID       *uuid.UUID
	MitigationID *uuid.UUID
	UserID       *uuid.UUID
	Status       string
	OrgIDs       []uuid.UUID
	Page         int
	Limit        int
}

type ListTasksPaginatedResult struct {
	Data  []*entity.MitigationTask `json:"data"`
	Total int                      `json:"total"`
	Page  int                      `json:"page"`
	Limit int                      `json:"limit"`
}

func (uc *ListTasksUseCase) Execute(ctx context.Context, input ListTasksInput) ([]*entity.MitigationTask, error) {
	if input.RiskID != nil {
		if _, err := uc.riskRepo.GetByID(ctx, *input.RiskID, input.OrgIDs); err != nil {
			return nil, fmt.Errorf("risk not found or not accessible: %w", err)
		}
		return uc.taskRepo.ListByRisk(ctx, *input.RiskID, input.OrgIDs)
	}
	if input.MitigationID != nil {
		return uc.taskRepo.ListByMitigation(ctx, *input.MitigationID, input.OrgIDs)
	}
	if input.UserID != nil {
		return uc.taskRepo.ListByUser(ctx, *input.UserID, input.Status, input.OrgIDs)
	}
	// No filter: return all tasks (for compliance monitoring dashboard)
	return uc.taskRepo.ListAll(ctx, input.OrgIDs)
}

func (uc *ListTasksUseCase) ExecutePaginated(ctx context.Context, input ListTasksInput) (*ListTasksPaginatedResult, error) {
	if input.Page <= 0 {
		input.Page = 1
	}
	if input.Limit <= 0 {
		input.Limit = 20
	}
	if input.Limit > 100 {
		input.Limit = 100
	}

	tasks, total, err := uc.taskRepo.ListAllPaginated(ctx, input.OrgIDs, input.Page, input.Limit)
	if err != nil {
		return nil, fmt.Errorf("list mitigation tasks: %w", err)
	}
	if tasks == nil {
		tasks = make([]*entity.MitigationTask, 0)
	}
	return &ListTasksPaginatedResult{
		Data:  tasks,
		Total: total,
		Page:  input.Page,
		Limit: input.Limit,
	}, nil
}

// SubmitProgressUseCase handles a PIC submitting progress for a task
type SubmitProgressUseCase struct {
	taskRepo repository.MitigationTaskRepository
	riskRepo repository.RiskRepository
}

func NewSubmitProgressUseCase(taskRepo repository.MitigationTaskRepository, riskRepo repository.RiskRepository) *SubmitProgressUseCase {
	return &SubmitProgressUseCase{taskRepo: taskRepo, riskRepo: riskRepo}
}

type SubmitProgressInput struct {
	TaskID      uuid.UUID `json:"taskId"`
	ProgressPct int       `json:"progressPct"`
	EvidenceURL string    `json:"evidenceUrl"`
	Notes       string    `json:"notes"`
	ReportedBy  uuid.UUID `json:"-"`
	OrgIDs      []uuid.UUID
}

func (uc *SubmitProgressUseCase) Execute(ctx context.Context, input SubmitProgressInput) (*entity.MitigationTask, error) {
	if input.ProgressPct < 0 || input.ProgressPct > 100 {
		return nil, domainerrors.ErrInvalidProgress
	}

	evidenceURL := strings.TrimSpace(input.EvidenceURL)
	if evidenceURL == "" {
		return nil, domainerrors.ErrInvalidEvidenceURL
	}
	parsedURL, err := url.ParseRequestURI(evidenceURL)
	if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
		return nil, domainerrors.ErrInvalidEvidenceURL
	}

	notes := strings.TrimSpace(input.Notes)
	if len(notes) < 10 || len(notes) > 1000 {
		return nil, domainerrors.ErrInvalidNotes
	}

	task, err := uc.taskRepo.GetByID(ctx, input.TaskID, input.OrgIDs)
	if err != nil {
		return nil, fmt.Errorf("task not found: %w", err)
	}

	if _, err := uc.riskRepo.GetByID(ctx, task.RiskID, input.OrgIDs); err != nil {
		return nil, domainerrors.ErrForbidden
	}

	periodEnd, err := time.Parse("2006-01-02", task.PeriodEnd)
	if err != nil {
		return nil, fmt.Errorf("invalid period end date: %w", err)
	}

	dueDate, err := time.Parse("2006-01-02", task.DueDate)
	if err != nil {
		return nil, fmt.Errorf("invalid due date: %w", err)
	}

	loc, _ := time.LoadLocation("Asia/Jakarta")
	now := time.Now().In(loc)

	hPlus1Start := time.Date(periodEnd.Year(), periodEnd.Month(), periodEnd.Day()+1, 0, 0, 0, 0, loc)
	dueDateEnd := time.Date(dueDate.Year(), dueDate.Month(), dueDate.Day(), 23, 59, 59, 0, loc)

	if task.PeriodEnd == task.DueDate {
		if now.After(dueDateEnd) {
			return nil, domainerrors.ErrSubmissionWindowClosed
		}
	} else if now.Before(hPlus1Start) || now.After(dueDateEnd) {
		return nil, domainerrors.ErrSubmissionWindowClosed
	}

	now = time.Now().In(loc)
	task.ProgressPct = input.ProgressPct
	task.EvidenceURL = evidenceURL
	task.Notes = notes
	task.ReportedBy = &input.ReportedBy
	task.ReportedAt = &now
	task.Status = "done"

	if err := uc.taskRepo.Update(ctx, task); err != nil {
		return nil, fmt.Errorf("update task: %w", err)
	}

	// Re-fetch to get joined fields
	return uc.taskRepo.GetByID(ctx, task.ID, input.OrgIDs)
}

// GenerateTasksUseCase generates tasks for recurring mitigations (called by cron)
type GenerateTasksUseCase struct {
	taskRepo repository.MitigationTaskRepository
}

func NewGenerateTasksUseCase(taskRepo repository.MitigationTaskRepository) *GenerateTasksUseCase {
	return &GenerateTasksUseCase{taskRepo: taskRepo}
}

func (uc *GenerateTasksUseCase) Execute(ctx context.Context, now time.Time) (int, error) {
	mitigations, err := uc.taskRepo.GetRecurringMitigations(ctx)
	if err != nil {
		return 0, fmt.Errorf("get recurring mitigations: %w", err)
	}

	created := 0

	for _, m := range mitigations {
		if m.RecurringInterval == nil {
			continue
		}
		if m.IsExistingControl {
			continue
		}

		var periodStart, periodEnd, dueDate time.Time

		switch *m.RecurringInterval {
		case "harian":
			periodStart = now.Truncate(24 * time.Hour)
			periodEnd = periodStart
			dueDate = periodStart.Add(23*time.Hour + 59*time.Minute)

		case "mingguan":
			// Find the start of the current week (Monday)
			weekday := int(now.Weekday())
			if weekday == 0 {
				weekday = 7 // Sunday = 7
			}
			periodStart = now.AddDate(0, 0, -(weekday - 1)).Truncate(24 * time.Hour)
			periodEnd = periodStart.AddDate(0, 0, 6)

			// Due date = the configured report_day, default Friday (5)
			reportDay := 5 // Friday
			if m.ReportDay != nil {
				reportDay = *m.ReportDay
			}
			// Calculate due date within NEXT week
			daysUntilReport := reportDay - 1 // Monday=0 offset
			if reportDay == 0 {
				daysUntilReport = 6 // Sunday
			}
			dueDate = periodStart.AddDate(0, 0, daysUntilReport+7) // Add 7 days to push it to next week

		case "bulanan":
			periodStart = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
			periodEnd = periodStart.AddDate(0, 1, -1)

			reportDate := 5 // Default: tanggal 5
			if m.ReportDate != nil {
				reportDate = *m.ReportDate
			}
			// Due date is report_date of the NEXT month
			dueDateMonth := periodStart.AddDate(0, 1, 0)
			maxDay := time.Date(dueDateMonth.Year(), dueDateMonth.Month()+1, 0, 0, 0, 0, 0, now.Location()).Day()
			if reportDate > maxDay {
				reportDate = maxDay
			}
			dueDate = time.Date(dueDateMonth.Year(), dueDateMonth.Month(), reportDate, 0, 0, 0, 0, now.Location())

		case "triwulan":
			quarter := (int(now.Month()) - 1) / 3
			periodStart = time.Date(now.Year(), time.Month(quarter*3+1), 1, 0, 0, 0, 0, now.Location())
			periodEnd = periodStart.AddDate(0, 3, -1)

			reportDate := 10 // Default: tanggal 10
			if m.ReportDate != nil {
				reportDate = *m.ReportDate
			}
			dueMonth := periodStart.AddDate(0, 3, 0)
			dueDate = time.Date(dueMonth.Year(), dueMonth.Month(), reportDate, 0, 0, 0, 0, now.Location())

		default:
			continue
		}

		pStart := periodStart.Format("2006-01-02")
		pEnd := periodEnd.Format("2006-01-02")

		// Check if task already exists for this period
		exists, err := uc.taskRepo.TaskExistsForPeriod(ctx, m.ID, pStart, pEnd)
		if err != nil {
			continue
		}
		if exists {
			continue
		}

		task := &entity.MitigationTask{
			MitigationID: m.ID,
			RiskID:       m.RiskID,
			PeriodLabel:  mitigationTaskPeriodLabel(m.AssessmentCycle),
			PeriodStart:  pStart,
			PeriodEnd:    pEnd,
			DueDate:      dueDate.Format("2006-01-02"),
			Status:       "pending",
			GeneratedBy:  "cron",
		}

		if err := uc.taskRepo.Create(ctx, task); err != nil {
			continue
		}
		created++
	}

	return created, nil
}

// MarkOverdueUseCase marks pending tasks past due_date as overdue
type MarkOverdueUseCase struct {
	taskRepo repository.MitigationTaskRepository
}

func NewMarkOverdueUseCase(taskRepo repository.MitigationTaskRepository) *MarkOverdueUseCase {
	return &MarkOverdueUseCase{taskRepo: taskRepo}
}

func (uc *MarkOverdueUseCase) Execute(ctx context.Context, refDate time.Time) (int, error) {
	tasks, err := uc.taskRepo.ListPendingOverdue(ctx, refDate)
	if err != nil {
		return 0, err
	}

	marked := 0
	for _, t := range tasks {
		t.Status = "overdue"
		if err := uc.taskRepo.Update(ctx, t); err != nil {
			continue
		}
		marked++
	}
	return marked, nil
}
