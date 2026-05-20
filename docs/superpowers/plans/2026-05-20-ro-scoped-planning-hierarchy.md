# RO-Scoped Planning Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace flat `Sasaran & IKU` objective linkage with a ministry-managed planning hierarchy where risks attach to scoped, period-frozen `RO` records.

**Architecture:** Introduce normalized planning hierarchy tables and backend modules as the new source of truth, keep legacy `risk_objectives` surfaces alive through a compatibility read model, then move risk creation and document intelligence onto `RO` selection. Roll out in slices so backend schema, API compatibility, risk linkage, and frontend UX stay releasable at every checkpoint.

**Tech Stack:** Go 1.25 + Fiber + pgx + PostgreSQL migrations, Next.js 16 + React 19 + TypeScript + React Hook Form + Zod

---

## File Structure

### Backend files to create

- `backend/db/migrations/000057_planning_hierarchy.up.sql`
- `backend/db/migrations/000057_planning_hierarchy.down.sql`
- `backend/db/migrations/000058_risks_add_ro_id.up.sql`
- `backend/db/migrations/000058_risks_add_ro_id.down.sql`
- `backend/internal/domain/entity/planning_goal.go`
- `backend/internal/domain/entity/planning_goal_test.go`
- `backend/internal/domain/entity/planning_objective.go`
- `backend/internal/domain/entity/planning_iku.go`
- `backend/internal/domain/entity/planning_program.go`
- `backend/internal/domain/entity/planning_activity.go`
- `backend/internal/domain/entity/planning_ro.go`
- `backend/internal/domain/entity/planning_ro_scope.go`
- `backend/internal/domain/repository/planning_hierarchy.go`
- `backend/internal/repository/postgres/planning_hierarchy.go`
- `backend/internal/repository/postgres/planning_hierarchy_test.go`
- `backend/internal/usecase/planning/list_ro_options.go`
- `backend/internal/usecase/planning/list_ro_options_test.go`
- `backend/internal/usecase/planning/list_objective_compatibility.go`
- `backend/internal/usecase/planning/list_objective_compatibility_test.go`
- `backend/internal/handler/http/planning_hierarchy.go`
- `backend/internal/handler/http/planning_hierarchy_test.go`

### Backend files to modify

- `backend/internal/domain/entity/risk.go`
- `backend/internal/domain/repository/risk_objective.go`
- `backend/internal/repository/postgres/risk.go`
- `backend/internal/repository/postgres/risk_objective.go`
- `backend/internal/usecase/risk/create.go`
- `backend/internal/usecase/risk/update.go`
- `backend/internal/usecase/ai/document_intelligence.go`
- `backend/internal/usecase/ai/document_intelligence_test.go`
- `backend/internal/bootstrap/bootstrap.go`
- `backend/cmd/server/main.go`

### Frontend files to create

- `frontend/src/types/planning.ts`
- `frontend/src/lib/api/planning.ts`
- `frontend/src/lib/api/planning.test.ts`
- `frontend/src/components/risk/ro-picker.tsx`
- `frontend/src/components/risk/ro-picker.test.tsx`
- `frontend/src/app/(app)/management/planning/page.tsx`
- `frontend/src/app/(app)/management/planning/[id]/page.tsx`

### Frontend files to modify

- `frontend/src/types/risk.ts`
- `frontend/src/types/risk-objective.ts`
- `frontend/src/types/document-intelligence.ts`
- `frontend/src/lib/document-intelligence-prefill.ts`
- `frontend/src/lib/api/risk-objectives.ts`
- `frontend/src/components/risk/objective-picker.tsx`
- `frontend/src/app/(app)/management/objectives/page.tsx`
- `frontend/src/app/(app)/management/objectives/[id]/page.tsx`
- `frontend/src/app/(app)/risk/register/new/page.tsx`
- `frontend/src/app/(app)/intelligence/document/page.tsx`
- `frontend/src/lib/app-navigation.ts`

### Boundary notes

- New hierarchy writes belong in `planning_*` backend modules only.
- `risk_objectives` becomes compatibility read logic, not the source of truth.
- Risk form selection logic moves from `ObjectivePicker` to `ROPicker`.
- Document intelligence strategic mode continues to show flattened summaries, but the canonical target becomes `RO`.

## Task 1: Add Planning Hierarchy Schema

**Files:**
- Create: `backend/db/migrations/000057_planning_hierarchy.up.sql`
- Create: `backend/db/migrations/000057_planning_hierarchy.down.sql`
- Create: `backend/db/migrations/000058_risks_add_ro_id.up.sql`
- Create: `backend/db/migrations/000058_risks_add_ro_id.down.sql`
- Test: `backend/internal/repository/postgres/planning_hierarchy_test.go`

- [x] **Step 1: Write the failing migration-backed repository test**

```go
func TestPlanningHierarchyScopeFiltering(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	pool := openTestPool(t)
	repo := NewPlanningHierarchyRepository(pool)

	satkerA := seedOrganization(t, pool, "BKK A")
	satkerB := seedOrganization(t, pool, "BKK B")
	period := "2027"

	roAll := seedPlanningRO(t, pool, period, "RO nasional", "all_satker", nil)
	roScoped := seedPlanningRO(t, pool, period, "RO khusus BKK A", "explicit_satker_list", []uuid.UUID{satkerA})

	items, err := repo.ListROOptions(ctx, repository.PlanningROOptionFilter{
		OrganizationID: satkerB,
		Period:         period,
	})
	if err != nil {
		t.Fatalf("ListROOptions returned error: %v", err)
	}

	got := collectROIDs(items)
	if slices.Contains(got, roScoped) {
		t.Fatalf("scoped RO leaked to satker B: %v", got)
	}
	if !slices.Contains(got, roAll) {
		t.Fatalf("global RO missing from satker B results: %v", got)
	}
}
```

- [x] **Step 2: Run the repository package test and verify it fails**

Run: `go test ./internal/repository/postgres -run TestPlanningHierarchyScopeFiltering -v`
Expected: FAIL with missing `PlanningHierarchyRepository` symbols and missing planning tables.

- [x] **Step 3: Create the schema migrations with normalized hierarchy + `ro_id`**

```sql
CREATE TABLE IF NOT EXISTS planning_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planning_objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES planning_goals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS planning_ikus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objective_id UUID NOT NULL REFERENCES planning_objectives(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target TEXT NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS planning_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iku_id UUID NOT NULL REFERENCES planning_ikus(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS planning_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES planning_programs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS planning_ros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES planning_activities(id) ON DELETE CASCADE,
    period TEXT NOT NULL,
    title TEXT NOT NULL,
    scope_mode TEXT NOT NULL CHECK (scope_mode IN ('all_satker', 'satker_group', 'explicit_satker_list')),
    freeze_status TEXT NOT NULL DEFAULT 'draft' CHECK (freeze_status IN ('draft', 'active', 'frozen', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planning_ro_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ro_id UUID NOT NULL REFERENCES planning_ros(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    organization_category TEXT NOT NULL DEFAULT '',
    UNIQUE (ro_id, organization_id, organization_category)
);

ALTER TABLE risks ADD COLUMN IF NOT EXISTS ro_id UUID REFERENCES planning_ros(id);
CREATE INDEX IF NOT EXISTS idx_planning_ros_period ON planning_ros(period);
CREATE INDEX IF NOT EXISTS idx_planning_ro_scopes_ro_id ON planning_ro_scopes(ro_id);
CREATE INDEX IF NOT EXISTS idx_risks_ro_id ON risks(ro_id);
```

- [x] **Step 4: Run the repository package test and verify the schema passes setup**

Run: `go test ./internal/repository/postgres -run TestPlanningHierarchyScopeFiltering -v`
Expected: FAIL with repository implementation still missing, but no SQL migration errors.

- [ ] **Step 5: Commit the schema-only checkpoint**

```bash
git add backend/db/migrations/000057_planning_hierarchy.* backend/db/migrations/000058_risks_add_ro_id.* backend/internal/repository/postgres/planning_hierarchy_test.go
git commit -m "feat: add planning hierarchy schema"
```

## Task 2: Add Planning Domain Entities and Repository Contracts

**Files:**
- Create: `backend/internal/domain/entity/planning_goal.go`
- Create: `backend/internal/domain/entity/planning_goal_test.go`
- Create: `backend/internal/domain/entity/planning_objective.go`
- Create: `backend/internal/domain/entity/planning_iku.go`
- Create: `backend/internal/domain/entity/planning_program.go`
- Create: `backend/internal/domain/entity/planning_activity.go`
- Create: `backend/internal/domain/entity/planning_ro.go`
- Create: `backend/internal/domain/entity/planning_ro_scope.go`
- Create: `backend/internal/domain/repository/planning_hierarchy.go`

- [x] **Step 1: Write the failing entity validation test**

```go
func TestPlanningROValidate(t *testing.T) {
	t.Parallel()

	valid := PlanningRO{
		ActivityID:   uuid.MustParse("11111111-1111-1111-1111-111111111111"),
		Period:       "2027",
		Title:        "RO peningkatan cakupan",
		ScopeMode:    PlanningROScopeExplicitSatkerList,
		FreezeStatus: PlanningROFreezeDraft,
	}
	if err := valid.Validate(); err != nil {
		t.Fatalf("expected valid RO, got error: %v", err)
	}

	invalid := valid
	invalid.ScopeMode = "weird"
	if err := invalid.Validate(); err == nil {
		t.Fatal("expected invalid scope mode error")
	}
}
```

- [x] **Step 2: Run the entity test and verify it fails**

Run: `go test ./internal/domain/entity -run TestPlanningROValidate -v`
Expected: FAIL with undefined `PlanningRO`.

- [x] **Step 3: Add the entity and repository contract types**

```go
type PlanningROScopeMode string

const (
	PlanningROScopeAllSatker          PlanningROScopeMode = "all_satker"
	PlanningROScopeSatkerGroup        PlanningROScopeMode = "satker_group"
	PlanningROScopeExplicitSatkerList PlanningROScopeMode = "explicit_satker_list"
)

type PlanningRO struct {
	ID           uuid.UUID
	ActivityID   uuid.UUID
	Period       string
	Title        string
	ScopeMode    PlanningROScopeMode
	FreezeStatus string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type PlanningROOption struct {
	ROID          uuid.UUID `json:"roId"`
	ROTitle       string    `json:"roTitle"`
	KegiatanTitle string    `json:"kegiatanTitle"`
	ProgramTitle  string    `json:"programTitle"`
	IKUTitle      string    `json:"ikuTitle"`
	SasaranTitle  string    `json:"sasaranTitle"`
	TujuanTitle   string    `json:"tujuanTitle"`
	Period        string    `json:"period"`
}

type PlanningHierarchyRepository interface {
	ListROOptions(ctx context.Context, filter PlanningROOptionFilter) ([]entity.PlanningROOption, error)
	ListObjectiveCompatibilityRows(ctx context.Context, filter PlanningCompatibilityFilter) ([]entity.RiskObjectiveCompatibilityRow, int, error)
}
```

- [x] **Step 4: Run the entity test and verify it passes**

Run: `go test ./internal/domain/entity -run TestPlanningROValidate -v`
Expected: PASS

- [ ] **Step 5: Commit the domain contract checkpoint**

```bash
git add backend/internal/domain/entity/planning_*.go backend/internal/domain/entity/planning_goal_test.go backend/internal/domain/repository/planning_hierarchy.go
git commit -m "feat: add planning hierarchy domain contracts"
```

## Task 3: Implement Postgres Planning Repository and Read APIs

**Files:**
- Create: `backend/internal/repository/postgres/planning_hierarchy.go`
- Create: `backend/internal/usecase/planning/list_ro_options.go`
- Create: `backend/internal/usecase/planning/list_ro_options_test.go`
- Create: `backend/internal/handler/http/planning_hierarchy.go`
- Create: `backend/internal/handler/http/planning_hierarchy_test.go`
- Modify: `backend/internal/bootstrap/bootstrap.go`
- Modify: `backend/cmd/server/main.go`

- [x] **Step 1: Write the failing use case test for RO option filtering**

```go
func TestListROOptionsUseCase_ReturnsHierarchySummary(t *testing.T) {
	t.Parallel()

	repo := &fakePlanningRepo{
		items: []entity.PlanningROOption{
			{
				ROTitle:       "RO A",
				KegiatanTitle: "Kegiatan A",
				ProgramTitle:  "Program A",
				IKUTitle:      "IKU A",
				SasaranTitle:  "Sasaran A",
				TujuanTitle:   "Tujuan A",
				Period:        "2027",
			},
		},
	}

	uc := NewListROOptionsUseCase(repo)
	result, err := uc.Execute(context.Background(), ListROOptionsInput{Period: "2027"})
	if err != nil {
		t.Fatalf("Execute returned error: %v", err)
	}
	if got := result.Data[0].TujuanTitle; got != "Tujuan A" {
		t.Fatalf("expected hierarchy summary, got %q", got)
	}
}
```

- [x] **Step 2: Run backend planning tests and verify they fail**

Run: `go test ./internal/usecase/planning ./internal/handler/http -v`
Expected: FAIL with missing planning use case and handler symbols.

- [x] **Step 3: Implement repository, use case, and handler**

```go
func (r *planningHierarchyRepository) ListROOptions(ctx context.Context, filter repository.PlanningROOptionFilter) ([]entity.PlanningROOption, error) {
	const query = `
		SELECT ro.id, ro.title, act.title, prog.title, iku.title, obj.title, goal.title, ro.period
		FROM planning_ros ro
		JOIN planning_activities act ON act.id = ro.activity_id
		JOIN planning_programs prog ON prog.id = act.program_id
		JOIN planning_ikus iku ON iku.id = prog.iku_id
		JOIN planning_objectives obj ON obj.id = iku.objective_id
		JOIN planning_goals goal ON goal.id = obj.goal_id
		WHERE ro.period = $1
		  AND (
			ro.scope_mode = 'all_satker'
			OR EXISTS (
				SELECT 1
				FROM planning_ro_scopes scope
				WHERE scope.ro_id = ro.id AND scope.organization_id = $2
			)
		  )
		ORDER BY goal.updated_at DESC, obj.sort_order, iku.sort_order, prog.sort_order, act.sort_order, ro.title
	`
	// scan rows into []entity.PlanningROOption
}

func (h *PlanningHierarchyHandler) ListROOptions(c *fiber.Ctx) error {
	orgID, err := uuid.Parse(c.Query("organization_id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
	}

	result, err := h.listROOptionsUC.Execute(c.Context(), planning.ListROOptionsInput{
		OrganizationID: orgID,
		Period:         strings.TrimSpace(c.Query("period")),
		Query:          strings.TrimSpace(c.Query("q")),
	})
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(result)
}
```

- [x] **Step 4: Run targeted tests and verify they pass**

Run: `go test ./internal/repository/postgres ./internal/usecase/planning ./internal/handler/http -run 'TestPlanningHierarchyScopeFiltering|TestListROOptionsUseCase_ReturnsHierarchySummary' -v`
Expected: PASS

- [ ] **Step 5: Commit the planning read API checkpoint**

```bash
git add backend/internal/repository/postgres/planning_hierarchy.go backend/internal/usecase/planning/list_ro_options.go backend/internal/usecase/planning/list_ro_options_test.go backend/internal/handler/http/planning_hierarchy.go backend/internal/handler/http/planning_hierarchy_test.go backend/internal/bootstrap/bootstrap.go backend/cmd/server/main.go
git commit -m "feat: add planning ro option api"
```

## Task 4: Convert `risk_objectives` Into a Compatibility Read Model

**Files:**
- Create: `backend/internal/usecase/planning/list_objective_compatibility.go`
- Create: `backend/internal/usecase/planning/list_objective_compatibility_test.go`
- Modify: `backend/internal/domain/repository/risk_objective.go`
- Modify: `backend/internal/repository/postgres/risk_objective.go`
- Modify: `backend/internal/usecase/riskobjective/list.go`
- Modify: `backend/internal/usecase/riskobjective/get.go`
- Modify: `backend/internal/handler/http/risk_objective.go`

- [ ] **Step 1: Write the failing compatibility test**

```go
func TestListObjectiveCompatibilityUseCase_FlattensHierarchy(t *testing.T) {
	t.Parallel()

	repo := &fakePlanningCompatibilityRepo{
		rows: []entity.RiskObjectiveCompatibilityRow{
			{
				ID:                    uuid.MustParse("22222222-2222-2222-2222-222222222222"),
				OrganizationID:        uuid.MustParse("33333333-3333-3333-3333-333333333333"),
				Period:                "2027",
				Tujuan:                "Tujuan A",
				Sasaran:               "Sasaran A",
				IndikatorKinerjaUtama: "IKU A",
				Program:               "Program A",
				Kegiatan:              "Kegiatan A",
				ROTitle:               "RO A",
			},
		},
	}

	uc := NewListObjectiveCompatibilityUseCase(repo)
	result, err := uc.Execute(context.Background(), ListObjectiveCompatibilityInput{Period: "2027"})
	if err != nil {
		t.Fatalf("Execute returned error: %v", err)
	}
	if got := result.Data[0].Program; got != "Program A" {
		t.Fatalf("expected flattened program title, got %q", got)
	}
}
```

- [ ] **Step 2: Run the compatibility test and verify it fails**

Run: `go test ./internal/usecase/planning -run TestListObjectiveCompatibilityUseCase_FlattensHierarchy -v`
Expected: FAIL with undefined compatibility use case.

- [x] **Step 3: Refactor `risk_objectives` list/get to flatten hierarchy rows**

```go
type RiskObjectiveCompatibilityRow struct {
	ID                    uuid.UUID
	OrganizationID        uuid.UUID
	Period                string
	Tujuan                string
	Sasaran               string
	IndikatorKinerjaUtama string
	Target                string
	Program               string
	Kegiatan              string
	ProcessBusiness       string
	ROTitle               string
	Status                string
}

func (r *riskObjectiveRepository) List(ctx context.Context, filter repository.RiskObjectiveListFilter) ([]*entity.RiskObjective, int, error) {
	rows, total, err := r.planningRepo.ListObjectiveCompatibilityRows(ctx, repository.PlanningCompatibilityFilter{
		OrganizationID: filter.OrganizationID,
		Period:         filter.Period,
		Q:              filter.Q,
		Page:           filter.Page,
		Limit:          filter.Limit,
	})
	if err != nil {
		return nil, 0, err
	}
	return mapCompatibilityRowsToRiskObjectives(rows), total, nil
}
```

- [x] **Step 4: Run the compatibility tests and existing objective tests**

Run: `go test ./internal/usecase/planning ./internal/usecase/riskobjective ./internal/handler/http -v`
Expected: PASS, with `/risk-objectives` behavior still available from flattened hierarchy data.

- [ ] **Step 5: Commit the compatibility checkpoint**

```bash
git add backend/internal/domain/repository/risk_objective.go backend/internal/repository/postgres/risk_objective.go backend/internal/usecase/planning/list_objective_compatibility.go backend/internal/usecase/planning/list_objective_compatibility_test.go backend/internal/usecase/riskobjective/list.go backend/internal/usecase/riskobjective/get.go backend/internal/handler/http/risk_objective.go
git commit -m "refactor: back risk objectives with planning compatibility rows"
```

## Task 5: Add `ro_id` to Risk Domain and Persistence

**Files:**
- Modify: `backend/internal/domain/entity/risk.go`
- Modify: `backend/internal/repository/postgres/risk.go`
- Modify: `backend/internal/usecase/risk/create.go`
- Modify: `backend/internal/usecase/risk/update.go`
- Test: `backend/internal/usecase/risk/create_test.go`
- Test: `backend/internal/usecase/risk/update_test.go`

- [x] **Step 1: Write failing risk use case tests for `ro_id`**

```go
func TestCreateRiskUseCase_PersistsROLink(t *testing.T) {
	t.Parallel()

	roID := uuid.MustParse("44444444-4444-4444-4444-444444444444")
	repo := &fakeRiskRepository{}
	uc := NewCreateRiskUseCase(repo, nil, nil, nil, nil)

	_, err := uc.Execute(context.Background(), CreateRiskInput{
		Title:    "Risiko keterlambatan",
		Code:     "R-001",
		Status:   entity.RiskStatusDraft,
		ROId:     &roID,
		Category: entity.RiskCategoryOperasional,
		Probability: 2,
		Impact:      3,
	})
	if err != nil {
		t.Fatalf("Execute returned error: %v", err)
	}
	if repo.saved.ObjectiveID != nil {
		t.Fatalf("expected objective linkage to stop being primary, got objective id %v", *repo.saved.ObjectiveID)
	}
	if repo.saved.ROID == nil || *repo.saved.ROID != roID {
		t.Fatalf("expected ro linkage %v, got %v", roID, repo.saved.ROID)
	}
}
```

- [x] **Step 2: Run the risk tests and verify they fail**

Run: `go test ./internal/usecase/risk -run 'TestCreateRiskUseCase_PersistsROLink|TestUpdateRiskUseCase_PersistsROLink' -v`
Expected: FAIL with missing `ROID` fields.

- [x] **Step 3: Add `ROID` through entity, use case input, and SQL persistence**

```go
type Risk struct {
	// ...
	ObjectiveID *uuid.UUID `json:"objectiveId,omitempty"`
	ROID        *uuid.UUID `json:"roId,omitempty"`
	// ...
}

type CreateRiskInput struct {
	// ...
	ObjectiveID *uuid.UUID `json:"objectiveId"`
	ROId        *uuid.UUID `json:"roId"`
}

const insertRiskSQL = `
	INSERT INTO risks (
		id, code, title, description, category, status, version_group_id, organization_id,
		created_by, objective_id, ro_id, impact_criteria_id, impact_justification
	) VALUES (
		$1, $2, $3, $4, $5, $6, $7, $8,
		$9, $10, $11, $12, $13
	)
`
```

- [x] **Step 4: Run risk backend tests**

Run: `go test ./internal/usecase/risk ./internal/repository/postgres -run 'TestCreateRiskUseCase_PersistsROLink|TestUpdateRiskUseCase_PersistsROLink' -v`
Expected: PASS

- [ ] **Step 5: Commit the risk linkage checkpoint**

```bash
git add backend/internal/domain/entity/risk.go backend/internal/repository/postgres/risk.go backend/internal/usecase/risk/create.go backend/internal/usecase/risk/update.go backend/internal/usecase/risk/create_test.go backend/internal/usecase/risk/update_test.go
git commit -m "feat: persist risks with ro linkage"
```

## Task 6: Build Frontend Planning Types, API Client, and `ROPicker`

**Files:**
- Create: `frontend/src/types/planning.ts`
- Create: `frontend/src/lib/api/planning.ts`
- Create: `frontend/src/lib/api/planning.test.ts`
- Create: `frontend/src/components/risk/ro-picker.tsx`
- Create: `frontend/src/components/risk/ro-picker.test.tsx`
- Modify: `frontend/src/types/risk.ts`

- [x] **Step 1: Write the failing frontend tests**

```ts
test("buildPlanningROListQuery serializes organization and period", async () => {
  const { buildPlanningROListQuery } = await import("@/lib/api/planning");
  expect(
    buildPlanningROListQuery({ organization_id: "org-1", period: "2027", q: "bkk" }),
  ).toBe("organization_id=org-1&period=2027&q=bkk");
});

test("ROPicker renders hierarchy labels from API results", async () => {
  render(
    <ROPicker
      organizationId="org-1"
      value=""
      onChange={() => {}}
      token="token"
    />,
  );
  expect(await screen.findByText("Tujuan A")).toBeInTheDocument();
  expect(screen.getByText(/Program A/)).toBeInTheDocument();
});
```

- [x] **Step 2: Run the frontend tests and verify they fail**

Run: `npm run lint -- --file src/components/risk/ro-picker.tsx`
Expected: FAIL because `ro-picker.tsx` and planning API files do not exist yet.

- [x] **Step 3: Implement planning types, API helpers, and picker**

```ts
export interface PlanningROOption {
  roId: string;
  roTitle: string;
  kegiatanTitle: string;
  programTitle: string;
  ikuTitle: string;
  sasaranTitle: string;
  tujuanTitle: string;
  period: string;
}

export function buildPlanningROListQuery(params?: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  if (params?.organization_id) search.set("organization_id", String(params.organization_id));
  if (params?.period) search.set("period", String(params.period));
  if (params?.q) search.set("q", String(params.q));
  return search.toString();
}

export function ROPicker({ organizationId, value, onChange }: ROPickerProps) {
  // fetch listPlanningROOptions(token, { organization_id: organizationId, period, q })
  // render hierarchy summary
}
```

- [x] **Step 4: Run frontend picker tests**

Run: `npm run lint -- --file src/components/risk/ro-picker.tsx && npm run build`
Expected: PASS for the new type/API/component wiring.

- [ ] **Step 5: Commit the picker foundation**

```bash
git add frontend/src/types/planning.ts frontend/src/lib/api/planning.ts frontend/src/lib/api/planning.test.ts frontend/src/components/risk/ro-picker.tsx frontend/src/components/risk/ro-picker.test.tsx frontend/src/types/risk.ts
git commit -m "feat: add planning ro picker"
```

## Task 7: Add Central Planning Management Screens

**Files:**
- Create: `frontend/src/app/(app)/management/planning/page.tsx`
- Create: `frontend/src/app/(app)/management/planning/[id]/page.tsx`
- Modify: `frontend/src/lib/app-navigation.ts`
- Modify: `frontend/src/app/(app)/management/objectives/page.tsx`
- Modify: `frontend/src/app/(app)/management/objectives/[id]/page.tsx`

- [ ] **Step 1: Write the failing UI behavior tests**

```ts
test("management objectives page shows transition CTA", async () => {
  render(<RiskObjectivesPage />);
  expect(await screen.findByText(/Buka editor struktur kinerja & RO/)).toBeInTheDocument();
});

test("planning page renders hierarchy sections", async () => {
  render(<PlanningManagementPage />);
  expect(await screen.findByText("Tujuan")).toBeInTheDocument();
  expect(screen.getByText("RO")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the UI tests and verify they fail**

Run: `npm run build`
Expected: FAIL because the planning management routes and transition CTA do not exist.

- [x] **Step 3: Add planning pages and turn legacy objective pages into compatibility surfaces**

```tsx
export default function PlanningManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Struktur Kinerja &amp; RO</h2>
        <p className="text-sm text-muted-foreground">
          Kelola Tujuan, Sasaran, IKU, Program, Kegiatan, dan RO per periode.
        </p>
      </div>
      <PlanningHierarchyTable />
    </div>
  );
}

<Alert>
  <AlertTitle>Modul transisi</AlertTitle>
  <AlertDescription>
    Halaman ini menampilkan ringkasan kompatibilitas. Gunakan editor Struktur Kinerja &amp; RO untuk perubahan data.
  </AlertDescription>
</Alert>
```

- [x] **Step 4: Run frontend verification**

Run: `npm run lint -- --file src/app/(app)/management/planning/page.tsx && npm run build`
Expected: PASS, with navigation exposing the new planning module and legacy objective pages still functional.

- [ ] **Step 5: Commit the management UI checkpoint**

```bash
git add frontend/src/app/'(app)'/management/planning/page.tsx frontend/src/app/'(app)'/management/planning/[id]/page.tsx frontend/src/lib/app-navigation.ts frontend/src/app/'(app)'/management/objectives/page.tsx frontend/src/app/'(app)'/management/objectives/[id]/page.tsx
git commit -m "feat: add planning management screens"
```

## Task 8: Replace Risk Register Objective Selection with `ROPicker`

**Files:**
- Modify: `frontend/src/app/(app)/risk/register/new/page.tsx`
- Modify: `frontend/src/components/risk/objective-picker.tsx`
- Modify: `frontend/src/types/risk.ts`
- Modify: `backend/internal/handler/http/risk.go`
- Modify: `backend/internal/usecase/risk/create.go`
- Modify: `backend/internal/usecase/risk/update.go`

- [x] **Step 1: Write the failing risk form test**

```ts
test("risk form saves roId and shows hierarchy summary", async () => {
  render(<RiskRegisterNewPage />);

  await user.click(screen.getByRole("combobox", { name: /RO/i }));
  await user.click(await screen.findByText("RO Peningkatan Cakupan"));

  expect(screen.getByText(/Tujuan:/)).toBeInTheDocument();
  expect(screen.getByText(/Sasaran:/)).toBeInTheDocument();
  expect(screen.getByText(/RO:/)).toBeInTheDocument();
});
```

- [x] **Step 2: Run the risk form build and verify it fails**

Run: `npm run build`
Expected: FAIL because the risk form still references `ObjectivePicker` and `objectiveId`.

- [x] **Step 3: Swap the picker and payload field**

```tsx
<ROPicker
  organizationId={currentOrganizationId}
  value={watch("roId")}
  onChange={(id, summary) => {
    setValue("roId", id, { shouldDirty: true });
    setROSummary(summary);
  }}
/>;

const payload = {
  ...data,
  roId: data.roId || undefined,
  objectiveId: undefined,
};
```

- [x] **Step 4: Run full risk form verification**

Run: `npm run build && go test ./internal/usecase/risk ./internal/handler/http -v`
Expected: PASS, with request payloads carrying `roId`.

- [ ] **Step 5: Commit the risk form checkpoint**

```bash
git add frontend/src/app/'(app)'/risk/register/new/page.tsx frontend/src/components/risk/objective-picker.tsx frontend/src/types/risk.ts backend/internal/handler/http/risk.go backend/internal/usecase/risk/create.go backend/internal/usecase/risk/update.go
git commit -m "feat: link risks to ro picker"
```

## Task 9: Update Document Intelligence Strategic Mode for Hierarchy Compatibility

**Files:**
- Modify: `backend/internal/usecase/ai/document_intelligence.go`
- Modify: `backend/internal/usecase/ai/document_intelligence_test.go`
- Modify: `frontend/src/types/document-intelligence.ts`
- Modify: `frontend/src/lib/document-intelligence-prefill.ts`
- Modify: `frontend/src/app/(app)/intelligence/document/page.tsx`

- [x] **Step 1: Write the failing document intelligence tests**

```go
func TestAnalyzeDocumentIntelligence_StrategicModeIncludesROContext(t *testing.T) {
	t.Parallel()

	repo := &fakePlanningCompatibilityRepo{
		rows: []entity.RiskObjective{
			{
				Tujuan:                "Tujuan A",
				Sasaran:               "Sasaran A",
				IndikatorKinerjaUtama: "IKU A",
				Program:               "Program A",
				Kegiatan:              "Kegiatan A",
			},
		},
	}

	uc := NewAnalyzeDocumentIntelligenceUseCase(fakeAIRepo{}, fakeOrgRepo{}, fakeRiskRepo{}, repo, fakeTaskRepo{})
	result, err := uc.Execute(context.Background(), AnalyzeDocumentIntelligenceInput{
		Mode:         entity.DocumentModeStrategicObjectiveRisk,
		DocumentText: "Sasaran A dengan IKU A dan kegiatan A",
		Period:       "2027",
	})
	if err != nil {
		t.Fatalf("Execute returned error: %v", err)
	}
	if result.Strategic == nil {
		t.Fatal("expected strategic result")
	}
}
```

```ts
test("objective prefill stores compatibility hierarchy fields", () => {
  const token = createDocumentIntelligencePrefillToken();
  saveDocumentIntelligencePrefill(token, {
    kind: "objective",
    tujuan: "Tujuan A",
    sasaran: "Sasaran A",
    indikatorKinerjaUtama: "IKU A",
    program: "Program A",
    kegiatan: "Kegiatan A",
  });
  expect(consumeDocumentIntelligencePrefill(token)).toMatchObject({ kind: "objective", program: "Program A" });
});
```

- [x] **Step 2: Run the AI/document tests and verify they fail**

Run: `go test ./internal/usecase/ai -run TestAnalyzeDocumentIntelligence_StrategicModeIncludesROContext -v && npm run build`
Expected: FAIL because strategic mode still assumes the older objective source directly.

- [x] **Step 3: Keep flattened compatibility output, but source it from planning hierarchy**

```go
type documentObjectiveContext struct {
	ID                    string `json:"id"`
	Period                string `json:"period"`
	Tujuan                string `json:"tujuan"`
	Sasaran               string `json:"sasaran"`
	IndikatorKinerjaUtama string `json:"indikatorKinerjaUtama"`
	Program               string `json:"program,omitempty"`
	Kegiatan              string `json:"kegiatan,omitempty"`
	ROTitle               string `json:"roTitle,omitempty"`
	Status                string `json:"status,omitempty"`
}
```

```ts
export interface StrategicIKUSuggestion {
  clientKey: string;
  name: string;
  target?: string;
  program?: string;
  kegiatan?: string;
  roTitle?: string;
  processBusiness?: string;
  confidence: number;
}
```

- [x] **Step 4: Run targeted AI/frontend verification**

Run: `go test ./internal/usecase/ai -v && npm run build`
Expected: PASS, with strategic mode still displaying flattened planning context while remaining compatible with the hierarchy.

- [ ] **Step 5: Commit the AI compatibility checkpoint**

```bash
git add backend/internal/usecase/ai/document_intelligence.go backend/internal/usecase/ai/document_intelligence_test.go frontend/src/types/document-intelligence.ts frontend/src/lib/document-intelligence-prefill.ts frontend/src/app/'(app)'/intelligence/document/page.tsx
git commit -m "feat: align document intelligence with planning hierarchy"
```

## Task 10: Cleanup, Enforcement, and Full Regression

**Files:**
- Modify: `backend/internal/usecase/risk/create.go`
- Modify: `backend/internal/usecase/risk/update.go`
- Modify: `frontend/src/app/(app)/management/objectives/page.tsx`
- Modify: `frontend/src/app/(app)/management/objectives/[id]/page.tsx`
- Modify: `frontend/src/lib/api/risk-objectives.ts`
- Modify: `docs/kmk-batch-a-rollout.md`

- [x] **Step 1: Write the failing enforcement/regression checklist tests**

```go
func TestCreateRiskUseCase_RejectsMissingROWhenRequired(t *testing.T) {
	t.Parallel()

	uc := NewCreateRiskUseCase(fakeRiskRepo{}, nil, nil)
	_, err := uc.Execute(context.Background(), CreateRiskInput{
		Title:       "Risiko tanpa RO",
		Code:        "R-099",
		Status:      entity.RiskStatusDraft,
		Category:    entity.RiskCategoryOperasional,
		Probability: 2,
		Impact:      2,
	})
	if err == nil {
		t.Fatal("expected validation error when roId missing")
	}
}
```

- [x] **Step 2: Run broad regression commands and verify the remaining gaps**

Run: `go test ./... && npm run build`
Expected: FAIL until the final enforcement messages, docs, and compatibility flows are aligned.

- [x] **Step 3: Finish enforcement, update copy, and document rollout**

```go
if input.ROId == nil {
	return nil, domainerrors.Wrap(domainerrors.ErrInvalidInput, "roId is required")
}
```

```tsx
<p className="text-xs text-muted-foreground">
  Halaman ini hanya menampilkan ringkasan kompatibilitas. Gunakan Struktur Kinerja &amp; RO untuk perubahan data baru.
</p>
```

```md
- `000057_planning_hierarchy` — creates normalized planning hierarchy tables
- `000058_risks_add_ro_id` — links risks to scoped RO records
```

- [x] **Step 4: Run full verification**

Run: `go test ./...`
Expected: PASS

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit the final rollout checkpoint**

```bash
git add backend/internal/usecase/risk/create.go backend/internal/usecase/risk/update.go frontend/src/app/'(app)'/management/objectives/page.tsx frontend/src/app/'(app)'/management/objectives/[id]/page.tsx frontend/src/lib/api/risk-objectives.ts docs/kmk-batch-a-rollout.md
git commit -m "refactor: complete ro scoped planning rollout"
```

## Self-Review

### Spec coverage

- Normalized hierarchy tables: covered by Tasks 1-3
- `risk_objectives` compatibility strategy: covered by Task 4
- `ro_id` risk linkage: covered by Tasks 5 and 8
- Central planning management UI: covered by Task 7
- Satker-limited RO selection: covered by Tasks 1, 3, and 8
- Frozen-period behavior and explicit satker scope: covered by Tasks 1-3 and Task 10 validation
- Document intelligence transition: covered by Task 9
- Cleanup and rollout docs: covered by Task 10

### Placeholder scan

- No `TODO`, `TBD`, or deferred implementation markers remain.
- Every task has explicit files, test commands, expected outcomes, and sample code.

### Type consistency

- Backend target field is consistently named `ro_id` in SQL and `ROID` / `ROId` in Go.
- Frontend target field is consistently named `roId`.
- Compatibility shape remains `RiskObjective` for old screens and `PlanningROOption` for new risk selection.
- Backend create/update rejects missing `roId` in every risk write path.
