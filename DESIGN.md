---
version: alpha
name: Manris
description: macOS-inspired operational design system for risk and incident management. Neutral-first, blue-accented, desktop-density controls with SF Pro system typography.
colors:
  background: "oklch(0.985 0 0)"
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
  accent: "oklch(0.62 0.19 240 / 0.1)"
  accent-foreground: "oklch(0.62 0.19 240)"
  destructive: "oklch(0.64 0.21 27)"
  border: "oklch(0 0 0 / 0.1)"
  input: "oklch(0 0 0 / 0.1)"
  ring: "oklch(0.62 0.19 240 / 0.25)"
  sidebar: "oklch(0.97 0 0 / 0.7)"
  sidebar-foreground: "oklch(0.15 0 0)"
  sidebar-primary: "oklch(0.62 0.19 240)"
  sidebar-primary-foreground: "oklch(0.99 0 0)"
  sidebar-accent: "oklch(0 0 0 / 0.05)"
  sidebar-accent-foreground: "oklch(0.15 0 0)"
  sidebar-border: "oklch(0 0 0 / 0.1)"
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
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, SF Pro Display, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, SF Pro Display, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0px"
  mono:
    fontFamily: "SF Mono, ui-monospace, SFMono-Regular, SF Mono, Consolas, Liberation Mono, monospace"
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
    rounded: "{rounded.full}"
    height: "32px"
    padding: "0 12px"
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

Manris is a macOS-inspired operational interface for ministry teams handling risk and incident management under pressure. The visual language feels like a well-kept briefing room — calm, precise, credible, and ready for daily use. The system uses restrained neutrals, blue accent for primary actions, compact desktop-density controls, soft rounded corners, and SF Pro system typography to keep attention on the task.

This system should stay institutionally grounded without becoming stiff. It should reduce panic, surface the next action quickly, and keep high-stakes workflows legible when information is incomplete. The product explicitly rejects decorative chrome, noisy card repetition, flashy gradients, and analytics theater. The authenticated surface should remain quiet and dependable.

**Key Characteristics:**
- Neutral-first palette with blue as the operational accent.
- Desktop-density spacing — compact but never cramped.
- SF Pro system typography with text-sm as the workhorse size.
- Soft borders and restrained shadows over heavy decoration.
- Translucent materials reserved for chrome (sidebar, toolbar), solid surfaces for content.

## Colors

The palette is neutral-first with blue as the primary system accent. Color is used for status and emphasis, not decoration.

### Primary
- **Accent Blue** (`oklch(0.62 0.19 240)`): System accent, active selection, focus ring.
- **Teal Action** (`#00b9ad`): Primary CTA color — used for key create/add actions (e.g., "Tambah Risiko").

### Neutral Palette
- **Background** (`oklch(0.985 0 0)`): Main page background — subtle paper tone.
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
**The Neutral-First Rule.** Blue is the primary system accent. Teal (`#00b9ad`) is reserved for key create/add CTAs. Use blue for primary actions, active selection, and focus only — never as decoration. Let neutrals carry the interface.

## Typography

**Primary Font:** SF Pro Text / SF Pro Display via system font stack (`-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", sans-serif`).
**Mono Font:** SF Mono for code, IDs, and technical values.

Typography should feel crisp and legible at desktop densities. SF Pro provides one coherent voice across headings and body copy. Text-sm (14px) is the default workhorse size.

### Hierarchy
- **Display** (600, 0.875rem): Section titles, nav labels, compact emphasized labels.
- **Headline** (600, larger than body by at least 1.25x): Page titles and primary screen headers.
- **Title** (600, slightly smaller than headline): Card titles, panel labels, form section headings.
- **Body** (400, 0.875rem, 1.5 line-height): Form copy, helper text, task instructions. Keep prose around 65–75ch when possible.
- **Label** (500, 0.875rem): Button text, field labels, sidebar items, compact tags.

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
- **Tab buttons:** `rounded-md` (6px) inside a `rounded-lg` container.
- **Primary:** Blue fill with white text, used for the main action in a task flow.
- **Secondary / Outline:** Neutral surface with border, used for supporting actions.
- **Ghost / Subtle:** Transparent background with hover fill, used for low-priority actions.
- **Hover / Focus:** Light background shift and visible blue focus ring; no bounce, no motion flourish.

### Cards
- **Default:** `rounded-lg` with 16px padding, white surface, subtle border.
- **Large:** `rounded-lg` with 24px padding.
- **Shadow Strategy:** Small lift only (`shadow-sm`).
- **Border:** Subtle border (`border-black/10`).

### Inputs / Fields
- **Input:** 36px high (h-9), `rounded-lg` (8px), 12px horizontal padding, text-sm.
- **Search:** 36px high (h-9), `rounded-lg` (8px), 12px horizontal padding, muted fill.
- **Focus:** Blue ring (`ring-blue-500/25`).
- **Error / Disabled:** Use semantic red for invalid state and lower-opacity neutral fills for disabled.

### Overlays and Groups
- **Modal:** `rounded-2xl` with 24px padding, `shadow-2xl`.
- **Bottom sheet:** `rounded-t-2xl` with 20px padding.
- **Dropdown:** `rounded-2xl` with translucent backdrop.
- **Popover:** `rounded-2xl` with translucent backdrop.
- **Toast:** `rounded-2xl` with 10px vertical and 14px horizontal padding.
- **List group:** `rounded-2xl` with clipped overflow.
- **Segmented control (TabsList):** `rounded-lg` with 4px internal padding, tab buttons `rounded-md`.

### Chips and Icon Tiles
- **Chip:** 32px high, pill-shaped (`rounded-full`), with 12px horizontal padding.
- **Icon tile:** 36px square with `rounded-lg`.
- **App icon tile:** 56px square with `rounded-2xl`.

### Navigation
- **Style:** Sidebar and toolbar use translucent material (`bg-card/70 backdrop-blur-xl`) with compact rows (32px), muted inactive state, and blue-backed active state.
- **Typography:** text-sm font-medium for items, text-[11px] font-semibold uppercase tracking-wide for section labels.
- **Hover:** Subtle background shift — no bounce, no motion flourish.
- **Mobile Treatment:** Collapse sidebar to icon-only or bottom tab bar.

### Dropdowns and Popovers
- **Style:** Compact white/translucent surfaces with `rounded-2xl`, small offset from trigger, `shadow-xl`. Nearly opaque (`bg-card/95`) with slight backdrop blur.
- **Behavior:** Overlays should open near the trigger, remain readable, and never feel clipped or cramped.

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
