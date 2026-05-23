# Cross-Unit Risk Access Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce own-unit-only access on operational risk surfaces for `unit`, `reviewer`, and `pimpinan`, while preserving explicit descendant-unit access on report surfaces and keeping workflow-assigned exceptions intact.

**Architecture:** Introduce a small backend access-surface helper in the HTTP layer so handlers stop re-deriving org scope ad hoc from `AccessibleOrgIDs`. Operational endpoints resolve to own-org by default and reject descendant browsing, report endpoints default to own-org but accept explicitly selected descendant orgs, and frontend report pages add unit selection plus empty-state gating so cross-unit data only appears after deliberate selection.

**Tech Stack:** Go + Fiber + pgx + PostgreSQL on backend; Next.js App Router + React 19 + TypeScript + shadcn/ui + Node `node:test` on frontend.

---

## File Structure Map

### Existing backend files

- `backend/internal/handler/http/risk.go` — replace repeated `scope.AccessibleOrgIDs` handler scoping with surface-specific helpers for operational, report, and dashboard/reporting endpoints.
- `backend/internal/handler/http/report.go` — stop defaulting PDF exports to all descendants when `org_id` is absent; allow descendant export only after explicit selection.
- `backend/internal/handler/http/formal_report.go` — keep own-org default, but normalize descendant selection through the shared report-scope helper.
- `backend/internal/handler/http/risk_register_test.go` — extend existing handler tests to prove operational endpoints no longer broaden to descendants.

### New backend files

- `backend/internal/handler/http/access_surface_scope.go` — shared helper for `resolveOperationalOrgIDs`, `resolveReportOrgIDs`, and `resolveOwnOrgID`.
- `backend/internal/handler/http/access_surface_scope_test.go` — focused unit tests for the new helper behavior.
- `backend/internal/handler/http/report_access_test.go` — handler coverage for report endpoints that must allow explicit descendant selection but never auto-expand.

### Existing frontend files

- `frontend/src/contexts/auth-context.tsx` — keep current user shape, but update tests if helper usage depends on `accessibleOrgIds`.
- `frontend/src/lib/auth-helpers.ts` — optionally host small helper wrappers if shared by pages; otherwise keep untouched.
- `frontend/src/lib/organization.ts` — reuse `filterToAccessibleOrgs` and add a tiny descendant-visibility helper if the new access helper lives here.
- `frontend/src/app/(app)/risk/register/page.tsx` — remove any descendant-oriented browse assumptions and keep the page framed as own-unit workspace only.
- `frontend/src/app/(app)/reports/page.tsx` — add report unit selector, empty state for non-superadmin users with descendant visibility, and append `org_id` to report API/export requests.
- `frontend/src/app/(app)/reports/compliance-monitoring/page.tsx` — add the same report-unit selection gate and pass `org_id` through analytics requests.
- `frontend/src/app/(app)/reports/formal/page.tsx` — constrain visible organizations to accessible orgs and keep descendant access explicit via selected organization.
- `frontend/src/app/(app)/reports/risk-cycle-detail-report.tsx` — replace `"all"` default with explicit own-unit or selected descendant behavior.

### New frontend files

- `frontend/src/lib/report-scope.ts` — central helper for “does this user need to pick a unit first?”, “which organizations are selectable?”, and “what org_id should this request carry?”.
- `frontend/src/lib/report-scope.test.ts` — node:test coverage for report-scope helper decisions.

---

## Behavioral Rules

1. `superadmin` remains globally readable and writable.
2. `unit`, `reviewer`, and `pimpinan` share the same cross-unit access behavior.
3. Operational endpoints and pages default to own-unit-only access for non-superadmin users.
4. Non-superadmin users cannot browse descendant-unit data on operational pages, even if `AccessibleOrgIDs` contains descendants.
5. Report endpoints may read descendant-unit data only when the request explicitly supplies an authorized `org_id` or `organization_id`.
6. Report endpoints must not auto-expand to all descendants when no organization filter is supplied.
7. Report pages should require explicit unit selection before cross-unit data is shown when the user has descendant visibility.
8. Workflow-specific access exceptions remain task-scoped and are not widened by this change.

---

### Task 1: Add Backend Surface-Specific Access Helpers

**Files:**
- Create: `backend/internal/handler/http/access_surface_scope.go`
- Create: `backend/internal/handler/http/access_surface_scope_test.go`
- Reference: `backend/internal/domain/entity/access_scope.go`
- Reference: `backend/internal/domain/entity/user.go`

- [ ] **Step 1: Write failing helper tests for operational vs report behavior**

Create `backend/internal/handler/http/access_surface_scope_test.go`:

```go
package http

import (
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func TestResolveOperationalOrgIDsUsesOwnOrgOnly(t *testing.T) {
	own := uuid.New()
	descendant := uuid.New()
	scope := &entity.AccessScope{
		Role:             entity.RoleUnit,
		OrganizationID:   &own,
		AccessibleOrgIDs: []uuid.UUID{own, descendant},
	}

	got, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		t.Fatalf("resolveOperationalOrgIDs returned error: %v", err)
	}
	if len(got) != 1 || got[0] != own {
		t.Fatalf("expected own-org-only scope [%s], got %v", own, got)
	}
}

func TestResolveOperationalOrgIDsRejectsDescendantQuery(t *testing.T) {
	own := uuid.New()
	descendant := uuid.New()
	scope := &entity.AccessScope{
		Role:             entity.RoleReviewer,
		OrganizationID:   &own,
		AccessibleOrgIDs: []uuid.UUID{own, descendant},
	}

	_, err := resolveOperationalOrgIDs(scope, descendant.String())
	if err == nil {
		t.Fatal("expected descendant org query to be rejected on operational surface")
	}
}

func TestResolveReportOrgIDsAllowsExplicitDescendantSelection(t *testing.T) {
	own := uuid.New()
	descendant := uuid.New()
	scope := &entity.AccessScope{
		Role:             entity.RolePimpinan,
		OrganizationID:   &own,
		AccessibleOrgIDs: []uuid.UUID{own, descendant},
	}

	got, err := resolveReportOrgIDs(scope, descendant.String())
	if err != nil {
		t.Fatalf("resolveReportOrgIDs returned error: %v", err)
	}
	if len(got) != 1 || got[0] != descendant {
		t.Fatalf("expected explicit descendant scope [%s], got %v", descendant, got)
	}
}

func TestResolveReportOrgIDsDefaultsToOwnOrgWhenFilterMissing(t *testing.T) {
	own := uuid.New()
	descendant := uuid.New()
	scope := &entity.AccessScope{
		Role:             entity.RoleUnit,
		OrganizationID:   &own,
		AccessibleOrgIDs: []uuid.UUID{own, descendant},
	}

	got, err := resolveReportOrgIDs(scope, "")
	if err != nil {
		t.Fatalf("resolveReportOrgIDs returned error: %v", err)
	}
	if len(got) != 1 || got[0] != own {
		t.Fatalf("expected own-org-only fallback [%s], got %v", own, got)
	}
}
```

- [ ] **Step 2: Run the tests and verify they fail because the helper does not exist yet**

Run:

```bash
cd backend
go test ./internal/handler/http -run 'TestResolve(Operational|Report)OrgIDs' -v
```

Expected:
- FAIL with `undefined: resolveOperationalOrgIDs`
- FAIL with `undefined: resolveReportOrgIDs`

- [ ] **Step 3: Implement the minimal shared helper**

Create `backend/internal/handler/http/access_surface_scope.go`:

```go
package http

import (
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
)

func resolveOwnOrgID(scope *entity.AccessScope) (uuid.UUID, error) {
	if scope == nil {
		return uuid.Nil, nil
	}
	if scope.IsGlobal {
		return uuid.Nil, nil
	}
	if scope.OrganizationID == nil {
		return uuid.Nil, errors.ErrForbidden
	}
	return *scope.OrganizationID, nil
}

func resolveOperationalOrgIDs(scope *entity.AccessScope, rawOrgID string) ([]uuid.UUID, error) {
	if scope == nil || scope.IsGlobal {
		if rawOrgID == "" {
			return nil, nil
		}
		parsed, err := uuid.Parse(rawOrgID)
		if err != nil {
			return nil, err
		}
		return []uuid.UUID{parsed}, nil
	}

	ownOrgID, err := resolveOwnOrgID(scope)
	if err != nil {
		return nil, err
	}
	if rawOrgID == "" {
		return []uuid.UUID{ownOrgID}, nil
	}

	parsed, err := uuid.Parse(rawOrgID)
	if err != nil {
		return nil, err
	}
	if parsed != ownOrgID {
		return nil, errors.ErrForbidden
	}
	return []uuid.UUID{ownOrgID}, nil
}

func resolveReportOrgIDs(scope *entity.AccessScope, rawOrgID string) ([]uuid.UUID, error) {
	if scope == nil || scope.IsGlobal {
		if rawOrgID == "" {
			return nil, nil
		}
		parsed, err := uuid.Parse(rawOrgID)
		if err != nil {
			return nil, err
		}
		return []uuid.UUID{parsed}, nil
	}

	ownOrgID, err := resolveOwnOrgID(scope)
	if err != nil {
		return nil, err
	}
	if rawOrgID == "" {
		return []uuid.UUID{ownOrgID}, nil
	}

	parsed, err := uuid.Parse(rawOrgID)
	if err != nil {
		return nil, err
	}
	return scope.NarrowToOrg(parsed)
}
```

- [ ] **Step 4: Run the helper tests and verify they pass**

Run:

```bash
cd backend
go test ./internal/handler/http -run 'TestResolve(Operational|Report)OrgIDs' -v
```

Expected:
- PASS for all four helper tests

- [ ] **Step 5: Commit the helper foundation**

```bash
git add backend/internal/handler/http/access_surface_scope.go backend/internal/handler/http/access_surface_scope_test.go
git commit -m "refactor: add access surface scope helpers"
```

### Task 2: Apply Own-Unit-Only Scope to Operational Risk Endpoints

**Files:**
- Modify: `backend/internal/handler/http/risk.go`
- Modify: `backend/internal/handler/http/risk_register_test.go`
- Create: `backend/internal/handler/http/report_access_test.go`

- [ ] **Step 1: Write failing handler tests for operational browse restrictions**

Append to `backend/internal/handler/http/risk_register_test.go`:

```go
func TestRiskRegisterListDefaultsToOwnOrgInsteadOfDescendants(t *testing.T) {
	own := uuid.New()
	descendant := uuid.New()
	repo := &riskRegisterRepoStub{}
	handler := &RiskHandler{listRegisterUC: riskuc.NewListRiskRegisterUseCase(repo)}

	app := fiber.New()
	app.Get("/risks/register", func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{
			Role:             entity.RoleUnit,
			OrganizationID:   &own,
			AccessibleOrgIDs: []uuid.UUID{own, descendant},
		})
		return c.Next()
	}, handler.ListRiskRegister)

	req := httptest.NewRequest(fiber.MethodGet, "/risks/register", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
	if len(repo.registerFilter.OrgIDs) != 1 || repo.registerFilter.OrgIDs[0] != own {
		t.Fatalf("expected own-org-only filter [%s], got %v", own, repo.registerFilter.OrgIDs)
	}
}

func TestRiskRegisterListRejectsDescendantOrgFilterOnOperationalSurface(t *testing.T) {
	own := uuid.New()
	descendant := uuid.New()
	repo := &riskRegisterRepoStub{}
	handler := &RiskHandler{listRegisterUC: riskuc.NewListRiskRegisterUseCase(repo)}

	app := fiber.New()
	app.Get("/risks/register", func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{
			Role:             entity.RoleReviewer,
			OrganizationID:   &own,
			AccessibleOrgIDs: []uuid.UUID{own, descendant},
		})
		return c.Next()
	}, handler.ListRiskRegister)

	req := httptest.NewRequest(fiber.MethodGet, "/risks/register?org_id="+descendant.String(), nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusForbidden {
		t.Fatalf("expected status 403, got %d", resp.StatusCode)
	}
}
```

- [ ] **Step 2: Run the tests and verify they fail under the current descendant-wide behavior**

Run:

```bash
cd backend
go test ./internal/handler/http -run 'TestRiskRegisterList(Default|Rejects)' -v
```

Expected:
- default test fails because handler still passes both `own` and `descendant`
- reject test fails because descendant `org_id` is still accepted

- [ ] **Step 3: Switch operational handlers to the new helper**

Update the relevant blocks in `backend/internal/handler/http/risk.go`:

```go
scope := middleware.GetAccessScope(c)
orgIDs, err := resolveOperationalOrgIDs(scope, c.Query("org_id"))
if err != nil {
	if stdErrors.Is(err, domainerrors.ErrForbidden) {
		return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
	}
	return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
}
```

Apply that pattern to:

- `ListRiskRegister`
- `ListRisks`
- `ListVersions`
- `DashboardSummary`
- `ActionPressure`
- `ExecutiveAlerts`
- `HeatmapData`
- `HeatmapMulti`
- `TopRisks`

For handlers that do not take `org_id`, pass an empty string:

```go
orgIDs, err := resolveOperationalOrgIDs(scope, "")
```

- [ ] **Step 4: Re-run operational handler tests and focused package tests**

Run:

```bash
cd backend
go test ./internal/handler/http -run 'TestRiskRegisterList(Default|Rejects|Supports)' -v
go test ./internal/handler/http -run 'TestResolve(Operational|Report)OrgIDs' -v
```

Expected:
- PASS for the new own-org-only behavior
- PASS for existing filter and monitoring tests

- [ ] **Step 5: Commit the operational-surface enforcement**

```bash
git add backend/internal/handler/http/risk.go backend/internal/handler/http/risk_register_test.go backend/internal/handler/http/access_surface_scope.go backend/internal/handler/http/access_surface_scope_test.go
git commit -m "fix: limit operational risk browsing to own unit"
```

### Task 3: Align Report Endpoints to Explicit-Selection Descendant Access

**Files:**
- Modify: `backend/internal/handler/http/risk.go`
- Modify: `backend/internal/handler/http/report.go`
- Modify: `backend/internal/handler/http/formal_report.go`
- Create: `backend/internal/handler/http/report_access_test.go`

- [ ] **Step 1: Write failing tests for report-surface descendant selection**

Create `backend/internal/handler/http/report_access_test.go`:

```go
package http

import (
	"context"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	reportuc "github.com/manris/backend/internal/usecase/report"
)

type reportRiskRepoStub struct {
	riskRegisterRepoStub
	lastCycle  string
	lastOrgIDs []uuid.UUID
}

func (s *reportRiskRepoStub) ListCycleSnapshot(_ context.Context, cycle string, orgIDs []uuid.UUID) ([]*entity.Risk, error) {
	s.lastCycle = cycle
	s.lastOrgIDs = append([]uuid.UUID(nil), orgIDs...)
	return []*entity.Risk{
		{
			ID:              uuid.New(),
			Code:            "R-001",
			Title:           "Risk report test",
			Status:          entity.RiskStatusApproved,
			Category:        entity.RiskCategoryOperasional,
			Probability:     3,
			Impact:          4,
			AssessmentCycle: cycle,
		},
	}, nil
}

func (s *reportRiskRepoStub) ListApprovedRisks(context.Context, []uuid.UUID, string) ([]*entity.Risk, error) {
	return []*entity.Risk{}, nil
}

var _ repository.RiskRepository = (*reportRiskRepoStub)(nil)

type reportIncidentRepoStub struct{}

func (reportIncidentRepoStub) Create(context.Context, *entity.Incident) error { return nil }
func (reportIncidentRepoStub) GetByID(context.Context, string, []uuid.UUID) (*entity.Incident, error) {
	return nil, nil
}
func (reportIncidentRepoStub) Update(context.Context, *entity.Incident) error { return nil }
func (reportIncidentRepoStub) Delete(context.Context, string) error { return nil }
func (reportIncidentRepoStub) List(context.Context, []uuid.UUID) ([]*entity.Incident, error) {
	return []*entity.Incident{}, nil
}
func (reportIncidentRepoStub) GetSummary(context.Context, []uuid.UUID) (map[string]interface{}, error) {
	return map[string]interface{}{}, nil
}

type reportKRIRepoStub struct{}

func (reportKRIRepoStub) Create(context.Context, *entity.KRI) error { return nil }
func (reportKRIRepoStub) GetByID(context.Context, uuid.UUID, []uuid.UUID) (*entity.KRI, error) {
	return nil, nil
}
func (reportKRIRepoStub) Update(context.Context, *entity.KRI) error { return nil }
func (reportKRIRepoStub) Delete(context.Context, uuid.UUID) error { return nil }
func (reportKRIRepoStub) Archive(context.Context, uuid.UUID, string) error { return nil }
func (reportKRIRepoStub) List(context.Context, []uuid.UUID, bool) ([]*entity.KRI, error) {
	return []*entity.KRI{}, nil
}
func (reportKRIRepoStub) GetDashboard(context.Context, []uuid.UUID) (map[string]interface{}, error) {
	return map[string]interface{}{}, nil
}

type reportPDFRendererStub struct{}

func (reportPDFRendererStub) Render(context.Context, *entity.ReportData) ([]byte, error) {
	return []byte("%PDF-1.4 test"), nil
}

func TestGenerateRiskPDFDefaultsToOwnOrgWhenOrgFilterMissing(t *testing.T) {
	own := uuid.New()
	descendant := uuid.New()
	riskRepo := &reportRiskRepoStub{}
	uc := reportuc.NewGenerateReportUseCase(
		riskRepo,
		reportIncidentRepoStub{},
		reportKRIRepoStub{},
	)
	handler := NewReportHandler(uc, reportPDFRendererStub{})

	app := fiber.New()
	app.Get("/reports/risk-pdf", func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{
			Role:             entity.RolePimpinan,
			OrganizationID:   &own,
			AccessibleOrgIDs: []uuid.UUID{own, descendant},
		})
		return c.Next()
	}, handler.GenerateRiskPDF)

	req := httptest.NewRequest(fiber.MethodGet, "/reports/risk-pdf?cycle=2026-H1", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
	if len(riskRepo.lastOrgIDs) != 1 || riskRepo.lastOrgIDs[0] != own {
		t.Fatalf("expected own-org-only PDF scope [%s], got %v", own, riskRepo.lastOrgIDs)
	}
}

func TestGenerateRiskPDFAllowsExplicitDescendantSelection(t *testing.T) {
	own := uuid.New()
	descendant := uuid.New()
	riskRepo := &reportRiskRepoStub{}
	uc := reportuc.NewGenerateReportUseCase(
		riskRepo,
		reportIncidentRepoStub{},
		reportKRIRepoStub{},
	)
	handler := NewReportHandler(uc, reportPDFRendererStub{})

	app := fiber.New()
	app.Get("/reports/risk-pdf", func(c *fiber.Ctx) error {
		c.Locals("accessScope", &entity.AccessScope{
			Role:             entity.RoleReviewer,
			OrganizationID:   &own,
			AccessibleOrgIDs: []uuid.UUID{own, descendant},
		})
		return c.Next()
	}, handler.GenerateRiskPDF)

	req := httptest.NewRequest(fiber.MethodGet, "/reports/risk-pdf?cycle=2026-H1&org_id="+descendant.String(), nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
	if len(riskRepo.lastOrgIDs) != 1 || riskRepo.lastOrgIDs[0] != descendant {
		t.Fatalf("expected descendant PDF scope [%s], got %v", descendant, riskRepo.lastOrgIDs)
	}
}
```

- [ ] **Step 2: Run the report tests and verify the missing-filter case fails**

Run:

```bash
cd backend
go test ./internal/handler/http -run 'TestGenerateRiskPDF(Default|Allows)' -v
```

Expected:
- explicit descendant test may already pass
- missing-filter test fails because current handler expands to all accessible orgs

- [ ] **Step 3: Move report endpoints to `resolveReportOrgIDs`**

Update `backend/internal/handler/http/report.go`:

```go
scope := middleware.GetAccessScope(c)
orgIDs, err := resolveReportOrgIDs(scope, c.Query("org_id"))
if err != nil {
	if stdErrors.Is(err, domainerrors.ErrForbidden) {
		return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
	}
	return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
}
```

Update report-oriented handlers in `backend/internal/handler/http/risk.go` with the same helper:

- `ListApprovedRisks`
- `ListCycleSnapshot`
- `CompareCycles`
- `CompareCyclesDetail`
- `GetDashboardRiskCategories`
- `GetHeatmapVelocity`
- `GetOverdueMitigationsTimeline`
- `GetKRIBreachSummary`
- `GetUnitResponseTime`

Update `backend/internal/handler/http/formal_report.go` so organization parsing uses the shared helper:

```go
orgIDs, err := resolveReportOrgIDs(scope, c.Query("organization_id"))
if err != nil {
	...
}
if len(orgIDs) > 0 {
	organizationID = &orgIDs[0]
}
```

- [ ] **Step 4: Re-run report tests and focused HTTP package tests**

Run:

```bash
cd backend
go test ./internal/handler/http -run 'TestGenerateRiskPDF(Default|Allows)' -v
go test ./internal/handler/http -run 'TestResolve(Operational|Report)OrgIDs' -v
```

Expected:
- PASS for own-org default on missing report filter
- PASS for explicit descendant selection

- [ ] **Step 5: Commit the report-surface backend changes**

```bash
git add backend/internal/handler/http/risk.go backend/internal/handler/http/report.go backend/internal/handler/http/formal_report.go backend/internal/handler/http/report_access_test.go backend/internal/handler/http/access_surface_scope.go
git commit -m "fix: require explicit org selection for cross-unit reports"
```

### Task 4: Add Frontend Report Scope Helper and Gate Cross-Unit Report Loading

**Files:**
- Create: `frontend/src/lib/report-scope.ts`
- Create: `frontend/src/lib/report-scope.test.ts`
- Modify: `frontend/src/app/(app)/reports/page.tsx`
- Modify: `frontend/src/app/(app)/reports/compliance-monitoring/page.tsx`
- Modify: `frontend/src/app/(app)/reports/formal/page.tsx`
- Modify: `frontend/src/app/(app)/reports/risk-cycle-detail-report.tsx`
- Reference: `frontend/src/lib/api/organizations.ts`
- Reference: `frontend/src/lib/organization.ts`
- Reference: `frontend/src/contexts/auth-context.tsx`

- [ ] **Step 1: Write failing tests for report selection rules**

Create `frontend/src/lib/report-scope.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSelectableReportOrganizations,
  needsExplicitReportOrgSelection,
  resolveDefaultReportOrgId,
} from "./report-scope";

const ownOrg = "org-own";
const childOrg = "org-child";

test("needsExplicitReportOrgSelection is true when non-global user has descendant visibility", () => {
  assert.equal(
    needsExplicitReportOrgSelection({
      isGlobal: false,
      organizationId: ownOrg,
      accessibleOrgIds: [ownOrg, childOrg],
    }),
    true,
  );
});

test("resolveDefaultReportOrgId uses own org when no explicit selection gate is needed", () => {
  assert.equal(
    resolveDefaultReportOrgId({
      isGlobal: false,
      organizationId: ownOrg,
      accessibleOrgIds: [ownOrg],
    }),
    ownOrg,
  );
});

test("resolveDefaultReportOrgId returns null when explicit descendant selection is required", () => {
  assert.equal(
    resolveDefaultReportOrgId({
      isGlobal: false,
      organizationId: ownOrg,
      accessibleOrgIds: [ownOrg, childOrg],
    }),
    null,
  );
});

test("buildSelectableReportOrganizations keeps only accessible organizations for non-global users", () => {
  const result = buildSelectableReportOrganizations(
    {
      isGlobal: false,
      organizationId: ownOrg,
      accessibleOrgIds: [ownOrg, childOrg],
    },
    [
      { id: ownOrg, name: "Own", createdAt: "" },
      { id: childOrg, name: "Child", createdAt: "" },
      { id: "org-other", name: "Other", createdAt: "" },
    ],
  );

  assert.deepEqual(
    result.map((item) => item.id),
    [ownOrg, childOrg],
  );
});
```

- [ ] **Step 2: Run the frontend helper tests and verify they fail**

Run:

```bash
cd frontend
node --test --experimental-strip-types src/lib/report-scope.test.ts
```

Expected:
- FAIL with module-not-found for `./report-scope`

- [ ] **Step 3: Implement the report scope helper**

Create `frontend/src/lib/report-scope.ts`:

```ts
type ReportScopeUser = {
  isGlobal: boolean;
  organizationId: string | null;
  accessibleOrgIds: string[];
};

type OrganizationOption = {
  id: string;
  name: string;
  createdAt: string;
};

export function needsExplicitReportOrgSelection(user: ReportScopeUser | null | undefined) {
  if (!user || user.isGlobal) return false;
  const accessible = user.accessibleOrgIds.filter(Boolean);
  return Boolean(user.organizationId) && accessible.length > 1;
}

export function resolveDefaultReportOrgId(user: ReportScopeUser | null | undefined) {
  if (!user || user.isGlobal) return null;
  return needsExplicitReportOrgSelection(user) ? null : user.organizationId;
}

export function buildSelectableReportOrganizations(
  user: ReportScopeUser | null | undefined,
  organizations: OrganizationOption[],
) {
  if (!user || user.isGlobal) return organizations;
  const allowed = new Set(user.accessibleOrgIds);
  return organizations.filter((organization) => allowed.has(organization.id));
}
```

- [ ] **Step 4: Use the helper across report pages**

Update `frontend/src/app/(app)/reports/page.tsx`:

```tsx
const { token, user } = useAuth();
const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

const requiresOrgSelection = useMemo(
  () => needsExplicitReportOrgSelection(user),
  [user],
);

useEffect(() => {
  if (!token) return;
  listAllOrganizations(token).then((all) => {
    const selectable = buildSelectableReportOrganizations(user, all);
    setOrganizations(selectable);
    setSelectedOrgId((current) => current ?? resolveDefaultReportOrgId(user));
  });
}, [token, user]);

useEffect(() => {
  if (!token) return;
  if (requiresOrgSelection && !selectedOrgId) {
    setTrendRisks([]);
    setCycleRisks([]);
    setPreviousCycleRisks([]);
    setComparisons([]);
    setRiskCategoryData([]);
    setRiskCategoryLoading(false);
    return;
  }

  const orgQuery = selectedOrgId ? `&org_id=${encodeURIComponent(selectedOrgId)}` : "";
  Promise.allSettled([
    api.get<RiskTrendSourceItem[]>(`/risks/trend${selectedOrgId ? `?org_id=${encodeURIComponent(selectedOrgId)}` : ""}`, token),
    api.get<DashboardRiskCategoryItem[]>(`/dashboard/risk-categories?cycle=${exportCycle}${orgQuery}`, token),
    api.get<Risk[]>(`/risks/cycle-snapshot?cycle=${encodeURIComponent(exportCycle)}${orgQuery}`, token),
    api.get<Risk[]>(`/risks/cycle-snapshot?cycle=${encodeURIComponent(previousCycle)}${orgQuery}`, token),
    api.get<RiskCycleComparisonItem[]>(`/risks/compare?from=${previousCycle}&to=${exportCycle}${orgQuery}`, token),
  ]);
}, [token, user, requiresOrgSelection, selectedOrgId, exportCycle, previousCycle]);
```

Also update the PDF export URL in the same file:

```ts
const orgQuery = selectedOrgId ? `&org_id=${encodeURIComponent(selectedOrgId)}` : "";
const response = await fetch(
  `${API_BASE}/reports/risk-pdf?cycle=${encodeURIComponent(exportCycle)}${orgQuery}`,
  ...
);
```

Update `frontend/src/app/(app)/reports/compliance-monitoring/page.tsx` so it loads organizations, requires explicit selection when needed, and appends `org_id` to:

- `/dashboard/overdue-mitigation-timeline`
- `/dashboard/kri-breach-summary`
- `/dashboard/unit-response-time`

Update `frontend/src/app/(app)/reports/formal/page.tsx` so it uses `buildSelectableReportOrganizations(user, orgs)` before setting `organizations`, and defaults `formalOrganizationId` with `resolveDefaultReportOrgId(user)` instead of `organizations[0].id`.

Update `frontend/src/app/(app)/reports/risk-cycle-detail-report.tsx`:

```tsx
const selectable = buildSelectableReportOrganizations(user, dedupeOrganizations(data));
setOrganizations(selectable);
setOrgFilter((current) => current !== "all" ? current : (resolveDefaultReportOrgId(user) ?? ""));
```

Replace the `"all"` descendant-wide default with a blank or own-org value plus a “Pilih unit untuk melihat laporan” empty state when `needsExplicitReportOrgSelection(user)` is true and `orgFilter` is empty.

- [ ] **Step 5: Run targeted frontend tests and lint**

Run:

```bash
cd frontend
node --test --experimental-strip-types src/lib/report-scope.test.ts
npm run lint
```

Expected:
- PASS for report scope helper tests
- lint passes without unused imports or stale branch logic

- [ ] **Step 6: Commit the frontend report gating**

```bash
git add frontend/src/lib/report-scope.ts frontend/src/lib/report-scope.test.ts frontend/src/app/'(app)'/reports/page.tsx frontend/src/app/'(app)'/reports/compliance-monitoring/page.tsx frontend/src/app/'(app)'/reports/formal/page.tsx frontend/src/app/'(app)'/reports/risk-cycle-detail-report.tsx
git commit -m "feat: gate cross-unit report access by explicit unit selection"
```

### Task 5: Verify End-to-End Policy Coverage and Clean Up

**Files:**
- Modify: `docs/superpowers/specs/2026-05-23-cross-unit-risk-access-policy-design.md`
- Reference: `backend/internal/handler/http/access_surface_scope.go`
- Reference: `backend/internal/handler/http/risk.go`
- Reference: `frontend/src/app/(app)/reports/page.tsx`
- Reference: `frontend/src/app/(app)/reports/compliance-monitoring/page.tsx`

- [ ] **Step 1: Run the full focused backend and frontend verification set**

Run:

```bash
cd backend
go test ./internal/handler/http
cd ../frontend
node --test --experimental-strip-types src/lib/report-scope.test.ts
npm run lint
```

Expected:
- backend handler tests pass
- frontend helper tests pass
- lint passes

- [ ] **Step 2: Manually smoke-check the product behaviors**

Run the app locally, then verify:

```text
1. Login as unit/reviewer/pimpinan with descendant access.
2. Open /risk/register and confirm only own-unit records appear.
3. Attempt an operational URL with a descendant org filter and confirm it is blocked.
4. Open /reports and confirm the page prompts for unit selection before showing descendant data.
5. Select a descendant unit and confirm charts/export use only that unit.
6. Open /reports/compliance-monitoring and confirm the same unit-selection rule applies.
7. Open /reports/formal and confirm only accessible organizations appear in the selector.
```

- [ ] **Step 3: Update the design note status and implementation notes**

Edit `docs/superpowers/specs/2026-05-23-cross-unit-risk-access-policy-design.md`:

```md
Status: Implemented

## Implementation Notes

- Backend now separates operational and report org resolution in `access_surface_scope.go`.
- Operational risk handlers default to own-unit-only access for non-superadmin users.
- Report pages require explicit unit selection before cross-unit data is shown when descendant visibility exists.
```

- [ ] **Step 4: Commit the verification and doc sync**

```bash
git add docs/superpowers/specs/2026-05-23-cross-unit-risk-access-policy-design.md
git commit -m "docs: finalize cross-unit access policy rollout notes"
```

---

## Self-Review

### Spec coverage

- Operational own-unit-only access: covered in Task 2.
- Report-only descendant access with explicit selection: covered in Tasks 3 and 4.
- Same treatment for `unit`, `reviewer`, and `pimpinan`: enforced via shared scope helper in Task 1.
- Workflow exception left intact: no task broadens workflow handlers; Task 2 and Task 3 touch only browse/report surfaces.
- Report export parity with selected unit: covered in Task 4.

### Placeholder scan

- No `TODO`, `TBD`, or “similar to above” placeholders remain.
- Every command is concrete.
- Every code-edit step includes the intended code shape.

### Type consistency

- Backend helper names are consistent: `resolveOwnOrgID`, `resolveOperationalOrgIDs`, `resolveReportOrgIDs`.
- Frontend helper names are consistent: `needsExplicitReportOrgSelection`, `resolveDefaultReportOrgId`, `buildSelectableReportOrganizations`.
- Query parameter naming remains aligned with existing APIs: `org_id` and `organization_id`.
