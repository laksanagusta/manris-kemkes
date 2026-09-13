---
version: alpha
name: Manris
description: operational design system for risk and incident management. Monochrome, desktop-density controls with Inter, Poppins, and JetBrains Mono typography; semantic color is reserved for meaning.
colors:
  background: "#FCFCFC"
  main-content: "#FCFCFC"
  table-header: "#FCFCFC"
  table-header-foreground: "{colors.muted-foreground}"
  foreground: "#201D1D"
  card: "#FFFFFF"
  card-foreground: "{colors.foreground}"
  popover: "#FFFFFF"
  popover-foreground: "{colors.foreground}"
  primary: "#202020"
  primary-foreground: "#FFFFFF"
  secondary: "#F6F6F6"
  secondary-foreground: "#636161"
  muted: "#F0F0F0"
  muted-foreground: "#8F8E8E"
  disabled-foreground: "#BCBBBB"
  disabled-surface: "#F8F8F8"
  state-surface: "#FCFBFB"
  state-foreground: "#8F8E8E"
  accent: "#F0F0F0"
  accent-foreground: "{colors.foreground}"
  destructive: "#e33f47"
  surface-border: "#E3E3E3"
  field-border: "#EBEBEB"
  shadow-custom: "0px 0px 0px 1px #0000000f, 0px 1px 2px -1px #0000000f, 0px 2px 4px 0px #0000000a"
  component-border: "{colors.surface-border}"
  border: "{colors.surface-border}"
  input: "{colors.field-border}"
  ring: "rgb(32 32 32 / 25%)"
  sidebar: "#FCFCFC"
  sidebar-foreground: "{colors.foreground}"
  sidebar-muted-foreground: "{colors.muted-foreground}"
  sidebar-primary: "#202020"
  sidebar-primary-foreground: "#FFFFFF"
  sidebar-accent: "#F0F0F0"
  sidebar-accent-foreground: "{colors.foreground}"
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
  logo:
    fontFamily: "Poppins, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.4px"
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
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "#202020"
    textColor: "{colors.primary-foreground}"
    rounded: "8px"
    height: "36px"
    padding: "1px 12px"
    fontSize: "0.875rem"
    fontWeight: 600
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
    fontWeight: 600
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
    fontWeight: 600
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    border: "{colors.surface-border}"
    rounded: "{rounded.lg}"
    height: "36px"
    padding: "0 14px"
    fontSize: "0.875rem"
    fontWeight: 600
  button-secondary:
    backgroundColor: "{colors.sidebar-accent}"
    textColor: "{colors.sidebar-accent-foreground}"
    border: "none"
    rounded: "{rounded.lg}"
    height: "36px"
    padding: "0 14px"
    fontSize: "0.875rem"
    fontWeight: 600
  button-back:
    backgroundColor: "{colors.transparent}"
    hoverBackgroundColor: "{colors.sidebar-accent}"
    textColor: "{colors.muted-foreground}"
    contentOpticalNudge: "translateX(-2px)"
    border: "none"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 12px"
    fontSize: "0.875rem"
    fontWeight: 600
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "36px"
    padding: "0 14px"
    fontSize: "0.875rem"
    fontWeight: 600
  button-icon:
    rounded: "{rounded.lg}"
    height: "36px"
    width: "36px"
    fontSize: "0.875rem"
    fontWeight: 600
  button-icon-large:
    rounded: "{rounded.lg}"
    height: "40px"
    width: "40px"
    fontSize: "0.875rem"
    fontWeight: 600
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
    rounded: "10px"
  labeled-list:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "10px"
    sectionGap: "12px"
    sectionLabelInset: "0 16px"
    rowMinHeight: "56px"
    rowPadding: "12px 16px"
    rowAlignment: "center"
    dividerColor: "{colors.surface-border} at 70%"
    dividerInset: "0 16px"
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
    rounded: "12px"
    padding: "4px"
    minWidth: "128px"
    exampleWidth: "256px"
    itemHeight: "32px"
    itemRounded: "8px"
    itemPadding: "0 8px 0 8px"
    itemRightPadding: "40px"
    itemGap: "8px"
    fontSize: "14px"
    lineHeight: "20px"
    indicatorSize: "16px"
    indicatorRightInset: "12px"
    triggerHeight: "36px"
    triggerMinWidth: "176px"
    triggerPadding: "0 16px"
    overlayOffset: "8px"
    collisionPadding: "12px"
    focusOutline: "2px offset -2px"
  popover:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.popover-foreground}"
    rounded: "{rounded.2xl}"
---

# Design System: Manris

## Overview

**Creative North Star: "The Operational Ledger"**

Manris is an operational interface for ministry teams handling risk and incident management under pressure. The visual language feels like a well-kept briefing room: calm, precise, credible, and ready for daily use. The system uses a restrained monochrome palette, compact desktop-density controls, soft rounded corners, and Inter, Poppins, plus JetBrains Mono to keep attention on the task. Color is reserved for data visualization and states that carry meaning.

This system should stay institutionally grounded without becoming stiff. It should reduce panic, surface the next action quickly, and keep high-stakes workflows legible when information is incomplete. The product explicitly rejects decorative chrome, noisy card repetition, flashy gradients, and analytics theater. The authenticated surface should remain quiet and dependable.

**Key Characteristics:**
- Monochrome neutral palette with semantic color reserved for charts and meaningful states.
- Desktop-density spacing — compact but never cramped.
- Inter for interface text, Poppins for the global wordmark, and JetBrains Mono for identifiers, metrics, and code-like values.
- Soft borders and restrained shadows over heavy decoration.
- Translucent materials reserved for chrome (sidebar, toolbar), solid surfaces for content.

## Colors

The palette is monochrome by default. Use color only when it communicates status, risk, feedback, or analytical meaning; do not use it as decoration.

### Primary
- **Monochrome Action** (`#202020`): Primary action, create/add CTA, and dominant operational control.
- **Accent Surface** (`#F0F0F0`): Neutral supporting surface for selected, hovered, or grouped states.

### Neutral Palette
- **Background / Main Content** (`#FCFCFC`): Explicit authenticated workspace and page surface; the document root stays transparent so routes own their canvas.
- **Sidebar** (`#FCFCFC`): Neutral application chrome with the same restrained divider treatment.
- **Card Surface** (`#FFFFFF`): Card, panel, and window surfaces.
- **Subtle Surface** (`#F0F0F0`): Shared neutral hover, selected, grouped, and muted fills.
- **Foreground** (`#201D1D`): Default primary text for headings, labels, values, and body copy.
- **Secondary Foreground** (`#636161`): Supporting text, card subtitles, and secondary labels.
- **Muted Foreground** (`#8F8E8E`): Muted captions, helper copy, metadata, table headers, legends, and inactive sidebar text.
- **Disabled Foreground** (`#BCBBBB`): Disabled, placeholder, and lowest-emphasis text.
- **Disabled Surface** (`#F8F8F8`): Very light background for disabled and read-only fields, distinct from the stronger `muted` surface used for grouped, hovered, and selected states.
- **State Surface / Foreground** (`#FCFBFB` / `#8F8E8E`): Shared borderless surface and text pair for neutral empty, loading, and unavailable states across pages.
- **Card Subtitle** (`secondary-foreground`): Supporting description below a card title. Use the `secondary-foreground` token consistently across shared and feature card headers; reserve `muted-foreground` for captions, helper text, metadata, and legends.
- **Surface Border** (`#E3E3E3`): Canonical neutral hairline for cards, panels, widgets, wrappers, tables, dividers, sidebar boundaries, and other structural edges.
- **Field Border** (`#EBEBEB`): Canonical neutral hairline for inputs, textareas, selects, searches, comboboxes, checkboxes, and radios.
- **Compatibility aliases:** `component-border` and `border` resolve to `surface-border`; `input` resolves to `field-border`. Existing utility names remain valid while new components should choose the semantic token directly.

### Semantic
- **Risk Low / Success** (`oklch(0.72 0.17 155)`): Low risk, positive states.
- **Risk Medium / Warning** (`oklch(0.78 0.16 85)`): Caution states.
- **Risk High** (`oklch(0.70 0.18 40)`): Elevated risk markers.
- **Risk Extreme / Destructive** (`#e33f47`): Critical conditions.

### Chart palette
- **Cyan Signal** (`#00B3DD` / `--chart-1`): Primary data lines and analytic highlights.
- **Iris Gleam** (`#847DFF` / `--chart-2`): Secondary comparison series.
- **Orchid Bloom** (`#DD90D8` / `--chart-3`): Supporting categorical series.
- **Periwinkle** (`#90B8F0` / `--chart-4`): Supporting categorical series.
- **Pale Iris** (`#D1C9FF` / `--chart-5`): Soft supporting fills and neutral chart states.

Chart colors follow the Origin Financial visual language; risk severity and movement retain the semantic risk tokens above so hue continues to communicate operational meaning.

### Named Rules
**The Monochrome-First Rule.** Use graphite and grayscale tokens for the interface, controls, navigation, and content surfaces. Reserve color for charts, statuses, badges, toasts, risk levels, and other states where hue carries meaning.

**The Foreground Hierarchy Rule.** Use `foreground` for primary content, `secondary-foreground` for supporting context, `muted-foreground` for muted metadata, and `disabled-foreground` for disabled or placeholder text. Sidebar and table foreground aliases should resolve to the matching semantic tier.

**The Neutral Accent Surface Rule.** Generic neutral hover and selected surfaces resolve to the shared sidebar menu surface through `--sidebar-accent`; `--muted`, `--accent`, and neutral button variants must stay aligned with it (`#F0F0F0`). Disabled and read-only fields use the separate lighter `--disabled-surface` (`#F8F8F8`) so an unavailable field does not look like a selected or grouped surface. Semantic hovers for risk, success, warning, and destructive actions keep their meaning-bearing colors.

**The Status Component Rule.** Collection status indicators use the shared `CollectionStatusBadge` wrapper so compact sizing, alignment, and semantic tone stay consistent. Use the base `Badge` for context metadata, counters, and one-off inline labels; do not recreate collection status treatment with local badge markup.

**The Surface / Field Border Rule.** Structural surfaces use `surface-border` (`#E3E3E3`); editable and selectable fields use `field-border` (`#EBEBEB`). The global `border` and `sidebar-border` aliases resolve to the surface token, while `input` resolves to the field token. Destructive, warning, success, risk-level, selection, and focus borders retain their semantic tokens.

Secondary buttons use the shared sidebar hover surface (`--sidebar-accent`) as a slightly darker borderless neutral surface; use the Outline variant when a supporting action needs a visible border. Focus rings remain visible for keyboard users, and semantic button states retain their meaning-bearing borders.

**The Transparent Document Root Rule.** Keep `html` and `body` free of decorative background fills and global hover treatments. Apply the `background` token to explicit page, shell, and surface containers; interactive hover states belong to the controls that own them rather than the root document.

## Typography

**Primary Font:** Inter via `next/font/google`.
**Brand Font:** Poppins 600 for the global `manris` wordmark via `next/font/google`.
**Mono Font:** JetBrains Mono for code, IDs, scores, and technical values.

Typography should feel crisp and legible at desktop densities. Inter carries headings and body copy; JetBrains Mono is reserved for identifiers and numeric values. Text-sm (14px) is the default workhorse size.

### Hierarchy
- **Page title** (`page-title`): Every visible page header uses a 28px medium (`1.75rem`, `font-weight: 500`) `h1` through the shared `CollectionPageHeader` / `page-title` treatment, followed by an optional 14px (`text-sm`) muted subtitle that explains the page's purpose. Use sentence-style subtitle copy and keep it concise enough to wrap within the page header measure.
- **App toolbar title** (`app-page-title`): The global topbar keeps a compact 14px medium page context for orientation. It is supplemental to the visible page title/subtitle in `AppHeader`; do not use the topbar context as the only page-level heading.
- **Brand / Wordmark** (`font-logo text-[20px] leading-5 font-semibold lowercase tracking-[-0.4px]`): The global topbar uses the Poppins 20px semibold lowercase wordmark (`manris`) without a logo image, aligned to the sidebar menu inset. Public authentication screens, including registration, reuse the same text-only lowercase wordmark. The canonical 4×4 mark remains reserved for the mobile sidebar and browser-tab icon treatment.
- **Public registration:** Use the text-only `manris` wordmark above the registration card. Collect identity, work-unit, account, and password fields only; omit the phone-number field and keep the backend registration contract optional for legacy callers.
- **Section Title** (`text-xl font-semibold tracking-tight`): Internal section headers and card group titles.
- **Headline** (500, larger than body by at least 1.25x): Page titles and primary screen headers. Use `page-title` for the shared treatment.
- **Title** (600, slightly smaller than headline): Card titles and panel labels.
- **Form section title** (`text-sm font-medium tracking-tight`): Section headings inside the risk form use the medium weight so the form hierarchy stays calm and scannable.
- **KPI card title** (`font-sans text-[13px] font-medium tracking-normal leading-4 text-muted-foreground`): Shared KPI card titles use Inter at 13px with `muted-foreground`, medium weight, and zero additional letter spacing while preserving title case. The card uses 20px padding and a 12px separation before the value row. Numeric values use Inter at 28px with semibold weight and `foreground`, with no inline comparison marker.
- **Body** (400, 0.875rem, 1.5 line-height): Form copy, helper text, task instructions. Keep prose around 65–75ch when possible.
- **Label** (500, 0.875rem): Button text and compact tags.
- **Sidebar text** (500, 0.875rem for navigation items and section labels): Navigation items use medium weight with `muted-foreground` when inactive and `foreground` when active. Section labels also use medium weight; counts, account text, and the mobile wordmark remain normal weight. Active state is expressed through surface and color, not a heavier weight.
- **Form field label** (400, 0.875rem): Input, select, textarea, and form section labels use a normal weight for calm scanning.
- **Read-only evaluation metadata label** (`text-sm font-medium text-foreground`): Primary labels such as `Prioritas Risiko` and `Selera Risiko` stay on the foreground token, while their derived values remain `text-muted-foreground`.
- **Caption** (`text-xs text-muted-foreground`): Supporting helper text.
- **Micro** (`text-[10px] font-medium`): Dense badges, KPI band labels, compact metadata. Phase labels in the multi-phase overview heatmap are an explicit exception: use `text-xs font-normal uppercase tracking-[0.6px]` (12px with 0.6px letter spacing) for readability.
- **Table action icon** (`ActionIconButton`): Use a 32px neutral card surface with a
  `1px` hairline border for compact overflow actions, preserving the standard
  control radius and focus ring without adding a second elevation layer.

### Named Rules
**The Plain Voice Rule.** Labels and actions should read like trusted workplace software, not marketing copy. Avoid ornament in UI text.

## Layout

Authenticated screens use a sidebar shell, toolbar header, and content region with desktop-density spacing. Input and dropdown controls are 40px high (h-10); standard buttons remain 36px (h-9). Collection/list toolbars use the compact 36px (h-9) height for search, filter, select, pagination-size, and toolbar action controls so the leading controls align with the trailing actions. Form and detail fields retain the 40px (h-10) field baseline. Dense controls (sidebar items, menu items) use 32px (h-8). Content uses 16px or 24px padding depending on context. The root shell reserves a stable scrollbar gutter with `scrollbar-gutter: stable`; fixed topbar and monitoring controls subtract `--removed-body-scroll-bar-size` during overlay scroll lock so their width stays stable.

Responsive overlays remain edge-aware: sheets attach to the viewport edge. Translucent materials (backdrop-blur) are used for chrome surfaces: sidebar, toolbar, titlebar, and modal scrims. Content surfaces remain solid.

### Public Authentication Surface

Public login routes use a centered `min-h-svh` shell without a `Card` wrapper or
brand logo. Keep the title, labels, helper copy, errors, primary action, and
links on the same visual axis while preserving full-width fields for comfortable
entry.
Use the existing input, label, and primary button tokens rather than a second
public-only styling system. The login CTA uses a 40px (`h-10`) pill shape
(`rounded-full`) without a decorative icon. The `Masuk ke` phrase in the login
heading uses 20px medium;
the `Manris` wordmark reuses the Poppins treatment without an underline. Password
visibility controls must expose an accessible label, visible keyboard focus, and
a 40px hit area. Decorative
background motion and entrance animation must use `motion-safe` and remain
static for reduced-motion users. Login fields should provide semantic `name`
and `autocomplete` metadata so password managers can identify the credentials.

## Elevation & Depth

The system uses subtle layered depth rather than dramatic shadows. Every shared `Card`, table shell, and operational panel uses the canonical `shadow-custom` treatment when it owns a surface boundary. Floating and explicitly elevated non-Card surfaces use the shared smooth-shadow treatment.

### Shadow Vocabulary
- **Card / Table / Panel Shadow** (`shadow-custom`): `0px 0px 0px 1px #0000000f, 0px 1px 2px -1px #0000000f, 0px 2px 4px 0px #0000000a`. This single layered shadow owns both the visible perimeter and the restrained lift, giving surfaces depth without a second hard border.
- **Shared surface utilities** (`border-shadow`, `surface-hairline`): Both resolve to `var(--shadow-custom)`. `border-shadow` is applied by the shared `Card` primitive and table shells; `surface-hairline` is used by non-Card panels, KPI tiles, summaries, and contextual surfaces. Neither adds a hard border around the elevated surface.
- **Control Lift** (`0 1px 1px rgba(0,0,0,0.04)`): Buttons and small interactive controls.
- **Floating Surface** (`smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30`): Menus, tooltips, toasts, and transient overlays. Dropdown panels use the Card boundary below.
- **Modal / Sheet Surface** (`smooth-shadow-ring-xl shadow-black smooth-ring-neutral-300/30`): Dialog, AlertDialog, and Sheet surfaces use the larger elevation so the modal layer separates clearly from the frosted scrim.

### Elevated Surface Rule
- Use the shared `Card` default (`border-shadow`) for every Card and dropdown panel. Use `surface-hairline` for non-Card dashboard panels, KPI tiles, risk-analysis summaries, collection-table wrappers, and persistent form context surfaces; both utilities resolve to `shadow-custom`. Use `smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30` for compact floating widgets and controls and `smooth-shadow-ring-xl shadow-black smooth-ring-neutral-300/30` on modal and sheet surfaces. Each surface owns only one neutral perimeter.
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
- `rounded-xl` (10px): Cards, panels, popovers, dialogs, form sections, premium controls, and large action zones.
- `rounded-2xl` (16px): Reserved for exceptional surfaces only; standard components use `rounded-xl`.
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
- **Back action:** Use the shared `FormBackAction` primitive on form/detail pages: ghost treatment, transparent resting and hover backgrounds, `border-0`, `text-[12px]`, `font-medium`, no horizontal padding, and a 16px `ChevronLeft` at `strokeWidth={2}`. The icon and label change color together on hover. On authenticated pages, place the back action in the dedicated shell-level top slot above the global page title; use the local row only for embedded/catalogue specimens. Keep the visible icon aligned to the title edge through the shared zero-inline-padding treatment.
- **Card-shadow action:** When a collection action needs to share the Card perimeter treatment, use `border-0 border-shadow` on the `ActionButton` so its boundary resolves to the canonical `--shadow-custom` instead of a hard border. Keep the regular outline border for standard supporting actions.
- **ActionIconButton:** Shared icon-only row action with a white `bg-card` resting surface and muted hover state, keeping action affordances distinct from the neutral table background. Icon-only dropdown triggers outside table rows may use `ActionButton` with `size="icon-xs"`; retain an accessible `aria-label` and optional `title` when the visual label is removed.
- **Shared buttons with `asChild`:** Pass exactly one element child. Place icons and labels inside that child; do not use the wrapper `icon` or `loading` props in `asChild` mode.
- **Tab buttons:** `rounded-md` (6px), `text-xs`, inside a `rounded-lg` container.
- **Tab active state:** Every default shared tab list uses one white active indicator with a subtle `shadow-sm`; it measures the selected trigger and slides beneath it over 300ms with the shared `ease-in-out` curve. Animate the indicator's transform and geometry; tab content changes without directional motion. Disable the indicator transition for `prefers-reduced-motion`. Line-variant tabs retain their underline treatment instead of the sliding pill.
- **Primary:** Solid `#202020` button with white Inter 14px/21px medium text, 36px height, 8px radius, 1px vertical and 12px horizontal padding, 6px icon gap, and no shadow. Used for the main action in a task flow; depth is reserved for elevated surfaces such as cards, modals, and dropdowns.
- **Secondary:** Slightly darker borderless neutral surface aligned with the sidebar hover surface, used for supporting actions without a visible perimeter.
- **AI assist:** Inline AI assistance buttons use the outlined treatment with the canonical visible border, muted text, compact `size="xs"` / `h-7` geometry, and the same hover/focus behavior in idle and loading states. Keep the idle action free of decorative icons; loading communicates state through the `Memproses...` label and `aria-busy`.
- **Risk AI loading motion:** Keep the button width stable by overlaying the idle and loading labels, then slide the loading label horizontally over 260ms with slight overshoot. Run the request concurrently; open recommendations only after data arrives and the 540ms label sequence completes. Reduced motion switches states immediately without the minimum delay. Errors restore the button and show a toast.
- **Outline:** Neutral surface with border, used when a supporting action needs an explicit boundary.
- **Ghost / Subtle:** Transparent background with hover fill, used for low-priority actions.
- **Hover / Focus:** Light background shift and visible neutral focus ring; no bounce, no motion flourish.
- **Cursor:** Native and role-based interactive controls use `cursor-pointer`; disabled controls use `cursor-not-allowed`. Decorative surfaces and non-interactive text keep the default cursor.
- **Sidebar navigation:** Navigation items and section labels use `font-medium` (500) for both inactive and active states. Counts, account text, and the mobile wordmark remain `font-normal` (400). Active state uses surface and color for wayfinding without changing weight between states, size, or spacing. Inactive icons use a medium `1.8` stroke weight.
- **Dialog actions:** Dialog and AlertDialog triggers, cancel actions, and confirmation actions use the compact `sm` button size.

### Cards
- **Default:** `rounded-xl` (10px) with 16px padding, white surface, and the shared `shadow-custom` boundary.
- **Large:** `rounded-xl` (10px) with 24px padding.
- **Shadow Strategy:** Every Card uses the shared `border-shadow` treatment, which resolves to `shadow-custom`; non-Card operational surfaces use `surface-hairline`, which resolves to the same token.
- **Border:** The shared shadow provides the single visible outer boundary for every Card, panel, and table shell; use internal separators only for content divisions.
- **Dashboard Card:** `rounded-xl` with `bg-card` and the shared `shadow-custom` boundary. KPI cards use a `min-h-[100px]` baseline without an embedded chart, `px-5 py-5` padding, and the same label/value treatment as collection KPI cards. The title uses 13px Inter medium title-case text with zero additional letter spacing, and the value uses 28px Inter semibold tabular numerals. The card may grow when a long title wraps. Chart and panel cards keep the roomier `px-4 py-4` header band with no divider line. Risk-analysis summary, chart, and history surfaces use the same shared shadow boundary.
- **Card Header:** Use the shared KPI header pattern across dashboard and collection pages: the card owns 20px inset padding, the title uses `font-sans text-[13px] font-medium tracking-normal leading-4 text-muted-foreground`, and the value row starts with `mt-3 flex items-baseline gap-1`. The KPI value uses `text-[28px] font-semibold leading-none tracking-tight text-foreground` with no inline comparison marker, and `KpiCard` does not render subtitle or description content. Header-and-content cards must use `gap-0 p-0` on the card shell and one `p-4` content inset so the component's default gap does not stack with content padding.
- **Risk Form Sections:** Keep the risk register's identification, analysis, evaluation, treatment, target, and conditional approval-line sections always visible as separate `Card` surfaces. Compose each section with `CardHeader` and `CardContent`; use a 16px (`text-base font-medium tracking-tight`) section title and a 14px (`text-sm leading-relaxed text-muted-foreground`) supporting description, use the shared Card default `border-shadow`, and do not use Accordion for this form.
- **Accordion:** Use Accordion only for generic disclosure content that benefits from progressive reveal. When it represents a section shell elsewhere, use the shared smooth elevation and disable the item's default `not-last:border-b` separator (`not-last:border-b-0`). Remove the trigger's default radius, transparent border, and underline behavior so its header band visually matches the KPI card header exactly. Internal header dividers are allowed only when they intentionally separate header and content.
- **Collapsible Card:** Use the shared `CollapsibleCard` compound component for operational disclosures. Compose `Root`, `Trigger`, `Header`, `Icon`, `Text`, `Title`, optional `Description`, optional `Actions`, `Content`, and `Body` through children instead of adding boolean display modes. The shell uses `rounded-xl`, a full-width 16px-inset trigger, a muted 32px circular chevron without a decorative border, a 2px chevron stroke, 14px semibold title, optional 12px description, a light body divider, and a 200ms grow/collapse animation with reduced-motion fallback. Put period and other inline context metadata in `CollapsibleCard.Actions` using the shared compact neutral Context Badge treatment. Interactive header controls such as `PopoverSelectField` must remain siblings of `Trigger` in a shared header row rather than nesting button-based controls inside the collapsible trigger.
- **Dashboard Rows:** Inside full-width panels, use a padded outer shell with a full-bleed inner list (`-mx-4` + `divide-y`) when the rows need to touch the card edge consistently.
- **Report category distribution:** Keep the pie chart as the visual focal point and place its category legend beneath it as a full-width responsive grid with a light top divider; use two columns by default and three from `sm` so the legend does not compete with the chart on the side. Render it inside the shared `ReportPanel` on `/reports` so the distribution follows the active report scope and cycle.
- **Neutral state surfaces:** Empty, loading, and unavailable state components use the borderless `bg-state-surface text-state-foreground` pair (`#FCFBFB` / `#8F8E8E`) consistently across reports, collections, dashboards, and inline states. Error, archived, validation, and access-denied states retain semantic accents where color communicates the condition.

### Inputs / Fields
- **Shared field geometry:** Input, Select trigger, `PopoverSelectField`, SearchInput, InputGroup, and Combobox chips use 40px (`h-10`) height, `field-border` for their neutral field boundary, `bg-card`, and text-sm. Textarea keeps the same surface and state styling while growing vertically; Checkbox and Radio retain their intrinsic control size.
- **Collection field density:** Collection-specific wrappers and collection-page overrides use 36px (`h-9`) for search, filter, select, report-scope, and pagination-size controls. This is a page-context override only; form and detail workflows continue using the shared 40px (`h-10`) baseline.
- **Field primitive rule:** Feature pages compose visible text, search, select, and textarea controls from the shared field primitives exposed through `@/components/shared/design-system`; the canonical `Input`, `Textarea`, and `PopoverSelectField` exports own the interaction state used by risk forms and collection disclosures. Native controls remain only for hidden file uploads and range sliders, which have distinct browser interaction semantics. Custom dropdown-backed field triggers, including the Risiko and Pemantauan selectors and score picker, must reuse `field-border`, remain visually stable when pressed, and use a 150ms chevron rotation on open. All shared field surfaces darken their existing border to `foreground/15` on hover, transitioning only `border-color`; do not add a second ring or perimeter layer, and keep the neutral border for disabled controls. Page-level geometry selectors may set size, radius, and surface, but must not override the shared active-field state or neutral border color.
- **Required labels:** Labels for required fields show a red asterisk immediately after the label text; optional fields omit the marker. Keep the asterisk as a visual cue alongside the field's existing validation semantics.
- **Single-field grid span:** When a responsive two-column form group contains only one field, the field must span the full group (`md:col-span-2`) so its control reaches the card edges instead of leaving an accidental half-width column.
- **Search:** 40px high (h-10) in forms and detail workflows; 36px high (h-9) in collection/list toolbars. Both use `rounded-lg` (8px), 12px horizontal padding, card surface, and the same input border/focus treatment.
- **Focus:** Text, textarea, search, and select fields keep the `--ring` border with an explicit, high-contrast `focus-visible` indicator; do not rely on a low-contrast background shift alone. `SelectTrigger` keeps the same neutral border while its chevron rotates on open; semantic invalid states retain their dedicated red border/ring.
- **Error / Disabled:** Use semantic red for invalid state and a clearly visible light disabled-field treatment (`disabled:bg-disabled-surface disabled:text-disabled-foreground disabled:opacity-100 disabled:cursor-not-allowed`) for read-only or disabled inputs, textareas, and select-like controls. Placeholder text also uses `disabled-foreground`. Risk Register fields must match the light read-only treatment used by the disabled `Input`/`Textarea` fields in the Detail Aktivitas Log modal.
- **Mobile form controls:** Feature forms may promote input text to `text-base` on mobile where zoom prevention is required; the shared desktop baseline remains text-sm. Inline validation messages use at least `text-xs` with readable line-height. Mitigation validation errors retain `role="alert"` and render immediately without an internal reveal animation.

### Overlays and Groups
- **Modal:** `rounded-xl` with 20px padding and the shared smooth elevation.
- **Modal family:** All `Dialog`, `AlertDialog`, and `Sheet` surfaces use the solid `bg-card` surface, 20px (`p-5`) outer inset, `rounded-xl` geometry where the surface is centered, the shared `smooth-shadow-ring-xl shadow-black smooth-ring-neutral-300/30` elevation, the frosted scrim, hidden scrollbar chrome, and the shared 200ms strong ease-out transition. Preserve explicit width and scrolling variants only when the content requires them; do not introduce a second local modal shell.
- **Modal composition:** Compose modal content through the existing compound primitives (`DialogHeader`, `DialogTitle`, optional `DialogDescription`, body children, and `DialogFooter`). Keep headers borderless, keep footer dividers internal, use `CollectionDialogCancel` for the medium outline cancel action, and use `AccentButton` for the primary action. Destructive confirmations such as deleting a draft use a plain metadata block without a nested background or ring, plus the shared `DestructiveButton` with a solid red surface and white text; use the concise `Hapus` label without an icon.
- **Modal task flows:** Selection and creation flows, such as the working-paper period picker, reuse the same shell as mitigation reporting: no duplicate close control when the footer has an explicit cancel action, a compact title hierarchy, a labeled field, and the shared `CollectionDialogCancel` / `AccentButton` pairing. The working-paper picker uses the concise title `Pilih Periode`, and its field wrapper follows the risk-form rhythm with `flex flex-col gap-2` rather than margin-based `space-y-*`. Backed selection controls in these flows use the same `Popover` + `Button` + option-list pattern as the risk form; do not use the Radix `SelectItem` collection for these selectors. Modal header, field, detail content, and footer render immediately after the shell opens without an internal stagger or reveal animation.
- **Monitoring workflow actions:** Keep monitoring editing and finalization CTAs inside the dedicated Pemantauan workspace. The Risk Register remains focused on risk profile data and lifecycle actions; its row actions and active finalized-risk edit form may provide a `Mulai Pemantauan` / `Lanjutkan Pemantauan` shortcut with the same cycle selector, then redirect to the dedicated monitoring workspace. When an active draft transaction already exists, show `Lanjutkan Pemantauan` and link directly to that transaction; only show `Mulai Pemantauan` and open the cycle selector when no active draft exists. Do not duplicate monitoring tabs or progress widgets in the risk form.
- **Monitoring mitigation finalization:** Count a mitigation as reported only when its task is `done` and the implementation notes are filled. Empty or incomplete mitigation reports remain `Belum dilaporkan` before finalization; finalization then closes them as the terminal `Tidak dilaporkan` status, removes their reporting action, and excludes those mitigation plans from the next-period risk snapshot/task generation. They remain available in the finalized monitoring history and do not block finalization.
- **Monitoring mitigation disclosure:** The inline mitigation list enters with a restrained downward `Slide in` from above using opacity and transform over 200ms with the shared `Ease-out` curve (`motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2 motion-safe:duration-200 motion-safe:ease-(--ease-out)`). Disable the entrance under `prefers-reduced-motion`; keep the disclosure inline and borderless, relying on the parent’s 12px vertical gap rather than an extra top divider or padding layer.
- **Shared modal shell:** `DialogContent` uses `w-[calc(100%-2rem)] max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain no-scrollbar rounded-xl bg-card p-5` with `smooth-shadow-ring-xl shadow-black smooth-ring-neutral-300/30`; `AlertDialogContent` keeps the same treatment at `max-w-lg`. The compound header uses a compact `gap-1` rhythm with `px-5 pt-5 pb-3` inset so its title has bottom breathing room, while the compound footer uses an internal `border-t border-border/70` divider, `px-5 py-4` inset, and compact actions. Explicit `max-w-*` overrides remain available for intentionally expanded dialogs.
- **Form modal:** Compose `DialogHeader`, body sections, and `DialogFooter` as siblings inside the shared shell. The canonical mitigation form uses `max-w-2xl`, a 16px title, no subtitle or close icon, 14px labels, required notes semantics, optional evidence, `space-y-5` between fields, and an explicit `flex flex-col gap-2` (8px) layout between each label and its field. Evidence starts as `Tambahkan Link` text with a plus icon, using the sidebar item treatment: `rounded-md`, `p-2`, `text-sidebar-muted-foreground`, and `hover:bg-sidebar-accent hover:text-sidebar-accent-foreground`; do not add a border, shadow, or underline. Store multiple evidence URLs as newline-separated values in the existing report contract, render them as reusable `ResourceLinkRow` items that flow left to right and wrap to the next row when needed, and place the add-link control directly after them as a plus-only icon once at least one link exists; with no links, keep the labeled `Tambahkan Link` trigger. Keep the expanded editor directly after the links in the same wrapping row, sized to 40% of the container with a `32rem` maximum instead of forcing it onto a full-width row. Keep the compact list gap tight so the plus control sits close to the final link. Each resource row keeps the icon/name on the left and reserves a stable options slot to avoid layout shift: show an `ArrowUpRight` icon while idle, morph it to `MoreHorizontal` on hover/focus, and keep the trigger visually transparent without an extra wrapper surface or shadow. Anchor a subtle `DropdownMenu` with Edit/Delete. The row opens a validated edit `Dialog` and requires an `AlertDialog` confirmation before delete with Cancel receiving initial focus. Activation morphs the same 40px-high row from the compact text action into the 40%-wide input over 320ms with ease-out and a text/input crossfade; omit a visible label and retain `aria-label="Link Bukti"`. Keep the input focused after activation. `Enter` saves a valid draft URL to the list, while `Esc` cancels the draft and is shown as an `Esc` keycap followed by the visible `Batal` label. Keep both shortcuts in a sub-row directly beneath the active input and aligned to the same leading edge. While the evidence editor is open, the first Escape is consumed by the editor and must not dismiss the dialog; after the editor closes, the next Escape dismisses the dialog normally. Reduced-motion users receive the final layout immediately. Its footer uses the shared outline cancel action at the default medium size with `smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30` and no separate border, plus a primary submit action with a clear loading label; active text fields use one black border with no additional gray focus ring. Dynamic content is handled by the shared modal scroll boundary, which keeps overflow scrolling available while hiding the scrollbar chrome in the mitigation report modal. Dialog and AlertDialog enter/exit motion uses `duration-200 ease-(--ease-out)` over the existing frosted scrim, and is disabled under `prefers-reduced-motion`; modal children remain static on open; the evidence transition runs only on activation. Detail-to-report handoffs close the detail dialog first and open the report dialog from its `animationend` exit lifecycle; reduced-motion users advance on the next animation frame.
- **Bottom sheet:** `rounded-t-2xl` with 20px padding and the same `smooth-shadow-ring-xl shadow-black smooth-ring-neutral-300/30` elevation as modal dialogs.
- **Dropdown:** The canonical compact trigger is 36px high with a 176px minimum width and 16px horizontal padding. The catalog example uses a 256px panel (production menus may size to the trigger) with a 128px minimum width, 12px radius, 4px panel inset, an 8px trigger offset, and the Card `border-shadow` boundary (`shadow-custom`). Each option is 32px high (`h-8`) with an 8px radius, 8px left padding, 40px right reserve for the indicator, 8px internal gap, and 14px/20px Inter typography. The checkmark is 16px with a 12px right inset. Hover/focus uses the neutral accent surface; the selected option keeps a trailing checkmark without a decorative badge. Keyboard focus uses a 2px foreground outline with a -2px offset; the overlay keeps 12px collision padding.
- **Popover:** `rounded-xl` with solid popover surface and subtle ring. All `PopoverContent` instances inherit this radius; feature overrides must not replace it with another radius.
- **Toast:** Positioned at the bottom-right, with `rounded-xl`, 10px vertical padding, and 14px horizontal padding.
- **List group:** `rounded-xl` with clipped overflow.
- **Segmented control (TabsList):** `rounded-lg` with 4px internal padding, tab buttons `rounded-md`.

### Iconography
- **Source:** All application icons use Hugeicons through the shared `frontend/src/components/ui/icons.tsx` compatibility layer. Feature code must import from `@/components/ui/icons` instead of importing an icon package directly.
- **Weight:** Keep icons in the same outline family and use `currentColor` so navigation, hover, active, disabled, and semantic states are expressed through the surrounding text color. Sidebar icons and labels use `muted-foreground` (`#8F8E8E`, `text-sidebar-muted-foreground`) when inactive, with `font-medium` labels and `1.8` icon stroke weight; active items use `text-sidebar-accent-foreground` at the same medium weight.
- **Sizing:** Preserve existing utility-class sizing (`size-3`, `size-3.5`, `size-4`, `size-5`, and so on). Use `strokeWidth={1.5}` for regular text and around `1.8–2` when paired with semibold controls.
- **States:** Use one icon per semantic role; do not swap between icon libraries or introduce filled variants for routine controls. Filled or heavier variants are reserved for active or status-critical states.

### Chips and Icon Tiles
- **Chip:** 32px high, pill-shaped (`rounded-full`), with 12px horizontal padding, 14px semibold text, and no border.
- **Badge palette:** Use the shared shadcn custom-color pattern with soft semantic pairs: neutral `zinc`, progress `blue`, success `green`, warning `amber`, danger `red`, and info `sky` (`bg-*-50 text-*-700`). Keep labels explicit so color is never the only status cue. Sidebar notification counts are the exception: render them as plain tabular numbers without a badge pill.
- **Dense badge sizes:** The shadcn base badge is 20px high with 12px text. Compact badges are 24px high; micro badges are 20px high with 11px text. All badge sizes use the shared rounded geometry and semantic color pairs.
- **Context badge:** Period and inline contextual badges use `size="compact"`, `tone="neutral"`, and the dedicated low-contrast surface/text pair `#0000000A` background and `#8F8E8E` text. Keep labels explicit so the neutral treatment does not carry semantic meaning through color alone. The monitoring cycle badge and empty organization marker (`Belum Ada Data`) use this same context treatment. The `Tidak dilaporkan` outcome inside the monitoring finalization confirmation uses the same compact neutral geometry and low-contrast pair, while the surrounding copy explains the consequence.
- **Icon tile:** 36px square with `rounded-lg`.
- **App icon tile:** 56px square with `rounded-xl`.

### Navigation
- **Style:** Sidebar and toolbar use translucent material (`bg-card/70 backdrop-blur-xl`) with compact rows (32px), `muted-foreground` (`#8F8E8E`) inactive text/icons, and grayscale active state.
- **Sidebar notification count:** Show pending inbox totals as a plain right-aligned tabular number without a filled badge or pill; hide it when the count is zero and in the collapsed icon rail.
- **Sidebar frame:** Desktop sidebar fills the viewport edge-to-edge with no outer inset, radius, shadow, or surrounding ring; use a single trailing divider (`border-r` for the left sidebar) colored `border-border/60`, matching the topbar's `border-e border-border/60` so the shell chrome reads as one system.
- **Sidebar footer boundary:** Use a 40px (`-top-10 h-10`) transparent-to-sidebar overlay above the Help/account footer with `backdrop-blur-md`, no hard divider, and `pointer-events-none` so the transition cannot block navigation.
- **Brand mark:** `/frontend/public/logo.svg` is the light-surface logo: sixteen `#202020` circles in a complete 4×4 grid. `/frontend/public/icon.svg` and the app favicon use the same grid in white on a `#202020` rounded square for browser-tab contrast.
- **Typography:** text-base font-normal for the mobile brand wordmark, text-sm font-medium for navigation items, text-sm font-normal for account text, and text-xs (12px) font-medium uppercase with `0.6px` letter-spacing for section labels. Active state does not change font weight.
- **Hover:** Subtle background shift — no bounce, no motion flourish. Sidebar menu hover and active surfaces use the same `rounded-md` (6px) radius as standard buttons.
- **Sidebar icon motion:** `SidebarNavItem` is the reusable motion primitive for Dashboard, Library, Search, and all operational navigation. On fine-pointer hover, the icon uses a 180ms `cubic-bezier(0.2, 0, 0, 1)` `scale(1.08)` plus `translateY(-1.5px)`; press feedback reaches `scale(0.92)` and settles with a 350ms spring (`bounce: 0.18`). The SVG stroke width changes subtly through the same 180ms transition. Inactive icons and labels use `muted-foreground` (`#8F8E8E`), with `font-medium` labels and `1.8` icon stroke weight; active icons follow the foreground active label color at the same medium weight. The neutral active surface uses `layoutId` with the same spring so it travels between items without changing layout; do not add a decorative left indicator. Sidebar menu rows use a compact 4px vertical gap so hover surfaces remain visually distinct.
- **Sidebar hierarchy:** Keep the most frequent operational path first: `Dashboard`, `Risiko`, `Penanganan`, `Pemantauan`, `Kertas Kerja`, `Persetujuan & TTE`, and `Evaluasi`. Follow it with `TATA KELOLA RISIKO` (`Piagam Manris`, `Struktur Kinerja`, `Eskalasi Risiko`), `LAPORAN`, `AI & OTOMASI`, and one consolidated `ADMINISTRASI` group containing `Pengguna`, `Organisasi`, and `Grup`. Pair operational destinations with semantic icons: `ClipboardList` for Risiko, `ClipboardCheck` for Penanganan, `MonitorDot` for Pemantauan, `FileText` for Kertas Kerja, and `FileSignature` for Persetujuan & TTE. Filter `Pengguna` and `Organisasi` to Super Admin while keeping `Grup` available inside the user's organization scope. Use `Laporan` for the `/reports` destination so the sidebar label matches the page title. Keep section labels in Indonesian for the ministry-facing interface; retain established product names such as `Document Intelligence` only when they are the user-facing feature name.
- **Reduced motion:** `MotionConfig reducedMotion="user"` disables transform/layout movement while retaining the static active surface, color transitions, and click target behavior.
- **Mobile Treatment:** Collapse sidebar to icon-only or bottom tab bar.
- **Action placement:** Keep page-specific primary actions in the page header. Do not duplicate create actions in the global sidebar.
- **Risk Register collection:** Keep the register as one focused collection with compact filters, sorting, pagination, and lifecycle actions. Its toolbar exposes only the relevant import and create actions; do not add a manual refresh action. Keep monitoring out of a secondary tab, but retain a compact `Pemantauan` progress column in the register and expose `Mulai Pemantauan`/`Lanjutkan Pemantauan` from row actions with a cycle selector; if an active draft exists, continue it directly rather than offering another start action. Show the progress as a numeric fraction such as `2/4` without the word `transaksi`. Remove the separate `Kode` column and place the code above the title inside the `Risiko` column. Use `text-muted-foreground` for table metadata and labels, keep the risk title as primary foreground, and preserve semantic badge colors for status meaning; the detailed transaction workflow belongs to the dedicated `Pemantauan` workspace. The row overflow action uses the same ghost `ActionButton` with `icon-xs` sizing as the Evaluasi table. Apply the row hover surface directly to every body cell, including the sticky action cell, so the hover fill remains continuous at the trailing edge while the sticky cell keeps its solid resting background for scroll masking.
- **Inbox approval collection:** Keep the approval inbox table focused on `Kode`, `Entitas`, `Jenis`, `Tanggal`, and `Status`. Omit `Unit Kerja`, `Pemohon`, and `Tindakan`; the linked entity title remains the read-navigation path and the table stays compact without a redundant action column.
- **Responsive shell:** Every main flex child beside the sidebar must use `min-w-0`; page-level horizontal overflow is clipped and wide data tables own their local horizontal scrolling.
- **Global topbar:** Authenticated pages use a persistent, pinned 56px topbar above the sidebar and main content, with a Poppins 20px semibold text-only lowercase `manris` wordmark using `-0.4px` letter spacing aligned to the sidebar menu inset and the current page context centered. The topbar has no organization selector or trailing action rail, keeping the application context quiet and centered; AI Tools remains available from the sidebar's `AI & OTOMASI` section. The shell reserves the topbar height so content is never obscured while the page scrolls. The desktop sidebar begins below the topbar and follows its expanded/collapsed width; mobile keeps the sidebar trigger and the same compact Poppins wordmark in the topbar. Keep the logo/workspace area free of a bottom border while the content rail may retain the chrome boundary; do not duplicate the workspace wordmark inside the desktop sidebar.
- **Main content wrapper:** Every authenticated route uses one shared `mx-auto w-full max-w-7xl min-w-0 pb-8` wrapper inside `AppShell`. Its top spacing is inherited directly from the `SidebarInset` horizontal/vertical inset (`p-4 md:p-6`), so the content starts with the same 16px mobile or 24px desktop spacing on every side. `AppHeader` renders the canonical visible page title and concise subtitle for standard authenticated routes, followed by a fixed 48px (`mb-12`) gap before the first feature component; `/overview`, `/risk/register/new`, `/intelligence/document`, and Piagam detail are explicit standalone-header exceptions because their route headers or dashboard composition own the context locally. The topbar keeps only a compact page context. Other route-level `CollectionPageHeader` instances send their back action to the dedicated top slot above the global title. Form/detail headers use `actionsPlacement="top"` to send their CTA group into the AppHeader title row, so it is vertically centered against the global title/subtitle block; the Piagam detail keeps its actions and title/subtitle local to the `max-w-7xl` form. Collection-page actions remain local without duplicating the global title. Feature pages must not duplicate this outer geometry; they own only their internal section spacing. The shared `PageStack` then provides `mx-auto w-full max-w-7xl min-w-0 space-y-6` as the canonical page composition, matching the centered risk form's 24px grouping rhythm. All route-level sections below the header use this 24px vertical rhythm, including the Design System catalogue. Pages may choose a narrower internal measure when the content benefits from a shorter reading line.

### Operational Summaries

- **Header-to-content spacing:** Every visible page header owns a 48px (`mb-12`) separation before the first content component. Standard authenticated routes receive it from `AppHeader`; standalone form/detail exceptions must preserve the same distance locally. After that first component, route-level sections use a consistent 24px (`space-y-6` / `gap-y-6`) vertical rhythm.

#### Component Ownership and Imports

- `frontend/src/components/shared/design-system` is the canonical home for composed reusable Manris components.
- Production consumers import composed components only from `@/components/shared/design-system` and must not deep-import category folders.
- `components/ui` remains the low-level shadcn foundation.
- Catalogue examples live under `design-system/examples`, use fixture data, and render production components instead of duplicating their structural classes or behavior.
- The former `components/shared/collection-primitives.tsx` module is removed; its focused components live under the internal `collections` category and are exported through the root Design System API.
- Domain-aware components may remain in the Design System when they receive data and callbacks through props and own no fetching, routing, permission, or page business state.

- **PageStack** is the required outer layout for authenticated feature pages. It owns the shared `mx-auto w-full max-w-7xl min-w-0 space-y-6` geometry and page entrance treatment so routes do not repeat those classes. Keep narrower route-specific widths only for intentional reading measures or focused controls.
- **Dashboard spacing:** `/overview` keeps `AppHeader` as the shared visible title/subtitle band before the page content. The route-level `CollectionPageHeader` may remain available for local actions/context, but must not duplicate the global heading; the first content inset aligns with the shell's horizontal spacing.
- **Back action:** Semua tombol navigasi kembali pada halaman form/detail memakai primitive `FormBackAction`: `ActionButton` variant `ghost`, size `sm`, ikon `ChevronLeft` 16px dengan `strokeWidth={2}`, teks 12px (`text-[12px]`), tanpa padding horizontal (`!px-0`), dan background transparan. Ikon serta label berubah warna bersama saat hover tanpa mengubah background; tidak ada treatment khusus per route. Pada halaman authenticated, `CollectionPageHeader` menempatkan back action di slot khusus paling atas milik `AppHeader`, di atas title global; penggunaan lokal seperti form Risiko, detail, atau contoh katalog dapat memilih placement lokal secara eksplisit. Label boleh menyebut tujuan pada konteks detail, tetapi tetap ringkas; aksi konfirmasi seperti `Kembali tanpa menyimpan` mengikuti hierarki dialognya sendiri.
- **Form field labels:** Label input pada form memakai `text-sm font-normal`; bobot medium tetap untuk label tombol, navigasi, metadata, dan status yang memang membutuhkan penekanan.
- **Finalized risk form:** Form risiko dengan status `final` bersifat read-only. Semua field yang tampil tetap terkunci, termasuk selector RO, agar metadata versi final tidak dapat diubah dari form tersebut. Kode risiko dan periode asesmen bukan field di kartu Identifikasi; keduanya ditampilkan satu kali sebagai metadata pada panel Properti.
- **FormPage** is the centered form variant: `mx-auto w-full max-w-7xl min-w-0 space-y-6 pb-20`. Keep the 7xl content measure for all form/detail pages; keep multi-column workflows inside the same shell. Keep the header, notices, and content aligned under the shared page measure; do not add nested `mx-auto`/`max-w-*` wrappers around those siblings.
- **Form with contextual side panel:** When a form needs persistent review context, set `FormPage` to `max-w-7xl` and place the grid directly inside it with `gap-10` and `xl:grid-cols-[minmax(0,1fr)_360px]` and `xl:items-start`, keeping the context panel at its established 360px width while the form takes the remaining space. The wider shell gives the form and panel a usable analytical canvas while the gap keeps them distinct. Place `xl:sticky xl:top-20` on the inner context-panel wrapper instead of the grid item; this preserves the 56px topbar plus 24px desktop content inset without changing initial grid alignment. Do not add margin or transform corrections for this alignment. On narrower viewports, stack the form above the context panel. Standard route back actions sit above the global title, while the primary action group remains trailing-aligned with the context panel. Local form/detail headers use `FormBackAction` when their back row needs to remain aligned with the title edge; keep its transparent treatment and shared icon/label hover cue.
- **Evaluation detail form:** The `/evaluations/[id]` detail workflow uses the same wide form shell as Risk: set `FormPage` to `max-w-7xl`, use a local `CollectionPageHeader` with `backActionPlacement="local"` and `actionsPlacement="title"`, then place the form and context rail in `xl:grid-cols-[minmax(0,1fr)_360px]`. Keep Identitas Evaluasi, Hasil Pemantauan dan Evaluasi, and Permasalahan dan saran as separate always-open Cards with `px-5 py-4` headers and `px-5 pb-6 pt-2` content. Evaluation items are spacing-only rows with internal separators, standard 40px fields, semantic Badge tones for answers/status, and no nested card or second ring. The sticky status rail uses one Card and a borderless label/value metadata list; neutral guidance uses `bg-muted/50` without an ad hoc border.
- **Context side-panel sections:** Within a persistent form side panel, make `Properti` the first independently discoverable section and show a compact vertical label/value list for only status, risk code, and assessment period without a nested card surface. On the risk form, do not repeat risk code or assessment period as fields inside the Identifikasi card; their canonical visible location is the Properti list while their values remain part of form state and the save payload. Use the same dashed divider between Properti and Penanganan as between the later context sections. Avoid a generic “Navigasi” title and avoid tabs when Progress, Log, and Version History are parallel context. Set the side-panel `CardContent` baseline to 14px (`text-sm`), then present every section heading with a 12px (`text-xs`) semibold uppercase label using `text-muted-foreground/70` and `0.6px` tracking, separated by spacing and a light/dashed divider; use a vertical timeline/list for version history and keep each section independently discoverable. Version-history timeline markers use compact 12px (`size-3`) circles; the current version uses its semantic success fill, while other versions use a solid muted-gray fill instead of an empty ring. Timeline connectors must begin and end at the marker center so wrapped item content never makes the line drift. Log uses a compact activity feed without a nested card or avatar: show concise activity copy and a relative timestamp; make the row open a detail modal for full notes, metadata, and links, with the add-log action kept as a quiet trailing action below the feed. The detail modal reuses the add-log form shell and presents read-only values through disabled `Input` and `Textarea` fields. Side-panel Log and Version History previews show only the five newest items and expose a modal action for the complete scrollable list. Mitigation progress summary counts use a monochrome vertical list with no divider and right-aligned `tabular-nums`; body labels and values use the same 14px (`text-sm`) detail baseline, while section headings and status badges remain compact; the side panel omits the task detail/report table and keeps only the summary counts.
- **CollectionPageHeader** is the canonical header primitive for authenticated route pages that follow the operational ledger composition: a borderless content header with an optional title (`showTitle`), concise subtitle, back action, eyebrow/context, icon, and right-aligned action group. `AppHeader` enables the title and subtitle globally for standard routes; form/detail headers use the shared `FormBackAction` treatment and `actionsPlacement="top"` so their CTA group lands in the AppHeader title row and is centered against the complete title/subtitle block. The Risk registration form and Piagam detail are standalone route exceptions that keep `CollectionPageHeader` visible in the route: the Piagam header shows its title/subtitle with the status badge and local actions aligned to the `max-w-7xl` form edge, without a separate Versi badge. Other route-level back actions default to the dedicated top slot above the global title, while collection badges and actions remain local. Use `backActionPlacement="local"` and `actionsPlacement="title"` for standalone or embedded specimens that own their complete header. When `showTitle` is enabled for a catalogue or explicit standalone context, use the shared 28px medium `page-title`, 14px muted subtitle, and title-row action placement as documented. When a form uses a wider outer shell, set the width on its `FormPage` and keep the header and two-column grid as direct siblings so their leading and trailing edges stay aligned without nested max-width wrappers.
- **Working paper creation form** uses `CollectionPageHeader` with the same back-action pattern as the Risk form, a compact assessment-cycle badge, and the primary `AccentButton` aligned to the right-side action group. The global `AppHeader` supplies the page title and subtitle; the in-content header omits its duplicate title while retaining the route context and actions. Align the `CollectionSearchField` in the `FormSection` action slot so it shares the action row on desktop and stacks naturally on smaller screens. Use the shared `max-w-7xl` shell for the roster table, keep both form sections on their documented `FormSection`/`Card` surfaces, and use `CollectionSearchField`, `CollectionTableCard`, `CollectionTableHeader`, `CollectionTableHead`, `CollectionLoadingState`, and `CollectionEmptyState` for the roster workflow. Section headings carry enough context on this route, so omit redundant count badges and helper descriptions to keep the hierarchy compact. Risk codes and periods use monospace text, while status meaning stays in shared semantic badges; omit technical source-version metadata from the selection roster. Both risk-selection and signatory tables use the canonical `CollectionTableCard` shell with one structural hairline, visible rounded perimeter, and no route-local border or shadow. Integrate select-all and row checkboxes into the `Kode` column so there is no empty checkbox-only column. Exclusion is a binary roster decision and does not require an explanation field. Use a fluid `w-full table-fixed` layout with proportional columns; do not force a `min-width` or horizontal scroll for the risk-selection roster. Long code, period, title, and status values truncate safely with the shared shadcn `Tooltip` where needed. The confirmation uses the canonical `AlertDialog` shell with a compact numeric summary, a `Batal` outline dismiss action, and a primary submit action.
- **Bulk risk import workflow:** Use the shared `FormPage` `max-w-7xl` shell when a preview table has many columns, while retaining the shared `space-y-6` form rhythm. Keep download and submit in the `FormHeader` action group using `ActionButton` and `AccentButton`; its back action follows the shared `FormBackAction` geometry and transparent hover treatment. Import fields remain 40px (`h-10`) because this is a form workflow, not a collection toolbar; the planning-period field is omitted because it is not part of the bulk input contract. Bulk import is dedicated to creating new risks, so the page has one upload-and-review flow with no monitoring mode, cycle selector, organization selector, RO selector, or header badges. Organization context comes from the uploaded `UNIT KERJA` data for global users or the user's account scope for non-global users. Use `rounded-xl` Card surfaces without header dividers or nested elevation, a neutral `rounded-xl` dashed upload zone, and `CollectionEmptyState` for empty previews. Preview and result tables use one structural border, `CollectionTableHeader` with compact 40px geometry, and `CollectionTableHead`. Use semantic `Badge` tones for valid, warning, invalid, created, and failed states.
- **MetricGrid** is the shared responsive shell for four-up KPI summaries: one column by default, two from `sm`, and four from `xl`.
- **Collection KPI card (`KpiCard`)** is the shared summary card for operational and collection pages. Use its white tone by default with the canonical `surface-hairline`, `min-h-[100px]`, `rounded-xl`, `px-5 py-5`, 13px medium title-case label with zero additional letter spacing, and 28px semibold value. KPI cards contain only the label, value, and optional icon/status indicator; do not add subtitle or description copy. Keep semantic color in supporting icons or statuses only; do not add route-local card height, padding, radius, ring, background, or typography overrides.
- **Penanganan collection table:** Use a five-column layout with 44% for `Rencana Penanganan`, 18% for `PIC`, 14% for `Deadline`, 12% for `Status`, and 12% for `Aksi`. The panel wrapper uses `space-y-6`, so the KPI grid, search toolbar, and table/state surface remain separated by the canonical 24px vertical section gap. Combine the risk code into the plan metadata as `kode · judul`; render PIC with `text-muted-foreground`; and format deadline dates like the Pemantauan `Finalisasi` column with the `id-ID` `dd MMM yyyy` format.
- **CollectionToolbar** is the canonical two-zone row for collection controls: `leading` owns search and filters at the leading edge, while `actions` owns create, export, refresh, and other page actions at the trailing edge. Keep the gap between the zones flexible, stack them in source order below the content-fit breakpoint, and keep the toolbar outside `CollectionTableCard`; the table card contains only data, states, and pagination.
- **Piagam Manris collection:** Use the standard `PageStack` + `CollectionPageHeader` + `CollectionToolbar` composition. Keep search and annual period filtering in the leading toolbar zone, `Buat Piagam` as the trailing `AccentButton`, and use `CollectionSearchField` with the compact `h-9` period select. The table uses title as its primary identity, organization as secondary text, the compact 40px collection header, semantic `CollectionStatusBadge` tones (`neutral` for Draf/Digantikan/Diarsipkan and `success` for Aktif), and a sticky trailing Aksi column with the same quiet action-cell grammar as Risk Register: `bg-card px-3 py-2`, centered icon action, and row hover propagated through `hover:[&>td]:bg-muted/50`. Loading, error, and empty states use shared collection primitives. Keep the table as the dominant surface with no KPI cards that only restate its contents. Creation uses the canonical `/management/charters/new` route: soft navigation intercepts it as a title-only quick-create modal, while direct navigation renders the same flow as a standalone page. Do not use query-string create modes.
- **Piagam Manris form:** Render the editor as a `max-w-7xl` single-column `FormPage` with no outer card wrapper, section divider, or subtitle/helper copy beneath section labels. The large borderless title is introduced by a visible `Judul Piagam` label, uses an auto-growing textarea styled as plain document text (no border, background, radius, or focus ring), and wraps long text instead of truncating it; organization, UPR level, and four-digit year are intentionally omitted from the document body because the collection/header already carries that identity. Use always-open `DocumentFormSection` rows for Ruang Lingkup, Konteks Internal, and Konteks Eksternal with `showDivider={false}`, `stacked`, and no `description` prop so every narrative field sits below its section label. Use `titleId` plus the field's `aria-labelledby` instead of inserting an `sr-only` label sibling that would accidentally participate in content spacing. Use `DocumentListSection` for structured Dasar Hukum, Stakeholder Eksternal, and Struktur UPR: render a calm list surface with the section label above the surface, a trailing `+` action at the label's right edge, concise item title/meta rows, and an ellipsis action menu; do not repeat the section title or render a header inside the list card. For Struktur UPR, use the organization user picker so name and position are populated automatically; do not render manual name or position fields. Clicking `+` or `Edit` opens the shared `Dialog` shell to add or edit the row, while `Hapus` removes the unsaved row. Keep list surfaces on a 16px horizontal (`px-4`) and 6px vertical (`py-1.5`) inset, align the label action and row ellipsis with the form's trailing edge where possible, and remove decorative hover fills from list rows/actions. The route sets `FormPage` to `space-y-0` because the local header wrapper already owns the canonical 48px header-to-content gap; do not stack another page gap or top padding beneath it. One parent document stack owns `space-y-3` and `pb-8 lg:pb-10`; child narrative sections use `py-0`, while the title-to-scope boundary, list boundaries, narrative section transitions, and the next section use an explicit `!mt-6` override so all major section gaps resolve to 24px without changing the label-to-field rhythm. Keep 12px (`gap-3`) between each visible label and field, including the title and narrative section labels. Keep only the section title and its fields; avoid duplicate visible field labels for narrative textareas. Show the page title and subtitle in the local form header with the status badge only; omit the separate Versi badge. Keep the local back action with the same `px-6 lg:px-8` inset as the document fields so its leading edge aligns with the form. Keep the action group inside the route-level form header with the same `px-6 lg:px-8` inset as the document fields so its trailing edge aligns with the form content. Place the three-dot overflow trigger first as the leading icon affordance, followed by `Simpan draf` in the secondary treatment and `Finalisasi` in the primary treatment; the save button is disabled while clean and remains keyboard-shortcut compatible with Cmd/Ctrl+S. Place version history, revision, archive, restore, and draft deletion inside the overflow menu. All Piagam dialogs follow the same shell as the modal Lapor Progress Penanganan: `max-w-2xl no-scrollbar`, no close icon, `DialogHeader`/`DialogFooter` rhythm with a top footer divider, outline `Batal` using `CollectionDialogCancel`, and a primary `size="primary"` action. The version-history `Sheet` keeps its side-panel role but uses the same no-close-icon and footer-cancel treatment. Finalization is separate, requires a clean and complete draft, promotes it to locked Aktif, and subsequent edits begin through `Buat revisi`. Archival and restoration are reversible when identity does not conflict, while creator/superadmin draft deletion uses an irreversible `AlertDialog`. Do not use a sticky sidebar, accordion, nested cards, section-completion ornaments, autosave, or decorative governance badges. The current implementation intentionally omits Sasaran Organisasi while that module is hidden.
- **Collection control density:** Search fields, filter inputs, select triggers, report scope pickers, pagination-size selectors, and toolbar actions on collection/list pages use 36px (`h-9`). Keep the shared 40px (`h-10`) field geometry for form and detail workflows; do not change the base `Input`, `SearchInput`, or `SelectTrigger` primitives globally to achieve collection density.
- **Working-paper creation roster:** Keep the global `AppHeader` focused on the page title and one concise subtitle; keep the route-level `CollectionPageHeader` focused on the assessment-cycle badge and primary action. Keep both roster tables inside the canonical `CollectionTableCard` wrapper with its rounded hairline perimeter; use the fluid `w-full table-fixed` layout for risk selection. Put the select-all and row checkboxes inside the `Kode` column so the roster has no empty checkbox-only header column while selection remains available.
- **Working paper detail:** Use a `max-w-7xl` `FormPage` shell so the monitoring ledger and context rail remain readable within the shared page measure. `AppHeader` supplies the page title and concise subtitle; the route-level `CollectionPageHeader` sends its `FormBackAction` to the top slot and its action fragment to the AppHeader title-row slot with `actionsPlacement="top"`, keeping the CTA vertically centered against the title/subtitle block. Keep actions as a fragment so the shared header owns the single action wrapper; do not add a route-local flex wrapper around the group. Use the shared `AccentButton` for primary header actions, keep secondary status actions and `Ekspor Excel` inside the shared `Tindakan` popover, and use the shared alert-dialog action sizing for confirmations. Detail confirmation modals must follow the shared `AlertDialogHeader` composition with title and description together, then the standard footer action group. Use a two-column detail shell with `minmax(0,1fr)` as the main column and a 380px context rail on large screens. Keep the full-width `CollectionTableCard` monitoring ledger in the main column; move `Ringkasan dokumen` and `Monitoring Final` into the right rail above `Status Tanda Tangan` so operational status stays grouped with signing context. Keep the `Kode` cell focused on the risk code, expose the snapshot version in a dedicated `Versi` column, render the observed score level as text-only, and use a compact semantic `Badge` for monitoring status so state remains easy to scan without relying on color alone. Match the Risk Register ledger with a compact 40px header, single-line `h-10` body rows, `w-full table-fixed` layout, and proportional columns; truncate long titles and status labels so the table does not force horizontal scrolling. The signature timeline keeps its connector extending through the marker offset so consecutive steps read as one continuous path. In the summary card, keep 24px (`gap-6`) between the title and the item group, then render metadata as a vertical list with 16px (`gap-4`) between item blocks while retaining 8px (`gap-2`) between each label and value. Let the columns stack on smaller screens. The shared `CollectionTableCard` owns `w-full min-w-0` so a table fills its available column without introducing route-local width overrides.
- **Monitoring read-only ledger:** The `Pemantauan` collection is transaction-first: build its rows directly from `risk_monitorings` for the selected cycle so every created monitoring transaction appears even when no Kertas Kerja exists. Only active transaction states (`Berlangsung`, `Final`) are shown; a risk without a transaction does not belong in this ledger. For non-global users, scope the primary ledger to the user’s home organization (`organizationId`) only, while the supporting `Rekap per Organisasi` widget uses the user’s accessible organization scope so parent and child organizations remain visible in one flat list; global users retain the global view. Keep the page read-only, reserve mutations for the owner flow on the Risk page, and let the row/title provide the read-navigation path. The summary uses the transaction KPI states (`Berlangsung`, `Final`) followed by `Progress keseluruhan`; place `Daftar status pemantauan` immediately after that progress card as the primary ledger, then show the organization-summary disclosure. Each organization row reports only its own transaction entries, is sorted by name, and has no indentation, parent/child marker, hierarchy styling, or aggregate label. Reuse the risk-register collection grammar for search by code/risk, filter, cycle selection, refresh, table pagination, and URL-persisted state. Search, cycle, filter, and refresh controls all use the same compact 36px (`h-9`) toolbar height as Daftar Risiko. The primary ledger omits redundant `Organisasi` and `Aksi` columns; render source scores as muted historical references and observed scores with explicit semantic level badges without status icons. Long risk code/title summaries truncate to one line and expose the full value through the shared keyboard-accessible `Tooltip`. Do not rely on color alone.
- **Monitoring workspace:** A monitoring draft is a structured operational record, not a score-only form. Keep the cycle and source version visible in the header, collect observed score through the shared `RiskScorePickerTrigger` + `RiskScoreHeatmapModal`, then mitigation progress, profile revision, change reason, and conclusion in that order, and keep the baseline risk as a compact floating reference bar. Use the canonical `CollectionPageHeader` with the shared `max-w-7xl` shell and `xl:grid-cols-[minmax(0,1fr)_360px]` form/sidebar layout; the draft header uses the concise label `Pemantauan`. Form sections consume the same shared `CollapsibleCard` composition as Monitoring Overview so trigger geometry, chevron motion, header hierarchy, divider, and collapse behavior stay identical. Use `CollapsibleCard.Actions` only for a relevant contextual action; do not add a readiness badge such as `Siap dikirim` to the `Hasil Pemantauan` header. Draft actions must expose save state (`Belum disimpan`, `Menyimpan…`, `Tersimpan HH:mm`) and warn before leaving with unsaved changes through the shared `AlertDialog`. Inline validation must expose error relationships to assistive technology and focus the first invalid field. Load failures distinguish not-found from recoverable network/server errors and provide a retry action. Finalized monitoring changes the title to `Hasil Pemantauan Risiko`, shows finalized metadata and a link to the resulting risk version, and remains read-only; do not add a separate finalized-success banner below the header.
- **Monitoring baseline floating reference bar:** On the monitoring workspace, keep the source code/version, baseline score, probability/impact, target score, and risk level in a compact bottom-centered fixed bar. Use the white `bg-card` surface with the canonical `surface-hairline`, `rounded-xl` geometry, muted labels, foreground values, and thin neutral dividers. Do not use a black/translucent material, backdrop blur, gradient fade, or heavy floating shadow. Preserve a 44px detail target, keep the source context available while the user scrolls through fields, and let the content scroll horizontally on narrow screens without obscuring the form. The scrollable content must expose keyboard focus and a visible thin scrollbar, and the fixed offset includes the device safe-area inset. Reserve bottom breathing room in the page shell and keep the bar non-blocking outside its detail action.
- **Monitoring summary surfaces:** The persistent sidebar owns the single bordered shell and follows the risk-register side-panel Card grammar (`rounded-xl`, `px-5 py-5`, 10px section titles, 14px summary content, and `space-y-6` between panels). Use the shared Card default (`border-shadow`) for the shell. The monitoring conclusion uses a compact list of labeled sections with subtle dashed separators (`border-border/50`); score, evaluation, and effectiveness rows stay within the parent shell without nested cards or elevation. Keep the evaluation result on one line in the 360px sidebar (`whitespace-nowrap`) so the conclusion reads as a compact comparison. Place the mitigation-reporting summary in this same right-side shell below a dashed divider. Show only progress, total mitigations, reported count, pending count, and an inline disclosure for the mitigation list; each actionable row opens the shared report modal from a compact trailing `Lapor` button. Do not navigate away from the monitoring form or render the task-detail/report table inside the 360px sidebar. Status badges use the shared Design System `Badge` tones (`success`, `warning`, `danger`, or `neutral`) instead of route-local color classes. Empty summary states use a borderless neutral surface instead of a nested card.
- **Monitoring finalization:** Finalization is a deliberate commit. The confirmation surface must summarize cycle, source-to-observed score, resulting version, profile changes, and pending mitigation count. Use calm, explicit confirmation copy: `Pemantauan akan dikunci dan snapshot versi resmi akan dibuat. Tindakan ini tidak dapat dibatalkan.` The primary action is `Finalisasi` and the cancel action is `Batal`. Missing reports use a borderless muted warning surface with `bg-state-surface text-state-foreground` that identifies the count and states the terminal `Tidak dilaporkan` outcome; finalization closes them without creating a follow-up task in the next period. The backend creates an immutable risk snapshot for every finalized monitoring mode so the ledger, UI, and version history share one source of truth. Keep the finalization action disabled while saving and retain the dialog while the request is in flight.
- **Working paper risk-progress disclosure:** Keep the `Progress Kertas Kerja` disclosure at the bottom of the Kertas Kerja collection, after the primary roster and pagination, so the working-paper ledger remains the first reading target. Compose it from the shared `CollapsibleCard` API and start it collapsed. Use the shared `PopoverSelectField` beside the trigger for period selection; keep the interactive filter outside the toggle and close its option menu after selection. The expanded body is full-bleed: omit body padding so the `CollectionTableSurface` joins the disclosure wrapper directly rather than creating an inset or second border. Use the collection table grammar for organization, period, progress bar, and final-count columns; show the latest period first, then the remaining periods in descending period order, with loading and empty states neutral and explicit.
- **Monitoring organization-summary disclosure:** Keep `Rekap per Organisasi` as a `CollapsibleCard` below the Monitoring status ledger, initially collapsed so the first view stays focused on the primary monitoring ledger. Keep the selected cycle badge in `Actions`, render it as the compact `Badge` size on the shared muted surface with `bg-muted text-muted-foreground` rather than a semantic status fill, and reuse the shared trigger, keyboard focus treatment, grow/collapse animation, and collection table grammar.
- **CollectionPagination** is the shared footer pattern for data collections: keep the range summary at the leading edge, numbered page controls in the middle, and the page-size selector at the trailing edge. Render this footer only when the collection total is greater than 10; collections with 10 items or fewer omit it. Feature collections may pass a narrower `pageSizeOptions` list when their default density or workflow requires it; the default options remain `10 / 20 / 50 / 100`.
- **Intelligence collection pages** such as Meeting and Document Intelligence use the same `PageStack` + `CollectionToolbar` shell as the risk register. Keep their workflow cards on the neutral `rounded-xl` collection surface, with actions and review states inside that shared rhythm.
- **Meeting briefing result:** Do not wrap generated briefing content in one parent Card. Keep the compact `Draf Briefing` context badge and actions in a standalone top row, then render Participants, Agenda, Summary, Key Points, Follow-ups, Open Issues, and Decisions as separate shared `LabeledList` sections in one column with 40px section spacing. Each section keeps its label outside a single 10px-radius surface; rows share a 16px inset, vertical center alignment, and internal separators instead of becoming individual cards. Wrapped text increases row height while the content group remains centered; do not override the shared row with `items-start`. Keep non-essential helper copy, operational KPI summary, and follow-up metadata out of the result. Use standard compact semantic tones for priority and missing PIC/deadline states, and collapse follow-up metadata into responsive list-row trailing content rather than a wide table.
- **Meeting collection toolbar:** `/minutes` keeps only the shared `CollectionSearchField` in `CollectionToolbar` for now. Remove the date filter and toolbar creation action; keep the create-notulen CTA in the empty state so the collection remains actionable without adding toolbar noise.
- **Meeting briefing creation:** `/minutes/new` and its shared transcript workspace use `FormPage` (`max-w-7xl`) without a duplicate local `FormHeader`; the global `AppHeader` uses the same `max-w-7xl` container so its title/subtitle aligns horizontally with the form. Keep one neutral `Card` setup surface and let it own the single 16px inset; do not add padding again to its content. The transcript card header uses a compact two-line hierarchy: a 15px/23px medium title, a 13px/22px regular description, a 2px vertical gap, 16px top padding, and 16px horizontal inset. Use neutral output-choice buttons in a labeled fieldset with a pressed state communicated through border/background contrast and visible keyboard focus; keep the choice grid free of decorative icons. Stack the transcript label above a vertically resizable textarea with an 8px label-to-control gap. Align `ActionButton` and `AccentButton` to the trailing edge, wrapping on narrow screens. Keep generated briefing output flat and compose it from the separate `LabeledList` sections defined by the Meeting briefing result pattern. Use the compact neutral context badge for `Draf Briefing` and standard compact `danger`/`warning`/`success` badge tones for priority and missing PIC/deadline states. Empty result states use a single-line, vertically centered muted message with no nested panel, heading, or icon. Briefing save and risk-review dialogs use the canonical `Dialog` shell (`max-w-2xl` for the save flow, `no-scrollbar`, no close icon), the shared header/footer rhythm, `CollectionDialogCancel`, and `AccentButton`. The save dialog uses only the `Simpan Briefing` title, without supporting description. Risk linking is progressively disclosed behind one full-width `Pilih risiko` combobox trigger; keep search, result options, multi-select checkmarks, loading state, and empty state inside its popover, and show the selected count on the closed trigger instead of rendering a persistent search field, risk list, selected chips, or suggestion list in the dialog body.
- **Document Intelligence workspace:** Treat the document as the primary object, not a single upload form. Use a desktop-first two-area layout (`minmax(0,1fr) 320px`) with setup/history sections in the main canvas, a neutral spatial index, and a closable inspector. The new-process state uses an upload-first composition inside a centered `max-w-3xl` column and suppresses the duplicate global `AppHeader`; a visible local `CollectionPageHeader` owns the route title, subtitle, active process name, and actions. Preserve the standard 48px header-to-content separation. Keep only `Mode analisis` visible directly above the upload surface as two stacked radio cards, with the two options `SOP` and `Laporan Mitigasi`; the selected card uses a blue border and soft tint without a shadow while the unselected card remains neutral with visible hover and focus states. The processing period is generated automatically rather than exposed as a field. Give one large neutral `rounded-xl` dashed drop zone visual priority; use a restrained document glyph as the only non-semantic accent, concise Indonesian instructions, keyboard activation, visible focus, and reduced-motion-safe drag feedback. The drop zone exposes one keyboard target only: its programmatically activated file input stays outside the button semantics and outside the tab order. After a valid selection, replace the drop zone with one compact file row containing type thumbnail, filename, extension, size, removal control, validation feedback, and a card-matched `border-shadow`; do not simulate network upload progress. Keep the new-process state free of a setup or history accordion; processing history remains available in the active job workspace. Preserve the valid selected file when an invalid additional file is attempted, retain the one-document and 1 MB limits, and make `Mulai analisis` the sole primary setup action. The quarterly cycle still generates the process name automatically without a manual name or organization-ID field. During processing, expose an explicit job header, completed-task progress, compact parallel task lanes, and a factual activity timeline; progress uses native `progressbar` semantics and concise polite announcements. Do not use a large spinner or fake continuous progress. Spatial index pages are small thumbnail cards grouped by domain-relevant pastel accents (`Risk register`, `SOP & controls`, `Audit & findings`, `Planning & performance`, `Supporting documents`), with one selected outline and source-linked findings. Use `layout` animation with a critically damped spring (`bounce: 0`, roughly 180–400ms perceptual duration) for staged card entry and regrouping; when `prefers-reduced-motion` is active, disable layout/transform springs and smooth auto-scroll rather than only skipping the entrance animation. Completed and partial states keep the spatial index visible, summarize documents/pages/categories/findings/warnings/duration, group findings by severity, and expose the Indonesian actions `Buka sumber`, `Tinjau temuan`, `Ekspor hasil`, `Unduh laporan`, and `Mulai proses baru`. Keep all ministry-facing workflow labels in Indonesian, body/supporting text at 14px, and operational metadata/status at no less than 12px. At widths below `xl`, open the inspector as a modal Sheet with focus containment instead of stacking it after the complete workflow. Persist job summaries locally behind an adapter interface so backend processing can replace the deterministic mock without changing the surface contract; distinguish local results from server synchronization failures and provide a retry action. Recovery actions must preserve completed progress and allow task-level retry. History row actions use an always-visible overflow menu so rename and delete remain discoverable on touch.
- **CollectionFilterGrid** is the compact filter-row shell for collection pages. Use it without visible labels when the search or select control already carries its intent, and right-align trailing controls with `justify-self-end` so the row reads as a single toolbar line.
- **Collection search rows** should use a persistent `CollectionSearchField` when search is a primary collection action, including Daftar Risiko and Penanganan. Use the content-fit width (`w-full sm:w-80 sm:flex-none`) rather than filling the desktop toolbar; the field may become full-width on mobile when the controls stack. If the page also has a primary create/action CTA, keep search and filters in the toolbar's leading zone and place the CTA in the trailing action zone immediately above the table.
- Dense toolbars may use `ExpandableSearchField` when the search affordance must stay minimal. Reference-aligned collection pages with a dedicated title block should use the full-width `CollectionSearchField` row in the leading zone, with filter controls beside it and refresh/export/create actions grouped in the trailing zone.
- Mitigation reporting dialogs should reuse the shared `MitigationProgressDialog` shell so evidence and notes fields stay consistent across the compliance and risk workflows. The mitigation detail dialog uses the same no-scrollbar shell, title hierarchy, medium footer actions, and static header/body/footer content as the report dialog. Its informational fields use borderless metadata rows: muted 14px labels followed by icon- or dot-led values, with 8px label-to-value spacing, a 16px gap within the primary metadata group, and a 24px gap before evidence/notes. Detail metadata cards, such as working paper summaries, reuse this same borderless two-column pattern instead of nested card surfaces. There are no input-like borders or nested elevated cards; editable report fields remain the bordered shared input/textarea primitives. Long names, URLs, and notes wrap inside the modal instead of clipping. On desktop, the detail footer anchors `Tutup` to the leading edge and the primary progress action to the trailing edge; on mobile, the primary action remains above the secondary close action. When a detail dialog opens the report flow, the handoff is sequential and reduced-motion-safe rather than opening both modal layers at once.
- Mitigation plans inside forms use a five-column table for `Rencana Penanganan`, `PIC`, `Tipe`, `Detail`, and `Aksi`. Keep the primary action, PIC, and mitigation type editable in their row; expand `Rincian` inline beneath the row for supporting fields. Use the full-width dashed outline `Tambah Rencana Penanganan` action below the table and keep removal in the sticky trailing action column with an accessible label. Read-only mode retains the table structure while all row controls remain disabled. The table owns one rounded structural border and uses compact shared table headers.
- The shared mitigation reporting form is `MitigationProgressForm`; use it whenever a mitigation task needs evidence and notes inputs instead of hand-building a local `Input`/`Textarea` pair. Inside a dialog, the form shell is spacing-only (`space-y-4`) so it does not create a second card surface; the dialog owns the single elevated frame and its header has no bottom divider.
- Report dashboards use `CollectionToolbar` with report filters in the leading zone and an `Export` control in the trailing action zone. Report actions consume shared `ActionButton` and `AccentButton` variants and must not override accent tokens inline.
- **ReportPanel** is the required shell for report charts and analytical summaries. Pair it with `ReportGrid`, `ReportEmptyState`, `ReportDrilldownSummary`, and `ReportLinkGrid` instead of rebuilding card, empty, drilldown, or report-navigation surfaces inside route pages.
- The `/reports` dashboard uses an executive-first sequence: `Laporan Pergerakan Risiko` is the full-width primary comparison, followed by three 50/50 pairs: `Paparan Risiko` with `Tingkat Risiko Kritis`, `Tren Risiko` with `Tren Skor Kuartal vs Target`, then `Pergerakan Risiko per Organisasi` with `Distribusi Kategori Risiko`. Widgets stack in that same document order on smaller screens. From the medium breakpoint upward, keep paired columns at equal `minmax(0, 1fr)` widths and let only the primary comparison span both columns. Every analytical widget uses a shared 480px (`h-[30rem]`) height based on the organization-movement panel; mobile keeps natural height. Use the shared `ReportGrid` and wrap each widget with `flex min-h-0 min-w-0 w-full md:h-[30rem] md:[&>*]:h-full [&>*]:w-full`; add `md:col-span-2` only to the primary comparison wrapper. Panel content uses `min-h-0 flex-1`; chart regions absorb remaining space, legends stay fixed, and empty/loading states fill the entire content area. Keep `Tren Risiko` text-only without a decorative title icon and use the shared `PopoverSelectField` for its window picker. The semester target widget contains only its chart and persistent legend; do not add a nested snapshot surface.
- The `/design-system` route is the canonical catalogue for shared UI patterns. When feature pages introduce a new reusable shell, sync it back into the design-system component folder and this document.
- The design-system catalogue and production data collections must consume generic collection primitives for tabs, table shells, and pagination. Do not encode a route or feature name into these reusable components, and do not duplicate their structural class strings inside route pages.
- Collection table pages should place the heading and toolbar outside the card. The card itself should contain only the table, empty state, and pagination footer.
- Application data tables use the shared ledger header scale: `text-xs` labels (12px), `font-medium` (500), uppercase casing, `0.05em` tracking, the `table-header` token (`#FCFCFC`) as the header band, and 24px horizontal header padding. The dashboard `Risiko yang Perlu Perhatian` ledger is the readability exception: its four header labels use 14px (`text-sm`) while retaining the same 40px row, neutral table-header surface, and muted foreground. The table primitive normalizes every other header and nested header control to this 12px/500 scale, while all body cell content remains `font-normal`; table text defaults to `text-muted-foreground`, and row titles may opt back into `text-foreground` explicitly. Badge components keep their own semantic `tone` colors and are not overridden by the table text rule. Header bottoms and footer tops use `border-border/60`. `CollectionTableHead density="compact"` changes only the row geometry: its header text remains 12px/500. For compact collection headers, `CollectionTableHeader density="compact"` owns a 40px row with zero vertical cell padding so sortable controls do not inflate the header.
- Do not add KPI cards above a register table when the cards only restate the table total or simple category counts.
- Keep the register table as the dominant surface; move a necessary total into compact navigation or table pagination.
- Keep one concise page subtitle on every authenticated route; it should explain the page purpose rather than restate the title. Table headers within one table must share a single typography scale.
- Meeting briefing detail uses the same `max-w-7xl` shell for `AppHeader` and page content so their leading edges remain aligned. The reading experience is one `Card` document surface with `gap-0 p-0`, 24px mobile and 32px desktop horizontal insets, and full-width internal dividers. Its document header contains the meeting title, creator byline, and a responsive two-column definition list for meeting date, participant count, next check-in, and briefing ID. This is inline document context, not a separate metadata card. Participant identities must remain rendered content that is discoverable by keyboard and touch; never expose them only through a non-focusable `title` tooltip. Present summary, agenda, key points, follow-up actions, open issues, decisions, and linked risks as editorial sections inside the same surface. The summary uses the full available section width; agenda uses the same dot-led bullet treatment as key points. Follow-up actions may use subtle neutral date bands followed by flat task rows without decorative icons or priority badges. Linked risks use full-width text links with visible focus and a trailing chevron, placing the monospace risk code above the title with balanced horizontal and vertical padding. Keep body copy at `text-sm` and avoid icons or colored boxes that are purely decorative.
- Meeting briefing detail states distinguish loading, recoverable load errors, and not-found/access-denied outcomes. Loading is announced with a polite live status, decorative indicators are hidden from assistive technology, and continuous motion is wrapped in `motion-safe`. Recoverable errors expose a visible retry action. Destructive delete dialogs use the canonical no-close-icon shell, keep the dialog open with an actionable error when deletion fails, and close only after success. User-facing copy on the detail route uses the collection term “Notulen” consistently.
- Place register search and filter controls on the same responsive toolbar row above the single register collection; stack them only when horizontal space is insufficient.
- Dense table scores use the same body scale as adjacent cells with tabular numerals. Compact status and period badges use the shared full-rounded pill geometry.
- Sortable table headers must use a keyboard-focusable control and expose the current direction with `aria-sort`.
- Period and monitoring indicators must pair color with a visible icon or text cue and an accessible status label; never rely on color or hover-only tooltips.
- Keep compact row actions visible with a sticky trailing column when a table still needs horizontal scrolling. Pagination labels and controls use at least the `text-xs` and 32px control scale.
- Register table cards begin directly with the table header, without an empty padded title band. Their outer shell uses `rounded-xl bg-card` with the shared `border-shadow` treatment through `CollectionTableCard`. Keep the header divider at `border-b border-border/60` and avoid layered outer borders or rings.
- Embedded ledgers inside an existing Card or disclosure use the shared `CollectionTableSurface` shell instead of adding a second table border or elevated card. Keep its viewport responsible for horizontal overflow and use the same `CollectionTableHeader`, compact `CollectionTableHead`, header row, and muted row-hover grammar as standalone collection tables.
- Sticky action cells inside register and collection tables should use the card surface (`bg-card`) with compact `px-3 py-2` padding and a centered quiet icon action; when the row is hovered, the same `bg-muted/50` surface must cover the full cell like every other body cell through `hover:[&>td]:bg-muted/50` on the row.
- Register pagination should live as the table card footer: range text on the left, numbered page controls in the middle, and items-per-page on the right. Its top border and the table header's bottom divider both use `border-border/60` so the collection reads as one continuous boundary.
- Search fields on bright operational toolbars use the light card/popover surface with a subtle inset border; reserve stronger muted fills for grouped or recessed controls.
- All table headers use the shared neutral `table-header` surface (`#FCFCFC`) with muted uppercase labels. Keep the header divider lighter than the body grid, and keep row actions visually quiet with icon-only controls.
- Service, subscription, and other two-line operational tables use the compact ledger geometry by default: 24px horizontal cell padding, a 72px body row, semantic compact status badges, centered toggle controls, and quiet filled text actions. Two-line title cells place the primary title first at `font-normal`, followed by a secondary code or identifier below it in 11px monospace with positive tracking. Single-line registers such as Risk Register use `h-10` body rows to preserve scan density. Semantic tables such as alerts, heatmaps, and instructional criteria may opt into their own surface and density through explicit classes.
- Treatment tables may use the action-led variant with a `font-normal` plan title, a 14px monospace risk code, and the risk-code column immediately after the plan column so the action remains the first scan target. The recommended desktop proportions are `34% / 10% / 18% / 14% / 12% / 12%` for plan, risk code, PIC, deadline, status, and actions.
- All semantic badges, status pills, count chips, and metadata pills must use the shadcn `Badge` primitive from `frontend/src/components/ui/badge.tsx` (or its shared design-system re-export). Use the built-in `variant` API for standard states and the explicit project `tone`/`size` variants for semantic dense states; do not create local `<span>`/`<div>` badge replacements or local badge base-class helpers.
- Dense code-like identifiers in table rows stay text-only; do not wrap them in filled chips when the row already has a compact badge for state.
- Risk assessment summaries use the shared `RiskAssessmentSummaryStrip` pattern: score block on the left, semantic level badge, optional status badge, compact metrics, and an optional note row.
- Auto-derived evaluation details such as risk priority and risk appetite are presented as borderless label/value metadata in `text-sm font-normal text-muted-foreground`, without redundant parenthetical helper copy; only user-selectable treatment decisions retain field controls.
- Risk score selection uses the shared `RiskScoreHeatmapModal` and `RiskScorePickerTrigger`: keep the form trigger as a compact single-line, content-sized control (`self-start`, `w-fit`, `max-w-full`) with the computed score as the visual focal point, followed by the semantic level and chevron. Keep the surrounding form row to its field label only; do not add a redundant inline instruction beside the trigger. Keep the trigger's title and current probability/impact values available to assistive technology without repeating them visually when the surrounding form label already provides that context. Let the modal select one cell from a spacious 5×5 heatmap, show numeric and textual level labels directly under each axis value, preserve semantic level colors with text, support arrow-key navigation and 44px touch targets, and commit only through `Terapkan Skor`. Use sentence-case titles and the device-neutral instruction `Pilih kombinasi probabilitas dan dampak untuk melihat skor serta level risikonya`; avoid pointer-only wording such as `Klik` and mixed terminology such as `cell`. The heatmap modal uses a tight `gap-0` header rhythm with `mt-0.5` description spacing and no close icon; `Batal` remains the explicit dismiss action in the footer. Applying or cancelling must preserve the mounted dialog instance long enough for the shared 200ms opacity/scale exit and scrim fade to complete; never change the modal's React `key` from its open state. Reset the draft selection from the committed values whenever the modal opens instead. On desktop, compact 56px heatmap rows and a natural-height body keep the middle content from becoming a scroll container; narrow viewports may retain overflow scrolling as a safety fallback. The selected heatmap cell keeps its semantic level border color and increases only the border width to 2px; do not add a black/foreground border, checkmark, ring offset, or second perimeter. Omit standalone `Probabilitas`/`Dampak` axis titles when the grid structure already makes the axes clear; keep the level descriptions visible rather than tooltip-only because the modal must remain discoverable for touch and keyboard users. Keep the heatmap grid on the modal canvas without an extra gray surface or top inset, and use borderless Probabilitas, Dampak, and Hasil summaries with prominent numeric values below it. Summary values update statically when the selection changes and retain tabular numerals to prevent layout shift. Do not repeat the same selection in a header badge or a second `RiskAssessmentSummaryStrip` stacked beneath the picker.
- Semester indicators, archived banners, AI suggestion dropdowns, progress meters, empty states, and version timelines must be implemented as shared component patterns once they appear in more than one route.
- **AI suggestion modal:** Title-generation suggestions use the shared `AiSuggestionModal` `clean-list` variant with single selection, a flat list without a visual wrapper or dividers, item text aligned to the modal title edge, compact title/description/meta hierarchy, restrained hover/focus states, and an `Accordion / Collapse` detail reveal that smoothly grows on hover/focus over 200ms with the shared `Ease-out` curve. On initial open, focus the dialog shell rather than the first suggestion so every detail starts collapsed; a row may reveal details only after deliberate hover or keyboard focus. Clean-list descriptions remain untrimmed when revealed, the list uses a bounded native scroll boundary, selection applies directly on item click, and the footer contains only the shared `CollectionDialogCancel` action. This variant has no header icon, subtitle, or close control; keep it compact and let the list own the primary action. Respect `prefers-reduced-motion` by showing the detail immediately without the transition. Multi-select AI cause and impact suggestions use the shared `AiSuggestionModal` `structured-list` variant, matching the `MitigationProgressDialog` shell with a title-only header, no close control, medium footer actions, and a divider-free list containing only a checkbox and suggestion text. Its footer places a live `selected/total saran dipilih` count on the leading edge in monospace tabular numerals and keeps the cancel/apply actions grouped on the trailing edge. Its list body must own the bounded native scroll with safe end padding, the list viewport ends directly at the footer's top border, and the modal uses a responsive explicit height capped at 560px so the footer remains visible without making the modal too tall. Keep suggestion choices in a modal when the list needs more room than the source field; do not anchor a dense suggestion panel beneath the input.
- **Inline editable lists:** Shared cause, impact, and substance rows insert synchronously when the controlled array changes. Newly inserted rows may use one 200ms `--ease-out` fade/slide entrance scoped to IDs added since the previous controlled snapshot; existing rows must remain stable and must not replay motion during add, remove, or edit. Use `motion-safe` / `motion-reduce` so reduced-motion users see no entrance animation, keep color-based `transition-colors` hover feedback, omit internal dividers, and never animate layout properties.
- `MonitoringTransactionProgress` is the shared compact segmented indicator for quarterly monitoring transactions and other short lifecycle progress. Its default data renders four quarter segments and shows finalized transactions over the four quarterly slots as a compact count (for example, `1/4`); custom `items` can reuse the same visual grammar for a different count label such as `TTE`. It uses graphite segments only for completed items and muted segments for draft or unavailable items, while the accessible label/title must describe the active context. Register tables reserve at least 176px for the quarterly variant so the segments and count stay visible beside sticky actions.
- Overview dashboard panels and report charts must consume the shared `StandardCard`/`ReportPanel` shell instead of duplicating card, header, and content classes. The shell uses a compact divider-free header band (`text-sm font-medium normal-case leading-5`, 14px) with `px-4 py-4`, `gap-4` when an action is present, a semantic `h2` title, and the direct `surface-border` hairline across charts, heatmaps, list panels, and report summaries. Headers with a 36px select action use `items-start` through `headerClassName` so the title retains the same optical 16px top and left inset; badge actions keep the default centered alignment. Chart widget bodies use one balanced `p-4` (16px) content inset; stacked series with human-readable labels must bind directly to their semantic color token instead of interpolating labels into CSS variable names. Explicitly floating surfaces retain the shared smooth elevation.
- Overview dashboards render their shell immediately and load each panel independently. Use the shared `OverviewPanelState` for loading, error, and empty states; an API error must never be represented as a valid zero or empty dataset. Recoverable errors expose the shared `Coba lagi` action, while missing phase payloads use an explicit unavailable state rather than a fabricated zero grid.
- Overview attention risks use an integrated checkbox-free ledger inside the card: a 40px `table-header` band labels Kode, Judul, Kategori, and Skor, followed by flat linked rows separated by neutral hairlines without a trailing `>` icon. Keep code and title in separate columns, render both code and category at 14px with normal weight, and render the score with the shared `Badge` primitive at `micro` size, `font-mono` tabular numerals, and the semantic risk-level color treatment. Use `font-normal` across code, category, score, and title. Headers use normal capitalization rather than all caps; compact rows keep the fixed columns aligned at every viewport width. On desktop, use `grid-template-columns: 5fr 32fr 8fr 5fr` for 10% Kode, 64% Judul, 16% Kategori, and 10% Skor of the available width after gaps; collapse Kategori below Judul on narrow widths, where the grid becomes 10% Kode, 80% Judul, and 10% Skor.
- **Narrative Overview:** The dashboard serves leadership and operational risk teams through a single reading order: current condition, change over time, attention priorities, then current concentration. It keeps the trend full-width, places priority risks beside the current heatmap on wide screens, and opens the complete multi-phase comparison from the small bottom-center expand control on the current-heatmap card. Paired cards share the same lower baseline; the absolutely positioned expand control straddles that baseline without adding height to the heatmap card, while spacing is reserved by the containing section. The current-heatmap body uses a deliberate top inset after its header so the matrix does not crowd the title. The compact heatmap communicates through its matrix and severity legend without a redundant total-count caption. Tooltip values and series labels use separate inline elements with an intentional gap so they remain legible at a glance. The `/overview` route suppresses the page-level `AppHeader`, and dashboard cards omit helper subtitles so titles and data carry the hierarchy. Do not invent percentages, deltas, counts, or movement claims that are absent from the fetched data.

```yaml
dashboard-narrative-overview:
  scope: "overview content plus route-level AppHeader visibility; global sidebar and topbar stay unchanged"
  audience: "leadership and operational risk teams"
  header: "none; /overview suppresses AppHeader"
  order: "kpis > trend > priorities-current-heatmap"
  card-helper-subtitles: "none"
  priority-list: "checkbox-free compact ledger with separate Kode, Judul, Kategori, and Skor columns"
  multi-phase: "modal from the current-heatmap card bottom-center expand control"
  surface: "off-white page, white panels, one-pixel neutral boundary, minimal shadow"
  radius: "12px to 16px"
  color: "monochrome structure; blue for primary trend; severity colors only for risk meaning"
  motion: "one restrained page reveal; subtle row feedback; reduced-motion safe"
  responsive: "4 KPI columns on wide screens, 2 on tablet, 1 on mobile; analytical row stacks before content becomes cramped"
  data-integrity: "never render invented deltas, percentages, counts, or movement claims"
```
- Nested overview panel states use a slightly tighter inner radius than the outer card, and shared badges transition only their color, background, border, and focus-shadow properties.
- Dashboard KPI cards do not contain charts or inline trend/comparison indicators. Use the same shared KPI card treatment as collection pages: 13px title-case title, 28px KPI value, and `—` when the value is unavailable. Use the dedicated dashboard charts below the KPI grid for trend analysis.
- Dashboard charts and heatmaps require persistent text legends plus accessible summaries. Color and hover-only tooltips may supplement meaning but must never be the only way to identify a category, series, score, or risk level. The multi-phase heatmap risk-level legend is a full-bleed footer with a full-width top border and the shared `table-header` background (`#FCFCFC`).
- Dashboard and report charts use a clean plotting field without Cartesian gridlines. Line series render as uninterrupted strokes without point markers, including hover/active markers; use the tooltip and persistent legend for exact values and series identification.
- Keep overview heatmaps at one column on phones and two columns on ordinary laptop/tablet content widths. The multi-phase comparison heatmap uses six columns at wide desktop (`2xl`) so all six 5×5 matrices remain legible in one row; other overview heatmaps may use four columns at wide desktop where that is the appropriate density.
- Rows with hover or press feedback must be interactive. Overview top-risk rows link to the risk register detail, expose a keyboard focus ring, provide at least a 44px target, and disable transform motion when reduced motion is requested.

### Dropdowns and Popovers
- **Style:** Compact solid surfaces with a `12px` radius, a 4px inner inset, small offset from trigger, and the Card `border-shadow` boundary. Keep option rows at 32px (`h-8`) with an 8px radius; use 8px left padding and reserve 40px on the right for selectable indicators. Use a quiet neutral fill for hover/focus and a trailing checkmark for selection. Avoid relying on translucency for content legibility. Keep the canonical trigger at 36px (`h-9`). The shared `PopoverSelectField` used by risk forms, risk filters, and assessment fields delegates to this same DropdownMenu panel/radio-item geometry.
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
- **Do** use rounded-lg for controls, rounded-xl for cards and dialogs, rounded-md for tab buttons.
- **Do** let cards, popovers, and dropdowns breathe with enough edge padding.

### Don't:
- **Don't** use saturated backgrounds or heavy gradients.
- **Don't** use pure black as a neutral surface; default content uses `foreground`, while white remains reserved for card and primary-foreground surfaces where the reference palette calls for it.
- **Don't** make every surface glassy or translucent — content should be solid.
- **Don't** use oversized mobile-style controls in desktop layouts.
- **Don't** use rounded-full for every button unless intentionally using pills.
- **Don't** use font-bold excessively — prefer font-medium and font-semibold.
- **Don't** rely only on color for interactive state — use borders, background shift, and focus rings.
- **Don't** use runtime SVG clip-path or JS-based corner smoothing on shared DOM controls.
