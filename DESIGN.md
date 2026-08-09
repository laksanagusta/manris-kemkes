---
version: alpha
name: Manris
description: operational design system for risk and incident management. Neutral-first, teal-accented, desktop-density controls with Plus Jakarta Sans and JetBrains Mono typography.
colors:
  background: "#FFFFFF"
  main-content: "#FCFCFD"
  table-header-foreground: "oklch(0.18 0.02 170)"
  foreground: "oklch(0.15 0 0)"
  card: "oklch(1 0 0)"
  card-foreground: "oklch(0.15 0 0)"
  popover: "oklch(1 0 0 / 0.95)"
  popover-foreground: "oklch(0.15 0 0)"
  primary: "oklch(0.62 0.19 240)"
  primary-foreground: "oklch(0.99 0 0)"
  secondary: "oklch(0.97 0 0)"
  secondary-foreground: "oklch(0.4 0 0)"
  muted: "oklch(0 0 0 / 0.03)"
  muted-foreground: "oklch(0 0 0 / 0.5)"
  accent: "#F1F1F2"
  accent-foreground: "oklch(0.62 0.19 240)"
  destructive: "oklch(0.64 0.21 27)"
  border: "rgb(228 228 231 / 80%)"
  input: "rgb(228 228 231 / 80%)"
  ring: "oklch(0.62 0.19 240 / 0.25)"
  sidebar: "#F7F7F8"
  sidebar-foreground: "oklch(0.15 0 0)"
  sidebar-primary: "oklch(0.62 0.19 240)"
  sidebar-primary-foreground: "oklch(0.99 0 0)"
  sidebar-accent: "#ECECEE"
  sidebar-accent-foreground: "oklch(0.15 0 0)"
  sidebar-border: "rgb(0 0 0 / 8%)"
  sidebar-ring: "oklch(0.62 0.19 240 / 0.25)"
  transparent: "#00000000"
  chart-1: "oklch(0.62 0.19 240)"
  chart-2: "oklch(0.72 0.17 155)"
  chart-3: "oklch(0.78 0.12 85)"
  chart-4: "oklch(0.64 0.21 27)"
  chart-5: "oklch(0.55 0.15 270)"
  risk-low: "oklch(0.72 0.17 155)"
  risk-medium: "oklch(0.78 0.12 85)"
  risk-high: "oklch(0.70 0.18 40)"
  risk-extreme: "oklch(0.64 0.21 27)"
  success: "oklch(0.72 0.17 155)"
  warning: "oklch(0.78 0.12 85)"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0px"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, SF Mono, Consolas, Liberation Mono, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0px"
rounded:
  full: "9999px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  3xl: "24px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 14px"
    fontSize: "0.875rem"
    fontWeight: 500
  button-cta:
    backgroundColor: "#00b9ad"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 14px"
    fontSize: "0.875rem"
    fontWeight: 600
  button-premium:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
    fontSize: "0.875rem"
    fontWeight: 500
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "36px"
    padding: "0 14px"
    fontSize: "0.875rem"
    fontWeight: 500
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "36px"
    padding: "0 14px"
    fontSize: "0.875rem"
    fontWeight: 500
  button-icon:
    rounded: "{rounded.lg}"
    height: "36px"
    width: "36px"
    fontSize: "0.875rem"
    fontWeight: 500
  button-icon-large:
    rounded: "{rounded.lg}"
    height: "40px"
    width: "40px"
    fontSize: "0.875rem"
    fontWeight: 500
  card-default:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: "16px"
  card-large:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input-default:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "36px"
    padding: "0 12px"
  search-input:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "36px"
    padding: "0 12px"
  modal:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.2xl}"
    padding: "24px"
  bottom-sheet:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.2xl}"
    padding: "20px"
  list-group:
    rounded: "{rounded.2xl}"
  segmented-control:
    rounded: "{rounded.md}"
    padding: "4px"
  chip-default:
    backgroundColor: "#eeeeed"
    textColor: "#211d1c"
    rounded: "{rounded.full}"
    height: "32px"
    padding: "0 12px"
    fontSize: "14px"
  icon-tile:
    rounded: "{rounded.lg}"
    height: "36px"
    width: "36px"
  app-icon-tile:
    rounded: "{rounded.2xl}"
    height: "56px"
    width: "56px"
  toast:
    rounded: "{rounded.2xl}"
    padding: "10px 14px"
  dropdown:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.popover-foreground}"
    rounded: "{rounded.2xl}"
  popover:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.popover-foreground}"
    rounded: "{rounded.2xl}"
---

# Design System: Manris

## Overview

**Creative North Star: "The Operational Ledger"**

Manris is an operational interface for ministry teams handling risk and incident management under pressure. The visual language feels like a well-kept briefing room: calm, precise, credible, and ready for daily use. The system uses restrained neutrals, teal accent for primary actions, compact desktop-density controls, soft rounded corners, and Plus Jakarta Sans plus JetBrains Mono to keep attention on the task.

This system should stay institutionally grounded without becoming stiff. It should reduce panic, surface the next action quickly, and keep high-stakes workflows legible when information is incomplete. The product explicitly rejects decorative chrome, noisy card repetition, flashy gradients, and analytics theater. The authenticated surface should remain quiet and dependable.

**Key Characteristics:**
- Neutral-first palette with teal as the operational accent.
- Desktop-density spacing — compact but never cramped.
- Plus Jakarta Sans for interface text and JetBrains Mono for identifiers, metrics, and code-like values.
- Soft borders and restrained shadows over heavy decoration.
- Translucent materials reserved for chrome (sidebar, toolbar), solid surfaces for content.

## Colors

The palette is neutral-first with teal as the primary system accent. Color is used for status and emphasis, not decoration.

### Primary
- **Teal Action** (`#00b9ad`): Primary action, create/add CTA, and dominant operational accent.
- **Accent Surface** (`oklch(0.94 0.018 175)`): Subtle teal-tinted supporting surface for selected or grouped states.

### Neutral Palette
- **Background** (`#FFFFFF` light, `#111113` dark): Root and public-page surface.
- **Main Content** (`#FCFCFD` light, `#111113` dark): Authenticated workspace surface, subtly separated from white cards.
- **Sidebar** (`#F7F7F8` light, `#171719` dark): Slightly dimmer neutral chrome inspired by Linear's current hierarchy, separated with an 8% neutral divider.
- **Card Surface** (`oklch(1 0 0)`): Card, panel, and window surfaces.
- **Subtle Surface** (`oklch(0 0 0 / 0.03)`): Muted fills, table stripe, hover backdrop.
- **Ink** (`oklch(0.15 0 0)`): Primary text color.
- **Muted Ink** (`oklch(0 0 0 / 0.5)`): Secondary text, helper copy, metadata.
- **Border** (`oklch(0 0 0 / 0.1)`): Subtle strokes and dividers.

### Semantic
- **Risk Low / Success** (`oklch(0.72 0.17 155)`): Low risk, positive states.
- **Risk Medium / Warning** (`oklch(0.78 0.12 85)`): Caution states.
- **Risk High** (`oklch(0.70 0.18 40)`): Elevated risk markers.
- **Risk Extreme / Destructive** (`oklch(0.64 0.21 27)`): Critical conditions.

### Named Rules
**The Neutral-First Rule.** Teal (`#00b9ad`) is the primary system accent. Use it for create/add CTAs, selected operational emphasis, and focus-adjacent highlights. Let neutrals carry the interface.

**The Neutral Accent Surface Rule.** Generic hover and selected surfaces use zinc gray rather than teal tint: accent is `#F1F1F2` and sidebar accent is `#ECECEE` in light mode; both use `#27272A` in dark mode. Reserve teal for deliberate primary emphasis.

**The Table-Gray Boundary Rule.** Every neutral component boundary inherits the global `border` or `input` token: zinc gray at 80% opacity (`rgb(228 228 231 / 80%)` in light mode and `rgb(63 63 70 / 80%)` in dark mode). This is the same single-pixel treatment used by collection table shells. Do not replace destructive, warning, success, risk-level, selection, or focus-ring borders with the neutral token.

## Typography

**Primary Font:** Plus Jakarta Sans via `next/font/google`.
**Mono Font:** JetBrains Mono for code, IDs, scores, and technical values.

Typography should feel crisp and legible at desktop densities. Inter carries headings and body copy; JetBrains Mono is reserved for identifiers and numeric values. Text-sm (14px) is the default workhorse size.

### Hierarchy
- **Display** (`text-4xl font-semibold tracking-tight`): Large page heading treatment used in the design-system catalogue.
- **Section Title** (`text-xl font-semibold tracking-tight`): Internal section headers and card group titles.
- **Headline** (600, larger than body by at least 1.25x): Page titles and primary screen headers.
- **Title** (600, slightly smaller than headline): Card titles, panel labels, form section headings.
- **Body** (400, 0.875rem, 1.5 line-height): Form copy, helper text, task instructions. Keep prose around 65–75ch when possible.
- **Label** (500, 0.875rem): Button text, field labels, sidebar items, compact tags.
- **Caption** (`text-xs text-muted-foreground`): Supporting helper text.
- **Micro** (`text-[10px] font-medium`): Dense badges, KPI band labels, compact metadata.

### Named Rules
**The Plain Voice Rule.** Labels and actions should read like trusted workplace software, not marketing copy. Avoid ornament in UI text.

## Layout

Authenticated screens use a sidebar shell, toolbar header, and content region with desktop-density spacing. Standard control height is 36px (h-9). Dense controls (sidebar items, menu items) use 32px (h-8). Content uses 16px or 24px padding depending on context.

Responsive overlays remain edge-aware: sheets attach to the viewport edge. Translucent materials (backdrop-blur) are used for chrome surfaces: sidebar, toolbar, titlebar. Content surfaces remain solid.

## Elevation & Depth

The system uses subtle layered depth rather than dramatic shadows. Depth comes from background tint, border separation, and spacing — not blur or heavy glow.

### Shadow Vocabulary
- **Card Lift** (`0 1px 2px rgba(0,0,0,0.06)`): Default card elevation for content panels.
- **Control Lift** (`0 1px 1px rgba(0,0,0,0.04)`): Buttons and small interactive controls.
- **Popover Lift** (`0 12px 40px rgba(0,0,0,0.14)`): Menus, dropdowns, and transient overlays.
- **Dialog Lift** (`0 24px 80px rgba(0,0,0,0.20)`): Modal dialogs and windows.

### Materials
- **Sidebar / Toolbar / Titlebar**: `bg-card/70 backdrop-blur-xl` — translucent chrome.
- **Content / Cards / Panels**: Solid white surface — no blur.
- **Popovers / Menus**: `bg-card/95 backdrop-blur-xl` — nearly opaque with slight translucency.

### Named Rules
**The Flat-First Rule.** Do not add shadow for decoration. If a surface needs emphasis, use hierarchy, spacing, or border before shadow.

## Shapes

The system uses Tailwind-native circular border radii.

- `rounded-md` (6px): Tab button radius.
- `rounded-md` (6px): Button radius — all button sizes and variants.
- `rounded-lg` (8px): Inputs, sidebar items, toolbar buttons, default control radius.
- `rounded-xl` (12px): Premium controls, large action zones.
- `rounded-2xl` (16px): Card, panel, dialog, modal, popover, sheet radius.
- `rounded-3xl` (24px): Reserved for special cases.
- `rounded-full`: Pills, chips, status badges, and circular icon buttons.

Use the documented radius directly. Do not fake smoothing by increasing the radius, and do not add SVG paths, masks, or runtime clipping to shared DOM controls.

## Components

Components should feel compact, familiar, and sturdy. They should disappear into the workflow and only become visible when their state changes.

### Buttons
- **All buttons:** `rounded-md` (6px) — unified button radius across all sizes and variants.
- **Default size:** 36px high (h-9), 14px horizontal padding, text-sm font-medium.
- **Premium size:** 40px high (h-10), 16px horizontal padding.
- **Icon actions:** 36px by default or 40px when large.
- **AccentButton:** Teal-filled shared CTA for create/add flows and other primary task entry points.
- **ActionButton:** Shared compact button for outline, ghost, row actions, dialog actions, and loading states.
- **Shared buttons with `asChild`:** Pass exactly one element child. Place icons and labels inside that child; do not use the wrapper `icon` or `loading` props in `asChild` mode.
- **Tab buttons:** `rounded-md` (6px), `text-xs`, inside a `rounded-lg` container.
- **Tab active state:** Every default shared tab list uses one white active indicator with a subtle `shadow-sm`; it measures the selected trigger and slides beneath it over 300ms with the shared `ease-in-out` curve. Animate the indicator's transform and geometry; tab content changes without directional motion. Disable the indicator transition for `prefers-reduced-motion`. Line-variant tabs retain their underline treatment instead of the sliding pill.
- **Primary:** Blue fill with white text, used for the main action in a task flow.
- **Secondary / Outline:** Neutral surface with border, used for supporting actions.
- **Ghost / Subtle:** Transparent background with hover fill, used for low-priority actions.
- **Hover / Focus:** Light background shift and visible blue focus ring; no bounce, no motion flourish.
- **Dialog actions:** Dialog and AlertDialog triggers, cancel actions, and confirmation actions use the compact `sm` button size.

### Cards
- **Default:** `rounded-lg` with 16px padding, white surface, subtle border.
- **Large:** `rounded-lg` with 24px padding.
- **Shadow Strategy:** Small lift only (`shadow-sm`).
- **Border:** Subtle border (`border-black/10`).
- **Dashboard Card:** `rounded-2xl` with `ring-1 ring-inset ring-border`, `bg-card`, and no decorative shadow. The header band uses `px-4 py-6` with no divider line, while the body keeps `px-4 pt-0 pb-4` so the shell stays visually centered.
- **Card Header:** Use the Dashboard KPI header as the shared card-header pattern: `px-4 py-6` with no bottom border; render one title only with `text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground`. Do not place subtitles or descriptions inside this header band. Header-and-content cards must use `gap-0 p-0` on the card shell and one `p-4` content inset so the component's default gap does not stack with content padding.
- **Accordion Section Header:** When an accordion represents the same section shell, remove the trigger's default radius, transparent border, and underline behavior so its header band visually matches the KPI card header exactly.
- **Dashboard Rows:** Inside full-width panels, use a padded outer shell with a full-bleed inner list (`-mx-4` + `divide-y`) when the rows need to touch the card edge consistently.

### Inputs / Fields
- **Input:** 36px high (h-9), `rounded-lg` (8px), 12px horizontal padding, text-sm.
- **Search:** 36px high (h-9), `rounded-lg` (8px), 12px horizontal padding, muted fill.
- **Focus:** Blue ring (`ring-blue-500/25`).
- **Error / Disabled:** Use semantic red for invalid state and lower-opacity neutral fills for disabled.

### Overlays and Groups
- **Modal:** `rounded-2xl` with 24px padding, `shadow-2xl`.
- **Form modal:** For short create/edit forms, use a `max-w-md` dialog with a bordered header and footer, a `min-h-0 flex` form shell, `overscroll-contain` on the scrollable body, and full-width footer actions on narrow screens.
- **Bottom sheet:** `rounded-t-2xl` with 20px padding.
- **Dropdown:** `rounded-2xl` with solid popover surface and subtle ring.
- **Popover:** `rounded-2xl` with solid popover surface and subtle ring.
- **Toast:** `rounded-2xl` with 10px vertical and 14px horizontal padding.
- **List group:** `rounded-2xl` with clipped overflow.
- **Segmented control (TabsList):** `rounded-lg` with 4px internal padding, tab buttons `rounded-md`.

### Chips and Icon Tiles
- **Chip:** 32px high, pill-shaped (`rounded-full`), with 12px horizontal padding, 14px semibold text, and no border.
- **Badge palette:** Use reference-derived pastel fills with dark semantic text: neutral `#eeeeed` / `#211d1c`, info and progress `#c6f2fb` / `#29449a`, success `#c9f3df` / `#006331`, warning `#fbedb9` / `#9b2f00`, and danger `#fbdedc` / `#ad001b`. Keep labels explicit so color is never the only status cue.
- **Dense badge sizes:** Compact badges are at least 24px high with 12px text. Micro badges are at least 20px high with 11px text. Dense badges may retain `rounded-sm`; their larger type and borderless pastel treatment remain mandatory.
- **Icon tile:** 36px square with `rounded-lg`.
- **App icon tile:** 56px square with `rounded-2xl`.

### Navigation
- **Style:** Sidebar and toolbar use translucent material (`bg-card/70 backdrop-blur-xl`) with compact rows (32px), muted inactive state, and blue-backed active state.
- **Sidebar frame:** Desktop sidebar fills the viewport edge-to-edge with no outer inset, radius, shadow, or surrounding ring; use a single trailing divider (`border-r` for the left sidebar).
- **Typography:** text-sm font-medium for items, text-[11px] font-semibold uppercase tracking-wide for section labels.
- **Hover:** Subtle background shift — no bounce, no motion flourish.
- **Mobile Treatment:** Collapse sidebar to icon-only or bottom tab bar.
- **Action placement:** Keep page-specific primary actions in the page header. Do not duplicate create actions in the global sidebar.
- **Register switching:** Use specific labels such as “Daftar Risiko” and “Pemantauan”; keep the tab list compact at 36px with full-rounded pills, and let a compact count sit beside the register label when it replaces a redundant total card.
- **Responsive shell:** Every main flex child beside the sidebar must use `min-w-0`; page-level horizontal overflow is clipped and wide data tables own their local horizontal scrolling.
- **Main content wrapper:** Every authenticated route uses one shared `mx-auto w-full max-w-[1200px] py-8` wrapper inside `AppShell`. Feature pages must not duplicate this outer geometry; they own only their internal section spacing. The design-system catalogue keeps `space-y-12` as a page-specific rhythm.

### Operational Summaries

#### Component Ownership and Imports

- `frontend/src/components/shared/design-system` is the canonical home for composed reusable Manris components.
- Production consumers import composed components only from `@/components/shared/design-system` and must not deep-import category folders.
- `components/ui` remains the low-level shadcn foundation.
- Catalogue examples live under `design-system/examples`, use fixture data, and render production components instead of duplicating their structural classes or behavior.
- The former `components/shared/collection-primitives.tsx` module is removed; its focused components live under the internal `collections` category and are exported through the root Design System API.
- Domain-aware components may remain in the Design System when they receive data and callbacks through props and own no fetching, routing, permission, or page business state.

- **PageStack** is the required outer layout for authenticated feature pages. It owns the shared `space-y-4`, `min-w-0`, and page entrance treatment so routes do not repeat those classes.
- **MetricGrid** is the shared responsive shell for four-up KPI summaries: one column by default, two from `sm`, and four from `xl`.
- **CollectionToolbar** keeps collection context or tabs on the left and search/filter actions on the right. It lives outside `CollectionTableCard`; the table card contains only data, states, and pagination.
- **Intelligence collection pages** such as Meeting and Document Intelligence use the same `PageStack` + `CollectionToolbar` shell as the risk register. Keep their workflow cards on the neutral `rounded-2xl` collection surface, with actions and review states inside that shared rhythm.
- **CollectionFilterGrid** is the compact filter-row shell for collection pages. Use it without visible labels when the search or select control already carries its intent, and right-align trailing controls with `justify-self-end` so the row reads as a single toolbar line.
- **Collection search rows** should use `ExpandableSearchField` when the page needs a compact, risk-register-style search affordance. If the page also has one primary create/action CTA that competes with filters, place that CTA in a dedicated right-aligned row immediately above the table instead of crowding the toolbar.
- Dense mitigation and register toolbars should use `ExpandableSearchField` for search entry, matching the risk register affordance instead of a permanently visible input.
- Mitigation reporting dialogs should reuse the shared `MitigationProgressDialog` shell so evidence and notes fields stay consistent across the compliance and risk workflows.
- The shared mitigation reporting form is `MitigationProgressForm`; use it whenever a mitigation task needs evidence and notes inputs instead of hand-building a local `Input`/`Textarea` pair. The form shell should include the same rounded card frame used by the catalogue example so modal layouts stay visually aligned with `/design-system`.
- Report dashboards use `CollectionToolbar` in its actions-only composition for filter and export controls. Report actions consume shared `ActionButton` and `AccentButton` variants and must not override accent tokens inline.
- **ReportPanel** is the required shell for report charts and analytical summaries. Pair it with `ReportGrid`, `ReportEmptyState`, `ReportDrilldownSummary`, and `ReportLinkGrid` instead of rebuilding card, empty, drilldown, or report-navigation surfaces inside route pages.
- The `/design-system` route is the canonical catalogue for shared UI patterns. When feature pages introduce a new reusable shell, sync it back into the design-system component folder and this document.
- The design-system catalogue and production data collections must consume generic collection primitives for tabs, table shells, and pagination. Do not encode a route or feature name into these reusable components, and do not duplicate their structural class strings inside route pages.
- Collection table pages should place the heading and toolbar outside the card. The card itself should contain only the table, empty state, and pagination footer.
- Do not add KPI cards above a register table when the cards only restate the table total or simple category counts.
- Keep the register table as the dominant surface; move a necessary total into compact navigation or table pagination.
- Omit subtitles that merely restate an already-specific register title. Table headers within one table must share a single typography scale.
- Place register search and filter controls on the same responsive toolbar row as the register tabs; stack them only when horizontal space is insufficient.
- Dense table scores use the same body scale as adjacent cells with tabular numerals. Compact status and period badges use `rounded-sm`, not pill geometry.
- Sortable table headers must use a keyboard-focusable control and expose the current direction with `aria-sort`.
- Period and monitoring indicators must pair color with a visible icon or text cue and an accessible status label; never rely on color or hover-only tooltips.
- Keep compact row actions visible with a sticky trailing column when a table still needs horizontal scrolling. Pagination labels and controls use at least the `text-xs` and 32px control scale.
- Register table cards begin directly with the table header, without an empty padded title band. Their outer shell should match accordion items: `rounded-2xl border border-zinc-200/80 bg-card shadow-none ring-0`. The explicit `ring-0` disables the shared Card's default inset ring so the shell keeps a single one-pixel boundary. Keep the header divider at `border-b border-border/60` and avoid layered rings or inset overlays.
- Sticky action cells inside register tables should keep a white background (`bg-background`) so only the header carries the pale neutral surface.
- Register pagination should live as the table card footer: range text on the left, numbered page controls in the middle, and items-per-page on the right.
- Search fields on bright operational toolbars use the light card/popover surface with a subtle inset border; reserve stronger muted fills for grouped or recessed controls.
- Register table headers use a white surface (`#FFFFFF`) with foreground text, not a tinted header band. Keep the header divider lighter than the body grid, and keep row actions visually quiet with icon-only controls.
- Compact status badges must use the shared `Badge` component with semantic `tone` and `size="compact"` or `size="micro"` instead of hand-written class strings.
- Dense code-like identifiers in table rows stay text-only; do not wrap them in filled chips when the row already has a compact badge for state.
- Risk assessment summaries use the shared `RiskAssessmentSummaryStrip` pattern: score block on the left, semantic level badge, optional status badge, compact metrics, and an optional note row.
- Semester indicators, archived banners, AI suggestion dropdowns, progress meters, empty states, and version timelines must be implemented as shared component patterns once they appear in more than one route.
- Overview dashboard panels must consume the shared `StandardCard` shell instead of duplicating card, header, and content classes. The shell uses a compact divider-free header band (`text-[11px] font-mono font-semibold uppercase tracking-[0.1em]`, `px-4 py-4`) and `rounded-2xl ring-1 ring-inset ring-border` treatment across charts, heatmaps, list panels, and design-system examples.
- Overview dashboards render their shell immediately and load each panel independently. Use the shared `OverviewPanelState` for loading, error, and empty states; an API error must never be represented as a valid zero or empty dataset.
- Dashboard trend indicators use `—` when comparison data is unavailable and `Baru` when a non-zero value follows a zero baseline. Do not fabricate `0%`, including for exposure metrics.
- Dashboard charts and heatmaps require persistent text legends plus accessible summaries. Color and hover-only tooltips may supplement meaning but must never be the only way to identify a category, series, score, or risk level.
- Keep overview heatmaps at one column on phones and two columns on ordinary laptop/tablet content widths. Use four columns only at wide desktop widths where each 5×5 matrix remains legible.
- Rows with hover or press feedback must be interactive. Overview top-risk rows link to the risk register detail, expose a keyboard focus ring, provide at least a 44px target, and disable transform motion when reduced motion is requested.

### Dropdowns and Popovers
- **Style:** Compact solid surfaces with `rounded-2xl`, small offset from trigger, and a subtle border-plus-ring treatment. Avoid relying on translucency for content legibility.
- **Behavior:** Overlays should open near the trigger, remain readable, and never feel clipped or cramped.
- **Internal Structure:** Prefer a single soft outer ring with spacing or `divide-y` separators inside suggestion lists. Avoid stacked `border-b` rules on each row unless the list is intentionally grid-like.
- **Dense Forms:** For form fields that need selection in compact desktop layouts, prefer a popover-backed combobox button over the native `Select` shell when the field needs richer spacing or custom row content.

## Do's and Don'ts

### Do:
- **Do** keep the interface neutral-first with blue as the primary operational accent.
- **Do** use text-sm (14px) as the default font size for controls, labels, and body copy.
- **Do** use subtle borders (`border-black/10`) and separators over heavy shadows.
- **Do** use translucent materials (`bg-card/70 backdrop-blur-xl`) for chrome surfaces only.
- **Do** keep hover states quiet and focus states visible.
- **Do** use rounded-lg for controls, rounded-2xl for cards and dialogs, rounded-md for tab buttons.
- **Do** let cards, popovers, and dropdowns breathe with enough edge padding.

### Don't:
- **Don't** use saturated backgrounds or heavy gradients.
- **Don't** use `#000` or `#fff` as neutrals.
- **Don't** make every surface glassy or translucent — content should be solid.
- **Don't** use oversized mobile-style controls in desktop layouts.
- **Don't** use rounded-full for every button unless intentionally using pills.
- **Don't** use font-bold excessively — prefer font-medium and font-semibold.
- **Don't** rely only on color for interactive state — use borders, background shift, and focus rings.
- **Don't** use runtime SVG clip-path or JS-based corner smoothing on shared DOM controls.
