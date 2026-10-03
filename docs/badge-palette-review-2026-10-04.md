# Badge palette review — 2026-10-04

Mode: full. Scope: shared badge CSS, existing status/risk class families, badge fixtures, design-system examples, and the Risk Register. Framework: Next.js / React; styling: existing Tailwind v4 and semantic CSS tokens. Source inventory found 179 Badge/slot call sites; visual checks cover the Risk Register and the design-system gallery, not every route.

| Category | Evidence inspected | Result |
| --- | --- | --- |
| Typography | Computed styles for ten register badges and all ten palette families; badge CSS | 12px throughout the inspected badges |
| Surfaces | Color frequencies sampled from all three reference PNGs; computed backgrounds, borders and text in Chrome | Exact green, red, blue and neutral reference colors; other hues use matching intensity |
| Animations | Shared Badge transition and application override | Explicit color/background/border/shadow transitions; no new motion, 10% playback not applicable |
| Icons | Stock Badge icon classes and currentColor inheritance | Existing 12px icon treatment preserved |
| Performance | Badge-scoped selectors, shared palette variables, no client state or extra runtime package | Clear |

Resolved findings:

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `frontend/src/app/globals.css` | Table badges had 14px text and saturated green/blue fills; other badges used inconsistent borders and intensities | Global 12px badges with pale surfaces, pastel 1px borders and deep text across neutral/green/red/blue/yellow/amber/orange/purple/pink/cyan | Typography and surfaces: consistent readable labels without oversized emphasis |
| LOW | `frontend/src/lib/badge-variant.ts` | Several Indonesian status names in examples fell back to neutral | Review/waiting, approved/completed, rejected/cancelled and overdue aliases receive their existing semantic hue | One source of styling for the same status meaning |
| LOW | `frontend/src/components/shared/design-system/data/badge-fixtures.ts`, `frontend/src/components/shared/design-system/examples/badge-system-example.tsx`, `frontend/src/app/(app)/design-system/page.tsx`, `DESIGN.md` | Risk examples called the status helper and the expanded gallery was not mounted; documentation described 14px badges and white overrides | Mounted reference gallery and production `levelToColor` examples; documentation reflects the palette and 12px text | Examples and written guidance must match the production component |

Considered but rejected:

| Location | Candidate | Rejected because |
| --- | --- | --- |
| Risk charts / score pickers | Change the chart and score-control palette | Requested scope is badge color and font size; chart colors communicate separate data |
| Badge labels | Copy reference uppercase and wide tracking | User requested colors and 12px size; keep existing labels and casing |
| Alerts / icon tiles | Apply the badge palette to every colored surface | Those surfaces are not badges |

Verification:

- ESLint passed for changed TypeScript/TSX files.
- Existing `src/components/ui/badge-system.test.ts`: 2/2 passed; this verifies primitive/helper contracts, not browser color rendering.
- `git diff --check`: passed.
- Chrome computed-style checks confirmed 12px and exact sampled colors in the Risk Register and all ten gallery families.
- Gallery screenshot: `badge-palette-2026-10-04.png` in the chat visualization directory.
- `npx tsc --noEmit`: fails on existing test-file diagnostics (regex target, stale domain fixtures, missing test imports/types). No non-test diagnostics were emitted. Full-project type verification is therefore blocked by those test files.
- Not verified: dark theme visually; all individual feature routes, responsive layouts, focus and hover states. Existing structure and focus ring classes remain unchanged; dark palette tokens are supplied.

Verdict: Approve within the inspected badge scope. No remaining actionable badge-polish findings. Verification boundaries are listed above.
