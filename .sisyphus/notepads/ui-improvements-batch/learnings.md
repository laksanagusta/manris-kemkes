## F3 QA: Visual Verification Learnings (2026-04-15)

### Version History Sheet
- The Version History Sheet trigger is a **ghost icon button** (History icon) in the form header, ref=e158
- It only appears when editing an existing risk (when `riskId` is truthy)
- The "Lihat riwayat →" link in review-side-panel.tsx is a **different feature** — navigates to Activity tab

### Collapsible Component
- Uses shadcn Collapsible with `data-state` attribute (`open`/`closed`) and `aria-expanded`
- Smooth animation built-in via Radix primitives

### Search Patterns
- Inbox: `?search=` query param
- Risk Register / Working Papers: `?q=` query param
- All use `useDeferredValue` for debounced URL updates

### XSS Resilience
- Special characters in search inputs are properly URL-encoded
- No crash or script execution — React/Next.js handles encoding correctly

---



### Key Discoveries (from Planning Phase)
- Backend risk-categories API already returns severity breakdown — NO backend change for T9
- Codebase uses `useDeferredValue` (React 18) not `useDebounce` — found in 7 files
- Controls page search is completely broken — NO onChange handler
- Collapsible component not installed — must run shadcn add
- Risk form has 3 user fetch functions: loadReviewerOptions, loadApproverOptions, loadPicOptions
- Risk level label is `ekstrem` (not `sangat_tinggi`)
- MitigationTask entity has Status (pending/done/overdue/skipped) + PeriodLabel

### Design Constraints
- "komponennya kalau bisa komponen dan desainnya konsisten dengan yang sudah ada aja ya supaya familiar"
- Use existing shadcn/ui components, existing color palette, existing patterns

## Wave 1: TableCell Font Sizing (text-xs → text-sm)

### Task: Unify Admin Tables Font Size
- Changed all `<TableCell>` elements using `text-xs` to `text-sm` in:
  1. `frontend/src/app/(app)/admin/organizations/page.tsx` (2 instances, lines 152, 157)
  2. `frontend/src/app/(app)/admin/users/page.tsx` (5 instances, lines 474, 477, 492, 495, 498)

### Pattern Found
- Organization table: `<TableCell className="text-xs text-muted-foreground">` → `text-sm`
- User table: Multiple cells with `text-xs` in mixed contexts (font-mono, simple text, max-width constraints)
- TableHead elements already use `text-xs` (left unchanged per spec)

### Verification
- ✅ Frontend build passes (3.7s, Turbopack, 0 errors)
- ✅ All 7 cells converted consistently
- ✅ No structural changes, only typography

### Design Rationale
- Matches risk register table style (`text-sm` for body content)
- "konsisten dengan yang sudah ada" — consistency achieved
- Improves readability in admin tables without redesign


## Wave 1a: Collapsible Component + Controls Page Search Fix (Task 1)

### Completed Tasks
1. ✅ Installed Collapsible component via `npx shadcn@latest add collapsible`
   - File created: `frontend/src/components/ui/collapsible.tsx` (795 bytes)
   - Ready for use in Task 8 (collapsible wrapper for controls)

2. ✅ Fixed broken search input on Controls page
   - **Problem**: Input at line 76 had NO `onChange` handler — search text couldn't update state
   - **Solution**: 
     - Added `search` state: `const [search, setSearch] = useState("")`
     - Applied reference pattern from `admin/organizations/page.tsx:414-422`
     - Added onChange: `onChange={(event) => setSearch(event.target.value)}`
   - **File**: `frontend/src/app/(app)/compliance/controls/page.tsx`

### Pattern Applied
```typescript
// Reference (organizations page line 417-419):
onChange={(event) => {
  setSearch(event.target.value);
  setPage(1);  // Reset to page 1 on search
}}

// Controls page (simplified, no pagination yet):
onChange={(event) => setSearch(event.target.value)}
```

### Verification
- ✅ TypeScript: Zero errors in Controls page
- ✅ Build: `npm run build` passes (no errors)
- ✅ State binding: search input now responds to typed text
- ✅ Search state exists for use in filtering (Task 6)

### Notes for Next Tasks
- Search state created but filtering logic NOT implemented (that's Task 6: standardization)
- Collapsible component ready for wrapper implementation (Task 8)
- Controls page follows same search input pattern as organizations page (consistency achieved)

## Wave 1: Remove hover:underline from Risk Title Links

### Completed - All risk title links in table cells updated

**Files Modified (6 files, 6 instances removed):**
1. `/frontend/src/app/(app)/risk/register/page.tsx` - Lines 939 & 1120
   - All Risks table (line 939)
   - My Drafts table (line 1120)

2. `/frontend/src/app/(app)/incidents/page.tsx` - Line 283
   - Incidents table risk title link

3. `/frontend/src/app/(app)/risk/working-papers/page.tsx` - Line 537
   - Working Papers table title link

4. `/frontend/src/app/(app)/inbox/page.tsx` - Line 714
   - Approval/Inbox table entity link (includes risks)

5. `/frontend/src/app/(app)/minutes/page.tsx` - Line 317
   - Meeting Minutes table title link

**Change Pattern:**
- Removed `hover:underline` from `className`
- Preserved `hover:text-primary/80` and other hover effects
- Kept `text-primary transition-colors` base styles
- Build verified: `npm run build` passes with zero errors ✓

**Remaining hover:underline instances (NOT removed - not in scope):**
- `src/app/(app)/admin/forms/[id]/responses/page.tsx:178` - Non-table link
- `src/app/(app)/admin/forms/[id]/analytics/page.tsx:325` - Non-table link
- `src/app/(app)/reports/page.tsx:920` - Non-table link

These are correctly kept as they're not risk title links in table cells.

## Wave 1: Unify Mitigation Monitoring Table Font Size (text-xs → text-sm)

### Task: Font Size Consistency in Compliance Monitoring Panel
**File**: `frontend/src/app/(app)/compliance/_components/mitigation-monitoring-panel.tsx`
**Lines**: 290-418 (entire mitigation table section)

### Changes Applied
All `text-xs` instances changed to `text-sm` in the table header and body:

**TableHead (8 instances, lines 293-300):**
- Kode, Rencana Mitigasi, Unit/PIC, Jatuh Tempo, Hari, Status, Eskalasi, Aksi

**TableCell (9 instances, lines 330-407):**
- Risk code (line 330): `text-sm font-mono`
- Mitigation action (line 334): `text-sm font-medium`
- Unit/PIC (line 340): `text-sm` for unit name
- Due date (line 344): `text-sm text-muted-foreground`
- Days overdue (line 350): `text-sm font-bold`
- Status button (disabled) (line 391): `text-sm`
- Status button (active) (line 407): `text-sm`
- Status "Selesai" (line 381): `text-sm text-success`

### NOT Changed (correctly left as-is per spec)
- TableCell for Badge components (lines 360, 370) — already use `text-[10px]` for badge text
- TooltipContent (line 397) — kept as `text-xs` (not table body, internal component)
- Pagination text (line 421) — kept as `text-xs` (outside 290-418 range, footer)

### Verification
- ✅ Build passes: `npm run build` completes in 3.7s, Turbopack, 0 errors
- ✅ All 17 text-xs→text-sm conversions verified in output
- ✅ File structure intact, no regex errors
- ✅ Consistent with Risk Register table styling (text-sm for body content)

### Design Rationale
- "konsisten dengan yang sudah ada" — matches risk register table font size
- Improves readability of mitigation status dashboard
- Single consistent font tier for table body content across Manris

## Task 13: OrganizationID Filter - Backend User List

**Status**: ✅ COMPLETE

### Changes Made
1. **backend/internal/repository/postgres/user.go** (ListWithFilter):
   - Added OrganizationID filter using same pattern as Status/Role filters
   - Uses parameterized query with $N placeholder to prevent SQL injection
   - Conditionally appends WHERE clause only when filter.OrganizationID != ""

2. **backend/internal/handler/http/user.go** (ListUsers):
   - Parses `organizationId` query parameter from request
   - Validates UUID format with uuid.Parse() - returns 400 Bad Request if invalid
   - Passes organizationId to usecase

3. **backend/internal/usecase/user/basic.go** (ListUsersWithFilterInput):
   - Added OrganizationID string field to input struct
   - Updated Execute() to pass field through to repository layer

### Pattern Used
- Followed existing filter implementation (Q, Status, Role)
- Parameter counting with argIdx increments correctly
- Conditional WHERE clause with nil checks (treats empty string as no filter)
- SQL: `u.organization_id = $N` with parameterized values

### Verification
✅ go build ./... - succeeds
✅ go vet ./... - no issues
✅ Backward compatible - when organizationId is not provided, all users returned

### Query Behavior
- `GET /api/users?organizationId=<uuid>` → filters to org only
- `GET /api/users` → returns all users (no filter applied)
- Invalid UUID format → 400 Bad Request response


## Task 6: Standardize useDeferredValue on Search Inputs

### Changes Made
**File**: `frontend/src/app/(app)/compliance/controls/page.tsx`
- Added `useDeferredValue` and `useMemo` imports
- Added `const deferredSearch = useDeferredValue(search)` following canonical pattern from organizations/page.tsx:208
- Added `filteredControls` memo that filters by name, description, and owner fields
- Replaced `controls.map` → `filteredControls.map` and `controls.length` → `filteredControls.length` in render

### Audit Results (8 files total with useDeferredValue)
| File | Status | Variable |
|------|--------|----------|
| admin/organizations/page.tsx | ✅ Already had | `deferredSearch` |
| admin/users/page.tsx | ✅ Already had | `deferredSearch` |
| compliance/controls/page.tsx | ✅ Added | `deferredSearch` |
| compliance/_components/risk-review-panel.tsx | ✅ Already had | `deferredSearch` |
| risk/register/page.tsx | ✅ Already had | `deferredSearch` |
| risk/working-papers/page.tsx | ✅ Already had | `deferredSearch` |
| components/risk/remote-user-picker.tsx | ✅ Already had | `deferredQuery` (with .trim()) |
| incidents/new/page.tsx | ✅ Already had | `deferredRiskSearch`, `deferredManualRiskSearch` |

### Notes
- No `useDebounce` hook exists anywhere in codebase — clean standardization
- Controls page does client-side filtering (all data fetched at once, no pagination params)
- Used `useMemo` for the filtering to avoid re-computing on every render
- Build passes, commit: `4a517de`

## Task T10: Replace Incident Chart with Progress Mitigasi

### Changes Made
**File**: `frontend/src/app/(app)/overview/page.tsx`

1. **Card title**: "Incident vs Mitigation Closure" → "Progress Mitigasi"
2. **Description**: Updated to "Distribusi mitigasi selesai dan overdue per bulan"
3. **Chart type**: `ComposedChart` → `BarChart` (simpler, no Line needed)
4. **Bars**: Removed `incidentsCreated` bar, kept:
   - `mitigationsCompleted` → green `oklch(0.72 0.17 155)` "Mitigasi Selesai"
   - `overdueMitigations` → red `oklch(0.62 0.22 27)` "Overdue"
5. **Added Legend** to the new BarChart (wasn't on ComposedChart before)
6. **Summary boxes**: Changed from (Insiden, Closed, Overdue) to (Total Mitigasi, Selesai, Overdue)
   - "Total Mitigasi" = sum of mitigationsCompleted + overdueMitigations
7. **Empty state**: Updated text to "Data progress mitigasi belum tersedia untuk periode ini"
8. **Removed unused imports**: `ComposedChart` and `Line` (only used in this chart)

### Key Decisions
- Kept 3 summary boxes (Total, Selesai, Overdue) for visual balance with existing grid-cols-3
- Added Legend component for clarity since both bars are now mitigation-related
- `DashboardActionPressurePoint` type NOT modified — still has `incidentsCreated` field (just unused in render)
- Reused exact same `actionPressureData` state and API fetch — zero backend changes

### Verification
- ✅ `npm run build` passes (4.2s, Turbopack, 0 errors)
- ✅ No unused imports
- ✅ No incident references remaining in the chart section

## Task T10: Heatmap Color Intensity Gradient

### Changes Made
**File**: `frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx`

Added `getHeatmapCellClass(count: number)` helper function (line 150) that returns intensity-based Tailwind classes:
- Count 0: `border-border bg-muted/20 text-muted-foreground` (unchanged, faint/empty)
- Count 1-2: `border-primary/20 bg-primary/15 text-foreground` (light)
- Count 3-5: `border-primary/30 bg-primary/30 text-foreground` (medium)
- Count 6+: `border-primary/40 bg-primary/50 font-bold text-foreground` (strong)

Replaced binary `count > 0 ? ... : ...` with `getHeatmapCellClass(count)` call. Applies to both `previousHeatmapGrid` and `currentHeatmapGrid` since they share the same `.map()` render.

### Pattern
- 4 visual intensity levels (0, 1-2, 3-5, 6+) using primary color with increasing Tailwind opacity fractions
- Helper placed next to `buildHeatmapGrid` for logical grouping
- High-count cells get `font-bold` for added emphasis
- No inline styles — pure Tailwind class approach with `cn()` utility

### Verification
- ✅ `npm run build` passes (0 errors, Turbopack 4.5s)
- ✅ LSP diagnostics: clean
- ✅ No changes outside heatmap section
