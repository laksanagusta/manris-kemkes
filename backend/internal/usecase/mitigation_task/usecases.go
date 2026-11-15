package mitigation_task

import (
	"context"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/timeutil"
)

const singleMitigationTaskPeriodLabel = "Laporan tunggal"

func mitigationTaskPeriodLabel(assessmentCycle string) string {
	label := strings.TrimSpace(assessmentCycle)
	if label != "" {
		return label
	}
	return singleMitigationTaskPeriodLabel
}

// QuarterStart returns the first day of a calendar quarter.
func QuarterStart(year int, quarter int) time.Time {
	if quarter < 1 || quarter > 4 {
		return time.Time{}
	}
	return time.Date(year, time.Month((quarter-1)*3+1), 1, 0, 0, 0, 0, time.UTC)
}

// QuarterEnd returns the last day of a calendar quarter.
func QuarterEnd(year int, quarter int) time.Time {
	start := QuarterStart(year, quarter)
	if start.IsZero() {
		return time.Time{}
	}
	return start.AddDate(0, 3, -1)
}

func CurrentQuarter(now time.Time) (int, int) {
	return now.Year(), int((now.Month()-1)/3) + 1
}

func ParseQuarterCycle(cycle string) (int, int, error) {
	parts := strings.Split(cycle, "-Q")
	if len(parts) != 2 {
		return 0, 0, fmt.Errorf("format siklus kuartal tidak valid: %s", cycle)
	}
	year, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, 0, fmt.Errorf("tahun tidak valid dalam siklus: %s", cycle)
	}
	quarter, err := strconv.Atoi(parts[1])
	if err != nil || quarter < 1 || quarter > 4 {
		return 0, 0, fmt.Errorf("kuartal tidak valid dalam siklus: %s", cycle)
	}
	return year, quarter, nil
}

// SemesterStart remains for reading legacy H1/H2 task rows.
func SemesterStart(year int, half int) time.Time {
	month := 1
	if half == 2 {
		month = 7
	}
	return time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
}

// SemesterEnd returns the last day of a semester.
func SemesterEnd(year int, half int) time.Time {
	return SemesterStart(year, half).AddDate(0, 6, -1)
}

// CurrentSemester returns the current year and semester (1-2).
func CurrentSemester(now time.Time) (int, int) {
	year := now.Year()
	half := 1
	if now.Month() >= time.July {
		half = 2
	}
	return year, half
}

// ParseSemesterCycle accepts the canonical quarterly format and legacy H1/H2
// labels so historical task rows remain readable.
func ParseSemesterCycle(cycle string) (int, int, error) {
	if strings.Contains(cycle, "-Q") {
		return ParseQuarterCycle(cycle)
	}
	parts := strings.Split(cycle, "-H")
	if len(parts) != 2 {
		return 0, 0, fmt.Errorf("format siklus semester tidak valid: %s", cycle)
	}
	year, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, 0, fmt.Errorf("tahun tidak valid dalam siklus: %s", cycle)
	}
	half, err := strconv.Atoi(parts[1])
	if err != nil || half < 1 || half > 2 {
		return 0, 0, fmt.Errorf("semester tidak valid dalam siklus: %s", cycle)
	}
	return year, half, nil
}

func SemesterDueDate(year int, half int) string {
	return SemesterEnd(year, half).Format("2006-01-02")
}

func SemesterPeriodStart(year int, half int) string {
	return SemesterStart(year, half).Format("2006-01-02")
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
	SortBy       string
	SortOrder    string
	RiskID       *uuid.UUID
	MitigationID *uuid.UUID
	UserID       *uuid.UUID
	Query        string
	Status       string
	Period       string
	OrgIDs       []uuid.UUID
	Page         int
	Limit        int
}

type ListTasksPaginatedResult struct {
	Data    []*entity.MitigationTask         `json:"data"`
	Total   int                              `json:"total"`
	Page    int                              `json:"page"`
	Limit   int                              `json:"limit"`
	Summary repository.TaskCollectionSummary `json:"summary"`
}

func (uc *ListTasksUseCase) Execute(ctx context.Context, input ListTasksInput) ([]*entity.MitigationTask, error) {
	if input.RiskID != nil {
		if _, err := uc.riskRepo.GetByID(ctx, *input.RiskID, input.OrgIDs); err != nil {
			return nil, fmt.Errorf("risiko tidak ditemukan atau tidak dapat diakses: %w", err)
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

	var result repository.TaskCollectionPage
	var err error
	if repo, ok := uc.taskRepo.(interface {
		ListCollectionPage(context.Context, []uuid.UUID, string, string, string, int, int, string, string) (repository.TaskCollectionPage, error)
	}); ok {
		result, err = repo.ListCollectionPage(ctx, input.OrgIDs, input.Query, input.Status, input.Period, input.Page, input.Limit, input.SortBy, input.SortOrder)
	} else {
		result.Data, result.Total, err = uc.taskRepo.ListAllPaginated(ctx, input.OrgIDs, input.Query, input.Status, input.Period, input.Page, input.Limit)
	}
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil daftar tugas mitigasi: %w", err)
	}
	if result.Data == nil {
		result.Data = make([]*entity.MitigationTask, 0)
	}
	return &ListTasksPaginatedResult{
		Data: result.Data, Total: result.Total, Page: input.Page, Limit: input.Limit, Summary: result.Summary,
	}, nil
}

func (uc *ListTasksUseCase) ListPeriods(ctx context.Context, orgIDs []uuid.UUID) ([]string, error) {
	repo, ok := uc.taskRepo.(interface {
		ListPeriods(context.Context, []uuid.UUID) ([]string, error)
	})
	if !ok {
		return nil, domainerrors.ErrInternal
	}
	return repo.ListPeriods(ctx, orgIDs)
}

func (uc *ListTasksUseCase) ExecuteScopedPage(ctx context.Context, filter repository.ScopedTaskPageFilter) (*repository.ScopedTaskPage, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 {
		filter.Limit = 10
	}
	if filter.Limit > 100 {
		filter.Limit = 100
	}
	if filter.RiskID != nil {
		if _, err := uc.riskRepo.GetByID(ctx, *filter.RiskID, filter.OrgIDs); err != nil {
			return nil, fmt.Errorf("risiko tidak ditemukan atau tidak dapat diakses: %w", err)
		}
	}
	repo, ok := uc.taskRepo.(interface {
		ListScopedPage(context.Context, repository.ScopedTaskPageFilter) (*repository.ScopedTaskPage, error)
	})
	if !ok {
		return nil, domainerrors.ErrInternal
	}
	return repo.ListScopedPage(ctx, filter)
}

// ListByMonitoring returns all tasks linked to a specific monitoring
func (uc *ListTasksUseCase) ListByMonitoring(ctx context.Context, monitoringID uuid.UUID, orgIDs []uuid.UUID) ([]*entity.MitigationTask, error) {
	return uc.taskRepo.ListByMonitoring(ctx, monitoringID, orgIDs)
}

// CountByMonitoring returns task counts grouped by status for a monitoring
func (uc *ListTasksUseCase) CountByMonitoring(ctx context.Context, monitoringID uuid.UUID, orgIDs []uuid.UUID) (*repository.MonitoringTaskCounts, error) {
	return uc.taskRepo.CountByMonitoringAndStatus(ctx, monitoringID, orgIDs)
}

// SubmitProgressUseCase handles a PIC submitting progress for a task
type SubmitProgressUseCase struct {
	taskRepo repository.MitigationTaskRepository
	riskRepo repository.RiskRepository
}

func NewSubmitProgressUseCase(taskRepo repository.MitigationTaskRepository, riskRepo repository.RiskRepository) *SubmitProgressUseCase {
	return &SubmitProgressUseCase{taskRepo: taskRepo, riskRepo: riskRepo}
}

func normalizeEvidenceURLs(raw string, required bool) (string, error) {
	values := strings.Split(strings.ReplaceAll(raw, "\r\n", "\n"), "\n")
	normalized := make([]string, 0, len(values))
	for _, value := range values {
		evidenceURL := strings.TrimSpace(value)
		if evidenceURL == "" {
			continue
		}

		parsedURL, err := url.ParseRequestURI(evidenceURL)
		if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
			return "", domainerrors.ErrInvalidEvidenceURL
		}
		normalized = append(normalized, evidenceURL)
	}

	if required && len(normalized) == 0 {
		return "", domainerrors.ErrInvalidEvidenceURL
	}

	return strings.Join(normalized, "\n"), nil
}

type SubmitProgressInput struct {
	TaskID      uuid.UUID `json:"taskId"`
	EvidenceURL string    `json:"evidenceUrl"`
	Notes       string    `json:"notes"`
	ReportedBy  uuid.UUID `json:"-"`
	OrgIDs      []uuid.UUID
}

func (uc *SubmitProgressUseCase) Execute(ctx context.Context, input SubmitProgressInput) (*entity.MitigationTask, error) {
	evidenceURLs, err := normalizeEvidenceURLs(input.EvidenceURL, true)
	if err != nil {
		return nil, err
	}

	notes := strings.TrimSpace(input.Notes)
	if len(notes) < 10 || len(notes) > 1000 {
		return nil, domainerrors.ErrInvalidNotes
	}

	task, err := uc.taskRepo.GetByID(ctx, input.TaskID, input.OrgIDs)
	if err != nil {
		return nil, fmt.Errorf("tugas tidak ditemukan: %w", err)
	}

	if _, err := uc.riskRepo.GetByID(ctx, task.RiskID, input.OrgIDs); err != nil {
		return nil, domainerrors.ErrForbidden
	}
	if task.Status == entity.MitigationTaskStatusNotReported {
		return nil, domainerrors.ErrMitigationNotReported
	}

	if _, err := time.Parse("2006-01-02", task.DueDate); err != nil {
		return nil, fmt.Errorf("tanggal jatuh tempo tidak valid: %w", err)
	}

	now := timeutil.BusinessNow().In(timeutil.JakartaLocation())
	task.EvidenceURL = evidenceURLs
	task.Notes = notes
	task.ReportedBy = &input.ReportedBy
	task.ReportedAt = &now
	task.Status = "done"

	if err := uc.taskRepo.Update(ctx, task); err != nil {
		return nil, fmt.Errorf("gagal memperbarui tugas: %w", err)
	}

	// Re-fetch to get joined fields
	return uc.taskRepo.GetByID(ctx, task.ID, input.OrgIDs)
}

// SubmitMonitoringReportInput is the input for submitting a mitigation
// monitoring report. Fields are optional — only provided fields are updated.
type SubmitMonitoringReportInput struct {
	TaskID         uuid.UUID `json:"-"`
	Status         string    `json:"status,omitempty"`
	EvidenceURL    string    `json:"evidenceUrl,omitempty"`
	Notes          string    `json:"notes,omitempty"`
	ReportOutput   string    `json:"reportOutput,omitempty"`
	ReportObstacle string    `json:"reportObstacle,omitempty"`
	ReportedBy     uuid.UUID `json:"-"`
	OrgIDs         []uuid.UUID
}

type SubmitMonitoringReportUseCase struct {
	taskRepo repository.MitigationTaskRepository
	riskRepo repository.RiskRepository
}

func NewSubmitMonitoringReportUseCase(taskRepo repository.MitigationTaskRepository, riskRepo repository.RiskRepository) *SubmitMonitoringReportUseCase {
	return &SubmitMonitoringReportUseCase{taskRepo: taskRepo, riskRepo: riskRepo}
}

func hasValidMonitoringReportNotes(notes string) bool {
	length := len(strings.TrimSpace(notes))
	return length >= 10 && length <= 1000
}

func (uc *SubmitMonitoringReportUseCase) Execute(ctx context.Context, input SubmitMonitoringReportInput) (*entity.MitigationTask, error) {
	if input.Status != "" && input.Status != "pending" && input.Status != "done" && input.Status != "skipped" {
		return nil, fmt.Errorf("status tidak valid: harus pending, done, atau skipped")
	}

	evidenceURLs, err := normalizeEvidenceURLs(input.EvidenceURL, false)
	if err != nil {
		return nil, err
	}

	task, err := uc.taskRepo.GetByID(ctx, input.TaskID, input.OrgIDs)
	if err != nil {
		return nil, fmt.Errorf("tugas tidak ditemukan: %w", err)
	}

	if _, err := uc.riskRepo.GetByID(ctx, task.RiskID, input.OrgIDs); err != nil {
		return nil, domainerrors.ErrForbidden
	}
	if task.Status == entity.MitigationTaskStatusNotReported {
		return nil, domainerrors.ErrMitigationNotReported
	}

	effectiveNotes := strings.TrimSpace(task.Notes)
	if input.Notes != "" {
		effectiveNotes = strings.TrimSpace(input.Notes)
	}
	if input.Status == "done" && !hasValidMonitoringReportNotes(effectiveNotes) {
		return nil, domainerrors.ErrInvalidNotes
	}

	now := timeutil.BusinessNow().In(timeutil.JakartaLocation())

	if input.Status != "" {
		task.Status = input.Status
	}
	if evidenceURLs != "" {
		task.EvidenceURL = evidenceURLs
	}
	if input.Notes != "" {
		task.Notes = input.Notes
	}
	if input.ReportOutput != "" {
		task.ReportOutput = input.ReportOutput
	}
	if input.ReportObstacle != "" {
		task.ReportObstacle = input.ReportObstacle
	}
	if task.Status == "done" && !hasValidMonitoringReportNotes(task.Notes) {
		// A legacy or partial payload must not leave an empty report marked as
		// complete. Finalization will count it as not reported.
		task.Status = "pending"
	}
	if hasValidMonitoringReportNotes(task.Notes) {
		task.ReportedBy = &input.ReportedBy
		task.ReportedAt = &now
	} else {
		// An incomplete report remains unreported regardless of execution state.
		task.ReportedBy = nil
		task.ReportedAt = nil
	}

	if err := uc.taskRepo.Update(ctx, task); err != nil {
		return nil, fmt.Errorf("gagal memperbarui tugas: %w", err)
	}

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
	// Execution reports are created when monitoring starts.
	return 0, nil
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
