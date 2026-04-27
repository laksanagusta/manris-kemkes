
- 2026-04-26: Created `frontend/src/lib/risk-guide-content.ts` as the single source of truth for hero, overview, five ordered lifecycle steps, and FAQ, with the required step titles enforced by `riskGuideStepTitles`.
- 2026-04-26: Created `frontend/src/components/guides/risk-guide-page.tsx` as a presentational server-safe component with no client directive, no auth hooks, no fetching, and no route logic.
- 2026-04-26: Implemented `frontend/src/app/(app)/panduan/risiko/page.tsx` as a pure wrapper around `RiskGuidePage` so the authenticated route reuses the shared guide content unchanged and inherits shell behavior from the existing `(app)` layout.
- 2026-04-26: Added `/panduan` and `/panduan/risiko` labels to `frontend/src/lib/app-navigation.ts` so the header breadcrumb trail renders `Panduan > Panduan Risiko` instead of exposing raw URL segments.
- 2026-04-26: Kept `frontend/src/app/(public)/panduan-risiko/page.tsx` server-rendered by default and exported static page metadata there, because App Router metadata is server-only and the shared guide component should stay route-agnostic.
- 2026-04-26: Added one `Panduan Risiko` item to `mainMenuItems` with the existing `BookOpen` icon so authenticated discoverability comes from the shared sidebar config without changing sidebar rendering or role filtering.
- 2026-04-26: Kept the public discoverability entry as a plain muted `Link` on both `frontend/src/app/page.tsx` and `frontend/src/app/(public)/login/page.tsx`, avoiding a second button treatment that would compete with the primary login submit action.
