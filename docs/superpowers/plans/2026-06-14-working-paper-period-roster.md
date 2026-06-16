# Working Paper Period Roster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-risk source selection with a period roster that consistently links each working paper to the monitored source version, target-quarter monitoring transaction, and optional result version.

**Architecture:** Extend `working_paper_risks` into a version-group roster and add database-enforced monitoring uniqueness by `version_group_id + quarter`. The working paper PostgreSQL repository becomes the aggregate transaction boundary for roster preview validation, working paper creation, exclusion auditing, and automatic monitoring draft creation. The frontend consumes a backend-generated preview, selects exclusions rather than source modes, confirms automatic draft creation, and blocks signing until all included monitorings are finalized.

**Tech Stack:** Go 1.25, Fiber v2, pgx v5, PostgreSQL, Next.js 16 App Router, React 19, TypeScript 5, React Hook Form, Zod, Tailwind CSS v4, shadcn/ui, Node test runner.

---

## File Structure

### Backend

- Create `backend/db/migrations/000078_working_paper_period_roster.up.sql`
  - Add roster references, monitoring group identity, uniqueness constraints, and exclusion audit table.
- Create `backend/db/migrations/000078_working_paper_period_roster.down.sql`
  - Remove the new schema without touching legacy working paper rows.
- Create `backend/db/migrations/000078_working_paper_period_roster_test.go`
  - Lock down migration invariants.
- Modify `backend/internal/domain/entity/risk_monitoring.go`
  - Add `VersionGroupID`.
- Modify `backend/internal/domain/entity/working_paper.go`
  - Add roster preview, decision, exclusion, result-version, and signing-blocker contracts.
- Modify `backend/internal/domain/repository/working_paper.go`
  - Add preview, atomic roster creation, and signing blocker methods.
- Modify `backend/internal/repository/postgres/risk_monitoring.go`
  - Persist and scan `version_group_id`; extract a transaction-aware monitoring insert helper.
- Create `backend/internal/repository/postgres/working_paper_roster.go`
  - Own semester boundaries, roster resolution, stale-preview validation, atomic creation, exclusion persistence, and signing blockers.
- Create `backend/internal/repository/postgres/working_paper_roster_test.go`
  - Database-backed roster and transaction tests.
- Modify `backend/internal/repository/postgres/working_paper.go`
  - Read explicit source, monitoring, and result references; keep legacy fallback.
- Modify `backend/internal/usecase/workingpaper/usecase.go`
  - Remove dependencies no longer needed by the create path.
- Create `backend/internal/usecase/workingpaper/preview_roster.go`
  - Validate scope and expose the repository preview.
- Rewrite `backend/internal/usecase/workingpaper/create.go`
  - Accept roster decisions and delegate atomic persistence.
- Delete `backend/internal/usecase/workingpaper/risk_resolution.go`
  - Remove `latest_approved` and `review_periodic` resolution.
- Modify `backend/internal/usecase/workingpaper/sign.go`
  - Enforce finalized monitoring before the first signature.
- Modify `backend/internal/usecase/workingpaper/create_test.go`
  - Test decision validation and atomic repository delegation.
- Create `backend/internal/usecase/workingpaper/preview_roster_test.go`
  - Test preview scope and semester validation.
- Modify `backend/internal/usecase/workingpaper/sign_test.go`
  - Test structured monitoring blockers.
- Modify `backend/internal/handler/http/working_paper.go`
  - Add preview endpoint and new create request.
- Modify `backend/internal/handler/http/working_paper_test.go`
  - Test HTTP contracts and conflict responses.
- Modify `backend/cmd/server/main.go`
  - Register roster preview before `/:id`.
- Modify `backend/internal/bootstrap/bootstrap.go`
  - Wire the revised use case constructor.

### Frontend

- Modify `frontend/src/types/working-paper.ts`
  - Add roster preview, decision, result version, and blocker types; remove source mode from new create input.
- Modify `frontend/src/lib/api/working-papers.ts`
  - Add roster preview API and revised create API.
- Create `frontend/src/lib/working-paper-roster.ts`
  - Pure decision, summary, and confirmation helpers.
- Create `frontend/src/lib/working-paper-roster.test.ts`
  - Test default inclusion, exclusion validation, and summary counts.
- Modify `frontend/src/lib/api/working-paper-create-error.ts`
  - Add stale preview and roster conflict messages.
- Modify `frontend/src/app/(app)/risk/working-papers/new/page.tsx`
  - Replace `/risks` and source-mode selection with roster preview, organization selection, exclusions, badges, and confirmation dialog.
- Modify `frontend/src/lib/working-paper-monitoring-table.ts`
  - Model source and result versions separately.
- Modify `frontend/src/lib/working-paper-monitoring-table.test.ts`
  - Test `v1 -> monitoring -> v2` presentation.
- Modify `frontend/src/app/(app)/risk/working-papers/[id]/working-paper-monitoring-table.tsx`
  - Display source and optional result version; preserve monitoring actions.
- Modify `frontend/src/app/(app)/risk/working-papers/[id]/page.tsx`
  - Display structured signing blockers returned by the API.

## Task 1: Add Database Invariants for Period Rosters

**Files:**
- Create: `backend/db/migrations/000078_working_paper_period_roster.up.sql`
- Create: `backend/db/migrations/000078_working_paper_period_roster.down.sql`
- Create: `backend/db/migrations/000078_working_paper_period_roster_test.go`

- [ ] **Step 1: Write the migration contract test**

Create a source-level migration test:

```go
package migrations_test

import (
	"os"
	"strings"
	"testing"
)

func TestWorkingPaperPeriodRosterMigrationContainsRequiredInvariants(t *testing.T) {
	body, err := os.ReadFile("000078_working_paper_period_roster.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	sql := string(body)
	required := []string{
		"ADD COLUMN version_group_id UUID",
		"ADD COLUMN source_risk_id UUID",
		"ADD COLUMN monitoring_id UUID",
		"ADD COLUMN result_risk_id UUID",
		"CREATE UNIQUE INDEX uq_working_paper_risks_group",
		"ADD COLUMN version_group_id UUID",
		"CREATE UNIQUE INDEX uq_risk_monitorings_group_cycle_active",
		"CREATE TABLE working_paper_risk_exclusions",
		"UNIQUE (working_paper_id, version_group_id)",
	}
	for _, snippet := range required {
		if !strings.Contains(sql, snippet) {
			t.Fatalf("migration missing %q", snippet)
		}
	}
}
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
cd backend/db/migrations
go test -run TestWorkingPaperPeriodRosterMigrationContainsRequiredInvariants -count=1
```

Expected: FAIL because migration `000078` does not exist.

- [ ] **Step 3: Create the up migration**

Create `000078_working_paper_period_roster.up.sql`:

```sql
ALTER TABLE risk_monitorings
    ADD COLUMN version_group_id UUID;

UPDATE risk_monitorings rm
SET version_group_id = r.version_group_id
FROM risks r
WHERE r.id = rm.source_risk_id
  AND rm.version_group_id IS NULL;

ALTER TABLE risk_monitorings
    ALTER COLUMN version_group_id SET NOT NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM risk_monitorings
        WHERE status IN ('draft', 'finalized')
        GROUP BY version_group_id, assessment_cycle
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'duplicate active risk monitoring exists for version_group_id + assessment_cycle';
    END IF;
END
$$;

CREATE INDEX idx_risk_monitorings_version_group
    ON risk_monitorings(version_group_id);

CREATE UNIQUE INDEX uq_risk_monitorings_group_cycle_active
    ON risk_monitorings(version_group_id, assessment_cycle)
    WHERE status IN ('draft', 'finalized');

ALTER TABLE working_paper_risks
    ADD COLUMN version_group_id UUID,
    ADD COLUMN source_risk_id UUID REFERENCES risks(id),
    ADD COLUMN monitoring_id UUID REFERENCES risk_monitorings(id),
    ADD COLUMN result_risk_id UUID REFERENCES risks(id);

UPDATE working_paper_risks wpr
SET source_risk_id = wpr.risk_id,
    version_group_id = r.version_group_id
FROM risks r
WHERE r.id = wpr.risk_id;

CREATE INDEX idx_working_paper_risks_source_risk
    ON working_paper_risks(source_risk_id);

CREATE INDEX idx_working_paper_risks_monitoring
    ON working_paper_risks(monitoring_id);

CREATE UNIQUE INDEX uq_working_paper_risks_group
    ON working_paper_risks(working_paper_id, version_group_id)
    WHERE version_group_id IS NOT NULL;

CREATE TABLE working_paper_risk_exclusions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    working_paper_id UUID NOT NULL REFERENCES working_papers(id) ON DELETE CASCADE,
    version_group_id UUID NOT NULL,
    assessment_cycle VARCHAR(7) NOT NULL,
    reason TEXT NOT NULL CHECK (btrim(reason) <> ''),
    excluded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (working_paper_id, version_group_id)
);

CREATE INDEX idx_working_paper_risk_exclusions_working_paper
    ON working_paper_risk_exclusions(working_paper_id);
```

- [ ] **Step 4: Create the down migration**

Create `000078_working_paper_period_roster.down.sql`:

```sql
DROP TABLE IF EXISTS working_paper_risk_exclusions;

DROP INDEX IF EXISTS uq_working_paper_risks_group;
DROP INDEX IF EXISTS idx_working_paper_risks_monitoring;
DROP INDEX IF EXISTS idx_working_paper_risks_source_risk;

ALTER TABLE working_paper_risks
    DROP COLUMN IF EXISTS result_risk_id,
    DROP COLUMN IF EXISTS monitoring_id,
    DROP COLUMN IF EXISTS source_risk_id,
    DROP COLUMN IF EXISTS version_group_id;

DROP INDEX IF EXISTS uq_risk_monitorings_group_cycle_active;
DROP INDEX IF EXISTS idx_risk_monitorings_version_group;

ALTER TABLE risk_monitorings
    DROP COLUMN IF EXISTS version_group_id;
```

- [ ] **Step 5: Run migration tests**

Run:

```bash
cd backend/db/migrations
go test -run TestWorkingPaperPeriodRosterMigrationContainsRequiredInvariants -count=1
```

Expected: PASS.

- [ ] **Step 6: Apply and inspect the migration**

Run:

```bash
cd backend
migrate -path db/migrations -database "$DATABASE_URL" up
psql "$DATABASE_URL" -c "\d working_paper_risks"
psql "$DATABASE_URL" -c "\d risk_monitorings"
psql "$DATABASE_URL" -c "\d working_paper_risk_exclusions"
```

Expected: new columns, partial unique index, and exclusion table are present.

- [ ] **Step 7: Commit**

```bash
git add backend/db/migrations/000078_working_paper_period_roster.*
git commit -m "feat: add working paper period roster schema"
```

## Task 2: Add Roster Domain Contracts and Monitoring Group Identity

**Files:**
- Modify: `backend/internal/domain/entity/risk_monitoring.go`
- Modify: `backend/internal/domain/entity/working_paper.go`
- Modify: `backend/internal/domain/repository/working_paper.go`
- Modify: `backend/internal/repository/postgres/risk_monitoring.go`
- Test: `backend/internal/repository/postgres/risk_monitoring_test.go`

- [ ] **Step 1: Write failing monitoring persistence assertions**

Extend `risk_monitoring_test.go` so creating and fetching a monitoring verifies:

```go
if got.VersionGroupID != source.VersionGroupID {
	t.Fatalf("expected version group %s, got %s", source.VersionGroupID, got.VersionGroupID)
}
```

- [ ] **Step 2: Run the focused test**

Run:

```bash
cd backend
go test ./internal/repository/postgres -run TestRiskMonitoringRepository -count=1
```

Expected: compilation FAIL because `RiskMonitoring.VersionGroupID` does not exist.

- [ ] **Step 3: Add the domain contracts**

Add to `RiskMonitoring`:

```go
VersionGroupID uuid.UUID `json:"versionGroupId"`
```

Add to `WorkingPaperRiskLink`:

```go
VersionGroupID uuid.UUID             `json:"version_group_id,omitempty"`
SourceRiskID  uuid.UUID             `json:"source_risk_id,omitempty"`
MonitoringID  *uuid.UUID            `json:"monitoring_id,omitempty"`
ResultRiskID  *uuid.UUID            `json:"result_risk_id,omitempty"`
ResultRisk    *WorkingPaperRiskData  `json:"result_risk,omitempty"`
RosterStatus  string                `json:"roster_status,omitempty"`
```

Add these contracts:

```go
const (
	WorkingPaperRosterFinalizedResult   = "finalized_result"
	WorkingPaperRosterExistingDraft     = "existing_draft"
	WorkingPaperRosterDraftWillBeCreated = "draft_will_be_created"
)

type WorkingPaperRosterEntry struct {
	VersionGroupID      uuid.UUID       `json:"versionGroupId"`
	Code                string          `json:"code"`
	Title               string          `json:"title"`
	OrganizationID      uuid.UUID       `json:"organizationId"`
	SourceRiskID        uuid.UUID       `json:"sourceRiskId"`
	SourceVersionNumber int             `json:"sourceVersionNumber"`
	ResultRiskID        *uuid.UUID      `json:"resultRiskId,omitempty"`
	ResultVersionNumber *int            `json:"resultVersionNumber,omitempty"`
	MonitoringID        *uuid.UUID      `json:"monitoringId,omitempty"`
	MonitoringCycle     string          `json:"monitoringCycle"`
	MonitoringStatus    string          `json:"monitoringStatus"`
	RosterStatus        string          `json:"rosterStatus"`
}

type WorkingPaperRosterSummary struct {
	EligibleCount       int `json:"eligibleCount"`
	FinalizedCount      int `json:"finalizedCount"`
	ExistingDraftCount  int `json:"existingDraftCount"`
	NewDraftCount       int `json:"newDraftCount"`
}

type WorkingPaperRosterPreview struct {
	OrganizationID  uuid.UUID                 `json:"organizationId"`
	AssessmentCycle string                    `json:"assessmentCycle"`
	MonitoringCycle string                    `json:"monitoringCycle"`
	Revision        string                    `json:"revision"`
	Entries         []WorkingPaperRosterEntry `json:"entries"`
	Summary         WorkingPaperRosterSummary `json:"summary"`
}

type WorkingPaperRosterDecision struct {
	VersionGroupID uuid.UUID
	Included       bool
	ExclusionReason string
}

type WorkingPaperRiskExclusion struct {
	ID              uuid.UUID `json:"id"`
	WorkingPaperID  uuid.UUID `json:"workingPaperId"`
	VersionGroupID  uuid.UUID `json:"versionGroupId"`
	AssessmentCycle string    `json:"assessmentCycle"`
	Reason          string    `json:"reason"`
	ExcludedBy      uuid.UUID `json:"excludedBy"`
	CreatedAt       time.Time `json:"createdAt"`
}

type WorkingPaperSigningBlocker struct {
	VersionGroupID   uuid.UUID `json:"versionGroupId"`
	Code             string    `json:"code"`
	Title            string    `json:"title"`
	MonitoringStatus string    `json:"monitoringStatus"`
}
```

- [ ] **Step 4: Extend the repository interface**

Add:

```go
PreviewPeriodRoster(ctx context.Context, orgID uuid.UUID, assessmentCycle string) (*entity.WorkingPaperRosterPreview, error)
CreateWithPeriodRoster(ctx context.Context, wp *entity.WorkingPaper, revision string, decisions []entity.WorkingPaperRosterDecision) error
ListSigningBlockers(ctx context.Context, workingPaperID uuid.UUID) ([]entity.WorkingPaperSigningBlocker, error)
```

- [ ] **Step 5: Persist and scan monitoring group identity**

Set `VersionGroupID` in `NewRiskMonitoringDraft`:

```go
VersionGroupID: source.VersionGroupID,
```

Update the monitoring INSERT column and arguments to include
`version_group_id`, and update `baseRiskMonitoringSelect()` /
`scanRiskMonitoring()` so it is selected immediately after `source_risk_id`.

Extract:

```go
func insertRiskMonitoring(
	ctx context.Context,
	q riskMonitoringQueryer,
	monitoring *entity.RiskMonitoring,
) error
```

Make `Create` call `insertRiskMonitoring(ctx, r.pool, monitoring)`. This helper is
used by the atomic working paper creator in Task 4.

- [ ] **Step 6: Run focused tests**

Run:

```bash
cd backend
go test ./internal/domain/entity ./internal/repository/postgres -run 'RiskMonitoring|WorkingPaper' -count=1
```

Expected: PASS after repository stubs are updated with the three new methods.

- [ ] **Step 7: Commit**

```bash
git add backend/internal/domain/entity/risk_monitoring.go \
  backend/internal/domain/entity/working_paper.go \
  backend/internal/domain/repository/working_paper.go \
  backend/internal/repository/postgres/risk_monitoring.go \
  backend/internal/repository/postgres/risk_monitoring_test.go
git commit -m "feat: add working paper roster contracts"
```

## Task 3: Build the Deterministic Roster Preview

**Files:**
- Create: `backend/internal/repository/postgres/working_paper_roster.go`
- Create: `backend/internal/repository/postgres/working_paper_roster_test.go`
- Create: `backend/internal/usecase/workingpaper/preview_roster.go`
- Create: `backend/internal/usecase/workingpaper/preview_roster_test.go`

- [ ] **Step 1: Write repository tests for period resolution**

Add database-backed tests covering:

```go
func TestPreviewPeriodRosterUsesMonitoringSourceInsteadOfCurrentResult(t *testing.T)
func TestPreviewPeriodRosterIncludesRiskApprovedMidSemester(t *testing.T)
func TestPreviewPeriodRosterReusesExistingDraft(t *testing.T)
func TestPreviewPeriodRosterMarksMissingMonitoringForCreation(t *testing.T)
func TestPreviewPeriodRosterRejectsDuplicateActiveMonitoring(t *testing.T)
```

The first test must create `v1`, finalize a Q2 monitoring with result `v2`, then
assert:

```go
entry := preview.Entries[0]
if entry.SourceRiskID != v1.ID || entry.SourceVersionNumber != 1 {
	t.Fatalf("expected v1 as source, got %#v", entry)
}
if entry.ResultRiskID == nil || *entry.ResultRiskID != v2.ID {
	t.Fatalf("expected v2 as result, got %#v", entry.ResultRiskID)
}
if entry.RosterStatus != entity.WorkingPaperRosterFinalizedResult {
	t.Fatalf("expected finalized result, got %q", entry.RosterStatus)
}
```

- [ ] **Step 2: Run the tests and verify failure**

Run:

```bash
cd backend
go test ./internal/repository/postgres -run TestPreviewPeriodRoster -count=1
```

Expected: FAIL because `PreviewPeriodRoster` is not implemented.

- [ ] **Step 3: Implement semester boundaries and revision hashing**

In `working_paper_roster.go`, add:

```go
type rosterPeriod struct {
	SemesterStart time.Time
	SemesterEnd   time.Time
	QuarterStart  time.Time
	QuarterCycle  string
}

func resolveRosterPeriod(cycle string) (rosterPeriod, error) {
	year, half, err := parseSemester(cycle)
	if err != nil {
		return rosterPeriod{}, err
	}
	if half == 1 {
		return rosterPeriod{
			SemesterStart: time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC),
			SemesterEnd:   time.Date(year, 7, 1, 0, 0, 0, 0, time.UTC),
			QuarterStart:  time.Date(year, 4, 1, 0, 0, 0, 0, time.UTC),
			QuarterCycle:  fmt.Sprintf("%d-Q2", year),
		}, nil
	}
	return rosterPeriod{
		SemesterStart: time.Date(year, 7, 1, 0, 0, 0, 0, time.UTC),
		SemesterEnd:   time.Date(year+1, 1, 1, 0, 0, 0, 0, time.UTC),
		QuarterStart:  time.Date(year, 10, 1, 0, 0, 0, 0, time.UTC),
		QuarterCycle:  fmt.Sprintf("%d-Q4", year),
	}, nil
}
```

Build a stable revision hash from sorted entries using:

```go
fmt.Fprintf(hash, "%s|%s|%s|%s|%s\n",
	entry.VersionGroupID,
	entry.SourceRiskID,
	nullableUUID(entry.MonitoringID),
	entry.MonitoringStatus,
	entry.RosterStatus,
)
```

- [ ] **Step 4: Implement the preview query**

Use one row per `version_group_id`. The query must:

- identify approved versions whose effective interval overlaps the semester;
- prefer a non-void target-quarter monitoring source;
- otherwise choose the version effective at `QuarterStart`;
- otherwise choose the approved semester version closest to `QuarterStart`,
  preferring the latest version ending before it and then the first version approved
  after it;
- join the monitoring result version;
- order by code and version group.

Use this effective timestamp expression:

```sql
COALESCE(r.review_approved_at, r.created_at)
```

and overlap predicate:

```sql
COALESCE(r.review_approved_at, r.created_at) < $3
AND (r.archived_at IS NULL OR r.archived_at >= $2)
```

Map rows to the three roster statuses and compute summary counts and `Revision`.

- [ ] **Step 5: Add preview use case validation**

Implement:

```go
func (uc *UseCase) PreviewRoster(
	ctx context.Context,
	orgID uuid.UUID,
	assessmentCycle string,
	accessibleOrgIDs []uuid.UUID,
	isGlobal bool,
) (*entity.WorkingPaperRosterPreview, error)
```

It must validate semester format and reject `orgID` outside the caller's accessible
scope before calling `PreviewPeriodRoster`.

- [ ] **Step 6: Run repository and use case tests**

Run:

```bash
cd backend
go test ./internal/repository/postgres ./internal/usecase/workingpaper \
  -run 'PreviewPeriodRoster|PreviewRoster' -count=1
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/internal/repository/postgres/working_paper_roster.go \
  backend/internal/repository/postgres/working_paper_roster_test.go \
  backend/internal/usecase/workingpaper/preview_roster.go \
  backend/internal/usecase/workingpaper/preview_roster_test.go
git commit -m "feat: add working paper roster preview"
```

## Task 4: Create Working Papers Atomically From Roster Decisions

**Files:**
- Modify: `backend/internal/usecase/workingpaper/create.go`
- Delete: `backend/internal/usecase/workingpaper/risk_resolution.go`
- Modify: `backend/internal/usecase/workingpaper/create_test.go`
- Modify: `backend/internal/repository/postgres/working_paper_roster.go`
- Modify: `backend/internal/repository/postgres/working_paper_roster_test.go`
- Modify: `backend/internal/repository/postgres/working_paper.go`

- [ ] **Step 1: Replace old create tests with roster decision tests**

Add:

```go
func TestCreateRejectsExcludedRiskWithoutReason(t *testing.T)
func TestCreateRejectsEmptyIncludedRoster(t *testing.T)
func TestCreateDelegatesRevisionAndDecisions(t *testing.T)
func TestCreateWithPeriodRosterReusesFinalizedAndDraftMonitoring(t *testing.T)
func TestCreateWithPeriodRosterCreatesOnlyMissingDrafts(t *testing.T)
func TestCreateWithPeriodRosterPersistsExclusionsOutsideDocumentRows(t *testing.T)
func TestCreateWithPeriodRosterRejectsStaleRevision(t *testing.T)
func TestCreateWithPeriodRosterRollsBackOnMonitoringInsertFailure(t *testing.T)
```

- [ ] **Step 2: Run focused tests**

Run:

```bash
cd backend
go test ./internal/usecase/workingpaper ./internal/repository/postgres \
  -run 'Create.*Roster|CreateRejectsExcluded|CreatesOnlyMissing|RollsBack' -count=1
```

Expected: FAIL against the old `RiskInput` / `SourceMode` contract.

- [ ] **Step 3: Replace the create input**

Use:

```go
type CreateWorkingPaperInput struct {
	AssessmentCycle  string
	OrganizationID   uuid.UUID
	RosterRevision   string
	AccessibleOrgIDs []uuid.UUID
	IsGlobal         bool
	CreatedByUserID  uuid.UUID
	Decisions        []entity.WorkingPaperRosterDecision
	Signatories      []CreateSignatoryInput
}
```

Validation rules:

```go
if len(input.Decisions) == 0 {
	return nil, invalidInput("roster decisions are required")
}
included := 0
for _, decision := range input.Decisions {
	if decision.Included {
		included++
		continue
	}
	if strings.TrimSpace(decision.ExclusionReason) == "" {
		return nil, invalidInput("exclusion reason is required")
	}
}
if included == 0 {
	return nil, invalidInput("at least one roster risk must be included")
}
```

Construct the working paper and call:

```go
err := uc.wpRepo.CreateWithPeriodRoster(
	ctx,
	&wp,
	input.RosterRevision,
	input.Decisions,
)
```

- [ ] **Step 4: Implement atomic repository creation**

Inside one pgx transaction:

1. Lock the organization row.
2. Reject an existing working paper for organization and semester.
3. Recompute roster preview using the transaction.
4. Compare its revision with the client revision.
5. Validate every decision matches exactly one preview entry.
6. Insert the working paper and assign sequence.
7. For included entries:
   - reuse finalized/draft monitoring IDs;
   - create `entity.NewRiskMonitoringDraft(sourceRisk, targetQuarter, userID)` only for `draft_will_be_created`;
   - insert `working_paper_risks` with group/source/monitoring/result references.
8. For excluded entries, insert `working_paper_risk_exclusions`.
9. Insert signatories.
10. Commit.

Return `AppError{Code: "ROSTER_STALE"}` when revision or entry state changed.

Use the transaction-aware `insertRiskMonitoring` helper from Task 2.

- [ ] **Step 5: Update working paper reads**

Change `getWorkingPaperRisks` to prefer:

```sql
JOIN risks source_risk
  ON source_risk.id = COALESCE(wpr.source_risk_id, wpr.risk_id)
LEFT JOIN risk_monitorings monitoring
  ON monitoring.id = wpr.monitoring_id
LEFT JOIN risks result_risk
  ON result_risk.id = COALESCE(wpr.result_risk_id, monitoring.result_risk_id)
```

Legacy rows with null roster columns continue using the existing lateral monitoring
lookup. New rows must use their explicit `monitoring_id` and never re-resolve current
risk versions.

- [ ] **Step 6: Delete source-mode resolution**

Delete `risk_resolution.go`, remove `RiskInput`, `latest_approved`, and
`review_periodic` from the new create path. Keep `SourceMode` readable on legacy
entities and database rows only.

- [ ] **Step 7: Run tests**

Run:

```bash
cd backend
go test ./internal/usecase/workingpaper ./internal/repository/postgres -count=1
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/internal/usecase/workingpaper/create.go \
  backend/internal/usecase/workingpaper/create_test.go \
  backend/internal/usecase/workingpaper/risk_resolution.go \
  backend/internal/repository/postgres/working_paper.go \
  backend/internal/repository/postgres/working_paper_roster.go \
  backend/internal/repository/postgres/working_paper_roster_test.go
git commit -m "feat: create working papers from period rosters"
```

## Task 5: Expose Preview and Revised Create HTTP Contracts

**Files:**
- Modify: `backend/internal/handler/http/working_paper.go`
- Modify: `backend/internal/handler/http/working_paper_test.go`
- Modify: `backend/cmd/server/main.go`
- Modify: `backend/internal/bootstrap/bootstrap.go`

- [ ] **Step 1: Write failing HTTP tests**

Add:

```go
func TestWorkingPaperRosterPreviewPassesOrganizationAndScope(t *testing.T)
func TestWorkingPaperCreateMapsRosterDecisions(t *testing.T)
func TestWorkingPaperCreateReturnsConflictForStaleRoster(t *testing.T)
```

The create JSON fixture is:

```json
{
  "organization_id": "00000000-0000-0000-0000-000000000001",
  "assessment_cycle": "2026-H1",
  "roster_revision": "abc123",
  "roster_decisions": [
    {
      "version_group_id": "00000000-0000-0000-0000-000000000011",
      "included": true
    },
    {
      "version_group_id": "00000000-0000-0000-0000-000000000012",
      "included": false,
      "exclusion_reason": "Risiko ditutup sebelum monitoring Q2"
    }
  ],
  "signatories": []
}
```

- [ ] **Step 2: Run handler tests**

Run:

```bash
cd backend
go test ./internal/handler/http -run 'WorkingPaperRoster|WorkingPaperCreate' -count=1
```

Expected: FAIL because the preview handler and request fields do not exist.

- [ ] **Step 3: Add the preview handler**

Implement `PreviewRoster` parsing:

```go
orgID, err := uuid.Parse(strings.TrimSpace(c.Query("organization_id")))
cycle := strings.TrimSpace(c.Query("assessment_cycle"))
```

Use `middleware.GetAccessScope(c)` and call `h.uc.PreviewRoster(...)`.

Return:

```go
return c.JSON(fiber.Map{"data": preview})
```

- [ ] **Step 4: Replace the create request contract**

Define:

```go
type createWorkingPaperRequest struct {
	OrganizationID  uuid.UUID                      `json:"organization_id"`
	AssessmentCycle string                         `json:"assessment_cycle"`
	RosterRevision  string                         `json:"roster_revision"`
	RosterDecisions []workingPaperRosterDecision   `json:"roster_decisions"`
	Signatories     []createSignatoryRequest       `json:"signatories"`
}

type workingPaperRosterDecision struct {
	VersionGroupID  uuid.UUID `json:"version_group_id"`
	Included        bool      `json:"included"`
	ExclusionReason string    `json:"exclusion_reason"`
}
```

Map these to `entity.WorkingPaperRosterDecision`.

- [ ] **Step 5: Map structured conflicts**

Update `handleWPError`:

```go
switch appErr.Code {
case "INVALID_STATUS", "ROSTER_STALE", "MONITORING_CONFLICT", "SEMESTER_CONFLICT":
	return sendProblemDetails(c, fiber.StatusConflict, "Conflict",
		"https://api.manris.com/errors/conflict", appErr.Message)
}
```

When signing blockers are added in Task 7, preserve their structured payload.

- [ ] **Step 6: Register the route**

Register before `/:id`:

```go
protected.Get("/working-papers/roster-preview", wpHandler.PreviewRoster)
```

Update bootstrap constructor arguments after removing obsolete create dependencies.

- [ ] **Step 7: Run handler and server package tests**

Run:

```bash
cd backend
go test ./internal/handler/http ./internal/bootstrap ./cmd/server -count=1
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/internal/handler/http/working_paper.go \
  backend/internal/handler/http/working_paper_test.go \
  backend/cmd/server/main.go \
  backend/internal/bootstrap/bootstrap.go
git commit -m "feat: expose working paper roster API"
```

## Task 6: Replace Source Modes With Roster Decisions in the Create Page

**Files:**
- Modify: `frontend/src/types/working-paper.ts`
- Modify: `frontend/src/lib/api/working-papers.ts`
- Create: `frontend/src/lib/working-paper-roster.ts`
- Create: `frontend/src/lib/working-paper-roster.test.ts`
- Modify: `frontend/src/lib/api/working-paper-create-error.ts`
- Modify: `frontend/src/app/(app)/risk/working-papers/new/page.tsx`

- [ ] **Step 1: Write pure helper tests**

Create tests:

```ts
test("buildInitialRosterDecisions includes every preview entry", () => {
  assert.deepEqual(buildInitialRosterDecisions(preview), [
    { versionGroupId: "group-1", included: true, exclusionReason: "" },
    { versionGroupId: "group-2", included: true, exclusionReason: "" },
  ]);
});

test("summarizeRosterDecisions counts new drafts and exclusions", () => {
  assert.deepEqual(summarizeRosterDecisions(preview, decisions), {
    eligibleCount: 3,
    includedCount: 2,
    excludedCount: 1,
    finalizedCount: 1,
    existingDraftCount: 0,
    newDraftCount: 1,
  });
});

test("validateRosterDecisions requires exclusion reasons", () => {
  assert.deepEqual(validateRosterDecisions(decisions), {
    "group-2": "Alasan pengecualian wajib diisi.",
  });
});
```

- [ ] **Step 2: Run the focused test**

Run:

```bash
cd frontend
node --test --experimental-specifier-resolution=node src/lib/working-paper-roster.test.ts
```

Expected: FAIL because helper module does not exist.

- [ ] **Step 3: Add frontend contracts**

Add:

```ts
export type WorkingPaperRosterStatus =
  | "finalized_result"
  | "existing_draft"
  | "draft_will_be_created";

export interface WorkingPaperRosterEntry {
  versionGroupId: string;
  code: string;
  title: string;
  organizationId: string;
  sourceRiskId: string;
  sourceVersionNumber: number;
  resultRiskId?: string;
  resultVersionNumber?: number;
  monitoringId?: string;
  monitoringCycle: string;
  monitoringStatus: string;
  rosterStatus: WorkingPaperRosterStatus;
}

export interface WorkingPaperRosterPreview {
  organizationId: string;
  assessmentCycle: string;
  monitoringCycle: string;
  revision: string;
  entries: WorkingPaperRosterEntry[];
  summary: {
    eligibleCount: number;
    finalizedCount: number;
    existingDraftCount: number;
    newDraftCount: number;
  };
}

export interface WorkingPaperRosterDecisionInput {
  version_group_id: string;
  included: boolean;
  exclusion_reason?: string;
}
```

Replace `CreateWorkingPaperRequest.risks` with:

```ts
organization_id: string;
assessment_cycle: string;
roster_revision: string;
roster_decisions: WorkingPaperRosterDecisionInput[];
```

- [ ] **Step 4: Add preview API**

Implement:

```ts
export async function previewWorkingPaperRoster(
  organizationId: string,
  assessmentCycle: string,
  token: string,
): Promise<WorkingPaperRosterPreview> {
  const params = new URLSearchParams({
    organization_id: organizationId,
    assessment_cycle: assessmentCycle,
  });
  return api.get(`/working-papers/roster-preview?${params}`, token);
}
```

- [ ] **Step 5: Implement pure helpers**

Create helpers:

```ts
export function buildInitialRosterDecisions(preview: WorkingPaperRosterPreview) {
  return preview.entries.map((entry) => ({
    versionGroupId: entry.versionGroupId,
    included: true,
    exclusionReason: "",
  }));
}

export function validateRosterDecisions(decisions: RosterDecision[]) {
  return Object.fromEntries(
    decisions
      .filter((item) => !item.included && !item.exclusionReason.trim())
      .map((item) => [item.versionGroupId, "Alasan pengecualian wajib diisi."]),
  );
}
```

`summarizeRosterDecisions` must count status only for included entries.

- [ ] **Step 6: Rewrite create-page loading**

For non-global users:

```ts
const selectedOrganizationId = user?.organizationId ?? "";
```

For global users, load `listAllOrganizations(token)` and require an organization
selection before preview.

Reload preview whenever organization or semester changes. Replace the current
`api.get<RiskOption[]>("/risks")` call and remove `source_mode` from the form schema.

- [ ] **Step 7: Rewrite the roster table interaction**

The existing single-card table remains, but:

- every row starts included;
- checkbox off opens/shows an exclusion-reason input;
- source version displays `v{sourceVersionNumber}`;
- period displays `monitoringCycle`;
- status badges map to:
  - `Hasil monitoring tersedia`;
  - `Draft monitoring tersedia`;
  - `Draft monitoring akan dibuat`;
- the `Sumber Data` select is removed;
- an optional result badge displays `Hasil: v{resultVersionNumber}`.

- [ ] **Step 8: Add confirmation dialog**

On submit:

1. validate exclusions;
2. compute summary;
3. open `AlertDialog`;
4. display:

```text
{newDraftCount} dari {includedCount} risiko akan dibuatkan draft monitoring
{preview.monitoringCycle}.
```

Also list included, excluded, finalized, and existing-draft counts. Only the dialog
confirmation calls `createWorkingPaper`.

- [ ] **Step 9: Add conflict messages**

Map stale roster and duplicate monitoring messages:

```ts
if (/ROSTER_STALE|roster.*berubah|refresh/i.test(message)) {
  return "Daftar risiko atau status monitoring berubah. Muat ulang roster sebelum membuat kertas kerja.";
}
if (/MONITORING_CONFLICT|lebih dari satu.*monitoring/i.test(message)) {
  return "Terdapat konflik transaksi monitoring pada periode ini. Hubungi administrator.";
}
```

- [ ] **Step 10: Run frontend tests and lint**

Run:

```bash
cd frontend
node --test --experimental-specifier-resolution=node src/lib/working-paper-roster.test.ts
npx eslint 'src/app/(app)/risk/working-papers/new/page.tsx' \
  src/lib/working-paper-roster.ts \
  src/lib/working-paper-roster.test.ts \
  src/lib/api/working-papers.ts \
  src/types/working-paper.ts
```

Expected: PASS with no lint warnings.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/types/working-paper.ts \
  frontend/src/lib/api/working-papers.ts \
  frontend/src/lib/api/working-paper-create-error.ts \
  frontend/src/lib/working-paper-roster.ts \
  frontend/src/lib/working-paper-roster.test.ts \
  'frontend/src/app/(app)/risk/working-papers/new/page.tsx'
git commit -m "feat: create working papers from roster preview"
```

## Task 7: Enforce Monitoring Completion and Show Source/Result Versions

**Files:**
- Modify: `backend/internal/repository/postgres/working_paper_roster.go`
- Modify: `backend/internal/usecase/workingpaper/sign.go`
- Modify: `backend/internal/usecase/workingpaper/skip_tte.go`
- Modify: `backend/internal/usecase/workingpaper/sign_test.go`
- Modify: `backend/internal/usecase/workingpaper/skip_tte_test.go`
- Modify: `backend/internal/domain/errors/errors.go`
- Modify: `backend/internal/handler/http/working_paper.go`
- Modify: `frontend/src/types/working-paper.ts`
- Modify: `frontend/src/lib/working-paper-monitoring-table.ts`
- Modify: `frontend/src/lib/working-paper-monitoring-table.test.ts`
- Modify: `frontend/src/app/(app)/risk/working-papers/[id]/working-paper-monitoring-table.tsx`
- Modify: `frontend/src/app/(app)/risk/working-papers/[id]/page.tsx`

- [ ] **Step 1: Write signing blocker tests**

Add:

```go
func TestSignBlocksFirstSignatureWhenMonitoringDraftRemains(t *testing.T)
func TestSignAllowsFirstSignatureWhenAllMonitoringFinalized(t *testing.T)
func TestSignDoesNotRecheckAfterSigningHasStarted(t *testing.T)
func TestSkipTTEBlocksCompletionWhenMonitoringDraftRemains(t *testing.T)
func TestSkipTTEAllowsCompletionWhenAllMonitoringFinalized(t *testing.T)
```

The error must be:

```go
&domainerrors.AppError{
	Code: "MONITORING_INCOMPLETE",
	Message: "monitoring must be finalized before signing",
	Details: blockers,
}
```

If `AppError` does not yet support `Details`, add `Details any` and include it in
problem-details responses without changing existing error payload fields.

- [ ] **Step 2: Run signing tests**

Run:

```bash
cd backend
go test ./internal/usecase/workingpaper -run TestSign -count=1
```

Expected: FAIL because signing currently checks risk approval rather than explicit
monitoring status.

- [ ] **Step 3: Implement signing blockers**

Query roster rows:

```sql
SELECT wpr.version_group_id, source.code, source.title,
       COALESCE(rm.status, 'missing')
FROM working_paper_risks wpr
JOIN risks source ON source.id = COALESCE(wpr.source_risk_id, wpr.risk_id)
LEFT JOIN risk_monitorings rm ON rm.id = wpr.monitoring_id
WHERE wpr.working_paper_id = $1
  AND wpr.version_group_id IS NOT NULL
  AND (rm.id IS NULL OR rm.status <> 'finalized')
ORDER BY wpr.sort_order;
```

Before the first signature, call `ListSigningBlockers`. Apply the same check before
`SkipTTE` changes a draft directly to completed. If blockers are non-empty, return
`MONITORING_INCOMPLETE`. Existing legacy working papers with null
`version_group_id` retain their old approved-risk check.

Add `Details any` to `AppError`:

```go
type AppError struct {
	Code    string
	Message string
	Details any
	Err     error
}
```

For `MONITORING_INCOMPLETE`, `handleWPError` must return:

```go
return c.Status(fiber.StatusConflict).JSON(fiber.Map{
	"type":    "https://api.manris.com/errors/monitoring-incomplete",
	"title":   "Monitoring Incomplete",
	"status":  fiber.StatusConflict,
	"detail":  appErr.Message,
	"code":    appErr.Code,
	"details": appErr.Details,
})
```

- [ ] **Step 4: Add result-version frontend fields**

Extend `WorkingPaperRiskLink` with:

```ts
version_group_id?: string;
source_risk_id?: string;
monitoring_id?: string;
result_risk_id?: string;
result_risk?: WorkingPaperRiskData;
roster_status?: WorkingPaperRosterStatus;
```

Extend the row mapper with:

```ts
sourceVersionNumber?: number;
resultVersionNumber?: number;
```

Change its input from `WorkingPaperRiskData` to `WorkingPaperRiskLink` so source and
result remain distinct.

- [ ] **Step 5: Test source/result presentation**

Add a frontend test for:

```text
source risk v1 + finalized Q2 monitoring + result risk v2
```

Assert:

```ts
assert.equal(row.sourceVersionNumber, 1);
assert.equal(row.resultVersionNumber, 2);
assert.equal(row.sourceScore, 16);
assert.equal(row.observedScore, 12);
```

- [ ] **Step 6: Update detail table**

In the code cell display:

```tsx
<Badge variant="outline">Sumber v{row.sourceVersionNumber}</Badge>
{row.resultVersionNumber ? (
  <Badge variant="outline">Hasil v{row.resultVersionNumber}</Badge>
) : null}
```

Draft rows keep `Lanjutkan monitoring`; finalized rows keep `Lihat monitoring`.
Remove the `Belum Dimonitor` state for new roster rows. If an explicit roster link
has no monitoring, display `Data tidak konsisten`.

- [ ] **Step 7: Show signing blockers**

When signing returns `MONITORING_INCOMPLETE`, render/toast a concise list:

```text
Monitoring belum final: R-001 (Draft), R-003 (Missing)
```

Do not collapse this into the generic “gagal menandatangani” message.

- [ ] **Step 8: Run backend and frontend tests**

Run:

```bash
cd backend
go test ./internal/usecase/workingpaper ./internal/repository/postgres ./internal/handler/http -count=1

cd ../frontend
node --test --experimental-specifier-resolution=node src/lib/working-paper-monitoring-table.test.ts
npx eslint \
  'src/app/(app)/risk/working-papers/[id]/working-paper-monitoring-table.tsx' \
  'src/app/(app)/risk/working-papers/[id]/page.tsx' \
  src/lib/working-paper-monitoring-table.ts \
  src/lib/working-paper-monitoring-table.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/internal/repository/postgres/working_paper_roster.go \
  backend/internal/domain/errors/errors.go \
  backend/internal/usecase/workingpaper/sign.go \
  backend/internal/usecase/workingpaper/skip_tte.go \
  backend/internal/usecase/workingpaper/sign_test.go \
  backend/internal/usecase/workingpaper/skip_tte_test.go \
  backend/internal/handler/http/working_paper.go \
  frontend/src/types/working-paper.ts \
  frontend/src/lib/working-paper-monitoring-table.ts \
  frontend/src/lib/working-paper-monitoring-table.test.ts \
  'frontend/src/app/(app)/risk/working-papers/[id]/working-paper-monitoring-table.tsx' \
  'frontend/src/app/(app)/risk/working-papers/[id]/page.tsx'
git commit -m "feat: gate working paper signing on monitoring"
```

## Task 8: Verify Compatibility and the End-to-End Workflow

**Files:**
- Modify as needed based on verification failures only.

- [ ] **Step 1: Run all backend tests**

Run:

```bash
cd backend
go test ./...
```

Expected: PASS.

- [ ] **Step 2: Run focused frontend tests**

Run:

```bash
cd frontend
node --test --experimental-specifier-resolution=node \
  src/lib/working-paper-roster.test.ts \
  src/lib/working-paper-monitoring-table.test.ts \
  src/lib/working-paper-detail-view-model.test.ts \
  src/lib/working-paper-export.test.ts
```

Expected: PASS. If unrelated legacy test imports fail, run each listed file
individually and record the unrelated failures rather than changing unrelated modules.

- [ ] **Step 3: Run frontend lint and production build**

Run:

```bash
cd frontend
npx eslint \
  'src/app/(app)/risk/working-papers/new/page.tsx' \
  'src/app/(app)/risk/working-papers/[id]/page.tsx' \
  'src/app/(app)/risk/working-papers/[id]/working-paper-monitoring-table.tsx' \
  src/lib/working-paper-roster.ts \
  src/lib/working-paper-monitoring-table.ts \
  src/lib/api/working-papers.ts \
  src/types/working-paper.ts
npm run build
```

Expected: lint PASS and build PASS. A Google Fonts network failure is an environment
failure only if TypeScript compilation completed before font fetching failed.

- [ ] **Step 4: Verify migration rollback in a disposable database**

Run:

```bash
cd backend
migrate -path db/migrations -database "$TEST_DATABASE_URL" up
migrate -path db/migrations -database "$TEST_DATABASE_URL" down 1
migrate -path db/migrations -database "$TEST_DATABASE_URL" up 1
```

Expected: all commands succeed.

- [ ] **Step 5: Verify the browser workflow**

Using the local app:

1. Open `/risk/working-papers/new?cycle=2026-H1`.
2. Select an organization if the user is global.
3. Confirm all eligible risks are included by default.
4. Confirm finalized, existing draft, and new draft badges.
5. Exclude one risk and verify the reason is required.
6. Submit and confirm the dialog reports new Q2 draft count.
7. Open the created working paper.
8. Verify source `v1` and result `v2` remain distinct.
9. Attempt signing while a draft remains and verify it is blocked.
10. Finalize all included monitoring and verify signing succeeds.

- [ ] **Step 6: Inspect persisted references**

Run:

```bash
psql "$DATABASE_URL" -c "
SELECT wp.code, wpr.version_group_id, wpr.source_risk_id,
       wpr.monitoring_id, wpr.result_risk_id
FROM working_papers wp
JOIN working_paper_risks wpr ON wpr.working_paper_id = wp.id
ORDER BY wp.created_at DESC, wpr.sort_order
LIMIT 20;"
```

Expected: new rows contain explicit group/source/monitoring references.

- [ ] **Step 7: Commit verification fixes**

If verification required scoped fixes, stage only feature files changed during
verification:

```bash
git status --short
git add backend/internal/domain/entity/risk_monitoring.go \
  backend/internal/domain/entity/working_paper.go \
  backend/internal/domain/errors/errors.go \
  backend/internal/domain/repository/working_paper.go \
  backend/internal/repository/postgres/risk_monitoring.go \
  backend/internal/repository/postgres/working_paper.go \
  backend/internal/repository/postgres/working_paper_roster.go \
  backend/internal/usecase/workingpaper \
  backend/internal/handler/http/working_paper.go \
  frontend/src/types/working-paper.ts \
  frontend/src/lib/working-paper-roster.ts \
  frontend/src/lib/working-paper-monitoring-table.ts \
  frontend/src/lib/api/working-papers.ts \
  'frontend/src/app/(app)/risk/working-papers/new/page.tsx' \
  'frontend/src/app/(app)/risk/working-papers/[id]/page.tsx' \
  'frontend/src/app/(app)/risk/working-papers/[id]/working-paper-monitoring-table.tsx'
git commit -m "fix: harden working paper period roster"
```

If no fixes were required, do not create an empty commit.

## Completion Criteria

- New working papers no longer accept per-risk source modes.
- Roster preview contains one entry per eligible `version_group_id`.
- A monitoring source version is never replaced by its newer result version.
- Existing finalized and draft monitoring transactions are reused.
- Missing monitoring drafts are created visibly and atomically.
- Exclusions require reasons and remain audit-only.
- Database constraints prevent duplicate active monitoring per group and quarter.
- New working paper rows store explicit source, monitoring, and optional result IDs.
- Signing is blocked until all included monitorings are finalized.
- Legacy working papers remain readable without dynamic version drift.
