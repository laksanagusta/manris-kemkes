# Working Paper Monitoring Results Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the working paper risk-profile table with an evaluation table backed by the matching draft or finalized `risk_monitorings` transaction.

**Architecture:** The working paper repository will select one non-void monitoring transaction for each linked risk using the risk version group and the semester's target quarter (`H1 -> Q2`, `H2 -> Q4`). The API contract will expose a nested monitoring snapshot while retaining the existing flat score fields used by spreadsheet export. A pure frontend row mapper will normalize labels, fallbacks, trends, and actions; a focused table component will render the approved 11-column layout.

**Tech Stack:** Go 1.25, pgx v5, PostgreSQL, Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, shadcn/ui, Node test runner.

---

## File Structure

- Modify `backend/internal/domain/entity/working_paper.go`
  - Define the monitoring snapshot returned with a linked working paper risk.
- Modify `backend/internal/repository/postgres/working_paper.go`
  - Replace periodic-risk lookup with a lateral lookup against `risk_monitorings`.
- Modify `backend/internal/repository/postgres/working_paper_test.go`
  - Test SQL selection rules and database-backed hydration.
- Modify `backend/internal/usecase/workingpaper/get_test.go`
  - Lock down JSON/API contract for draft, finalized, and missing monitoring.
- Modify `frontend/src/types/working-paper.ts`
  - Mirror the nested backend monitoring contract.
- Create `frontend/src/lib/working-paper-monitoring-table.ts`
  - Build presentation rows and expose the stable column contract.
- Create `frontend/src/lib/working-paper-monitoring-table.test.ts`
  - Test score, trend, narrative, status, and action mapping without rendering React.
- Create `frontend/src/app/(app)/risk/working-papers/[id]/working-paper-monitoring-table.tsx`
  - Render the 11-column monitoring evaluation table.
- Modify `frontend/src/app/(app)/risk/working-papers/[id]/page.tsx`
  - Replace the current risk table with the focused monitoring component.

### Task 1: Add the Working Paper Monitoring API Contract

**Files:**
- Modify: `backend/internal/domain/entity/working_paper.go`
- Modify: `backend/internal/usecase/workingpaper/get_test.go`
- Modify: `frontend/src/types/working-paper.ts`

- [ ] **Step 1: Write a failing backend JSON contract test**

Add this test to `backend/internal/usecase/workingpaper/get_test.go`:

```go
func TestWorkingPaperRiskDataMarshalsMonitoringSnapshot(t *testing.T) {
	finalizedAt := time.Date(2026, time.June, 30, 9, 0, 0, 0, time.UTC)
	risk := entity.WorkingPaperRiskData{
		ID:    uuid.New(),
		Code:  "R-001",
		Title: "Gangguan layanan",
		Monitoring: &entity.WorkingPaperRiskMonitoring{
			ID:                          uuid.New(),
			Status:                      entity.RiskMonitoringStatusFinalized,
			AssessmentCycle:             "2026-Q2",
			SourceNilai:                 16,
			ObservedNilai:               12,
			ObservedLevel:               entity.RiskLevelTinggi,
			Trend:                       "down",
			MitigationCompletionPercent: 75,
			MitigationProgressSummary:   "Tiga dari empat aksi selesai",
			EffectivenessConclusion:     "Kontrol cukup efektif",
			ConditionSummary:            "Gangguan menurun",
			EventSummary:                "Satu insiden minor",
			MitigationObstacles:         "Pengadaan terlambat",
			MitigationFollowUp:          "Selesaikan pengadaan",
			FollowUpNote:                "Pantau mingguan",
			UpdatedAt:                   finalizedAt,
			FinalizedAt:                 &finalizedAt,
		},
	}

	payload, err := json.Marshal(risk)
	if err != nil {
		t.Fatalf("Marshal returned error: %v", err)
	}

	var got map[string]any
	if err := json.Unmarshal(payload, &got); err != nil {
		t.Fatalf("Unmarshal returned error: %v", err)
	}
	monitoring, ok := got["monitoring"].(map[string]any)
	if !ok {
		t.Fatalf("expected monitoring object, got %#v", got["monitoring"])
	}
	if monitoring["status"] != entity.RiskMonitoringStatusFinalized {
		t.Fatalf("expected finalized monitoring, got %#v", monitoring["status"])
	}
	if monitoring["assessmentCycle"] != "2026-Q2" {
		t.Fatalf("expected 2026-Q2, got %#v", monitoring["assessmentCycle"])
	}
	if monitoring["mitigationCompletionPercent"] != float64(75) {
		t.Fatalf("expected 75 percent, got %#v", monitoring["mitigationCompletionPercent"])
	}
}
```

- [ ] **Step 2: Run the backend test and verify it fails**

Run:

```bash
cd backend
go test ./internal/usecase/workingpaper -run TestWorkingPaperRiskDataMarshalsMonitoringSnapshot -count=1
```

Expected: compilation fails because `entity.WorkingPaperRiskMonitoring` and `WorkingPaperRiskData.Monitoring` do not exist.

- [ ] **Step 3: Add the backend monitoring snapshot type**

In `backend/internal/domain/entity/working_paper.go`, add:

```go
type WorkingPaperRiskMonitoring struct {
	ID                          uuid.UUID  `json:"id"`
	Status                      string     `json:"status"`
	AssessmentCycle             string     `json:"assessmentCycle"`
	SourceProbability           int        `json:"sourceProbability"`
	SourceImpact                int        `json:"sourceImpact"`
	SourceWeight                float64    `json:"sourceWeight"`
	SourceNilai                 float64    `json:"sourceNilai"`
	SourceLevel                 string     `json:"sourceLevel"`
	ObservedProbability         int        `json:"observedProbability"`
	ObservedImpact              int        `json:"observedImpact"`
	ObservedWeight              float64    `json:"observedWeight"`
	ObservedNilai               float64    `json:"observedNilai"`
	ObservedLevel               string     `json:"observedLevel"`
	Trend                       string     `json:"trend"`
	MitigationCompletionPercent int        `json:"mitigationCompletionPercent"`
	MitigationProgressSummary   string     `json:"mitigationProgressSummary"`
	EffectivenessConclusion     string     `json:"effectivenessConclusion"`
	ConditionSummary            string     `json:"conditionSummary"`
	EventSummary                string     `json:"eventSummary"`
	MitigationObstacles         string     `json:"mitigationObstacles"`
	MitigationFollowUp          string     `json:"mitigationFollowUp"`
	FollowUpNote                string     `json:"followUpNote"`
	StartedAt                   time.Time  `json:"startedAt"`
	UpdatedAt                   time.Time  `json:"updatedAt"`
	FinalizedAt                 *time.Time `json:"finalizedAt,omitempty"`
}
```

Add this field to `WorkingPaperRiskData`:

```go
Monitoring *WorkingPaperRiskMonitoring `json:"monitoring,omitempty"`
```

Keep the existing `MonitoringP`, `MonitoringD`, `MonitoringBobot`,
`MonitoringNilai`, `MonitoringInherentScore`, `MonitoringTingkatRisiko`,
`MonitoringTingkatRisikoDisplay`, `MonitoringSimpulan`, and
`MonitoringEfektivitas` fields. They are still consumed by
`frontend/src/lib/working-paper-export.ts`.

- [ ] **Step 4: Mirror the contract in TypeScript**

In `frontend/src/types/working-paper.ts`, add:

```ts
export interface WorkingPaperRiskMonitoring {
  id: string;
  status: "draft" | "finalized";
  assessmentCycle: string;
  sourceProbability: number;
  sourceImpact: number;
  sourceWeight: number;
  sourceNilai: number;
  sourceLevel: string;
  observedProbability: number;
  observedImpact: number;
  observedWeight: number;
  observedNilai: number;
  observedLevel: string;
  trend: "up" | "down" | "stable";
  mitigationCompletionPercent: number;
  mitigationProgressSummary: string;
  effectivenessConclusion: string;
  conditionSummary: string;
  eventSummary: string;
  mitigationObstacles: string;
  mitigationFollowUp: string;
  followUpNote: string;
  startedAt: string;
  updatedAt: string;
  finalizedAt?: string;
}
```

Add this field to `WorkingPaperRiskData`:

```ts
monitoring?: WorkingPaperRiskMonitoring;
```

- [ ] **Step 5: Run focused contract tests**

Run:

```bash
cd backend
go test ./internal/usecase/workingpaper -run 'TestWorkingPaperRiskDataMarshalsMonitoringSnapshot|TestGetReturnsLinkedRisksInsteadOfSnapshots' -count=1
```

Expected: PASS.

- [ ] **Step 6: Commit the contract**

```bash
git add backend/internal/domain/entity/working_paper.go \
  backend/internal/usecase/workingpaper/get_test.go \
  frontend/src/types/working-paper.ts
git commit -m "feat: add working paper monitoring snapshot"
```

### Task 2: Select the Correct Monitoring Transaction

**Files:**
- Modify: `backend/internal/repository/postgres/working_paper.go`
- Modify: `backend/internal/repository/postgres/working_paper_test.go`

- [ ] **Step 1: Write failing source-level selection tests**

Replace the old periodic monitoring expression test or add these tests in
`backend/internal/repository/postgres/working_paper_test.go`:

```go
func TestWorkingPaperMonitoringExprUsesVersionGroupAndTargetQuarter(t *testing.T) {
	expr := workingPaperMonitoringExpr()

	expected := []string{
		"JOIN risks monitoring_source ON monitoring_source.id = rm.source_risk_id",
		"monitoring_source.version_group_id = risk.version_group_id",
		"rm.assessment_cycle = CASE",
		"RIGHT(wp.assessment_cycle, 2) = 'H1'",
		"THEN LEFT(wp.assessment_cycle, 4) || '-Q2'",
		"RIGHT(wp.assessment_cycle, 2) = 'H2'",
		"THEN LEFT(wp.assessment_cycle, 4) || '-Q4'",
		"rm.status IN ('draft', 'finalized')",
	}
	for _, snippet := range expected {
		if !strings.Contains(expr, snippet) {
			t.Fatalf("expected monitoring expression to contain %q, got:\n%s", snippet, expr)
		}
	}
	if strings.Contains(expr, "rm.status = 'void'") {
		t.Fatalf("monitoring expression must not select void transactions:\n%s", expr)
	}
}

func TestWorkingPaperMonitoringExprPrefersFinalizedThenLatestDraft(t *testing.T) {
	expr := workingPaperMonitoringExpr()

	expected := []string{
		"CASE rm.status WHEN 'finalized' THEN 0 ELSE 1 END",
		"rm.updated_at DESC",
		"rm.id DESC",
		"LIMIT 1",
	}
	for _, snippet := range expected {
		if !strings.Contains(expr, snippet) {
			t.Fatalf("expected monitoring ordering to contain %q, got:\n%s", snippet, expr)
		}
	}
}
```

- [ ] **Step 2: Run the source-level tests and verify they fail**

Run:

```bash
cd backend
go test ./internal/repository/postgres -run 'TestWorkingPaperMonitoringExpr' -count=1
```

Expected: compilation fails because `workingPaperMonitoringExpr` does not exist.

- [ ] **Step 3: Add the lateral monitoring expression**

In `backend/internal/repository/postgres/working_paper.go`, replace
`monitoringRiskExpr` with:

```go
func workingPaperMonitoringExpr() string {
	return `LEFT JOIN LATERAL (
		SELECT rm.*
		FROM risk_monitorings rm
		JOIN risks monitoring_source ON monitoring_source.id = rm.source_risk_id
		WHERE monitoring_source.version_group_id = risk.version_group_id
		  AND rm.assessment_cycle = CASE
			WHEN RIGHT(wp.assessment_cycle, 2) = 'H1'
				THEN LEFT(wp.assessment_cycle, 4) || '-Q2'
			WHEN RIGHT(wp.assessment_cycle, 2) = 'H2'
				THEN LEFT(wp.assessment_cycle, 4) || '-Q4'
			ELSE ''
		  END
		  AND rm.status IN ('draft', 'finalized')
		ORDER BY
		  CASE rm.status WHEN 'finalized' THEN 0 ELSE 1 END,
		  rm.updated_at DESC,
		  rm.id DESC
		LIMIT 1
	) monitoring ON TRUE`
}
```

Alias `working_papers` as `wp` in the risk query:

```sql
FROM working_paper_risks wpr
INNER JOIN working_papers wp ON wp.id = wpr.working_paper_id
INNER JOIN risks risk ON risk.id = wpr.risk_id
```

Append `workingPaperMonitoringExpr()` after the risk and organization joins.

- [ ] **Step 4: Select and scan the nested monitoring fields**

Replace the old `mon_risk.*` score selection with:

```sql
monitoring.id,
COALESCE(monitoring.status, ''),
COALESCE(monitoring.assessment_cycle, ''),
COALESCE(monitoring.source_probability, 0),
COALESCE(monitoring.source_impact, 0),
COALESCE(monitoring.source_weight, 0),
COALESCE(monitoring.source_nilai, 0),
COALESCE(monitoring.source_level, ''),
COALESCE(monitoring.observed_probability, 0),
COALESCE(monitoring.observed_impact, 0),
COALESCE(monitoring.observed_weight, 0),
COALESCE(monitoring.observed_nilai, 0),
COALESCE(monitoring.observed_level, ''),
COALESCE(monitoring.trend, 'stable'),
COALESCE(monitoring.mitigation_completion_percent, 0),
COALESCE(monitoring.mitigation_progress_summary, ''),
COALESCE(monitoring.effectiveness_conclusion, ''),
COALESCE(monitoring.condition_summary, ''),
COALESCE(monitoring.event_summary, ''),
COALESCE(monitoring.mitigation_obstacles, ''),
COALESCE(monitoring.mitigation_follow_up, ''),
COALESCE(monitoring.follow_up_note, ''),
monitoring.started_at,
monitoring.updated_at,
monitoring.finalized_at
```

Use nullable timestamp variables for the left join:

```go
var monitoringID *uuid.UUID
var monitoringStatus, monitoringCycle string
var monitoringSourceProbability, monitoringSourceImpact int
var monitoringSourceWeight, monitoringSourceNilai float64
var monitoringSourceLevel string
var monitoringObservedProbability, monitoringObservedImpact int
var monitoringObservedWeight, monitoringObservedNilai float64
var monitoringObservedLevel, monitoringTrend string
var monitoringCompletionPercent int
var monitoringProgress, monitoringEffectiveness string
var monitoringCondition, monitoringEvent string
var monitoringObstacles, monitoringFollowUp, monitoringFollowUpNote string
var monitoringStartedAt, monitoringUpdatedAt, monitoringFinalizedAt *time.Time
```

After scanning, hydrate both the nested contract and the legacy export fields:

```go
if monitoringID != nil {
	link.Risk.Monitoring = &entity.WorkingPaperRiskMonitoring{
		ID:                          *monitoringID,
		Status:                      monitoringStatus,
		AssessmentCycle:             monitoringCycle,
		SourceProbability:           monitoringSourceProbability,
		SourceImpact:                monitoringSourceImpact,
		SourceWeight:                monitoringSourceWeight,
		SourceNilai:                 monitoringSourceNilai,
		SourceLevel:                 monitoringSourceLevel,
		ObservedProbability:         monitoringObservedProbability,
		ObservedImpact:              monitoringObservedImpact,
		ObservedWeight:              monitoringObservedWeight,
		ObservedNilai:               monitoringObservedNilai,
		ObservedLevel:               monitoringObservedLevel,
		Trend:                       monitoringTrend,
		MitigationCompletionPercent: monitoringCompletionPercent,
		MitigationProgressSummary:   monitoringProgress,
		EffectivenessConclusion:     monitoringEffectiveness,
		ConditionSummary:            monitoringCondition,
		EventSummary:                monitoringEvent,
		MitigationObstacles:         monitoringObstacles,
		MitigationFollowUp:          monitoringFollowUp,
		FollowUpNote:                monitoringFollowUpNote,
		FinalizedAt:                 monitoringFinalizedAt,
	}

	link.Risk.MonitoringP = monitoringObservedProbability
	link.Risk.MonitoringD = monitoringObservedImpact
	link.Risk.MonitoringBobot = monitoringObservedWeight
	link.Risk.MonitoringNilai = monitoringObservedNilai
	link.Risk.MonitoringInherentScore = int(math.Round(monitoringObservedNilai))
	link.Risk.MonitoringTingkatRisiko = monitoringObservedLevel
	link.Risk.MonitoringTingkatRisikoDisplay =
		entity.GetRiskLevelDisplay(monitoringObservedLevel)
	switch monitoringTrend {
	case "up":
		link.Risk.MonitoringSimpulan = "Meningkat"
	case "down":
		link.Risk.MonitoringSimpulan = "Menurun"
	default:
		link.Risk.MonitoringSimpulan = "Tetap"
	}
	link.Risk.MonitoringEfektivitas = monitoringEffectiveness
}
```

Guard the timestamp dereference:

```go
if monitoringStartedAt != nil {
	link.Risk.Monitoring.StartedAt = monitoringStartedAt.UTC()
}
if monitoringUpdatedAt != nil {
	link.Risk.Monitoring.UpdatedAt = monitoringUpdatedAt.UTC()
}
```

Import `math` only if it is not already present.

- [ ] **Step 5: Add a database-backed hydration test**

Add an integration test to `backend/internal/repository/postgres/working_paper_test.go`
using the existing `setupWorkingPaperPool`, organization, and user helpers. Insert:

```go
versionGroupID := uuid.New()
sourceRiskID := uuid.New()
workingPaperID := uuid.New()
monitoringID := uuid.New()

_, err := pool.Exec(ctx, `
	INSERT INTO risks (
		id, code, title, category, status, version_group_id, is_current,
		is_cycle_current, version_number, organization_id, created_by,
		probability, impact, weight, nilai, inherent_score,
		assessment_cycle, review_type
	) VALUES (
		$1, 'R-MON-001', 'Risiko monitoring', 'operasional', 'approved',
		$2, TRUE, TRUE, 1, $3, $4, 4, 4, 1, 16, 16, '2025-H2', 'initial'
	)
`, sourceRiskID, versionGroupID, orgID, userID)
if err != nil {
	t.Fatalf("insert source risk: %v", err)
}

_, err = pool.Exec(ctx, `
	INSERT INTO working_papers (
		id, sequence_no, code, title, org_id, status, assessment_cycle,
		document_hash, current_signatory_sequence, created_by
	) VALUES ($1, 9001, 'WP-9001', 'Kertas Kerja 2026-H1', $2, 'draft',
		'2026-H1', 'hash-monitoring', 0, $3)
`, workingPaperID, orgID, userID)
if err != nil {
	t.Fatalf("insert working paper: %v", err)
}

_, err = pool.Exec(ctx, `
	INSERT INTO working_paper_risks (
		id, working_paper_id, risk_id, sort_order, source_mode
	) VALUES ($1, $2, $3, 0, 'review_periodic')
`, uuid.New(), workingPaperID, sourceRiskID)
if err != nil {
	t.Fatalf("insert working paper risk: %v", err)
}

_, err = pool.Exec(ctx, `
	INSERT INTO risk_monitorings (
		id, source_risk_id, assessment_cycle, status, mode,
		source_probability, source_impact, source_weight, source_nilai,
		source_level, source_version_number, observed_probability,
		observed_impact, observed_weight, observed_nilai, observed_level,
		trend, mitigation_completion_percent, mitigation_progress_summary,
		effectiveness_conclusion, condition_summary, event_summary,
		mitigation_obstacles, mitigation_follow_up, follow_up_note,
		draft_payload
	) VALUES (
		$1, $2, '2026-Q2', 'draft', 'score_only',
		4, 4, 1, 16, 'tinggi', 1, 3, 4, 1, 12, 'tinggi',
		'down', 75, 'Tiga aksi selesai', 'Cukup efektif',
		'Kondisi membaik', 'Satu insiden minor', 'Pengadaan terlambat',
		'Selesaikan pengadaan', 'Pantau mingguan', '{}'::jsonb
	)
`, monitoringID, sourceRiskID)
if err != nil {
	t.Fatalf("insert monitoring: %v", err)
}
```

Register cleanup in reverse dependency order. Then assert:

```go
got, err := repo.GetByID(ctx, workingPaperID)
if err != nil {
	t.Fatalf("GetByID returned error: %v", err)
}
if len(got.Risks) != 1 || got.Risks[0].Risk.Monitoring == nil {
	t.Fatalf("expected one hydrated monitoring, got %#v", got.Risks)
}
monitoring := got.Risks[0].Risk.Monitoring
if monitoring.ID != monitoringID || monitoring.Status != "draft" {
	t.Fatalf("unexpected monitoring identity/status: %#v", monitoring)
}
if monitoring.AssessmentCycle != "2026-Q2" || monitoring.ObservedNilai != 12 {
	t.Fatalf("unexpected monitoring cycle/score: %#v", monitoring)
}
if monitoring.MitigationCompletionPercent != 75 {
	t.Fatalf("unexpected progress: %#v", monitoring)
}
```

Also insert a `2026-Q1` finalized monitoring and a `2026-Q2` void monitoring in
separate subtests to prove they are ignored. A second eligible finalized `2026-Q2`
row should be selected ahead of the draft.

- [ ] **Step 6: Run repository tests**

Run:

```bash
cd backend
go test ./internal/repository/postgres -run 'TestWorkingPaperMonitoring|TestWorkingPaperRepositoryHydratesMonitoring' -count=1
```

Expected: PASS. Database-backed tests may report SKIP when `DATABASE_URL` is unset.

- [ ] **Step 7: Run all working paper backend tests**

Run:

```bash
cd backend
go test ./internal/usecase/workingpaper ./internal/repository/postgres -count=1
```

Expected: PASS, with database-dependent tests either PASS or SKIP.

- [ ] **Step 8: Commit repository hydration**

```bash
git add backend/internal/repository/postgres/working_paper.go \
  backend/internal/repository/postgres/working_paper_test.go
git commit -m "feat: hydrate working paper monitoring results"
```

### Task 3: Build a Tested Frontend Row Model

**Files:**
- Create: `frontend/src/lib/working-paper-monitoring-table.ts`
- Create: `frontend/src/lib/working-paper-monitoring-table.test.ts`

- [ ] **Step 1: Write failing row-model tests**

Create `frontend/src/lib/working-paper-monitoring-table.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

const tableLib = await import(
  new URL("./working-paper-monitoring-table", import.meta.url).href,
);

const {
  WORKING_PAPER_MONITORING_COLUMNS,
  buildWorkingPaperMonitoringRow,
} = tableLib as typeof import("./working-paper-monitoring-table");

type WorkingPaperRiskData =
  import("@/types/working-paper").WorkingPaperRiskData;

function makeRisk(
  overrides: Partial<WorkingPaperRiskData> = {},
): WorkingPaperRiskData {
  return {
    id: "risk-1",
    code: "R-001",
    title: "Gangguan layanan",
    category: "operasional",
    status: "approved",
    probability: 4,
    impact: 4,
    bobot: 1,
    nilai: 16,
    inherentScore: 16,
    tingkat_risiko: "tinggi",
    prioritas_risiko: 1,
    ...overrides,
  };
}

test("working paper monitoring table keeps the approved 11-column order", () => {
  assert.deepEqual(WORKING_PAPER_MONITORING_COLUMNS.map((column) => column.key), [
    "code",
    "risk",
    "score",
    "trend",
    "progress",
    "effectiveness",
    "condition",
    "obstacles",
    "followUp",
    "status",
    "action",
  ]);
});

test("buildWorkingPaperMonitoringRow maps a draft evaluation", () => {
  const row = buildWorkingPaperMonitoringRow(
    makeRisk({
      monitoring: {
        id: "monitoring-1",
        status: "draft",
        assessmentCycle: "2026-Q2",
        sourceProbability: 4,
        sourceImpact: 4,
        sourceWeight: 1,
        sourceNilai: 16,
        sourceLevel: "tinggi",
        observedProbability: 3,
        observedImpact: 4,
        observedWeight: 1,
        observedNilai: 12,
        observedLevel: "tinggi",
        trend: "down",
        mitigationCompletionPercent: 75,
        mitigationProgressSummary: "Tiga aksi selesai",
        effectivenessConclusion: "Cukup efektif",
        conditionSummary: "Kondisi membaik",
        eventSummary: "Satu insiden minor",
        mitigationObstacles: "Pengadaan terlambat",
        mitigationFollowUp: "Selesaikan pengadaan",
        followUpNote: "Pantau mingguan",
        startedAt: "2026-06-01T08:00:00Z",
        updatedAt: "2026-06-10T08:00:00Z",
      },
    }),
  );

  assert.equal(row.sourceScore, 16);
  assert.equal(row.observedScore, 12);
  assert.equal(row.observedLevelLabel, "Tinggi");
  assert.equal(row.trendLabel, "Menurun");
  assert.equal(row.progressPercent, 75);
  assert.equal(row.condition, "Kondisi membaik\nSatu insiden minor");
  assert.equal(row.followUp, "Selesaikan pengadaan");
  assert.equal(row.statusLabel, "Draft");
  assert.equal(row.actionLabel, "Lanjutkan monitoring");
  assert.equal(row.actionHref, "/risk/monitoring/monitoring-1");
});

test("buildWorkingPaperMonitoringRow falls back for unmonitored risks", () => {
  const row = buildWorkingPaperMonitoringRow(makeRisk());

  assert.equal(row.sourceScore, 16);
  assert.equal(row.observedScore, null);
  assert.equal(row.trendLabel, "-");
  assert.equal(row.progressSummary, "-");
  assert.equal(row.condition, "-");
  assert.equal(row.obstacles, "-");
  assert.equal(row.followUp, "-");
  assert.equal(row.statusLabel, "Belum Dimonitor");
  assert.equal(row.actionLabel, null);
  assert.equal(row.actionHref, null);
});

test("buildWorkingPaperMonitoringRow uses general follow-up as fallback", () => {
  const row = buildWorkingPaperMonitoringRow(
    makeRisk({
      monitoring: {
        id: "monitoring-2",
        status: "finalized",
        assessmentCycle: "2026-Q2",
        sourceProbability: 4,
        sourceImpact: 4,
        sourceWeight: 1,
        sourceNilai: 16,
        sourceLevel: "tinggi",
        observedProbability: 4,
        observedImpact: 4,
        observedWeight: 1,
        observedNilai: 16,
        observedLevel: "tinggi",
        trend: "stable",
        mitigationCompletionPercent: 100,
        mitigationProgressSummary: "",
        effectivenessConclusion: "",
        conditionSummary: "",
        eventSummary: "",
        mitigationObstacles: "",
        mitigationFollowUp: "",
        followUpNote: "Pertahankan kontrol",
        startedAt: "2026-06-01T08:00:00Z",
        updatedAt: "2026-06-30T08:00:00Z",
        finalizedAt: "2026-06-30T08:00:00Z",
      },
    }),
  );

  assert.equal(row.trendLabel, "Tetap");
  assert.equal(row.followUp, "Pertahankan kontrol");
  assert.equal(row.statusLabel, "Final");
  assert.equal(row.actionLabel, "Lihat monitoring");
});
```

- [ ] **Step 2: Run the frontend test and verify it fails**

Run:

```bash
cd frontend
npm test -- --test-name-pattern='working paper monitoring table|buildWorkingPaperMonitoringRow'
```

Expected: FAIL because `working-paper-monitoring-table.ts` does not exist.

- [ ] **Step 3: Implement the pure row mapper**

Create `frontend/src/lib/working-paper-monitoring-table.ts`:

```ts
import type { WorkingPaperRiskData } from "@/types/working-paper";

export const WORKING_PAPER_MONITORING_COLUMNS = [
  { key: "code", label: "Kode" },
  { key: "risk", label: "Risiko" },
  { key: "score", label: "Skor Awal -> Aktual" },
  { key: "trend", label: "Tren" },
  { key: "progress", label: "Progres Mitigasi" },
  { key: "effectiveness", label: "Efektivitas" },
  { key: "condition", label: "Kondisi/Hasil Monitoring" },
  { key: "obstacles", label: "Hambatan" },
  { key: "followUp", label: "Tindak Lanjut" },
  { key: "status", label: "Status" },
  { key: "action", label: "Aksi" },
] as const;

export type WorkingPaperMonitoringRow = {
  id: string;
  code: string;
  title: string;
  versionNumber?: number;
  sourceScore: number;
  observedScore: number | null;
  observedLevelLabel: string;
  trend: "up" | "down" | "stable" | null;
  trendLabel: string;
  progressPercent: number | null;
  progressSummary: string;
  effectiveness: string;
  condition: string;
  obstacles: string;
  followUp: string;
  status: "draft" | "finalized" | "unmonitored";
  statusLabel: string;
  actionLabel: string | null;
  actionHref: string | null;
};

const levelLabels: Record<string, string> = {
  sangat_rendah: "Sangat Rendah",
  rendah: "Rendah",
  sedang: "Sedang",
  tinggi: "Tinggi",
  sangat_tinggi: "Sangat Tinggi",
};

function textOrDash(value?: string | null) {
  const normalized = value?.trim();
  return normalized || "-";
}

function combineNarrative(...values: Array<string | undefined>) {
  const present = values.map((value) => value?.trim()).filter(Boolean);
  return present.length > 0 ? present.join("\n") : "-";
}

function baselineScore(risk: WorkingPaperRiskData) {
  if (risk.monitoring?.sourceNilai != null) {
    return risk.monitoring.sourceNilai;
  }
  if (risk.inherentScore != null && risk.inherentScore > 0) {
    return risk.inherentScore;
  }
  return Math.round(risk.nilai ?? 0);
}

export function buildWorkingPaperMonitoringRow(
  risk: WorkingPaperRiskData,
): WorkingPaperMonitoringRow {
  const monitoring = risk.monitoring;
  if (!monitoring) {
    return {
      id: risk.id,
      code: risk.code || "-",
      title: risk.title || "-",
      versionNumber: risk.versionNumber,
      sourceScore: baselineScore(risk),
      observedScore: null,
      observedLevelLabel: "-",
      trend: null,
      trendLabel: "-",
      progressPercent: null,
      progressSummary: "-",
      effectiveness: "-",
      condition: "-",
      obstacles: "-",
      followUp: "-",
      status: "unmonitored",
      statusLabel: "Belum Dimonitor",
      actionLabel: null,
      actionHref: null,
    };
  }

  const trendLabels = {
    up: "Meningkat",
    down: "Menurun",
    stable: "Tetap",
  } as const;

  return {
    id: risk.id,
    code: risk.code || "-",
    title: risk.title || "-",
    versionNumber: risk.versionNumber,
    sourceScore: baselineScore(risk),
    observedScore: monitoring.observedNilai,
    observedLevelLabel:
      levelLabels[monitoring.observedLevel] ||
      textOrDash(monitoring.observedLevel),
    trend: monitoring.trend,
    trendLabel: trendLabels[monitoring.trend],
    progressPercent: monitoring.mitigationCompletionPercent,
    progressSummary: textOrDash(monitoring.mitigationProgressSummary),
    effectiveness: textOrDash(monitoring.effectivenessConclusion),
    condition: combineNarrative(
      monitoring.conditionSummary,
      monitoring.eventSummary,
    ),
    obstacles: textOrDash(monitoring.mitigationObstacles),
    followUp: textOrDash(
      monitoring.mitigationFollowUp || monitoring.followUpNote,
    ),
    status: monitoring.status,
    statusLabel: monitoring.status === "draft" ? "Draft" : "Final",
    actionLabel:
      monitoring.status === "draft"
        ? "Lanjutkan monitoring"
        : "Lihat monitoring",
    actionHref: `/risk/monitoring/${monitoring.id}`,
  };
}
```

- [ ] **Step 4: Run the row-model tests**

Run:

```bash
cd frontend
npm test -- --test-name-pattern='working paper monitoring table|buildWorkingPaperMonitoringRow'
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit the row model**

```bash
git add frontend/src/lib/working-paper-monitoring-table.ts \
  frontend/src/lib/working-paper-monitoring-table.test.ts
git commit -m "feat: map working paper monitoring rows"
```

### Task 4: Render the Monitoring Evaluation Table

**Files:**
- Create: `frontend/src/app/(app)/risk/working-papers/[id]/working-paper-monitoring-table.tsx`
- Modify: `frontend/src/app/(app)/risk/working-papers/[id]/page.tsx`

- [ ] **Step 1: Create the focused table component**

Create
`frontend/src/app/(app)/risk/working-papers/[id]/working-paper-monitoring-table.tsx`
with:

```tsx
"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getLinearStatusBadgeClass } from "@/lib/linear-status-badge";
import {
  WORKING_PAPER_MONITORING_COLUMNS,
  buildWorkingPaperMonitoringRow,
  type WorkingPaperMonitoringRow,
} from "@/lib/working-paper-monitoring-table";
import { cn } from "@/lib/utils";
import type { WorkingPaperRiskLink } from "@/types/working-paper";

const levelBadgeVariant: Record<string, string> = {
  "Sangat Rendah": "bg-green-100 text-green-700 border-green-200",
  Rendah: "bg-risk-low/15 text-risk-low border-risk-low/20",
  Sedang: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  Tinggi: "bg-risk-high/15 text-risk-high border-risk-high/20",
  "Sangat Tinggi":
    "bg-risk-extreme/15 text-risk-extreme border-risk-extreme/20",
};

function NarrativeCell({ value }: { value: string }) {
  if (value === "-") {
    return <span className="text-zinc-400">-</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block max-w-[220px] whitespace-pre-line line-clamp-2 text-xs leading-5 text-zinc-600">
          {value}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-sm whitespace-pre-line">
        {value}
      </TooltipContent>
    </Tooltip>
  );
}

function TrendCell({ row }: { row: WorkingPaperMonitoringRow }) {
  const Icon =
    row.trend === "up"
      ? ArrowUpRight
      : row.trend === "down"
        ? ArrowDownRight
        : row.trend === "stable"
          ? Minus
          : null;

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-zinc-600">
      {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
      {row.trendLabel}
    </span>
  );
}

export function WorkingPaperMonitoringTable({
  links,
}: {
  links: WorkingPaperRiskLink[];
}) {
  const rows = links.map((link) => buildWorkingPaperMonitoringRow(link.risk));

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[1900px]">
        <TableHeader>
          <TableRow className="border-zinc-200/80 hover:bg-transparent">
            {WORKING_PAPER_MONITORING_COLUMNS.map((column) => (
              <TableHead
                key={column.key}
                className="whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500"
              >
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="h-24">
                <div className="flex flex-col gap-1 text-left">
                  <p className="text-sm font-medium text-muted-foreground">
                    Belum ada risiko
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Dokumen ini belum memuat risiko apa pun
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                className="border-zinc-200/80 transition-colors hover:bg-zinc-50/70"
              >
                <TableCell className="px-2.5 font-mono text-xs text-zinc-600">
                  <span className="flex items-center gap-1.5">
                    {row.code}
                    {row.versionNumber != null && row.versionNumber > 1 ? (
                      <Badge className="h-5 border-zinc-200 bg-zinc-50 px-1.5 text-[10px] text-zinc-600">
                        v{row.versionNumber}
                      </Badge>
                    ) : null}
                  </span>
                </TableCell>
                <TableCell className="max-w-[260px] px-2.5">
                  <span className="line-clamp-2 text-xs font-medium text-foreground">
                    {row.title}
                  </span>
                </TableCell>
                <TableCell className="px-2.5">
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="font-mono text-xs font-semibold text-zinc-900">
                      {row.sourceScore}
                      {row.observedScore == null ? "" : ` -> ${row.observedScore}`}
                    </span>
                    {row.observedScore != null ? (
                      <Badge
                        className={cn(
                          "h-5 border px-1.5 text-[10px] font-semibold",
                          levelBadgeVariant[row.observedLevelLabel],
                        )}
                      >
                        {row.observedLevelLabel}
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="px-2.5">
                  <TrendCell row={row} />
                </TableCell>
                <TableCell className="px-2.5">
                  <div className="min-w-[180px] space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-zinc-600">{row.progressSummary}</span>
                      <span className="font-mono font-semibold text-zinc-900">
                        {row.progressPercent == null ? "-" : `${row.progressPercent}%`}
                      </span>
                    </div>
                    {row.progressPercent != null ? (
                      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${row.progressPercent}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="px-2.5">
                  <NarrativeCell value={row.effectiveness} />
                </TableCell>
                <TableCell className="px-2.5">
                  <NarrativeCell value={row.condition} />
                </TableCell>
                <TableCell className="px-2.5">
                  <NarrativeCell value={row.obstacles} />
                </TableCell>
                <TableCell className="px-2.5">
                  <NarrativeCell value={row.followUp} />
                </TableCell>
                <TableCell className="px-2.5">
                  <Badge
                    className={cn(
                      "h-5 border px-1.5 text-[10px] font-medium",
                      row.status === "draft"
                        ? getLinearStatusBadgeClass("draft")
                        : row.status === "finalized"
                          ? getLinearStatusBadgeClass("completed")
                          : "border-zinc-200 bg-zinc-50 text-zinc-600",
                    )}
                  >
                    {row.statusLabel}
                  </Badge>
                </TableCell>
                <TableCell className="px-2.5 text-right">
                  {row.actionHref && row.actionLabel ? (
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-auto whitespace-nowrap px-2 py-1 text-primary hover:text-primary"
                    >
                      <Link href={row.actionHref}>
                        {row.actionLabel}
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  ) : (
                    <span className="text-xs text-zinc-400">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 2: Replace the inline risk table on the detail page**

In `frontend/src/app/(app)/risk/working-papers/[id]/page.tsx`:

1. Import:

```tsx
import { WorkingPaperMonitoringTable } from "./working-paper-monitoring-table";
```

2. Remove imports used only by the old inline table:

```tsx
Table,
TableBody,
TableCell,
TableHead,
TableHeader,
TableRow,
ArrowRight,
resolveWorkingPaperRiskDisplay,
```

3. Remove `levelBadgeVariant` and `formatWorkingPaperRiskStatus` if no longer used
elsewhere in the page.

4. Keep the existing approval progress summary above the table.

5. Replace the entire `<div className="overflow-x-auto">...</div>` risk table with:

```tsx
<WorkingPaperMonitoringTable links={data.risks ?? []} />
```

- [ ] **Step 3: Run frontend unit tests**

Run:

```bash
cd frontend
npm test
```

Expected: all Node-based frontend tests PASS.

- [ ] **Step 4: Run lint**

Run:

```bash
cd frontend
npm run lint
```

Expected: PASS with no new lint errors.

- [ ] **Step 5: Run the production build**

Run:

```bash
cd frontend
npm run build
```

Expected: Next.js production build succeeds.

- [ ] **Step 6: Verify the page visually**

Start the frontend if it is not already running:

```bash
cd frontend
npm run dev
```

Use the Browser plugin to open a real working paper detail URL and verify:

- all 11 headers appear in the approved order;
- horizontal scrolling works at laptop width;
- draft and finalized badges are visually distinct;
- unmonitored risks remain visible;
- narrative cells clamp to two lines and show full tooltip content;
- score, trend, progress, and action link match the monitoring transaction;
- no regression occurs in approval summary, signing controls, or export button.

- [ ] **Step 7: Commit the table UI**

```bash
git add 'frontend/src/app/(app)/risk/working-papers/[id]/working-paper-monitoring-table.tsx' \
  'frontend/src/app/(app)/risk/working-papers/[id]/page.tsx'
git commit -m "feat: show monitoring evaluation in working paper"
```

### Task 5: Full Verification

**Files:**
- Verify only; no planned file changes.

- [ ] **Step 1: Format and test the backend**

Run:

```bash
cd backend
gofmt -w internal/domain/entity/working_paper.go \
  internal/repository/postgres/working_paper.go \
  internal/repository/postgres/working_paper_test.go \
  internal/usecase/workingpaper/get_test.go
go test ./internal/usecase/workingpaper ./internal/repository/postgres -count=1
go test ./... -count=1
```

Expected: formatting produces no unintended diff; all backend tests PASS or
database-dependent tests SKIP only when `DATABASE_URL` is unavailable.

- [ ] **Step 2: Test and build the frontend**

Run:

```bash
cd frontend
npm test
npm run lint
npm run build
```

Expected: all commands PASS.

- [ ] **Step 3: Confirm export compatibility**

Run:

```bash
cd frontend
rg -n 'monitoring_(p|d|bobot|nilai|inherent_score|tingkat_risiko|simpulan|efektivitas)' \
  src/lib/working-paper-export.ts src/types/working-paper.ts
```

Expected: the existing flat export fields remain declared and consumed; no export
column or sheet format was removed.

- [ ] **Step 4: Inspect the final scoped diff**

Run:

```bash
git diff --check
git status --short
git diff -- backend/internal/domain/entity/working_paper.go \
  backend/internal/repository/postgres/working_paper.go \
  backend/internal/repository/postgres/working_paper_test.go \
  backend/internal/usecase/workingpaper/get_test.go \
  frontend/src/types/working-paper.ts \
  frontend/src/lib/working-paper-monitoring-table.ts \
  frontend/src/lib/working-paper-monitoring-table.test.ts \
  'frontend/src/app/(app)/risk/working-papers/[id]/working-paper-monitoring-table.tsx' \
  'frontend/src/app/(app)/risk/working-papers/[id]/page.tsx'
```

Expected: no whitespace errors and no unrelated changes in the scoped diff. Existing
user changes elsewhere in the dirty worktree remain untouched.
