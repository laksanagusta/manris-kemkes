# Risk Assessment Form Separation — Pemantauan Risiko

## TL;DR

> **Quick Summary**: Memisahkan form Risk Assessment dari Risk Register dengan membuat halaman "Pemantauan Risiko" baru di sidebar. Form assessment terdiri dari 3 section cards: Profil Risiko (read-only), Hasil Pemantauan (editable), dan Simpulan (auto-calculated). Backend tidak berubah — reuse existing reassessment + update flow.
> 
> **Deliverables**:
> - Menu sidebar baru "Pemantauan Risiko"
> - List page: daftar risk approved yang eligible untuk assessment
> - Assessment form page: 3-card single-page form
> - Simpulan auto-calculation utilities (tingkat risiko + efektifitas)
> - Auto-detect assessment cycle dari tanggal (H1/H2)
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 4 → Task 6 → Task 7 → Task 8

---

## Context

### Original Request
Memisahkan form risk register dengan risk assessment. Risk assessment akan memiliki:
- Profil Risiko (read-only, menampilkan risiko current sebelum assessment)
- Hasil Pemantauan (skor baru: probabilitas, dampak, bobot, nilai)
- Simpulan (auto-calculated: tingkat risiko comparison + efektifitas)

### Interview Summary
**Key Discussions**:
- DB tidak berubah, behaviour insert tetap sama
- Assessment tetap melalui approval workflow (draft → in_review → approved)
- Draft reassessment copy dari versi sebelumnya, bisa diganti
- Semua role bisa melakukan assessment
- Assessment berkali-kali per cycle (H1/H2)
- Cycle auto-detect: Jan-Jun = H1, Jul-Dec = H2

**Research Findings**:
- Backend `CreateRiskReassessmentUseCase` sudah ada — creates draft clone dari approved risk
- `POST /api/risks/:id/reassess` + `PUT /api/risks/:id` flow sudah jalan
- `ListApprovedRisksUseCase` sudah ada di backend
- Frontend utilities (`getBobot`, `calculateNilai`, `getRiskLevelFromNilai`) sudah lengkap di `lib/risk.ts`
- BobotMatrix 5×5 sudah diimplementasi di frontend dan backend
- Risk register list page pattern di `risk/register/page.tsx` (1472 lines) bisa dijadikan reference

### Metis Review
**Identified Gaps** (addressed):
- Approval workflow: confirmed YES — reuse existing flow
- Simpulan baseline: compare against source risk (the approved risk being assessed)
- Component size: enforce ≤200 lines per card, ≤300 lines main page
- No new DB migrations needed
- Concurrent assessment guard: existing `GetOrCreatePeriodicReassessmentInTx` handles this

---

## Work Objectives

### Core Objective
Membuat halaman Pemantauan Risiko terpisah dari Risk Register, dengan form assessment yang fokus pada input skor baru dan simpulan otomatis.

### Concrete Deliverables
- `frontend/src/app/(app)/risk/assessment/page.tsx` — List page
- `frontend/src/app/(app)/risk/assessment/[id]/page.tsx` — Form page (composing 3 cards)
- `frontend/src/app/(app)/risk/assessment/components/profil-risiko-card.tsx`
- `frontend/src/app/(app)/risk/assessment/components/hasil-pemantauan-card.tsx`
- `frontend/src/app/(app)/risk/assessment/components/simpulan-card.tsx`
- `frontend/src/lib/api/risk-assessment.ts` — API client functions
- `frontend/src/lib/risk.ts` — Additional simpulan utilities
- `frontend/src/lib/app-navigation.ts` — Sidebar menu entry

### Definition of Done
- [ ] Menu "Pemantauan Risiko" visible di sidebar
- [ ] List page menampilkan risk approved dengan filter cycle/org
- [ ] Click "Assess" → creates draft clone (if not exists) → opens form
- [ ] Form menampilkan Profil Risiko read-only dari source risk
- [ ] Input probabilitas + dampak baru → auto-calculate bobot + nilai
- [ ] Simpulan auto-display: tingkat risiko change + efektifitas
- [ ] Save → updates draft risk → goes through approval workflow
- [ ] `npm run build` passes without errors

### Must Have
- Read-only Profil Risiko section (no editing current values)
- Auto-calculated bobot via BobotMatrix when prob/impact change
- Auto-calculated Simpulan comparing new nilai vs current nilai
- Cycle auto-detection (Jan-Jun=H1, Jul-Dec=H2)
- Approval workflow integration (same as risk register)

### Must NOT Have (Guardrails)
- NO new database migrations
- NO new backend endpoints — reuse existing reassess + update + list approved
- NO modifications to existing risk register form (`risk/register/new/page.tsx`)
- NO chart/visualization components in v1
- NO new shared components in `components/ui/` — use existing shadcn
- NO component files exceeding 200 lines (cards) or 300 lines (pages)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (bun test configured)
- **Automated tests**: None (per user decision)
- **Framework**: N/A

### QA Policy
Every task includes agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright — Navigate, interact, assert DOM, screenshot
- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — utilities + API client):
├── Task 1: API client functions (risk-assessment.ts) [quick]
├── Task 2: Simpulan utility functions (risk.ts additions) [quick]
└── Task 3: Cycle auto-detect utility [quick]

Wave 2 (After Wave 1 — components + list page):
├── Task 4: ProfilRisikoCard component [visual-engineering]
├── Task 5: HasilPemantauanCard component [visual-engineering]
├── Task 6: SimpulanCard component [visual-engineering]
└── Task 7: Assessment list page [visual-engineering]

Wave 3 (After Wave 2 — composition + integration):
├── Task 8: Assessment form page (composing 3 cards) [visual-engineering]
└── Task 9: Navigation + breadcrumb integration [quick]

Wave FINAL (After ALL tasks):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high + playwright)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | - | 7, 8 | 1 |
| 2 | - | 6 | 1 |
| 3 | - | 7, 8 | 1 |
| 4 | - | 8 | 2 |
| 5 | 2 | 8 | 2 |
| 6 | 2 | 8 | 2 |
| 7 | 1, 3 | 8 | 2 |
| 8 | 4, 5, 6, 7 | 9, F* | 3 |
| 9 | 8 | F* | 3 |

### Agent Dispatch Summary

- **Wave 1**: **3** — T1 `quick`, T2 `quick`, T3 `quick`
- **Wave 2**: **4** — T4 `visual-engineering`, T5 `visual-engineering`, T6 `visual-engineering`, T7 `visual-engineering`
- **Wave 3**: **2** — T8 `visual-engineering`, T9 `quick`
- **FINAL**: **4** — F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [x] 1. API Client Functions — `risk-assessment.ts`

  **What to do**:
  - Create `frontend/src/lib/api/risk-assessment.ts`
  - Function `listApprovedRisks(token, params)` — calls `GET /api/risks/trend` (existing `ListApprovedRisks` handler) with pagination + filters (org, cycle)
  - Function `createReassessmentDraft(token, riskId, cycle)` — calls `POST /api/risks/${riskId}/reassess` with `{ cycle }` body
  - Function `getRiskDetail(token, riskId)` — calls `GET /api/risks/${riskId}` (existing)
  - Function `updateRiskAssessment(token, riskId, data)` — calls `PUT /api/risks/${riskId}` with new probability/impact/weight/nilai fields
  - Function `getCurrentCycle()` — returns `YYYY-HN` format based on current date (Jan-Jun=H1, Jul-Dec=H2)
  - All functions follow exact pattern from `frontend/src/lib/api/risk-register.ts` (api.get/api.post/api.put)
  - Reuse `RiskRegisterListItem` type from `risk-register.ts` or import `Risk` from `types/risk.ts`

  **Must NOT do**:
  - Do NOT create new backend endpoints
  - Do NOT modify existing API files

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`react-expert`]
    - `react-expert`: Next.js API client patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 7, 8
  - **Blocked By**: None

  **References**:
  - `frontend/src/lib/api/risk-register.ts` — Exact pattern to follow for API client structure, `api.get/post` usage
  - `frontend/src/lib/api.ts` — Base `api` object with `get/post/put` methods
  - `backend/internal/handler/http/risk.go:527-550` — `CreateReassessment` handler expecting `{ cycle: string }` body
  - `backend/internal/handler/http/risk.go:601-640` — `ListApprovedRisks` handler query params
  - `frontend/src/types/risk.ts` — `Risk` interface for response types

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: API client module exports correctly
    Tool: Bash
    Steps:
      1. cd frontend && npx tsc --noEmit src/lib/api/risk-assessment.ts
      2. Verify no TypeScript errors
    Expected Result: Exit code 0, no error output
    Evidence: .sisyphus/evidence/task-1-typecheck.txt

  Scenario: getCurrentCycle returns correct format
    Tool: Bash
    Steps:
      1. cd frontend && node -e "const m = require('./src/lib/api/risk-assessment'); console.log(m.getCurrentCycle())"
      2. Verify output matches YYYY-HN format (e.g., "2026-H1" for Jan-Jun, "2026-H2" for Jul-Dec)
    Expected Result: Output matches /^\d{4}-H[12]$/ regex
    Evidence: .sisyphus/evidence/task-1-cycle-format.txt
  ```

  **Commit**: YES (groups with 2, 3)
  - Message: `feat(assessment): add API client and utility functions`
  - Files: `frontend/src/lib/api/risk-assessment.ts`

- [x] 2. Simpulan Utility Functions

  **What to do**:
  - Add to `frontend/src/lib/risk.ts` (do NOT create new file):
  - Function `getSimpulanTingkatRisiko(nilaiCurrent: number, nilaiBaru: number): string`
    - If nilaiBaru === nilaiCurrent → `"Tidak ada penurunan tingkat risiko"`
    - If nilaiBaru > nilaiCurrent → `"Tingkat risiko mengalami peningkatan"`
    - If nilaiBaru < nilaiCurrent → `"Tingkat risiko mengalami penurunan"`
  - Function `getSimpulanEfektifitas(nilaiCurrent: number, nilaiBaru: number): string`
    - If nilaiBaru < nilaiCurrent → `"Efektif"`
    - If nilaiBaru >= nilaiCurrent → `"Tidak Efektif"`
  - Function `getSimpulanTingkatRisikoColor(nilaiCurrent: number, nilaiBaru: number): string`
    - Returns tailwind color classes: green for penurunan, red for peningkatan, yellow for no change
  - Function `getSimpulanEfektifitasColor(nilaiCurrent: number, nilaiBaru: number): string`
    - Returns tailwind color classes: green for efektif, red for tidak efektif

  **Must NOT do**:
  - Do NOT modify existing functions in risk.ts
  - Do NOT create a separate file

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Tasks 5, 6
  - **Blocked By**: None

  **References**:
  - `frontend/src/lib/risk.ts:106-108` — `calculateNilai()` function pattern to follow
  - `frontend/src/lib/risk.ts:112-119` — `getRiskLevelFromNilai()` for level threshold reference
  - `frontend/src/lib/risk.ts:154-163` — `levelToColor()` for tailwind color class pattern

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Simpulan tingkat risiko — penurunan
    Tool: Bash
    Steps:
      1. cd frontend && node -e "const r = require('./src/lib/risk'); console.log(r.getSimpulanTingkatRisiko(17.52, 8.52))"
    Expected Result: Output: "Tingkat risiko mengalami penurunan"
    Evidence: .sisyphus/evidence/task-2-tingkat-penurunan.txt

  Scenario: Simpulan efektifitas — tidak efektif (no change)
    Tool: Bash
    Steps:
      1. cd frontend && node -e "const r = require('./src/lib/risk'); console.log(r.getSimpulanEfektifitas(17.52, 17.52))"
    Expected Result: Output: "Tidak Efektif"
    Evidence: .sisyphus/evidence/task-2-efektifitas-nochange.txt

  Scenario: Simpulan efektifitas — efektif
    Tool: Bash
    Steps:
      1. cd frontend && node -e "const r = require('./src/lib/risk'); console.log(r.getSimpulanEfektifitas(17.52, 8.52))"
    Expected Result: Output: "Efektif"
    Evidence: .sisyphus/evidence/task-2-efektifitas-efektif.txt
  ```

  **Commit**: YES (groups with 1, 3)
  - Message: `feat(assessment): add API client and utility functions`
  - Files: `frontend/src/lib/risk.ts` (additions only)

- [x] 3. Cycle Auto-Detect Utility

  **What to do**:
  - This is merged into Task 1 — `getCurrentCycle()` function in `risk-assessment.ts`
  - Logic: `const month = new Date().getMonth() + 1; const half = month <= 6 ? "H1" : "H2"; return \`${new Date().getFullYear()}-${half}\`;`
  - Also export `formatCycleLabel(cycle: string): string` — converts "2026-H1" → "Semester 1, 2026"

  **NOTE**: This task is effectively merged into Task 1. Mark as completed when Task 1 is done.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (merged into Task 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 7, 8
  - **Blocked By**: None

- [ ] 4. ProfilRisikoCard Component

  **What to do**:
  - Create `frontend/src/app/(app)/risk/assessment/components/profil-risiko-card.tsx`
  - Props: `{ risk: Risk }` (the source/current approved risk)
  - Display read-only fields in a Card:
    - Judul Risiko (`risk.title`)
    - Kode Risiko (`risk.code`)
    - Probabilitas current (`risk.probability`) with label from `PROBABILITY_LABELS`
    - Dampak current (`risk.impact`) with label from `IMPACT_LABELS`
    - Bobot (`risk.weight`)
    - Nilai (`risk.nilai`)
    - Level (`getRiskLevelFromNilai(risk.nilai)`) with `levelToColor()` badge
    - Prioritas Risiko (`risk.riskPriority` or derived from level)
    - Rencana Penanganan: display `risk.mitigations` array in a disabled/read-only list showing action, owner, dueDate, frequency. If no mitigations, show "Belum ada rencana penanganan"
    - Target Penurunan: show `risk.targetProbability`, `risk.targetImpact`, `risk.targetWeight`, `risk.targetNilai`
  - Use shadcn Card, Badge components
  - All fields are pure display — no form inputs
  - Use muted background (`bg-muted/50`) to indicate read-only
  - Max 200 lines

  **Must NOT do**:
  - Do NOT add any editable inputs
  - Do NOT create new shadcn UI components

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`react-expert`]
    - `react-expert`: React component patterns, TypeScript props

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7)
  - **Blocks**: Task 8
  - **Blocked By**: None

  **References**:
  - `frontend/src/types/risk.ts` — `Risk` interface with all fields including `mitigations`
  - `frontend/src/lib/risk.ts:49-63` — `PROBABILITY_LABELS`, `IMPACT_LABELS` for human-readable labels
  - `frontend/src/lib/risk.ts:112-119` — `getRiskLevelFromNilai()` for level calculation
  - `frontend/src/lib/risk.ts:154-163` — `levelToColor()` for badge color classes
  - `frontend/src/components/ui/card.tsx` — Card, CardHeader, CardContent, CardTitle components
  - `frontend/src/components/ui/badge.tsx` — Badge component for risk level display

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: ProfilRisikoCard renders all fields
    Tool: Playwright
    Preconditions: Navigate to assessment form for a risk with known values
    Steps:
      1. Navigate to /risk/assessment/{risk-id}
      2. Assert element `[data-testid="profil-risiko-card"]` exists
      3. Assert text contains the risk title
      4. Assert text contains the risk code
      5. Assert probability label is displayed (e.g., "Kadang-kadang" for prob 3)
      6. Assert risk level badge is visible with correct color class
      7. Assert target section shows target probability/impact/nilai
    Expected Result: All fields rendered correctly, no editable inputs in this card
    Evidence: .sisyphus/evidence/task-4-profil-card.png

  Scenario: ProfilRisikoCard with no mitigations
    Tool: Playwright
    Preconditions: Risk with empty mitigations array
    Steps:
      1. Navigate to assessment form for risk without mitigations
      2. Assert text "Belum ada rencana penanganan" is visible
    Expected Result: Graceful empty state displayed
    Evidence: .sisyphus/evidence/task-4-no-mitigations.png
  ```

  **Commit**: YES (groups with 5, 6)
  - Message: `feat(assessment): add assessment card components`
  - Files: `frontend/src/app/(app)/risk/assessment/components/profil-risiko-card.tsx`

- [ ] 5. HasilPemantauanCard Component

  **What to do**:
  - Create `frontend/src/app/(app)/risk/assessment/components/hasil-pemantauan-card.tsx`
  - Props: `{ form: UseFormReturn<AssessmentFormValues> }` — receives react-hook-form instance
  - Editable fields:
    - Skor Probabilitas Baru: Select/dropdown 1-5 with labels from `PROBABILITY_LABELS`
    - Skor Dampak Baru: Select/dropdown 1-5 with labels from `IMPACT_LABELS`
  - Auto-calculated (read-only display, updated reactively):
    - Bobot: `getBobot(newProbability, newImpact)` — displayed as read-only field
    - Nilai: `calculateNilai(newProbability, newImpact, bobot)` — displayed as read-only field
  - Use `watch()` from react-hook-form to reactively recalculate bobot + nilai when prob/impact change
  - Use shadcn Select, Card, FormField components
  - Max 200 lines

  **Must NOT do**:
  - Do NOT allow direct editing of Bobot or Nilai fields
  - Do NOT import from risk register form — create independent component

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`react-expert`]
    - `react-expert`: React Hook Form integration, watch/setValue patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Task 2 (needs getBobot, calculateNilai from risk.ts)

  **References**:
  - `frontend/src/lib/risk.ts:88-103` — `BobotMatrix` and `getBobot()` function for weight lookup
  - `frontend/src/lib/risk.ts:106-108` — `calculateNilai()` for nilai calculation
  - `frontend/src/lib/risk.ts:49-63` — `PROBABILITY_LABELS`, `IMPACT_LABELS` for dropdown options
  - `frontend/src/app/(app)/risk/register/new/page.tsx` — Reference for how probability/impact Select dropdowns are built (search for "probability" form field)
  - `frontend/src/components/ui/select.tsx` — shadcn Select component

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Auto-calculate bobot and nilai when probability/impact change
    Tool: Playwright
    Preconditions: Assessment form loaded
    Steps:
      1. Navigate to /risk/assessment/{risk-id}
      2. Select probability = 3 from `[data-testid="new-probability"]` dropdown
      3. Select impact = 4 from `[data-testid="new-impact"]` dropdown
      4. Read bobot value from `[data-testid="new-bobot"]`
      5. Read nilai value from `[data-testid="new-nilai"]`
    Expected Result: Bobot = 1.46, Nilai = 17.52 (3 × 4 × 1.46)
    Evidence: .sisyphus/evidence/task-5-auto-calc.png

  Scenario: Bobot and nilai fields are read-only
    Tool: Playwright
    Steps:
      1. Try to click/focus on `[data-testid="new-bobot"]`
      2. Verify it has `readonly` or `disabled` attribute
    Expected Result: Fields cannot be edited by user
    Evidence: .sisyphus/evidence/task-5-readonly.png
  ```

  **Commit**: YES (groups with 4, 6)
  - Message: `feat(assessment): add assessment card components`
  - Files: `frontend/src/app/(app)/risk/assessment/components/hasil-pemantauan-card.tsx`

- [ ] 6. SimpulanCard Component

  **What to do**:
  - Create `frontend/src/app/(app)/risk/assessment/components/simpulan-card.tsx`
  - Props: `{ nilaiCurrent: number; nilaiBaru: number }`
  - Auto-calculated display (no inputs):
    - Tingkat Risiko: call `getSimpulanTingkatRisiko(nilaiCurrent, nilaiBaru)` — display with color from `getSimpulanTingkatRisikoColor()`
    - Efektifitas: call `getSimpulanEfektifitas(nilaiCurrent, nilaiBaru)` — display with color from `getSimpulanEfektifitasColor()`
    - Visual comparison: show `nilaiCurrent → nilaiBaru` with arrow and color indicator (green if decreased, red if increased)
  - Also show:
    - Level lama: `getRiskLevelFromNilai(nilaiCurrent)` with badge
    - Level baru: `getRiskLevelFromNilai(nilaiBaru)` with badge
  - Use shadcn Card, Badge components
  - Max 200 lines

  **Must NOT do**:
  - Do NOT add any editable inputs
  - Do NOT over-design — keep it simple with text + badges

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`react-expert`]
    - `react-expert`: React component patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Task 2 (needs simpulan utility functions)

  **References**:
  - `frontend/src/lib/risk.ts` — `getSimpulanTingkatRisiko()`, `getSimpulanEfektifitas()` (added in Task 2)
  - `frontend/src/lib/risk.ts:112-119` — `getRiskLevelFromNilai()` for level badges
  - `frontend/src/lib/risk.ts:154-163` — `levelToColor()` for badge styling
  - `frontend/src/components/ui/badge.tsx` — Badge component

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Simpulan shows penurunan + efektif
    Tool: Playwright
    Preconditions: Assessment form with nilaiCurrent=17.52, select prob/impact that gives nilaiBaru=8.52
    Steps:
      1. Navigate to assessment form
      2. Set probability=3, impact=2 (bobot=1.42, nilai=8.52)
      3. Assert `[data-testid="simpulan-tingkat"]` contains "Tingkat risiko mengalami penurunan"
      4. Assert `[data-testid="simpulan-efektifitas"]` contains "Efektif"
      5. Assert green color indicators are present
    Expected Result: Both simpulan fields show positive results with green styling
    Evidence: .sisyphus/evidence/task-6-simpulan-penurunan.png

  Scenario: Simpulan shows peningkatan + tidak efektif
    Tool: Playwright
    Preconditions: Assessment form with nilaiCurrent=8.52, select prob/impact that gives nilaiBaru=17.52
    Steps:
      1. Set probability=3, impact=4 (bobot=1.46, nilai=17.52 > 8.52)
      2. Assert `[data-testid="simpulan-tingkat"]` contains "peningkatan"
      3. Assert `[data-testid="simpulan-efektifitas"]` contains "Tidak Efektif"
      4. Assert red color indicators
    Expected Result: Both simpulan fields show negative results with red styling
    Evidence: .sisyphus/evidence/task-6-simpulan-peningkatan.png
  ```

  **Commit**: YES (groups with 4, 5)
  - Message: `feat(assessment): add assessment card components`
  - Files: `frontend/src/app/(app)/risk/assessment/components/simpulan-card.tsx`

- [ ] 7. Assessment List Page

  **What to do**:
  - Create `frontend/src/app/(app)/risk/assessment/page.tsx`
  - "use client" page showing list of approved risks eligible for assessment
  - Features:
    - Table with columns: Kode, Judul, Organisasi, Probabilitas, Dampak, Nilai, Level, Cycle Terakhir, Action
    - Filter by assessment cycle (auto-populated with current cycle default)
    - Search by title/code
    - Pagination (reuse pattern from risk register list)
    - Action button "Assess" per row:
      1. Calls `createReassessmentDraft(token, riskId, currentCycle)` — creates draft clone if not exists
      2. On success → redirects to `/risk/assessment/${draftId}` (the new draft's ID)
      3. On error "already exists" → fetch existing draft → redirect to it
  - Use existing `listApprovedRisks()` API function from Task 1
  - Use `getCurrentCycle()` for default cycle filter
  - Max 300 lines — extract table row rendering to inline helper if needed

  **Must NOT do**:
  - Do NOT copy the entire risk register list page — build fresh, simpler
  - Do NOT add chart/visualization
  - Do NOT add bulk actions

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`react-expert`]
    - `react-expert`: Next.js App Router, data fetching patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 6)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 1, 3 (needs API client + cycle utility)

  **References**:
  - `frontend/src/app/(app)/risk/register/page.tsx:1-60` — Import pattern, hooks usage, table structure to reference (but build simpler)
  - `frontend/src/lib/api/risk-assessment.ts` — `listApprovedRisks()`, `createReassessmentDraft()`, `getCurrentCycle()` (from Task 1)
  - `frontend/src/contexts/auth-context.tsx` — `useAuth()` hook for token
  - `frontend/src/components/ui/table.tsx` — Table, TableBody, TableCell, etc.
  - `frontend/src/components/ui/select.tsx` — Select for cycle filter
  - `frontend/src/lib/risk.ts:112-119` — `getRiskLevelFromNilai()` for level badges in table

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: List page loads approved risks
    Tool: Playwright
    Preconditions: At least one approved risk exists in database
    Steps:
      1. Navigate to /risk/assessment
      2. Wait for table to load (selector: `table tbody tr`)
      3. Assert at least one row exists
      4. Assert columns contain risk code, title, and level badge
    Expected Result: Table displays approved risks with correct data
    Evidence: .sisyphus/evidence/task-7-list-page.png

  Scenario: Assess button creates draft and redirects
    Tool: Playwright
    Preconditions: Approved risk exists that hasn't been assessed in current cycle
    Steps:
      1. Navigate to /risk/assessment
      2. Click "Assess" button on first row
      3. Wait for navigation
      4. Assert URL changed to /risk/assessment/{some-uuid}
      5. Assert assessment form is loaded (profil risiko card visible)
    Expected Result: Draft created, redirected to assessment form
    Evidence: .sisyphus/evidence/task-7-assess-redirect.png

  Scenario: List page with no approved risks
    Tool: Playwright
    Steps:
      1. Navigate to /risk/assessment (with empty dataset or filter that returns 0)
      2. Assert empty state message is shown
    Expected Result: "Tidak ada risiko yang perlu dinilai" or similar message
    Evidence: .sisyphus/evidence/task-7-empty-state.png
  ```

  **Commit**: YES (groups with 8, 9)
  - Message: `feat(assessment): add list and form pages with navigation`
  - Files: `frontend/src/app/(app)/risk/assessment/page.tsx`

- [ ] 8. Assessment Form Page (Main Composition)

  **What to do**:
  - Create `frontend/src/app/(app)/risk/assessment/[id]/page.tsx`
  - "use client" page that composes the 3 card components
  - On load:
    1. Fetch risk detail via `getRiskDetail(token, riskId)` — this is the DRAFT risk (created by reassessment)
    2. Also fetch the SOURCE risk (the approved risk it was cloned from) via `getRiskDetail(token, risk.previousRiskId)` — this provides the "current" values for Profil Risiko
    3. Initialize react-hook-form with Zod schema: `{ probability: z.number().min(1).max(5), impact: z.number().min(1).max(5) }`
    4. Pre-fill form with draft's existing probability/impact (since draft clones source values)
  - Layout:
    ```
    Page Header: "Assessment Risiko: {title} — Cycle {assessmentCycle}"
    <ProfilRisikoCard risk={sourceRisk} />
    <HasilPemantauanCard form={form} />
    <SimpulanCard nilaiCurrent={sourceRisk.nilai} nilaiBaru={calculatedNilaiBaru} />
    Button: "Simpan Assessment" → calls `updateRiskAssessment(token, draftId, { probability, impact, weight, nilai })`
    ```
  - On save success: toast "Assessment berhasil disimpan" + redirect to `/risk/assessment`
  - Watch probability + impact to reactively calculate nilaiBaru for SimpulanCard
  - Also add fields for `changeReason` (textarea) and `reviewSummary` (textarea) — these exist in the DB schema
  - Max 300 lines

  **Must NOT do**:
  - Do NOT include full risk register form fields (no causes, mitigations editing, etc.)
  - Do NOT skip the source risk fetch — Profil Risiko needs the APPROVED version, not the draft

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`react-expert`]
    - `react-expert`: React Hook Form + Zod, composition patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential after Wave 2)
  - **Blocks**: Task 9, F*
  - **Blocked By**: Tasks 4, 5, 6, 7

  **References**:
  - `frontend/src/app/(app)/risk/assessment/components/profil-risiko-card.tsx` — Task 4 output
  - `frontend/src/app/(app)/risk/assessment/components/hasil-pemantauan-card.tsx` — Task 5 output
  - `frontend/src/app/(app)/risk/assessment/components/simpulan-card.tsx` — Task 6 output
  - `frontend/src/lib/api/risk-assessment.ts` — API functions (Task 1)
  - `frontend/src/lib/risk.ts:98-108` — `getBobot()`, `calculateNilai()` for reactive calculation
  - `frontend/src/app/(app)/risk/register/new/page.tsx` — Reference for react-hook-form + Zod setup pattern (DO NOT copy the full form, just the setup pattern)
  - `backend/internal/usecase/risk/reassess.go:101-127` — `BuildPeriodicReassessmentDraft` to understand what fields the draft has (it's a full clone)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Full assessment flow — happy path
    Tool: Playwright
    Preconditions: Draft risk exists from list page "Assess" action
    Steps:
      1. Navigate to /risk/assessment/{draft-id}
      2. Assert `[data-testid="profil-risiko-card"]` shows source risk values
      3. Select probability = 2 from `[data-testid="new-probability"]`
      4. Select impact = 2 from `[data-testid="new-impact"]`
      5. Assert `[data-testid="new-bobot"]` shows 1.8
      6. Assert `[data-testid="new-nilai"]` shows 7.2
      7. Assert `[data-testid="simpulan-tingkat"]` contains "penurunan" (assuming source nilai > 7.2)
      8. Assert `[data-testid="simpulan-efektifitas"]` contains "Efektif"
      9. Fill `[data-testid="change-reason"]` with "Penurunan risiko setelah implementasi kontrol"
      10. Click `[data-testid="save-assessment"]` button
      11. Wait for navigation to /risk/assessment
      12. Assert success toast appears
    Expected Result: Assessment saved, redirected to list with success message
    Evidence: .sisyphus/evidence/task-8-full-flow.png

  Scenario: Form validation — no probability/impact selected
    Tool: Playwright
    Steps:
      1. Navigate to assessment form
      2. Clear probability and impact fields
      3. Click save button
      4. Assert validation error messages appear
    Expected Result: Form shows validation errors, does not submit
    Evidence: .sisyphus/evidence/task-8-validation-error.png
  ```

  **Commit**: YES (groups with 7, 9)
  - Message: `feat(assessment): add list and form pages with navigation`
  - Files: `frontend/src/app/(app)/risk/assessment/[id]/page.tsx`

- [ ] 9. Navigation & Breadcrumb Integration

  **What to do**:
  - Edit `frontend/src/lib/app-navigation.ts`:
    - Add to `mainMenuItems[0].items` (MAIN MENU group), after "Risk Register" item:
      ```typescript
      { label: "Pemantauan Risiko", href: "/risk/assessment", icon: "ClipboardCheck" }
      ```
      Note: Use "Activity" or "ClipboardCheck" icon — check which lucide icons are already imported in the sidebar
    - Add to `breadcrumbMap`:
      ```typescript
      "/risk/assessment": "Pemantauan Risiko",
      "/risk/assessment/new": "Assessment Risiko",
      ```
  - Verify the icon name exists in lucide-react (check existing icons in sidebar for pattern)

  **Must NOT do**:
  - Do NOT reorganize existing menu items
  - Do NOT add sub-menus or nested navigation

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after Task 8 to verify navigation works end-to-end)
  - **Blocks**: F*
  - **Blocked By**: Task 8

  **References**:
  - `frontend/src/lib/app-navigation.ts:13-36` — Exact structure of `mainMenuItems` array
  - `frontend/src/lib/app-navigation.ts:51-87` — `breadcrumbMap` for route → label mapping
  - `frontend/src/components/app-sidebar.tsx` — How icons are resolved from string names (check icon mapping)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Sidebar shows Pemantauan Risiko menu
    Tool: Playwright
    Steps:
      1. Navigate to /overview (dashboard)
      2. Assert sidebar contains link with text "Pemantauan Risiko"
      3. Assert link href is "/risk/assessment"
      4. Click the link
      5. Assert URL is /risk/assessment
      6. Assert assessment list page loads
    Expected Result: Menu item visible, clickable, navigates correctly
    Evidence: .sisyphus/evidence/task-9-sidebar-menu.png

  Scenario: Breadcrumb shows correct label
    Tool: Playwright
    Steps:
      1. Navigate to /risk/assessment
      2. Assert breadcrumb contains "Pemantauan Risiko"
    Expected Result: Breadcrumb displays correct label
    Evidence: .sisyphus/evidence/task-9-breadcrumb.png
  ```

  **Commit**: YES (groups with 7, 8)
  - Message: `feat(assessment): add list and form pages with navigation`
  - Files: `frontend/src/lib/app-navigation.ts`

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `npm run build` in frontend. Review all new/changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names. Verify each component ≤200 lines, pages ≤300 lines.
  Output: `Build [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (navigate from sidebar → list → assess → form → save → back to list). Test edge cases: empty mitigations, no change in scores. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1. Check "Must NOT do" compliance: no changes to `risk/register/new/page.tsx`, no new migrations, no new backend endpoints. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | VERDICT`

---

## Commit Strategy

| Commit | Message | Files | Pre-commit |
|--------|---------|-------|------------|
| 1 | `feat(assessment): add API client and utility functions` | `lib/api/risk-assessment.ts`, `lib/risk.ts` additions | `npm run build` |
| 2 | `feat(assessment): add assessment card components` | `risk/assessment/components/*.tsx` | `npm run build` |
| 3 | `feat(assessment): add list and form pages with navigation` | `risk/assessment/page.tsx`, `risk/assessment/[id]/page.tsx`, `lib/app-navigation.ts` | `npm run build` |

---

## Success Criteria

### Verification Commands
```bash
cd frontend && npm run build  # Expected: Build succeeds, 0 errors
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] `npm run build` passes
- [ ] All QA scenarios pass with evidence
