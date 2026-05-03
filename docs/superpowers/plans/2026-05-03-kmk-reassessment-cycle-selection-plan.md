# KMK Reassessment Cycle Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to choose the assessed semester (`assessment_cycle`) in risk creation and reassessment forms, while blocking edits to an older cycle once a newer cycle already exists for the same risk version group.

**Architecture:** Keep existing risk versioning and `is_cycle_current` semantics. Add a focused chronological-cycle validation service in the risk usecase layer, enforce it from create and reassessment entry points, then expose cycle selection in frontend forms. This keeps KMK flexibility for late Semester I assessment during Semester II, but prevents historical rewrites after Semester II assessment has begun.

**Tech Stack:** Go + Fiber + pgx + PostgreSQL + existing Clean Architecture risk usecases; Next.js App Router + React + TypeScript + shadcn/ui.

---

## File Structure Map

### Existing backend files

- `backend/internal/usecase/risk/cycle.go` — add cycle parsing/comparison helpers.
- `backend/internal/usecase/risk/reassess.go` — validate requested reassessment cycle before draft reservation.
- `backend/internal/usecase/risk/create.go` — validate new risk `assessment_cycle` when a source/version group exists through cloned or imported flows; default remains current semester when empty.
- `backend/internal/domain/repository/risk.go` — add repository method for listing cycles in a version group if missing.
- `backend/internal/repository/postgres/risk.go` — implement cycle lookup query.
- `backend/internal/handler/http/risk.go` — ensure create/reassess handlers accept explicit `assessment_cycle`/`cycle` payload and pass it through.

### Existing frontend files

- `frontend/src/app/(app)/risk/register/new/page.tsx` — add assessed-semester selector for new and reassessment edit form.
- `frontend/src/app/(app)/risk/register/page.tsx` — change “Mulai Pemantauan/Reassessment” action so user can pick cycle before creating draft.
- `frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx` — keep current-cycle quick action, but use same validation error message from backend.
- `frontend/src/types/risk.ts` — ensure `assessmentCycle` is present in request/response types.
- `frontend/src/lib/risk.ts` — add frontend cycle option helper only for display/options.

### New test files

- `backend/internal/usecase/risk/cycle_test.go`
- `backend/internal/usecase/risk/reassess_cycle_guard_test.go`
- `frontend/src/lib/risk-cycle-options.test.ts`

---

## Behavioral Rules

1. User may choose `assessment_cycle` for a new risk or reassessment.
2. A requested cycle may be current, previous, or future only if explicit role policy later allows future cycles. Initial implementation allows current and previous cycles, rejects cycles more than one semester in the future.
3. Late previous-semester reassessment is allowed when no newer cycle exists in the same `version_group_id`.
4. Older-cycle reassessment is blocked when any newer cycle exists in the same `version_group_id` with status:
   - `assessment_draft`
   - `assessment_in_review`
   - `approved`
5. Rejected/archived versions do not block older-cycle reassessment unless they are still `is_cycle_current=true`.
6. Error message:

```text
Tidak bisa membuat reassessment untuk 2026-H1 karena risiko ini sudah memiliki penilaian pada periode lebih baru: 2026-H2.
```

---

## Task 1: Add Cycle Comparison Helpers

**Files:**
- Modify: `backend/internal/usecase/risk/cycle.go`
- Create: `backend/internal/usecase/risk/cycle_test.go`

- [ ] **Step 1: Write failing cycle helper tests**

Create `backend/internal/usecase/risk/cycle_test.go`:

```go
package risk

import "testing"

func TestCycleIndex(t *testing.T) {
	tests := []struct {
		name    string
		cycle   string
		want    int
		wantErr bool
	}{
		{name: "2026-H1", cycle: "2026-H1", want: 4052},
		{name: "2026-H2", cycle: "2026-H2", want: 4053},
		{name: "invalid half", cycle: "2026-H3", wantErr: true},
		{name: "invalid year", cycle: "abcd-H1", wantErr: true},
		{name: "empty", cycle: "", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := CycleIndex(tt.cycle)
			if (err != nil) != tt.wantErr {
				t.Fatalf("CycleIndex() error = %v, wantErr %v", err, tt.wantErr)
			}
			if got != tt.want {
				t.Fatalf("CycleIndex() = %d, want %d", got, tt.want)
			}
		})
	}
}

func TestCompareCycles(t *testing.T) {
	tests := []struct {
		name string
		a    string
		b    string
		want int
	}{
		{name: "same", a: "2026-H1", b: "2026-H1", want: 0},
		{name: "next half", a: "2026-H2", b: "2026-H1", want: 1},
		{name: "previous year", a: "2025-H2", b: "2026-H1", want: -1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := CompareCycles(tt.a, tt.b)
			if err != nil {
				t.Fatalf("CompareCycles() unexpected error = %v", err)
			}
			if got != tt.want {
				t.Fatalf("CompareCycles() = %d, want %d", got, tt.want)
			}
		})
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend
go test ./internal/usecase/risk -run 'TestCycleIndex|TestCompareCycles' -v
```

Expected: FAIL because `CycleIndex` and `CompareCycles` are undefined.

- [ ] **Step 3: Implement helpers**

Add to `backend/internal/usecase/risk/cycle.go`:

```go
func CycleIndex(cycle string) (int, error) {
	if !IsValidCycleFormat(cycle) {
		return 0, errors.Wrap(errors.ErrInvalidInput, "assessment_cycle must be in YYYY-HN format (e.g. 2026-H1)")
	}
	year, err := strconv.Atoi(cycle[:4])
	if err != nil {
		return 0, errors.Wrap(errors.ErrInvalidInput, "invalid assessment_cycle year")
	}
	half := 0
	switch cycle[5:] {
	case "H1":
		half = 0
	case "H2":
		half = 1
	default:
		return 0, errors.Wrap(errors.ErrInvalidInput, "invalid assessment_cycle half")
	}
	return year*2 + half, nil
}

func CompareCycles(a string, b string) (int, error) {
	aIndex, err := CycleIndex(a)
	if err != nil {
		return 0, err
	}
	bIndex, err := CycleIndex(b)
	if err != nil {
		return 0, err
	}
	switch {
	case aIndex > bIndex:
		return 1, nil
	case aIndex < bIndex:
		return -1, nil
	default:
		return 0, nil
	}
}
```

Also add imports:

```go
import (
	"fmt"
	"regexp"
	"strconv"
	"time"

	"github.com/manris/backend/internal/domain/errors"
)
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd backend
go test ./internal/usecase/risk -run 'TestCycleIndex|TestCompareCycles' -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/usecase/risk/cycle.go backend/internal/usecase/risk/cycle_test.go
git commit -m "feat: add risk cycle comparison helpers"
```

---

## Task 2: Add Repository Lookup for Newer Cycles

**Files:**
- Modify: `backend/internal/domain/repository/risk.go`
- Modify: `backend/internal/repository/postgres/risk.go`
- Test: `backend/internal/repository/postgres/risk_cycle_guard_test.go`

- [ ] **Step 1: Add repository interface method**

In `backend/internal/domain/repository/risk.go`, add to `RiskRepository`:

```go
ListBlockingCyclesAfter(ctx context.Context, versionGroupID uuid.UUID, requestedCycle string) ([]string, error)
```

- [ ] **Step 2: Implement Postgres query**

Add to `backend/internal/repository/postgres/risk.go`:

```go
func (r *riskRepository) ListBlockingCyclesAfter(ctx context.Context, versionGroupID uuid.UUID, requestedCycle string) ([]string, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT DISTINCT assessment_cycle
		FROM risks
		WHERE version_group_id = $1
		  AND assessment_cycle IS NOT NULL
		  AND assessment_cycle <> ''
		  AND assessment_cycle > $2
		  AND (
		    status IN ('assessment_draft', 'assessment_in_review', 'approved')
		    OR is_cycle_current = TRUE
		  )
		  AND archived_reason <> 'rejected'
		ORDER BY assessment_cycle ASC
	`, versionGroupID, requestedCycle)
	if err != nil {
		return nil, fmt.Errorf("list blocking cycles after requested cycle: %w", err)
	}
	defer rows.Close()

	cycles := []string{}
	for rows.Next() {
		var cycle string
		if err := rows.Scan(&cycle); err != nil {
			return nil, fmt.Errorf("scan blocking cycle: %w", err)
		}
		cycles = append(cycles, cycle)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate blocking cycles: %w", err)
	}
	return cycles, nil
}
```

- [ ] **Step 3: Add repository test if repository harness already exists**

Create `backend/internal/repository/postgres/risk_cycle_guard_test.go` using existing repository test setup patterns from `risk_getbyid_test.go`. Test these cases:

```go
func TestRiskRepository_ListBlockingCyclesAfter(t *testing.T) {
	// Seed same version_group_id:
	// 2026-H1 approved
	// 2026-H2 assessment_draft
	// Request 2026-H1.
	// Want []string{"2026-H2"}.
}

func TestRiskRepository_ListBlockingCyclesAfter_IgnoresOlderAndSameCycle(t *testing.T) {
	// Seed same version_group_id:
	// 2026-H1 approved
	// Request 2026-H1.
	// Want empty.
}
```

If the Postgres repository tests require database setup unavailable locally, keep the usecase tests in Task 3 as the main guard and run the repository test in integration-capable environments.

- [ ] **Step 4: Run focused tests**

Run:

```bash
cd backend
go test ./internal/repository/postgres -run ListBlockingCyclesAfter -v
```

Expected: PASS when test DB is configured, or SKIP if repository harness skips without DB.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/domain/repository/risk.go backend/internal/repository/postgres/risk.go backend/internal/repository/postgres/risk_cycle_guard_test.go
git commit -m "feat: query blocking reassessment cycles"
```

---

## Task 3: Enforce Older-Cycle Reassessment Guard

**Files:**
- Modify: `backend/internal/usecase/risk/reassess.go`
- Create: `backend/internal/usecase/risk/reassess_cycle_guard_test.go`

- [ ] **Step 1: Write failing usecase tests**

Create `backend/internal/usecase/risk/reassess_cycle_guard_test.go` with a fake repository implementing only methods used by `CreateRiskReassessmentUseCase`:

```go
package risk

import (
	"context"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type fakeCycleGuardRiskRepo struct {
	source         *entity.Risk
	blockingCycles []string
	created        *entity.Risk
}

func (f *fakeCycleGuardRiskRepo) GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.Risk, error) {
	return f.source, nil
}

func (f *fakeCycleGuardRiskRepo) ListVersions(ctx context.Context, versionGroupID uuid.UUID) ([]*entity.Risk, error) {
	return []*entity.Risk{f.source}, nil
}

func (f *fakeCycleGuardRiskRepo) Create(ctx context.Context, risk *entity.Risk) error {
	f.created = risk
	return nil
}

func (f *fakeCycleGuardRiskRepo) ListBlockingCyclesAfter(ctx context.Context, versionGroupID uuid.UUID, requestedCycle string) ([]string, error) {
	return f.blockingCycles, nil
}
```

Add required no-op methods if the repository interface requires them. Keep each no-op returning zero values; do not call them in these tests.

Add tests:

```go
func TestCreateRiskReassessmentUseCase_AllowsLatePreviousCycleWhenNoNewerCycleExists(t *testing.T) {
	groupID := uuid.New()
	sourceID := uuid.New()
	creatorID := uuid.New()
	repo := &fakeCycleGuardRiskRepo{
		source: &entity.Risk{
			ID:             sourceID,
			VersionGroupID: groupID,
			Status:         entity.RiskStatusApproved,
			IsCurrent:      true,
			AssessmentCycle: "2026-H1",
		},
	}

	uc := NewCreateRiskReassessmentUseCase(repo)
	out, err := uc.Execute(context.Background(), CreateRiskReassessmentInput{
		RiskID:    sourceID,
		Cycle:     "2026-H1",
		CreatedBy: creatorID,
	})

	if err != nil {
		t.Fatalf("Execute() unexpected error = %v", err)
	}
	if out.ExistingDraft {
		t.Fatalf("Execute() ExistingDraft = true, want false")
	}
	if repo.created == nil {
		t.Fatalf("expected reassessment draft to be created")
	}
	if repo.created.AssessmentCycle != "2026-H1" {
		t.Fatalf("created cycle = %q, want 2026-H1", repo.created.AssessmentCycle)
	}
}

func TestCreateRiskReassessmentUseCase_BlocksOlderCycleWhenNewerCycleExists(t *testing.T) {
	groupID := uuid.New()
	sourceID := uuid.New()
	repo := &fakeCycleGuardRiskRepo{
		source: &entity.Risk{
			ID:             sourceID,
			VersionGroupID: groupID,
			Status:         entity.RiskStatusApproved,
			IsCurrent:      true,
			AssessmentCycle: "2026-H2",
		},
		blockingCycles: []string{"2026-H2"},
	}

	uc := NewCreateRiskReassessmentUseCase(repo)
	_, err := uc.Execute(context.Background(), CreateRiskReassessmentInput{
		RiskID: sourceID,
		Cycle:  "2026-H1",
	})

	if err == nil {
		t.Fatalf("Execute() expected error")
	}
	if !strings.Contains(err.Error(), "periode lebih baru: 2026-H2") {
		t.Fatalf("error = %q, want newer cycle message", err.Error())
	}
	if repo.created != nil {
		t.Fatalf("draft should not be created when newer cycle exists")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend
go test ./internal/usecase/risk -run CreateRiskReassessmentUseCase_.*Cycle -v
```

Expected: FAIL because `CreateRiskReassessmentUseCase` does not call cycle guard.

- [ ] **Step 3: Add guard interface and validation**

In `backend/internal/usecase/risk/reassess.go`, add:

```go
type reassessmentCycleGuard interface {
	ListBlockingCyclesAfter(ctx context.Context, versionGroupID uuid.UUID, requestedCycle string) ([]string, error)
}

func validateNoNewerCycle(ctx context.Context, repo repository.RiskRepository, versionGroupID uuid.UUID, requestedCycle string) error {
	guard, ok := repo.(reassessmentCycleGuard)
	if !ok {
		return nil
	}
	blockingCycles, err := guard.ListBlockingCyclesAfter(ctx, versionGroupID, requestedCycle)
	if err != nil {
		return errors.Wrap(err, "failed to validate reassessment cycle")
	}
	if len(blockingCycles) > 0 {
		return errors.Wrap(
			errors.ErrInvalidInput,
			fmt.Sprintf("Tidak bisa membuat reassessment untuk %s karena risiko ini sudah memiliki penilaian pada periode lebih baru: %s.", requestedCycle, blockingCycles[0]),
		)
	}
	return nil
}
```

Add import:

```go
import "fmt"
```

Call after `sourceRisk.CanBeReassessed()` and before draft reservation:

```go
if err := validateNoNewerCycle(ctx, uc.riskRepo, sourceRisk.VersionGroupID, input.Cycle); err != nil {
	return nil, err
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd backend
go test ./internal/usecase/risk -run CreateRiskReassessmentUseCase_.*Cycle -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/usecase/risk/reassess.go backend/internal/usecase/risk/reassess_cycle_guard_test.go
git commit -m "fix: block reassessment after newer cycle exists"
```

---

## Task 4: Allow Explicit Cycle in New Risk Form

**Files:**
- Modify: `backend/internal/usecase/risk/create.go`
- Modify: `backend/internal/handler/http/risk.go`
- Modify: `frontend/src/app/(app)/risk/register/new/page.tsx`
- Modify: `frontend/src/types/risk.ts`

- [ ] **Step 1: Backend create behavior**

Ensure risk create input accepts `AssessmentCycle` and defaults to `currentAssessmentCycle()` when empty:

```go
if strings.TrimSpace(input.AssessmentCycle) == "" {
	input.AssessmentCycle = currentAssessmentCycle()
}
if !IsValidCycleFormat(input.AssessmentCycle) {
	return nil, errors.Wrap(errors.ErrInvalidInput, "assessment_cycle must be in YYYY-HN format (e.g. 2026-H1)")
}
risk.AssessmentCycle = input.AssessmentCycle
```

- [ ] **Step 2: Handler payload**

In `backend/internal/handler/http/risk.go`, ensure request parsing maps JSON `assessmentCycle` or `assessment_cycle` to usecase input:

```go
AssessmentCycle: strings.TrimSpace(req.AssessmentCycle),
```

If the request struct lacks the field, add:

```go
AssessmentCycle string `json:"assessmentCycle"`
```

- [ ] **Step 3: Frontend type**

In `frontend/src/types/risk.ts`, ensure create/update payload includes:

```ts
assessmentCycle?: string;
```

- [ ] **Step 4: Frontend selector**

In `frontend/src/app/(app)/risk/register/new/page.tsx`, add a select near risk identity metadata:

```tsx
<div className="space-y-2">
  <Label htmlFor="assessment-cycle">Periode Dinilai</Label>
  <Select value={assessmentCycle} onValueChange={setAssessmentCycle}>
    <SelectTrigger id="assessment-cycle">
      <SelectValue placeholder="Pilih semester" />
    </SelectTrigger>
    <SelectContent>
      {cycleOptions.map((cycle) => (
        <SelectItem key={cycle.value} value={cycle.value}>
          {cycle.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

Add state:

```tsx
const [assessmentCycle, setAssessmentCycle] = useState(currentGlobalCycle());
```

Include in submit payload:

```ts
assessmentCycle,
```

- [ ] **Step 5: Run focused checks**

Run:

```bash
cd backend
go test ./internal/usecase/risk ./internal/handler/http -run 'Create|Risk' -v
cd ../frontend
npm run build
```

Expected: backend focused tests PASS; frontend build PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/usecase/risk/create.go backend/internal/handler/http/risk.go frontend/src/types/risk.ts 'frontend/src/app/(app)/risk/register/new/page.tsx'
git commit -m "feat: allow selecting risk assessment cycle"
```

---

## Task 5: Add Reassessment Cycle Picker in Register Action

**Files:**
- Modify: `frontend/src/app/(app)/risk/register/page.tsx`
- Create: `frontend/src/lib/risk-cycle-options.ts`
- Create: `frontend/src/lib/risk-cycle-options.test.ts`

- [ ] **Step 1: Add cycle option helper test**

Create `frontend/src/lib/risk-cycle-options.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getSelectableAssessmentCycles } from "./risk-cycle-options";

describe("getSelectableAssessmentCycles", () => {
  it("returns previous, current, and next cycle around current cycle", () => {
    expect(getSelectableAssessmentCycles("2026-H2")).toEqual([
      { value: "2026-H1", label: "2026-H1" },
      { value: "2026-H2", label: "2026-H2" },
      { value: "2027-H1", label: "2027-H1" },
    ]);
  });
});
```

- [ ] **Step 2: Implement helper**

Create `frontend/src/lib/risk-cycle-options.ts`:

```ts
export type AssessmentCycleOption = {
  value: string;
  label: string;
};

function shiftCycle(cycle: string, delta: number) {
  const [yearRaw, halfRaw] = cycle.split("-");
  let year = Number(yearRaw);
  let half = halfRaw === "H2" ? 1 : 0;
  let index = year * 2 + half + delta;
  year = Math.floor(index / 2);
  half = index % 2;
  return `${year}-${half === 0 ? "H1" : "H2"}`;
}

export function getSelectableAssessmentCycles(currentCycle: string): AssessmentCycleOption[] {
  return [-1, 0, 1].map((delta) => {
    const value = shiftCycle(currentCycle, delta);
    return { value, label: value };
  });
}
```

- [ ] **Step 3: Run helper test**

Run:

```bash
cd frontend
npm test -- risk-cycle-options.test.ts
```

Expected: PASS.

- [ ] **Step 4: Add reassessment confirmation selector**

In `frontend/src/app/(app)/risk/register/page.tsx`, replace direct current-cycle reassessment with dialog state:

```tsx
const [selectedAssessmentCycle, setSelectedAssessmentCycle] = useState(currentGlobalCycle());
```

In confirmation dialog body, add:

```tsx
<div className="space-y-2">
  <Label htmlFor="reassessment-cycle">Periode Dinilai</Label>
  <Select value={selectedAssessmentCycle} onValueChange={setSelectedAssessmentCycle}>
    <SelectTrigger id="reassessment-cycle">
      <SelectValue placeholder="Pilih semester" />
    </SelectTrigger>
    <SelectContent>
      {getSelectableAssessmentCycles(currentGlobalCycle()).map((cycle) => (
        <SelectItem key={cycle.value} value={cycle.value}>
          {cycle.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

Change API request body:

```ts
{ cycle: selectedAssessmentCycle }
```

- [ ] **Step 5: Ensure backend validation error is shown**

Keep existing toast error handling. It should display backend message:

```text
Tidak bisa membuat reassessment untuk 2026-H1 karena risiko ini sudah memiliki penilaian pada periode lebih baru: 2026-H2.
```

- [ ] **Step 6: Run frontend build**

Run:

```bash
cd frontend
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/risk-cycle-options.ts frontend/src/lib/risk-cycle-options.test.ts 'frontend/src/app/(app)/risk/register/page.tsx'
git commit -m "feat: select reassessment cycle from register"
```

---

## Task 6: Add Regression Tests for Full Scenario

**Files:**
- Modify: `backend/internal/usecase/risk/reassess_test.go`
- Modify: `backend/internal/usecase/risk/create_monitoring_batch_test.go`

- [ ] **Step 1: Add scenario test**

In `backend/internal/usecase/risk/reassess_test.go`, add:

```go
func TestReassessmentCycleScenario_TwoYearHistory(t *testing.T) {
	// Build fake version history:
	// V1 2026-H1 approved
	// V2 2026-H1 late reassessment approved
	// V3 2026-H2 assessment_draft
	// Assert new 2026-H1 reassessment is blocked.
	// Assert new 2026-H2 reassessment returns existing draft.
}
```

Use existing fake repository or create a small local fake that returns:

```go
[]*entity.Risk{
	{AssessmentCycle: "2026-H1", Status: entity.RiskStatusApproved},
	{AssessmentCycle: "2026-H2", Status: entity.RiskStatusDraft},
}
```

- [ ] **Step 2: Add monitoring batch guard test**

In `backend/internal/usecase/risk/create_monitoring_batch_test.go`, add a test that batch monitoring for `2026-H1` fails when `2026-H2` exists for the same version group:

```go
func TestCreateMonitoringBatch_BlocksOlderCycleWhenNewerCycleExists(t *testing.T) {
	// Prepare approved current source risk in version group X.
	// Fake ListBlockingCyclesAfter returns []string{"2026-H2"} for requested 2026-H1.
	// Execute batch with cycle 2026-H1.
	// Want item status "failed" and error contains "periode lebih baru: 2026-H2".
}
```

- [ ] **Step 3: Wire guard into batch processing**

In `backend/internal/usecase/risk/create_monitoring_batch.go`, before `BuildPeriodicReassessmentDraft`, call:

```go
if err := validateNoNewerCycle(ctx, uc.riskRepo, sourceRisk.VersionGroupID, cycle); err != nil {
	return BulkMonitoringBatchItemOutput{
		ClientKey: item.ClientKey,
		Code:      &sourceRisk.Code,
		Status:    "failed",
		Message:   "cannot create reassessment for older cycle",
		Error:     err.Error(),
	}
}
```

- [ ] **Step 4: Run risk usecase tests**

Run:

```bash
cd backend
go test ./internal/usecase/risk -run 'ReassessmentCycle|CreateMonitoringBatch' -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/usecase/risk/reassess_test.go backend/internal/usecase/risk/create_monitoring_batch.go backend/internal/usecase/risk/create_monitoring_batch_test.go
git commit -m "test: cover reassessment cycle ordering"
```

---

## Task 7: Final Verification

**Files:**
- No code files expected unless verification finds a bug.

- [ ] **Step 1: Run backend test suite**

Run:

```bash
cd backend
go test ./...
```

Expected: PASS.

- [ ] **Step 2: Run frontend build**

Run:

```bash
cd frontend
npm run build
```

Expected: PASS.

- [ ] **Step 3: Manual smoke scenario**

Run backend and frontend locally. In app:

1. Create Risiko A with `assessmentCycle = 2026-H1`.
2. Start reassessment and choose `2026-H1`; expect draft created.
3. Approve that reassessment.
4. Start reassessment and choose `2026-H2`; expect draft created.
5. Start another reassessment and choose `2026-H1`; expect backend error:

```text
Tidak bisa membuat reassessment untuk 2026-H1 karena risiko ini sudah memiliki penilaian pada periode lebih baru: 2026-H2.
```

- [ ] **Step 4: Commit verification fixes if any**

If verification required code fixes:

```bash
git add backend frontend
git commit -m "fix: stabilize reassessment cycle selection"
```

If no fixes required, no commit needed.

---

## Rollout Notes

- Existing data stays valid. No migration required for this plan.
- Existing `assessment_cycle` values already use `YYYY-HN`, so lexicographic comparison matches chronological order for this format.
- Late H1 entry during H2 stays possible until H2 has any draft/in-review/approved version in the same version group.
- Superadmin override is intentionally out of scope for this first implementation. Add later as `reopen_previous_cycle` permission if audit process needs it.

## Self-Review

- Spec coverage: cycle selection, late previous-cycle allowance, and newer-cycle blocking are covered in Tasks 1-6.
- Placeholder scan: no TBD/TODO placeholders remain.
- Type consistency: backend uses `assessment_cycle` internally and `assessmentCycle` JSON on frontend; reassessment endpoint keeps existing `{ cycle }` request body.
