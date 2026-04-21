# Fix: Heatmap Compare Multi-Fase menampilkan semua angka 0

## TL;DR

> **Quick Summary**: Frontend komponen `MultiPhaseHeatmapCompareCard` salah mengakses response dari `api.get`. Helper `api.ts` sudah auto-unwrap envelope `{ data: ... }`, tapi komponen masih akses `response.data?.initial` → selalu undefined → fallback ke `emptyHeatmap` (semua nol).
>
> **Deliverables**:
> - Perbaikan akses response di `multi-phase-heatmap-compare.tsx`
> - Update type definition agar sesuai auto-unwrap behavior
>
> **Estimated Effort**: Quick (1 file, ~10 lines)
> **Parallel Execution**: NO - single task
> **Critical Path**: Task 1 only

---

## Context

### Original Request
User reported: "angkanya belum muncul di pada komponen heatmap terbarunya sepertinya, tolong dicek"
(Numbers haven't appeared in the new heatmap component.)

### Root Cause Analysis

**File**: `frontend/src/lib/api.ts` lines 53-56
```typescript
// Auto-unwrap { data: ... } envelope from standardized API responses
if (json && typeof json === "object" && "data" in json && Object.keys(json).length === 1) {
  return json.data as T;
}
```

**File**: `frontend/src/app/(app)/compliance/_components/multi-phase-heatmap-compare.tsx` lines 25-27
```typescript
interface MultiPhaseHeatmapResponse {
  data: Record<PhaseKey, number[][]>;  // ← expects wrapped envelope
}
```

**File**: same, lines 76-86
```typescript
const response = await api.get<MultiPhaseHeatmapResponse>(...);
setData({
  initial: response.data?.initial ?? emptyHeatmap,  // ← response.data is undefined!
  ...
});
```

**Backend** at `handler/http/risk.go:812` returns:
```go
return c.JSON(fiber.Map{"data": data})  // { "data": {...} }
```

**Flow**:
1. Backend returns `{ "data": { "initial": [...], "semester1": [...], ... } }`
2. `api.ts` detects single-key `data` envelope → unwraps → returns `{ "initial": [...], ... }` directly
3. Component accesses `response.data?.initial` — but `response.data` is `undefined` because `response` IS the inner object
4. Every matrix falls back to `emptyHeatmap` = `Array(5).fill(Array(5).fill(0))`
5. All 25 cells per heatmap show `0` (or empty string in `riskLevel` mode)

**Evidence of similar pattern (correct usage) in codebase**: Other components using `api.get` directly return unwrapped data — search for `api.get<` shows consistent pattern.

---

## Work Objectives

### Core Objective
Display actual risk distribution numbers across 4 phases (Skor Awal, Semester 1, Semester 2, Target Skor) instead of all zeros.

### Concrete Deliverables
- Updated `multi-phase-heatmap-compare.tsx` with correct response type and access pattern

### Definition of Done
- [ ] Heatmap cells display actual numbers from DB (not all zeros)
- [ ] TypeScript compiles without errors (`tsc --noEmit`)
- [ ] No lint warnings in changed file

### Must Have
- Response type matches `api.ts` auto-unwrap behavior
- All 4 phases populate with real data
- Graceful fallback if any phase missing from response

### Must NOT Have (Guardrails)
- DO NOT modify `api.ts` (would break other components)
- DO NOT modify backend response shape (`{ "data": {...} }` is standard envelope)
- DO NOT remove null-safe `??` fallbacks
- DO NOT touch any other component

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (vitest/jest likely, but not required for this trivial fix)
- **Automated tests**: NO (UI data-binding fix, verified via live render)
- **Framework**: n/a

### QA Policy
Agent-executed QA via Playwright after servers run (OR manual inspection of code diff).

---

## Execution Strategy

Single task, single file. No parallelization needed.

### Agent Dispatch Summary

- **Wave 1**: 1 task — T1 → `quick` (simple type + property access fix)

---

## TODOs

- [ ] 1. Fix response access in MultiPhaseHeatmapCompareCard

  **What to do**:
  - Open `frontend/src/app/(app)/compliance/_components/multi-phase-heatmap-compare.tsx`
  - Replace the `MultiPhaseHeatmapResponse` interface with a type alias that reflects auto-unwrap:
    ```typescript
    // NOTE: `api.get` auto-unwraps the `{ data: ... }` envelope,
    // so the helper returns the inner object directly.
    type MultiPhaseHeatmapResponse = Record<PhaseKey, number[][]>;
    ```
  - Update the `setData` call inside `loadData` to access properties directly on `response` (no `.data`):
    ```typescript
    const response = await api.get<MultiPhaseHeatmapResponse>(
      `/dashboard/heatmap-multi?year=${year}`,
      token
    );
    setData({
      initial: response?.initial ?? emptyHeatmap,
      semester1: response?.semester1 ?? emptyHeatmap,
      semester2: response?.semester2 ?? emptyHeatmap,
      target: response?.target ?? emptyHeatmap,
    });
    ```
  - Verify no other changes needed — the render logic (lines 150-181) is correct.

  **Must NOT do**:
  - Modify `frontend/src/lib/api.ts`
  - Modify backend handler `HeatmapMulti` or usecase
  - Refactor unrelated code in the file
  - Add new features or change visual design

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, ~10 line change, mechanical type + property access fix
  - **Skills**: []
    - No specialized skills needed — trivial TypeScript adjustment
  - **Skills Evaluated but Omitted**:
    - `react-expert`: Not needed — no React-specific patterns involved
    - `vercel-react-best-practices`: Not needed — no performance concern

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (only task)
  - **Blocks**: F1 final verification
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `frontend/src/lib/api.ts:53-56` — The auto-unwrap logic that mandates this fix pattern
  - `frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx` (existing heatmap compare card) — Uses `api.get` directly without `.data` access; follow the same pattern

  **API/Type References**:
  - Backend response at `backend/internal/handler/http/risk.go:812` returns `fiber.Map{"data": data}` — confirms single-key envelope that api.ts auto-unwraps

  **WHY Each Reference Matters**:
  - `api.ts:53-56` proves the envelope is unwrapped BEFORE the component sees it — so component must NOT expect `.data`
  - `risk-review-panel.tsx` existing heatmap follows the correct pattern — copy the access style

  **Acceptance Criteria**:

  **Build verification**:
  - [ ] `cd frontend && npx tsc --noEmit` → exit 0, no errors
  - [ ] `cd frontend && npm run lint` → no new warnings in changed file

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Heatmap renders real numbers after data loads
    Tool: Playwright (or manual inspection if servers unavailable)
    Preconditions: Backend running :8080, frontend :3000, user logged in, DB has risks for current year with cycle='initial'|'semester_1'|'semester_2' and target_probability/impact populated
    Steps:
      1. Navigate to http://localhost:3000/compliance/monitoring
      2. Scroll to "Heatmap Compare Multi-Fase" card
      3. Wait for data load (spinner disappears, opacity back to 100%)
      4. Inspect each of 4 heatmaps (Skor Awal, Semester 1, Semester 2, Target Skor)
      5. Assert: at least one heatmap shows at least one non-zero cell (indicating real data)
      6. Assert: all 25 cells per heatmap are rendered (5×5 grid)
      7. Toggle mode to "Intensitas" — all cells show numeric value
      8. Toggle mode to "Level Risiko" — non-zero cells show number, zero cells show empty string
    Expected Result: Numbers displayed match DB counts per (probability, impact) cell per phase
    Failure Indicators: All cells show "0" (old bug) OR empty cells in Intensitas mode OR network error in console
    Evidence: .sisyphus/evidence/fix-heatmap-multi-happy.png

  Scenario: Network error gracefully handled
    Tool: Playwright (or DevTools manual)
    Preconditions: Backend stopped OR invalid token
    Steps:
      1. Navigate to /compliance/monitoring
      2. Observe card behavior
    Expected Result: Error message "Gagal memuat data heatmap." shown in subtitle area; all heatmaps show zeros (emptyHeatmap fallback); no crash
    Evidence: .sisyphus/evidence/fix-heatmap-multi-error.png
  ```

  **Evidence to Capture**:
  - [ ] Screenshot showing non-zero cell counts in at least one phase
  - [ ] Screenshot showing graceful error state (optional)
  - [ ] `tsc --noEmit` output showing clean compile

  **Commit**: YES (standalone fix)
  - Message: `fix(dashboard): unwrap heatmap-multi response envelope correctly`
  - Body:
    ```
    api.ts auto-unwraps { data: ... } envelope before returning from
    api.get, but MultiPhaseHeatmapCompareCard was still accessing
    response.data.* — causing every cell to fall back to 0.

    Align the response type with the actual unwrapped shape.
    ```
  - Files: `frontend/src/app/(app)/compliance/_components/multi-phase-heatmap-compare.tsx`
  - Pre-commit: `cd frontend && npx tsc --noEmit`

---

## Final Verification Wave

- [ ] F1. **Scope + Code Quality Review** — `unspecified-high`
  Read the diff for `multi-phase-heatmap-compare.tsx`. Verify:
  - Only the type definition and response access are changed
  - No modifications to api.ts, backend, or any other file
  - `tsc --noEmit` passes
  - `npm run lint` passes with no new warnings in changed file
  - Existing render logic unchanged
  Output: `Scope [CLEAN/N issues] | tsc [PASS/FAIL] | lint [PASS/FAIL] | VERDICT`

---

## Commit Strategy

- **1**: `fix(dashboard): unwrap heatmap-multi response envelope correctly`
  - Pre-commit: `cd frontend && npx tsc --noEmit`

---

## Success Criteria

### Verification Commands
```bash
cd frontend && npx tsc --noEmit       # Expected: no errors
cd frontend && npm run lint           # Expected: no new warnings
```

### Final Checklist
- [ ] Response type aligns with api.ts auto-unwrap behavior
- [ ] All 4 phases access properties without `.data` prefix
- [ ] `tsc --noEmit` passes
- [ ] Committed with clean message
- [ ] F1 verification APPROVE
