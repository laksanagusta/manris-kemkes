# PDF Risk Report Generation for Executive Presentations

## TL;DR

> **Quick Summary**: Build a backend-only PDF report generation feature that aggregates risk data per assessment cycle and produces a professional landscape-format executive report. Go backend handles everything (data aggregation, chart rendering via go-charts, PDF composition via maroto v2). Frontend adds a download button to the existing reports page.
> 
> **Deliverables**:
> - New Go endpoint `GET /api/v1/reports/risk-pdf?cycle=2026-H1` returning PDF binary
> - Report usecase aggregating cycle-specific risk data from existing repositories
> - PDF renderer service using maroto v2 (layout) + vicanso/go-charts (trend charts)
> - Heatmap 5×5 drawn with maroto colored grid cells
> - Frontend download button on `/reports` page using raw `fetch()` + `downloadBlob()`
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 1 → Task 2 → Task 4 → Task 6 → Task 8 → Task 9

---

## Context

### Original Request
User wants to generate PDF reports for risk presentations ("laporan risiko"). The reports are for executive/pimpinan audience and should be visual-heavy with comprehensive risk data for a specific assessment cycle.

### Interview Summary
**Key Discussions**:
- **Audience**: Pimpinan/Eksekutif — concise, visual, executive summary style
- **Approach**: Backend-Only (Go + maroto + go-charts) — no frontend PDF library needed
- **Charts**: Rendered as PNG images via vicanso/go-charts, embedded in PDF. Heatmap drawn directly with maroto colored grid
- **Filter**: Cycle/period only (e.g., 2026-H1)
- **Branding**: Minimalist — no government letterhead
- **Language**: Bilingual (ID + EN labels, Indonesian content)
- **Layout**: Landscape orientation
- **UX**: Direct download — button click → loading spinner → auto download
- **No cover page**: Straight to content
- **No automated tests**: QA only via curl

**Research Findings**:
- Recharts v3.8.0 (frontend) is NOT compatible with react-pdf-charts — confirmed backend-only approach
- maroto v2.4.0 (2.7k stars) provides Bootstrap-like grid layout but no chart support
- vicanso/go-charts v2 renders directly to PNG bytes — no headless browser needed
- Dashboard usecases (`DashboardSummaryUseCase`, `HeatmapDataUseCase`) are NOT cycle-aware — must compute KPIs in-memory from cycle snapshot
- Incidents and KRIs have no `assessmentCycle` field — filter via linked risk IDs
- Existing binary download pattern in `handler/http/risk.go:226-235`
- Frontend raw `fetch()` for blob download exists in `risk/register/bulk/page.tsx:136-161`

### Metis Review
**Identified Gaps** (all addressed):
- Dashboard usecases not cycle-aware → Compute cycle-specific KPIs in-memory from snapshot
- Incidents/KRIs lack cycle field → Filter via linked risk IDs
- maroto v1 vs v2 API confusion → Use v2 component API exclusively
- go-echarts requires headless browser → Use vicanso/go-charts instead (pure Go, direct PNG)
- Trend chart needs multi-cycle data → Fetch risks from recent cycles, aggregate by level
- Empty cycle handling → Return 404 error

---

## Work Objectives

### Core Objective
Create a backend endpoint that generates a professional landscape PDF report containing executive risk summary, heatmap, detailed risk tables, top risks analysis, incident summary, KRI status, and trend charts — all filtered by assessment cycle.

### Concrete Deliverables
- `GET /api/v1/reports/risk-pdf?cycle=2026-H1` endpoint returning PDF binary
- `backend/internal/usecase/report/` — report aggregation usecase
- `backend/internal/service/pdfreport/` — PDF rendering service (maroto + go-charts)
- `backend/internal/handler/http/report.go` — HTTP handler
- Updated `frontend/src/app/(app)/reports/page.tsx` — download button
- Updated `backend/cmd/server/main.go` — route registration

### Definition of Done
- [ ] `curl` returns valid PDF with `Content-Type: application/pdf`
- [ ] PDF contains all 7 sections (Executive Summary, Heatmap, Risk Detail, Top Risks, Incidents, KRI, Trend)
- [ ] PDF file size > 10KB (non-empty, real content)
- [ ] `go build ./...` passes
- [ ] `npm run build` passes
- [ ] Frontend download button triggers PDF download

### Must Have
- Cycle-specific KPI computation (not global dashboard)
- Bilingual labels (ID + EN)
- Landscape orientation
- 5×5 heatmap with color-coded cells
- Risk detail table with all key columns
- Top 10 risks deep-dive
- Incident summary filtered via linked risks
- KRI status filtered via linked risks
- Trend chart showing risk levels across recent cycles
- 404 response for empty cycles
- JWT auth on endpoint

### Must NOT Have (Guardrails)
- ❌ No go-echarts or chromedp/go-rod dependencies (requires headless browser)
- ❌ No new SQL queries — compose from existing repository methods only
- ❌ No maroto v1 API — use v2 component API exclusively
- ❌ No client-side PDF generation
- ❌ No cover page, government letterhead, or TOC
- ❌ No email delivery, scheduling, or cron jobs
- ❌ No Excel/Word report formats in this task
- ❌ No PDF caching or report history/audit log
- ❌ No watermarks or security features
- ❌ No interactive elements in PDF
- ❌ No modifications to existing usecases or handlers
- ❌ No per-unit breakdown sub-pages
- ❌ Do not over-invest in page numbers/headers/footers (only if trivial with maroto)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Go test files present)
- **Automated tests**: None (user explicitly chose QA only)
- **Framework**: N/A
- **If TDD**: N/A

### QA Policy
Every task MUST include agent-executed QA scenarios using `curl` for backend and Playwright for frontend.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Backend API**: Use Bash (curl) — Send requests, assert status + response headers + file validity
- **Frontend UI**: Use Playwright — Navigate, click download button, verify download triggers
- **Build Verification**: Use Bash — `go build ./...` and `npm run build`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — dependencies + interfaces):
├── Task 1: Add Go dependencies (maroto v2 + vicanso/go-charts v2) [quick]
├── Task 2: Define report domain types + service interface [quick]
└── Task 3: Create PDF rendering helper utilities (heatmap grid, table builder, chart renderer) [deep]

Wave 2 (After Wave 1 — core implementation):
├── Task 4: Implement report data aggregation usecase [deep]
├── Task 5: Implement PDF section renderers (each report section) [deep]
└── Task 6: Implement trend chart data aggregation + rendering [unspecified-high]

Wave 3 (After Wave 2 — integration + frontend):
├── Task 7: Create HTTP handler + route registration [quick]
├── Task 8: Frontend download button on reports page [quick]
└── Task 9: End-to-end integration verification [unspecified-high]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 2, 3, 4, 5, 6 | 1 |
| 2 | — | 4, 5, 6, 7 | 1 |
| 3 | 1 | 5, 6 | 1 |
| 4 | 1, 2 | 7 | 2 |
| 5 | 2, 3 | 7 | 2 |
| 6 | 1, 2, 3 | 7 | 2 |
| 7 | 4, 5, 6 | 8, 9 | 3 |
| 8 | 7 | 9 | 3 |
| 9 | 7, 8 | F1-F4 | 3 |

### Agent Dispatch Summary

- **Wave 1**: **3 tasks** — T1 → `quick`, T2 → `quick`, T3 → `deep`
- **Wave 2**: **3 tasks** — T4 → `deep`, T5 → `deep`, T6 → `unspecified-high`
- **Wave 3**: **3 tasks** — T7 → `quick`, T8 → `quick` (+ `frontend-design` skill), T9 → `unspecified-high`
- **FINAL**: **4 tasks** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Add Go Dependencies (maroto v2 + vicanso/go-charts v2)

  **What to do**:
  - Run `go get github.com/johnfercher/maroto/v2@latest` to add maroto v2 PDF library
  - Run `go get github.com/vicanso/go-charts/v2@latest` to add go-charts for PNG chart rendering
  - Verify both dependencies appear in `go.mod` and `go.sum`
  - Verify `go build ./...` still passes with new dependencies

  **Must NOT do**:
  - Do NOT add go-echarts, chromedp, go-rod, or any headless browser dependency
  - Do NOT add maroto v1 (`github.com/johnfercher/maroto` without `/v2`)
  - Do NOT modify any existing Go files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple dependency addition, no code changes
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `backend-go`: Not needed for simple `go get` commands

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 3, 4, 5, 6
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `backend/go.mod` — Current Go module dependencies, verify new entries appear here

  **External References**:
  - maroto v2: `https://github.com/johnfercher/maroto` — Use v2 API (`github.com/johnfercher/maroto/v2`)
  - go-charts: `https://github.com/vicanso/go-charts` — Use v2 (`github.com/vicanso/go-charts/v2`)

  **WHY Each Reference Matters**:
  - `go.mod`: Must verify dependencies are added correctly with `/v2` suffix

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Dependencies added successfully
    Tool: Bash
    Preconditions: Backend directory exists at backend/
    Steps:
      1. Run `cd backend && go get github.com/johnfercher/maroto/v2@latest`
      2. Run `cd backend && go get github.com/vicanso/go-charts/v2@latest`
      3. Run `cd backend && grep "johnfercher/maroto/v2" go.mod`
      4. Run `cd backend && grep "vicanso/go-charts/v2" go.mod`
      5. Run `cd backend && go build ./...`
    Expected Result: Both grep commands find matches; go build exits with code 0
    Failure Indicators: grep returns empty, go build fails
    Evidence: .sisyphus/evidence/task-1-deps-added.txt

  Scenario: No forbidden dependencies added
    Tool: Bash
    Preconditions: Dependencies installed
    Steps:
      1. Run `cd backend && grep -c "go-echarts" go.mod || echo "0"`
      2. Run `cd backend && grep -c "chromedp" go.mod || echo "0"`
      3. Run `cd backend && grep -c "go-rod" go.mod || echo "0"`
    Expected Result: All return "0" — no forbidden dependencies
    Failure Indicators: Any count > 0
    Evidence: .sisyphus/evidence/task-1-no-forbidden-deps.txt
  ```

  **Commit**: YES (group 1)
  - Message: `chore(backend): add maroto v2 and go-charts dependencies`
  - Files: `backend/go.mod`, `backend/go.sum`
  - Pre-commit: `cd backend && go build ./...`

- [x] 2. Define Report Domain Types and Service Interface

  **What to do**:
  - Create `backend/internal/domain/entity/report.go` with report-specific types:
    - `ReportRequest` struct: `Cycle string`, `Token string` (for auth context)
    - `ReportData` struct aggregating all sections: `Summary ReportSummary`, `Heatmap [5][5]int`, `Risks []*Risk`, `TopRisks []*Risk`, `Incidents []*Incident`, `KRIs []*KRI`, `TrendData []CycleTrendPoint`
    - `ReportSummary` struct: `Cycle string`, `GeneratedAt time.Time`, `TotalRisks int`, `HighExtremeCount int`, `OverdueMitigations int`, `CategoryBreakdown map[string]int`
    - `CycleTrendPoint` struct: `Cycle string`, `Rendah int`, `Sedang int`, `Tinggi int`, `Ekstrem int`
  - Create `backend/internal/domain/service/report.go` with interface:
    - `ReportPDFRenderer` interface: `Render(ctx context.Context, data *entity.ReportData) ([]byte, error)`
  - All types should use existing entity references (`*Risk`, `*Incident`, `*KRI`) from `entity/` package

  **Must NOT do**:
  - Do NOT create new repository interfaces — reuse existing ones
  - Do NOT define SQL queries or database access
  - Do NOT import maroto or go-charts here — domain layer stays clean

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Pure type definitions, no business logic
  - **Skills**: [`backend-go`]
    - `backend-go`: Clean architecture patterns, domain entity conventions
  - **Skills Evaluated but Omitted**:
    - `golang-pro`: Overkill for type definitions

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Tasks 4, 5, 6, 7
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `backend/internal/domain/entity/risk.go` — Risk entity structure, risk level calculation `RiskLevel()` method (lines 128-144). Shows how to compute level from score: `>=15 Ekstrem, >=10 Tinggi, >=5 Sedang, <5 Rendah`
  - `backend/internal/domain/entity/dashboard.go` — `DashboardSummary` struct, `HeatmapCell` struct, `HeatmapVelocityCell` — patterns for aggregated data types
  - `backend/internal/domain/entity/incident.go` — Incident entity with severity, status, CAPA fields
  - `backend/internal/domain/entity/kri.go` — KRI entity with threshold, actual value, status

  **API/Type References**:
  - `backend/internal/domain/entity/risk.go:Risk` — Full risk struct to reference in `ReportData.Risks`
  - `backend/internal/domain/entity/incident.go:Incident` — Incident struct for `ReportData.Incidents`
  - `backend/internal/domain/entity/kri.go:KRI` — KRI struct for `ReportData.KRIs`

  **WHY Each Reference Matters**:
  - `risk.go:RiskLevel()` — Report must use the same level thresholds for consistent risk classification
  - `dashboard.go` — `ReportSummary` mirrors `DashboardSummary` but adds cycle-specific fields

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Report types compile correctly
    Tool: Bash
    Preconditions: Files created in correct locations
    Steps:
      1. Run `ls backend/internal/domain/entity/report.go`
      2. Run `ls backend/internal/domain/service/report.go`
      3. Run `cd backend && go build ./...`
    Expected Result: Both files exist; go build exits 0
    Failure Indicators: File not found or compile error
    Evidence: .sisyphus/evidence/task-2-types-compile.txt

  Scenario: Types reference existing entities correctly
    Tool: Bash
    Preconditions: report.go exists
    Steps:
      1. Run `cd backend && grep "Risk\b" internal/domain/entity/report.go`
      2. Run `cd backend && grep "Incident\b" internal/domain/entity/report.go`
      3. Run `cd backend && grep "KRI\b" internal/domain/entity/report.go`
    Expected Result: All types referenced in ReportData struct
    Failure Indicators: Missing references
    Evidence: .sisyphus/evidence/task-2-entity-refs.txt
  ```

  **Commit**: YES (group 2)
  - Message: `feat(report): add report domain types and service interface`
  - Files: `backend/internal/domain/entity/report.go`, `backend/internal/domain/service/report.go`
  - Pre-commit: `cd backend && go build ./...`

- [x] 3. Create PDF Rendering Helper Utilities

  **What to do**:
  - Create `backend/internal/service/pdfreport/` package with helper files:
  - `heatmap.go` — `RenderHeatmapGrid(heatmap [5][5]int) core.Row` function:
    - Draws 5×5 grid using maroto v2 `col.New()` + `text.New()` with background colors
    - Color mapping: Rendah=green, Sedang=yellow, Tinggi=orange, Ekstrem=red
    - Y-axis label: "Probabilitas / Probability" (1-5 top to bottom)
    - X-axis label: "Dampak / Impact" (1-5 left to right)
    - Cell content: count number centered
  - `table.go` — `RenderTable(headers []string, rows [][]string, colWidths []uint) []core.Row` function:
    - Reusable table renderer with alternating row colors
    - Bold header row with dark background
    - Text wrapping support
  - `chart.go` — `RenderBarChart(data []ChartDataPoint, title string) ([]byte, error)` function:
    - Uses vicanso/go-charts v2 to render stacked bar chart as PNG bytes
    - Returns `[]byte` (PNG image data) for embedding via maroto `image.NewFromBytes()`
  - `styles.go` — Shared style constants:
    - Color definitions (risk levels, backgrounds, text)
    - Font sizes for headers, body, labels
    - Margin and spacing constants

  **Must NOT do**:
  - Do NOT use maroto v1 API (`pkg/pdf`) — use v2 component API (`v2/pkg/components/`)
  - Do NOT use go-echarts for any chart rendering
  - Do NOT create a full PDF document here — only reusable building blocks

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex rendering logic, needs to understand maroto v2 API + go-charts API in depth
  - **Skills**: [`backend-go`, `golang-pro`]
    - `backend-go`: Clean architecture patterns
    - `golang-pro`: Go performance patterns, interfaces
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: Not relevant — backend Go rendering

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Tasks 5, 6
  - **Blocked By**: Task 1 (needs maroto + go-charts deps)

  **References**:

  **Pattern References**:
  - `backend/internal/domain/entity/risk.go:128-144` — Risk level thresholds and color mapping logic: `>=15 Ekstrem, >=10 Tinggi, >=5 Sedang, <5 Rendah`
  - `frontend/src/app/(app)/overview/_components/risk-heatmap.tsx` — Frontend heatmap implementation showing color scheme and cell layout pattern. Use similar color mapping for PDF heatmap

  **External References**:
  - maroto v2 component API: `https://github.com/johnfercher/maroto/tree/main/v2` — Look at `pkg/components/text`, `pkg/components/col`, `pkg/components/row`, `pkg/components/image`
  - vicanso/go-charts bar chart: `https://github.com/vicanso/go-charts` — `charts.BarRender()` for bar chart, `chart.Bytes()` for PNG output
  - maroto v2 image from bytes: `image.NewFromBytes(bytes, extension.Png)` — embed chart PNG

  **WHY Each Reference Matters**:
  - `risk.go:128-144`: Color mapping MUST match existing risk level definitions for consistency
  - `risk-heatmap.tsx`: Visual reference — PDF heatmap should look similar to frontend version
  - maroto v2 docs: Critical for understanding the component composition API (rows → cols → components)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Heatmap grid renders without error
    Tool: Bash
    Preconditions: Package created with heatmap.go
    Steps:
      1. Run `cd backend && go build ./internal/service/pdfreport/...`
      2. Run `cd backend && go vet ./internal/service/pdfreport/...`
    Expected Result: Build and vet pass with exit code 0
    Failure Indicators: Compile error or vet warning
    Evidence: .sisyphus/evidence/task-3-helpers-build.txt

  Scenario: Chart renderer produces valid PNG bytes
    Tool: Bash
    Preconditions: chart.go implemented with RenderBarChart
    Steps:
      1. Create a small Go test program that calls RenderBarChart with sample data
      2. Verify returned bytes start with PNG magic bytes (89 50 4E 47)
      3. Verify byte length > 1000 (non-trivial image)
    Expected Result: Valid PNG bytes produced
    Failure Indicators: Empty bytes, wrong magic bytes, or error returned
    Evidence: .sisyphus/evidence/task-3-chart-png-valid.txt
  ```

  **Commit**: YES (group 2)
  - Message: `feat(report): add PDF rendering helper utilities (heatmap, table, chart)`
  - Files: `backend/internal/service/pdfreport/heatmap.go`, `backend/internal/service/pdfreport/table.go`, `backend/internal/service/pdfreport/chart.go`, `backend/internal/service/pdfreport/styles.go`
  - Pre-commit: `cd backend && go build ./...`

- [x] 4. Implement Report Data Aggregation Usecase

  **What to do**:
  - Create `backend/internal/usecase/report/generate.go` with `GenerateReportUseCase`:
    - Constructor: `NewGenerateReportUseCase(riskRepo repository.RiskRepository, incidentRepo repository.IncidentRepository, kriRepo repository.KRIRepository)`
    - Method: `Execute(ctx context.Context, input GenerateReportInput) (*entity.ReportData, error)`
    - `GenerateReportInput` struct: `Cycle string`, `OrgID *uuid.UUID` (optional)
  - Data aggregation logic:
    1. **Fetch cycle risks**: Call existing `riskRepo.ListByCycle(ctx, cycle)` to get approved risks for this cycle
    2. **Return 404 if empty**: If no risks found, return a specific error that handler maps to 404
    3. **Compute KPIs in-memory**: Count total risks, high+extreme count (score >=10), count overdue mitigations (dueDate < now && not completed), build category breakdown map
    4. **Build heatmap**: Initialize `[5][5]int` matrix, for each risk increment `matrix[probability-1][impact-1]`
    5. **Top risks**: Sort by InherentScore descending, take top 10
    6. **Fetch linked incidents**: Collect all risk IDs from cycle, call `incidentRepo.ListByLinkedRiskIDs(ctx, riskIDs)` — if method doesn't exist, filter in-memory from `incidentRepo.List()`
    7. **Fetch linked KRIs**: Collect all risk IDs from cycle, call `kriRepo.ListByRiskIDs(ctx, riskIDs)` — if method doesn't exist, filter in-memory from `kriRepo.List()`
    8. **Assemble `ReportData`**: Fill all sections
  - The usecase MUST NOT generate PDF — it only produces `*entity.ReportData`

  **Must NOT do**:
  - Do NOT write new SQL queries — use existing repository methods and filter in-memory if needed
  - Do NOT generate PDF in this usecase — separation of concerns
  - Do NOT modify existing repository interfaces
  - Do NOT modify existing usecases

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex data aggregation with in-memory computation, needs to understand existing repository APIs
  - **Skills**: [`backend-go`]
    - `backend-go`: Clean architecture, usecase patterns, repository usage
  - **Skills Evaluated but Omitted**:
    - `golang-pro`: Not needed for data aggregation logic

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `backend/internal/usecase/risk/list_cycle_snapshot.go:30-60` — Existing cycle snapshot usecase showing how to fetch risks by cycle. Method: `riskRepo.ListByCycle(ctx, cycle)` returning `[]*entity.Risk` (approved only)
  - `backend/internal/usecase/risk/dashboard.go:21-85` — Dashboard usecases showing KPI computation patterns. Note: these are NOT cycle-aware, so the report usecase must compute KPIs differently (in-memory from cycle snapshot)
  - `backend/internal/usecase/incident/basic.go:51-80` — Incident list usecase showing repository usage pattern

  **API/Type References**:
  - `backend/internal/domain/repository/risk.go` — RiskRepository interface. Look for `ListByCycle` or `ListApprovedByCycle` method
  - `backend/internal/domain/repository/incident.go` — IncidentRepository interface. Check if `ListByLinkedRiskIDs` exists; if not, use `List()` and filter
  - `backend/internal/domain/repository/kri.go` — KRIRepository interface. Check if `ListByRiskIDs` exists; if not, use `List()` and filter
  - `backend/internal/domain/entity/risk.go:128-144` — `RiskLevel()` method for classifying risks by score

  **WHY Each Reference Matters**:
  - `list_cycle_snapshot.go`: Shows the exact pattern for fetching cycle-specific risks — this is the foundation data source
  - `dashboard.go`: Shows KPI computation approach, but remember these are global — report must compute from cycle data
  - `risk.go:RiskLevel()`: Must use same level thresholds (>=15 Ekstrem, >=10 Tinggi, >=5 Sedang, <5 Rendah) for consistency

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Usecase compiles and builds
    Tool: Bash
    Preconditions: Tasks 1, 2 completed
    Steps:
      1. Run `ls backend/internal/usecase/report/generate.go`
      2. Run `cd backend && go build ./...`
      3. Run `cd backend && go vet ./internal/usecase/report/...`
    Expected Result: File exists, build passes, vet passes
    Failure Indicators: File missing, compile error
    Evidence: .sisyphus/evidence/task-4-usecase-build.txt

  Scenario: Usecase handles empty cycle correctly
    Tool: Bash
    Preconditions: Usecase implemented
    Steps:
      1. Verify error type/message exists for "no risks found" scenario
      2. Run `cd backend && grep -r "no.*risk\|not found\|empty" internal/usecase/report/`
    Expected Result: Error handling for empty cycle is implemented
    Failure Indicators: No error handling for empty cycle
    Evidence: .sisyphus/evidence/task-4-empty-cycle-handling.txt
  ```

  **Commit**: YES (group 3)
  - Message: `feat(report): add report data aggregation usecase`
  - Files: `backend/internal/usecase/report/generate.go`
  - Pre-commit: `cd backend && go build ./...`

- [x] 5. Implement PDF Section Renderers (Full Report Composition)

  **What to do**:
  - Create `backend/internal/service/pdfreport/renderer.go` implementing `service.ReportPDFRenderer` interface:
    - `Render(ctx context.Context, data *entity.ReportData) ([]byte, error)`
  - The renderer composes the full PDF document using maroto v2 with these sections in order:
  
  **Section 1 — Executive Summary / Ringkasan Eksekutif**:
  - Title: "Laporan Risiko / Risk Report — {Cycle}"
  - Subtitle: "Dihasilkan pada / Generated on: {date}"
  - KPI grid (2×3 or 3×2 layout):
    - Total Risiko / Total Risks: {count}
    - Risiko Tinggi & Ekstrem / High & Extreme Risks: {count}
    - Mitigasi Terlambat / Overdue Mitigations: {count}
    - Jumlah Insiden Terkait / Related Incidents: {count}
    - Jumlah KRI / KRI Count: {count}
    - Skor Eksposur Rata-rata / Avg Exposure Score: {avg}
  - Category breakdown bar (text with percentages)

  **Section 2 — Risk Heatmap 5×5 / Peta Risiko**:
  - Use `RenderHeatmapGrid()` helper from Task 3
  - Title: "Peta Risiko / Risk Heatmap"
  - Legend showing color mapping

  **Section 3 — Daftar Risiko / Risk Register**:
  - Use `RenderTable()` helper from Task 3
  - Columns: No., Kode/Code, Judul/Title, Kategori/Category, P, D, Skor/Score, Level, Treatment, Status
  - All approved risks for the cycle, sorted by score descending
  - Risk level cell should have color-coded background

  **Section 4 — Top 10 Risiko Tertinggi / Top 10 Risks**:
  - For each top risk (max 10):
    - Risk code + title (bold)
    - Score badge: "P×D = Score (Level)"
    - Penyebab / Causes: bullet list
    - Kontrol Eksisting / Existing Control: text
    - Opsi Penanganan / Treatment Option: text
    - Rencana Mitigasi / Mitigation Plans: numbered list with owner + due date

  **Section 5 — Ringkasan Insiden / Incident Summary**:
  - Table: No., Kode/Code, Judul/Title, Severity, Status, Tindakan Korektif/Corrective Action
  - Only incidents linked to risks in this cycle
  - If no incidents: show "Tidak ada insiden terkait / No related incidents"

  **Section 6 — Status KRI / KRI Dashboard**:
  - Table: No., Nama KRI/KRI Name, Threshold, Nilai Aktual/Actual Value, Status, Risiko Terkait/Linked Risk
  - Status cell color: breach=red, warning=amber, safe/normal=green
  - Only KRIs linked to risks in this cycle

  **Section 7 — Tren Risiko / Risk Trend**:
  - Embed trend chart image (PNG from Task 6's chart renderer)
  - Title: "Tren Risiko Antar Siklus / Risk Trend Across Cycles"
  - Show risk count by level across recent cycles (stacked bar chart)

  - PDF settings: Landscape orientation, A4 paper, margins 15mm
  - All section titles bilingual (ID / EN)

  **Must NOT do**:
  - Do NOT use maroto v1 API
  - Do NOT fetch data — only render from `*entity.ReportData`
  - Do NOT add cover page, TOC, or government letterhead
  - Do NOT add page numbers unless trivial with maroto v2

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex PDF composition with multiple section types, needs deep maroto v2 API knowledge
  - **Skills**: [`backend-go`, `golang-pro`]
    - `backend-go`: Clean architecture service implementation
    - `golang-pro`: Complex Go code, interface implementation
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: Not applicable — Go PDF rendering

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 2, 3

  **References**:

  **Pattern References**:
  - `backend/internal/service/pdfreport/heatmap.go` (from Task 3) — Heatmap grid rendering helper
  - `backend/internal/service/pdfreport/table.go` (from Task 3) — Table rendering helper
  - `backend/internal/service/pdfreport/chart.go` (from Task 3) — Chart image rendering helper
  - `backend/internal/service/pdfreport/styles.go` (from Task 3) — Shared style constants

  **API/Type References**:
  - `backend/internal/domain/entity/report.go` (from Task 2) — `ReportData`, `ReportSummary`, `CycleTrendPoint` types
  - `backend/internal/domain/service/report.go` (from Task 2) — `ReportPDFRenderer` interface to implement
  - `backend/internal/domain/entity/risk.go:128-144` — `RiskLevel()` for level text/color
  - `backend/internal/domain/entity/incident.go` — Incident fields for table columns
  - `backend/internal/domain/entity/kri.go` — KRI fields for table columns

  **External References**:
  - maroto v2 creating document: `https://github.com/johnfercher/maroto/tree/main/v2` — `maroto.New(cfg)` with `config.New().WithPageSize()` for landscape A4
  - maroto v2 examples: Look for `_examples/` in maroto repo for composition patterns

  **WHY Each Reference Matters**:
  - Task 3 helpers: These are the building blocks — renderer composes them into sections
  - `report.go` types: The data contract this renderer consumes
  - `risk.go:RiskLevel()`: Must use same level labels in risk register table

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Renderer implements interface and compiles
    Tool: Bash
    Preconditions: Tasks 2, 3 completed
    Steps:
      1. Run `cd backend && go build ./internal/service/pdfreport/...`
      2. Run `cd backend && go vet ./internal/service/pdfreport/...`
      3. Verify interface compliance: grep for ReportPDFRenderer in renderer.go
    Expected Result: Build passes, vet passes, interface implemented
    Failure Indicators: Compile error, missing interface method
    Evidence: .sisyphus/evidence/task-5-renderer-build.txt

  Scenario: All 7 sections are rendered
    Tool: Bash
    Preconditions: renderer.go implemented
    Steps:
      1. Run `cd backend && grep -c "Section\|section\|Ringkasan\|Heatmap\|Daftar\|Top.*10\|Insiden\|KRI\|Tren" internal/service/pdfreport/renderer.go`
    Expected Result: Count >= 7 (all sections referenced)
    Failure Indicators: Count < 7 — missing sections
    Evidence: .sisyphus/evidence/task-5-all-sections.txt
  ```

  **Commit**: YES (group 2)
  - Message: `feat(report): implement PDF section renderers with maroto v2`
  - Files: `backend/internal/service/pdfreport/renderer.go`
  - Pre-commit: `cd backend && go build ./...`

- [x] 6. Implement Trend Chart Data Aggregation and Rendering

  **What to do**:
  - Add trend data aggregation to the report usecase (extend `generate.go` or create `trend.go`):
    - Fetch approved risks from the last 4–6 cycles (including the selected cycle)
    - For each cycle: count risks by level (Rendah, Sedang, Tinggi, Ekstrem)
    - Produce `[]entity.CycleTrendPoint` array
  - Create or extend chart rendering in `backend/internal/service/pdfreport/chart.go`:
    - `RenderTrendChart(data []entity.CycleTrendPoint) ([]byte, error)` — stacked bar chart
    - X-axis: cycle labels (e.g., "2025-H1", "2025-H2", "2026-H1")
    - Y-axis: risk count
    - 4 stacked segments per bar: Rendah (green), Sedang (yellow), Tinggi (orange), Ekstrem (red)
    - Returns PNG bytes for embedding
  - To get multi-cycle data, use the existing cycle snapshot approach:
    - Derive recent cycle labels (e.g., for "2026-H1" → also fetch "2025-H2", "2025-H1", "2024-H2")
    - Call `riskRepo.ListByCycle()` for each cycle
    - If a cycle has no data, include it with zero counts

  **Must NOT do**:
  - Do NOT use go-echarts for chart rendering
  - Do NOT create new SQL queries — use existing `ListByCycle()` repository method
  - Do NOT block on this if multi-cycle data is unavailable — gracefully show whatever cycles have data

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Mixed data aggregation + chart rendering, moderate complexity
  - **Skills**: [`backend-go`]
    - `backend-go`: Repository usage patterns
  - **Skills Evaluated but Omitted**:
    - `golang-pro`: Not needed for straightforward aggregation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 1, 2, 3

  **References**:

  **Pattern References**:
  - `backend/internal/usecase/risk/list_cycle_snapshot.go` — How to fetch risks by cycle, use same `ListByCycle()` approach for each historical cycle
  - `frontend/src/lib/risk-report-trend.ts` — Frontend trend data transformation logic — shows how cycles are ordered and risk levels counted. Use as reference for the Go version
  - `frontend/src/app/(app)/reports/page.tsx` — Risk trend chart section showing the stacked bar visual reference

  **API/Type References**:
  - `backend/internal/domain/entity/report.go` (from Task 2) — `CycleTrendPoint` struct with `Cycle, Rendah, Sedang, Tinggi, Ekstrem`
  - `backend/internal/domain/entity/risk.go:128-144` — `RiskLevel()` method for classifying each risk
  - `backend/internal/domain/repository/risk.go` — `ListByCycle()` method signature

  **External References**:
  - vicanso/go-charts stacked bar: `https://github.com/vicanso/go-charts` — `charts.BarRender()` with `SeriesList` for stacked segments

  **WHY Each Reference Matters**:
  - `list_cycle_snapshot.go`: Same repo method reused for each historical cycle
  - `risk-report-trend.ts`: Frontend already does this transformation — Go version should produce equivalent data
  - `risk.go:RiskLevel()`: Classification must match for consistency between frontend trend chart and PDF trend chart

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Trend aggregation produces valid data
    Tool: Bash
    Preconditions: Task implemented
    Steps:
      1. Run `cd backend && go build ./...`
      2. Run `cd backend && go vet ./internal/usecase/report/... ./internal/service/pdfreport/...`
    Expected Result: Build and vet pass
    Failure Indicators: Compile error
    Evidence: .sisyphus/evidence/task-6-trend-build.txt

  Scenario: Trend chart renders PNG
    Tool: Bash
    Preconditions: Chart renderer implemented
    Steps:
      1. Verify `RenderTrendChart` function exists in chart.go
      2. Run `cd backend && grep "RenderTrendChart" internal/service/pdfreport/chart.go`
    Expected Result: Function found
    Failure Indicators: Function missing
    Evidence: .sisyphus/evidence/task-6-trend-chart-exists.txt
  ```

  **Commit**: YES (group 3)
  - Message: `feat(report): add trend data aggregation and chart rendering`
  - Files: `backend/internal/usecase/report/generate.go` (or `trend.go`), `backend/internal/service/pdfreport/chart.go`
  - Pre-commit: `cd backend && go build ./...`

- [x] 7. Create HTTP Handler and Route Registration

  **What to do**:
  - Create `backend/internal/handler/http/report.go`:
    - `ReportHandler` struct with `generateUseCase` and `pdfRenderer` dependencies
    - `NewReportHandler(generateUC *report.GenerateReportUseCase, renderer service.ReportPDFRenderer) *ReportHandler`
    - `GenerateRiskPDF(c *fiber.Ctx) error` handler method:
      1. Extract `cycle` query param — return 400 if missing
      2. Extract user from JWT context (for potential org filtering)
      3. Call `generateUseCase.Execute(ctx, input)` to get `*entity.ReportData`
      4. If error is "no risks found" → return 404 with JSON error message
      5. Call `pdfRenderer.Render(ctx, reportData)` to get PDF bytes
      6. Set headers: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="risk-report-{cycle}.pdf"`
      7. Return `c.Send(pdfBytes)`
  - Update `backend/cmd/server/main.go`:
    - Instantiate report usecase with existing repositories
    - Instantiate PDF renderer
    - Instantiate report handler
    - Register route: `api.Get("/reports/risk-pdf", reportHandler.GenerateRiskPDF)` (under JWT auth middleware)
  - Ensure route is protected by existing JWT middleware (same as other `/api/v1/` routes)

  **Must NOT do**:
  - Do NOT add role-based restriction — all authenticated users can generate
  - Do NOT cache PDF responses
  - Do NOT modify existing handlers or routes
  - Do NOT add pagination for the PDF endpoint

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Thin handler following existing patterns, straightforward route registration
  - **Skills**: [`backend-go`]
    - `backend-go`: Handler patterns, route registration
  - **Skills Evaluated but Omitted**:
    - `golang-pro`: Handler is thin wrapper, no complex logic

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 3)
  - **Blocks**: Tasks 8, 9
  - **Blocked By**: Tasks 4, 5, 6

  **References**:

  **Pattern References**:
  - `backend/internal/handler/http/risk.go:226-235` — **Existing binary response pattern**: `c.Set("Content-Type", ...)` + `c.Set("Content-Disposition", ...)` + `c.Send(content)`. Use EXACTLY this pattern for PDF response
  - `backend/internal/handler/http/risk.go:1-30` — Handler struct pattern with usecase dependency injection
  - `backend/cmd/server/main.go:221-260` — Route registration pattern: repo → usecase → handler → `app.Get(...)`. Follow this exact wiring pattern

  **API/Type References**:
  - `backend/internal/usecase/report/generate.go` (from Task 4) — `GenerateReportUseCase` with `Execute()` method
  - `backend/internal/domain/service/report.go` (from Task 2) — `ReportPDFRenderer` interface for renderer dependency
  - `backend/internal/middleware/auth.go` — JWT middleware that extracts user from token

  **WHY Each Reference Matters**:
  - `risk.go:226-235`: This is the EXACT binary download pattern — don't invent a new one
  - `main.go:221-260`: Route wiring must follow established DI pattern to maintain codebase consistency
  - `auth.go`: JWT middleware is already applied to route group — handler just needs to extract user from context

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Endpoint returns valid PDF for existing cycle
    Tool: Bash
    Preconditions: Backend running on localhost:8080, at least one cycle has approved risks
    Steps:
      1. Get JWT token: `TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"password"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)`
      2. Download PDF: `curl -s -o test.pdf -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/reports/risk-pdf?cycle=2026-H1"`
      3. Verify HTTP 200
      4. Run `file test.pdf`
      5. Run `stat -f%z test.pdf`
    Expected Result: HTTP 200, file reports "PDF document", size > 10000 bytes
    Failure Indicators: Non-200 status, invalid file type, tiny file
    Evidence: .sisyphus/evidence/task-7-valid-pdf.txt

  Scenario: 401 without authentication
    Tool: Bash
    Preconditions: Backend running
    Steps:
      1. Run `curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/api/v1/reports/risk-pdf?cycle=2026-H1"`
    Expected Result: HTTP 401
    Failure Indicators: Any status other than 401
    Evidence: .sisyphus/evidence/task-7-auth-required.txt

  Scenario: 400 when cycle param missing
    Tool: Bash
    Preconditions: Backend running, valid JWT token
    Steps:
      1. Run `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/reports/risk-pdf"`
    Expected Result: HTTP 400
    Failure Indicators: Any status other than 400
    Evidence: .sisyphus/evidence/task-7-missing-param.txt

  Scenario: 404 for empty/nonexistent cycle
    Tool: Bash
    Preconditions: Backend running, valid JWT token
    Steps:
      1. Run `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/reports/risk-pdf?cycle=9999-H1"`
    Expected Result: HTTP 404
    Failure Indicators: Any status other than 404
    Evidence: .sisyphus/evidence/task-7-empty-cycle.txt

  Scenario: Content-Disposition header correct
    Tool: Bash
    Preconditions: Backend running, valid JWT token
    Steps:
      1. Run `curl -s -I -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/reports/risk-pdf?cycle=2026-H1" | grep -i "content-disposition"`
    Expected Result: Header contains `attachment; filename="risk-report-2026-H1.pdf"` (or similar)
    Failure Indicators: Missing header or wrong filename
    Evidence: .sisyphus/evidence/task-7-content-disposition.txt
  ```

  **Commit**: YES (group 3)
  - Message: `feat(report): add HTTP handler and route for PDF risk report`
  - Files: `backend/internal/handler/http/report.go`, `backend/cmd/server/main.go`
  - Pre-commit: `cd backend && go build ./...`

- [x] 8. Frontend Download Button on Reports Page

  **What to do**:
  - Update `frontend/src/app/(app)/reports/page.tsx`:
    - Add a new Card in the existing "Export Data" section (4-card grid around lines 311-371)
    - Card content: FileText icon + "Laporan Risiko PDF / Risk Report PDF" title + description
    - Add a cycle selector dropdown (reuse existing cycle fetching pattern from the page)
    - Add "Download PDF" button with loading state
  - Download implementation:
    - Use raw `fetch()` (NOT `api.get()` which calls `res.json()`) with `response.blob()`
    - Pattern from `frontend/src/app/(app)/risk/register/bulk/page.tsx:136-161`
    - Add `Authorization: Bearer ${token}` header via `useAuth()` context
    - On success: call `downloadBlob(blob, "risk-report-{cycle}.pdf")`
    - On 404: show toast "Tidak ada data risiko untuk periode ini / No risk data for this period"
    - On 400: show toast "Pilih periode terlebih dahulu / Please select a period first"
    - On error: show toast with error message
  - Loading state: Use `useState<boolean>(false)`, show `Loader2` icon with `animate-spin` during download
  - Reuse `downloadBlob()` function from `frontend/src/lib/risk-export.ts:241-250`

  **Must NOT do**:
  - Do NOT use `api.get()` for binary download — it calls `res.json()` internally
  - Do NOT add a new page — add to existing reports page
  - Do NOT add preview functionality — direct download only
  - Do NOT install any PDF-related frontend libraries

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small UI addition to existing page, follows established patterns
  - **Skills**: [`react-expert`]
    - `react-expert`: React hooks, component patterns, Next.js conventions
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: Not needed — following existing card grid pattern
    - `shadcn`: Components already installed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 3, after Task 7)
  - **Blocks**: Task 9
  - **Blocked By**: Task 7

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/reports/page.tsx:311-371` — **Existing Export Data section** with card grid layout. Add new card following same pattern (Card + CardHeader + CardContent + Button)
  - `frontend/src/app/(app)/risk/register/bulk/page.tsx:136-161` — **Raw fetch for binary download** pattern: `fetch(url, { headers: { Authorization: ... } })` → `response.blob()` → `downloadBlob()`. Use EXACTLY this pattern
  - `frontend/src/lib/risk-export.ts:241-250` — `downloadBlob(blob, filename)` utility function — reuse directly, do NOT reimplement
  - `frontend/src/contexts/auth-context.tsx` — `useAuth()` hook providing `{ token }` for API calls

  **API/Type References**:
  - `GET /api/v1/reports/risk-pdf?cycle=2026-H1` (from Task 7) — Backend endpoint returning PDF binary
  - Response: `Content-Type: application/pdf`, binary body

  **External References**:
  - shadcn/ui Card component — already in use on the page
  - Lucide `FileText` icon — for PDF report card icon

  **WHY Each Reference Matters**:
  - `reports/page.tsx:311-371`: MUST match existing card layout style for visual consistency
  - `bulk/page.tsx:136-161`: This is the ONLY working pattern for binary downloads in this codebase — `api.get()` WILL break on binary
  - `risk-export.ts:downloadBlob`: Reuse existing utility — don't duplicate

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Frontend builds successfully
    Tool: Bash
    Preconditions: Reports page updated
    Steps:
      1. Run `cd frontend && npm run build`
      2. Run `cd frontend && npm run lint`
    Expected Result: Both exit 0
    Failure Indicators: Build or lint errors
    Evidence: .sisyphus/evidence/task-8-frontend-build.txt

  Scenario: Download button exists on reports page
    Tool: Playwright (playwright skill)
    Preconditions: Frontend running on localhost:3000, user logged in
    Steps:
      1. Navigate to http://localhost:3000/reports
      2. Scroll to Export Data section
      3. Look for card containing text "Laporan Risiko PDF" or "Risk Report PDF"
      4. Verify download button exists within that card
      5. Screenshot the export section
    Expected Result: Card with PDF download option visible in Export Data grid
    Failure Indicators: Card not found, button missing
    Evidence: .sisyphus/evidence/task-8-download-button.png

  Scenario: Download triggers PDF download
    Tool: Playwright (playwright skill)
    Preconditions: Frontend + Backend running, cycle with data exists
    Steps:
      1. Navigate to reports page
      2. Select cycle from dropdown (e.g., "2026-H1")
      3. Click Download PDF button
      4. Wait for download to complete (loading spinner should appear then disappear)
      5. Verify downloaded file exists and is named like "risk-report-*.pdf"
    Expected Result: PDF file downloaded successfully
    Failure Indicators: No download triggered, error toast, infinite loading
    Evidence: .sisyphus/evidence/task-8-pdf-downloaded.png
  ```

  **Commit**: YES (group 4)
  - Message: `feat(reports): add PDF download button to reports page`
  - Files: `frontend/src/app/(app)/reports/page.tsx`
  - Pre-commit: `cd frontend && npm run build`

- [x] 9. End-to-End Integration Verification

  **What to do**:
  - This is a verification-only task — no code changes
  - Start both backend and frontend
  - Execute full end-to-end flow: Login → Navigate to Reports → Select cycle → Download PDF → Verify PDF content
  - Verify all 7 sections present in the generated PDF
  - Test edge cases: empty cycle (404), missing param (400), no auth (401)
  - Verify PDF is valid and contains real data (not just a template)
  - Capture evidence screenshots and curl outputs

  **Must NOT do**:
  - Do NOT write new code in this task
  - Do NOT modify any existing files
  - Only verify and capture evidence

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Comprehensive end-to-end verification requiring both curl and Playwright
  - **Skills**: [`playwright`]
    - `playwright`: Browser automation for frontend verification
  - **Skills Evaluated but Omitted**:
    - `backend-go`: No backend changes in this task

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 3, after Tasks 7, 8)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 7, 8

  **References**:

  **Pattern References**:
  - All previous tasks' QA scenarios — this task runs the comprehensive integration version

  **WHY Each Reference Matters**:
  - Previous QA scenarios: This task validates the complete chain, not individual components

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Full end-to-end PDF generation
    Tool: Bash + Playwright
    Preconditions: Backend running on :8080, Frontend on :3000, database has risks in at least one cycle
    Steps:
      1. Login via API: `curl -s -X POST .../auth/login` → get token
      2. Download PDF via curl: `curl -s -o e2e-test.pdf -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/reports/risk-pdf?cycle=2026-H1"`
      3. Verify HTTP 200
      4. Verify `file e2e-test.pdf` → "PDF document"
      5. Verify `stat -f%z e2e-test.pdf` → > 10000 bytes
      6. Open PDF and verify content contains cycle label
    Expected Result: Valid PDF with real data, size > 10KB
    Failure Indicators: Invalid PDF, empty content, wrong status code
    Evidence: .sisyphus/evidence/task-9-e2e-pdf.txt

  Scenario: Frontend to backend integration
    Tool: Playwright (playwright skill)
    Preconditions: Both services running
    Steps:
      1. Navigate to http://localhost:3000/login
      2. Login with valid credentials
      3. Navigate to /reports
      4. Select a cycle with data
      5. Click PDF download button
      6. Wait for download to complete
      7. Verify file downloaded (check downloads directory)
    Expected Result: PDF file downloaded via frontend UI
    Failure Indicators: Error toast, no download, loading stuck
    Evidence: .sisyphus/evidence/task-9-frontend-e2e.png

  Scenario: Error handling — empty cycle
    Tool: Bash
    Preconditions: Backend running, valid token
    Steps:
      1. Run `curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/reports/risk-pdf?cycle=9999-H1"`
    Expected Result: HTTP 404 with JSON error message
    Failure Indicators: Non-404 response
    Evidence: .sisyphus/evidence/task-9-empty-cycle-error.txt

  Scenario: Error handling — no auth
    Tool: Bash
    Preconditions: Backend running
    Steps:
      1. Run `curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/api/v1/reports/risk-pdf?cycle=2026-H1"`
    Expected Result: HTTP 401
    Evidence: .sisyphus/evidence/task-9-no-auth.txt

  Scenario: Error handling — missing param
    Tool: Bash
    Preconditions: Backend running, valid token
    Steps:
      1. Run `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/reports/risk-pdf"`
    Expected Result: HTTP 400
    Evidence: .sisyphus/evidence/task-9-missing-param.txt
  ```

  **Commit**: NO (verification only)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns (go-echarts import, maroto v1 import, new SQL queries) — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `cd backend && go build ./...` + `cd backend && go vet ./...`. Run `cd frontend && npm run build && npm run lint`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Vet [PASS/FAIL] | Lint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill for frontend)
  Start backend with `cd backend && make run`. Execute ALL QA scenarios from EVERY task. Test cross-task integration: frontend button triggers backend endpoint and produces valid PDF. Test edge cases: empty cycle (expect 404), missing cycle param (expect 400), no auth (expect 401). Save evidence to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (`git diff`). Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance: no go-echarts, no maroto v1, no new SQL, no cover page. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Commit # | Scope | Message | Files | Pre-commit |
|----------|-------|---------|-------|------------|
| 1 | Backend deps | `chore(backend): add maroto v2 and go-charts dependencies` | `go.mod`, `go.sum` | `go build ./...` |
| 2 | Backend domain + service | `feat(report): add report domain types and PDF rendering service` | `internal/domain/entity/report.go`, `internal/service/pdfreport/` | `go build ./...` |
| 3 | Backend usecase + handler | `feat(report): add report aggregation usecase and HTTP handler` | `internal/usecase/report/`, `internal/handler/http/report.go`, `cmd/server/main.go` | `go build ./...` |
| 4 | Frontend | `feat(reports): add PDF download button to reports page` | `src/app/(app)/reports/page.tsx` | `npm run build` |

---

## Success Criteria

### Verification Commands
```bash
# Backend builds
cd backend && go build ./...  # Expected: exit 0

# Frontend builds
cd frontend && npm run build  # Expected: exit 0

# Endpoint returns valid PDF
curl -s -o test.pdf -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/reports/risk-pdf?cycle=2026-H1"
# Expected: 200, file test.pdf is valid PDF

# PDF file is valid
file test.pdf  # Expected: "PDF document, version 1.x"

# PDF has real content
stat -f%z test.pdf  # Expected: > 10000 bytes

# Auth required
curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/api/v1/reports/risk-pdf?cycle=2026-H1"
# Expected: 401

# Missing param
curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/reports/risk-pdf"
# Expected: 400

# Empty cycle
curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/reports/risk-pdf?cycle=9999-H1"
# Expected: 404
```

### Final Checklist
- [x] All "Must Have" present (7 report sections, cycle filter, bilingual, landscape, auth)
- [x] All "Must NOT Have" absent (no go-echarts, no maroto v1, no new SQL, no cover page)
- [x] `go build ./...` passes
- [x] `npm run build` passes
- [x] End-to-end: frontend button → backend endpoint → valid PDF download
