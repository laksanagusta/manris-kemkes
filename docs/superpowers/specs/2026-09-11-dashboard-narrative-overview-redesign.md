# Dashboard Narrative Overview Redesign

## Goal

Redesign only the content of the MANRIS Dashboard/Overview page into an airy, quiet, analytics-first workspace inspired by the first user-supplied reference. The global sidebar and topbar remain unchanged.

The dashboard must serve two audiences equally:

- leaders who need a fast portfolio-level read;
- risk teams who need enough operational detail to identify what requires follow-up.

The redesign may reorder and reframe the existing information, but it must preserve the currently available dashboard data and existing backend contracts.

## Design Direction

Use a **Narrative Overview** composition. The page tells one ordered story:

1. What is the current portfolio condition?
2. How is exposure changing?
3. Which risks need attention?
4. Where are risks concentrated?
5. How did the distribution change across phases?

The visual character is airy and restrained: a softly tinted off-white page, white analytical surfaces, thin neutral boundaries, minimal shadow, moderate 12–16 px radii, and generous vertical rhythm. The interface must not imitate the reference product's branding or navigation.

Color remains semantic. Neutral content is monochrome, blue identifies the principal trend series, and green/yellow/orange/red are reserved for risk severity. Typography follows the existing MANRIS family and hierarchy rather than introducing a dashboard-only font.

## Information Architecture

### Header and context

Use a compact dashboard header with the title and current assessment-cycle context. A lightweight period control may sit at the opposite edge when an existing selection behavior is available; the redesign must not invent a non-functional filter.

### KPI strip

Present four concise metrics in one row on wide screens:

- Total Risiko;
- Risiko Tinggi & Sangat Tinggi;
- Penanganan Overdue;
- Risk Exposure.

Each metric contains a label, primary value, and a short contextual line only when that context is derived from available data. Loading skeletons follow the final text geometry. Unknown or errored values render as an em dash and retain an accessible state description.

### Primary trend

Promote the existing risk-score trend into the dominant full-width analytical panel immediately below the KPIs. The chart compares actual and target values for the existing four-cycle window. Its title, legend, axis labels, tooltip, empty state, and screen-reader summary remain explicit.

### Priority and distribution row

Place two secondary panels below the trend on wide screens:

- a wider priority-risk list with code, title, organization when present, semantic score, and a link to the risk record;
- a current-risk heatmap summary that gives leaders a compact distribution read.

The current-risk heatmap must reuse the same scoring and severity semantics as the existing multi-phase heatmap. It must not synthesize counts or movement claims that the API does not supply.

### Multi-phase analysis

Retain the full comparison of initial, quarterly, and target heatmaps after the primary narrative. Treat it as an advanced analysis section with a clear heading and explanatory context. All existing phases, legends, loading behavior, and accessibility labels remain available.

## Component Boundaries

The overview page owns data orchestration and retry behavior. Presentational responsibilities remain isolated:

- a dashboard KPI primitive owns metric typography and loading geometry;
- the trend panel owns chart presentation, legend, tooltip, and accessible tabular summary;
- the priority panel owns risk-row navigation and semantic score display;
- the compact current heatmap owns only the selected phase's 5×5 distribution;
- the multi-phase component owns comparative phase analysis.

Shared patterns introduced or materially changed by this redesign must live under the shared design-system modules and appear in the `/design-system` dashboard example. Feature-level composition remains in the overview route.

## Data Flow and Scope

Reuse the existing dashboard summary, cycle snapshot, top-risks, and multi-phase heatmap requests. No backend endpoint or persisted data change is in scope.

Requests remain independently observable so one failed panel does not blank the page. The page-level retry may refresh all overview requests, while a panel with its own fetch may retain its local retry. Derived labels or deltas are rendered only when supported by fetched data.

## States and Interaction

- Loading uses shape-matched skeletons and preserves layout stability.
- Errors remain local to the affected panel and provide a clear retry action.
- Empty states explain which data is missing without implying system failure.
- Hover feedback is limited to subtle surface or row changes; active feedback may use a restrained transform.
- Page entry may use one short staggered opacity/transform sequence.
- All motion is disabled or reduced under `prefers-reduced-motion`.
- Keyboard focus remains visible, and chart/heatmap content retains non-visual labels.

## Responsive Behavior

- Wide desktop: four KPI columns, full-width trend, then a wider priority list beside the compact heatmap.
- Tablet: KPI cards form two columns; lower analytical panels stack when their content would otherwise become cramped.
- Mobile: one vertical reading order matching the narrative; no critical metric, action, risk row, or heatmap is removed.

Component behavior should be driven by available container width where practical, with page breakpoints used only for major composition changes.

## Design-System Synchronization

Update the `/design-system` overview example to demonstrate the approved hierarchy and visual treatment using fixtures. Update `DESIGN.md` with the Narrative Overview pattern, including surface treatment, information order, semantic color use, motion, and responsive rules.

The design-system page and `DESIGN.md` are required deliverables of the implementation, not follow-up cleanup.

## Verification

- Add or update focused tests for information order and the presence of the four overview metrics.
- Cover loading, error, and empty states for the affected dashboard panels.
- Verify priority rows preserve their risk-record links and accessible labels.
- Verify compact and multi-phase heatmaps retain scoring semantics and accessible cell descriptions.
- Verify desktop, tablet, and mobile composition through responsive rendering or structural contracts.
- Run the relevant frontend tests, lint, and production build.
- Visually inspect both `/overview` and `/design-system` when a browser session is available.

## Out of Scope

- Global sidebar or topbar redesign.
- New dashboard APIs, database changes, or invented analytics.
- Removal of existing dashboard information.
- Changes to unrelated application pages.
