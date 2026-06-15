# Mitigation Reporting Restructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure mitigation reporting to generate per-quarter tasks on approval/reassessment, require all tasks reported before monitoring finalization, and remove cron-based generation.

**Architecture:** Modify `mitigation_tasks` table with 3 new columns. Replace cron-based `GenerateTasksUseCase` with `EnsureTasksForRiskVersionUseCase` that is idempotent and called at approval and reassessment. Add validation to block monitoring finalization if tasks unreported. Frontend removes `due_date` from mitigation forms and adds structured "Laporan Pelaksanaan Mitigasi" section to assessment page.

**Tech Stack:** Go + Fiber, PostgreSQL, TypeScript + React + React Hook Form + Zod

**Spec:** `docs/superpowers/specs/2025-06-15-mitigation-reporting-design.md`

---

### Task 1: Database Migration — Add Columns to mitigation_tasks

**Files:**
- Create: `backend/db/migrations/000078_mitigation_task_monitoring_fields.up.sql`
- Create: `backend/db/migrations/000078_mitigation_task_monitoring_fields.down.sql`

- [ ] **Step 1: Create up migration**

```sql
-- 000078_mitigation_task_monitoring_fields.up.sql
ALTER TABLE mitigation_tasks
  ADD COLUMN monitoring_id UUID REFERENCES risk_monitorings(id) ON DELETE SET NULL,
  ADD COLUMN report_output TEXT NOT NULL DEFAULT '',
  ADD COLUMN report_obstacle TEXT NOT NULL DEFAULT '';

CREATE INDEX idx_mitigation_tasks_monitoring_id
  ON mitigation_tasks(monitoring_id)
  WHERE monitoring_id IS NOT NULL;
```

- [ ] **Step 2: Create down migration**

```sql
-- 000078_mitigation_task_monitoring_fields.down.sql
DROP INDEX IF EXISTS idx_mitigation_tasks_monitoring_id;
ALTER TABLE mitigation_tasks
  DROP COLUMN IF EXISTS report_obstacle,
  DROP COLUMN IF EXISTS report_output,
  DROP COLUMN IF EXISTS monitoring_id;
```

- [ ] **Step 3: Run migration**

Run: `cd backend && make migrate-up`
Expected: migration applied successfully, columns visible in DB

- [ ] **Step 4: Commit**

```bash
git add backend/db/migrations/000078_*
git commit -m "feat: add monitoring_id, report_output, report_obstacle to mitigation_tasks"
```

---

### Task 2: Backend — Add New Fields to MitigationTask Entity

**Files:**
- Modify: `backend/internal/domain/entity/mitigation_task.go:1-42`

- [ ] **Step 1: Add MonitoringID, ReportOutput, ReportObstacle fields**

```go
// backend/internal/domain/entity/mitigation_task.go

package entity

import (
	"time"

	"github.com/google/uuid"
)

// MitigationTask represents a single progress report task auto-generated for a mitigation plan
type MitigationTask struct {
	ID           uuid.UUID  `json:"id"`
	MitigationID uuid.UUID  `json:"mitigationId"`
	RiskID       uuid.UUID  `json:"riskId"`

	// Monitoring link (nullable — only set when task is part of a monitoring cycle)
	MonitoringID *uuid.UUID `json:"monitoringId,omitempty"`

	// Period
	PeriodLabel string `json:"periodLabel"`
	PeriodStart string `json:"periodStart"`
	PeriodEnd   string `json:"periodEnd"`
	DueDate     string `json:"dueDate"`

	// Progress (filled by PIC)
	Status      string  `json:"status"` // pending, done, overdue, skipped
	ProgressPct int     `json:"progressPct"`
	EvidenceURL string  `json:"evidenceUrl"`
	Notes       string  `json:"notes"`

	// Monitoring report fields
	ReportOutput   string `json:"reportOutput"`
	ReportObstacle string `json:"reportObstacle"`

	// Reporter
	ReportedBy   *uuid.UUID `json:"reportedBy,omitempty"`
	ReportedByName string   `json:"reportedByName,omitempty"`
	ReportedAt   *time.Time `json:"reportedAt,omitempty"`

	// Metadata
	GeneratedBy string    `json:"generatedBy"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`

	// Joined fields (from mitigation/risk)
	MitigationAction string `json:"mitigationAction,omitempty"`
	MitigationOwner  string `json:"mitigationOwner,omitempty"`
	RiskCode         string `json:"riskCode,omitempty"`
	RiskTitle        string `json:"riskTitle,omitempty"`
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && go build ./internal/domain/entity/...`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add backend/internal/domain/entity/mitigation_task.go
git commit -m "feat: add MonitoringID, ReportOutput, ReportObstacle to MitigationTask entity"
```

---

### Task 3: Backend — Add TaskType and Update MitigationTaskRepository

**Files:**
- Modify: `backend/internal/domain/repository/mitigation_task.go` — add `ListByMonitoring` and `CountByMonitoringAndStatus` to interface
- Modify: `backend/internal/repository/postgres/mitigation_task.go` — implement new methods, update Create/GetByID for new columns

- [ ] **Step 1: Add new methods to repository interface**

Read the current interface file first:
- `backend/internal/domain/repository/mitigation_task.go`

Add these methods:

```go
// ListByMonitoring returns all tasks linked to a specific monitoring
ListByMonitoring(ctx context.Context, monitoringID uuid.UUID, orgIDs []uuid.UUID) ([]*entity.MitigationTask, error)

// CountByMonitoringAndStatus counts tasks linked to a monitoring by status
CountByMonitoringAndStatus(ctx context.Context, monitoringID uuid.UUID, orgIDs []uuid.UUID) (*MonitoringTaskCounts, error)
```

Add the counts struct:

```go
type MonitoringTaskCounts struct {
	Total    int `json:"total"`
	Done     int `json:"done"`
	Pending  int `json:"pending"`
}
```

- [ ] **Step 2: Implement `ListByMonitoring` in postgres repository**

In `backend/internal/repository/postgres/mitigation_task.go`, add:

```go
func (r *mitigationTaskRepo) ListByMonitoring(ctx context.Context, monitoringID uuid.UUID, orgIDs []uuid.UUID) ([]*entity.MitigationTask, error) {
	query := `
		SELECT
			mt.id, mt.mitigation_id, mt.risk_id, mt.monitoring_id,
			mt.period_label, mt.period_start, mt.period_end, mt.due_date,
			mt.status, mt.progress_pct, mt.evidence_url, mt.notes,
			mt.report_output, mt.report_obstacle,
			mt.reported_by, COALESCE(u.full_name, ''), mt.reported_at,
			mt.generated_by, mt.created_at, mt.updated_at,
			COALESCE(m.action, ''), COALESCE(m.owner, ''),
			COALESCE(r.code, ''), COALESCE(r.title, '')
		FROM mitigation_tasks mt
		LEFT JOIN mitigations m ON m.id = mt.mitigation_id
		LEFT JOIN risks r ON r.id = mt.risk_id
		LEFT JOIN users u ON u.id = mt.reported_by
		WHERE mt.monitoring_id = $1
		ORDER BY mt.created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, monitoringID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []*entity.MitigationTask
	for rows.Next() {
		task := &entity.MitigationTask{}
		err := rows.Scan(
			&task.ID, &task.MitigationID, &task.RiskID, &task.MonitoringID,
			&task.PeriodLabel, &task.PeriodStart, &task.PeriodEnd, &task.DueDate,
			&task.Status, &task.ProgressPct, &task.EvidenceURL, &task.Notes,
			&task.ReportOutput, &task.ReportObstacle,
			&task.ReportedBy, &task.ReportedByName, &task.ReportedAt,
			&task.GeneratedBy, &task.CreatedAt, &task.UpdatedAt,
			&task.MitigationAction, &task.MitigationOwner,
			&task.RiskCode, &task.RiskTitle,
		)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, task)
	}
	if tasks == nil {
		tasks = []*entity.MitigationTask{}
	}
	return tasks, rows.Err()
}
```

- [ ] **Step 3: Implement `CountByMonitoringAndStatus`**

```go
func (r *mitigationTaskRepo) CountByMonitoringAndStatus(ctx context.Context, monitoringID uuid.UUID, orgIDs []uuid.UUID) (*repository.MonitoringTaskCounts, error) {
	query := `
		SELECT
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE status = 'done') AS done,
			COUNT(*) FILTER (WHERE status = 'pending') AS pending
		FROM mitigation_tasks
		WHERE monitoring_id = $1
	`
	var counts repository.MonitoringTaskCounts
	err := r.pool.QueryRow(ctx, query, monitoringID).Scan(&counts.Total, &counts.Done, &counts.Pending)
	if err != nil {
		return nil, err
	}
	return &counts, nil
}
```

- [ ] **Step 4: Update existing `Create` to handle new columns**

Find the `Create` method in the postgres repo and add `monitoring_id, report_output, report_obstacle` to the INSERT:

Ensure the INSERT query includes:
```sql
INSERT INTO mitigation_tasks (id, mitigation_id, risk_id, monitoring_id,
    period_label, period_start, period_end, due_date,
    status, progress_pct, evidence_url, notes,
    report_output, report_obstacle,
    reported_by, reported_at, generated_by, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
```

- [ ] **Step 5: Update existing `GetByID` to scan new columns**

Add `&task.MonitoringID, &task.ReportOutput, &task.ReportObstacle` to the Scan call in `GetByID`.

- [ ] **Step 6: Verify compilation**

Run: `cd backend && go build ./internal/...`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add backend/internal/domain/repository/mitigation_task.go backend/internal/repository/postgres/mitigation_task.go
git commit -m "feat: add ListByMonitoring, CountByMonitoringAndStatus to mitigation task repo"
```

---

### Task 4: Backend — Create EnsureTasksForRiskVersionUseCase

**Files:**
- Modify: `backend/internal/usecase/mitigation_task/approval_sync.go` — rename and rewrite
- Modify: `backend/internal/usecase/mitigation_task/usecases.go` — add quarter calculation helpers

- [ ] **Step 1: Add quarter calculation helpers to usecases.go**

In `backend/internal/usecase/mitigation_task/usecases.go`, add before the existing code:

```go
import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

// QuarterStart returns the start date of a quarter, e.g. Q1 = Jan 1
func QuarterStart(year int, quarter int) time.Time {
	month := (quarter-1)*3 + 1
	return time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
}

// QuarterEnd returns the last day of a quarter, e.g. Q1 = Mar 31
func QuarterEnd(year int, quarter int) time.Time {
	start := QuarterStart(year, quarter)
	return start.AddDate(0, 3, -1)
}

// CurrentQuarter returns the current year and quarter (1-4)
func CurrentQuarter(now time.Time) (int, int) {
	year := now.Year()
	quarter := (int(now.Month())-1)/3 + 1
	return year, quarter
}

// ParseQuarterCycle parses "2026-Q1" into year and quarter
func ParseQuarterCycle(cycle string) (int, int, error) {
	parts := strings.Split(cycle, "-Q")
	if len(parts) != 2 {
		return 0, 0, fmt.Errorf("invalid quarter cycle format: %s", cycle)
	}
	year, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, 0, fmt.Errorf("invalid year in cycle: %s", cycle)
	}
	quarter, err := strconv.Atoi(parts[1])
	if err != nil || quarter < 1 || quarter > 4 {
		return 0, 0, fmt.Errorf("invalid quarter in cycle: %s", cycle)
	}
	return year, quarter, nil
}

// QuarterDueDate returns the due date string for a quarter, e.g. "2026-03-31"
func QuarterDueDate(year int, quarter int) string {
	return QuarterEnd(year, quarter).Format("2006-01-02")
}

// QuarterPeriodStart returns the start date string for a quarter
func QuarterPeriodStart(year int, quarter int) string {
	return QuarterStart(year, quarter).Format("2006-01-02")
}
```

- [ ] **Step 2: Rewrite approval_sync.go as EnsureTasksForRiskVersionUseCase**

Replace the entire content of `backend/internal/usecase/mitigation_task/approval_sync.go`:

```go
package mitigation_task

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// EnsureTasksForRiskVersionUseCase ensures mitigation_tasks exist for a risk
// version in a given quarter cycle. Idempotent — if tasks already exist
// for this cycle, no new tasks are created.
type EnsureTasksForRiskVersionUseCase struct {
	taskRepo    repository.MitigationTaskRepository
	riskRepo    repository.RiskRepository
}

func NewEnsureTasksForRiskVersionUseCase(
	taskRepo repository.MitigationTaskRepository,
	riskRepo repository.RiskRepository,
) *EnsureTasksForRiskVersionUseCase {
	return &EnsureTasksForRiskVersionUseCase{
		taskRepo: taskRepo,
		riskRepo: riskRepo,
	}
}

// Execute generates one mitigation_task per mitigation plan item for the
// given quarter cycle. Skips mitigations marked as existing controls.
// Returns the number of newly created tasks.
func (uc *EnsureTasksForRiskVersionUseCase) Execute(
	ctx context.Context,
	riskID uuid.UUID,
	cycle string,
	orgIDs []uuid.UUID,
) (int, error) {
	risk, err := uc.riskRepo.GetByID(ctx, riskID, orgIDs)
	if err != nil {
		return 0, fmt.Errorf("load risk: %w", err)
	}

	year, quarter, err := ParseQuarterCycle(cycle)
	if err != nil {
		return 0, err
	}

	periodStart := QuarterPeriodStart(year, quarter)
	dueDate := QuarterDueDate(year, quarter)
	periodEnd := dueDate

	created := 0
	for _, mitigation := range risk.Mitigations {
		if mitigation.ID == uuid.Nil {
			continue
		}
		if mitigation.IsExistingControl {
			continue
		}

		// Idempotency: check if task already exists for this mitigation+period
		exists, err := uc.taskRepo.TaskExistsForPeriod(ctx, mitigation.ID, periodStart, periodEnd)
		if err != nil {
			return created, fmt.Errorf("check task existence: %w", err)
		}
		if exists {
			continue
		}

		task := &entity.MitigationTask{
			MitigationID: mitigation.ID,
			RiskID:       risk.ID,
			PeriodLabel:  cycle,
			PeriodStart:  periodStart,
			PeriodEnd:    periodEnd,
			DueDate:      dueDate,
			Status:       "pending",
			GeneratedBy:  "system",
		}
		if err := uc.taskRepo.Create(ctx, task); err != nil {
			return created, fmt.Errorf("create mitigation task: %w", err)
		}
		created++
	}

	return created, nil
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd backend && go build ./internal/usecase/mitigation_task/...`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add backend/internal/usecase/mitigation_task/approval_sync.go backend/internal/usecase/mitigation_task/usecases.go
git commit -m "feat: replace approval_sync with idempotent EnsureTasksForRiskVersionUseCase"
```

---

### Task 5: Backend — Wire EnsureTasks into Risk Approval and Reassessment

**Files:**
- Modify: `backend/internal/usecase/risk/approval.go` (or wherever risk approval use case is) — call ensure tasks after approval
- Modify: `backend/internal/usecase/risk/reassess.go` — call ensure tasks during reassessment creation
- Modify: `backend/internal/handler/http/risk.go` — pass the use case dependency

- [ ] **Step 1: Find the risk approval use case**

Grep for the use case that handles risk approval:
Run: `grep -rn "func.*Approve.*Execute" backend/internal/usecase/risk/`

Read the found file. After the risk is set to approved status, add:

```go
// After risk approval, ensure mitigation tasks exist for current quarter
now := time.Now().In(timeutil.JakartaLocation())
year, quarter := mtuc.CurrentQuarter(now)
cycle := fmt.Sprintf("%d-Q%d", year, quarter)
if _, err := uc.ensureTasksUC.Execute(ctx, riskID, cycle, orgIDs); err != nil {
	// Log warning but don't block approval
	log.Printf("[WARN] ensure mitigation tasks after approval: %v", err)
}
```

- [ ] **Step 2: Add ensure tasks to CreateRiskReassessmentUseCase**

In `backend/internal/usecase/risk/reassess.go`, after the monitoring draft is created but before returning the response, add ensure tasks call.

Add a new dependency field:

```go
type CreateRiskReassessmentUseCase struct {
	riskRepo       reassessmentRiskRepository
	ensureTasksUC  *mtuc.EnsureTasksForRiskVersionUseCase
}
```

In `Execute()`, after creating the reassessment draft, call:

```go
// After reassessment draft created, ensure tasks for this cycle
year, quarter, err := mtuc.ParseQuarterCycle(input.Cycle)
if err == nil {
	_, err = uc.ensureTasksUC.Execute(ctx, input.RiskID, input.Cycle, input.OrgIDs)
	if err != nil {
		log.Printf("[WARN] ensure mitigation tasks on reassessment: %v", err)
	}
}

// Link all tasks for this cycle to the monitoring
if err := uc.monitoringRepo.UpdateTaskMonitoringIDs(ctx, monitoring.ID, input.RiskID, input.Cycle); err != nil {
	log.Printf("[WARN] link tasks to monitoring: %v", err)
}
```

- [ ] **Step 3: Add `UpdateTaskMonitoringIDs` to monitoring repository**

In `backend/internal/domain/repository/risk_monitoring.go`, add:

```go
// UpdateTaskMonitoringIDs links pending mitigation_tasks for a given risk+cycle
// to a monitoring, by setting their monitoring_id
UpdateTaskMonitoringIDs(ctx context.Context, monitoringID uuid.UUID, riskID uuid.UUID, cycle string) error
```

In `backend/internal/repository/postgres/`, implement:

```go
func (r *riskMonitoringRepo) UpdateTaskMonitoringIDs(ctx context.Context, monitoringID uuid.UUID, riskID uuid.UUID, cycle string) error {
	query := `
		UPDATE mitigation_tasks
		SET monitoring_id = $1, updated_at = NOW()
		WHERE risk_id = $2
		  AND period_label = $3
		  AND monitoring_id IS NULL
	`
	_, err := r.pool.Exec(ctx, query, monitoringID, riskID, cycle)
	return err
}
```

- [ ] **Step 4: Wire dependencies in server main.go**

In `backend/cmd/server/main.go`, find where the risk handler is constructed. Add `EnsureTasksForRiskVersionUseCase` to the handler's dependencies.

Read the handler struct to see what fields it has, then:
- Add `ensureTasksUC *mtuc.EnsureTasksForRiskVersionUseCase` to RiskHandler struct
- Pass it to `CreateRiskReassessmentUseCase` constructor
- Add it to the approval use case constructor

- [ ] **Step 5: Verify compilation**

Run: `cd backend && go build ./...`
Expected: no errors (may need to adjust imports and wiring)

- [ ] **Step 6: Commit**

```bash
git add backend/internal/usecase/risk/ backend/internal/handler/http/risk.go backend/cmd/server/main.go backend/internal/domain/repository/risk_monitoring.go backend/internal/repository/postgres/
git commit -m "feat: wire EnsureTasks into approval and reassessment flows"
```

---

### Task 6: Backend — Add Monitoring Report Use Case

**Files:**
- Modify: `backend/internal/usecase/mitigation_task/usecases.go` — add `SubmitMonitoringReportUseCase`
- Modify: `backend/internal/handler/http/mitigation_task.go` — add `SubmitReport` handler

- [ ] **Step 1: Add SubmitMonitoringReportUseCase**

In `backend/internal/usecase/mitigation_task/usecases.go`, add new struct and input:

```go
// SubmitMonitoringReportInput is the input for submitting a mitigation
// monitoring report. Fields are optional — only provided fields are updated.
type SubmitMonitoringReportInput struct {
	TaskID      uuid.UUID `json:"-"`
	Status      string    `json:"status,omitempty"`
	ProgressPct *int      `json:"progressPct,omitempty"`
	EvidenceURL string    `json:"evidenceUrl,omitempty"`
	Notes       string    `json:"notes,omitempty"`
	ReportOutput string   `json:"reportOutput,omitempty"`
	ReportObstacle string `json:"reportObstacle,omitempty"`
	ReportedBy  uuid.UUID `json:"-"`
	OrgIDs      []uuid.UUID
}

type SubmitMonitoringReportUseCase struct {
	taskRepo repository.MitigationTaskRepository
	riskRepo repository.RiskRepository
}

func NewSubmitMonitoringReportUseCase(taskRepo repository.MitigationTaskRepository, riskRepo repository.RiskRepository) *SubmitMonitoringReportUseCase {
	return &SubmitMonitoringReportUseCase{taskRepo: taskRepo, riskRepo: riskRepo}
}

func (uc *SubmitMonitoringReportUseCase) Execute(ctx context.Context, input SubmitMonitoringReportInput) (*entity.MitigationTask, error) {
	if input.ProgressPct != nil && (*input.ProgressPct < 0 || *input.ProgressPct > 100) {
		return nil, domainerrors.ErrInvalidProgress
	}

	if input.Status != "" && input.Status != "pending" && input.Status != "done" {
		return nil, domainerrors.NewBadRequest("invalid status: must be pending or done")
	}

	evidenceURL := strings.TrimSpace(input.EvidenceURL)
	if evidenceURL != "" {
		parsedURL, err := url.ParseRequestURI(evidenceURL)
		if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
			return nil, domainerrors.ErrInvalidEvidenceURL
		}
	}

	task, err := uc.taskRepo.GetByID(ctx, input.TaskID, input.OrgIDs)
	if err != nil {
		return nil, fmt.Errorf("task not found: %w", err)
	}

	if _, err := uc.riskRepo.GetByID(ctx, task.RiskID, input.OrgIDs); err != nil {
		return nil, domainerrors.ErrForbidden
	}

	now := time.Now().In(timeutil.JakartaLocation())

	// Only update fields that were provided
	if input.Status != "" {
		task.Status = input.Status
	}
	if input.ProgressPct != nil {
		task.ProgressPct = *input.ProgressPct
	}
	if evidenceURL != "" {
		task.EvidenceURL = evidenceURL
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
	task.ReportedBy = &input.ReportedBy
	task.ReportedAt = &now

	if err := uc.taskRepo.Update(ctx, task); err != nil {
		return nil, fmt.Errorf("update task: %w", err)
	}

	return uc.taskRepo.GetByID(ctx, task.ID, input.OrgIDs)
}
```

- [ ] **Step 2: Add handler endpoint**

In `backend/internal/handler/http/mitigation_task.go`, add `SubmitReport` method:

```go
// SubmitReport handles PUT /api/mitigation-tasks/:id/report
func (h *MitigationTaskHandler) SubmitReport(c *fiber.Ctx) error {
	taskID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid task ID")
	}

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		return handleError(c, err)
	}

	var input mtuc.SubmitMonitoringReportInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	input.TaskID = taskID
	input.ReportedBy = userID
	input.OrgIDs = orgIDs

	task, err := h.submitReportUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": task})
}
```

Add `submitReportUC` field to handler struct and constructor.

- [ ] **Step 3: Register route**

In `backend/cmd/server/main.go`:
```go
protected.Put("/mitigation-tasks/:id/report", cleanMitigationTaskHandler.SubmitReport)
```

- [ ] **Step 4: Verify compilation**

Run: `cd backend && go build ./...`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add backend/internal/usecase/mitigation_task/usecases.go backend/internal/handler/http/mitigation_task.go backend/cmd/server/main.go
git commit -m "feat: add SubmitMonitoringReportUseCase with relaxed validation"
```

---

### Task 7: Backend — Add Validation Before Finalization

**Files:**
- Modify: `backend/internal/usecase/risk/monitoring_transaction.go` — add validation in FinalizeMonitoringUseCase
- Modify: `backend/internal/handler/http/mitigation_task.go` — add new endpoints for monitoring tasks
- Modify: `backend/cmd/server/main.go` — register new routes

- [ ] **Step 1: Add validation to FinalizeMonitoringUseCase**

In `backend/internal/usecase/risk/monitoring_transaction.go`, add to `FinalizeMonitoringUseCase`:

```go
type FinalizeMonitoringUseCase struct {
	riskRepo       monitoringRiskRepository
	monitoringRepo monitoringTransactionRepository
	taskRepo       repository.MitigationTaskRepository // NEW
}
```

In `Execute()`, before `sourceRisk.IsApprovedCurrent()` check, add:

```go
// Validate all mitigation tasks are reported before finalization
counts, err := uc.taskRepo.CountByMonitoringAndStatus(ctx, input.MonitoringID, input.OrgIDs)
if err != nil {
	return nil, errors.Wrap(err, "failed to validate mitigation tasks")
}
if counts.Pending > 0 {
	return nil, errors.New(fmt.Sprintf(
		"cannot finalize: %d of %d mitigation tasks are still pending (not reported)",
		counts.Pending, counts.Total,
	))
}
```

- [ ] **Step 2: Add new handler endpoints**

In `backend/internal/handler/http/mitigation_task.go`, add to `MitigationTaskHandler`:

```go
type MitigationTaskHandler struct {
	listUC              *mtuc.ListTasksUseCase
	submitProgressUC    *mtuc.SubmitProgressUseCase
	ensureTasksUC       *mtuc.EnsureTasksForRiskVersionUseCase // NEW
}
```

Add new handler methods:

```go
// ListByMonitoring handles GET /api/risk-monitorings/:id/tasks
func (h *MitigationTaskHandler) ListByMonitoring(c *fiber.Ctx) error {
	monitoringID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid monitoring ID")
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		return handleError(c, err)
	}

	tasks, err := h.listUC.ListByMonitoring(c.Context(), monitoringID, orgIDs)
	if err != nil {
		return handleError(c, err)
	}

	if tasks == nil {
		return c.JSON(fiber.Map{"data": []interface{}{}})
	}
	return c.JSON(fiber.Map{"data": tasks})
}

// ValidateFinalize handles GET /api/risk-monitorings/:id/validate-finalize
func (h *MitigationTaskHandler) ValidateFinalize(c *fiber.Ctx) error {
	monitoringID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid monitoring ID")
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		return handleError(c, err)
	}

	counts, err := h.listUC.CountByMonitoring(c.Context(), monitoringID, orgIDs)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"canFinalize":    counts.Pending == 0,
			"totalTasks":     counts.Total,
			"reportedTasks":  counts.Done,
			"pendingTasks":   counts.Pending,
		},
	})
}
```

- [ ] **Step 3: Add ListByMonitoring and CountByMonitoring to ListTasksUseCase**

In `backend/internal/usecase/mitigation_task/usecases.go`, add to `ListTasksUseCase`:

```go
func (uc *ListTasksUseCase) ListByMonitoring(ctx context.Context, monitoringID uuid.UUID, orgIDs []uuid.UUID) ([]*entity.MitigationTask, error) {
	return uc.taskRepo.ListByMonitoring(ctx, monitoringID, orgIDs)
}

func (uc *ListTasksUseCase) CountByMonitoring(ctx context.Context, monitoringID uuid.UUID, orgIDs []uuid.UUID) (*repository.MonitoringTaskCounts, error) {
	return uc.taskRepo.CountByMonitoringAndStatus(ctx, monitoringID, orgIDs)
}
```

- [ ] **Step 4: Register new routes in server main.go**

```go
protected.Get("/risk-monitorings/:id/tasks", cleanMitigationTaskHandler.ListByMonitoring)
protected.Get("/risk-monitorings/:id/validate-finalize", cleanMitigationTaskHandler.ValidateFinalize)
```

Remove the generate route:
```go
// protected.Post("/mitigation-tasks/generate", cleanMitigationTaskHandler.TriggerGenerate) — REMOVED
```

Remove `TriggerGenerate` from the handler and its dependencies.

- [ ] **Step 5: Verify compilation**

Run: `cd backend && go build ./...`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat: add mitigation task validation before monitoring finalization"
```

---

### Task 8: Backend — Remove Cron-Based Task Generation

**Files:**
- Modify: `backend/cmd/cron/main.go` — remove mitigation task cron
- Modify: `backend/internal/usecase/mitigation_task/usecases.go` — deprecate GenerateTasksUseCase, MarkOverdueUseCase

- [ ] **Step 1: Remove mitigation task cron from cron/main.go**

Remove lines 46-68 (everything related to mitigation tasks, repositories, and use cases):

```go
// BEFORE removal — remove these lines:
domainMitigationTaskRepo := postgresrepo.NewMitigationTaskRepository(pool)
mtGenerateUC := mtuc.NewGenerateTasksUseCase(domainMitigationTaskRepo)
mtOverdueUC := mtuc.NewMarkOverdueUseCase(domainMitigationTaskRepo)

// Mitigation Tasks
fmt.Println("=== MITIGATION TASKS ===")
tasksCreated, err := mtGenerateUC.Execute(ctx, now)
// ... rest of mitigation task cron code ...
```

The cron should only run KRI reports after this change.

- [ ] **Step 2: Add deprecation comments to usecases.go**

In `backend/internal/usecase/mitigation_task/usecases.go`, add deprecation comments above `GenerateTasksUseCase` and `MarkOverdueUseCase`:

```go
// Deprecated: Use EnsureTasksForRiskVersionUseCase instead.
// Cron-based task generation is removed per KMK PP 92 — mitigation
// is a breakthrough activity, not routine. Tasks are now generated
// on risk approval and reassessment creation.
type GenerateTasksUseCase struct { ... }

// Deprecated: Kept for reference only. Not invoked by cron anymore.
type MarkOverdueUseCase struct { ... }
```

- [ ] **Step 3: Remove TriggerGenerate endpoint**

In `backend/internal/handler/http/mitigation_task.go`, remove:
- `generateTasksUC` field from `MitigationTaskHandler`
- `markOverdueUC` field from `MitigationTaskHandler`
- `TriggerGenerate` method
- Update `NewMitigationTaskHandler` constructor signature

In `backend/cmd/server/main.go`, remove the route and the use case wiring.

- [ ] **Step 4: Verify compilation**

Run: `cd backend && go build ./...`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add backend/cmd/cron/main.go backend/internal/usecase/mitigation_task/usecases.go backend/internal/handler/http/mitigation_task.go backend/cmd/server/main.go
git commit -m "feat: remove cron-based mitigation task generation"
```

---

### Task 9: Frontend — Update MitigationTask Type

**Files:**
- Modify: `frontend/src/types/risk.ts` — add new fields to MitigationTask

- [ ] **Step 1: Add new fields**

In `frontend/src/types/risk.ts`, update the `MitigationTask` interface:

```typescript
export interface MitigationTask {
  id: string;
  mitigationId: string;
  riskId: string;
  monitoringId?: string | null;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: MitigationTaskStatus;
  progressPct: number;
  evidenceUrl: string;
  notes: string;
  reportOutput: string;
  reportObstacle: string;
  reportedBy?: string | null;
  reportedByName?: string;
  reportedAt?: string | null;
  generatedBy: string;
  createdAt: string;
  updatedAt: string;
  mitigationAction?: string;
  mitigationOwner?: string;
  riskCode?: string;
  riskTitle?: string;
}
```

- [ ] **Step 2: Add ValidationResult type**

```typescript
export interface MonitoringValidationResult {
  canFinalize: boolean;
  totalTasks: number;
  reportedTasks: number;
  pendingTasks: number;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/risk.ts
git commit -m "feat: add monitoringId, reportOutput, reportObstacle to MitigationTask type"
```

---

### Task 10: Frontend — API Client Functions

**Files:**
- Modify: `frontend/src/lib/api/mitigation-tasks.ts` (or create if not exists, or add to existing API lib)

- [ ] **Step 1: Add API functions**

In `frontend/src/lib/api/` (check existing pattern for API calls), add:

```typescript
import type { MitigationTask, MonitoringValidationResult } from "@/types/risk";

export async function listMonitoringTasks(
  token: string,
  monitoringId: string,
): Promise<MitigationTask[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/risk-monitorings/${monitoringId}/tasks`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const json = await res.json();
  return json.data ?? [];
}

export async function validateMonitoringFinalize(
  token: string,
  monitoringId: string,
): Promise<MonitoringValidationResult> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/risk-monitorings/${monitoringId}/validate-finalize`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const json = await res.json();
  return json.data;
}

export async function updateTaskReport(
  token: string,
  taskId: string,
  data: {
    status?: string;
    progressPct?: number;
    reportOutput?: string;
    reportObstacle?: string;
    evidenceUrl?: string;
    notes?: string;
  },
): Promise<MitigationTask> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/mitigation-tasks/${taskId}/report`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
  );
  const json = await res.json();
  return json.data;
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors from new files

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api/
git commit -m "feat: add monitoring task API client functions"
```

---

### Task 11: Frontend — Remove dueDate and frequency from Mitigation Form

**Files:**
- Modify: `frontend/src/app/(app)/risk/register/new/page.tsx` — remove dueDate from schema and form mapping
- Modify: `frontend/src/components/shared/mitigation-table.tsx` — remove dueDate column and frequency-related UI

- [ ] **Step 1: Remove dueDate from Zod schema**

In `frontend/src/app/(app)/risk/register/new/page.tsx`, in `mitigationSchema` (around line 392), remove the `dueDate` line:

```typescript
const mitigationSchema = z.object({
  id: z.string().optional(),
  action: z.string().default(""),
  owner: z.string().default(""),
  treatmentOwnerId: z.string().optional(),
  externalPicId: z.string().optional(),
  // dueDate removed — auto-calculated from monitoring cycle
  mitigationType: z
    .enum(["reduce_probability", "reduce_impact", "reduce_both"])
    .default("reduce_probability"),
  // ... rest unchanged
});
```

- [ ] **Step 2: Remove dueDate from form mapping**

In the `MitigationTable` items mapping (around line 3304), remove:

```typescript
dueDate: mitigation.dueDate ?? "",
```

- [ ] **Step 3: Remove dueDate from prefilled defaults**

Remove `dueDate: ""` from:
- MitigationPicker append (around line 3353)
- Document intelligence prefill (around line 1286)
- Meeting intelligence prefill (around line 1396)

- [ ] **Step 4: Update superRefine validator**

Remove `mitigation.dueDate` from the `.hasContent` check (around line 474):

```typescript
.hasContent = [
  mitigation.owner,
  // mitigation.dueDate removed
  mitigation.activityStage,
].some(...)
```

- [ ] **Step 5: Remove dueDate and frequency from mitigation-table component**

In `frontend/src/components/shared/mitigation-table.tsx`:
- Remove `dueDate` from the `MitigationItem` interface
- Remove the "Due Date" column from the table header and body
- Remove any frequency/recurring interval related UI if present

- [ ] **Step 6: Verify compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/(app)/risk/register/new/page.tsx frontend/src/components/shared/mitigation-table.tsx
git commit -m "feat: remove dueDate and frequency from mitigation form and table"
```

---

### Task 12: Frontend — New Mitigation Report Section in Assessment Page

**Files:**
- Create: `frontend/src/app/(app)/risk/assessment/[id]/_components/mitigation-report-table.tsx`
- Modify: `frontend/src/app/(app)/risk/assessment/[id]/page.tsx` — replace summary fields with new component

- [ ] **Step 1: Create MitigationReportTable component**

```typescript
// frontend/src/app/(app)/risk/assessment/[id]/_components/mitigation-report-table.tsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import {
  listMonitoringTasks,
  updateTaskReport,
  validateMonitoringFinalize,
} from "@/lib/api/mitigation-tasks";
import type {
  MitigationTask,
  MonitoringValidationResult,
} from "@/types/risk";

interface MitigationReportTableProps {
  monitoringId: string;
  onValidationChange?: (validation: MonitoringValidationResult) => void;
}

const statusOptions = [
  { value: "pending", label: "Belum Dilaporkan" },
  { value: "done", label: "Selesai Dilaporkan" },
];

export function MitigationReportTable({
  monitoringId,
  onValidationChange,
}: MitigationReportTableProps) {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<MitigationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [validation, setValidation] = useState<MonitoringValidationResult | null>(null);

  useEffect(() => {
    if (!token || !monitoringId) return;

    const load = async () => {
      setLoading(true);
      try {
        const data = await listMonitoringTasks(token, monitoringId);
        setTasks(data);
        const v = await validateMonitoringFinalize(token, monitoringId);
        setValidation(v);
        onValidationChange?.(v);
      } catch (err) {
        console.error(err);
        toast.error("Gagal memuat data laporan mitigasi");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, monitoringId]);

  const handleUpdateTask = async (
    taskId: string,
    field: string,
    value: string | number,
  ) => {
    if (!token) return;
    try {
      await updateTaskReport(token, taskId, { [field]: value });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, [field]: value } : t)),
      );
      const v = await validateMonitoringFinalize(token, monitoringId);
      setValidation(v);
      onValidationChange?.(v);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memperbarui laporan");
    }
  };

  const handleChangeStatus = (taskId: string, status: string) => {
    handleUpdateTask(taskId, "status", status);
    if (status === "done") {
      handleUpdateTask(taskId, "progressPct", 100);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          Memuat laporan mitigasi...
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          Belum ada data rencana mitigasi untuk monitoring ini.
        </CardContent>
      </Card>
    );
  }

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const progressPct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Laporan Pelaksanaan Mitigasi
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Laporkan status setiap rencana mitigasi sebelum finalisasi pemantauan.
            </p>
          </div>
          <Badge variant={validation?.canFinalize ? "default" : "outline"}>
            {doneCount}/{tasks.length} dilaporkan
          </Badge>
        </div>
        <Progress value={progressPct} className="mt-4 h-2" />
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-y-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="h-11">
                <TableHead className="h-11 whitespace-nowrap py-3 align-middle">
                  Mitigasi
                </TableHead>
                <TableHead className="h-11 w-32 whitespace-nowrap py-3 align-middle">
                  PIC
                </TableHead>
                <TableHead className="h-11 w-28 whitespace-nowrap py-3 align-middle">
                  Status
                </TableHead>
                <TableHead className="h-11 w-40 whitespace-nowrap py-3 align-middle">
                  Output Tercapai
                </TableHead>
                <TableHead className="h-11 w-40 whitespace-nowrap py-3 align-middle">
                  Kendala
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="text-sm font-medium">
                    {task.mitigationAction || "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {task.mitigationOwner || "-"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={task.status}
                      onValueChange={(val) => handleChangeStatus(task.id, val)}
                    >
                      <SelectTrigger className="h-8 w-[140px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Output..."
                      value={task.reportOutput}
                      onChange={(e) =>
                        handleUpdateTask(task.id, "reportOutput", e.target.value)
                      }
                      onBlur={(e) => {
                        if (e.target.value !== task.reportOutput) {
                          handleUpdateTask(task.id, "reportOutput", e.target.value);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Kendala..."
                      value={task.reportObstacle}
                      onChange={(e) =>
                        handleUpdateTask(task.id, "reportObstacle", e.target.value)
                      }
                      onBlur={(e) => {
                        if (e.target.value !== task.reportObstacle) {
                          handleUpdateTask(task.id, "reportObstacle", e.target.value);
                        }
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {!validation?.canFinalize && validation && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            <span className="font-medium">
              {validation.pendingTasks} mitigasi belum dilaporkan.
            </span>
            Laporkan seluruh mitigasi sebelum finalisasi.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Integrate into assessment page**

In `frontend/src/app/(app)/risk/assessment/[id]/page.tsx`:

1. Import the new component:
```typescript
import { MitigationReportTable } from "./_components/mitigation-report-table";
```

2. Replace the existing mitigation progress summary fields with the new component. Find where `mitigationProgressSummary` and related fields are set in the form/default values, and replace with:

```typescript
// Add state for validation
const [canFinalize, setCanFinalize] = useState(false);

// In the JSX, add the MitigationReportTable before the finalize button
{monitoring?.id && (
  <MitigationReportTable
    monitoringId={monitoring.id}
    onValidationChange={(v) => setCanFinalize(v.canFinalize)}
  />
)}
```

3. Disable the finalize button based on validation:
```typescript
<Button
  type="button"
  onClick={handleFinalize}
  disabled={isSubmitting || !canFinalize}
>
  {!canFinalize ? "Laporkan semua mitigasi dulu" : "Finalisasi"}
</Button>
```

- [ ] **Step 3: Verify compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/(app)/risk/assessment/[id]/_components/ frontend/src/app/(app)/risk/assessment/[id]/page.tsx
git commit -m "feat: add structured mitigation report table to assessment page"
```

---

### Task 13: Testing & Verification

**Files:** No new files — verify E2E flow

- [ ] **Step 1: Verify migration**

Run: `cd backend && make migrate-up`
Expected: migration 000078 applied

- [ ] **Step 2: Verify backend compiles**

Run: `cd backend && go build ./...`
Expected: no errors

- [ ] **Step 3: Verify frontend compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Run frontend lint**

Run: `cd frontend && npm run lint`
Expected: no new errors (pre-existing warnings are OK)

- [ ] **Step 5: E2E smoke test**

Manual test flow:
1. Create a risk with mitigation plan → approve
2. Verify mitigation_tasks created with cycle = current quarter
3. Create reassessment for same risk in current quarter
4. Verify tasks linked to monitoring (monitoring_id populated)
5. Try finalizing without reporting → expect error
6. Report all tasks → try finalizing → expect success
7. Verify new risk version created with tasks for new cycle

- [ ] **Step 6: Commit final cleanup**

```bash
git add .
git commit -m "chore: final verification and cleanup for mitigation reporting"
```
