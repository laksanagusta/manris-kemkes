## Initial Context
- Plan: risk-assessment-separation
- Started: 2026-04-16

## Wave 1: Simpulan Functions Addition
- **File modified**: `frontend/src/lib/risk.ts` (270 → 293 lines)
- **Functions added** (lines 273-292):
  - `getSimpulanTingkatRisiko()` (273-277): Compares risk levels, returns text conclusion
  - `getSimpulanEfektifitas()` (279-282): Evaluates mitigation effectiveness
  - `getSimpulanTingkatRisikoColor()` (284-288): Returns TailwindCSS classes for risk comparison
  - `getSimpulanEfektifitasColor()` (290-292): Returns TailwindCSS classes for effectiveness
- **Pattern match**: Functions use same structure as `levelToColor()` (154-163) with conditional color returns
- **TypeScript validation**: ✅ No compilation errors

## Task 1: Create risk-assessment.ts API Client

### Completed
- Created `frontend/src/lib/api/risk-assessment.ts` with 6 exported functions:
  - `getCurrentCycle()` - Returns "YYYY-HN" format (H1: Jan-Jun, H2: Jul-Dec)
  - `formatCycleLabel(cycle)` - Converts "2026-H1" → "Semester 1, 2026"
  - `listApprovedRisks(token, params)` - GET /api/risks/approved with pagination/filters
  - `createReassessmentDraft(token, riskId, cycle)` - POST /api/risks/:id/reassess
  - `getRiskDetail(token, riskId)` - GET /api/risks/:id
  - `updateRiskAssessment(token, riskId, data)` - PUT /api/risks/:id

### Pattern Applied
- Followed exact pattern from `risk-register.ts`:
  - URLSearchParams for query string building
  - Conditional parameter setting
  - Generic type parameters for api.get/post/put
- Imported from `@/lib/api` and `@/types/risk`
- Exported interfaces for params (ListApprovedRisksParams, RiskAssessmentUpdateData)

### TypeScript Validation
- No compilation errors (ran `tsc --noEmit`)
- Full type safety with Risk interface from types
- All functions properly typed

### Code Quality
- No docstrings (matches codebase style in risk-register.ts)
- Self-documenting function names
- Consistent formatting with existing API client patterns

### Profil Risiko Card
- Created a pure display component for current risk profile
- Verified that `risk.mitigation` is an object, accessed its `action`, `owner`, `dueDate`, and `frequency` properties directly rather than mapping through an array
- Utilized the `getRiskLevelFromNilai` and `levelToColor` utilities to correctly badge the risk level based on its calculated `nilai`
- The component explicitly uses `data-testid="profil-risiko-card"` for testing assertions
- Avoided the use of `'use client'` since it's a completely static, prop-based render

### Task 4 - Simpulan Card
- Created `simpulan-card.tsx` as a purely visual, read-only UI component representing the output/conclusion of the risk assessment process.
- Designed it to encapsulate all risk-level rendering using the central utility functions from `risk.ts`, which enforces the SSOT for display rules (like colors and messaging).
- Implemented edge-case handling when users haven't yet filled out both probability and impact (`!nilaiBaru || isNaN(nilaiBaru)`) gracefully showing a muted placeholder card to instruct them.

## Risk Assessment List Page (Separation Task)
- We successfully created the `risk/assessment` list page independent from `risk/register`.
- Reused `listApprovedRisks` and `createReassessmentDraft` from `@/lib/api/risk-assessment` to fetch active risks and spawn assessment drafts.
- This creates a simpler, more focused UI specifically for the assessment cycle flow rather than general risk register operations.

### Task 3: Hasil Pemantauan Card
- Built `HasilPemantauanCard` to be completely controlled by `react-hook-form` passed down as `form` prop.
- Extracted `AssessmentFormValues` interface to be imported by the parent `page.tsx` wrapper later.
- Real-time `watch()` usage coupled with `useMemo` calculation ensures `Bobot` and `Nilai` update instantaneously without tracking local `useState` or causing side-effects.
- Utilized `shadcn`'s standard form controller components for `Select`. It works flawlessly when we use `react-hook-form` `Controller` inside.

## Navigation Structure Update
- Added "Pemantauan Risiko" menu item after "Risk Register" with icon "Activity"
- Used `matchHrefs` pattern for route highlighting
- Added breadcrumb entry for `/risk/assessment` route
- Build passed with no TypeScript errors
- Icon choice: Used "Activity" instead of "ClipboardCheck" (already used by Monitoring)

### Page Creation (`page.tsx`)
- The page was created at `frontend/src/app/(app)/risk/assessment/[id]/page.tsx`
- We fetch both the draft (using the `id` param) and the source risk (using the draft's `previousRiskId`).
- `sourceRisk` is passed to the read-only `ProfilRisikoCard`.
- We use `useForm<AssessmentFormValues>` with `zodResolver` to bind the form, passing the `form` instance to `HasilPemantauanCard`.
- Values are watched to compute `nilai` and `bobot` for the `SimpulanCard` using `getBobot` and `calculateNilai` from `@/lib/risk`.
- Form submission sends back `probability`, `impact`, `weight` (computed), `nilai` (computed), `change_reason`, and `review_summary` to the `updateRiskAssessment` API function.
- The `Risk` type has `riskCode` and `code` instead of `kodeRisiko`, and `title` instead of `pernyataanRisiko`.
