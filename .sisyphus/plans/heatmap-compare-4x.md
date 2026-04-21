# Heatmap Compare 4x (Awal / Sem1 / Sem2 / Target) — Monitoring Menu

## TL;DR

> **Quick Summary**: Tambah card "Heatmap Compare Multi-Fase" baru di menu Monitoring dengan 4 heatmap side-by-side (Skor Awal, Semester 1, Semester 2, Target) dengan desain identik dengan Heatmap Compare existing.
>
> **Deliverables**:
> - Backend endpoint baru `GET /api/v1/dashboard/heatmap-multi?year={year}` yang mengembalikan 4 matrix 5x5
> - Repository query baru untuk skor awal (risk_versions pertama), sem1, sem2, target
> - Card React baru di monitoring page dengan 4 kolom heatmap + dropdown year selector
> - Reuse `getHeatmapCellClass` dan Tabs intensity/riskLevel dari card existing
>
> **Estimated Effort**: Short
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4 → F1-F4

---

## Context

### Original Request
> "aku ingin membuat 1 card heatmap compare baru ya, di menu monitoring. isinya nanti adalah heatmap skor awal, ini ambil aja dari v1, kemudian heatmap semester 1, kemudian heatmap semester 2, dan yang terakhir adalah heatmap target skor (target_skor). Desain heatmapnya samain aja dengan desain heatmap compare existing"

### Interview Summary
**Key Discussions**:
- Layout: 4 kolom side-by-side (Samping Menyamping)
- API Backend: butuh diupdate / dibuat endpoint baru
- Skor Awal source: dari risk_versions pertama (v1 row — probability*impact saat risk pertama kali dibuat)
- Year context: dropdown tahun di card untuk fleksibilitas

**Research Findings**:
- Heatmap compare existing ada **inline** di `frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx` lines 824-887
- Helper `getHeatmapCellClass(count, prob, impact, mode)` ada di file yang sama lines 141-170
- Backend heatmap endpoint: `HeatmapData` di `backend/internal/handler/http/risk.go:770` memakai `riskuc.HeatmapDataUseCase`
- Repository: `HeatmapData` di `backend/internal/repository/postgres/risk.go:776` query `r.probability`, `r.impact` dari tabel `risks` dengan filter `assessment_cycle` + `is_cycle_current`
- Schema `risks`: punya `probability`, `impact`, `target_probability`, `target_impact`, `assessment_cycle` (format "YYYY-H1"/"YYYY-H2")
- Schema `risk_versions`: berisi histori versi risk — versi pertama = skor awal
- Styling: heatmap-sangat-rendah/rendah/sedang/tinggi/sangat-tinggi (riskLevel mode) atau intensity-based

### Metis Review
**Status**: Tidak dikonsultasikan (dibatalkan user, dilanjut langsung). Risk gaps dibantu self-review.

---

## Work Objectives

### Core Objective
Memberikan user Monitoring view komparatif lifecycle risiko dari inherent (awal) → residual sem1 → residual sem2 → target dalam 1 card visual 5x5 heatmap.

### Concrete Deliverables
- Backend endpoint: `GET /api/v1/dashboard/heatmap-multi?year={YYYY}&org_id={uuid}` mengembalikan `{ initial: number[][], semester1: number[][], semester2: number[][], target: number[][] }` (masing-masing 5x5)
- Repository method `HeatmapMultiPhase(ctx, year, orgIDs)` dengan 4 query (atau 1 query gabungan dengan subqueries)
- UseCase `HeatmapMultiUseCase` mengorkestrasikan call repo
- Component React baru: `MultiPhaseHeatmapCompareCard` di `frontend/src/app/(app)/compliance/_components/multi-phase-heatmap-compare.tsx`
- Integrasi card ke monitoring via `risk-review-panel.tsx` (atau `monitoring-reporting-workspace.tsx`)

### Definition of Done
- [ ] `curl localhost:8080/api/v1/dashboard/heatmap-multi?year=2025` mengembalikan JSON 4 matrix 5x5
- [ ] Card muncul di halaman Monitoring tepat di bawah (atau di samping) heatmap compare existing
- [ ] Dropdown tahun berfungsi: ganti tahun → 4 heatmap update
- [ ] Toggle mode Intensitas/Level Risiko berfungsi untuk semua 4 heatmap
- [ ] Styling identik dengan heatmap compare existing (grid 5x5, gap-1, warna cell sama)
- [ ] Backend test unit pass untuk repo multi-phase query

### Must Have
- 4 heatmap dalam 1 CardHeader+CardContent, layout `grid grid-cols-4` di desktop (responsive: `md:grid-cols-2` untuk tablet, `grid-cols-1` untuk mobile)
- Label heatmap: "Skor Awal", "Semester 1", "Semester 2", "Target Skor"
- Mode toggle Intensitas/Level Risiko (shared untuk 4 heatmap, bukan per-heatmap)
- Dropdown Year selector dengan default = tahun berjalan
- Skor Awal = `probability × impact` dari row paling awal di `risk_versions` per risk (v1)
- Semester 1 = `probability × impact` dari `risks` dengan `assessment_cycle = '{year}-H1'` dan `is_cycle_current = TRUE`
- Semester 2 = idem dengan `{year}-H2`
- Target = `target_probability × target_impact` dari `risks.is_current = TRUE` (atau current cycle)

### Must NOT Have (Guardrails)
- JANGAN refactor heatmap compare existing (jangan breaking change)
- JANGAN buat abstraction prematur `<HeatmapGrid>` component jika existing masih inline — cukup ekstrak helper ke modul kecil, atau duplicate styling dengan konstanta shared
- JANGAN tambah filter tambahan selain year dan org scope (no category filter, no severity filter)
- JANGAN ubah endpoint `/dashboard/heatmap` existing
- JANGAN tambahkan 4 network call terpisah — harus 1 endpoint untuk efisiensi
- JANGAN hardcode tahun di frontend — gunakan dropdown
- JANGAN skip org scope middleware (`middleware.GetAccessScope`) di endpoint baru

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Go testing + potential Jest untuk frontend)
- **Automated tests**: YES (Tests-after untuk backend repo/usecase; Agent QA untuk frontend)
- **Framework**: Go testing (backend) + Playwright (frontend QA)

### QA Policy
Tiap task include agent-executed QA scenarios. Evidence di `.sisyphus/evidence/task-{N}-*.{png|json|txt}`.

- **Backend API**: curl → JSON response assertion
- **Frontend UI**: Playwright → navigate `/compliance/monitoring`, verify 4 heatmap grids, screenshot

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation):
├── Task 1: Backend — Repository HeatmapMultiPhase method [deep]
├── Task 2: Frontend — Extract getHeatmapCellClass to shared util [quick]

Wave 2 (Feature Build — parallel):
├── Task 3: Backend — UseCase + Handler + Route wiring (depends: 1) [unspecified-high]
├── Task 4: Frontend — MultiPhaseHeatmapCompareCard component (depends: 2) [visual-engineering]

Wave 3 (Integration):
├── Task 5: Frontend — Integrate card into monitoring page (depends: 3, 4) [quick]

Wave FINAL:
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high + playwright)
└── F4: Scope fidelity check (deep)

Critical Path: T1 → T3 → T5 → F1-F4 → user okay
Max Concurrent: 2 (Wave 1 & 2)
```

### Dependency Matrix

- **T1**: None → T3
- **T2**: None → T4
- **T3**: T1 → T5
- **T4**: T2 → T5
- **T5**: T3, T4 → F1-F4

### Agent Dispatch Summary

- Wave 1: T1 → `deep` (golang-pro, postgres-pro), T2 → `quick`
- Wave 2: T3 → `unspecified-high` (backend-go), T4 → `visual-engineering` (react-expert, shadcn)
- Wave 3: T5 → `quick`
- FINAL: F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high` + `playwright`, F4 → `deep`

---

## TODOs

- [x] 1. Backend — Repository HeatmapMultiPhase method

  **What to do**:
  - Tambah method baru di `backend/internal/repository/postgres/risk.go`:
    ```go
    func (r *riskRepository) HeatmapMultiPhase(ctx context.Context, year int, orgIDs []uuid.UUID) (*entity.HeatmapMultiPhase, error)
    ```
  - Return struct baru di `backend/internal/domain/entity/dashboard.go`:
    ```go
    type HeatmapMultiPhase struct {
      Initial   [5][5]int `json:"initial"`
      Semester1 [5][5]int `json:"semester1"`
      Semester2 [5][5]int `json:"semester2"`
      Target    [5][5]int `json:"target"`
    }
    ```
  - Query logic:
    - **Initial (Skor Awal)**: Dari `risk_versions` row paling awal per risk_id (`ORDER BY version_number ASC LIMIT 1` per risk, atau `DISTINCT ON (risk_id)`). Ambil `probability × impact`. Filter: hanya risk dengan status approved/in_review dan ada cycle dalam tahun target.
    - **Semester 1**: Reuse pola `HeatmapData` existing, filter `assessment_cycle = '{year}-H1'` AND `is_cycle_current = TRUE` AND status IN ('approved','assessment_in_review').
    - **Semester 2**: idem, cycle `{year}-H2`.
    - **Target**: `target_probability × target_impact` dari `risks` dengan `is_current = TRUE` (atau `is_cycle_current` untuk H2 tahun target) DAN ada record di tahun target.
  - Apply `orgIDs` filter jika `len(orgIDs) > 0` (org scope).

  **Must NOT do**:
  - JANGAN ubah method `HeatmapData` existing
  - JANGAN gabung query sampai tidak terbaca — 4 query terpisah lebih maintainable, gunakan goroutine/errgroup jika perlu paralel
  - JANGAN query tanpa LIMIT pada subquery risk_versions

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Query SQL kompleks dengan 4 variant + risk_versions window/DISTINCT ON
  - **Skills**: [`postgres-pro`, `golang-pro`, `backend-go`]
    - `postgres-pro`: DISTINCT ON pattern untuk "v1 per risk_id"
    - `golang-pro`: errgroup untuk paralel query
    - `backend-go`: repository pattern clean arch

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (dengan Task 2)
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `backend/internal/repository/postgres/risk.go:775-812` — Existing `HeatmapData` method sebagai template query dengan `r.probability`, `r.impact`, cycle filter, orgIDs filter pattern
  - `backend/internal/repository/postgres/risk.go:1390-1450` — Existing `loadHeatmap` closure pattern untuk multi-cycle query

  **Schema References**:
  - `backend/db/migrations/000001_initial_schema.up.sql:45-59` — risks table columns: `probability`, `impact`, `target_probability`, `target_impact`, `target_score`
  - `backend/db/migrations/000001_initial_schema.up.sql` (risk_versions) — versi risk untuk skor awal
  - `backend/db/migrations/000025_add_is_cycle_current.up.sql` — `is_cycle_current` flag semantic

  **Domain References**:
  - `backend/internal/domain/entity/dashboard.go` — Tempat `HeatmapCell` dan tambah `HeatmapMultiPhase` struct

  **Acceptance Criteria**:

  **Agent-Executable Verification**:
  - [ ] File `backend/internal/repository/postgres/risk.go` berisi method `HeatmapMultiPhase`
  - [ ] File `backend/internal/domain/entity/dashboard.go` berisi struct `HeatmapMultiPhase`
  - [ ] `go vet ./...` → 0 errors
  - [ ] `go build ./...` → success
  - [ ] Unit test: `go test ./internal/repository/postgres/ -run TestHeatmapMultiPhase` → PASS

  **QA Scenarios**:

  ```
  Scenario: Query returns 4 matrices for year 2025 with test data
    Tool: Bash (psql seed + go test)
    Preconditions: Test DB dengan ≥3 risks: 1 punya risk_versions v1 dgn prob=3,imp=4; 1 di cycle 2025-H1 prob=2,imp=3; 1 di cycle 2025-H2 prob=1,imp=2; target 1x1
    Steps:
      1. Seed data via testcontainer/migration fixtures
      2. Call `repo.HeatmapMultiPhase(ctx, 2025, nil)`
      3. Assert `result.Initial[2][3] == 1` (prob=3, imp=4 → idx 2,3)
      4. Assert `result.Semester1[1][2] == 1`
      5. Assert `result.Semester2[0][1] == 1`
      6. Assert `result.Target[0][0] >= 1`
    Expected Result: All 4 matrices populated correctly
    Evidence: .sisyphus/evidence/task-1-multiphase-query.txt (go test -v output)

  Scenario: Empty orgIDs returns only accessible orgs
    Tool: Bash (go test)
    Preconditions: Seed 2 orgs, user scoped ke org1
    Steps:
      1. Call `repo.HeatmapMultiPhase(ctx, 2025, []uuid.UUID{org1ID})`
      2. Assert counts hanya dari org1
    Expected Result: Data di-scope ke org1 only
    Evidence: .sisyphus/evidence/task-1-scope.txt
  ```

  **Commit**: YES
  - Message: `feat(backend): add risk repo HeatmapMultiPhase method`
  - Files: `backend/internal/repository/postgres/risk.go`, `backend/internal/domain/entity/dashboard.go`
  - Pre-commit: `go test ./internal/repository/...`

- [x] 2. Frontend — Extract getHeatmapCellClass to shared util

  **What to do**:
  - Buat file baru `frontend/src/lib/heatmap-utils.ts`
  - Pindahkan / duplikasi fungsi `getHeatmapCellClass(count, prob, impact, mode)` dari `risk-review-panel.tsx:141-170` ke util ini (duplikasi OK jika khawatir breaking, TAPI lebih baik import dari util ke panel existing)
  - Export: `export type HeatmapMode = "intensity" | "riskLevel"`
  - Export: `export function getHeatmapCellClass(count: number, prob: number, impact: number, mode: HeatmapMode): string`

  **Must NOT do**:
  - JANGAN ubah behavior/return value fungsi — harus identik byte-per-byte
  - JANGAN rename class Tailwind yang dihasilkan
  - JANGAN refactor panel existing selain update import path

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Extraction sederhana, tidak ada business logic baru
  - **Skills**: []
    - No skill needed — murni file move

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (dengan Task 1)
  - **Blocks**: Task 4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx:141-170` — Existing `getHeatmapCellClass` function untuk diextract

  **Acceptance Criteria**:
  - [ ] File `frontend/src/lib/heatmap-utils.ts` exists dengan exports
  - [ ] `risk-review-panel.tsx` import dari util baru (opsional — bisa dilakukan di Task 4)
  - [ ] `npm run lint` → 0 errors
  - [ ] `npx tsc --noEmit` → 0 errors
  - [ ] Heatmap compare existing masih render identik (screenshot comparison)

  **QA Scenarios**:

  ```
  Scenario: Existing heatmap compare still renders identically
    Tool: Playwright
    Preconditions: Dev server running, user logged in dgn akses monitoring
    Steps:
      1. Navigate to http://localhost:3000/compliance/monitoring
      2. Wait for heatmap compare card (selector: [data-testid="heatmap-compare"] or h3 with text "Heatmap Compare")
      3. Screenshot heatmap compare card
      4. Visually compare dengan baseline pre-refactor (jika ada)
    Expected Result: Rendered identically, no visual regression
    Evidence: .sisyphus/evidence/task-2-heatmap-unchanged.png
  ```

  **Commit**: YES
  - Message: `refactor(frontend): extract heatmap cell class helper to lib`
  - Files: `frontend/src/lib/heatmap-utils.ts`
  - Pre-commit: `npm run lint && npx tsc --noEmit`

- [x] 3. Backend — UseCase + Handler + Route wiring

  **What to do**:
  - Buat `backend/internal/usecase/risk/dashboard_multi.go`:
    ```go
    type HeatmapMultiInput struct { Year int; OrgIDs []uuid.UUID }
    type HeatmapMultiUseCase struct { riskRepo repository.RiskRepository }
    func NewHeatmapMultiUseCase(repo repository.RiskRepository) *HeatmapMultiUseCase
    func (uc *HeatmapMultiUseCase) Execute(ctx, input) (*entity.HeatmapMultiPhase, error)
    ```
  - Tambah method di `RiskRepository` interface (`backend/internal/domain/repository/risk.go` atau lokasinya): `HeatmapMultiPhase(ctx, year, orgIDs) (*entity.HeatmapMultiPhase, error)`
  - Tambah handler di `backend/internal/handler/http/risk.go`:
    ```go
    func (h *RiskHandler) HeatmapMulti(c *fiber.Ctx) error
    ```
    - Parse query `year` (default: current year)
    - Get org scope via `middleware.GetAccessScope(c)`
    - Call usecase, return `c.JSON(fiber.Map{"data": result})`
  - Inject `heatmapMultiUC` ke `RiskHandler` struct dan constructor
  - Wire di `backend/cmd/server/main.go`: instantiate usecase, pass ke handler, register route `app.Get("/api/v1/dashboard/heatmap-multi", riskHandler.HeatmapMulti)`

  **Must NOT do**:
  - JANGAN tambah route ke path lain selain `/api/v1/dashboard/heatmap-multi`
  - JANGAN skip org scope middleware
  - JANGAN duplikasi struct di handler — reuse `entity.HeatmapMultiPhase`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`backend-go`, `golang-pro`]
    - `backend-go`: clean architecture wiring pattern
    - `golang-pro`: idiomatic Go error handling

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 5
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `backend/internal/usecase/risk/dashboard.go:39-65` — HeatmapDataUseCase sebagai template
  - `backend/internal/handler/http/risk.go:770-793` — HeatmapData handler template (query parse, scope, json return)
  - `backend/internal/handler/http/risk.go:38-101` — RiskHandler struct dependency injection pattern
  - `backend/cmd/server/main.go` — Route registration pattern (cari `dashboard/heatmap`)

  **Acceptance Criteria**:
  - [ ] Endpoint `GET /api/v1/dashboard/heatmap-multi?year=2025` returns 200 with JSON `{data: {initial, semester1, semester2, target}}`
  - [ ] Each matrix is 5x5 (`jq '.data.initial | length'` == 5)
  - [ ] Without auth → 401
  - [ ] With org scope → only accessible orgs counted
  - [ ] `go build ./...` → success
  - [ ] `go test ./internal/usecase/risk/ -run TestHeatmapMulti` → PASS

  **QA Scenarios**:

  ```
  Scenario: Endpoint returns 4 matrices
    Tool: Bash (curl)
    Preconditions: Backend running on :8080, valid JWT token
    Steps:
      1. TOKEN=$(curl -s -X POST localhost:8080/api/v1/auth/login -d '{"email":"admin@...","password":"..."}' -H 'Content-Type: application/json' | jq -r .token)
      2. curl -s -H "Authorization: Bearer $TOKEN" "localhost:8080/api/v1/dashboard/heatmap-multi?year=2025" > response.json
      3. jq '.data | keys' response.json → ["initial","semester1","semester2","target"]
      4. jq '.data.initial | length' response.json → 5
      5. jq '.data.initial[0] | length' response.json → 5
    Expected Result: All 4 matrices 5x5 present
    Evidence: .sisyphus/evidence/task-3-endpoint-success.json

  Scenario: Unauthorized request rejected
    Tool: Bash (curl)
    Preconditions: Backend running
    Steps:
      1. curl -s -o /dev/null -w "%{http_code}" "localhost:8080/api/v1/dashboard/heatmap-multi?year=2025"
    Expected Result: 401
    Evidence: .sisyphus/evidence/task-3-unauth.txt

  Scenario: Invalid year returns sensible default or error
    Tool: Bash (curl)
    Steps:
      1. curl with year=abc
    Expected Result: 400 bad request OR default to current year (document which)
    Evidence: .sisyphus/evidence/task-3-bad-year.txt
  ```

  **Commit**: YES
  - Message: `feat(backend): add /dashboard/heatmap-multi endpoint`
  - Files: `backend/internal/usecase/risk/dashboard_multi.go`, `backend/internal/handler/http/risk.go`, `backend/internal/domain/repository/risk.go`, `backend/cmd/server/main.go`
  - Pre-commit: `go test ./internal/... && go build ./...`

- [x] 4. Frontend — MultiPhaseHeatmapCompareCard component

  **What to do**:
  - Buat file `frontend/src/app/(app)/compliance/_components/multi-phase-heatmap-compare.tsx`
  - Client component dengan props:
    ```ts
    interface Props {
      defaultYear?: number;
      availableYears?: number[]; // opsional — generate dari current year - 3 sampai current year
    }
    ```
  - State:
    - `year` (useState, default = new Date().getFullYear())
    - `data` (useState<{initial, semester1, semester2, target}: number[][]}>)
    - `mode` (useState<"intensity" | "riskLevel">("riskLevel"))
    - `loading` (useState<boolean>)
  - useEffect: fetch `/api/v1/dashboard/heatmap-multi?year={year}` via existing API client (`frontend/src/lib/api/...`)
  - Render:
    ```jsx
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="flex flex-col space-y-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold text-foreground">
            Heatmap Compare Multi-Fase
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Distribusi risiko lintas fase lifecycle dalam tahun {year}.
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            {/* year options */}
          </Select>
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList className="grid w-full grid-cols-2 sm:w-[240px]">
              <TabsTrigger value="intensity">Intensitas</TabsTrigger>
              <TabsTrigger value="riskLevel">Level Risiko</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {/* 4 heatmap blocks: Skor Awal, Sem 1, Sem 2, Target */}
        {(["initial","semester1","semester2","target"] as const).map((key) => (
          <div key={key} className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">{labelMap[key]}</h4>
            <div className="grid grid-cols-5 gap-1">
              {/* 5x5 cells, reverse probability rows */}
            </div>
            {/* axis labels */}
          </div>
        ))}
      </CardContent>
    </Card>
    ```
  - Import `getHeatmapCellClass` dari `@/lib/heatmap-utils` (from Task 2)
  - Label map: `{initial: "Skor Awal", semester1: "Semester 1", semester2: "Semester 2", target: "Target Skor"}`
  - Loading state: skeleton/placeholder "Memuat heatmap multi-fase..."

  **Must NOT do**:
  - JANGAN fetch 4 endpoint terpisah — pakai 1 endpoint multi
  - JANGAN inline helper styling — reuse dari `@/lib/heatmap-utils`
  - JANGAN pakai styling berbeda dari heatmap compare existing (gap, border, warna harus identik)
  - JANGAN lupa handle empty data (render empty 5x5 grid with zeros, BUKAN error)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Card visual dengan grid kompleks + loading state + Tabs
  - **Skills**: [`react-expert`, `shadcn`, `frontend-design`]
    - `react-expert`: hooks dan state management
    - `shadcn`: Card, Tabs, Select components
    - `frontend-design`: konsistensi visual dengan existing card

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (dengan Task 3)
  - **Blocks**: Task 5
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx:824-887` — Existing Heatmap Compare card struktur (Card, CardHeader dengan Tabs, CardContent dengan grid heatmap) — HARUS DIDUPLIKASI desainnya
  - `frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx:141-170` — `getHeatmapCellClass` (atau dari util Task 2)
  - `frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx:296-356` — Data fetching useEffect pattern

  **Component References**:
  - `@/components/ui/card`, `@/components/ui/tabs`, `@/components/ui/select` — shadcn components
  - Check `frontend/src/components/ui/select.tsx` ada / atau pakai native `<select>`

  **API References**:
  - Endpoint dari Task 3: `GET /api/v1/dashboard/heatmap-multi?year={YYYY}`
  - Response shape: `{data: {initial: number[][], semester1: number[][], semester2: number[][], target: number[][]}}`

  **Acceptance Criteria**:
  - [ ] File `multi-phase-heatmap-compare.tsx` exists dan export default component
  - [ ] Component render 4 heatmap berlabel "Skor Awal", "Semester 1", "Semester 2", "Target Skor"
  - [ ] Dropdown tahun berfungsi — ganti year → fetch ulang data
  - [ ] Tabs mode (Intensitas/Level Risiko) berfungsi untuk semua 4 heatmap
  - [ ] `npm run lint` → 0 errors
  - [ ] `npx tsc --noEmit` → 0 errors
  - [ ] `npm run build` → success

  **QA Scenarios**:

  ```
  Scenario: Component renders 4 heatmap grids
    Tool: Playwright
    Preconditions: Task 5 integration selesai, dev server running
    Steps:
      1. Navigate `http://localhost:3000/compliance/monitoring`
      2. Wait for element with text "Heatmap Compare Multi-Fase"
      3. Count child elements dengan heading h4 di dalam card tersebut
      4. Assert count === 4
      5. Verify texts: "Skor Awal", "Semester 1", "Semester 2", "Target Skor"
      6. Screenshot
    Expected Result: 4 heatmap grids rendered with correct labels
    Evidence: .sisyphus/evidence/task-4-4-heatmaps.png

  Scenario: Mode toggle changes styling
    Tool: Playwright
    Steps:
      1. Navigate monitoring page
      2. Screenshot dalam mode default (riskLevel)
      3. Click TabsTrigger "Intensitas"
      4. Screenshot dalam mode intensity
      5. Assert class cell berubah (sampling 1 cell non-zero)
    Expected Result: Styling cell berubah sesuai mode
    Evidence: .sisyphus/evidence/task-4-mode-toggle-before.png, task-4-mode-toggle-after.png

  Scenario: Year dropdown triggers refetch
    Tool: Playwright + network monitor
    Steps:
      1. Navigate monitoring page
      2. Intercept network `/dashboard/heatmap-multi`
      3. Change year dropdown ke tahun lain
      4. Assert new network request fired dengan `year={new}` param
      5. Assert data ter-update (counts berubah jika ada data)
    Expected Result: Refetch terjadi saat year change
    Evidence: .sisyphus/evidence/task-4-year-change.json (HAR/network log)
  ```

  **Commit**: YES
  - Message: `feat(frontend): add MultiPhaseHeatmapCompareCard component`
  - Files: `frontend/src/app/(app)/compliance/_components/multi-phase-heatmap-compare.tsx`, `frontend/src/lib/heatmap-utils.ts` (jika belum dari Task 2)
  - Pre-commit: `npm run lint && npx tsc --noEmit`

- [x] 5. Frontend — Integrate card into monitoring page

  **What to do**:
  - Edit `frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx`
  - Import: `import { MultiPhaseHeatmapCompareCard } from "./multi-phase-heatmap-compare"`
  - Render `<MultiPhaseHeatmapCompareCard />` tepat DI BAWAH heatmap compare card existing (setelah line ~887)
  - Pastikan spacing konsisten (pakai class yg sama dgn card sebelumnya — misalnya `mt-6` atau parent grid gap)

  **Must NOT do**:
  - JANGAN ubah heatmap compare existing
  - JANGAN tambah prop drilling yang rumit — component self-contained (fetch sendiri)
  - JANGAN render di route groups lain (hanya di monitoring)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: F1-F4
  - **Blocked By**: Task 3, Task 4

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx:824-887` — Lokasi insertion (tepat setelah closing `</Card>` existing heatmap compare)

  **Acceptance Criteria**:
  - [ ] Card "Heatmap Compare Multi-Fase" muncul di `/compliance/monitoring` di bawah heatmap compare existing
  - [ ] Spacing visual konsisten
  - [ ] Existing heatmap compare masih berfungsi
  - [ ] `npm run build` → success

  **QA Scenarios**:

  ```
  Scenario: Both heatmap cards visible on monitoring page
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Navigate `http://localhost:3000/compliance/monitoring`
      2. Scroll ke area heatmap
      3. Assert element dengan text "Heatmap Compare" (existing) visible
      4. Assert element dengan text "Heatmap Compare Multi-Fase" (new) visible di BAWAH-nya
      5. Full-page screenshot
    Expected Result: Both cards visible, multi-fase di bawah existing
    Evidence: .sisyphus/evidence/task-5-both-cards.png

  Scenario: No regression on existing heatmap compare
    Tool: Playwright
    Steps:
      1. Navigate monitoring page
      2. Click mode toggle pada heatmap compare existing
      3. Verify existing card masih respond (screenshot)
    Expected Result: Existing card unchanged in behavior
    Evidence: .sisyphus/evidence/task-5-no-regression.png
  ```

  **Commit**: YES
  - Message: `feat(monitoring): integrate multi-phase heatmap compare card`
  - Files: `frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx`
  - Pre-commit: `npm run build`

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Baca plan. Verify "Must Have": endpoint baru response 4 matrix, dropdown year ada, mode toggle shared, skor awal dari risk_versions v1. Verify "Must NOT Have": no breaking change ke `/dashboard/heatmap`, no 4 separate calls (check network tab), no hardcoded year. Cek evidence files.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Backend: `go vet ./...`, `go test ./internal/...`. Frontend: `npm run lint`, `npx tsc --noEmit`. Review: `as any`, empty catch, console.log, commented code, AI slop (excessive generic comments).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` + `playwright` skill
  Clean state. Navigate `/compliance/monitoring`. Execute QA scenarios dari T3-T5. Screenshot 4 heatmap dengan mode Intensitas & Level Risiko. Test dropdown year. Test responsive (resize viewport). Evidence ke `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  Per task: baca "What to do" vs actual diff (git diff). Verify 1:1. Check "Must NOT do" compliance (no refactor existing heatmap, no 4 endpoints). Flag cross-task contamination.
  Output: `Tasks [N/N compliant] | VERDICT`

---

## Commit Strategy

- **T1**: `feat(backend): add risk repo HeatmapMultiPhase method` — `backend/internal/repository/postgres/risk.go`, pre-commit: `go test ./internal/repository/...`
- **T2**: `refactor(frontend): extract heatmap cell class helper` — `frontend/src/lib/heatmap-utils.ts`, pre-commit: `npm run lint`
- **T3**: `feat(backend): add /dashboard/heatmap-multi endpoint` — `backend/internal/usecase/risk/dashboard_multi.go`, `backend/internal/handler/http/risk.go`, `backend/cmd/server/main.go`, pre-commit: `go test ./internal/usecase/...`
- **T4**: `feat(frontend): add MultiPhaseHeatmapCompareCard component` — `frontend/src/app/(app)/compliance/_components/multi-phase-heatmap-compare.tsx`, pre-commit: `npm run lint`
- **T5**: `feat(monitoring): integrate multi-phase heatmap compare card` — `frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx`, pre-commit: `npm run build`

---

## Success Criteria

### Verification Commands
```bash
# Backend API
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/dashboard/heatmap-multi?year=2025" | jq '. | keys'
# Expected: ["data"] where data has keys: initial, semester1, semester2, target

# Each matrix is 5x5
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/dashboard/heatmap-multi?year=2025" | jq '.data.initial | length'
# Expected: 5

# Frontend build
cd frontend && npm run build
# Expected: success

# Backend tests
cd backend && go test ./internal/...
# Expected: PASS
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Card renders at /compliance/monitoring
- [ ] 4 heatmap labeled correctly
- [ ] Dropdown year works
- [ ] Mode toggle works for all 4
- [ ] Design visually identical to existing heatmap compare
