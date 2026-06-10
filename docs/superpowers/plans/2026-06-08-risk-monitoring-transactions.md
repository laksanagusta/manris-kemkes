# Risk Monitoring Transactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build semester-based `Transaksi Pemantauan` for the existing Pemantauan workflow, with draft data stored in `risk_monitorings` and a new active `risks` version created only at finalization.

**Architecture:** Add `risk_monitorings` as a transaction layer around the existing versioned `risks` model. Manual and bulk Pemantauan create/update monitoring transactions; finalization creates and activates a result risk version in one backend transaction. Frontend keeps the existing monitoring form UI by routing transactions through `/risk/monitoring/[id]`.

**Tech Stack:** Go 1.25, Fiber, pgx/PostgreSQL, Next.js 16 App Router, React 19, TypeScript, existing shadcn/Tailwind components.

---

## Scope

This plan implements only the existing Pemantauan workflow:

- Manual Pemantauan from the risk register Pemantauan tab.
- Bulk Pemantauan mode.
- Existing monitoring form reused under `/risk/monitoring/[id]`.

This plan does not change:

- New risk registration.
- Bulk import for new risks.
- Existing direct risk creation endpoints.

## File Structure

- Create `backend/db/migrations/000072_risk_monitorings.up.sql`: add `risk_monitorings`, constraints, indexes.
- Create `backend/db/migrations/000072_risk_monitorings.down.sql`: drop `risk_monitorings`.
- Create `backend/db/migrations/risk_monitorings_test.go`: migration contract tests.
- Create `backend/internal/domain/entity/risk_monitoring.go`: domain entity, statuses, modes, request/update/finalization structs.
- Create `backend/internal/domain/entity/risk_monitoring_test.go`: level snapshot, mode detection, validation tests.
- Create `backend/internal/domain/repository/risk_monitoring.go`: repository interface for monitoring transactions.
- Create `backend/internal/repository/postgres/risk_monitoring.go`: PostgreSQL implementation, including transactional finalization.
- Create `backend/internal/repository/postgres/risk_monitoring_test.go`: repository behavior tests using pgx test DB patterns.
- Keep `backend/internal/domain/repository/risk.go` unchanged; risk version creation for monitoring finalization is owned by `RiskMonitoringRepository.Finalize`.
- Create `backend/internal/usecase/riskmonitoring/start.go`: start/return draft transaction.
- Create `backend/internal/usecase/riskmonitoring/get.go`: read transaction detail with source/result risk for the frontend form.
- Create `backend/internal/usecase/riskmonitoring/update.go`: save draft fields and detect mode.
- Create `backend/internal/usecase/riskmonitoring/finalize.go`: finalize transaction and create active risk version.
- Create `backend/internal/usecase/riskmonitoring/bulk.go`: bulk submit creates transactions instead of draft risks.
- Create `backend/internal/usecase/riskmonitoring/*_test.go`: usecase tests.
- Modify `backend/internal/bootstrap/bootstrap.go`: wire risk monitoring repository/usecases.
- Create `backend/internal/handler/http/risk_monitoring.go`: HTTP handlers for start/get/update/finalize/bulk monitoring.
- Modify route registration file where risk routes are mounted: add `/risk-monitorings` endpoints.
- Modify `backend/internal/handler/http/risk.go`: stop using old reassessment creation for bulk monitoring; delegate to risk monitoring usecase.
- Modify `backend/internal/repository/postgres/risk.go`: make `ListRegister(view=monitoring-transactions)` read from `risk_monitorings`.
- Modify `frontend/src/types/risk.ts`: add `RiskMonitoring`, statuses, modes, payload types.
- Create `frontend/src/lib/api/risk-monitoring-transaction.ts`: API client for transaction start/get/update/finalize/bulk.
- Modify `frontend/src/lib/api/risk-register.ts`: add transaction fields for monitoring tab rows.
- Modify `frontend/src/lib/risk-register-monitoring.ts`: route monitoring actions to `/risk/monitoring/[id]`.
- Create `frontend/src/app/(app)/risk/monitoring/[id]/page.tsx`: route wrapper that reuses monitoring form UI.
- Refactor `frontend/src/app/(app)/risk/assessment/[id]/page.tsx` to accept a `mode` prop and reuse the same component from `/risk/monitoring/[id]`; do not redesign the form.
- Modify `frontend/src/app/(app)/risk/register/page.tsx`: `Mulai Pemantauan` calls transaction start endpoint.
- Modify `frontend/src/app/(app)/risk/components/monitoring-transactions-table.tsx`: show transaction statuses/action labels.
- Add focused frontend tests beside touched libs where existing test patterns exist.

## Assumption From Last Grilling Step

`with_profile_revision` requires `changeReason`. The UI may prefill it from monitoring conclusion, but finalization blocks if it is empty.

---

### Task 1: Database Contract

**Files:**
- Create: `backend/db/migrations/000072_risk_monitorings.up.sql`
- Create: `backend/db/migrations/000072_risk_monitorings.down.sql`
- Create: `backend/db/migrations/risk_monitorings_test.go`

- [ ] **Step 1: Write the failing migration test**

Create `backend/db/migrations/risk_monitorings_test.go`:

```go
package migrations

import (
	"context"
	"testing"
)

func TestRiskMonitoringsMigrationCreatesTableAndConstraints(t *testing.T) {
	db := openMigrationTestDB(t)
	ctx := context.Background()
	runMigrationsUpTo(t, db, 72)

	var exists bool
	err := db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema = 'public'
			  AND table_name = 'risk_monitorings'
		)
	`).Scan(&exists)
	if err != nil {
		t.Fatalf("check table exists: %v", err)
	}
	if !exists {
		t.Fatal("expected risk_monitorings table to exist")
	}

	_, err = db.Exec(ctx, `
		INSERT INTO risk_monitorings (
			source_risk_id, assessment_cycle, status, mode,
			source_probability, source_impact, source_weight, source_nilai, source_level, source_version_number,
			observed_probability, observed_impact, observed_weight, observed_nilai, observed_level
		)
		VALUES (
			gen_random_uuid(), '2026-Q1', 'draft', 'score_only',
			1, 1, 1, 1, 'sangat_rendah', 1,
			1, 1, 1, 1, 'sangat_rendah'
		)
	`)
	if err == nil {
		t.Fatal("expected invalid assessment_cycle to fail")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend
go test ./db/migrations -run TestRiskMonitoringsMigrationCreatesTableAndConstraints -count=1
```

Expected: FAIL because `risk_monitorings` migration/table does not exist yet.

- [ ] **Step 3: Add migration up file**

Create `backend/db/migrations/000072_risk_monitorings.up.sql`:

```sql
CREATE TABLE IF NOT EXISTS risk_monitorings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE RESTRICT,
    result_risk_id UUID REFERENCES risks(id) ON DELETE SET NULL,
    assessment_cycle TEXT NOT NULL CHECK (assessment_cycle ~ '^[0-9]{4}-H[12]$'),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'void')),
    mode TEXT NOT NULL DEFAULT 'score_only' CHECK (mode IN ('score_only', 'with_profile_revision')),

    source_probability INTEGER NOT NULL CHECK (source_probability BETWEEN 1 AND 5),
    source_impact INTEGER NOT NULL CHECK (source_impact BETWEEN 1 AND 5),
    source_weight NUMERIC(10,4) NOT NULL DEFAULT 1,
    source_nilai NUMERIC(10,4) NOT NULL DEFAULT 0,
    source_level TEXT NOT NULL DEFAULT '',
    source_version_number INTEGER NOT NULL DEFAULT 1,

    observed_probability INTEGER CHECK (observed_probability BETWEEN 1 AND 5),
    observed_impact INTEGER CHECK (observed_impact BETWEEN 1 AND 5),
    observed_weight NUMERIC(10,4),
    observed_nilai NUMERIC(10,4),
    observed_level TEXT NOT NULL DEFAULT '',

    condition_summary TEXT NOT NULL DEFAULT '',
    event_summary TEXT NOT NULL DEFAULT '',
    trend TEXT NOT NULL DEFAULT 'stable' CHECK (trend IN ('up', 'down', 'stable')),
    effectiveness_conclusion TEXT NOT NULL DEFAULT '',
    follow_up_note TEXT NOT NULL DEFAULT '',
    conclusion TEXT NOT NULL DEFAULT '',

    mitigation_progress_summary TEXT NOT NULL DEFAULT '',
    mitigation_completion_percent INTEGER NOT NULL DEFAULT 0 CHECK (mitigation_completion_percent BETWEEN 0 AND 100),
    mitigation_obstacles TEXT NOT NULL DEFAULT '',
    mitigation_follow_up TEXT NOT NULL DEFAULT '',

    draft_title TEXT NOT NULL DEFAULT '',
    draft_category TEXT NOT NULL DEFAULT '',
    draft_cause TEXT[] NOT NULL DEFAULT '{}',
    draft_risk_source TEXT NOT NULL DEFAULT '',
    draft_controllability TEXT NOT NULL DEFAULT '',
    draft_impact_description TEXT[] NOT NULL DEFAULT '{}',
    draft_existing_control TEXT NOT NULL DEFAULT '',
    draft_treatment_option TEXT NOT NULL DEFAULT '',
    draft_mitigations JSONB NOT NULL DEFAULT '[]'::jsonb,
    profile_change_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
    change_reason TEXT NOT NULL DEFAULT '',

    started_by UUID REFERENCES users(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finalized_by UUID REFERENCES users(id),
    finalized_at TIMESTAMPTZ,
    voided_by UUID REFERENCES users(id),
    voided_at TIMESTAMPTZ,
    void_reason TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_monitorings_active_draft
    ON risk_monitorings(source_risk_id, assessment_cycle)
    WHERE status = 'draft';

CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_monitorings_finalized_source_cycle
    ON risk_monitorings(source_risk_id, assessment_cycle)
    WHERE status = 'finalized';

CREATE INDEX IF NOT EXISTS idx_risk_monitorings_source
    ON risk_monitorings(source_risk_id);

CREATE INDEX IF NOT EXISTS idx_risk_monitorings_result
    ON risk_monitorings(result_risk_id);

CREATE INDEX IF NOT EXISTS idx_risk_monitorings_cycle_status
    ON risk_monitorings(assessment_cycle, status);
```

- [ ] **Step 4: Add migration down file**

Create `backend/db/migrations/000072_risk_monitorings.down.sql`:

```sql
DROP INDEX IF EXISTS idx_risk_monitorings_cycle_status;
DROP INDEX IF EXISTS idx_risk_monitorings_result;
DROP INDEX IF EXISTS idx_risk_monitorings_source;
DROP INDEX IF EXISTS idx_risk_monitorings_finalized_source_cycle;
DROP INDEX IF EXISTS idx_risk_monitorings_active_draft;
DROP TABLE IF EXISTS risk_monitorings;
```

- [ ] **Step 5: Run migration tests**

Run:

```bash
cd backend
go test ./db/migrations -run RiskMonitorings -count=1
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/db/migrations/000072_risk_monitorings.up.sql backend/db/migrations/000072_risk_monitorings.down.sql backend/db/migrations/risk_monitorings_test.go
git commit -m "feat: add risk monitoring transaction schema"
```

---

### Task 2: Domain Entity And Repository Interface

**Files:**
- Create: `backend/internal/domain/entity/risk_monitoring.go`
- Create: `backend/internal/domain/entity/risk_monitoring_test.go`
- Create: `backend/internal/domain/repository/risk_monitoring.go`

- [ ] **Step 1: Write failing entity tests**

Create `backend/internal/domain/entity/risk_monitoring_test.go`:

```go
package entity

import "testing"

func TestRiskMonitoringDetectModeScoreOnly(t *testing.T) {
	source := &Risk{Title: "A", Category: RiskCategoryOperasional, Probability: 3, Impact: 3, Weight: GetBobot(3, 3), Nilai: CalculateNilai(3, 3, GetBobot(3, 3))}
	draft := &RiskMonitoringDraftValues{Title: "A", Category: RiskCategoryOperasional, Probability: 4, Impact: 3}

	mode, changed := DetectRiskMonitoringMode(source, draft)
	if mode != RiskMonitoringModeScoreOnly {
		t.Fatalf("expected score_only, got %s", mode)
	}
	if len(changed) != 0 {
		t.Fatalf("expected no substance changes, got %v", changed)
	}
}

func TestRiskMonitoringDetectModeWithProfileRevision(t *testing.T) {
	source := &Risk{Title: "A", Category: RiskCategoryOperasional, RiskSource: "internal"}
	draft := &RiskMonitoringDraftValues{Title: "B", Category: RiskCategoryOperasional, RiskSource: "internal"}

	mode, changed := DetectRiskMonitoringMode(source, draft)
	if mode != RiskMonitoringModeWithProfileRevision {
		t.Fatalf("expected with_profile_revision, got %s", mode)
	}
	if len(changed) != 1 || changed[0] != "title" {
		t.Fatalf("expected title change, got %v", changed)
	}
}

func TestRiskMonitoringObservedScoreSnapshot(t *testing.T) {
	m := &RiskMonitoring{ObservedProbability: 4, ObservedImpact: 5}
	m.CalculateObservedScore()

	if m.ObservedWeight != GetBobot(4, 5) {
		t.Fatalf("unexpected weight: %v", m.ObservedWeight)
	}
	if m.ObservedNilai != CalculateNilai(4, 5, GetBobot(4, 5)) {
		t.Fatalf("unexpected nilai: %v", m.ObservedNilai)
	}
	if m.ObservedLevel != GetRiskLevelFromNilai(m.ObservedNilai) {
		t.Fatalf("unexpected level: %s", m.ObservedLevel)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend
go test ./internal/domain/entity -run RiskMonitoring -count=1
```

Expected: FAIL with undefined `RiskMonitoring` and helper types.

- [ ] **Step 3: Add entity**

Create `backend/internal/domain/entity/risk_monitoring.go`:

```go
package entity

import (
	"reflect"
	"time"

	"github.com/google/uuid"
)

const (
	RiskMonitoringStatusDraft     = "draft"
	RiskMonitoringStatusFinalized = "finalized"
	RiskMonitoringStatusVoid      = "void"

	RiskMonitoringModeScoreOnly           = "score_only"
	RiskMonitoringModeWithProfileRevision = "with_profile_revision"
)

type RiskMonitoring struct {
	ID                          uuid.UUID  `json:"id"`
	SourceRiskID                uuid.UUID  `json:"sourceRiskId"`
	ResultRiskID                *uuid.UUID `json:"resultRiskId,omitempty"`
	AssessmentCycle             string     `json:"assessmentCycle"`
	Status                      string     `json:"status"`
	Mode                        string     `json:"mode"`
	SourceProbability           int        `json:"sourceProbability"`
	SourceImpact                int        `json:"sourceImpact"`
	SourceWeight                float64    `json:"sourceWeight"`
	SourceNilai                 float64    `json:"sourceNilai"`
	SourceLevel                 string     `json:"sourceLevel"`
	SourceVersionNumber         int        `json:"sourceVersionNumber"`
	ObservedProbability         int        `json:"observedProbability"`
	ObservedImpact              int        `json:"observedImpact"`
	ObservedWeight              float64    `json:"observedWeight"`
	ObservedNilai               float64    `json:"observedNilai"`
	ObservedLevel               string     `json:"observedLevel"`
	ConditionSummary            string     `json:"conditionSummary"`
	EventSummary                 string     `json:"eventSummary"`
	Trend                       string     `json:"trend"`
	EffectivenessConclusion     string     `json:"effectivenessConclusion"`
	FollowUpNote                string     `json:"followUpNote"`
	Conclusion                  string     `json:"conclusion"`
	MitigationProgressSummary    string     `json:"mitigationProgressSummary"`
	MitigationCompletionPercent  int        `json:"mitigationCompletionPercent"`
	MitigationObstacles          string     `json:"mitigationObstacles"`
	MitigationFollowUp           string     `json:"mitigationFollowUp"`
	DraftTitle                   string     `json:"draftTitle"`
	DraftCategory                string     `json:"draftCategory"`
	DraftCause                   []string   `json:"draftCause"`
	DraftRiskSource              string     `json:"draftRiskSource"`
	DraftControllability         string     `json:"draftControllability"`
	DraftImpactDesc              []string   `json:"draftImpactDesc"`
	DraftExistingControl         string     `json:"draftExistingControl"`
	DraftTreatmentOption         string     `json:"draftTreatmentOption"`
	DraftMitigations             []Mitigation `json:"draftMitigations"`
	ProfileChangeSummary         []string   `json:"profileChangeSummary"`
	ChangeReason                string     `json:"changeReason"`
	StartedBy                   *uuid.UUID `json:"startedBy,omitempty"`
	StartedAt                   time.Time  `json:"startedAt"`
	FinalizedBy                 *uuid.UUID `json:"finalizedBy,omitempty"`
	FinalizedAt                 *time.Time `json:"finalizedAt,omitempty"`
	CreatedAt                   time.Time  `json:"createdAt"`
	UpdatedAt                   time.Time  `json:"updatedAt"`
	SourceRisk                  *Risk      `json:"sourceRisk,omitempty"`
	ResultRisk                  *Risk      `json:"resultRisk,omitempty"`
}

type RiskMonitoringDraftValues struct {
	Title             string
	Category          string
	Cause             []string
	RiskSource        string
	Controllability   string
	ImpactDesc        []string
	ExistingControl   string
	TreatmentOption   string
	Mitigations        []Mitigation
	Probability       int
	Impact            int
	ConditionSummary  string
	EventSummary       string
	Effectiveness     string
	Conclusion        string
	ChangeReason      string
}

func NewRiskMonitoringDraft(source *Risk, cycle string, startedBy uuid.UUID) *RiskMonitoring {
	return &RiskMonitoring{
		SourceRiskID:        source.ID,
		AssessmentCycle:     cycle,
		Status:              RiskMonitoringStatusDraft,
		Mode:                RiskMonitoringModeScoreOnly,
		SourceProbability:   source.Probability,
		SourceImpact:        source.Impact,
		SourceWeight:        source.Weight,
		SourceNilai:         source.EffectiveNilai(),
		SourceLevel:         source.GetRiskLevel(),
		SourceVersionNumber: source.VersionNumber,
		ObservedProbability: source.Probability,
		ObservedImpact:      source.Impact,
		ObservedWeight:      source.Weight,
		ObservedNilai:       source.EffectiveNilai(),
		ObservedLevel:       source.GetRiskLevel(),
		DraftTitle:          source.Title,
		DraftCategory:       source.Category,
		DraftCause:          append([]string(nil), source.Cause...),
		DraftRiskSource:     source.RiskSource,
		DraftControllability: source.Controllability,
		DraftImpactDesc:     append([]string(nil), source.ImpactDesc...),
		DraftExistingControl: source.ExistingControl,
		DraftTreatmentOption: source.TreatmentOption,
		DraftMitigations:    append([]Mitigation(nil), source.Mitigations...),
		StartedBy:           &startedBy,
	}
}

func (m *RiskMonitoring) CalculateObservedScore() {
	m.ObservedWeight = GetBobot(m.ObservedProbability, m.ObservedImpact)
	m.ObservedNilai = CalculateNilai(m.ObservedProbability, m.ObservedImpact, m.ObservedWeight)
	m.ObservedLevel = GetRiskLevelFromNilai(m.ObservedNilai)
}

func DetectRiskMonitoringMode(source *Risk, values *RiskMonitoringDraftValues) (string, []string) {
	changed := make([]string, 0)
	if source.Title != values.Title {
		changed = append(changed, "title")
	}
	if source.Category != values.Category {
		changed = append(changed, "category")
	}
	if !reflect.DeepEqual(source.Cause, values.Cause) {
		changed = append(changed, "cause")
	}
	if source.RiskSource != values.RiskSource {
		changed = append(changed, "riskSource")
	}
	if source.Controllability != values.Controllability {
		changed = append(changed, "controllability")
	}
	if !reflect.DeepEqual(source.ImpactDesc, values.ImpactDesc) {
		changed = append(changed, "impactDesc")
	}
	if source.ExistingControl != values.ExistingControl {
		changed = append(changed, "existingControl")
	}
	if source.TreatmentOption != values.TreatmentOption {
		changed = append(changed, "treatmentOption")
	}
	if mitigationPlanChanged(source.Mitigations, values.Mitigations) {
		changed = append(changed, "mitigations")
	}
	if len(changed) > 0 {
		return RiskMonitoringModeWithProfileRevision, changed
	}
	return RiskMonitoringModeScoreOnly, changed
}

func mitigationPlanChanged(a []Mitigation, b []Mitigation) bool {
	if len(a) != len(b) {
		return true
	}
	for i := range a {
		if a[i].Action != b[i].Action ||
			a[i].Owner != b[i].Owner ||
			a[i].DueDate != b[i].DueDate ||
			a[i].TargetCost != b[i].TargetCost ||
			a[i].ExpectedOutput != b[i].ExpectedOutput ||
			a[i].MitigationType != b[i].MitigationType {
			return true
		}
	}
	return false
}
```

- [ ] **Step 4: Add repository interface**

Create `backend/internal/domain/repository/risk_monitoring.go`:

```go
package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type RiskMonitoringRepository interface {
	GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.RiskMonitoring, error)
	GetDraftBySourceAndCycle(ctx context.Context, sourceRiskID uuid.UUID, cycle string) (*entity.RiskMonitoring, error)
	HasFinalizedForSourceAndCycle(ctx context.Context, sourceRiskID uuid.UUID, cycle string) (bool, error)
	Create(ctx context.Context, monitoring *entity.RiskMonitoring) error
	UpdateDraft(ctx context.Context, monitoring *entity.RiskMonitoring) error
	Finalize(ctx context.Context, monitoringID uuid.UUID, resultRisk *entity.Risk, finalizedBy uuid.UUID) (*entity.RiskMonitoring, error)
}
```

- [ ] **Step 5: Run entity tests**

Run:

```bash
cd backend
go test ./internal/domain/entity -run RiskMonitoring -count=1
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/domain/entity/risk_monitoring.go backend/internal/domain/entity/risk_monitoring_test.go backend/internal/domain/repository/risk_monitoring.go
git commit -m "feat: model risk monitoring transactions"
```

---

### Task 3: PostgreSQL Risk Monitoring Repository

**Files:**
- Create: `backend/internal/repository/postgres/risk_monitoring.go`
- Create: `backend/internal/repository/postgres/risk_monitoring_test.go`

- [ ] **Step 1: Write failing repository tests**

Create focused tests in `backend/internal/repository/postgres/risk_monitoring_test.go`:

```go
package postgres

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func TestRiskMonitoringRepositoryCreateReturnsExistingDraft(t *testing.T) {
	pool := setupTestDB(t)
	ctx := context.Background()
	repo := NewRiskMonitoringRepository(pool)
	source := insertApprovedRiskFixture(t, pool, "R-001", "2026-H1")
	userID := uuid.New()

	first := entity.NewRiskMonitoringDraft(source, "2026-H1", userID)
	if err := repo.Create(ctx, first); err != nil {
		t.Fatalf("create first draft: %v", err)
	}

	got, err := repo.GetDraftBySourceAndCycle(ctx, source.ID, "2026-H1")
	if err != nil {
		t.Fatalf("get existing draft: %v", err)
	}
	if got.ID != first.ID {
		t.Fatalf("expected existing draft %s, got %s", first.ID, got.ID)
	}
}

func TestRiskMonitoringRepositoryFinalizeCreatesLinkedResult(t *testing.T) {
	pool := setupTestDB(t)
	ctx := context.Background()
	repo := NewRiskMonitoringRepository(pool)
	source := insertApprovedRiskFixture(t, pool, "R-002", "2026-H1")
	userID := uuid.New()
	monitoring := entity.NewRiskMonitoringDraft(source, "2026-H1", userID)
	monitoring.ObservedProbability = 4
	monitoring.ObservedImpact = 5
	monitoring.CalculateObservedScore()
	if err := repo.Create(ctx, monitoring); err != nil {
		t.Fatalf("create monitoring: %v", err)
	}

	result := *source
	result.ID = uuid.Nil
	result.PreviousRiskID = &source.ID
	result.Probability = monitoring.ObservedProbability
	result.Impact = monitoring.ObservedImpact
	result.Weight = monitoring.ObservedWeight
	result.Nilai = monitoring.ObservedNilai
	result.InherentScore = int(monitoring.ObservedNilai)
	result.VersionNumber = source.VersionNumber + 1
	result.Status = entity.RiskStatusApproved
	result.IsCurrent = true
	result.IsCycleCurrent = true

	finalized, err := repo.Finalize(ctx, monitoring.ID, &result, userID)
	if err != nil {
		t.Fatalf("finalize monitoring: %v", err)
	}
	if finalized.ResultRiskID == nil {
		t.Fatal("expected result risk id")
	}
	if finalized.Status != entity.RiskMonitoringStatusFinalized {
		t.Fatalf("expected finalized status, got %s", finalized.Status)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend
go test ./internal/repository/postgres -run RiskMonitoringRepository -count=1
```

Expected: FAIL because repository does not exist.

- [ ] **Step 3: Implement repository constructor and CRUD**

Create `backend/internal/repository/postgres/risk_monitoring.go` with:

```go
package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
)

type riskMonitoringRepository struct {
	pool *pgxpool.Pool
}

func NewRiskMonitoringRepository(pool *pgxpool.Pool) *riskMonitoringRepository {
	return &riskMonitoringRepository{pool: pool}
}

func (r *riskMonitoringRepository) Create(ctx context.Context, monitoring *entity.RiskMonitoring) error {
	profileChanges, err := json.Marshal(monitoring.ProfileChangeSummary)
	if err != nil {
		return fmt.Errorf("marshal profile changes: %w", err)
	}
	err = r.pool.QueryRow(ctx, `
		INSERT INTO risk_monitorings (
			source_risk_id, result_risk_id, assessment_cycle, status, mode,
			source_probability, source_impact, source_weight, source_nilai, source_level, source_version_number,
			observed_probability, observed_impact, observed_weight, observed_nilai, observed_level,
			condition_summary, event_summary, trend, effectiveness_conclusion, follow_up_note, conclusion,
			mitigation_progress_summary, mitigation_completion_percent, mitigation_obstacles, mitigation_follow_up,
			draft_title, draft_category, draft_cause, draft_risk_source, draft_controllability, draft_impact_description, draft_existing_control, draft_treatment_option, draft_mitigations,
			profile_change_summary, change_reason, started_by
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38)
		RETURNING id, started_at, created_at, updated_at`,
		monitoring.SourceRiskID, monitoring.ResultRiskID, monitoring.AssessmentCycle, monitoring.Status, monitoring.Mode,
		monitoring.SourceProbability, monitoring.SourceImpact, monitoring.SourceWeight, monitoring.SourceNilai, monitoring.SourceLevel, monitoring.SourceVersionNumber,
		monitoring.ObservedProbability, monitoring.ObservedImpact, monitoring.ObservedWeight, monitoring.ObservedNilai, monitoring.ObservedLevel,
		monitoring.ConditionSummary, monitoring.EventSummary, monitoring.Trend, monitoring.EffectivenessConclusion, monitoring.FollowUpNote, monitoring.Conclusion,
		monitoring.MitigationProgressSummary, monitoring.MitigationCompletionPercent, monitoring.MitigationObstacles, monitoring.MitigationFollowUp,
		monitoring.DraftTitle, monitoring.DraftCategory, monitoring.DraftCause, monitoring.DraftRiskSource, monitoring.DraftControllability, monitoring.DraftImpactDesc, monitoring.DraftExistingControl, monitoring.DraftTreatmentOption, mustJSON(monitoring.DraftMitigations),
		profileChanges, monitoring.ChangeReason, monitoring.StartedBy,
	).Scan(&monitoring.ID, &monitoring.StartedAt, &monitoring.CreatedAt, &monitoring.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create risk monitoring: %w", err)
	}
	return nil
}

func (r *riskMonitoringRepository) GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.RiskMonitoring, error) {
	query := baseRiskMonitoringSelect() + ` WHERE rm.id = $1`
	args := []any{id}
	if len(orgIDs) > 0 {
		query += ` AND src.organization_id = ANY($2)`
		args = append(args, orgIDs)
	}
	return scanRiskMonitoring(r.pool.QueryRow(ctx, query, args...))
}

func (r *riskMonitoringRepository) GetDraftBySourceAndCycle(ctx context.Context, sourceRiskID uuid.UUID, cycle string) (*entity.RiskMonitoring, error) {
	m, err := scanRiskMonitoring(r.pool.QueryRow(ctx, baseRiskMonitoringSelect()+`
		WHERE rm.source_risk_id = $1 AND rm.assessment_cycle = $2 AND rm.status = 'draft'
	`, sourceRiskID, cycle))
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return m, err
}

func (r *riskMonitoringRepository) HasFinalizedForSourceAndCycle(ctx context.Context, sourceRiskID uuid.UUID, cycle string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM risk_monitorings
			WHERE source_risk_id = $1 AND assessment_cycle = $2 AND status = 'finalized'
		)
	`, sourceRiskID, cycle).Scan(&exists)
	return exists, err
}

func (r *riskMonitoringRepository) UpdateDraft(ctx context.Context, monitoring *entity.RiskMonitoring) error {
	profileChanges, err := json.Marshal(monitoring.ProfileChangeSummary)
	if err != nil {
		return fmt.Errorf("marshal profile changes: %w", err)
	}
	tag, err := r.pool.Exec(ctx, `
		UPDATE risk_monitorings
		SET mode = $2,
		    observed_probability = $3,
		    observed_impact = $4,
		    observed_weight = $5,
		    observed_nilai = $6,
		    observed_level = $7,
		    condition_summary = $8,
		    event_summary = $9,
		    trend = $10,
		    effectiveness_conclusion = $11,
		    follow_up_note = $12,
		    conclusion = $13,
		    mitigation_progress_summary = $14,
		    mitigation_completion_percent = $15,
		    mitigation_obstacles = $16,
		    mitigation_follow_up = $17,
		    draft_title = $18,
		    draft_category = $19,
		    draft_cause = $20,
		    draft_risk_source = $21,
		    draft_controllability = $22,
		    draft_impact_description = $23,
		    draft_existing_control = $24,
		    draft_treatment_option = $25,
		    draft_mitigations = $26,
		    profile_change_summary = $27,
		    change_reason = $28,
		    updated_at = now()
		WHERE id = $1 AND status = 'draft'`,
		monitoring.ID, monitoring.Mode, monitoring.ObservedProbability, monitoring.ObservedImpact, monitoring.ObservedWeight, monitoring.ObservedNilai, monitoring.ObservedLevel,
		monitoring.ConditionSummary, monitoring.EventSummary, monitoring.Trend, monitoring.EffectivenessConclusion, monitoring.FollowUpNote, monitoring.Conclusion,
		monitoring.MitigationProgressSummary, monitoring.MitigationCompletionPercent, monitoring.MitigationObstacles, monitoring.MitigationFollowUp,
		monitoring.DraftTitle, monitoring.DraftCategory, monitoring.DraftCause, monitoring.DraftRiskSource, monitoring.DraftControllability, monitoring.DraftImpactDesc, monitoring.DraftExistingControl, monitoring.DraftTreatmentOption, mustJSON(monitoring.DraftMitigations),
		profileChanges, monitoring.ChangeReason)
	if err != nil {
		return fmt.Errorf("update risk monitoring draft: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}
```

- [ ] **Step 4: Implement transactional finalization**

Append to `risk_monitoring.go`:

```go
func (r *riskMonitoringRepository) Finalize(ctx context.Context, monitoringID uuid.UUID, resultRisk *entity.Risk, finalizedBy uuid.UUID) (*entity.RiskMonitoring, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin monitoring finalize tx: %w", err)
	}
	defer tx.Rollback(ctx)

	monitoring, err := scanRiskMonitoring(tx.QueryRow(ctx, baseRiskMonitoringSelect()+` WHERE rm.id = $1 FOR UPDATE`, monitoringID))
	if err != nil {
		return nil, err
	}
	if monitoring.Status != entity.RiskMonitoringStatusDraft {
		return nil, fmt.Errorf("monitoring is not draft")
	}

	source, err := getRiskByIDWithQueryer(ctx, tx, monitoring.SourceRiskID)
	if err != nil {
		return nil, fmt.Errorf("load source risk: %w", err)
	}
	if source.Status != entity.RiskStatusApproved || !source.IsCurrent {
		return nil, fmt.Errorf("source risk is no longer current")
	}

	_, err = tx.Exec(ctx, `UPDATE risks SET is_current = FALSE, is_cycle_current = FALSE, updated_at = now() WHERE version_group_id = $1 AND is_current = TRUE`, source.VersionGroupID)
	if err != nil {
		return nil, fmt.Errorf("deactivate current risk: %w", err)
	}

	now := time.Now().UTC()
	resultRisk.Status = entity.RiskStatusApproved
	resultRisk.IsCurrent = true
	resultRisk.IsCycleCurrent = true
	resultRisk.ReviewType = "periodic"
	resultRisk.ReviewApprovedAt = &now
	resultRisk.ReviewSubmittedAt = &now
	if err := insertRiskWithQueryer(ctx, tx, resultRisk); err != nil {
		return nil, fmt.Errorf("create result risk: %w", err)
	}

	tag, err := tx.Exec(ctx, `
		UPDATE risk_monitorings
		SET status = 'finalized',
		    result_risk_id = $2,
		    finalized_by = $3,
		    finalized_at = $4,
		    updated_at = now()
		WHERE id = $1 AND status = 'draft'`,
		monitoringID, resultRisk.ID, finalizedBy, now)
	if err != nil {
		return nil, fmt.Errorf("mark monitoring finalized: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, fmt.Errorf("monitoring was already finalized")
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit monitoring finalize tx: %w", err)
	}
	return r.GetByID(ctx, monitoringID, nil)
}
```

Add `baseRiskMonitoringSelect`, `scanRiskMonitoring`, and `getRiskByIDWithQueryer` helpers in the same file. Use explicit column lists matching the migration; do not use `SELECT *`.

- [ ] **Step 5: Run repository tests**

Run:

```bash
cd backend
go test ./internal/repository/postgres -run RiskMonitoringRepository -count=1
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/repository/postgres/risk_monitoring.go backend/internal/repository/postgres/risk_monitoring_test.go
git commit -m "feat: persist risk monitoring transactions"
```

---

### Task 4: Start And Update Usecases

**Files:**
- Create: `backend/internal/usecase/riskmonitoring/start.go`
- Create: `backend/internal/usecase/riskmonitoring/get.go`
- Create: `backend/internal/usecase/riskmonitoring/update.go`
- Create: `backend/internal/usecase/riskmonitoring/start_test.go`
- Create: `backend/internal/usecase/riskmonitoring/update_test.go`

- [ ] **Step 1: Write failing start usecase tests**

Create `backend/internal/usecase/riskmonitoring/start_test.go` with tests:

```go
package riskmonitoring

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func TestStartUseCaseCreatesTransactionWithoutRiskVersion(t *testing.T) {
	source := &entity.Risk{ID: uuid.New(), Status: entity.RiskStatusApproved, IsCurrent: true, Probability: 3, Impact: 3, Weight: entity.GetBobot(3, 3), Nilai: entity.CalculateNilai(3, 3, entity.GetBobot(3, 3)), VersionNumber: 2}
	riskRepo := &fakeRiskRepo{risk: source}
	monitoringRepo := &fakeMonitoringRepo{}
	uc := NewStartUseCase(riskRepo, monitoringRepo)

	out, err := uc.Execute(context.Background(), StartInput{SourceRiskID: source.ID, AssessmentCycle: "2026-H1", CreatedBy: uuid.New()})
	if err != nil {
		t.Fatalf("start monitoring: %v", err)
	}
	if out.Monitoring.SourceRiskID != source.ID {
		t.Fatalf("expected source %s, got %s", source.ID, out.Monitoring.SourceRiskID)
	}
	if riskRepo.createdRisk {
		t.Fatal("start monitoring must not create a risk version")
	}
}

func TestStartUseCaseReturnsExistingDraft(t *testing.T) {
	sourceID := uuid.New()
	existing := &entity.RiskMonitoring{ID: uuid.New(), SourceRiskID: sourceID, AssessmentCycle: "2026-H1", Status: entity.RiskMonitoringStatusDraft}
	uc := NewStartUseCase(&fakeRiskRepo{risk: &entity.Risk{ID: sourceID, Status: entity.RiskStatusApproved, IsCurrent: true}}, &fakeMonitoringRepo{draft: existing})

	out, err := uc.Execute(context.Background(), StartInput{SourceRiskID: sourceID, AssessmentCycle: "2026-H1", CreatedBy: uuid.New()})
	if err != nil {
		t.Fatalf("start monitoring: %v", err)
	}
	if !out.ExistingDraft || out.Monitoring.ID != existing.ID {
		t.Fatalf("expected existing draft")
	}
}
```

- [ ] **Step 2: Implement start usecase**

Create `backend/internal/usecase/riskmonitoring/start.go`:

```go
package riskmonitoring

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

type riskReader interface {
	GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.Risk, error)
}

type StartUseCase struct {
	riskRepo       riskReader
	monitoringRepo repository.RiskMonitoringRepository
}

type StartInput struct {
	SourceRiskID    uuid.UUID
	AssessmentCycle string
	OrgIDs          []uuid.UUID
	CreatedBy       uuid.UUID
}

type StartOutput struct {
	Monitoring    *entity.RiskMonitoring `json:"monitoring"`
	ExistingDraft bool                   `json:"existingDraft"`
	RedirectURL   string                 `json:"redirectUrl"`
}

func NewStartUseCase(riskRepo riskReader, monitoringRepo repository.RiskMonitoringRepository) *StartUseCase {
	return &StartUseCase{riskRepo: riskRepo, monitoringRepo: monitoringRepo}
}

func (uc *StartUseCase) Execute(ctx context.Context, input StartInput) (*StartOutput, error) {
	if input.SourceRiskID == uuid.Nil || input.CreatedBy == uuid.Nil || !riskuc.IsValidCycleFormat(input.AssessmentCycle) {
		return nil, errors.ErrInvalidInput
	}
	source, err := uc.riskRepo.GetByID(ctx, input.SourceRiskID, input.OrgIDs)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}
	if source.Status != entity.RiskStatusApproved || !source.IsCurrent {
		return nil, errors.Wrap(errors.ErrInvalidStatus, "source risk must be approved and current")
	}
	if finalized, err := uc.monitoringRepo.HasFinalizedForSourceAndCycle(ctx, source.ID, input.AssessmentCycle); err != nil {
		return nil, err
	} else if finalized {
		return nil, errors.Wrap(errors.ErrInvalidInput, "monitoring is already finalized for this source risk and semester")
	}
	if draft, err := uc.monitoringRepo.GetDraftBySourceAndCycle(ctx, source.ID, input.AssessmentCycle); err != nil {
		return nil, err
	} else if draft != nil {
		return &StartOutput{Monitoring: draft, ExistingDraft: true, RedirectURL: "/risk/monitoring/" + draft.ID.String()}, nil
	}
	monitoring := entity.NewRiskMonitoringDraft(source, input.AssessmentCycle, input.CreatedBy)
	if err := uc.monitoringRepo.Create(ctx, monitoring); err != nil {
		return nil, err
	}
	return &StartOutput{Monitoring: monitoring, ExistingDraft: false, RedirectURL: "/risk/monitoring/" + monitoring.ID.String()}, nil
}
```

- [ ] **Step 3: Write failing update tests**

Create `backend/internal/usecase/riskmonitoring/update_test.go`:

```go
package riskmonitoring

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func TestUpdateUseCaseDetectsProfileRevision(t *testing.T) {
	sourceID := uuid.New()
	monitoring := &entity.RiskMonitoring{ID: uuid.New(), SourceRiskID: sourceID, Status: entity.RiskMonitoringStatusDraft}
	source := &entity.Risk{ID: sourceID, Title: "Old", Category: entity.RiskCategoryOperasional, Probability: 3, Impact: 3}
	repo := &fakeMonitoringRepo{byID: monitoring}
	uc := NewUpdateUseCase(&fakeRiskRepo{risk: source}, repo)

	out, err := uc.Execute(context.Background(), UpdateInput{
		ID: uuid.New(),
		Values: entity.RiskMonitoringDraftValues{
			Title: "New", Category: entity.RiskCategoryOperasional, Probability: 4, Impact: 4, ChangeReason: "Pemantauan menemukan perubahan konteks",
		},
	})
	if err != nil {
		t.Fatalf("update monitoring: %v", err)
	}
	if out.Mode != entity.RiskMonitoringModeWithProfileRevision {
		t.Fatalf("expected profile revision mode, got %s", out.Mode)
	}
}
```

- [ ] **Step 4: Implement get and update usecases**

Create `backend/internal/usecase/riskmonitoring/get.go`:

```go
package riskmonitoring

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type GetUseCase struct {
	monitoringRepo repository.RiskMonitoringRepository
}

func NewGetUseCase(monitoringRepo repository.RiskMonitoringRepository) *GetUseCase {
	return &GetUseCase{monitoringRepo: monitoringRepo}
}

func (uc *GetUseCase) Execute(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.RiskMonitoring, error) {
	return uc.monitoringRepo.GetByID(ctx, id, orgIDs)
}
```

Create `backend/internal/usecase/riskmonitoring/update.go`:

```go
package riskmonitoring

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type UpdateUseCase struct {
	riskRepo       riskReader
	monitoringRepo repository.RiskMonitoringRepository
}

type UpdateInput struct {
	ID     uuid.UUID
	OrgIDs []uuid.UUID
	Values entity.RiskMonitoringDraftValues
}

func NewUpdateUseCase(riskRepo riskReader, monitoringRepo repository.RiskMonitoringRepository) *UpdateUseCase {
	return &UpdateUseCase{riskRepo: riskRepo, monitoringRepo: monitoringRepo}
}

func (uc *UpdateUseCase) Execute(ctx context.Context, input UpdateInput) (*entity.RiskMonitoring, error) {
	monitoring, err := uc.monitoringRepo.GetByID(ctx, input.ID, input.OrgIDs)
	if err != nil {
		return nil, err
	}
	if monitoring.Status != entity.RiskMonitoringStatusDraft {
		return nil, errors.Wrap(errors.ErrInvalidStatus, "monitoring is not editable")
	}
	source, err := uc.riskRepo.GetByID(ctx, monitoring.SourceRiskID, input.OrgIDs)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}
	mode, changed := entity.DetectRiskMonitoringMode(source, &input.Values)
	monitoring.Mode = mode
	monitoring.ProfileChangeSummary = changed
	monitoring.ChangeReason = input.Values.ChangeReason
	monitoring.ObservedProbability = input.Values.Probability
	monitoring.ObservedImpact = input.Values.Impact
	monitoring.ConditionSummary = input.Values.ConditionSummary
	monitoring.EventSummary = input.Values.EventSummary
	monitoring.EffectivenessConclusion = input.Values.Effectiveness
	monitoring.Conclusion = input.Values.Conclusion
	monitoring.DraftTitle = input.Values.Title
	monitoring.DraftCategory = input.Values.Category
	monitoring.DraftCause = append([]string(nil), input.Values.Cause...)
	monitoring.DraftRiskSource = input.Values.RiskSource
	monitoring.DraftControllability = input.Values.Controllability
	monitoring.DraftImpactDesc = append([]string(nil), input.Values.ImpactDesc...)
	monitoring.DraftExistingControl = input.Values.ExistingControl
	monitoring.DraftTreatmentOption = input.Values.TreatmentOption
	monitoring.DraftMitigations = append([]entity.Mitigation(nil), input.Values.Mitigations...)
	monitoring.CalculateObservedScore()
	if err := uc.monitoringRepo.UpdateDraft(ctx, monitoring); err != nil {
		return nil, err
	}
	return monitoring, nil
}
```

- [ ] **Step 5: Run usecase tests**

Run:

```bash
cd backend
go test ./internal/usecase/riskmonitoring -run 'Start|Update' -count=1
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/usecase/riskmonitoring/start.go backend/internal/usecase/riskmonitoring/update.go backend/internal/usecase/riskmonitoring/start_test.go backend/internal/usecase/riskmonitoring/update_test.go
git commit -m "feat: create and update monitoring transactions"
```

---

### Task 5: Finalize Usecase

**Files:**
- Create: `backend/internal/usecase/riskmonitoring/finalize.go`
- Create: `backend/internal/usecase/riskmonitoring/finalize_test.go`

- [ ] **Step 1: Write failing finalize tests**

Create `backend/internal/usecase/riskmonitoring/finalize_test.go`:

```go
package riskmonitoring

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func TestFinalizeUseCaseBlocksStaleSource(t *testing.T) {
	sourceID := uuid.New()
	monitoring := &entity.RiskMonitoring{ID: uuid.New(), SourceRiskID: sourceID, Status: entity.RiskMonitoringStatusDraft, ObservedProbability: 4, ObservedImpact: 4, ObservedWeight: entity.GetBobot(4, 4), ObservedNilai: entity.CalculateNilai(4, 4, entity.GetBobot(4, 4))}
	source := &entity.Risk{ID: sourceID, Status: entity.RiskStatusApproved, IsCurrent: false}
	uc := NewFinalizeUseCase(&fakeRiskRepo{risk: source}, &fakeMonitoringRepo{byID: monitoring})

	_, err := uc.Execute(context.Background(), FinalizeInput{ID: monitoring.ID, FinalizedBy: uuid.New()})
	if err == nil {
		t.Fatal("expected stale source error")
	}
}

func TestFinalizeUseCaseRequiresChangeReasonForProfileRevision(t *testing.T) {
	sourceID := uuid.New()
	monitoring := &entity.RiskMonitoring{ID: uuid.New(), SourceRiskID: sourceID, Status: entity.RiskMonitoringStatusDraft, Mode: entity.RiskMonitoringModeWithProfileRevision}
	source := &entity.Risk{ID: sourceID, Status: entity.RiskStatusApproved, IsCurrent: true}
	uc := NewFinalizeUseCase(&fakeRiskRepo{risk: source}, &fakeMonitoringRepo{byID: monitoring})

	_, err := uc.Execute(context.Background(), FinalizeInput{ID: monitoring.ID, FinalizedBy: uuid.New()})
	if err == nil {
		t.Fatal("expected change reason error")
	}
}
```

- [ ] **Step 2: Implement finalize usecase**

Create `backend/internal/usecase/riskmonitoring/finalize.go`:

```go
package riskmonitoring

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type FinalizeUseCase struct {
	riskRepo       riskReader
	monitoringRepo repository.RiskMonitoringRepository
}

type FinalizeInput struct {
	ID          uuid.UUID
	OrgIDs      []uuid.UUID
	FinalizedBy uuid.UUID
}

func NewFinalizeUseCase(riskRepo riskReader, monitoringRepo repository.RiskMonitoringRepository) *FinalizeUseCase {
	return &FinalizeUseCase{riskRepo: riskRepo, monitoringRepo: monitoringRepo}
}

func (uc *FinalizeUseCase) Execute(ctx context.Context, input FinalizeInput) (*entity.RiskMonitoring, error) {
	monitoring, err := uc.monitoringRepo.GetByID(ctx, input.ID, input.OrgIDs)
	if err != nil {
		return nil, err
	}
	if monitoring.Status != entity.RiskMonitoringStatusDraft {
		return nil, errors.Wrap(errors.ErrInvalidStatus, "monitoring is already finalized")
	}
	source, err := uc.riskRepo.GetByID(ctx, monitoring.SourceRiskID, input.OrgIDs)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}
	if source.Status != entity.RiskStatusApproved || !source.IsCurrent {
		return nil, errors.Wrap(errors.ErrInvalidStatus, "source risk is no longer active")
	}
	if monitoring.Mode == entity.RiskMonitoringModeWithProfileRevision && strings.TrimSpace(monitoring.ChangeReason) == "" {
		return nil, errors.Wrap(errors.ErrInvalidInput, "changeReason is required for profile revision monitoring")
	}

	result := buildResultRiskFromMonitoring(source, monitoring, input.FinalizedBy)
	return uc.monitoringRepo.Finalize(ctx, monitoring.ID, result, input.FinalizedBy)
}

func buildResultRiskFromMonitoring(source *entity.Risk, monitoring *entity.RiskMonitoring, finalizedBy uuid.UUID) *entity.Risk {
	result := *source
	result.ID = uuid.Nil
	result.PreviousRiskID = &source.ID
	result.IsCurrent = true
	result.IsCycleCurrent = true
	result.Status = entity.RiskStatusApproved
	result.AssessmentCycle = monitoring.AssessmentCycle
	result.ReviewType = "periodic"
	result.ChangeReason = monitoring.ChangeReason
	result.ReviewSummary = monitoring.Conclusion
	result.VersionNumber = source.VersionNumber + 1
	result.Probability = monitoring.ObservedProbability
	result.Impact = monitoring.ObservedImpact
	result.Weight = monitoring.ObservedWeight
	result.Nilai = monitoring.ObservedNilai
	result.InherentScore = int(monitoring.ObservedNilai)
	if finalizedBy != uuid.Nil {
		result.CreatedBy = &finalizedBy
	}
	return &result
}
```

- [ ] **Step 3: Add profile substance carry-over**

Map persisted draft profile fields from `risk_monitorings` into `result` inside `buildResultRiskFromMonitoring`. Keep score-only path as copy-from-source.

Use this exact branch:

```go
if monitoring.Mode == entity.RiskMonitoringModeScoreOnly {
	result.Title = source.Title
	result.Category = source.Category
	result.Cause = append([]string(nil), source.Cause...)
	result.RiskSource = source.RiskSource
	result.Controllability = source.Controllability
	result.ImpactDesc = append([]string(nil), source.ImpactDesc...)
	result.ExistingControl = source.ExistingControl
	result.TreatmentOption = source.TreatmentOption
	result.Mitigations = append([]entity.Mitigation(nil), source.Mitigations...)
}
if monitoring.Mode == entity.RiskMonitoringModeWithProfileRevision {
	result.Title = monitoring.DraftTitle
	result.Category = monitoring.DraftCategory
	result.Cause = append([]string(nil), monitoring.DraftCause...)
	result.RiskSource = monitoring.DraftRiskSource
	result.Controllability = monitoring.DraftControllability
	result.ImpactDesc = append([]string(nil), monitoring.DraftImpactDesc...)
	result.ExistingControl = monitoring.DraftExistingControl
	result.TreatmentOption = monitoring.DraftTreatmentOption
	result.Mitigations = append([]entity.Mitigation(nil), monitoring.DraftMitigations...)
}
```

- [ ] **Step 4: Run finalize tests**

Run:

```bash
cd backend
go test ./internal/usecase/riskmonitoring -run Finalize -count=1
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/usecase/riskmonitoring/finalize.go backend/internal/usecase/riskmonitoring/finalize_test.go
git commit -m "feat: finalize monitoring into active risk version"
```

---

### Task 6: HTTP Handlers And Wiring

**Files:**
- Create: `backend/internal/handler/http/risk_monitoring.go`
- Modify: `backend/internal/bootstrap/bootstrap.go`
- Modify: route registration file where risk routes are mounted

- [ ] **Step 1: Write failing handler tests**

Create `backend/internal/handler/http/risk_monitoring_test.go` with tests for:

```go
func TestRiskMonitoringHandlerStartReturnsRedirectURL(t *testing.T) {
	// POST /risk-monitorings/start with sourceRiskId and assessmentCycle
	// Expect 201 and data.redirectUrl == "/risk/monitoring/{id}"
}

func TestRiskMonitoringHandlerRejectsInvalidCycle(t *testing.T) {
	// POST /risk-monitorings/start with "2026-Q1"
	// Expect 400 problem details
}
```

- [ ] **Step 2: Create handler**

Create `backend/internal/handler/http/risk_monitoring.go`:

```go
package http

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/middleware"
	riskmonitoringuc "github.com/manris/backend/internal/usecase/riskmonitoring"
)

type RiskMonitoringHandler struct {
	startUC    *riskmonitoringuc.StartUseCase
	getUC      *riskmonitoringuc.GetUseCase
	updateUC   *riskmonitoringuc.UpdateUseCase
	finalizeUC *riskmonitoringuc.FinalizeUseCase
}

func NewRiskMonitoringHandler(startUC *riskmonitoringuc.StartUseCase, getUC *riskmonitoringuc.GetUseCase, updateUC *riskmonitoringuc.UpdateUseCase, finalizeUC *riskmonitoringuc.FinalizeUseCase) *RiskMonitoringHandler {
	return &RiskMonitoringHandler{startUC: startUC, getUC: getUC, updateUC: updateUC, finalizeUC: finalizeUC}
}

type startRiskMonitoringRequest struct {
	SourceRiskID    string `json:"sourceRiskId"`
	AssessmentCycle string `json:"assessmentCycle"`
}

func (h *RiskMonitoringHandler) Start(c *fiber.Ctx) error {
	var req startRiskMonitoringRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}
	sourceRiskID, err := uuid.Parse(req.SourceRiskID)
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid sourceRiskId")
	}
	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
	}
	userID, _ := c.Locals("userId").(uuid.UUID)
	out, err := h.startUC.Execute(c.Context(), riskmonitoringuc.StartInput{SourceRiskID: sourceRiskID, AssessmentCycle: req.AssessmentCycle, OrgIDs: orgIDs, CreatedBy: userID})
	if err != nil {
		return handleError(c, err)
	}
	return c.Status(201).JSON(fiber.Map{"data": out})
}
```

Add `Get`, `Update`, and `Finalize` methods in the same file:

```go
func (h *RiskMonitoringHandler) Get(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid monitoring ID")
	}
	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		return handleError(c, err)
	}
	result, err := h.getUC.Execute(c.Context(), id, orgIDs)
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}

func (h *RiskMonitoringHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid monitoring ID")
	}
	var input riskmonitoringuc.UpdateRequest
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}
	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		return handleError(c, err)
	}
	result, err := h.updateUC.Execute(c.Context(), input.ToUseCaseInput(id, orgIDs))
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}

func (h *RiskMonitoringHandler) Finalize(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid monitoring ID")
	}
	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		return handleError(c, err)
	}
	userID, _ := c.Locals("userId").(uuid.UUID)
	result, err := h.finalizeUC.Execute(c.Context(), riskmonitoringuc.FinalizeInput{ID: id, OrgIDs: orgIDs, FinalizedBy: userID})
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}
```

- [ ] **Step 3: Wire bootstrap**

Modify `backend/internal/bootstrap/bootstrap.go`:

```go
RiskMonitoringStartUC    *riskmonitoringuc.StartUseCase
RiskMonitoringUpdateUC   *riskmonitoringuc.UpdateUseCase
RiskMonitoringFinalizeUC *riskmonitoringuc.FinalizeUseCase
```

Initialize:

```go
c.RiskMonitoringRepository = postgres.NewRiskMonitoringRepository(c.DB)
c.RiskMonitoringStartUC = riskmonitoringuc.NewStartUseCase(c.RiskRepository, c.RiskMonitoringRepository)
c.RiskMonitoringGetUC = riskmonitoringuc.NewGetUseCase(c.RiskMonitoringRepository)
c.RiskMonitoringUpdateUC = riskmonitoringuc.NewUpdateUseCase(c.RiskRepository, c.RiskMonitoringRepository)
c.RiskMonitoringFinalizeUC = riskmonitoringuc.NewFinalizeUseCase(c.RiskRepository, c.RiskMonitoringRepository)
```

- [ ] **Step 4: Register routes**

Add routes:

```go
riskMonitorings := api.Group("/risk-monitorings")
riskMonitorings.Post("/start", riskMonitoringHandler.Start)
riskMonitorings.Get("/:id", riskMonitoringHandler.Get)
riskMonitorings.Put("/:id", riskMonitoringHandler.Update)
riskMonitorings.Post("/:id/finalize", riskMonitoringHandler.Finalize)
```

- [ ] **Step 5: Run handler tests**

Run:

```bash
cd backend
go test ./internal/handler/http -run RiskMonitoring -count=1
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/handler/http/risk_monitoring.go backend/internal/handler/http/risk_monitoring_test.go backend/internal/bootstrap/bootstrap.go
git commit -m "feat: expose monitoring transaction api"
```

---

### Task 7: Register List And Bulk Monitoring

**Files:**
- Modify: `backend/internal/repository/postgres/risk.go`
- Modify: `backend/internal/repository/postgres/risk_register_test.go`
- Modify: `backend/internal/usecase/risk/create_monitoring_batch.go`
- Modify: `backend/internal/usecase/risk/create_monitoring_batch_test.go`

- [ ] **Step 1: Update failing list register test**

Modify `backend/internal/repository/postgres/risk_register_test.go` so `view=monitoring-transactions` expects rows from `risk_monitorings`, not `risks.version_number > 1`.

Expected assertions:

```go
if got[0].ID != monitoring.ID {
	t.Fatalf("expected monitoring id in monitoring tab row")
}
if got[0].BeforeMonitoringNilai == nil || *got[0].BeforeMonitoringNilai != monitoring.SourceNilai {
	t.Fatalf("expected source nilai snapshot")
}
if got[0].MonitoringResultNilai == nil || *got[0].MonitoringResultNilai != monitoring.ObservedNilai {
	t.Fatalf("expected observed nilai snapshot")
}
```

- [ ] **Step 2: Modify `ListRegister` query**

In `backend/internal/repository/postgres/risk.go`, branch early when `filter.View == "monitoring-transactions"`:

```go
if filter.View == "monitoring-transactions" {
	return r.listMonitoringTransactions(ctx, filter)
}
```

Add helper `listMonitoringTransactions` that selects from `risk_monitorings rm JOIN risks src ON src.id = rm.source_risk_id LEFT JOIN risks result ON result.id = rm.result_risk_id`. Map:

- `risk.ID = rm.id`
- `risk.Code = src.code`
- `risk.Title = src.title`
- `risk.Status = rm.status`
- `risk.AssessmentCycle = rm.assessment_cycle`
- `risk.VersionNumber = rm.source_version_number`
- `risk.BeforeMonitoringNilai = &rm.source_nilai`
- `risk.MonitoringResultNilai = &rm.observed_nilai`

- [ ] **Step 3: Update bulk monitoring tests**

Modify `backend/internal/usecase/risk/create_monitoring_batch_test.go`:

- Rename expectations from “creates reassessment drafts” to “creates monitoring transactions”.
- Assert no `riskRepo.Create` call occurs.
- Assert monitoring repo receives one transaction per valid row.

Expected test shape:

```go
func TestCreateMonitoringBatchUseCase_ExecuteCreatesMonitoringTransactions(t *testing.T) {
	// valid row with RealisasiP/RealisasiD
	// expect output status "created"
	// expect created monitoring with source snapshot and observed score
}
```

- [ ] **Step 4: Modify bulk monitoring usecase**

Change `CreateMonitoringBatchUseCase` to depend on `repository.RiskMonitoringRepository`. For each valid item:

```go
monitoring := entity.NewRiskMonitoringDraft(sourceRisk, cycle, *createdBy)
monitoring.ObservedProbability = item.RealisasiP
monitoring.ObservedImpact = item.RealisasiD
monitoring.CalculateObservedScore()
if err := uc.monitoringRepo.Create(ctx, monitoring); err != nil {
	// map unique violation to existing/skipped message
}
```

Return created monitoring IDs and redirect URLs as `/risk/monitoring/{id}`.

- [ ] **Step 5: Run backend tests for list and bulk**

Run:

```bash
cd backend
go test ./internal/repository/postgres -run RiskListRegisterMonitoring -count=1
go test ./internal/usecase/risk -run CreateMonitoringBatch -count=1
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/repository/postgres/risk.go backend/internal/repository/postgres/risk_register_test.go backend/internal/usecase/risk/create_monitoring_batch.go backend/internal/usecase/risk/create_monitoring_batch_test.go
git commit -m "feat: list and bulk-create monitoring transactions"
```

---

### Task 8: Frontend API And Routing

**Files:**
- Modify: `frontend/src/types/risk.ts`
- Create: `frontend/src/lib/api/risk-monitoring-transaction.ts`
- Modify: `frontend/src/lib/risk-register-monitoring.ts`
- Create: `frontend/src/lib/risk-register-monitoring.test.ts` if not already sufficient
- Create: `frontend/src/app/(app)/risk/monitoring/[id]/page.tsx`

- [ ] **Step 1: Add frontend types**

Modify `frontend/src/types/risk.ts`:

```ts
export type RiskMonitoringStatus = "draft" | "finalized" | "void";
export type RiskMonitoringMode = "score_only" | "with_profile_revision";

export interface RiskMonitoring {
  id: string;
  sourceRiskId: string;
  resultRiskId?: string | null;
  assessmentCycle: string;
  status: RiskMonitoringStatus;
  mode: RiskMonitoringMode;
  sourceProbability: number;
  sourceImpact: number;
  sourceWeight: number;
  sourceNilai: number;
  sourceLevel: RiskLevel;
  sourceVersionNumber: number;
  observedProbability: number;
  observedImpact: number;
  observedWeight: number;
  observedNilai: number;
  observedLevel: RiskLevel;
  conditionSummary: string;
  eventSummary: string;
  trend: "up" | "down" | "stable";
  effectivenessConclusion: string;
  followUpNote: string;
  conclusion: string;
  mitigationProgressSummary: string;
  mitigationCompletionPercent: number;
  mitigationObstacles: string;
  mitigationFollowUp: string;
  profileChangeSummary: string[];
  changeReason: string;
  sourceRisk?: Risk;
  resultRisk?: Risk;
}
```

- [ ] **Step 2: Create API client**

Create `frontend/src/lib/api/risk-monitoring-transaction.ts`:

```ts
import { api } from "@/lib/api";
import type { RiskMonitoring } from "@/types/risk";
import type { RiskAssessmentUpdateData } from "@/lib/api/risk-assessment";

export interface StartRiskMonitoringInput {
  sourceRiskId: string;
  assessmentCycle: string;
}

export interface StartRiskMonitoringResponse {
  monitoring: RiskMonitoring;
  existingDraft: boolean;
  redirectUrl: string;
}

export async function startRiskMonitoring(
  token: string,
  input: StartRiskMonitoringInput,
): Promise<StartRiskMonitoringResponse> {
  const response = await api.post<{ data: StartRiskMonitoringResponse }>(
    "/risk-monitorings/start",
    input,
    token,
  );
  return response.data;
}

export async function getRiskMonitoring(
  token: string,
  id: string,
): Promise<RiskMonitoring> {
  const response = await api.get<{ data: RiskMonitoring }>(
    `/risk-monitorings/${id}`,
    token,
  );
  return response.data;
}

export async function updateRiskMonitoring(
  token: string,
  id: string,
  data: RiskAssessmentUpdateData,
): Promise<RiskMonitoring> {
  const response = await api.put<{ data: RiskMonitoring }>(
    `/risk-monitorings/${id}`,
    data,
    token,
  );
  return response.data;
}

export async function finalizeRiskMonitoring(
  token: string,
  id: string,
): Promise<RiskMonitoring> {
  const response = await api.post<{ data: RiskMonitoring }>(
    `/risk-monitorings/${id}/finalize`,
    {},
    token,
  );
  return response.data;
}
```

- [ ] **Step 3: Update monitoring route helpers**

Modify `frontend/src/lib/risk-register-monitoring.ts`:

```ts
export function getMonitoringTransactionHref(
  risk: Pick<RiskRegisterListItem, "id">,
) {
  return `/risk/monitoring/${risk.id}`;
}

export function getMonitoringTransactionActionLabel(
  status?: RiskRegisterListItem["status"] | "draft" | "finalized" | "void",
) {
  if (status === "draft" || status === "assessment_draft" || status === "assessment_in_review") {
    return "Lanjutkan Pemantauan";
  }
  if (status === "finalized" || status === "approved") {
    return "Lihat Hasil Pemantauan";
  }
  return "Mulai Pemantauan";
}
```

- [ ] **Step 4: Add route wrapper**

Create `frontend/src/app/(app)/risk/monitoring/[id]/page.tsx`:

```tsx
import MonitoringAssessmentPage from "@/app/(app)/risk/assessment/[id]/page";

export default function RiskMonitoringPage() {
  return <MonitoringAssessmentPage mode="risk-monitoring-transaction" />;
}
```

If the existing assessment page does not export a component that accepts props, first refactor it minimally:

```tsx
type AssessmentPageMode = "risk-assessment" | "risk-monitoring-transaction";

export default function AssessmentPage({
  mode = "risk-assessment",
}: {
  mode?: AssessmentPageMode;
}) {
  // existing page body
}
```

- [ ] **Step 5: Run frontend helper tests**

Run:

```bash
cd frontend
npm run lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/risk.ts frontend/src/lib/api/risk-monitoring-transaction.ts frontend/src/lib/risk-register-monitoring.ts 'frontend/src/app/(app)/risk/monitoring/[id]/page.tsx' 'frontend/src/app/(app)/risk/assessment/[id]/page.tsx'
git commit -m "feat: route monitoring transactions to existing form"
```

---

### Task 9: Frontend Register And Form Behavior

**Files:**
- Modify: `frontend/src/app/(app)/risk/register/page.tsx`
- Modify: `frontend/src/app/(app)/risk/components/monitoring-transactions-table.tsx`
- Modify: `frontend/src/app/(app)/risk/assessment/[id]/page.tsx`

- [ ] **Step 1: Update start action in register**

In `frontend/src/app/(app)/risk/register/page.tsx`, replace the `/risks/:id/reassess` call in `handleCreateReassessment` for the Pemantauan tab with:

```ts
const result = await startRiskMonitoring(token, {
  sourceRiskId: selectedRiskForReassessment.id,
  assessmentCycle: selectedAssessmentCycle,
});
await refreshRegisterData(token);
router.push(result.redirectUrl);
return result;
```

Use toast copy:

```ts
loading: `Membuat Transaksi Pemantauan ${selectedAssessmentCycle}...`,
success: (result) =>
  result.existingDraft
    ? `Melanjutkan Transaksi Pemantauan ${selectedAssessmentCycle} yang sudah ada.`
    : `Transaksi Pemantauan ${selectedAssessmentCycle} berhasil dibuat.`,
```

- [ ] **Step 2: Make monitoring table labels match statuses**

In `frontend/src/app/(app)/risk/components/monitoring-transactions-table.tsx`:

```tsx
const href = getMonitoringTransactionHref({ id: risk.id });
```

Keep this line, but ensure `risk.id` is now the monitoring transaction ID from backend list.

- [ ] **Step 3: Load transaction in monitoring mode**

In `frontend/src/app/(app)/risk/assessment/[id]/page.tsx`, when `mode === "risk-monitoring-transaction"`:

```ts
const monitoring = await getRiskMonitoring(token, id);
setMonitoringTransaction(monitoring);
setSourceRisk(monitoring.sourceRisk);
setDraftRisk(mapMonitoringToFormRisk(monitoring));
```

Create mapper in the same file or nearby helper:

```ts
function mapMonitoringToFormRisk(monitoring: RiskMonitoring): Risk {
  const source = monitoring.sourceRisk;
  if (!source) {
    throw new Error("Transaksi pemantauan tidak memiliki source risk.");
  }
  return {
    ...source,
    id: monitoring.id,
    status: monitoring.status === "draft" ? "assessment_draft" : "approved",
    probability: monitoring.observedProbability,
    impact: monitoring.observedImpact,
    weight: monitoring.observedWeight,
    nilai: monitoring.observedNilai,
    inherentScore: Math.round(monitoring.observedNilai),
    assessmentCycle: monitoring.assessmentCycle,
    changeReason: monitoring.changeReason,
  };
}
```

- [ ] **Step 4: Save and finalize through monitoring APIs**

When `mode === "risk-monitoring-transaction"`:

```ts
await updateRiskMonitoring(token, id, payload);
```

For finalization:

```ts
const finalized = await finalizeRiskMonitoring(token, id);
toast.success("Pemantauan berhasil difinalisasi.");
if (finalized.resultRiskId) {
  router.push(`/risk/register/${finalized.resultRiskId}`);
}
```

Keep existing `updateRiskAssessment` behavior for `/risk/assessment/[id]`.

- [ ] **Step 5: Add confirmation copy for profile revision mode**

Before finalization, if `monitoringTransaction?.mode === "with_profile_revision"`:

```tsx
<AlertDialogDescription>
  Pemantauan ini juga merevisi profil risiko. Perubahan akan menjadi versi risiko aktif setelah finalisasi.
</AlertDialogDescription>
```

Render changed fields:

```tsx
{monitoringTransaction.profileChangeSummary.length > 0 && (
  <ul className="space-y-1 text-sm text-muted-foreground">
    {monitoringTransaction.profileChangeSummary.map((field) => (
      <li key={field}>{field}</li>
    ))}
  </ul>
)}
```

- [ ] **Step 6: Run frontend verification**

Run:

```bash
cd frontend
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/\(app\)/risk/register/page.tsx frontend/src/app/\(app\)/risk/components/monitoring-transactions-table.tsx frontend/src/app/\(app\)/risk/assessment/\[id\]/page.tsx
git commit -m "feat: use monitoring transactions in risk UI"
```

---

### Task 10: Full Verification

**Files:**
- No new files unless fixes are needed.

- [ ] **Step 1: Run backend tests**

Run:

```bash
cd backend
go test ./...
```

Expected: PASS.

- [ ] **Step 2: Run frontend checks**

Run:

```bash
cd frontend
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 3: Run targeted manual smoke test**

Start backend and frontend using existing project commands:

```bash
cd backend
make run
```

```bash
cd frontend
npm run dev
```

Manual flow:

- Open risk register.
- Select Pemantauan tab.
- Select semester `2026-H1` or `2026-H2`.
- Click `Mulai Pemantauan`.
- Confirm URL is `/risk/monitoring/{risk_monitorings.id}`.
- Save draft and confirm no new risk version appears.
- Finalize and confirm result risk version becomes active/current.
- Return to Pemantauan tab and confirm action is `Lihat Hasil Pemantauan`.
- Open finalized transaction and confirm form is read-only.

- [ ] **Step 4: Commit verification fixes**

If any verification fixes are needed:

```bash
git add backend frontend
git commit -m "fix: stabilize monitoring transaction flow"
```

If no fixes are needed, do not create an empty commit.

---

## Self-Review

Spec coverage:

- Semester-only monitoring is covered by migration checks and start validation.
- `Transaksi Pemantauan` first, no draft risk before finalization, is covered by Task 4 and Task 5.
- Result risk version activation is covered by Task 3 and Task 5.
- Existing frontend form reuse is covered by Task 8 and Task 9.
- Bulk monitoring uses transactions, not draft risks, in Task 7.
- Mitigation progress stays in `mitigation_tasks`; summaries live on `risk_monitorings` in Task 1, Task 4, and Task 7.
- `score_only` versus `with_profile_revision` mode detection is covered by Task 2, Task 4, Task 5, and Task 9.

Placeholder scan:

- No `TBD`, `TODO`, or unspecified implementation steps remain.
- Every task names files, commands, and expected results.

Type consistency:

- Backend uses `RiskMonitoring`, `RiskMonitoringStatus*`, and `RiskMonitoringMode*`.
- Frontend uses `RiskMonitoring`, `RiskMonitoringStatus`, and `RiskMonitoringMode`.
- Route for monitoring transactions is consistently `/risk/monitoring/[id]`.
