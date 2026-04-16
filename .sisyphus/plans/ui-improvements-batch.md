# UI/UX Improvements Batch — 13 Items

## TL;DR

> **Quick Summary**: 13 independent UI/UX improvements across Dashboard, Reports, Monitoring, Risk Form, and Admin pages — including chart replacements, table styling fixes, search optimization, version history, heatmap color intensity, and backend user filter fix.
> 
> **Deliverables**:
> - Version history Sheet on risk form with real API data
> - Standardized `useDeferredValue` search across all search inputs (+ fix broken Controls search)
> - Table styling fixes (remove hover:underline on risk titles, font size normalization)
> - Reports page layout restructure (move chart + collapsible table)
> - Dashboard stacked bar chart for risk categories by severity level
> - Mitigation Progress replacement chart (replacing hidden incident chart)
> - Monitoring panel enhancements (progress bar, review filter, heatmap intensity, font size)
> - Backend OrganizationID filter for user list + frontend org-scoped user dropdowns
> 
> **Estimated Effort**: Medium (15 tasks, ~2-3 days parallel execution)
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: T1 (prereqs) → T2 (backend user filter) → T14 (frontend org filter)

---

## Context

### Original Request
User requested 13 UI/UX improvements across the Manris v2 risk management SaaS application. Items span dashboard charts, report layouts, monitoring panels, table styling, search optimization, and a backend fix for user filtering.

### Interview Summary
**Key Discussions**:
- Stacked bar chart: Backend API already returns severity breakdown (`sangatRendah`, `rendah`, `sedang`, `tinggi`, `ekstrem`) — frontend-only change needed
- Font size: Org/user tables should match risk register (`text-sm`)
- Table underline: Remove `hover:underline` from clickable risk title links, not table headers
- Incident chart: Replace with Mitigation Progress (open vs completed over time) since incident feature is hidden
- Heatmap: Color intensity gradient with numbers kept visible
- Search debounce: Codebase already uses `useDeferredValue` in 7 files — standardize on this pattern
- User filter: Backend `UserListFilter.OrganizationID` field exists but SQL ignores it — fix SQL + add HTTP param
- Risk form has 3 user fetch functions (reviewer, approver, PIC) — all need org filtering

**Research Findings**:
- 5 explore agents mapped all relevant files with exact line numbers
- Controls page search input has NO onChange handler — must fix before optimizing
- Collapsible shadcn component not installed — must install as prerequisite
- `DashboardCategoryCount` struct already includes `SangatRendah/Rendah/Sedang/Tinggi/Ekstrem` fields
- `MitigationTask` entity has `Status` (pending/done/overdue/skipped) + `PeriodLabel` + timestamps — can aggregate for chart
- Auth context provides `organizationId`, `accessibleOrgIds`, `isGlobal`

### Metis Review
**Identified Gaps** (addressed):
- Backend stacked bar task removed — API already returns severity data (frontend-only)
- Controls search onChange handler missing — added as part of search standardization task
- Collapsible component install — added as prerequisite
- All 3 user fetch functions in risk form — all included in org filter task
- `ListUsersParams` type update — included in backend/frontend tasks
- Risk level label `ekstrem` (from API) standardized — use what backend returns
- `useDeferredValue` chosen over `useDebounce` — follows existing codebase pattern

---

## Work Objectives

### Core Objective
Implement 13 UI/UX improvements to enhance usability, visual consistency, and data presentation across the Manris v2 frontend, with 2 supporting backend changes.

### Concrete Deliverables
- Risk form: Version history Sheet with timeline from real API
- All search inputs: Standardized `useDeferredValue` pattern with fixed Controls search
- All risk title links: No hover:underline
- Org/user/monitoring tables: Consistent `text-sm` font size
- Reports page: CriticalRiskRateTrend moved to first grid row + collapsible Progress Kertas Kerja
- Dashboard: Stacked bar chart for risk categories by severity level
- Dashboard: Mitigation Progress chart replacing incident chart
- Monitoring: Progress bar on completion rate table
- Monitoring: Risk review queue filtered to exclude "approved"
- Monitoring: Heatmap with color intensity gradient based on count
- Backend: OrganizationID filter in user list SQL + HTTP handler param
- Frontend: Risk form user dropdowns filtered by logged-in user's organization

### Definition of Done
- [x] `npm run build` passes with zero TypeScript errors
- [x] `go test ./internal/repository/postgres/... ./internal/handler/http/...` passes
- [x] All 13 items verified via agent-executed QA scenarios

### Must Have
- Consistent design with existing components (user's explicit constraint)
- All search inputs use `useDeferredValue` pattern
- Stacked bar reads existing API fields (no backend change)
- User filter works for all 3 user dropdowns (reviewer, approver, PIC)
- Risk review queue excludes "approved" status only

### Must NOT Have (Guardrails)
- NO new backend endpoint for risk categories — data already available
- NO `useDebounce` hook — follow existing `useDeferredValue` pattern
- NO inline diff view, edit-from-version, or rollback in version history
- NO click-to-filter interactions on stacked bar chart (tooltips OK)
- NO burndown projections, trend lines, or forecasting on mitigation chart
- NO audit of all tables for font size — only specific tables mentioned
- NO sorting, pagination, or new features added to Controls page
- NO TanStack Table or new table library — keep existing semantic table pattern
- NO change to heatmap level color palette (5 colors) — only add intensity variation
- NO debounce on filter dropdowns or form inputs — only search text inputs
- NO new report sections or reports grid redesign

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Go tests for backend)
- **Automated tests**: Tests-after (Go test for user filter SQL)
- **Framework**: Go testing (backend), TypeScript compiler (frontend)
- **Frontend verification**: `npm run build` (zero errors) + Playwright for UI

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright — Navigate, interact, assert DOM, screenshot
- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Styling**: Use Playwright — Inspect computed CSS values, screenshot comparisons

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — prerequisites + independent styling):
├── Task 1:  Install Collapsible + Fix Controls search onChange [quick]
├── Task 2:  Remove hover:underline from risk title links [quick]
├── Task 3:  Adjust font size org/user tables (text-xs → text-sm) [quick]
├── Task 4:  Adjust font size monitoring mitigation table [quick]
├── Task 5:  Backend: Add OrganizationID filter to user list SQL [quick]

Wave 2 (After Wave 1 — core features, MAX PARALLEL):
├── Task 6:  Standardize useDeferredValue on all search inputs (depends: T1) [unspecified-high]
├── Task 7:  Reports: Move CriticalRiskRateTrend to first grid row [quick]
├── Task 8:  Reports: Wrap Progress Kertas Kerja with Collapsible (depends: T1) [quick]
├── Task 9:  Dashboard: Convert risk categories to stacked bar chart [unspecified-high]
├── Task 10: Dashboard: Replace incident chart with Mitigation Progress [unspecified-high]
├── Task 11: Monitoring: Add Progress bar to completion rate table [quick]
├── Task 12: Monitoring: Filter risk review queue exclude approved [quick]
├── Task 13: Monitoring: Heatmap color intensity gradient [unspecified-high]

Wave 3 (After Wave 1 — depends on backend):
├── Task 14: Risk form: Filter user dropdowns by organization (depends: T5) [unspecified-high]
├── Task 15: Risk form: Version history Sheet with API data [unspecified-high]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| T1   | —         | T6, T8 | 1    |
| T2   | —         | —      | 1    |
| T3   | —         | —      | 1    |
| T4   | —         | —      | 1    |
| T5   | —         | T14    | 1    |
| T6   | T1        | —      | 2    |
| T7   | —         | —      | 2    |
| T8   | T1        | —      | 2    |
| T9   | —         | —      | 2    |
| T10  | —         | —      | 2    |
| T11  | —         | —      | 2    |
| T12  | —         | —      | 2    |
| T13  | —         | —      | 2    |
| T14  | T5        | —      | 3    |
| T15  | —         | —      | 3    |

### Agent Dispatch Summary

- **Wave 1**: **5 tasks** — T1-T5 → `quick`
- **Wave 2**: **8 tasks** — T6 → `unspecified-high`, T7 → `quick`, T8 → `quick`, T9 → `unspecified-high`, T10 → `unspecified-high`, T11 → `quick`, T12 → `quick`, T13 → `unspecified-high`
- **Wave 3**: **2 tasks** — T14 → `unspecified-high`, T15 → `unspecified-high`
- **FINAL**: **4 tasks** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

**Critical Path**: T1 → T6 (search standardization) and T5 → T14 (user org filter)
**Parallel Speedup**: ~65% faster than sequential
**Max Concurrent**: 8 (Wave 2)

---

## TODOs

- [x] 1. Install Collapsible Component + Fix Controls Search onChange

  **What to do**:
  - Run `npx shadcn@latest add collapsible` in the frontend directory to install the Collapsible component
  - In `frontend/src/app/(app)/compliance/controls/page.tsx` line ~76: the search `<Input>` has no `onChange` handler — add `onChange={(e) => setSearch(e.target.value)}` binding (match the pattern used in other pages like `admin/organizations/page.tsx` line 414-422)
  - Verify `search` state variable exists; if not, add `const [search, setSearch] = useState("")`
  - Verify the search state is used to filter the displayed controls list

  **Must NOT do**:
  - Do NOT add sorting, pagination, or any new table features to Controls page
  - Do NOT modify the Collapsible component after installation
  - Do NOT add debounce/useDeferredValue yet — that's Task 6

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Two small, mechanical changes — component install + adding an onChange handler
  - **Skills**: [`shadcn`]
    - `shadcn`: Needed for correct component installation via npx shadcn CLI
  - **Skills Evaluated but Omitted**:
    - `react-expert`: Not needed — this is a trivial onChange binding, not a complex React pattern

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
  - **Blocks**: Tasks 6 (search standardization), Task 8 (collapsible wrapper)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `frontend/src/app/(app)/admin/organizations/page.tsx:414-422` — Search input with onChange binding pattern to copy for Controls page
  - `frontend/src/app/(app)/admin/users/page.tsx:367-375` — Another search input pattern reference

  **API/Type References**:
  - `frontend/src/components/ui/` — Directory where shadcn components are installed

  **External References**:
  - shadcn CLI: `npx shadcn@latest add collapsible`

  **WHY Each Reference Matters**:
  - `organizations/page.tsx:414-422`: Copy this exact search input pattern (Input component + onChange + state) to ensure consistency
  - `components/ui/`: Verify collapsible.tsx is created here after install

  **Acceptance Criteria**:
  - [ ] `frontend/src/components/ui/collapsible.tsx` exists after install
  - [ ] Controls page search input has `onChange` handler bound to state
  - [ ] `npm run build` passes with zero errors

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Controls page search filters results
    Tool: Playwright
    Preconditions: User logged in, navigated to /compliance/controls
    Steps:
      1. Navigate to http://localhost:3000/compliance/controls
      2. Locate search input with selector `input[placeholder*="Cari"]` or `input[type="text"]`
      3. Type "test" into the search input
      4. Wait 500ms for state update
      5. Assert: search input value is "test" (confirms onChange works)
      6. Screenshot the page
    Expected Result: Search input accepts and displays typed text, page does not error
    Failure Indicators: Input value remains empty after typing, console errors, page crash
    Evidence: .sisyphus/evidence/task-1-controls-search-works.png

  Scenario: Collapsible component file exists
    Tool: Bash
    Preconditions: After running shadcn add command
    Steps:
      1. Run: ls -la frontend/src/components/ui/collapsible.tsx
      2. Assert: file exists (exit code 0)
    Expected Result: File exists with Radix Collapsible wrapper
    Failure Indicators: File not found
    Evidence: .sisyphus/evidence/task-1-collapsible-installed.txt
  ```

  **Commit**: YES
  - Message: `chore: install collapsible component + fix controls search`
  - Files: `frontend/src/components/ui/collapsible.tsx`, `frontend/src/app/(app)/compliance/controls/page.tsx`
  - Pre-commit: `npm run build`

- [x] 2. Remove hover:underline from Clickable Risk Title Links

  **What to do**:
  - Search all table pages for risk title links that have `hover:underline` className
  - Use `ast_grep_search` or `grep` with pattern `hover:underline` across `frontend/src/app/(app)/` to find all instances
  - Remove `hover:underline` from risk title `<Link>` or `<a>` elements in table cells
  - Known locations to check: risk register table, monitoring tables, any table displaying risk titles as clickable links
  - Keep `hover:text-primary` or other hover effects if present — only remove the underline

  **Must NOT do**:
  - Do NOT remove underline from non-table links (breadcrumbs, navigation, etc.)
  - Do NOT change any other hover styles
  - Do NOT modify table headers — only clickable risk title cell content

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple CSS class removal across a few files — find-and-remove pattern
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: Not needed — we're removing a style, not designing anything

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5)
  - **Blocks**: None
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/risk/register/page.tsx` — Risk register table with risk title links (primary target)
  - `frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx` — Risk review queue table with risk title links
  - `frontend/src/app/(app)/compliance/_components/mitigation-monitoring-panel.tsx` — Mitigation table with risk title links

  **WHY Each Reference Matters**:
  - These are the 3 main tables that display clickable risk titles — search all of them for `hover:underline`
  - Use `grep -rn "hover:underline" frontend/src/` to find ALL instances before making changes

  **Acceptance Criteria**:
  - [ ] Zero instances of `hover:underline` on risk title links in table cells
  - [ ] `grep -rn "hover:underline" frontend/src/app/` returns no results for table risk title links
  - [ ] `npm run build` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Risk titles in register table have no underline on hover
    Tool: Playwright
    Preconditions: User logged in, risks exist in database
    Steps:
      1. Navigate to http://localhost:3000/risk/register
      2. Find first risk title link in table: `table tbody tr:first-child td a` or similar
      3. Hover over the risk title link
      4. Get computed style `text-decoration` of the hovered element
      5. Assert: text-decoration does NOT contain "underline"
      6. Screenshot with hover state visible
    Expected Result: Risk title shows no underline when hovered
    Failure Indicators: text-decoration contains "underline" on hover
    Evidence: .sisyphus/evidence/task-2-no-underline-hover.png

  Scenario: No hover:underline classes remain in table files
    Tool: Bash
    Preconditions: Changes applied
    Steps:
      1. Run: grep -rn "hover:underline" frontend/src/app/
      2. Assert: No results in table-related files (some may exist in non-table contexts — that's OK)
    Expected Result: Zero matches in risk table files
    Evidence: .sisyphus/evidence/task-2-grep-results.txt
  ```

  **Commit**: YES
  - Message: `style: remove hover:underline from risk title links in tables`
  - Files: All files where `hover:underline` was removed from risk title links
  - Pre-commit: `npm run build`

- [x] 3. Adjust Font Size — Organization & User Admin Tables

  **What to do**:
  - In `frontend/src/app/(app)/admin/organizations/page.tsx`: find all `<TableCell>` elements with `text-xs` className and change to `text-sm`
  - In `frontend/src/app/(app)/admin/users/page.tsx`: find all `<TableCell>` elements with `text-xs` className and change to `text-sm`
  - Reference `frontend/src/app/(app)/risk/register/page.tsx` for the target font size — this table uses `text-sm` for cell content
  - Only change body cells (`<TableCell>`), NOT header cells (`<TableHead>`) unless they also use `text-xs`

  **Must NOT do**:
  - Do NOT change font size in any other tables besides org and user admin tables
  - Do NOT change font weight, color, or other typographic properties
  - Do NOT modify table structure or layout

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mechanical find-and-replace of `text-xs` to `text-sm` in 2 specific files
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `typeset`: Overkill — we know exactly what to change

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5)
  - **Blocks**: None
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/risk/register/page.tsx` — Risk register table that uses `text-sm` for body cells — this is the target style to match
  - `frontend/src/app/(app)/admin/organizations/page.tsx` — Org table with `text-xs` cells (change target)
  - `frontend/src/app/(app)/admin/users/page.tsx` — User table with `text-xs` cells (change target)

  **WHY Each Reference Matters**:
  - `risk/register/page.tsx`: Visual reference for correct font size — match this
  - `organizations/page.tsx` and `users/page.tsx`: The two files to modify — find all `text-xs` in TableCell components

  **Acceptance Criteria**:
  - [ ] All `<TableCell>` in organizations page use `text-sm` (not `text-xs`)
  - [ ] All `<TableCell>` in users page use `text-sm` (not `text-xs`)
  - [ ] `npm run build` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Organization table cells use text-sm font size
    Tool: Playwright
    Preconditions: User logged in as super_admin, navigated to organizations admin
    Steps:
      1. Navigate to http://localhost:3000/admin/organizations
      2. Wait for table to load
      3. Select first table body cell: `table tbody tr:first-child td:first-child`
      4. Get computed font-size
      5. Assert: font-size is "14px" (text-sm = 0.875rem = 14px at default root)
      6. Screenshot table
    Expected Result: Table body cells render at 14px (text-sm)
    Failure Indicators: font-size is "12px" (text-xs) or other unexpected value
    Evidence: .sisyphus/evidence/task-3-org-table-font.png

  Scenario: User table cells use text-sm font size
    Tool: Playwright
    Preconditions: User logged in as super_admin, navigated to users admin
    Steps:
      1. Navigate to http://localhost:3000/admin/users
      2. Wait for table to load
      3. Select first table body cell: `table tbody tr:first-child td:first-child`
      4. Get computed font-size
      5. Assert: font-size is "14px" (text-sm)
      6. Screenshot table
    Expected Result: Table body cells render at 14px (text-sm)
    Failure Indicators: font-size is "12px" (text-xs)
    Evidence: .sisyphus/evidence/task-3-user-table-font.png
  ```

  **Commit**: YES (groups with Task 4)
  - Message: `style: normalize font size to text-sm in org/user tables`
  - Files: `frontend/src/app/(app)/admin/organizations/page.tsx`, `frontend/src/app/(app)/admin/users/page.tsx`
  - Pre-commit: `npm run build`

- [x] 4. Adjust Font Size — Monitoring Mitigation Table

  **What to do**:
  - In `frontend/src/app/(app)/compliance/_components/mitigation-monitoring-panel.tsx` lines 290-418: find all `<TableCell>` elements with `text-xs` className and change to `text-sm`
  - Match the font size of the risk register table (`text-sm`)
  - Check both `<TableCell>` and `<TableHead>` elements in the mitigation table section

  **Must NOT do**:
  - Do NOT change font size in other panels within the monitoring page (risk review panel, heatmap)
  - Do NOT change other typographic properties

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-file find-and-replace of text-xs to text-sm in table cells
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5)
  - **Blocks**: None
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/compliance/_components/mitigation-monitoring-panel.tsx:290-418` — Mitigation table section with `text-xs` cells
  - `frontend/src/app/(app)/risk/register/page.tsx` — Risk register table as the style reference (uses `text-sm`)

  **WHY Each Reference Matters**:
  - `mitigation-monitoring-panel.tsx:290-418`: The target file — find `text-xs` in this range and change to `text-sm`
  - `risk/register/page.tsx`: The benchmark — this is what the user wants the mitigation table to look like

  **Acceptance Criteria**:
  - [ ] All `<TableCell>` in mitigation table use `text-sm`
  - [ ] `npm run build` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Mitigation table cells use text-sm font size
    Tool: Playwright
    Preconditions: User logged in, navigated to monitoring page
    Steps:
      1. Navigate to http://localhost:3000/compliance/monitoring
      2. Wait for mitigation monitoring panel to load
      3. Locate mitigation table section
      4. Select first table body cell in mitigation table
      5. Get computed font-size
      6. Assert: font-size is "14px" (text-sm)
      7. Screenshot mitigation table
    Expected Result: Mitigation table body cells render at 14px
    Failure Indicators: font-size is "12px" (text-xs)
    Evidence: .sisyphus/evidence/task-4-mitigation-table-font.png
  ```

  **Commit**: YES
  - Message: `style: match monitoring mitigation table font to text-sm`
  - Files: `frontend/src/app/(app)/compliance/_components/mitigation-monitoring-panel.tsx`
  - Pre-commit: `npm run build`

- [x] 5. Backend: Add OrganizationID Filter to User List SQL + HTTP Param

  **What to do**:
  - In `backend/internal/repository/postgres/user.go` in `ListWithFilter()` function: add a SQL WHERE clause for `organization_id = $N` when `filter.OrganizationID` is not empty/nil
  - Follow the existing pattern for how `Q`, `Status`, and `Role` filters are added (parameter counting with `$N` placeholders, appending to args slice)
  - In `backend/internal/handler/http/user.go` in the ListUsers handler: add query param parsing for `organizationId` and pass it to the filter struct as `OrganizationID`
  - The `UserListFilter` struct in `backend/internal/domain/repository/user.go` already has `OrganizationID *uuid.UUID` field — no struct changes needed
  - Write a Go test: `TestListWithFilter_OrganizationID` in the appropriate test file

  **Must NOT do**:
  - Do NOT change the `UserListFilter` struct — it already has the field
  - Do NOT add any other new filters
  - Do NOT modify any other repository methods

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Adding one SQL WHERE clause + one query param — follows existing filter pattern exactly
  - **Skills**: [`backend-go`]
    - `backend-go`: Enforces Go backend best practices, clean architecture patterns, and test-driven approach
  - **Skills Evaluated but Omitted**:
    - `postgres-pro`: Not needed — this is a simple WHERE clause addition, not query optimization

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4)
  - **Blocks**: Task 14 (frontend org filter depends on this backend endpoint)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `backend/internal/repository/postgres/user.go` — `ListWithFilter()` function — see how `Q`, `Status`, `Role` filters are implemented with parameterized queries. Follow this exact pattern for `OrganizationID`
  - `backend/internal/handler/http/user.go` — ListUsers handler — see how `q`, `status`, `role` query params are parsed. Add `organizationId` the same way

  **API/Type References**:
  - `backend/internal/domain/repository/user.go` — `UserListFilter` struct with `OrganizationID *uuid.UUID` field (already defined, just unused in SQL)

  **Test References**:
  - Existing test files in `backend/internal/repository/postgres/` or `backend/internal/handler/http/` — follow existing test patterns

  **WHY Each Reference Matters**:
  - `postgres/user.go:ListWithFilter()`: The function to modify — copy the `if filter.Role != "" { ... }` pattern for `if filter.OrganizationID != nil { ... }`
  - `http/user.go:ListUsers`: The handler to modify — add `c.Query("organizationId")` parsing and `uuid.Parse()` validation
  - `domain/repository/user.go:UserListFilter`: Confirms the field exists and its type (`*uuid.UUID`)

  **Acceptance Criteria**:
  - [ ] `ListWithFilter()` includes WHERE clause for `organization_id` when `filter.OrganizationID` is set
  - [ ] ListUsers HTTP handler accepts `?organizationId=<uuid>` query param
  - [ ] `go test ./internal/repository/postgres/...` passes
  - [ ] `go build ./...` succeeds

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: User list filtered by organizationId returns correct users
    Tool: Bash (curl)
    Preconditions: Backend running, users exist across multiple organizations
    Steps:
      1. Get auth token: curl -s -X POST http://localhost:8080/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"admin@manris.go.id","password":"admin123"}' | jq -r '.token'
      2. Get all users (unfiltered): curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/users" | jq '.data | length'
      3. Pick an organization ID from the response: curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/users" | jq -r '.data[0].organizationId'
      4. Get filtered users: curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/users?organizationId=$ORG_ID"
      5. Assert: all returned users have `organizationId == $ORG_ID`
      6. Assert: filtered count < unfiltered count (proves filtering works)
    Expected Result: Only users from the specified organization are returned
    Failure Indicators: Users from other organizations appear, or endpoint returns 400/500
    Evidence: .sisyphus/evidence/task-5-user-filter-curl.txt

  Scenario: Invalid organizationId returns appropriate error
    Tool: Bash (curl)
    Preconditions: Backend running
    Steps:
      1. curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/users?organizationId=invalid-uuid"
      2. Assert: response status is 400 or organizationId is ignored gracefully
    Expected Result: Either 400 Bad Request or graceful ignore (no 500)
    Failure Indicators: 500 Internal Server Error
    Evidence: .sisyphus/evidence/task-5-user-filter-invalid.txt
  ```

  **Commit**: YES
  - Message: `fix(backend): implement OrganizationID filter in user list SQL`
  - Files: `backend/internal/repository/postgres/user.go`, `backend/internal/handler/http/user.go`
  - Pre-commit: `go test ./internal/...`

- [x] 6. Standardize useDeferredValue on All Search Inputs

  **What to do**:
  - Audit ALL search inputs across the frontend using `grep -rn "setSearch\|searchQuery\|searchTerm\|[Ss]earch.*[Ii]nput" frontend/src/app/`
  - Ensure every search input that triggers API calls or filtering uses `useDeferredValue`:
    1. `admin/organizations/page.tsx` — already uses `useDeferredValue` ✓ (verify)
    2. `admin/users/page.tsx` — already uses `useDeferredValue` ✓ (verify)
    3. `compliance/controls/page.tsx` — NEEDS `useDeferredValue` added (search was broken, fixed in T1)
    4. `compliance/_components/risk-review-panel.tsx` — already uses `useDeferredValue` ✓ (verify)
    5. `risk/register/page.tsx` — already uses `useDeferredValue` ✓ (verify)
    6. `risk/working-papers/page.tsx` — already uses `useDeferredValue` ✓ (verify)
    7. `components/risk/remote-user-picker.tsx` — already uses `useDeferredValue` ✓ (verify)
  - For Controls page: add `const deferredSearch = useDeferredValue(search)` and use `deferredSearch` in the filtering logic instead of `search` directly
  - Ensure the deferred value is what gets passed to API calls or filter functions (not the raw state)

  **Must NOT do**:
  - Do NOT create a `useDebounce` hook — follow existing `useDeferredValue` pattern
  - Do NOT add `useDeferredValue` to filter dropdowns or form inputs — only search text inputs
  - Do NOT change the search UX (input appearance, placeholder text, etc.)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Requires auditing multiple files across the codebase and ensuring consistency — more than a quick change
  - **Skills**: [`react-expert`]
    - `react-expert`: Needed for correct `useDeferredValue` usage with React 18+ concurrent features
  - **Skills Evaluated but Omitted**:
    - `vercel-react-best-practices`: The pattern is already established in the codebase

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Wave 2 tasks)
  - **Parallel Group**: Wave 2 (with Tasks 7-13)
  - **Blocks**: None
  - **Blocked By**: Task 1 (Controls search onChange must be fixed first)

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/admin/organizations/page.tsx:208` — `const deferredSearch = useDeferredValue(search)` — canonical pattern to follow
  - `frontend/src/app/(app)/risk/register/page.tsx:291-292` — Another `useDeferredValue` usage showing deferred search + deferred filter
  - `frontend/src/components/risk/remote-user-picker.tsx:74` — `useDeferredValue(query.trim())` pattern with trim

  **WHY Each Reference Matters**:
  - `organizations/page.tsx:208`: Copy this exact pattern for the Controls page — `import { useDeferredValue } from "react"`, create deferred value, use it in filtering
  - `risk/register/page.tsx:291`: Shows how to defer multiple values if Controls has multiple filters
  - `remote-user-picker.tsx:74`: Shows the `.trim()` variant if needed

  **Acceptance Criteria**:
  - [ ] Controls page search uses `useDeferredValue` for filtering
  - [ ] All search inputs across the app use `useDeferredValue` (audit confirms 7/7 files)
  - [ ] No `useDebounce` hook exists in the codebase
  - [ ] `npm run build` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Controls page search uses deferred value pattern
    Tool: Bash
    Preconditions: Changes applied
    Steps:
      1. Run: grep -n "useDeferredValue" frontend/src/app/\(app\)/compliance/controls/page.tsx
      2. Assert: at least 1 match found (import + usage)
      3. Run: grep -c "useDeferredValue" frontend/src/app/\(app\)/compliance/controls/page.tsx
      4. Assert: count >= 2 (import line + usage line)
    Expected Result: Controls page imports and uses useDeferredValue
    Failure Indicators: grep returns 0 matches
    Evidence: .sisyphus/evidence/task-6-controls-deferred.txt

  Scenario: All search inputs use useDeferredValue (audit)
    Tool: Bash
    Preconditions: All changes applied
    Steps:
      1. Run: grep -rn "useDeferredValue" frontend/src/app/ frontend/src/components/ | grep -v node_modules | grep -v ".next"
      2. Assert: results include files for: organizations, users, controls, risk-review-panel, register, working-papers, remote-user-picker
      3. Run: grep -rn "useDebounce" frontend/src/ | grep -v node_modules
      4. Assert: 0 results (no useDebounce hook exists)
    Expected Result: 7+ files use useDeferredValue, 0 files use useDebounce
    Evidence: .sisyphus/evidence/task-6-audit-deferred.txt
  ```

  **Commit**: YES
  - Message: `refactor: standardize search inputs with useDeferredValue`
  - Files: `frontend/src/app/(app)/compliance/controls/page.tsx` (primary), others if fixes needed
  - Pre-commit: `npm run build`

- [x] 7. Reports: Move CriticalRiskRateTrend to First Grid Row

  **What to do**:
  - In `frontend/src/app/(app)/reports/page.tsx`:
    - The first 3-column grid (line ~689) currently has 2 components: Top Unit Exposure + Risk Trend Report, with an empty 3rd column
    - The second 3-column grid (line ~899) has: InherentResidualTrend + CriticalRiskRateTrend + OrgLatestProgress
    - Move `<CriticalRiskRateTrend>` component from the second grid to fill the empty 3rd column in the first grid
    - This makes: First row = [Top Unit Exposure | Risk Trend Report | CriticalRiskRateTrend]
    - Second row becomes: [InherentResidualTrend | OrgLatestProgress] (2 items in 3-col grid, or adjust to 2-col)
  - The component import `CriticalRiskRateTrend` from `./reports/_components/critical-risk-rate-trend` stays the same

  **Must NOT do**:
  - Do NOT redesign the reports page grid system
  - Do NOT modify the CriticalRiskRateTrend component itself
  - Do NOT add new report sections

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Moving a JSX element from one grid position to another — pure layout change
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 8-13)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/reports/page.tsx:689` — First 3-col grid with 2 filled columns (target: add CriticalRiskRateTrend here)
  - `frontend/src/app/(app)/reports/page.tsx:899` — Second 3-col grid where CriticalRiskRateTrend currently lives (source: remove from here)
  - `frontend/src/app/(app)/reports/_components/critical-risk-rate-trend.tsx` — The component being moved (DO NOT modify)

  **WHY Each Reference Matters**:
  - Line ~689: Find the grid `div` and add CriticalRiskRateTrend as the 3rd child
  - Line ~899: Find CriticalRiskRateTrend JSX and cut it from here
  - Component file: Just for reference — don't modify it, only move its usage

  **Acceptance Criteria**:
  - [ ] CriticalRiskRateTrend renders in the first grid row (3rd column)
  - [ ] CriticalRiskRateTrend does NOT render in the second grid row
  - [ ] Second grid row still renders remaining components correctly
  - [ ] `npm run build` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: CriticalRiskRateTrend is in first grid row
    Tool: Playwright
    Preconditions: User logged in, navigated to reports
    Steps:
      1. Navigate to http://localhost:3000/reports
      2. Wait for page to fully load
      3. Screenshot the full reports page
      4. Verify CriticalRiskRateTrend card (look for "Tingkat Risiko Kritis" heading) is visually aligned with Top Unit Exposure and Risk Trend Report
    Expected Result: Three charts are visually on the same row
    Failure Indicators: CriticalRiskRateTrend still below the first row, or layout broken
    Evidence: .sisyphus/evidence/task-7-reports-layout.png

  Scenario: Build passes after layout change
    Tool: Bash
    Steps:
      1. Run: cd frontend && npm run build
      2. Assert: exit code 0, no TypeScript errors
    Expected Result: Clean build
    Evidence: .sisyphus/evidence/task-7-build.txt
  ```

  **Commit**: YES
  - Message: `refactor: move CriticalRiskRateTrend to reports first grid row`
  - Files: `frontend/src/app/(app)/reports/page.tsx`
  - Pre-commit: `npm run build`

- [x] 8. Reports: Wrap Progress Kertas Kerja Table with Collapsible

  **What to do**:
  - In `frontend/src/app/(app)/reports/page.tsx` or `frontend/src/app/(app)/reports/_components/organization-latest-progress-chart.tsx`: wrap the Progress Kertas Kerja Terakhir table with the shadcn Collapsible component
  - Import `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger` from `@/components/ui/collapsible`
  - The trigger should be the card header area with a chevron icon toggle (use `ChevronDown` from lucide-react, rotate on open)
  - Default state: **expanded** (open by default, user can collapse)
  - Add state: `const [isOpen, setIsOpen] = useState(true)`
  - Wrap table content in `<CollapsibleContent>`, trigger in card header

  **Must NOT do**:
  - Do NOT change the table content or data
  - Do NOT make other report sections collapsible (only this one)
  - Do NOT change the card styling

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Wrapping existing JSX with Collapsible component — straightforward component composition
  - **Skills**: [`shadcn`]
    - `shadcn`: Ensures correct usage of shadcn Collapsible component API
  - **Skills Evaluated but Omitted**:
    - `react-expert`: Not needed for simple component wrapping

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 9-13)
  - **Blocks**: None
  - **Blocked By**: Task 1 (Collapsible component must be installed first)

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/reports/_components/organization-latest-progress-chart.tsx` — The Progress Kertas Kerja component to wrap
  - `frontend/src/components/ui/collapsible.tsx` — Collapsible component (installed in Task 1)

  **External References**:
  - shadcn Collapsible docs: https://ui.shadcn.com/docs/components/collapsible

  **WHY Each Reference Matters**:
  - `organization-latest-progress-chart.tsx`: The component to modify — wrap its card content with Collapsible
  - `collapsible.tsx`: The component to import and use

  **Acceptance Criteria**:
  - [ ] Progress Kertas Kerja table is wrapped in Collapsible
  - [ ] Default state is expanded (open)
  - [ ] Clicking trigger collapses/expands the table
  - [ ] Chevron icon rotates on toggle
  - [ ] `npm run build` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Collapsible toggle works on Progress Kertas Kerja
    Tool: Playwright
    Preconditions: User logged in, navigated to reports
    Steps:
      1. Navigate to http://localhost:3000/reports
      2. Wait for page load
      3. Find the "Progress Kertas Kerja" card section
      4. Assert: table content is visible (default expanded)
      5. Screenshot: .sisyphus/evidence/task-8-collapsible-open.png
      6. Click the collapsible trigger (header area with chevron)
      7. Wait 300ms for animation
      8. Assert: table content is hidden (collapsed)
      9. Screenshot: .sisyphus/evidence/task-8-collapsible-closed.png
      10. Click trigger again
      11. Assert: table content is visible again
    Expected Result: Table toggles between visible and hidden on trigger click
    Failure Indicators: Table doesn't collapse, trigger not clickable, animation broken
    Evidence: .sisyphus/evidence/task-8-collapsible-open.png, .sisyphus/evidence/task-8-collapsible-closed.png
  ```

  **Commit**: YES
  - Message: `feat: add collapsible wrapper to Progress Kertas Kerja table`
  - Files: `frontend/src/app/(app)/reports/_components/organization-latest-progress-chart.tsx`
  - Pre-commit: `npm run build`

- [x] 9. Dashboard: Convert Risk Categories Chart to Stacked Bar by Severity

  **What to do**:
  - In `frontend/src/app/(app)/overview/page.tsx` lines 399-449: the "Distribusi Kategori Risiko" chart currently renders a simple horizontal `<BarChart>` showing `{label, count}` per category
  - The backend API (`/api/v1/dashboard/risk-categories`) already returns fields: `sangatRendah`, `rendah`, `sedang`, `tinggi`, `ekstrem` per category — frontend currently ignores these
  - Convert the chart to a **stacked horizontal bar** using Recharts `<BarChart>` with `stackId="a"` on multiple `<Bar>` components:
    - `<Bar dataKey="sangatRendah" stackId="a" fill="..." name="Sangat Rendah" />`
    - `<Bar dataKey="rendah" stackId="a" fill="..." name="Rendah" />`
    - `<Bar dataKey="sedang" stackId="a" fill="..." name="Sedang" />`
    - `<Bar dataKey="tinggi" stackId="a" fill="..." name="Tinggi" />`
    - `<Bar dataKey="ekstrem" stackId="a" fill="..." name="Ekstrem" />`
  - Use risk level colors from the codebase:
    - Sangat Rendah: `oklch(0.72 0.17 155)` (green-ish)
    - Rendah: use a lighter warm color or derive from existing palette
    - Sedang: `oklch(0.75 0.15 75)` (yellow-ish)
    - Tinggi: `oklch(0.70 0.18 40)` (orange)
    - Ekstrem: `oklch(0.62 0.22 27)` (red)
  - Add a `<Legend>` component to show the severity level labels
  - Update the TypeScript type for the chart data to include all severity fields (match `DashboardCategoryCount` from backend)
  - Remove the old single `<Bar>` component

  **Must NOT do**:
  - Do NOT modify the backend API — it already returns the data
  - Do NOT add click-to-filter interaction on bars
  - Do NOT change the chart title, card, or surrounding layout
  - Do NOT switch to a vertical bar orientation (keep horizontal if currently horizontal)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Recharts configuration with multiple stacked bars, color mapping, legend, and TypeScript type updates
  - **Skills**: [`react-expert`]
    - `react-expert`: For correct Recharts component composition and TypeScript typing
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: Chart is data-driven, not design-driven — colors come from existing palette

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-8, 10-13)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/overview/page.tsx:399-449` — Current risk categories BarChart implementation (the code to replace)
  - `frontend/src/app/(app)/overview/page.tsx:573-631` — Incident vs Mitigation chart with multiple Bars — reference for multi-bar Recharts pattern
  - `frontend/src/app/(app)/risk/register/page.tsx` or any file with `heatmapLevelColors` — Risk level color definitions

  **API/Type References**:
  - `backend/internal/domain/entity/dashboard.go:35-44` — `DashboardCategoryCount` struct showing exact JSON field names: `sangatRendah`, `rendah`, `sedang`, `tinggi`, `ekstrem`

  **External References**:
  - Recharts StackedBarChart: https://recharts.org/en-US/examples/StackedBarChart

  **WHY Each Reference Matters**:
  - `overview/page.tsx:399-449`: The chart to modify — understand current data flow, props, and layout
  - `overview/page.tsx:573-631`: Shows how to use multiple `<Bar>` components with different dataKeys in the same chart
  - `dashboard.go:35-44`: Exact field names the frontend should map to `dataKey` props
  - Risk level colors: Ensure visual consistency with heatmap and other risk-colored elements

  **Acceptance Criteria**:
  - [ ] Chart renders 5 stacked bar segments per category
  - [ ] Each segment maps to a severity level (sangatRendah through ekstrem)
  - [ ] Colors match the existing risk level color palette
  - [ ] Legend shows all 5 severity level names
  - [ ] Chart reads existing API response fields (no new API call)
  - [ ] `npm run build` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Stacked bar chart renders with 5 severity segments
    Tool: Playwright
    Preconditions: User logged in, dashboard has risk data
    Steps:
      1. Navigate to http://localhost:3000/overview
      2. Wait for dashboard to fully load
      3. Find the "Distribusi Kategori Risiko" card
      4. Count the number of distinct <rect> elements within the bar chart SVG that represent bar segments
      5. Assert: Each category bar has up to 5 colored segments (some may be 0)
      6. Check for <Legend> element presence in the chart
      7. Screenshot the chart
    Expected Result: Stacked bars visible with multiple colored segments, legend present
    Failure Indicators: Single-color bars (not stacked), no legend, chart errors
    Evidence: .sisyphus/evidence/task-9-stacked-bar.png

  Scenario: Chart data matches API response fields
    Tool: Bash
    Preconditions: Backend running
    Steps:
      1. curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/dashboard/risk-categories" | jq '.[0]'
      2. Assert: response object contains fields: category, count, sangatRendah, rendah, sedang, tinggi, ekstrem
    Expected Result: API returns severity breakdown per category
    Failure Indicators: Missing severity fields
    Evidence: .sisyphus/evidence/task-9-api-response.txt
  ```

  **Commit**: YES
  - Message: `feat: convert risk categories chart to stacked bar by severity`
  - Files: `frontend/src/app/(app)/overview/page.tsx`
  - Pre-commit: `npm run build`

- [x] 10. Dashboard: Replace Incident Chart with Mitigation Progress Chart

  **What to do**:
  - In `frontend/src/app/(app)/overview/page.tsx` lines 573-631: the "Incident vs Mitigation Closure" `<ComposedChart>` must be replaced entirely
  - Replace with a **Mitigation Progress** chart showing open vs completed mitigations
  - Data approach: Use existing mitigation task data (from `/api/v1/mitigation-tasks` or similar endpoint) and aggregate by period/status
  - If no time-series endpoint exists, create a simpler chart showing current mitigation status distribution:
    - Option A (preferred): Bar chart with `pending`, `done`, `overdue`, `skipped` counts — single snapshot
    - Option B: If period data available from mitigation tasks, show line/bar chart over periods
  - Use appropriate colors: done=green, pending=yellow, overdue=red, skipped=gray
  - Update the card title from "Incident vs Mitigation Closure" to "Progress Mitigasi" or "Status Mitigasi"
  - Remove all incident-related imports, types, and mock data associated with the old chart

  **Must NOT do**:
  - Do NOT add burndown projections, trend lines, or forecasting
  - Do NOT create a new backend endpoint (use existing data)
  - Do NOT keep any incident-related code/references in the chart section

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Requires investigating available data, designing chart approach, and implementing Recharts chart from scratch
  - **Skills**: [`react-expert`]
    - `react-expert`: For Recharts chart implementation and data fetching patterns
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: Chart is data-driven, standard Recharts visualization

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-9, 11-13)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/overview/page.tsx:573-631` — Current Incident vs Mitigation chart (the code to REPLACE)
  - `frontend/src/app/(app)/overview/page.tsx:399-449` — Risk categories chart — reference for chart card structure and styling
  - `frontend/src/app/(app)/compliance/_components/mitigation-monitoring-panel.tsx` — Shows how mitigation data is fetched and structured

  **API/Type References**:
  - `backend/internal/domain/entity/mitigation_task.go` — `MitigationTask` entity with `Status` (pending/done/overdue/skipped), `PeriodLabel`, `PeriodStart`, `PeriodEnd`
  - Check if dashboard already has mitigation summary endpoint, or if data needs to be derived from mitigation task list

  **WHY Each Reference Matters**:
  - `overview/page.tsx:573-631`: The exact code to remove and replace — understand the card wrapper to keep
  - `mitigation-monitoring-panel.tsx`: Shows existing patterns for fetching and displaying mitigation data — reuse fetch logic
  - `mitigation_task.go`: Entity fields available for chart data — status + period for potential time-series

  **Acceptance Criteria**:
  - [ ] Incident chart completely removed (no incident references in this section)
  - [ ] New chart shows mitigation progress/status data
  - [ ] Card title updated to reflect mitigation content
  - [ ] Colors match semantic meaning (done=green, overdue=red, etc.)
  - [ ] `npm run build` passes
  - [ ] No broken imports or unused variables

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Mitigation progress chart renders correctly
    Tool: Playwright
    Preconditions: User logged in, dashboard loaded
    Steps:
      1. Navigate to http://localhost:3000/overview
      2. Wait for full load
      3. Find chart card with title containing "Mitigasi" or "Progress"
      4. Assert: card exists and contains an SVG chart element
      5. Assert: NO text containing "Incident" exists in this card
      6. Screenshot the chart
    Expected Result: Chart shows mitigation data, no incident references
    Failure Indicators: "Incident" text visible, chart empty, rendering error
    Evidence: .sisyphus/evidence/task-10-mitigation-chart.png

  Scenario: No incident references remain in dashboard chart section
    Tool: Bash
    Steps:
      1. grep -n -i "incident" frontend/src/app/\(app\)/overview/page.tsx
      2. Review results — assert no incident references in the chart section (lines 573-631 area)
      3. Some incident references may exist elsewhere on the dashboard — that's OK if they're in hidden/commented sections
    Expected Result: Chart section has zero incident references
    Evidence: .sisyphus/evidence/task-10-no-incidents.txt
  ```

  **Commit**: YES
  - Message: `feat: replace incident chart with mitigation progress on dashboard`
  - Files: `frontend/src/app/(app)/overview/page.tsx`
  - Pre-commit: `npm run build`

- [x] 11. Monitoring: Add Progress Bar to Completion Rate Table

  **What to do**:
  - In `frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx` lines 648-696: the Completion Rate per Unit table has a "Rate" column (line 656) showing `{unit.completionRate.toFixed(1)}%`
  - Add a `<Progress>` component next to or replacing the percentage text to visually represent the completion rate
  - Import `Progress` from `@/components/ui/progress` (already exists in the codebase, `h-1 bg-muted` by default)
  - Implementation: In the Rate `<TableCell>` (line 689-691):
    ```tsx
    <TableCell className="text-right text-sm">
      <div className="flex items-center gap-2">
        <Progress value={unit.completionRate} className="h-2 flex-1" />
        <span className="w-12 text-right font-semibold">{unit.completionRate.toFixed(1)}%</span>
      </div>
    </TableCell>
    ```
  - Adjust `w-28` on the TableHead to `w-40` or wider to accommodate progress bar + text
  - Keep the percentage number visible alongside the bar

  **Must NOT do**:
  - Do NOT change the progress bar component itself (`components/ui/progress.tsx`)
  - Do NOT add progress bars to other tables
  - Do NOT change the data source or calculation

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Adding one component to one table cell — straightforward component insertion
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `shadcn`: Progress component already installed, just needs importing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-10, 12, 13)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx:648-696` — Completion Rate per Unit table — the specific cell to modify is line 689-691
  - `frontend/src/components/ui/progress.tsx` — Existing Progress component (uses Radix Progress primitive, `h-1 bg-muted` default)

  **WHY Each Reference Matters**:
  - `risk-review-panel.tsx:689-691`: The exact `<TableCell>` to modify — add Progress component here
  - `progress.tsx`: Verify the component API — `<Progress value={number} className="..." />` where value is 0-100

  **Acceptance Criteria**:
  - [ ] Each row in completion rate table shows a progress bar next to the percentage
  - [ ] Progress bar fill corresponds to `completionRate` value (e.g., 75% fill for 75%)
  - [ ] Percentage text still visible alongside the bar
  - [ ] `npm run build` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Progress bar renders in completion rate table
    Tool: Playwright
    Preconditions: User logged in, monitoring page loaded, completion data exists
    Steps:
      1. Navigate to http://localhost:3000/compliance/monitoring
      2. Wait for page to fully load
      3. Scroll to "Completion Rate per Unit" section
      4. Find progress elements: `[role="progressbar"]` within the table
      5. Assert: at least 1 progressbar element exists
      6. Get the first progressbar's `aria-valuenow` attribute
      7. Assert: value is a number between 0 and 100
      8. Screenshot the completion rate table
    Expected Result: Progress bars visible in each row's Rate column
    Failure Indicators: No progressbar elements found, wrong values
    Evidence: .sisyphus/evidence/task-11-progress-bar.png

  Scenario: Progress bar at 0% shows empty, 100% shows full
    Tool: Playwright
    Preconditions: Completion rate data exists with varying rates
    Steps:
      1. Navigate to monitoring page
      2. Find all progressbar elements in completion table
      3. For each: verify `aria-valuenow` matches the displayed percentage text
    Expected Result: Bar fill visually corresponds to percentage value
    Evidence: .sisyphus/evidence/task-11-progress-values.png
  ```

  **Commit**: YES
  - Message: `feat: add progress bar to monitoring completion rate table`
  - Files: `frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx`
  - Pre-commit: `npm run build`

- [x] 12. Monitoring: Filter Risk Review Queue to Exclude Approved

  **What to do**:
  - In `frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx` lines 388-629: the Risk Review Queue currently shows ALL statuses including "approved"
  - The queue has tab filters with statuses: "all", "due", "in_draft", "pending_approval", "approved", "overdue"
  - Remove the "approved" tab from the filter options
  - When fetching/filtering the review queue data, exclude items with status "approved"
  - If the "all" tab is selected, it should show all EXCEPT approved
  - Determine whether filtering is client-side (filter after fetch) or server-side (add status param to API) — prefer client-side if data is already fetched, server-side if there's a `?status=` API param
  - If removing from tabs: remove "approved" from the tab list array/enum

  **Must NOT do**:
  - Do NOT remove "rejected" or other statuses — only exclude "approved"
  - Do NOT change the review queue table structure or columns
  - Do NOT modify the approval workflow logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Removing one tab + adding one filter condition — small, targeted change
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-11, 13)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx:388-629` — Risk review queue section with status tabs and table

  **WHY Each Reference Matters**:
  - `risk-review-panel.tsx:388-629`: Contains the tab filter definitions and the data filtering logic — find the status array/enum and remove "approved", then ensure filtered data excludes approved items

  **Acceptance Criteria**:
  - [ ] "Approved" tab is not visible in the review queue filter tabs
  - [ ] "All" tab does not show approved items
  - [ ] Other tabs (due, in_draft, pending_approval, overdue) continue to work correctly
  - [ ] `npm run build` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Approved tab removed from review queue
    Tool: Playwright
    Preconditions: User logged in, monitoring page loaded
    Steps:
      1. Navigate to http://localhost:3000/compliance/monitoring
      2. Wait for page load
      3. Find the risk review queue section
      4. Get all tab/button text content in the filter area
      5. Assert: no tab text contains "approved" or "Approved"
      6. Screenshot the filter tabs
    Expected Result: Approved tab not present in filter options
    Failure Indicators: Tab with "approved" text still visible
    Evidence: .sisyphus/evidence/task-12-no-approved-tab.png

  Scenario: All tab excludes approved items
    Tool: Playwright
    Preconditions: Some risks have "approved" status in the system
    Steps:
      1. Navigate to monitoring page
      2. Click "All" or "Semua" tab in review queue
      3. Wait for data to load
      4. Check all visible status badges in the table
      5. Assert: no badge shows "approved" or "Approved" status
    Expected Result: No approved items visible even in All view
    Failure Indicators: Items with "approved" status badge visible
    Evidence: .sisyphus/evidence/task-12-all-no-approved.png
  ```

  **Commit**: YES
  - Message: `feat: filter risk review queue to exclude approved status`
  - Files: `frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx`
  - Pre-commit: `npm run build`

- [x] 13. Monitoring: Heatmap Color Intensity Gradient Based on Count

  **What to do**:
  - In `frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx` lines 701-747 (or the heatmap component referenced there): the heatmap compare currently uses flat `bg-primary/10` styling for all cells regardless of count
  - Implement color intensity that varies based on the count value in each cell:
    - Count 0: very light/transparent background (e.g., opacity 0.1)
    - Count 1-2: light (opacity 0.3)
    - Count 3-5: medium (opacity 0.5)
    - Count 6+: dark/full (opacity 0.8-1.0)
  - The heatmap already displays risk level colors per cell (5 distinct colors for likelihood × impact levels)
  - The intensity should apply WITHIN each cell's risk level color — vary the opacity/alpha channel based on count
  - Implementation approach: Instead of fixed `bg-primary/10`, use dynamic style:
    ```tsx
    style={{ backgroundColor: `oklch(${baseColor} / ${getOpacity(count)})` }}
    ```
    Or use Tailwind opacity classes: `opacity-10`, `opacity-30`, `opacity-50`, `opacity-80` based on count ranges
  - Keep the count number visible in each cell (don't let dark backgrounds hide light text — ensure contrast)
  - For cells with count 0: show very faint background, count text can be "0" or "-"

  **Must NOT do**:
  - Do NOT change the 5-color risk level palette — only add intensity variation
  - Do NOT change the heatmap grid layout (5x5)
  - Do NOT add new interactive features (hover tooltips OK if already exist)
  - Do NOT redesign the heatmap — this is a color enhancement only

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Requires understanding the heatmap color system, implementing dynamic opacity mapping, and ensuring text contrast
  - **Skills**: [`react-expert`]
    - `react-expert`: For dynamic style computation and conditional class application
  - **Skills Evaluated but Omitted**:
    - `colorize`: This is about opacity/intensity, not adding new colors
    - `frontend-design`: Enhancement to existing component, not new design

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-12)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx:701-747` — Heatmap compare section with the flat styling to change
  - Look for any separate heatmap component file (e.g., `risk-heatmap.tsx`) — the heatmap may be a reusable component
  - `frontend/src/app/(app)/overview/page.tsx` or risk heatmap files — Check `heatmapLevelColors` for existing color definitions

  **WHY Each Reference Matters**:
  - `risk-review-panel.tsx:701-747`: The rendering code to modify — find where cell background is set and make it dynamic
  - Heatmap level colors: Understand the existing color system to add intensity without breaking it

  **Acceptance Criteria**:
  - [ ] Cells with count 0 have very faint/light background
  - [ ] Cells with higher counts have progressively darker backgrounds
  - [ ] At least 3 distinct intensity levels visible
  - [ ] Count numbers remain readable in all cells (sufficient contrast)
  - [ ] Risk level colors (5 distinct hues) are still distinguishable
  - [ ] `npm run build` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Heatmap cells show varying intensity based on count
    Tool: Playwright
    Preconditions: User logged in, monitoring page with heatmap data (some cells with 0, some with 3+)
    Steps:
      1. Navigate to http://localhost:3000/compliance/monitoring
      2. Scroll to heatmap compare section
      3. Find all heatmap cells (grid cells with count values)
      4. For a cell with count=0: get computed background-color opacity/alpha
      5. For a cell with count≥3: get computed background-color opacity/alpha
      6. Assert: cell with count≥3 has higher opacity than cell with count=0
      7. Screenshot the full heatmap
    Expected Result: Visual gradient from light (low count) to dark (high count)
    Failure Indicators: All cells same opacity, text unreadable in dark cells
    Evidence: .sisyphus/evidence/task-13-heatmap-intensity.png

  Scenario: Count numbers readable in all cells
    Tool: Playwright
    Steps:
      1. Navigate to monitoring page heatmap
      2. For cells with highest count: check text color contrasts with background
      3. Assert: text is visible (not same color as background)
    Expected Result: All count numbers readable regardless of background intensity
    Evidence: .sisyphus/evidence/task-13-heatmap-contrast.png
  ```

  **Commit**: YES
  - Message: `feat: add color intensity gradient to heatmap cells`
  - Files: Heatmap component file(s)
  - Pre-commit: `npm run build`

- [x] 14. Risk Form: Filter User Dropdowns by Logged-in User's Organization

  **What to do**:
  - In `frontend/src/lib/api/users.ts`: add `organizationId?: string` to the `ListUsersParams` type
  - In the `listUsers()` function: if `organizationId` is provided, append `&organizationId=${organizationId}` to the query string
  - In `frontend/src/app/(app)/risk/register/new/page.tsx`: there are 3 user loader functions that need org filtering:
    1. `loadReviewerOptions` (line ~625) — calls `listUsers(token, { q, role: "reviewer", page, limit })`
    2. `loadApproverOptions` (line ~648) — calls `listUsers(token, { q, page, limit })`
    3. `loadPicOptions` (line ~676) — calls `listUsers(token, { q, page, limit })`
  - For each loader: add `organizationId` to the params:
    - Get the user's organization from auth context: `const { user } = useAuth()` → `user.organizationId`
    - Pass `organizationId: user?.organizationId` to each `listUsers()` call
  - Also check `frontend/src/app/(app)/risk/working-papers/new/page.tsx` if it has similar user fetch logic — apply the same fix
  - Handle the case where user is a super_admin with `isGlobal: true` — in that case, do NOT filter by org (show all users)
  - Use auth context from `frontend/src/contexts/auth-context.tsx` which provides `organizationId`, `accessibleOrgIds`, `isGlobal`

  **Must NOT do**:
  - Do NOT filter other form fields by organization
  - Do NOT add org-based validation to the form
  - Do NOT modify the auth context itself
  - Do NOT change the backend API behavior for non-org-filtered requests

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Touches multiple files (API client, form page, auth context integration), needs careful conditional logic for global users
  - **Skills**: [`react-expert`]
    - `react-expert`: For correct React context usage and async data fetching patterns
  - **Skills Evaluated but Omitted**:
    - `backend-go`: Backend changes already done in Task 5

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 15)
  - **Parallel Group**: Wave 3 (with Task 15)
  - **Blocks**: None
  - **Blocked By**: Task 5 (backend OrganizationID filter must be implemented first)

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/risk/register/new/page.tsx:625` — `loadReviewerOptions` function — first user loader to modify
  - `frontend/src/app/(app)/risk/register/new/page.tsx:648` — `loadApproverOptions` function — second user loader
  - `frontend/src/app/(app)/risk/register/new/page.tsx:676` — `loadPicOptions` function — third user loader
  - `frontend/src/components/risk/remote-user-picker.tsx` — May also call listUsers — check if it needs org filtering

  **API/Type References**:
  - `frontend/src/lib/api/users.ts` — `ListUsersParams` type and `listUsers()` function — add organizationId field
  - `frontend/src/contexts/auth-context.tsx` — Auth context providing `organizationId`, `isGlobal`

  **WHY Each Reference Matters**:
  - `new/page.tsx:625,648,676`: The 3 exact functions to modify — each needs `organizationId` param added
  - `lib/api/users.ts`: The API client to modify — add field to type + query string
  - `auth-context.tsx`: Source of the organizationId value — understand the context shape

  **Acceptance Criteria**:
  - [ ] `ListUsersParams` type includes `organizationId?: string`
  - [ ] `listUsers()` appends organizationId to query string when provided
  - [ ] All 3 user loaders (reviewer, approver, PIC) pass `organizationId` from auth context
  - [ ] Global/super_admin users see all users (no org filter applied)
  - [ ] Non-global users see only users from their organization
  - [ ] `npm run build` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Non-global user sees only org-scoped users in risk form
    Tool: Playwright
    Preconditions: Logged in as a non-global (unit-level) user, risk form open
    Steps:
      1. Navigate to http://localhost:3000/risk/register/new
      2. Wait for form to load
      3. Open the reviewer dropdown/picker
      4. Type a search query to trigger user fetch
      5. Open browser DevTools Network tab (or intercept network requests)
      6. Assert: the API call to /api/v1/users includes `organizationId=<user's-org-id>` query param
      7. Assert: all returned users belong to the same organization
      8. Screenshot the dropdown results
    Expected Result: API call includes organizationId filter, results show only org users
    Failure Indicators: API call missing organizationId param, users from other orgs visible
    Evidence: .sisyphus/evidence/task-14-org-filter-dropdown.png

  Scenario: Global/super_admin user sees all users (no org filter)
    Tool: Playwright
    Preconditions: Logged in as super_admin (isGlobal: true)
    Steps:
      1. Navigate to http://localhost:3000/risk/register/new
      2. Open reviewer dropdown, type search
      3. Assert: API call to /api/v1/users does NOT include organizationId param
      4. Assert: users from multiple organizations are visible
    Expected Result: No org filter applied for global users
    Failure Indicators: organizationId param present in API call for global user
    Evidence: .sisyphus/evidence/task-14-global-no-filter.png
  ```

  **Commit**: YES
  - Message: `feat: filter risk form user dropdowns by organization`
  - Files: `frontend/src/lib/api/users.ts`, `frontend/src/app/(app)/risk/register/new/page.tsx`
  - Pre-commit: `npm run build`

- [x] 15. Risk Form: Version History Sheet with API Data

  **What to do**:
  - In `frontend/src/app/(app)/risk/register/new/page.tsx` lines 1628-1644: there's a placeholder version history button — replace it with a functional implementation
  - When button is clicked, open a `<Sheet>` (from shadcn/ui) showing version history timeline
  - Fetch version data from existing API: `GET /api/v1/risks/:id/versions` (already implemented in backend)
  - Use existing `buildVersionHistoryItem()` from `frontend/src/lib/risk-history.ts` to transform API response into timeline items
  - Use existing `RiskLogTimeline` component from `frontend/src/components/risk/risk-log-timeline.tsx` or build a simpler timeline consistent with its design
  - The Sheet should show:
    - Title: "Riwayat Versi" or "Version History"
    - List of versions with: version number, risk score (inherent/residual), who modified, when, and trend indicator (up/down/same vs previous version)
  - The button should only be visible when editing an existing risk (when `riskId` exists), not when creating a new one
  - Handle loading and empty states

  **Must NOT do**:
  - Do NOT add inline diff view between versions
  - Do NOT add edit-from-version or rollback functionality
  - Do NOT create a new API endpoint — use existing `/api/v1/risks/:id/versions`
  - Do NOT modify the existing history page at `/risk/history`
  - Do NOT introduce a Dialog — use Sheet (side panel) for consistency with the form layout

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Involves API integration, Sheet component composition, timeline rendering, and conditional display logic
  - **Skills**: [`react-expert`, `shadcn`]
    - `react-expert`: For data fetching, state management, and conditional rendering
    - `shadcn`: For correct Sheet component usage and styling
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: Using existing component patterns, not designing new UI

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 14)
  - **Parallel Group**: Wave 3 (with Task 14)
  - **Blocks**: None
  - **Blocked By**: None (backend API already exists)

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/risk/register/new/page.tsx:1628-1644` — Placeholder version history button area (the code to replace/enhance)
  - `frontend/src/components/risk/risk-log-timeline.tsx` — Existing timeline component (411 lines) for approval/version events — reuse or reference its design
  - `frontend/src/app/(app)/risk/history/page.tsx` — Existing history page using mock data — shows the intended UI structure

  **API/Type References**:
  - `backend/internal/handler/http/risk.go:685+` — ListVersions handler (GET /api/v1/risks/:id/versions)
  - `backend/cmd/server/main.go:425` — Route registration confirming the endpoint
  - `frontend/src/lib/risk-history.ts` — `buildVersionHistoryItem()` helper with trend calculation
  - `frontend/src/types/risk.ts:67-89` — `RiskVersionTimelineItem` type

  **External References**:
  - shadcn Sheet docs: https://ui.shadcn.com/docs/components/sheet

  **WHY Each Reference Matters**:
  - `new/page.tsx:1628-1644`: The exact location to add the Sheet trigger and component
  - `risk-log-timeline.tsx`: Design reference for timeline rendering — follow Card + Badge + Icon vertical layout
  - `risk-history.ts`: Use `buildVersionHistoryItem()` to transform API data into display items with trend indicators
  - `risk.ts:67-89`: TypeScript type for the timeline items — use this in your Sheet content

  **Acceptance Criteria**:
  - [ ] Version history button visible only when editing existing risk (riskId exists)
  - [ ] Button hidden when creating new risk
  - [ ] Clicking button opens a Sheet side panel
  - [ ] Sheet fetches data from `/api/v1/risks/:id/versions`
  - [ ] Sheet displays version timeline with version number, scores, modifier, date, trend
  - [ ] Loading state shown while fetching
  - [ ] Empty state shown if no versions exist
  - [ ] `npm run build` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Version history button visible on existing risk edit
    Tool: Playwright
    Preconditions: User logged in, at least 1 risk exists with versions
    Steps:
      1. Navigate to http://localhost:3000/risk/register (risk list)
      2. Click on an existing risk to open edit form
      3. Wait for form to load
      4. Find version history button (look for button with text "Riwayat" or history icon)
      5. Assert: button is visible
      6. Click the button
      7. Wait for Sheet to open (look for Sheet overlay or side panel)
      8. Assert: Sheet is visible with version data
      9. Screenshot the Sheet content
    Expected Result: Sheet opens showing version timeline entries
    Failure Indicators: Button not found, Sheet doesn't open, empty Sheet without loading state
    Evidence: .sisyphus/evidence/task-15-version-sheet.png

  Scenario: Version history button hidden on new risk form
    Tool: Playwright
    Preconditions: User logged in
    Steps:
      1. Navigate directly to http://localhost:3000/risk/register/new
      2. Wait for form to load
      3. Search for version history button
      4. Assert: button is NOT visible (hidden or not rendered)
    Expected Result: No version history button on new risk form
    Failure Indicators: Button visible on new risk form
    Evidence: .sisyphus/evidence/task-15-new-form-no-button.png

  Scenario: API call made with correct risk ID
    Tool: Playwright
    Preconditions: Editing existing risk
    Steps:
      1. Open existing risk edit form
      2. Click version history button
      3. Intercept network requests
      4. Assert: GET request to /api/v1/risks/{riskId}/versions is made
      5. Assert: response is 200 with version data array
    Expected Result: Correct API called, data returned
    Evidence: .sisyphus/evidence/task-15-api-call.txt
  ```

  **Commit**: YES
  - Message: `feat: add version history sheet to risk form`
  - Files: `frontend/src/app/(app)/risk/register/new/page.tsx`
  - Pre-commit: `npm run build`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `npm run build` (frontend) + `go vet ./...` + `go test ./...` (backend). Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration. Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Commit | Message | Files | Pre-commit |
|--------|---------|-------|------------|
| 1 | `chore: install collapsible component + fix controls search` | `frontend/src/components/ui/collapsible.tsx`, `frontend/src/app/(app)/compliance/controls/page.tsx` | `npm run build` |
| 2 | `style: remove hover:underline from risk title links` | Multiple table pages | `npm run build` |
| 3 | `style: normalize font size to text-sm in org/user tables` | `admin/organizations/page.tsx`, `admin/users/page.tsx` | `npm run build` |
| 4 | `style: match monitoring mitigation table font to text-sm` | `compliance/_components/mitigation-monitoring-panel.tsx` | `npm run build` |
| 5 | `fix(backend): implement OrganizationID filter in user list SQL` | `repository/postgres/user.go`, `handler/http/user.go` | `go test ./internal/...` |
| 6 | `refactor: standardize search inputs with useDeferredValue` | Multiple search components | `npm run build` |
| 7 | `refactor: move CriticalRiskRateTrend to reports first grid row` | `reports/page.tsx` | `npm run build` |
| 8 | `feat: add collapsible wrapper to Progress Kertas Kerja table` | `reports/page.tsx`, `reports/_components/organization-latest-progress-chart.tsx` | `npm run build` |
| 9 | `feat: convert risk categories chart to stacked bar by severity` | `overview/page.tsx` | `npm run build` |
| 10 | `feat: replace incident chart with mitigation progress chart` | `overview/page.tsx` | `npm run build` |
| 11 | `feat: add progress bar to monitoring completion rate table` | `compliance/_components/risk-review-panel.tsx` | `npm run build` |
| 12 | `feat: filter risk review queue to exclude approved status` | `compliance/_components/risk-review-panel.tsx` | `npm run build` |
| 13 | `feat: add color intensity gradient to heatmap cells` | `compliance/_components/risk-review-panel.tsx` or heatmap component | `npm run build` |
| 14 | `feat: filter risk form user dropdowns by organization` | `risk/register/new/page.tsx`, `lib/api/users.ts` | `npm run build` |
| 15 | `feat: add version history sheet to risk form` | `risk/register/new/page.tsx` | `npm run build` |

---

## Success Criteria

### Verification Commands
```bash
# Frontend builds clean
cd frontend && npm run build  # Expected: zero errors

# Backend tests pass
cd backend && go test ./internal/repository/postgres/... ./internal/handler/http/...  # Expected: PASS

# Backend user filter works
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/users?organizationId=<uuid>"  # Expected: filtered results
```

### Final Checklist
- [x] All 13 UI improvements implemented and verified
- [x] All "Must Have" present
- [x] All "Must NOT Have" absent
- [x] Frontend builds with zero TypeScript errors
- [x] Backend tests pass
- [x] All QA evidence captured in `.sisyphus/evidence/`
