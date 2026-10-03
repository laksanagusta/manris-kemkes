# Table redesign review — 3 October 2026

Mode: **full**. Scope: all application HTML tables using the shared Table primitives, the collection toolbar/card composition, and the design-system catalogue. Framework: Next.js 16, React 19, Tailwind v4 and the existing shadcn data slots. Styling remains in the existing global CSS/Tailwind system; registry primitives were not modified. PDF/Excel exports are outside this UI request.

The reference is implemented at the application's native 14px type scale. It supplies the panel, header, spacing, horizontal dividers and compact badge treatment. Domain columns, risk colors, filters and metadata are retained. This is not a verified pixel-for-pixel match for every application screen.

| Category | Evidence inspected | Result |
| --- | --- | --- |
| Typography | Shared CSS; all title-inset consumers listed below; rendered catalogue and Register Risiko | 14px headers/body, regular body weight, tabular numerals; oversized title insets removed |
| Surfaces | CollectionTableCard, CollectionToolbar, Table data slots; desktop catalogue/Register; 390px mobile DOM geometry | Connected 12px panel, 36px header, minimum 56px rows, horizontal dividers, pastel status surfaces, compact badges |
| Animations | Shared row CSS and reduced-motion rule | Background-color transition limited to 120ms; no added entrance animation. **Not verified:** replay at 10% speed |
| Icons | Catalogue sort/search/filter icons and existing shared icon exports | Existing Hugeicons and currentColor; chevrons retained; no icon library added |
| Performance | Shared selectors and all edited source files; production build | No transition-all or will-change added; no dependency added; successful compilation |

## Resolved findings

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `frontend/src/app/globals.css:238` | Short, tightly padded rows and inconsistent header styling | 36px neutral-gray header, 56px minimum body rows, 20px horizontal / 12px vertical padding, 14px text and tabular numbers | Typography and surfaces: match reference proportions and stabilize numeric columns |
| MEDIUM | `frontend/src/app/(app)/admin/organizations/page.tsx`; `frontend/src/app/(app)/admin/users/page.tsx`; `frontend/src/app/(app)/compliance/_components/mitigation-monitoring-panel.tsx`; `frontend/src/app/(app)/compliance/_components/monitoring-read-only-workspace.tsx`; `frontend/src/app/(app)/inbox/page.tsx`; `frontend/src/app/(app)/intelligence/predictive/page.tsx`; `frontend/src/app/(app)/management/charters/page.tsx`; `frontend/src/app/(app)/management/planning/_components/planning-management-page.tsx`; `frontend/src/app/(app)/management/tmpmr/page.tsx`; `frontend/src/app/(app)/minutes/page.tsx`; `frontend/src/app/(app)/reports/_components/formal-report-list.tsx`; `frontend/src/app/(app)/reports/risk-cycle-detail-report.tsx`; `frontend/src/app/(app)/risk-events/page.tsx`; `frontend/src/app/(app)/risk/cascading/page.tsx`; `frontend/src/app/(app)/risk/history/page.tsx`; `frontend/src/app/(app)/risk/register/bulk/page.tsx`; `frontend/src/app/(app)/risk/working-papers/_components/working-paper-progress-collapsible.tsx`; `frontend/src/app/(app)/risk/working-papers/new/page.tsx`; `frontend/src/app/(app)/risk/working-papers/page.tsx`; `frontend/src/components/dashboard-invoices.tsx`; `frontend/src/components/organization-group/organization-group-management.tsx`; `frontend/src/components/report/quarterly-report-dashboard.tsx`; `frontend/src/components/report/quarterly-report-risk-table.tsx`; `frontend/src/components/risk/ordered-user-selection-table.tsx`; `frontend/src/components/shared/design-system/domain/overview-top-risks-card.tsx`; `frontend/src/components/shared/mitigation-progress-tab.tsx`; `frontend/src/components/shared/mitigation-table.tsx` | Primary columns added px-24 (96px) inset | Removed extra inset; shared 20px cell inset applies | Optical alignment: align titles with the collection surface and free space for content |
| MEDIUM | `frontend/src/components/shared/design-system/collections/collection-table-card.tsx:18`; `frontend/src/components/shared/design-system/collections/collection-toolbar.tsx:27`; `frontend/src/app/globals.css` | Detached toolbar, separate card boundary, stock surface only | Shared data slots create a connected toolbar/table panel, one 12px outer corner and subtle outline/shadow | Concentric radius and elevation: one structural boundary matches the reference |
| LOW | `frontend/src/app/globals.css` | Pill-shaped 12px badges and faint checkbox boundaries | 8px badge corners, 22px badge height, regular 14px text; pastel green/blue status surfaces; 18px square checkboxes with visible neutral boundaries | Surfaces and typography: compact reference styling while retaining risk palettes |
| LOW | `frontend/src/app/globals.css` | Table header inherited the light surface in dark mode; general hover/selected tokens | Explicit dark table tokens; subtle 120ms background hover and persistent selected background; reduced-motion override | Static feedback and motion restraint: readable theme surfaces and selection |
| LOW | `frontend/src/components/shared/design-system/examples/table-example.tsx`; `frontend/src/app/(app)/design-system/page.tsx`; `DESIGN.md` | Unused one-row catalogue example and obsolete table guidance | Connected six-row example with working status filter, search, sort, selection and empty state; updated source-of-truth guidance | Verification and consistency: preview uses the same application components |

## Considered but rejected

| Location | Candidate | Rejected because |
| --- | --- | --- |
| Shared Table primitive | Edit registry Table or Card source | The documented application surface can use existing data slots while preserving registry ownership |
| Production table columns | Add product thumbnails or checkbox selection everywhere | Risk/incident data has no product image field; selection requires actual domain actions and permission behavior |
| All table badges | Replace every semantic risk color with the reference's green/blue/gray colors | Risk severity must continue distinguishing low, medium, high and very high |
| Every application toolbar | Replace existing period/category filters with generic Active/Draft/Archived tabs | Different collections require different domain filters; preserve their behavior while matching the connected surface |

## Verification

- `npm run build` — passed: optimized production compilation, TypeScript build check, all 63 pages generated.
- `./node_modules/.bin/eslint src/components/shared/design-system/examples/table-example.tsx src/components/shared/design-system/collections/collection-table-card.tsx src/components/shared/design-system/collections/collection-toolbar.tsx` — passed.
- `node --test src/components/design-system-components.test.ts src/components/ui/badge-system.test.ts` — four tests passed.
- `git diff --check` — passed.
- Standalone `tsc --noEmit` initially found catalogue errors, which were corrected, plus existing test-file type errors. The successful Next.js production type check excludes test files. The full test-file TypeScript check is **not clean**.
- Catalogue interactions: search with no matches displayed empty state; clearing search restored rows; Draft status displayed two matching rows; select-all checked both visible rows and header; clearing selection worked; sort reversed the visible title order.
- Browser computed geometry after refreshing stale Turbopack CSS cache: catalogue rows 56px; cell padding 12px 20px; badges 8px corners; connected shell 12px corners. Register header 36px, all cell insets 20px, two-line metadata rows approximately 69px.
- Register Risiko: actual populated table inspected, title truncation and metadata visible, severity colors retained; unmatched search displayed the illustrated empty state and clearing restored rows.
- Mobile Register Risiko at 390px: document scrollWidth 390px; table viewport 358px; table width 1120px, with horizontal scrolling contained in the table. Temporary viewport override reset.
- Development server restarted after preserving stale `.next/dev` cache under `/tmp/manris-table-dev-cache-20261003`; localhost:3000 running again.
- **Not verified:** every individual route and permission variant; live dark-mode appearance; loading/error/disabled states on each route; motion replay at 10% speed; a pixel-diff against the supplied screenshot; the complete legacy source-shape test suite.

Verdict: **Approve for the inspected shared implementation and representative runtime surfaces**. No remaining actionable findings within that inspected boundary. The unverified checks above prevent a claim of exhaustive visual or pixel-perfect verification.
