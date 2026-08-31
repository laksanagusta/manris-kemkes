---
version: alpha
name: Manris
description: operational design system for risk and incident management. Monochrome, desktop-density controls with Inter and JetBrains Mono typography; semantic color is reserved for meaning.
colors:
  background: "#FBFBFB"
  main-content: "#FBFBFB"
  table-header: "#FCFCFC"
  table-header-foreground: "#737373"
  foreground: "#202020"
  card: "#FFFFFF"
  card-foreground: "#202020"
  popover: "#FFFFFF"
  popover-foreground: "#202020"
  primary: "#202020"
  primary-foreground: "#FFFFFF"
  secondary: "#F6F6F6"
  secondary-foreground: "#525252"
  muted: "#F0F0F0"
  muted-foreground: "#737373"
  accent: "#F0F0F0"
  accent-foreground: "#202020"
  destructive: "oklch(0.58 0.22 27)"
  surface-border: "#E3E3E3"
  field-border: "#EBEBEB"
  shadow-custom: "0px 0px 0px 1px #0000000f, 0px 1px 2px -1px #0000000f, 0px 2px 4px 0px #0000000a"
  component-border: "{colors.surface-border}"
  border: "{colors.surface-border}"
  input: "{colors.field-border}"
  ring: "rgb(32 32 32 / 25%)"
  sidebar: "#FBFBFB"
  sidebar-foreground: "#202020"
  sidebar-muted-foreground: "#646464"
  sidebar-primary: "#202020"
  sidebar-primary-foreground: "#FFFFFF"
  sidebar-accent: "#F0F0F0"
  sidebar-accent-foreground: "#202020"
  sidebar-border: "{colors.surface-border}"
  sidebar-ring: "rgb(32 32 32 / 25%)"
  transparent: "#00000000"
  chart-1: "#00B3DD"
  chart-2: "#847DFF"
  chart-3: "#DD90D8"
  chart-4: "#90B8F0"
  chart-5: "#D1C9FF"
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
    backgroundColor: "#202020"
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
    backgroundColor: "#202020"
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
    border: "{colors.surface-border}"
    rounded: "{rounded.lg}"
    height: "36px"
    padding: "0 14px"
    fontSize: "0.875rem"
    fontWeight: 500
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    border: "{colors.surface-border} at 60%"
    rounded: "{rounded.lg}"
    height: "36px"
    padding: "0 14px"
    fontSize: "0.875rem"
    fontWeight: 500
  button-back:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    border: "none"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 12px"
    fontSize: "0.875rem"
    fontWeight: 400
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
    boxShadow: "shadow-custom"
  card-large:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.2xl}"
    padding: "24px"
    boxShadow: "shadow-custom"
  card-border:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.2xl}"
    padding: "20px"
    boxShadow: "shadow-custom"
  collection-table-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.xl}"
    boxShadow: "shadow-custom"
  dashboard-kpi-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.xl}"
    boxShadow: "shadow-custom"
  risk-analysis-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.xl}"
    boxShadow: "shadow-custom"
  input-default:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    border: "{colors.field-border}"
    rounded: "{rounded.lg}"
    height: "40px"
    padding: "0 12px"
  search-input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    border: "{colors.field-border}"
    rounded: "{rounded.lg}"
    height: "40px"
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

Manris is an operational interface for ministry teams handling risk and incident management under pressure. The visual language feels like a well-kept briefing room: calm, precise, credible, and ready for daily use. The system uses a restrained monochrome palette, compact desktop-density controls, soft rounded corners, and Inter plus JetBrains Mono to keep attention on the task. Color is reserved for data visualization and states that carry meaning.

This system should stay institutionally grounded without becoming stiff. It should reduce panic, surface the next action quickly, and keep high-stakes workflows legible when information is incomplete. The product explicitly rejects decorative chrome, noisy card repetition, flashy gradients, and analytics theater. The authenticated surface should remain quiet and dependable.

**Key Characteristics:**
- Monochrome neutral palette with semantic color reserved for charts and meaningful states.
- Desktop-density spacing — compact but never cramped.
- Inter for interface text and JetBrains Mono for identifiers, metrics, and code-like values.
- Soft borders and restrained shadows over heavy decoration.
- Translucent materials reserved for chrome (sidebar, toolbar), solid surfaces for content.

## Colors

The palette is monochrome by default. Use color only when it communicates status, risk, feedback, or analytical meaning; do not use it as decoration.

### Primary
- **Monochrome Action** (`#202020` light, `#F5F5F5` dark): Primary action, create/add CTA, and dominant operational control.
- **Accent Surface** (`#F0F0F0` light, `#27272A` dark): Neutral supporting surface for selected, hovered, or grouped states.

### Neutral Palette
- **Background / Main Content** (`#FBFBFB` light, `#111111` dark): Explicit authenticated workspace and page surface; the document root stays transparent so routes own their canvas.
- **Sidebar** (`#FBFBFB` light, `#171717` dark): Neutral application chrome with the same restrained divider treatment.
- **Card Surface** (`#FFFFFF` light, `#181818` dark): Card, panel, and window surfaces.
- **Subtle Surface** (`#F0F0F0` light, `#27272A` dark): Shared neutral hover, selected, grouped, and muted fills.
- **Ink** (`#202020` light, `#F5F5F5` dark): Primary text color.
- **Muted Ink** (`#737373` light, `#A3A3A3` dark): Secondary text, helper copy, and metadata.
- **Card Subtitle** (`#525252` light): Supporting description below a card title. Use the `secondary-foreground` token consistently across shared and feature card headers; reserve muted ink for captions, helper text, metadata, and legends.
- **Surface Border** (`#E3E3E3` light, `rgb(255 255 255 / 12%)` dark): Canonical neutral hairline for cards, panels, widgets, wrappers, tables, dividers, sidebar boundaries, and other structural edges.
- **Field Border** (`#EBEBEB` light, `rgb(255 255 255 / 12%)` dark): Canonical neutral hairline for inputs, textareas, selects, searches, comboboxes, checkboxes, and radios.
- **Compatibility aliases:** `component-border` and `border` resolve to `surface-border`; `input` resolves to `field-border`. Existing utility names remain valid while new components should choose the semantic token directly.

### Semantic
- **Risk Low / Success** (`oklch(0.72 0.17 155)`): Low risk, positive states.
- **Risk Medium / Warning** (`oklch(0.78 0.16 85)`): Caution states.
- **Risk High** (`oklch(0.70 0.18 40)`): Elevated risk markers.
- **Risk Extreme / Destructive** (`oklch(0.58 0.22 27)`): Critical conditions.

### Chart palette
- **Cyan Signal** (`#00B3DD` / `--chart-1`): Primary data lines and analytic highlights.
- **Iris Gleam** (`#847DFF` / `--chart-2`): Secondary comparison series.
- **Orchid Bloom** (`#DD90D8` / `--chart-3`): Supporting categorical series.
- **Periwinkle** (`#90B8F0` / `--chart-4`): Supporting categorical series.
- **Pale Iris** (`#D1C9FF` / `--chart-5`): Soft supporting fills and neutral chart states.

Chart colors follow the Origin Financial visual language; risk severity and movement retain the semantic risk tokens above so hue continues to communicate operational meaning.

### Named Rules
**The Monochrome-First Rule.** Use graphite and grayscale tokens for the interface, controls, navigation, and content surfaces. Reserve color for charts, statuses, badges, toasts, risk levels, and other states where hue carries meaning.

**The Neutral Accent Surface Rule.** Generic neutral hover and selected surfaces resolve to the shared sidebar menu surface through `--sidebar-accent`; `--muted`, `--accent`, and neutral button variants must stay aligned with it (`#F0F0F0` in light mode, `#27272A` in dark mode). Semantic hovers for risk, success, warning, and destructive actions keep their meaning-bearing colors.

**The Surface / Field Border Rule.** Structural surfaces use `surface-border` (`#E3E3E3` in light mode); editable and selectable fields use `field-border` (`#EBEBEB` in light mode). The global `border` and `sidebar-border` aliases resolve to the surface token, while `input` resolves to the field token. Destructive, warning, success, risk-level, selection, and focus borders retain their semantic tokens.

Secondary buttons use `border-border/60` so their neutral hairline matches the Card perimeter treatment while remaining distinct from field borders and semantic button states.

**The Transparent Document Root Rule.** Keep `html` and `body` free of decorative background fills and global hover treatments. Apply the `background` token to explicit page, shell, and surface containers; interactive hover states belong to the controls that own them rather than the root document.

## Typography

**Primary Font:** Inter via `next/font/google`.
**Mono Font:** JetBrains Mono for code, IDs, scores, and technical values.

Typography should feel crisp and legible at desktop densities. Inter carries headings and body copy; JetBrains Mono is reserved for identifiers and numeric values. Text-sm (14px) is the default workhorse size.

### Hierarchy
- **Page title** (`page-title`): Optional standalone 24px page heading for component-level contexts; authenticated route pages omit the duplicate in-content heading when the global topbar already carries the page title.
- **App toolbar title** (`app-page-title`): The global topbar's canonical centered page title, rendered at 14px medium. It is the only page-level title on authenticated routes; `CollectionPageHeader` keeps its title optional for catalogue or explicit standalone-header contexts.
- **Brand / Wordmark** (`text-sm font-bold uppercase tracking-[2px]`): The global topbar uses the 14px bold uppercase label (`MANRIS`) without a logo, aligned to the sidebar menu inset. The mobile sidebar wordmark uses `text-base font-normal`; the canonical 4×4 mark remains reserved for the mobile sidebar and browser-tab icon treatment.
- **Section Title** (`text-xl font-semibold tracking-tight`): Internal section headers and card group titles.
- **Headline** (600, larger than body by at least 1.25x): Page titles and primary screen headers. Use `page-title` for the shared treatment.
- **Title** (600, slightly smaller than headline): Card titles and panel labels.
- **Form section title** (`text-sm font-medium tracking-tight`): Section headings inside the risk form use the medium weight so the form hierarchy stays calm and scannable.
- **Dashboard card title** (`font-sans text-xs font-medium capitalize leading-4 text-muted-foreground`): KPI card titles use Inter at 12px with the dark-gray muted foreground token, medium weight, and Capitalize casing; the KPI header adds 4px of bottom breathing room before the value row. Numeric values use Inter at 24px with semibold weight and no inline comparison marker.
- **Body** (400, 0.875rem, 1.5 line-height): Form copy, helper text, task instructions. Keep prose around 65–75ch when possible.
- **Label** (500, 0.875rem): Button text and compact tags.
- **Sidebar text** (400, 0.875rem): Navigation items, section labels, counts, account text, and the mobile wordmark use normal weight. Active state is expressed through surface and color, not font weight.
- **Form field label** (400, 0.875rem): Input, select, textarea, and form section labels use a normal weight for calm scanning.
- **Caption** (`text-xs text-muted-foreground`): Supporting helper text.
- **Micro** (`text-[10px] font-medium`): Dense badges, KPI band labels, compact metadata. Phase labels in the multi-phase overview heatmap are an explicit exception: use `text-xs font-normal uppercase tracking-[0.6px]` (12px with 0.6px letter spacing) for readability.
- **Table action icon** (`ActionIconButton`): Use a 32px neutral card surface with a
  `1px` hairline border for compact overflow actions, preserving the standard
  control radius and focus ring without adding a second elevation layer.

### Named Rules
**The Plain Voice Rule.** Labels and actions should read like trusted workplace software, not marketing copy. Avoid ornament in UI text.

## Layout

Authenticated screens use a sidebar shell, toolbar header, and content region with desktop-density spacing. Input and dropdown controls are 40px high (h-10); standard buttons remain 36px (h-9). Dense controls (sidebar items, menu items) use 32px (h-8). Content uses 16px or 24px padding depending on context.

Responsive overlays remain edge-aware: sheets attach to the viewport edge. Translucent materials (backdrop-blur) are used for chrome surfaces: sidebar, toolbar, titlebar, and modal scrims. Content surfaces remain solid.

### Public Authentication Surface

Public login routes use a centered `min-h-svh` shell with one solid `Card` as
the primary focus. Place the brand mark inside the centered `CardHeader`
above the title; keep labels, helper copy, errors, primary action, and links on
the same visual axis while preserving full-width fields for comfortable entry.
Use the existing card, input, label, and primary button tokens rather than a
second public-only styling system. Password visibility controls must expose an
accessible label, visible keyboard focus, and a 40px hit area. Decorative
background motion and entrance animation must use `motion-safe` and remain
static for reduced-motion users. Login fields should provide semantic `name`
and `autocomplete` metadata so password managers can identify the credentials.

## Elevation & Depth

The system uses subtle layered depth rather than dramatic shadows. Every shared `Card`, table shell, and operational panel uses the canonical `shadow-custom` treatment when it owns a surface boundary. Floating and explicitly elevated non-Card surfaces use the shared smooth-shadow treatment.

### Shadow Vocabulary
- **Card / Table / Panel Shadow** (`shadow-custom`): `0px 0px 0px 1px #0000000f, 0px 1px 2px -1px #0000000f, 0px 2px 4px 0px #0000000a`. This single layered shadow owns both the visible perimeter and the restrained lift, giving surfaces depth without a second hard border.
- **Shared surface utilities** (`border-shadow`, `surface-hairline`): Both resolve to `var(--shadow-custom)`. `border-shadow` is applied by the shared `Card` primitive and table shells; `surface-hairline` is used by non-Card panels, KPI tiles, summaries, and contextual surfaces. Neither adds a hard border around the elevated surface.
- **Control Lift** (`0 1px 1px rgba(0,0,0,0.04)`): Buttons and small interactive controls.
- **Floating Surface** (`smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30`): Menus, dropdowns, tooltips, toasts, and transient overlays.
- **Modal / Sheet Surface** (`smooth-shadow-ring-xl shadow-black smooth-ring-neutral-300/30`): Dialog, AlertDialog, and Sheet surfaces use the larger elevation so the modal layer separates clearly from the frosted scrim.

### Elevated Surface Rule
- Use the shared `Card` default (`border-shadow`) for every Card. Use `surface-hairline` for non-Card dashboard panels, KPI tiles, risk-analysis summaries, collection-table wrappers, and persistent form context surfaces; both utilities resolve to `shadow-custom`. Use `smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30` for compact floating widgets and controls and `smooth-shadow-ring-xl shadow-black smooth-ring-neutral-300/30` on modal and sheet surfaces. Each surface owns only one neutral perimeter.
- Do not stack a separate neutral `border-*` or `ring-*` around the same elevated surface; use rings only for focus or intentional inner boundaries. Semantic states may use their dedicated colored border tokens.
- Keep separators inside the surface (`border-b`, `border-t`) when they divide content rather than outline the surface.
- `Card` owns the `border-shadow` treatment globally. Feature pages should use `surface-hairline` on non-Card card, table, and panel surfaces instead of adding ad hoc border or shadow combinations.

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
- `rounded-md` (6px): Tab, standard button, and sidebar menu item radius.
- `rounded-lg` (8px): Inputs, selects, textareas, search, toolbar buttons, and default field/control radius.
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
- **AccentButton:** Solid `#202020` primary CTA with an 8px radius for create/add flows and other primary task entry points.
- **ActionButton:** Shared compact button for outline, ghost, row actions, dialog actions, and loading states; it uses the same 8px radius as `AccentButton` primary actions.
- **Back action:** Use the secondary surface with `border-0`, `text-sm`, and `font-normal`; pair it with a 14px `ArrowLeft` and a concise label such as `Kembali`.
- **Card-shadow action:** When a collection action needs to share the Card perimeter treatment, use `border-0 border-shadow` on the `ActionButton` so its boundary resolves to the canonical `--shadow-custom` instead of a hard border. Keep the regular outline border for standard supporting actions.
- **ActionIconButton:** Shared icon-only row action with a white `bg-card` resting surface and muted hover state, keeping action affordances distinct from the neutral table background.
- **Shared buttons with `asChild`:** Pass exactly one element child. Place icons and labels inside that child; do not use the wrapper `icon` or `loading` props in `asChild` mode.
- **Tab buttons:** `rounded-md` (6px), `text-xs`, inside a `rounded-lg` container.
- **Tab active state:** Every default shared tab list uses one white active indicator with a subtle `shadow-sm`; it measures the selected trigger and slides beneath it over 300ms with the shared `ease-in-out` curve. Animate the indicator's transform and geometry; tab content changes without directional motion. Disable the indicator transition for `prefers-reduced-motion`. Line-variant tabs retain their underline treatment instead of the sliding pill.
- **Primary:** Solid `#202020` button with white Inter 14px/21px medium text, 36px height, 8px radius, 1px vertical and 12px horizontal padding, 6px icon gap, and no shadow. Used for the main action in a task flow; depth is reserved for elevated surfaces such as cards, modals, and dropdowns.
- **Secondary / Outline:** Neutral surface with border, used for supporting actions.
- **Ghost / Subtle:** Transparent background with hover fill, used for low-priority actions.
- **Hover / Focus:** Light background shift and visible neutral focus ring; no bounce, no motion flourish.
- **Cursor:** Native and role-based interactive controls use `cursor-pointer`; disabled controls use `cursor-not-allowed`. Decorative surfaces and non-interactive text keep the default cursor.
- **Sidebar navigation:** All sidebar text uses `font-normal` (400), including inactive and active items, section labels, counts, account text, and the mobile wordmark. Active state uses surface and color for wayfinding without changing font weight, size, or spacing. Inactive icons use a medium `1.8` stroke weight.
- **Dialog actions:** Dialog and AlertDialog triggers, cancel actions, and confirmation actions use the compact `sm` button size.

### Cards
- **Default:** `rounded-xl` with 16px padding, white surface, and the shared `shadow-custom` boundary.
- **Large:** `rounded-2xl` with 24px padding.
- **Shadow Strategy:** Every Card uses the shared `border-shadow` treatment, which resolves to `shadow-custom`; non-Card operational surfaces use `surface-hairline`, which resolves to the same token.
- **Border:** The shared shadow provides the single visible outer boundary for every Card, panel, and table shell; use internal separators only for content divisions.
- **Dashboard Card:** `rounded-xl` with `bg-card` and the shared `shadow-custom` boundary. KPI cards use a `min-h-28` (112px) baseline without an embedded chart. The title row uses `mb-1 flex items-center px-4 pb-1 pt-3` and the value row uses `flex items-baseline gap-3 px-4 pb-2 pt-0` so the title and number stay directly grouped: 12px Inter medium Capitalize title followed by a 24px Inter semibold number. The card may grow when a long title wraps. Chart and panel cards keep the roomier `px-4 py-4` header band with no divider line. Risk-analysis summary, chart, and history surfaces use the same shared shadow boundary.
- **Card Header:** Use the Dashboard KPI header as the shared card-header pattern: the title row owns 16px horizontal inset with `mb-1 flex items-center px-4 pb-1 pt-3`, and the value row owns the same inset with `flex items-baseline gap-3 px-4 pb-2 pt-0`; render one dark-gray 12px `font-medium` title with Capitalize casing (`font-sans text-xs font-medium capitalize leading-4 text-muted-foreground`). The KPI value uses Inter 24px semibold with no inline comparison marker. When a card has a subtitle or description, render it as supporting context with `text-secondary-foreground` (`#525252` light), not muted ink. Header-and-content cards must use `gap-0 p-0` on the card shell and one `p-4` content inset so the component's default gap does not stack with content padding.
- **Risk Form Sections:** Keep the risk register's identification, analysis, evaluation, treatment, target, and conditional approval-line sections always visible as separate `Card` surfaces. Compose each section with `CardHeader` and `CardContent`; use the shared Card default `border-shadow` and do not use Accordion for this form.
- **Accordion:** Use Accordion only for generic disclosure content that benefits from progressive reveal. When it represents a section shell elsewhere, use the shared smooth elevation and disable the item's default `not-last:border-b` separator (`not-last:border-b-0`). Remove the trigger's default radius, transparent border, and underline behavior so its header band visually matches the KPI card header exactly. Internal header dividers are allowed only when they intentionally separate header and content.
- **Collapsible Card:** Use the shared `CollapsibleCard` compound component for operational disclosures. Compose `Root`, `Trigger`, `Header`, `Icon`, `Text`, `Title`, optional `Description`, optional `Actions`, `Content`, and `Body` through children instead of adding boolean display modes. The shell uses `rounded-xl`, a full-width 16px-inset trigger, a muted 32px circular chevron, 14px semibold title, optional 12px description, a light body divider, and a 200ms grow/collapse animation with reduced-motion fallback.
- **Dashboard Rows:** Inside full-width panels, use a padded outer shell with a full-bleed inner list (`-mx-4` + `divide-y`) when the rows need to touch the card edge consistently.
- **Report category distribution:** Keep the pie chart as the visual focal point and place its category legend beneath it as a full-width responsive grid with a light top divider; use two columns by default and three from `sm` so the legend does not compete with the chart on the side. Render it inside the shared `ReportPanel` on `/reports` so the distribution follows the active report scope and cycle.

### Inputs / Fields
- **Shared field geometry:** Input, Select trigger, SearchInput, InputGroup, and Combobox chips use 40px (`h-10`) height, `field-border` for their neutral field boundary, `bg-card`, and text-sm. Textarea keeps the same surface and state styling while growing vertically; Checkbox and Radio retain their intrinsic control size.
- **Field primitive rule:** Feature pages compose visible text, search, select, and textarea controls from the shared field primitives. Native controls remain only for hidden file uploads and range sliders, which have distinct browser interaction semantics. Custom popover-backed field triggers must reuse `field-border`, remain visually stable when pressed, and use a 150ms chevron rotation on open. Page-level geometry selectors may set size, radius, and surface, but must not override the shared active-field state.
- **Required labels:** Labels for required fields show a red asterisk immediately after the label text; optional fields omit the marker. Keep the asterisk as a visual cue alongside the field's existing validation semantics.
- **Single-field grid span:** When a responsive two-column form group contains only one field, the field must span the full group (`md:col-span-2`) so its control reaches the card edges instead of leaving an accidental half-width column.
- **Search:** 40px high (h-10), `rounded-lg` (8px), 12px horizontal padding, card surface, and the same input border/focus treatment.
- **Focus:** Text, textarea, search, and select fields keep the `--ring` border with an explicit, high-contrast `focus-visible` indicator; do not rely on a low-contrast background shift alone. `SelectTrigger` keeps the same neutral border while its chevron rotates on open; semantic invalid states retain their dedicated red border/ring.
- **Error / Disabled:** Use semantic red for invalid state and a clearly visible muted disabled-field treatment (`disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 disabled:cursor-not-allowed`, with `dark:disabled:bg-input/80`) for read-only or disabled inputs, textareas, and select-like controls. Risk Register fields must match the muted read-only treatment used by the disabled `Input`/`Textarea` fields in the Detail Aktivitas Log modal.
- **Mobile form controls:** Feature forms may promote input text to `text-base` on mobile where zoom prevention is required; the shared desktop baseline remains text-sm. Inline validation messages use at least `text-xs` with readable line-height. Mitigation validation errors retain `role="alert"` and reveal in 150ms with opacity plus a 4px transform using the shared strong ease-out; `motion-safe` keeps them immediately static under reduced motion.

### Overlays and Groups
- **Modal:** `rounded-xl` with 20px padding and the shared smooth elevation.
- **Modal family:** All `Dialog`, `AlertDialog`, and `Sheet` surfaces use the solid `bg-card` surface, 20px (`p-5`) outer inset, `rounded-xl` geometry where the surface is centered, the shared `smooth-shadow-ring-xl shadow-black smooth-ring-neutral-300/30` elevation, the frosted scrim, hidden scrollbar chrome, and the shared 200ms strong ease-out transition. Preserve explicit width and scrolling variants only when the content requires them; do not introduce a second local modal shell.
- **Modal composition:** Compose modal content through the existing compound primitives (`DialogHeader`, `DialogTitle`, optional `DialogDescription`, body children, and `DialogFooter`). Keep headers borderless, keep footer dividers internal, use `CollectionDialogCancel` for the medium outline cancel action, and use `AccentButton` for the primary action.
- **Modal task flows:** Selection and creation flows, such as the working-paper period picker, reuse the same shell as mitigation reporting: no duplicate close control when the footer has an explicit cancel action, a compact title hierarchy, a labeled field, and the shared `CollectionDialogCancel` / `AccentButton` pairing. Backed selection controls in these flows use the same `Popover` + `Button` + option-list pattern as the risk form; do not use the Radix `SelectItem` collection for these selectors. Keep the header, field, and footer reveal rhythm at 0/40/80ms with `motion-safe` and preserve the reduced-motion fallback.
- **Monitoring workflow actions:** Keep monitoring creation and finalization CTAs inside the dedicated Pemantauan workspace. The Risk Register remains focused on risk profile data and lifecycle actions; it must not duplicate monitoring tabs, progress widgets, or reassessment dialogs.
- **Shared modal shell:** `DialogContent` uses `w-[calc(100%-2rem)] max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain no-scrollbar rounded-xl bg-card p-5` with `smooth-shadow-ring-xl shadow-black smooth-ring-neutral-300/30`; `AlertDialogContent` keeps the same treatment at `max-w-lg`. The compound header uses a compact `gap-1` rhythm, while the compound footer uses an internal `border-t border-border/70` divider, `px-5 py-4` inset, and compact actions. Explicit `max-w-*` overrides remain available for intentionally expanded dialogs.
- **Form modal:** Compose `DialogHeader`, body sections, and `DialogFooter` as siblings inside the shared shell. The canonical mitigation form uses `max-w-2xl`, a 16px title, no subtitle or close icon, 14px labels, required evidence and notes fields with explicit required semantics, `space-y-5` between fields, and an explicit `flex flex-col gap-2` (8px) layout between each label and its field. Its footer uses the shared outline cancel action at the default medium size with `smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30` and no separate border, plus a primary submit action with a clear loading label; active text fields use one black border with no additional gray focus ring. Dynamic content is handled by the shared modal scroll boundary, which keeps overflow scrolling available while hiding the scrollbar chrome in the mitigation report modal. Dialog and AlertDialog enter/exit motion uses `duration-200 ease-(--ease-out)` over the existing frosted scrim, and is disabled under `prefers-reduced-motion`. Mitigation progress content reveals in a restrained 0/40/80ms header/form/footer stagger using opacity and 4px transform only; `motion-safe` removes the reveal for reduced-motion users. Detail-to-report handoffs close the detail dialog first and open the report dialog from its `animationend` exit lifecycle; reduced-motion users advance on the next animation frame.
- **Bottom sheet:** `rounded-t-2xl` with 20px padding and the same `smooth-shadow-ring-xl shadow-black smooth-ring-neutral-300/30` elevation as modal dialogs.
- **Dropdown:** `rounded-2xl` with solid popover surface and subtle ring.
- **Popover:** `rounded-xl` with solid popover surface and subtle ring. All `PopoverContent` instances inherit this radius; feature overrides must not replace it with another radius.
- **Toast:** `rounded-2xl` with 10px vertical and 14px horizontal padding.
- **List group:** `rounded-2xl` with clipped overflow.
- **Segmented control (TabsList):** `rounded-lg` with 4px internal padding, tab buttons `rounded-md`.

### Iconography
- **Source:** All application icons use Hugeicons through the shared `frontend/src/components/ui/icons.tsx` compatibility layer. Feature code must import from `@/components/ui/icons` instead of importing an icon package directly.
- **Weight:** Keep icons in the same outline family and use `currentColor` so navigation, hover, active, disabled, and semantic states are expressed through the surrounding text color. Sidebar icons and labels use `#646464` in light mode (`text-sidebar-muted-foreground`) when inactive, with `font-normal` labels and `1.8` icon stroke weight; active items use `text-sidebar-accent-foreground` without a heavier font tier.
- **Sizing:** Preserve existing utility-class sizing (`size-3`, `size-3.5`, `size-4`, `size-5`, and so on). Use `strokeWidth={1.5}` for regular text and around `1.8–2` when paired with semibold controls.
- **States:** Use one icon per semantic role; do not swap between icon libraries or introduce filled variants for routine controls. Filled or heavier variants are reserved for active or status-critical states.

### Chips and Icon Tiles
- **Chip:** 32px high, pill-shaped (`rounded-full`), with 12px horizontal padding, 14px semibold text, and no border.
- **Badge palette:** Use the shared shadcn custom-color pattern with soft light/dark pairs: neutral `zinc`, progress `blue`, success `green`, warning `amber`, danger `red`, and info `sky` (`bg-*-50 text-*-700 dark:bg-*-950 dark:text-*-300`). Keep labels explicit so color is never the only status cue. Sidebar notification counts are the exception: render them as plain tabular numbers without a badge pill.
- **Dense badge sizes:** The shadcn base badge is 20px high with 12px text. Compact badges are 24px high; micro badges are 20px high with 11px text. All badge sizes use the shared rounded geometry and semantic light/dark color pairs.
- **Icon tile:** 36px square with `rounded-lg`.
- **App icon tile:** 56px square with `rounded-2xl`.

### Navigation
- **Style:** Sidebar and toolbar use translucent material (`bg-card/70 backdrop-blur-xl`) with compact rows (32px), `#646464` inactive text/icons in light mode, and grayscale active state.
- **Sidebar notification count:** Show pending inbox totals as a plain right-aligned tabular number without a filled badge or pill; hide it when the count is zero and in the collapsed icon rail.
- **Sidebar frame:** Desktop sidebar fills the viewport edge-to-edge with no outer inset, radius, shadow, or surrounding ring; use a single trailing divider (`border-r` for the left sidebar).
- **Sidebar footer boundary:** Use a 40px (`-top-10 h-10`) transparent-to-sidebar overlay above the Help/account footer with `backdrop-blur-md`, no hard divider, and `pointer-events-none` so the transition cannot block navigation.
- **Brand mark:** `/frontend/public/logo.svg` is the light-surface logo: sixteen `#202020` circles in a complete 4×4 grid. `/frontend/public/icon.svg` and the app favicon use the same grid in white on a `#202020` rounded square for browser-tab contrast.
- **Typography:** text-base font-normal for the mobile brand wordmark, text-sm font-normal for items and account text, and text-xs (12px) font-normal uppercase with `0.6px` letter-spacing for section labels. Active state does not change font weight.
- **Hover:** Subtle background shift — no bounce, no motion flourish. Sidebar menu hover and active surfaces use the same `rounded-md` (6px) radius as standard buttons.
- **Sidebar icon motion:** `SidebarNavItem` is the reusable motion primitive for Dashboard, Library, Search, and all operational navigation. On fine-pointer hover, the icon uses a 180ms `cubic-bezier(0.2, 0, 0, 1)` `scale(1.08)` plus `translateY(-1.5px)`; press feedback reaches `scale(0.92)` and settles with a 350ms spring (`bounce: 0.18`). The SVG stroke width changes subtly through the same 180ms transition. Inactive icons and labels use `#646464` in light mode, with `font-normal` labels and `1.8` icon stroke weight; active icons follow the dark active label color without a heavier font tier. The neutral active surface uses `layoutId` with the same spring so it travels between items without changing layout; do not add a decorative left indicator. Sidebar menu rows use a compact 4px vertical gap so hover surfaces remain visually distinct.
- **Sidebar hierarchy:** Keep the most frequent operational path first: `Dashboard`, `Daftar Risiko`, `Penanganan`, `Pemantauan`, `Kertas Kerja`, `Persetujuan & TTE`, and `Evaluasi`. Follow it with `TATA KELOLA RISIKO` (`Piagam Manris`, `Struktur Kinerja`, `Eskalasi Risiko`), `LAPORAN`, `AI & OTOMASI`, and one consolidated `ADMINISTRASI` group containing `Pengguna`, `Organisasi`, and `Grup`. Pair operational destinations with semantic icons: `ClipboardCheck` for Penanganan, `MonitorDot` for Pemantauan, `FileText` for Kertas Kerja, and `FileSignature` for Persetujuan & TTE. Filter `Pengguna` and `Organisasi` to Super Admin while keeping `Grup` available inside the user's organization scope. Use `Laporan` for the `/reports` destination so the sidebar label matches the page title. Keep section labels in Indonesian for the ministry-facing interface; retain established product names such as `Document Intelligence` only when they are the user-facing feature name.
- **Reduced motion:** `MotionConfig reducedMotion="user"` disables transform/layout movement while retaining the static active surface, color transitions, and click target behavior.
- **Mobile Treatment:** Collapse sidebar to icon-only or bottom tab bar.
- **Action placement:** Keep page-specific primary actions in the page header. Do not duplicate create actions in the global sidebar.
- **Risk Register collection:** Keep the register as one focused collection with compact filters, sorting, pagination, and lifecycle actions. Its toolbar exposes only the relevant import and create actions; do not add a manual refresh action. Keep monitoring out of a secondary tab, but retain a compact `Pemantauan` progress column in the register and expose `Mulai Pemantauan`/`Lanjutkan Pemantauan` from row actions with a cycle selector; show the progress as a numeric fraction such as `2/4` without the word `transaksi`. Remove the separate `Kode` column and place the code above the title inside the `Risiko` column. Use `text-muted-foreground` for table metadata and labels, keep the risk title as primary foreground, and preserve semantic badge colors for status meaning; the detailed transaction workflow belongs to the dedicated `Pemantauan` workspace. The row overflow action uses the same ghost `ActionButton` with `icon-xs` sizing as the Evaluasi table.
- **Inbox approval collection:** Keep the approval inbox table focused on `Kode`, `Entitas`, `Jenis`, `Tanggal`, and `Status`. Omit `Unit Kerja`, `Pemohon`, and `Tindakan`; the linked entity title remains the read-navigation path and the table stays compact without a redundant action column.
- **Responsive shell:** Every main flex child beside the sidebar must use `min-w-0`; page-level horizontal overflow is clipped and wide data tables own their local horizontal scrolling.
- **Global topbar:** Authenticated pages use a persistent, pinned 56px topbar above the sidebar and main content, with a bold text-only uppercase `MANRIS` wordmark using `2px` letter spacing aligned to the sidebar menu inset, an organization access selector filtered to the user's `accessibleOrgIds`, and the current page context centered. Global users also receive a `Semua Organisasi` scope option. The organization selector uses a non-modal dropdown so opening its overlay does not lock the document scrollbar or shift the centered page context. The trailing rail stays intentionally quiet so the header does not compete with page actions; AI Tools remains available from the sidebar's `AI & OTOMASI` section. The shell reserves the topbar height so content is never obscured while the page scrolls. The desktop sidebar begins below the topbar and follows its expanded/collapsed width; mobile keeps the sidebar trigger and compact `MANRIS` wordmark in the topbar. Keep the logo/workspace area free of a bottom border while the content rail may retain the chrome boundary; do not duplicate the workspace wordmark inside the desktop sidebar.
- **Main content wrapper:** Every authenticated route uses one shared `mx-auto w-full max-w-[1400px] min-w-0 pb-8` wrapper inside `AppShell`. Its top spacing is inherited directly from the `SidebarInset` horizontal/vertical inset (`p-4 md:p-6`), so the content starts with the same 16px mobile or 24px desktop spacing on every side. The global topbar owns the canonical page title; `AppHeader` and route-level `CollectionPageHeader` instances omit duplicate titles while preserving page actions and context. Feature pages must not duplicate this outer geometry; they own only their internal section spacing. The shared `PageStack` then provides `mx-auto w-full min-w-0 space-y-6` as the canonical page composition, matching the centered risk form's 24px grouping rhythm. The design-system catalogue keeps `space-y-12` as a page-specific rhythm. Pages may choose a narrower internal measure when the content benefits from a shorter reading line.

### Operational Summaries

#### Component Ownership and Imports

- `frontend/src/components/shared/design-system` is the canonical home for composed reusable Manris components.
- Production consumers import composed components only from `@/components/shared/design-system` and must not deep-import category folders.
- `components/ui` remains the low-level shadcn foundation.
- Catalogue examples live under `design-system/examples`, use fixture data, and render production components instead of duplicating their structural classes or behavior.
- The former `components/shared/collection-primitives.tsx` module is removed; its focused components live under the internal `collections` category and are exported through the root Design System API.
- Domain-aware components may remain in the Design System when they receive data and callbacks through props and own no fetching, routing, permission, or page business state.

- **PageStack** is the required outer layout for authenticated feature pages. It owns the shared `mx-auto w-full min-w-0 space-y-6` geometry and page entrance treatment so routes do not repeat those classes. Use a route-specific width only when the content genuinely needs a narrower form or a wider analytical canvas.
- **Dashboard spacing:** `/overview` keeps `CollectionPageHeader` as the first child of `PageStack` for shared actions/context, but its duplicate title is omitted. The global topbar remains the canonical page title and the first content inset aligns with the shell's horizontal spacing.
- **Back action:** Semua tombol navigasi kembali memakai `ActionButton` variant `secondary`, size `sm`, gap 8px, ikon `ArrowLeft` ukuran 14px, surface solid tanpa border (`border-0`), dan teks 14px normal (`text-sm font-normal`). Label boleh menyebut tujuan pada konteks detail, tetapi tetap ringkas; aksi konfirmasi seperti `Kembali tanpa menyimpan` mengikuti hierarki dialognya sendiri.
- **Form field labels:** Label input pada form memakai `text-sm font-normal`; bobot medium tetap untuk label tombol, navigasi, metadata, dan status yang memang membutuhkan penekanan.
- **Finalized risk form:** Form risiko dengan status `final` bersifat read-only. Semua field terkunci, termasuk selector RO dan Periode asesmen, agar metadata versi final tidak dapat diubah dari form tersebut.
- **FormPage** is the centered form variant: `mx-auto w-full max-w-5xl min-w-0 space-y-6 pb-20`. Keep the 5xl content measure for form/detail pages; retain wider exceptions only for workflows that require a true multi-column canvas.
- **Form with contextual side panel:** When a long form needs persistent navigation, progress, or review context, use a wider `max-w-[1400px]` grid with `xl:grid-cols-[minmax(0,1fr)_360px]` and `xl:items-start`. Keep the form as the dominant first column and keep the side-panel grid item unpositioned with `self-start` so the first form card and context card share the exact same top edge. Place `xl:sticky xl:top-20` on an inner side-panel wrapper instead of the grid item; this preserves the 56px topbar plus 24px desktop content inset while preventing sticky positioning from changing initial grid alignment. Do not add margin or transform corrections for this alignment. Use the shared Card default (`border-shadow`) for the persistent context shell. Let it stack below the form on narrower viewports. The borderless header uses the same full shell measure as the two-column grid, with the back action at the leading edge and the primary action group at the trailing edge aligned to the context panel. The Risk form back action uses the secondary `ActionButton` variant with the concise `Kembali` label.
- **Context side-panel sections:** Within a persistent form side panel, remove a generic “Navigasi” title and avoid tabs when Progress, Log, and Version History are parallel context. Present every section heading with a 12px (`text-xs`) semibold uppercase label using `text-muted-foreground/70` and `0.6px` tracking, separated by spacing and a light/dashed divider; use a vertical timeline/list for version history and keep each section independently discoverable. Log uses a compact activity feed without a nested card or avatar: show concise activity copy and a relative timestamp; make the row open a detail modal for full notes, metadata, and links, with the add-log action kept as a quiet trailing action below the feed. The detail modal reuses the add-log form shell and presents read-only values through disabled `Input` and `Textarea` fields. Side-panel Log and Version History previews show only the five newest items and expose a modal action for the complete scrollable list. Mitigation progress summary counts use a compact monochrome vertical list with no divider and right-aligned `tabular-nums`; the compact side panel omits the task detail/report table and keeps only the summary counts.
- **CollectionPageHeader** is the canonical header primitive for authenticated route pages that follow the operational ledger composition: a borderless content header with an optional title (`showTitle`), back action, eyebrow/context, icon, and right-aligned action group. Production routes leave `showTitle` off because the global topbar is the single page-level title; the header still owns route-specific back actions, badges, and actions. When `showTitle` is enabled for a catalogue or explicit standalone context, use the fixed 24px title and title-row action placement as documented. When a form uses a wider outer shell, constrain the header to the same full shell measure as its two-column content grid so the leading and trailing edges stay aligned with the form and context panel.
- **Working paper creation form** uses `CollectionPageHeader` with the same back-action pattern as the Risk form, a compact assessment-cycle badge, and the primary `AccentButton` aligned to the right-side action group. The global topbar remains the single page title; the in-content header omits its duplicate title while retaining the route context and actions. Align the `CollectionSearchField` in the `FormSection` action slot so it shares the action row on desktop and stacks naturally on smaller screens. Use the wider `max-w-7xl` shell for the roster table, keep both form sections on their documented `FormSection`/`Card` surfaces, and use `CollectionSearchField`, `CollectionTableCard`, `CollectionTableHeader`, `CollectionTableHead`, `CollectionLoadingState`, and `CollectionEmptyState` for the roster workflow. Section headings carry enough context on this route, so omit redundant count badges and helper descriptions to keep the hierarchy compact. Risk codes and periods use monospace text, while status meaning stays in shared semantic badges; omit technical source-version metadata from the selection roster. Both risk-selection and signatory tables use the canonical `CollectionTableCard` shell with one structural hairline, visible rounded perimeter, and no route-local border or shadow. Integrate select-all and row checkboxes into the `Kode` column so there is no empty checkbox-only column. Exclusion is a binary roster decision and does not require an explanation field. Use a fluid `w-full table-fixed` layout with proportional columns; do not force a `min-width` or horizontal scroll for the risk-selection roster. Long code, period, title, and status values truncate safely with a native tooltip where needed. The confirmation uses the canonical `AlertDialog` shell with a compact numeric summary, a `Batal` outline dismiss action, and a primary submit action.
- **MetricGrid** is the shared responsive shell for four-up KPI summaries: one column by default, two from `sm`, and four from `xl`.
- **Collection KPI card (`KpiCard`)** is the shared summary card for operational and collection pages. Use its white tone by default with the canonical `surface-hairline`, `min-h-[108px]`, `rounded-xl`, `px-4 py-4`, 12px medium label, and 24px semibold value. Keep semantic color in supporting icons or statuses only; do not add route-local card height, padding, radius, ring, background, or typography overrides.
- **Penanganan collection table:** Use a five-column layout with 44% for `Rencana Penanganan`, 18% for `PIC`, 14% for `Deadline`, 12% for `Status`, and 12% for `Aksi`. Combine the risk code into the plan metadata as `kode · judul`; render PIC with `text-muted-foreground`; and format deadline dates like the Pemantauan `Finalisasi` column with the `id-ID` `dd MMM yyyy` format.
- **CollectionToolbar** is the canonical two-zone row for collection controls: `leading` owns search and filters at the leading edge, while `actions` owns create, export, refresh, and other page actions at the trailing edge. Keep the gap between the zones flexible, stack them in source order below the content-fit breakpoint, and keep the toolbar outside `CollectionTableCard`; the table card contains only data, states, and pagination.
- **Working-paper creation roster:** Keep `CollectionPageHeader` focused on the assessment-cycle badge and primary action; do not add a page subtitle. Keep both roster tables inside the canonical `CollectionTableCard` wrapper with its rounded hairline perimeter; use the fluid `w-full table-fixed` layout for risk selection. Put the select-all and row checkboxes inside the `Kode` column so the roster has no empty checkbox-only header column while selection remains available.
- **Working paper detail:** Use a `max-w-[1400px]` `FormPage` shell so the monitoring ledger gets a wide main canvas while the context rail remains readable. Use `CollectionPageHeader` with the same back-action, typography, and right-aligned action-group alignment as other operational pages, and hide the global `AppHeader` on the detail route so the page has one title hierarchy. Keep actions as a fragment so the shared header owns the single action wrapper; do not use title-row placement or add a route-local flex wrapper around the group. Use the shared `AccentButton` for primary header actions, keep secondary status actions and `Ekspor Excel` inside the shared `Tindakan` popover, and use the shared alert-dialog action sizing for confirmations. Detail confirmation modals must follow the shared `AlertDialogHeader` composition with title and description together, then the standard footer action group. Use a two-column detail shell with `minmax(0,1fr)` as the main column and a 380px context rail on large screens. Keep the full-width `CollectionTableCard` monitoring ledger in the main column; move `Ringkasan dokumen` and `Monitoring Final` into the right rail above `Status Tanda Tangan` so operational status stays grouped with signing context. Keep the `Kode` cell focused on the risk code, expose the snapshot version in a dedicated `Versi` column, render the observed score level as text-only, and use a compact semantic `Badge` for monitoring status so state remains easy to scan without relying on color alone. Match the Risk Register ledger with a compact 40px header, single-line `h-10` body rows, `w-full table-fixed` layout, and proportional columns; truncate long titles and status labels so the table does not force horizontal scrolling. The signature timeline keeps its connector extending through the marker offset so consecutive steps read as one continuous path. In the summary card, keep 24px (`gap-6`) between the title and the item group, then render metadata as a vertical list with 16px (`gap-4`) between item blocks while retaining 8px (`gap-2`) between each label and value. Let the columns stack on smaller screens. The shared `CollectionTableCard` owns `w-full min-w-0` so a table fills its available column without introducing route-local width overrides.
- **Monitoring read-only ledger:** The `Pemantauan` collection is roster-first: build its rows from the selected Kertas Kerja snapshot so `Belum Dimulai` remains visible even when no transaction has been created. For non-global users, scope the primary ledger to the user’s home organization (`organizationId`) only, while the supporting `Rekap per Organisasi` widget uses the user’s accessible organization scope so child organizations remain visible; global users retain the global view. Keep the page read-only, reserve mutations for the owner flow on the Risk page, and let the row/title provide the read-navigation path. The summary uses three KPI states (`Belum Dimulai`, `Berlangsung`, `Final`) followed by `Progress keseluruhan`; place `Daftar status pemantauan` immediately after that progress card as the primary ledger, then show the organization-summary disclosure. Parent summaries aggregate descendants in the supporting scope and never grant mutation rights. Reuse the risk-register collection grammar for search by code/risk, filter, cycle selection, refresh, table pagination, and URL-persisted state. The primary roster omits redundant `Organisasi` and `Aksi` columns; render source scores as muted historical references and observed scores with explicit semantic level badges without status icons. Do not rely on color alone.
- **Monitoring workspace:** A monitoring draft is a structured operational record, not a score-only form. Keep the cycle and source version visible in the header, collect observed score through the shared `RiskScorePickerTrigger` + `RiskScoreHeatmapModal`, then mitigation progress, profile revision, change reason, and conclusion in that order, and keep the baseline risk as a compact floating reference pill. Use the canonical `CollectionPageHeader` with a constrained `max-w-[1400px]` shell and `xl:grid-cols-[minmax(0,1fr)_360px]` form/sidebar layout. Form sections consume the same shared `CollapsibleCard` composition as Monitoring Overview so trigger geometry, chevron motion, header hierarchy, divider, and collapse behavior stay identical. Draft actions must expose save state (`Belum disimpan`, `Menyimpan…`, `Tersimpan HH:mm`) and warn before leaving with unsaved changes through the shared `AlertDialog`. Inline validation must expose error relationships to assistive technology and focus the first invalid field. Load failures distinguish not-found from recoverable network/server errors and provide a retry action. Finalized monitoring changes the title to `Hasil Pemantauan Risiko`, shows finalized metadata and a link to the resulting risk version, and remains read-only.
- **Monitoring baseline floating pill:** On the monitoring workspace, keep the source code/version, baseline score, probability/impact, target score, and risk level in a compact bottom-centered fixed pill. Use a black high-contrast translucent material with white regular-weight text, preserve a 44px detail target, keep the source context available while the user scrolls through fields, and let the pill collapse horizontally on narrow screens without obscuring the form. The risk level remains visible on narrow screens, the scrollable content exposes a visible affordance and keyboard focus, and the fixed offset includes the device safe-area inset. Reserve bottom breathing room in the page shell, keep the pill non-blocking outside its detail action, and respect reduced-motion/reduced-transparency preferences.
- **Monitoring summary surfaces:** The persistent sidebar owns the single bordered shell and follows the risk-register side-panel Card grammar (`rounded-2xl`, `px-5 py-5`, 10px section titles, 12px summary content, and `space-y-6` between panels). Use the shared Card default (`border-shadow`) for the shell. The monitoring conclusion uses a compact list of labeled sections with subtle dashed separators (`border-border/50`); score, target, evaluation, and effectiveness rows stay within the parent shell without nested cards or elevation, with target progress grouped under the score-change section. Keep the target group focused on the score pair, progress meter, and one concise status line rather than a repeated subheading. Keep the evaluation result on one line in the 360px sidebar (`whitespace-nowrap`) so the conclusion reads as a compact comparison. Place the mitigation-reporting summary in this same right-side shell below a dashed divider. Show only progress, total mitigations, reported count, pending count, and an inline disclosure for the mitigation list; each actionable row opens the shared report modal from a compact trailing `Lapor` button. Do not navigate away from the monitoring form or render the task-detail/report table inside the 360px sidebar. Status badges use the shared Design System `Badge` tones (`success`, `warning`, `danger`, or `neutral`) instead of route-local color classes. Empty summary states use a dashed neutral surface instead of a nested card.
- **Monitoring finalization:** Finalization is a deliberate commit. The confirmation surface must summarize cycle, source-to-observed score, resulting version, profile changes, and pending mitigation count. Pending mitigation reports are a visible warning and follow-up link, not an invisible error. The backend creates an immutable risk snapshot for every finalized monitoring mode so the ledger, UI, and version history share one source of truth. Keep the finalization action disabled while saving and retain the dialog while the request is in flight.
- **Working paper risk-progress disclosure:** Keep the `Progress Kertas Kerja` disclosure in the Kertas Kerja collection, where it shares context with the roster and TTE progress. Compose it from the shared `CollapsibleCard` API, start it collapsed so the working-paper ledger remains primary, and describe the metric as the percentage of final risks in the currently displayed working-paper results. The expanded body uses the collection table grammar for organization, period, progress bar, and final-count columns; keep loading and empty states neutral and explicit.
- **Monitoring organization-summary disclosure:** Keep `Rekap per Organisasi` as a `CollapsibleCard` below the Monitoring status ledger, initially collapsed so the first view stays focused on the primary monitoring ledger. Keep the selected cycle badge in `Actions` and reuse the shared trigger, keyboard focus treatment, grow/collapse animation, and collection table grammar.
- **CollectionPagination** is the shared footer pattern for data collections: keep the range summary at the leading edge, numbered page controls in the middle, and the page-size selector at the trailing edge. Feature collections may pass a narrower `pageSizeOptions` list when their default density or workflow requires it; the default options remain `10 / 20 / 50 / 100`.
- **Intelligence collection pages** such as Meeting and Document Intelligence use the same `PageStack` + `CollectionToolbar` shell as the risk register. Keep their workflow cards on the neutral `rounded-2xl` collection surface, with actions and review states inside that shared rhythm.
- **Document Intelligence workspace:** Treat the document as the primary object, not a single upload form. Use a desktop-first two-area layout (`minmax(0,1fr) 320px`) with setup/history sections in the main canvas, a neutral spatial index, and a closable inspector. The empty state uses one large dashed drop zone for one PDF, image, DOCX, or spreadsheet up to 1 MB; show validation inline and keep the valid selection when a dropped batch contains an invalid extra file. The new-process setup follows the risk form grammar through `FormSection`, stacked labels, 40px input and dropdown controls, and neutral select surfaces; the process name is generated automatically from the selected quarterly cycle, with no manual name or organization-ID field. After upload, replace the drop zone with the selected-file card and `Start processing` action. During processing, expose an explicit job header, completed-task progress, compact parallel task lanes, and a factual activity timeline; do not use a large spinner or fake continuous progress. Spatial index pages are small thumbnail cards grouped by domain-relevant pastel accents (`Risk register`, `SOP & controls`, `Audit & findings`, `Planning & performance`, `Supporting documents`), with one selected outline and source-linked findings. Use `layout` animation with a critically damped spring (`bounce: 0`, roughly 180–400ms perceptual duration) for staged card entry and regrouping; respect `motion-reduce` and keep pulse limited to running status. Completed and partial states keep the spatial index visible, summarize documents/pages/categories/findings/warnings/duration, group findings by severity, and expose `Open source`, `Review finding`, `Export result`, `Download report`, and `Start new process`. Persist job summaries locally behind an adapter interface so backend processing can replace the deterministic mock without changing the surface contract; recovery actions must preserve completed progress and allow task-level retry.
- **CollectionFilterGrid** is the compact filter-row shell for collection pages. Use it without visible labels when the search or select control already carries its intent, and right-align trailing controls with `justify-self-end` so the row reads as a single toolbar line.
- **Collection search rows** should use `ExpandableSearchField` when the page needs a compact, risk-register-style search affordance. Persistent `CollectionSearchField` controls use content-fit width (`w-full sm:w-80 sm:flex-none`) rather than filling the desktop toolbar; they may become full-width on mobile when the controls stack. If the page also has a primary create/action CTA, keep search and filters in the toolbar's leading zone and place the CTA in the trailing action zone immediately above the table.
- Dense toolbars may use `ExpandableSearchField` when the search affordance must stay minimal. Reference-aligned collection pages with a dedicated title block should use the full-width `CollectionSearchField` row in the leading zone, with filter controls beside it and refresh/export/create actions grouped in the trailing zone.
- Mitigation reporting dialogs should reuse the shared `MitigationProgressDialog` shell so evidence and notes fields stay consistent across the compliance and risk workflows. The mitigation detail dialog uses the same no-scrollbar shell, title hierarchy, medium footer actions, and 0/40/80ms header/body/footer reveal as the report dialog. Its informational fields use borderless metadata rows: muted 14px labels followed by icon- or dot-led values, with 8px label-to-value spacing, a 16px gap within the primary metadata group, and a 24px gap before evidence/notes. Detail metadata cards, such as working paper summaries, reuse this same borderless two-column pattern instead of nested card surfaces. There are no input-like borders or nested elevated cards; editable report fields remain the bordered shared input/textarea primitives. Long names, URLs, and notes wrap inside the modal instead of clipping. On desktop, the detail footer anchors `Tutup` to the leading edge and the primary progress action to the trailing edge; on mobile, the primary action remains above the secondary close action. When a detail dialog opens the report flow, the handoff is sequential and reduced-motion-safe rather than opening both modal layers at once.
- Mitigation tables inside an existing form or panel surface are spacing-only: do not add a second `rounded-xl bg-card/80` shell or elevation. They omit an inline search panel and reuse the risk-register ledger grammar: pale `table-header`, compact 40px header, 10px body rows, quiet hover state, shared uppercase header typography, consistent cell padding, and a sticky trailing action column. Use a fluid `w-full table-fixed` layout without horizontal scrolling at the form's content measure. A single `rounded-xl border border-border/60` may define the table boundary when the form needs the same structural edge as the risk register, but it must not add a second background or elevation.
- The shared mitigation reporting form is `MitigationProgressForm`; use it whenever a mitigation task needs evidence and notes inputs instead of hand-building a local `Input`/`Textarea` pair. Inside a dialog, the form shell is spacing-only (`space-y-4`) so it does not create a second card surface; the dialog owns the single elevated frame and its header has no bottom divider.
- Report dashboards use `CollectionToolbar` with report filters in the leading zone and export controls in the trailing action zone. Report actions consume shared `ActionButton` and `AccentButton` variants and must not override accent tokens inline.
- **ReportPanel** is the required shell for report charts and analytical summaries. Pair it with `ReportGrid`, `ReportEmptyState`, `ReportDrilldownSummary`, and `ReportLinkGrid` instead of rebuilding card, empty, drilldown, or report-navigation surfaces inside route pages.
- The `/design-system` route is the canonical catalogue for shared UI patterns. When feature pages introduce a new reusable shell, sync it back into the design-system component folder and this document.
- The design-system catalogue and production data collections must consume generic collection primitives for tabs, table shells, and pagination. Do not encode a route or feature name into these reusable components, and do not duplicate their structural class strings inside route pages.
- Collection table pages should place the heading and toolbar outside the card. The card itself should contain only the table, empty state, and pagination footer.
- Application data tables use the shared ledger header scale: `text-xs` labels, `font-normal` (400), uppercase casing, `0.05em` tracking, the `table-header` token (`#FCFCFC` in light mode) as the header band, and 24px horizontal header padding. The table primitive also normalizes all cell content to `font-normal`, including nested labels, badges, and actions, and defaults table text to `text-muted-foreground`; row titles may opt back into `text-foreground` explicitly. Badge components keep their own semantic `tone` colors and are not overridden by the table text rule. Header bottoms and footer tops use `border-border/60`. Use `CollectionTableHead density="compact"` only when a table needs the smaller 11px variant. For compact collection headers, `CollectionTableHeader density="compact"` owns a 40px row with zero vertical cell padding so sortable controls do not inflate the header.
- Do not add KPI cards above a register table when the cards only restate the table total or simple category counts.
- Keep the register table as the dominant surface; move a necessary total into compact navigation or table pagination.
- Omit subtitles that merely restate an already-specific register title. Table headers within one table must share a single typography scale.
- Place register search and filter controls on the same responsive toolbar row above the single register collection; stack them only when horizontal space is insufficient.
- Dense table scores use the same body scale as adjacent cells with tabular numerals. Compact status and period badges use the shared full-rounded pill geometry.
- Sortable table headers must use a keyboard-focusable control and expose the current direction with `aria-sort`.
- Period and monitoring indicators must pair color with a visible icon or text cue and an accessible status label; never rely on color or hover-only tooltips.
- Keep compact row actions visible with a sticky trailing column when a table still needs horizontal scrolling. Pagination labels and controls use at least the `text-xs` and 32px control scale.
- Register table cards begin directly with the table header, without an empty padded title band. Their outer shell uses `rounded-xl bg-card` with the shared `border-shadow` treatment through `CollectionTableCard`. Keep the header divider at `border-b border-border/60` and avoid layered outer borders or rings.
- Sticky action cells inside register tables should keep a white background (`bg-background`) so only the header carries the pale neutral surface.
- Register pagination should live as the table card footer: range text on the left, numbered page controls in the middle, and items-per-page on the right. Its top border and the table header's bottom divider both use `border-border/60` so the collection reads as one continuous boundary.
- Search fields on bright operational toolbars use the light card/popover surface with a subtle inset border; reserve stronger muted fills for grouped or recessed controls.
- All table headers use the shared neutral `table-header` surface (`#FCFCFC`) with muted uppercase labels. Keep the header divider lighter than the body grid, and keep row actions visually quiet with icon-only controls.
- Service, subscription, and other two-line operational tables use the compact ledger geometry by default: 24px horizontal cell padding, a 72px body row, semantic compact status badges, centered toggle controls, and quiet filled text actions. Two-line title cells place the primary title first at `font-normal`, followed by a secondary code or identifier below it in 11px monospace with positive tracking. Single-line registers such as Risk Register use `h-10` body rows to preserve scan density. Semantic tables such as alerts, heatmaps, and instructional criteria may opt into their own surface and density through explicit classes.
- Treatment tables may use the action-led variant with a `font-normal` plan title, a 14px monospace risk code, and the risk-code column immediately after the plan column so the action remains the first scan target. The recommended desktop proportions are `34% / 10% / 18% / 14% / 12% / 12%` for plan, risk code, PIC, deadline, status, and actions.
- All semantic badges, status pills, count chips, and metadata pills must use the shadcn `Badge` primitive from `frontend/src/components/ui/badge.tsx` (or its shared design-system re-export). Use the built-in `variant` API for standard states and the explicit project `tone`/`size` variants for semantic dense states; do not create local `<span>`/`<div>` badge replacements or local badge base-class helpers.
- Dense code-like identifiers in table rows stay text-only; do not wrap them in filled chips when the row already has a compact badge for state.
- Risk assessment summaries use the shared `RiskAssessmentSummaryStrip` pattern: score block on the left, semantic level badge, optional status badge, compact metrics, and an optional note row.
- Auto-derived evaluation details such as risk priority and risk appetite are presented as borderless label/value metadata in `text-sm font-normal text-muted-foreground`, without redundant parenthetical helper copy; only user-selectable treatment decisions retain field controls.
- Risk score selection uses the shared `RiskScoreHeatmapModal` and `RiskScorePickerTrigger`: keep the form trigger as a compact single-line, content-sized control (`self-start`, `w-fit`, `max-w-full`) with the computed score as the visual focal point, followed by the semantic level and chevron. Keep the surrounding form row to its field label only; do not add a redundant inline instruction beside the trigger. Keep the trigger's title and current probability/impact values available to assistive technology without repeating them visually when the surrounding form label already provides that context. Let the modal select one cell from a spacious 5×5 heatmap, show numeric and textual level labels directly under each axis value, preserve semantic level colors with text, support arrow-key navigation and 44px touch targets, and commit only through `Terapkan Skor`. The heatmap modal uses a tight `gap-0` header rhythm with `mt-0.5` description spacing and no close icon; `Batal` remains the explicit dismiss action in the footer. On desktop, compact 56px heatmap rows and a natural-height body keep the middle content from becoming a scroll container; narrow viewports may retain overflow scrolling as a safety fallback. The selected heatmap cell keeps its semantic level border color and increases only the border width to 2px; do not add a black/foreground border, checkmark, ring offset, or second perimeter. Omit standalone `Probabilitas`/`Dampak` axis titles when the grid structure already makes the axes clear; keep the level descriptions visible rather than tooltip-only because the modal must remain discoverable for touch and keyboard users. Keep the heatmap grid on the modal canvas without an extra gray surface or top inset, and use borderless Probabilitas, Dampak, and Hasil summaries with prominent numeric values below it. Those summary values use a synchronized vertical `Number ticker` when the selection changes, respect reduced motion, and retain tabular numerals to prevent layout shift. Do not repeat the same selection in a header badge or a second `RiskAssessmentSummaryStrip` stacked beneath the picker.
- Semester indicators, archived banners, AI suggestion dropdowns, progress meters, empty states, and version timelines must be implemented as shared component patterns once they appear in more than one route.
- **AI suggestion modal:** Title-generation suggestions use the shared `AiSuggestionModal` `clean-list` variant with single selection, a flat list without a visual wrapper or dividers, item text aligned to the modal title edge, compact title/description/meta hierarchy, restrained hover/focus states, and an `Accordion / Collapse` reveal that slides details downward over 200ms with ease-out. Clean-list descriptions remain untrimmed when revealed, the list uses a bounded native scroll boundary, selection applies directly on item click, and the footer contains only the shared `CollectionDialogCancel` action. This variant has no header icon, subtitle, or close control; keep it compact and let the list own the primary action. Multi-select AI cause suggestions use the shared `structured-list` variant, matching the `MitigationProgressDialog` shell with a title-only header, no close control, medium footer actions, and a divider-free list containing only a checkbox and suggestion text. Its footer places a live `selected/total saran dipilih` count on the leading edge in monospace tabular numerals and keeps the cancel/apply actions grouped on the trailing edge. Its list body must own the bounded native scroll with safe end padding, the list viewport ends directly at the footer's top border, and the modal uses a responsive explicit height capped at 560px so the footer remains visible without making the modal too tall. Keep suggestion choices in a modal when the list needs more room than the source field; do not anchor a dense suggestion panel beneath the input.
- **Inline editable lists:** Shared cause, impact, and substance rows insert synchronously when the controlled array changes. Newly inserted rows may use one 200ms `--ease-out` fade/slide entrance scoped to IDs added since the previous controlled snapshot; existing rows must remain stable and must not replay motion during add, remove, or edit. Use `motion-safe` / `motion-reduce` so reduced-motion users see no entrance animation, keep color-based `transition-colors` hover feedback, omit internal dividers, and never animate layout properties.
- `MonitoringTransactionProgress` is the shared compact segmented indicator for quarterly monitoring transactions and other short lifecycle progress. Its default data renders four quarter segments and shows finalized transactions over the four quarterly slots as a compact count (for example, `1/4`); custom `items` can reuse the same visual grammar for a different count label such as `TTE`. It uses graphite segments only for completed items and muted segments for draft or unavailable items, while the accessible label/title must describe the active context. Register tables reserve at least 176px for the quarterly variant so the segments and count stay visible beside sticky actions.
- Overview dashboard panels and report charts must consume the shared `StandardCard`/`ReportPanel` shell instead of duplicating card, header, and content classes. The shell uses a compact divider-free header band (`text-sm font-medium normal-case leading-5`, 14px) with `px-4 py-4`, a semantic `h2` title, and the direct `surface-border` hairline across charts, heatmaps, list panels, and report summaries. Explicitly floating surfaces retain the shared smooth elevation.
- Overview dashboards render their shell immediately and load each panel independently. Use the shared `OverviewPanelState` for loading, error, and empty states; an API error must never be represented as a valid zero or empty dataset. Recoverable errors expose the shared `Coba lagi` action, while missing phase payloads use an explicit unavailable state rather than a fabricated zero grid.
- Overview top-risk rows use `font-normal` consistently for the risk code, score, title, and organization so the list keeps one calm typographic weight.
- Nested overview panel states use a slightly tighter inner radius than the outer card, and shared badges transition only their color, background, border, and focus-shadow properties.
- Dashboard KPI cards do not contain charts or inline trend/comparison indicators. Render only the 14px Capitalize title and 24px KPI value; use the dedicated dashboard charts below the KPI grid for trend analysis. Keep `—` when the KPI value is unavailable.
- Dashboard charts and heatmaps require persistent text legends plus accessible summaries. Color and hover-only tooltips may supplement meaning but must never be the only way to identify a category, series, score, or risk level. The multi-phase heatmap risk-level legend is a full-bleed footer with a full-width top border and the shared `table-header` background (`#FCFCFC` in light mode).
- Keep overview heatmaps at one column on phones and two columns on ordinary laptop/tablet content widths. The multi-phase comparison heatmap uses six columns at wide desktop (`2xl`) so all six 5×5 matrices remain legible in one row; other overview heatmaps may use four columns at wide desktop where that is the appropriate density.
- Rows with hover or press feedback must be interactive. Overview top-risk rows link to the risk register detail, expose a keyboard focus ring, provide at least a 44px target, and disable transform motion when reduced motion is requested.

### Dropdowns and Popovers
- **Style:** Compact solid surfaces with `rounded-2xl`, small offset from trigger, and a subtle border-plus-ring treatment. Avoid relying on translucency for content legibility.
- **Behavior:** Overlays should open near the trigger, remain readable, and never feel clipped or cramped.
- **Internal Structure:** Prefer a single soft outer ring with spacing or `divide-y` separators inside general suggestion lists. Clean title-suggestion lists intentionally stay unwrapped and divider-free; avoid stacked `border-b` rules on each row unless the list is intentionally grid-like.
- **Dense Forms:** For form fields that need selection in compact desktop layouts, prefer a popover-backed combobox button over the native `Select` shell when the field needs richer spacing or custom row content.

## Do's and Don'ts

### Do:
- **Do** keep the interface monochrome by default and use color only for semantic states and analytics.
- **Do** use text-sm (14px) as the default font size for controls, labels, and body copy.
- **Do** use subtle borders (`border-foreground/10`) and separators over heavy shadows.
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
