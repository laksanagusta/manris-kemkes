---
version: alpha
name: Manris
description: operational design system for risk and incident management. Monochrome, desktop-density controls with Plus Jakarta Sans and JetBrains Mono typography; semantic color is reserved for meaning.
colors:
  background: "#FBFBFB"
  main-content: "#FBFBFB"
  table-header-foreground: "#737373"
  foreground: "#171717"
  card: "#FFFFFF"
  card-foreground: "#171717"
  popover: "#FFFFFF"
  popover-foreground: "#171717"
  primary: "#090909"
  primary-foreground: "#FFFFFF"
  secondary: "#F5F5F5"
  secondary-foreground: "#525252"
  muted: "#F5F5F5"
  muted-foreground: "#737373"
  accent: "#F3F3F3"
  accent-foreground: "#171717"
  destructive: "oklch(0.58 0.22 27)"
  border: "rgb(10 10 10 / 10.2%)"
  input: "rgb(10 10 10 / 10.2%)"
  ring: "rgb(10 10 10 / 25%)"
  sidebar: "#FBFBFB"
  sidebar-foreground: "#171717"
  sidebar-primary: "#090909"
  sidebar-primary-foreground: "#FFFFFF"
  sidebar-accent: "#F3F3F3"
  sidebar-accent-foreground: "#171717"
  sidebar-border: "rgb(10 10 10 / 10.2%)"
  sidebar-ring: "rgb(10 10 10 / 25%)"
  transparent: "#00000000"
  chart-1: "oklch(0.48 0.12 175)"
  chart-2: "oklch(0.60 0.10 200)"
  chart-3: "oklch(0.70 0.15 50)"
  chart-4: "oklch(0.55 0.12 150)"
  chart-5: "oklch(0.65 0.08 220)"
  risk-low: "oklch(0.72 0.17 155)"
  risk-medium: "oklch(0.78 0.16 85)"
  risk-high: "oklch(0.70 0.18 40)"
  risk-extreme: "oklch(0.58 0.22 27)"
  success: "oklch(0.72 0.17 155)"
  warning: "oklch(0.78 0.16 85)"
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
  sm: "4px"
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
    backgroundColor: "#090909"
    backgroundImage: "linear-gradient(180deg, #2e2e2e 0%, #090909 100%)"
    textColor: "{colors.primary-foreground}"
    rounded: "8px"
    height: "36px"
    padding: "1px 12px"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "21px"
    letterSpacing: "-0.14px"
    fontFamily: "Inter Variable, system-ui, sans-serif"
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.22)"
  button-cta:
    backgroundColor: "#090909"
    backgroundImage: "linear-gradient(180deg, #2e2e2e 0%, #090909 100%)"
    textColor: "{colors.primary-foreground}"
    rounded: "8px"
    height: "36px"
    padding: "1px 12px"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "21px"
    letterSpacing: "-0.14px"
    fontFamily: "Inter Variable, system-ui, sans-serif"
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.22)"
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
    rounded: "{rounded.xl}"
    padding: "16px"
  card-large:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.2xl}"
    padding: "24px"
  input-default:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    border: "{colors.ring}"
    rounded: "{rounded.lg}"
    height: "36px"
    padding: "0 12px"
  search-input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    border: "{colors.ring}"
    rounded: "{rounded.lg}"
    height: "36px"
    padding: "0 12px"
  modal:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.2xl}"
    padding: "24px"
  dialog-context-panel:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.2xl}"
    padding: "12px"
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

Manris is an operational interface for ministry teams handling risk and incident management under pressure. The visual language feels like a well-kept briefing room: calm, precise, credible, and ready for daily use. The system uses a restrained monochrome palette, compact desktop-density controls, soft rounded corners, and Plus Jakarta Sans plus JetBrains Mono to keep attention on the task. Color is reserved for data visualization and states that carry meaning.

This system should stay institutionally grounded without becoming stiff. It should reduce panic, surface the next action quickly, and keep high-stakes workflows legible when information is incomplete. The product explicitly rejects decorative chrome, noisy card repetition, flashy gradients, and analytics theater. The authenticated surface should remain quiet and dependable.

**Key Characteristics:**
- Monochrome neutral palette with semantic color reserved for charts and meaningful states.
- Desktop-density spacing — compact but never cramped.
- Plus Jakarta Sans for interface text and JetBrains Mono for identifiers, metrics, and code-like values.
- Soft borders and restrained shadows over heavy decoration.
- Translucent materials reserved for chrome (sidebar, toolbar), solid surfaces for content.

## Colors

The palette is monochrome by default. Use color only when it communicates status, risk, feedback, or analytical meaning; do not use it as decoration.

### Primary
- **Monochrome Action** (`#090909` light, `#F5F5F5` dark): Primary action, create/add CTA, and dominant operational control.
- **Accent Surface** (`#F6F6F6` light, `#27272A` dark): Neutral supporting surface for selected, hovered, or grouped states.

### Neutral Palette
- **Background / Main Content** (`#FBFBFB` light, `#111111` dark): Root and authenticated workspace surface.
- **Sidebar** (`#FBFBFB` light, `#171717` dark): Neutral application chrome with the same restrained divider treatment.
- **Card Surface** (`#FFFFFF` light, `#181818` dark): Card, panel, and window surfaces.
- **Subtle Surface** (`#F7F7F7` light, `#242424` dark): Muted fills, table stripe, and quiet hover backdrop.
- **Ink** (`#171717` light, `#F5F5F5` dark): Primary text color.
- **Muted Ink** (`#737373` light, `#A3A3A3` dark): Secondary text, helper copy, and metadata.
- **Border** (`rgb(10 10 10 / 10.2%)` light, `rgb(255 255 255 / 12%)` dark): Subtle strokes and dividers.

### Semantic
- **Risk Low / Success** (`oklch(0.72 0.17 155)`): Low risk, positive states.
- **Risk Medium / Warning** (`oklch(0.78 0.16 85)`): Caution states.
- **Risk High** (`oklch(0.70 0.18 40)`): Elevated risk markers.
- **Risk Extreme / Destructive** (`oklch(0.58 0.22 27)`): Critical conditions.

### Named Rules
**The Monochrome-First Rule.** Use graphite and grayscale tokens for the interface, controls, navigation, and content surfaces. Reserve color for charts, statuses, badges, toasts, risk levels, and other states where hue carries meaning.

**The Neutral Accent Surface Rule.** Generic hover and selected surfaces use grayscale: accent and sidebar accent are `#F6F6F6` in light mode; dark mode remains `#27272A`. Do not introduce colored surfaces for decoration.

**The Table-Gray Boundary Rule.** Every neutral component boundary inherits the global `border` or `input` token: `rgb(10 10 10 / 10.2%)` in light mode and `rgb(255 255 255 / 12%)` in dark mode. This is the same single-pixel treatment used by collection table shells. Do not replace destructive, warning, success, risk-level, selection, or focus-ring borders with the neutral token.

## Typography

**Primary Font:** Plus Jakarta Sans via `next/font/google`.
**Mono Font:** JetBrains Mono for code, IDs, scores, and technical values.

Typography should feel crisp and legible at desktop densities. Inter carries headings and body copy; JetBrains Mono is reserved for identifiers and numeric values. Text-sm (14px) is the default workhorse size.

### Hierarchy
- **Page title** (`page-title`): Primary page heading, 30px on compact screens and 36px from the small breakpoint, semibold with tight leading and balanced wrapping.
- **App toolbar title** (`app-page-title`): Global route title, 18px on compact screens and 20px from the small breakpoint.
- **Brand / Wordmark** (`text-lg font-semibold`): Expanded sidebar label uses sentence case (`Manris`) with 0px letter spacing; the collapsed sidebar uses the single-letter mark (`M`).
- **Section Title** (`text-xl font-semibold tracking-tight`): Internal section headers and card group titles.
- **Headline** (600, larger than body by at least 1.25x): Page titles and primary screen headers. Use `page-title` for the shared treatment.
- **Title** (600, slightly smaller than headline): Card titles, panel labels, form section headings.
- **Body** (400, 0.875rem, 1.5 line-height): Form copy, helper text, task instructions. Keep prose around 65–75ch when possible.
- **Label** (500, 0.875rem): Button text, field labels, sidebar items, compact tags.
- **Caption** (`text-xs text-muted-foreground`): Supporting helper text.
- **Micro** (`text-[10px] font-medium`): Dense badges, KPI band labels, compact metadata.

### Named Rules
**The Plain Voice Rule.** Labels and actions should read like trusted workplace software, not marketing copy. Avoid ornament in UI text.

## Layout

Authenticated screens use a sidebar shell, toolbar header, and content region with desktop-density spacing. Standard control height is 36px (h-9). Dense controls (sidebar items, menu items) use 32px (h-8). Content uses 16px or 24px padding depending on context.

Responsive overlays remain edge-aware: sheets attach to the viewport edge. Translucent materials (backdrop-blur) are used for chrome surfaces: sidebar, toolbar, titlebar, and modal scrims. Content surfaces remain solid.

## Elevation & Depth

The system uses subtle layered depth rather than dramatic shadows. Every elevated widget, card, and floating surface uses the shared smooth-shadow treatment: one visible neutral outer hairline plus restrained near-edge lift.

### Shadow Vocabulary
- **Widget Lift** (`smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30`): Default elevation for cards, dashboard widgets, KPI tiles, and content panels. Render a visible 1px neutral hairline with a near-edge, low-opacity shadow, matching the restrained verification-card reference.
- **Control Lift** (`0 1px 1px rgba(0,0,0,0.04)`): Buttons and small interactive controls.
- **Floating Surface** (`smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30`): Menus, dropdowns, tooltips, sheets, toasts, and transient overlays.

### Elevated Surface Rule
- Use `smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30` on elevated cards, dashboard widgets, table shells, and floating surfaces. The shared utility owns the single visible neutral outer hairline.
- Do not stack a separate neutral `border-*` or `ring-*` around the same elevated surface; use rings only for focus or intentional inner boundaries. Semantic states may use their dedicated colored border tokens.
- Keep separators inside the surface (`border-b`, `border-t`) when they divide content rather than outline the surface.
- `Card` and shared panel primitives own this elevation globally. Feature pages must not replace it with `shadow-none` or another shadow size; preserve the documented outer hairline unless the surface is intentionally borderless.

### Materials
- **Sidebar / Toolbar / Titlebar**: `bg-card/70 backdrop-blur-xl` — translucent chrome.
- **Content / Cards / Panels**: Solid white surface — no blur.
- **Popovers / Menus**: `bg-card/95 backdrop-blur-xl` — nearly opaque with slight translucency.
- **Modal scrim**: `frosted-scrim` — `color-mix` from the active background token at 64% with a subtle `blur(4px) saturate(110%)`; use this for Dialog, AlertDialog, and Sheet overlays instead of black opacity. Fallbacks use an 86% tint when backdrop filtering is unavailable or reduced transparency is preferred.

### Named Rules
**The Flat-First Rule.** Do not add shadow for decoration. If a surface needs emphasis, use hierarchy, spacing, or border before shadow.

## Shapes

The system uses Tailwind-native circular border radii.

- `rounded-sm` (4px): Small internal controls, checkbox corners, and menu details.
- `rounded-md` (6px): Tab and standard button radius.
- `rounded-lg` (8px): Inputs, selects, textareas, search, sidebar items, toolbar buttons, and default control radius.
- `rounded-xl` (12px): Cards, panels, popovers, dialogs, premium controls, and large action zones.
- `rounded-2xl` (16px): Large cards, sheets, and other elevated surfaces that explicitly need more emphasis.
- `rounded-3xl` (24px): Reserved for special cases.
- `rounded-full`: Pills, chips, status badges, and circular icon buttons.

Use the documented radius directly. Do not fake smoothing by increasing the radius, and do not add SVG paths, masks, or runtime clipping to shared DOM controls.

## Components

Components should feel compact, familiar, and sturdy. They should disappear into the workflow and only become visible when their state changes.

### Buttons
- **Standard buttons:** `rounded-md` (6px) — unified radius across standard sizes and variants.
- **Default size:** 36px high (h-9), 14px horizontal padding, text-sm font-medium.
- **Primary size:** 36px high, fit-content width, `rounded-[8px]`, `p-[1px_12px]`, 6px icon gap, and 14px/21px medium Inter text with `-0.14px` tracking.
- **Premium size:** 40px high (h-10), 16px horizontal padding.
- **Icon actions:** 36px by default or 40px when large.
- **AccentButton:** Black-gradient primary CTA with an 8px radius for create/add flows and other primary task entry points.
- **ActionButton:** Shared compact button for outline, ghost, row actions, dialog actions, and loading states; it uses the same 8px radius as `AccentButton` primary actions.
- **ActionIconButton:** Shared icon-only row action with a white `bg-card` resting surface and muted hover state, keeping action affordances distinct from the neutral table background.
- **Shared buttons with `asChild`:** Pass exactly one element child. Place icons and labels inside that child; do not use the wrapper `icon` or `loading` props in `asChild` mode.
- **Tab buttons:** `rounded-md` (6px), `text-xs`, inside a `rounded-lg` container.
- **Tab active state:** Every default shared tab list uses one white active indicator with a subtle `shadow-sm`; it measures the selected trigger and slides beneath it over 300ms with the shared `ease-in-out` curve. Animate the indicator's transform and geometry; tab content changes without directional motion. Disable the indicator transition for `prefers-reduced-motion`. Line-variant tabs retain their underline treatment instead of the sliding pill.
- **Primary:** Black-gradient button (`#2e2e2e` to `#090909`) with white Inter 14px/21px medium text, 36px height, 8px radius, 1px vertical and 12px horizontal padding, 6px icon gap, and a `0 1px 2px rgba(0, 0, 0, 0.22)` shadow. Used for the main action in a task flow.
- **Secondary / Outline:** Neutral surface with border, used for supporting actions.
- **Ghost / Subtle:** Transparent background with hover fill, used for low-priority actions.
- **Hover / Focus:** Light background shift and visible neutral focus ring; no bounce, no motion flourish.
- **Cursor:** Native and role-based interactive controls use `cursor-pointer`; disabled controls use `cursor-not-allowed`. Decorative surfaces and non-interactive text keep the default cursor.
- **Sidebar navigation:** Inactive items use the normal text weight; the active item uses `font-semibold` (600) for clear wayfinding without changing its size or spacing.
- **Dialog actions:** Dialog and AlertDialog triggers, cancel actions, and confirmation actions use the compact `sm` button size.

### Cards
- **Default:** `rounded-xl` with 16px padding, white surface, subtle border.
- **Large:** `rounded-2xl` with 24px padding.
- **Shadow Strategy:** Use `smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30` for the restrained near-edge lift.
- **Border:** The shared smooth elevation provides the single visible outer boundary. Use internal separators only for content divisions.
- **Dashboard Card:** `rounded-xl` with `bg-card` and the shared smooth elevation. The header band uses `px-4 py-6` with no divider line, while the body keeps `px-4 pt-0 pb-4` so the shell stays visually centered.
- **Card Header:** Use the Dashboard KPI header as the shared card-header pattern: `px-4 py-6` with no bottom border; render one title only with `text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground`. Do not place subtitles or descriptions inside this header band. Header-and-content cards must use `gap-0 p-0` on the card shell and one `p-4` content inset so the component's default gap does not stack with content padding.
- **Accordion Section Header:** When an accordion represents the same section shell, use the shared smooth elevation and disable the item's default `not-last:border-b` separator (`not-last:border-b-0`). Remove the trigger's default radius, transparent border, and underline behavior so its header band visually matches the KPI card header exactly. Internal header dividers are allowed only when they intentionally separate header and content.
- **Dashboard Rows:** Inside full-width panels, use a padded outer shell with a full-bleed inner list (`-mx-4` + `divide-y`) when the rows need to touch the card edge consistently.

### Inputs / Fields
- **Shared field geometry:** Input, Select trigger, Textarea, SearchInput, InputGroup, Combobox chips, Checkbox, and Radio use the `border-ring` token (`--ring`) for their neutral field boundary, with `bg-card`, compact control geometry, and text-sm. Textarea keeps the same surface and state styling while growing vertically.
- **Field primitive rule:** Feature pages compose visible text, search, select, and textarea controls from the shared field primitives. Native controls remain only for hidden file uploads and range sliders, which have distinct browser interaction semantics. Custom popover-backed field triggers must reuse the same `border-ring` token and no-gray-ring treatment, remain visually stable when pressed, and use a 150ms chevron rotation on open. Page-level geometry selectors may set size, radius, and surface, but must not override the shared active-field state.
- **Search:** 36px high (h-9), `rounded-lg` (8px), 12px horizontal padding, card surface, and the same input border/focus treatment.
- **Focus:** Text, textarea, search, and select fields keep the `--ring` border with no additional focus ring. `SelectTrigger` keeps the same neutral border while its chevron rotates on open; semantic invalid states retain their dedicated red border/ring.
- **Error / Disabled:** Use semantic red for invalid state and lower-opacity neutral fills for disabled.
- **Mobile form controls:** Feature forms may promote input text to `text-base` on mobile where zoom prevention is required; the shared desktop baseline remains text-sm. Inline validation messages use at least `text-xs` with readable line-height.

### Overlays and Groups
- **Modal:** `rounded-xl` with 20px padding and the shared smooth elevation.
- **Shared modal shell:** `DialogContent` uses `w-[calc(100%-2rem)] max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-xl bg-card p-5` with the shared smooth elevation as its outer hairline; `AlertDialogContent` keeps the same treatment at `max-w-lg`. The compound header uses a compact `gap-1` rhythm, while the compound footer uses an internal `border-t border-border/70` divider, `px-5 py-4` inset, and compact actions. Explicit `max-w-*` overrides remain available for intentionally expanded dialogs.
- **Form modal:** Compose `DialogHeader`, body sections, and `DialogFooter` as siblings inside the shared shell. The canonical mitigation form uses `max-w-2xl`, a 16px title, no subtitle or close icon, 14px labels, `space-y-5` between fields, and an explicit `flex flex-col gap-2` (8px) layout between each label and its field. Its footer uses a secondary cancel action and a primary submit action; active text fields use one black border with no additional gray focus ring. Dynamic content is handled by the shared modal scroll boundary.
- **Bottom sheet:** `rounded-t-2xl` with 20px padding.
- **Dropdown:** `rounded-2xl` with solid popover surface and subtle ring.
- **Popover:** `rounded-xl` with solid popover surface and subtle ring. All `PopoverContent` instances inherit this radius; feature overrides must not replace it with another radius.
- **Toast:** `rounded-2xl` with 10px vertical and 14px horizontal padding.
- **List group:** `rounded-2xl` with clipped overflow.
- **Segmented control (TabsList):** `rounded-lg` with 4px internal padding, tab buttons `rounded-md`.

### Iconography
- **Source:** All application icons use Hugeicons through the shared `frontend/src/components/ui/icons.tsx` compatibility layer. Feature code must import from `@/components/ui/icons` instead of importing an icon package directly.
- **Weight:** Keep icons in the same outline family and use `currentColor` so navigation, hover, active, disabled, and semantic states are expressed through the surrounding text color.
- **Sizing:** Preserve existing utility-class sizing (`size-3`, `size-3.5`, `size-4`, `size-5`, and so on). Use `strokeWidth={1.5}` for regular text and around `1.8–2` when paired with semibold controls.
- **States:** Use one icon per semantic role; do not swap between icon libraries or introduce filled variants for routine controls. Filled or heavier variants are reserved for active or status-critical states.

### Chips and Icon Tiles
- **Chip:** 32px high, pill-shaped (`rounded-full`), with 12px horizontal padding, 14px semibold text, and no border.
- **Badge palette:** Use reference-derived pastel fills with dark semantic text: neutral `#eeeeed` / `#211d1c`, info and progress `#c6f2fb` / `#29449a`, success `#c9f3df` / `#006331`, warning `#fbedb9` / `#9b2f00`, and danger `#fbdedc` / `#ad001b`. Keep labels explicit so color is never the only status cue.
- **Dense badge sizes:** Compact badges are at least 24px high with 12px text. Micro badges are at least 20px high with 11px text. All badge sizes use `rounded-full`; their larger type and borderless pastel treatment remain mandatory.
- **Icon tile:** 36px square with `rounded-lg`.
- **App icon tile:** 56px square with `rounded-2xl`.

### Navigation
- **Style:** Sidebar and toolbar use translucent material (`bg-card/70 backdrop-blur-xl`) with compact rows (32px), muted inactive state, and grayscale active state.
- **Sidebar frame:** Desktop sidebar fills the viewport edge-to-edge with no outer inset, radius, shadow, or surrounding ring; use a single trailing divider (`border-r` for the left sidebar).
- **Typography:** text-lg font-semibold for the expanded brand mark, text-sm font-medium for items, and text-[11px] font-semibold uppercase tracking-wide for section labels.
- **Hover:** Subtle background shift — no bounce, no motion flourish.
- **Sidebar icon motion:** `SidebarNavItem` is the reusable motion primitive for Dashboard, Library, Search, and all operational navigation. On fine-pointer hover, the icon uses a 180ms `cubic-bezier(0.2, 0, 0, 1)` `scale(1.08)` plus `translateY(-1.5px)`; press feedback reaches `scale(0.92)` and settles with a 350ms spring (`bounce: 0.18`). The SVG stroke width changes subtly through the same 180ms transition. The active surface and left indicator use `layoutId` with the same spring so they travel between items without changing layout.
- **Reduced motion:** `MotionConfig reducedMotion="user"` disables transform/layout movement while retaining the static active surface, color transitions, and click target behavior.
- **Mobile Treatment:** Collapse sidebar to icon-only or bottom tab bar.
- **Action placement:** Keep page-specific primary actions in the page header. Do not duplicate create actions in the global sidebar.
- **Register switching:** Use specific labels such as “Daftar Risiko” and “Pemantauan”; keep the tab list compact at 36px with full-rounded pills, and let a compact count sit beside the register label when it replaces a redundant total card.
- **Responsive shell:** Every main flex child beside the sidebar must use `min-w-0`; page-level horizontal overflow is clipped and wide data tables own their local horizontal scrolling.
- **Main content wrapper:** Every authenticated route uses one shared `mx-auto w-full max-w-[1200px] min-w-0 py-8` wrapper inside `AppShell`. Feature pages must not duplicate this outer geometry; they own only their internal section spacing. The shared `PageStack` then provides `mx-auto w-full min-w-0 space-y-6` as the canonical page composition, matching the centered risk form's 24px grouping rhythm. The design-system catalogue keeps `space-y-12` as a page-specific rhythm.

### Operational Summaries

#### Component Ownership and Imports

- `frontend/src/components/shared/design-system` is the canonical home for composed reusable Manris components.
- Production consumers import composed components only from `@/components/shared/design-system` and must not deep-import category folders.
- `components/ui` remains the low-level shadcn foundation.
- Catalogue examples live under `design-system/examples`, use fixture data, and render production components instead of duplicating their structural classes or behavior.
- The former `components/shared/collection-primitives.tsx` module is removed; its focused components live under the internal `collections` category and are exported through the root Design System API.
- Domain-aware components may remain in the Design System when they receive data and callbacks through props and own no fetching, routing, permission, or page business state.

- **PageStack** is the required outer layout for authenticated feature pages. It owns the shared `mx-auto w-full min-w-0 space-y-6` geometry and page entrance treatment so routes do not repeat those classes. Use a route-specific width only when the content genuinely needs a narrower form or a wider analytical canvas.
- **FormPage** is the centered form variant: `mx-auto w-full max-w-5xl min-w-0 space-y-6 pb-20`. Keep the 5xl content measure for form/detail pages; retain wider exceptions only for workflows that require a true multi-column canvas.
- **CollectionPageHeader** is the canonical header for data collections that follow the operational ledger composition: a borderless page heading with optional eyebrow/icon content, a 30px title, 14px description, and a right-aligned action group. Keep collection actions in this page header when the route has a dedicated title block; do not duplicate them in the global toolbar.
- **MetricGrid** is the shared responsive shell for four-up KPI summaries: one column by default, two from `sm`, and four from `xl`.
- **CollectionToolbar** keeps collection context or tabs on the left and search/filter actions on the right. It lives outside `CollectionTableCard`; the table card contains only data, states, and pagination.
- **Intelligence collection pages** such as Meeting and Document Intelligence use the same `PageStack` + `CollectionToolbar` shell as the risk register. Keep their workflow cards on the neutral `rounded-2xl` collection surface, with actions and review states inside that shared rhythm.
- **CollectionFilterGrid** is the compact filter-row shell for collection pages. Use it without visible labels when the search or select control already carries its intent, and right-align trailing controls with `justify-self-end` so the row reads as a single toolbar line.
- **Collection search rows** should use `ExpandableSearchField` when the page needs a compact, risk-register-style search affordance. If the page also has one primary create/action CTA that competes with filters, place that CTA in a dedicated right-aligned row immediately above the table instead of crowding the toolbar.
- Dense toolbars may use `ExpandableSearchField` when the search affordance must stay minimal. Reference-aligned collection pages with a dedicated title block should use the full-width `CollectionSearchField` row instead, with filter and refresh controls grouped to its trailing edge.
- Mitigation reporting dialogs should reuse the shared `MitigationProgressDialog` shell so evidence and notes fields stay consistent across the compliance and risk workflows.
- The shared mitigation reporting form is `MitigationProgressForm`; use it whenever a mitigation task needs evidence and notes inputs instead of hand-building a local `Input`/`Textarea` pair. Inside a dialog, the form shell is spacing-only (`space-y-4`) so it does not create a second card surface; the dialog owns the single elevated frame and its header has no bottom divider.
- Report dashboards use `CollectionToolbar` in its actions-only composition for filter and export controls. Report actions consume shared `ActionButton` and `AccentButton` variants and must not override accent tokens inline.
- **ReportPanel** is the required shell for report charts and analytical summaries. Pair it with `ReportGrid`, `ReportEmptyState`, `ReportDrilldownSummary`, and `ReportLinkGrid` instead of rebuilding card, empty, drilldown, or report-navigation surfaces inside route pages.
- The `/design-system` route is the canonical catalogue for shared UI patterns. When feature pages introduce a new reusable shell, sync it back into the design-system component folder and this document.
- The design-system catalogue and production data collections must consume generic collection primitives for tabs, table shells, and pagination. Do not encode a route or feature name into these reusable components, and do not duplicate their structural class strings inside route pages.
- Collection table pages should place the heading and toolbar outside the card. The card itself should contain only the table, empty state, and pagination footer.
- Application data tables use the shared ledger header scale: `text-xs` labels, `font-semibold` (600), uppercase casing, `0.05em` tracking, the `table-header` token (`#F9FAFB` in light mode) as the header band, and 24px horizontal header padding. Use `CollectionTableHead density="compact"` only when a table needs the smaller 11px variant. For compact collection headers, `CollectionTableHeader density="compact"` owns a 40px row with zero vertical cell padding so sortable controls do not inflate the header.
- Do not add KPI cards above a register table when the cards only restate the table total or simple category counts.
- Keep the register table as the dominant surface; move a necessary total into compact navigation or table pagination.
- Omit subtitles that merely restate an already-specific register title. Table headers within one table must share a single typography scale.
- Place register search and filter controls on the same responsive toolbar row as the register tabs; stack them only when horizontal space is insufficient.
- Dense table scores use the same body scale as adjacent cells with tabular numerals. Compact status and period badges use the shared full-rounded pill geometry.
- Sortable table headers must use a keyboard-focusable control and expose the current direction with `aria-sort`.
- Period and monitoring indicators must pair color with a visible icon or text cue and an accessible status label; never rely on color or hover-only tooltips.
- Keep compact row actions visible with a sticky trailing column when a table still needs horizontal scrolling. Pagination labels and controls use at least the `text-xs` and 32px control scale.
- Register table cards begin directly with the table header, without an empty padded title band. Their outer shell uses `rounded-2xl bg-card` with the shared smooth elevation. Keep the header divider at `border-b border-border/60` and avoid layered outer borders or rings.
- Sticky action cells inside register tables should keep a white background (`bg-background`) so only the header carries the pale neutral surface.
- Register pagination should live as the table card footer: range text on the left, numbered page controls in the middle, and items-per-page on the right.
- Search fields on bright operational toolbars use the light card/popover surface with a subtle inset border; reserve stronger muted fills for grouped or recessed controls.
- All table headers use the shared pale neutral `table-header` surface (`#F9FAFB`) with muted uppercase labels. Keep the header divider lighter than the body grid, and keep row actions visually quiet with icon-only controls.
- Service, subscription, and other two-line operational tables use the compact ledger geometry by default: 24px horizontal cell padding, a 72px body row, semantic compact status badges, centered toggle controls, and quiet filled text actions. Single-line registers such as Risk Register use `h-10` body rows to preserve scan density. Semantic tables such as alerts, heatmaps, and instructional criteria may opt into their own surface and density through explicit classes.
- Compact status badges must use the shared `Badge` component with semantic `tone` and `size="compact"` or `size="micro"` instead of hand-written class strings.
- Dense code-like identifiers in table rows stay text-only; do not wrap them in filled chips when the row already has a compact badge for state.
- Risk assessment summaries use the shared `RiskAssessmentSummaryStrip` pattern: score block on the left, semantic level badge, optional status badge, compact metrics, and an optional note row.
- Semester indicators, archived banners, AI suggestion dropdowns, progress meters, empty states, and version timelines must be implemented as shared component patterns once they appear in more than one route.
- `MonitoringTransactionProgress` is the shared compact indicator for quarterly monitoring transactions. It always renders four quarter segments and shows finalized transactions over the four quarterly slots (for example, `1/4 transaksi`), uses graphite segments only for final transactions and muted segments for draft or unavailable quarters, and exposes Q1–Q4 context through its accessible label/title. Register tables reserve at least 176px for this column so the segments and count stay visible beside sticky actions.
- Overview dashboard panels must consume the shared `StandardCard` shell instead of duplicating card, header, and content classes. The shell uses a compact divider-free header band (`text-[11px] font-mono font-semibold uppercase tracking-[0.1em]`, `px-4 py-4`) and the shared smooth elevation across charts, heatmaps, list panels, and design-system examples.
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
- **Do** keep the interface monochrome by default and use color only for semantic states and analytics.
- **Do** use text-sm (14px) as the default font size for controls, labels, and body copy.
- **Do** use subtle borders (`border-black/10`) and separators over heavy shadows.
- **Do** use translucent materials (`bg-card/70 backdrop-blur-xl`) for chrome surfaces only.
- **Do** keep hover states quiet and focus states visible.
- **Do** use rounded-lg for controls, rounded-2xl for cards and dialogs, rounded-md for tab buttons.
- **Do** let cards, popovers, and dropdowns breathe with enough edge padding.

### Don't:
- **Don't** use saturated backgrounds or heavy gradients.
- **Don't** use pure black as a neutral surface or text color; use the documented graphite tokens. White is reserved for card and primary-foreground surfaces where the reference palette calls for it.
- **Don't** make every surface glassy or translucent — content should be solid.
- **Don't** use oversized mobile-style controls in desktop layouts.
- **Don't** use rounded-full for every button unless intentionally using pills.
- **Don't** use font-bold excessively — prefer font-medium and font-semibold.
- **Don't** rely only on color for interactive state — use borders, background shift, and focus rings.
- **Don't** use runtime SVG clip-path or JS-based corner smoothing on shared DOM controls.
