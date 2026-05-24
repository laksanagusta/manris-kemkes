---
name: Manris
description: Light-first operational design system for risk and incident management.
colors:
  background: "oklch(0.985 0.003 170)"
  foreground: "oklch(0.18 0.02 170)"
  card: "oklch(1 0 0)"
  card-foreground: "oklch(0.18 0.02 170)"
  popover: "oklch(1 0 0)"
  popover-foreground: "oklch(0.18 0.02 170)"
  primary: "oklch(0.48 0.12 175)"
  primary-foreground: "oklch(0.99 0 0)"
  secondary: "oklch(0.955 0.01 170)"
  secondary-foreground: "oklch(0.30 0.06 175)"
  muted: "oklch(0.96 0.006 170)"
  muted-foreground: "oklch(0.50 0.015 170)"
  accent: "oklch(0.94 0.018 175)"
  accent-foreground: "oklch(0.30 0.06 175)"
  destructive: "oklch(0.58 0.22 27)"
  border: "oklch(0.91 0.008 170)"
  input: "oklch(0.91 0.008 170)"
  ring: "oklch(0.50 0.10 175)"
  sidebar: "oklch(0.975 0.004 170)"
  sidebar-foreground: "oklch(0.25 0.02 170)"
  sidebar-primary: "oklch(0.48 0.12 175)"
  sidebar-primary-foreground: "oklch(0.99 0 0)"
  sidebar-accent: "oklch(0.94 0.015 175)"
  sidebar-accent-foreground: "oklch(0.22 0.03 175)"
  sidebar-border: "oklch(0.91 0.008 170)"
  sidebar-ring: "oklch(0.50 0.10 175)"
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
    fontFamily: "DM Sans, Manrope, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Manrope, DM Sans, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  mono:
    fontFamily: "Geist Mono, ui-monospace, 'SFMono-Regular', 'SF Mono', Consolas, 'Liberation Mono', monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
rounded:
  sm: "7px"
  md: "10px"
  lg: "12px"
  xl: "16px"
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
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  button-ghost:
    backgroundColor: "{colors.transparent}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  card-default:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.xl}"
    padding: "16px"
  input-default:
    backgroundColor: "{colors.transparent}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
---

# Design System: Manris

## Overview

**Creative North Star: "The Operational Ledger"**

Manris is a light-first operational interface for ministry teams handling risk and incident management under pressure. The visual language should feel like a well-kept briefing room, not a startup dashboard: calm, precise, credible, and ready for daily use. The current system leans on restrained teal accents, clean cards, compact controls, and strong editorial hierarchy to keep attention on the task.

This system should stay institutionally grounded without becoming stiff. It should reduce panic, surface the next action quickly, and keep high-stakes workflows legible when information is incomplete. The product explicitly rejects decorative AI chrome, noisy card repetition, flashy gradients, and “analytics theater.” Public entry screens may use a limited branded flourish, but the core authenticated surface should remain quiet and dependable.

**Key Characteristics:**
- Light-first, with dark mode as a functional inversion rather than the default mood.
- Restrained color, with teal as the primary operational accent.
- Compact, familiar controls that read like trusted enterprise software.
- Editorial spacing and hierarchy over decoration.
- Exceptions for brand expression are narrow and intentional.

## Colors

The palette is restrained and institutional, with teal carrying the main system voice and semantic colors reserved for meaning.

### Primary
- **Operational Teal** (`oklch(0.48 0.12 175)`): Main action color, active states, focus ring alignment, sidebar primary, and chart emphasis.

### Secondary
- **Pale Teal Wash** (`oklch(0.955 0.01 170)`): Secondary surfaces, subtle panel fills, and quiet supporting states.
- **Teal Accent Wash** (`oklch(0.94 0.018 175)`): Hover and selection surfaces when the UI needs a soft active cue.

### Semantic
- **Risk Low Green** (`oklch(0.72 0.17 155)`): Low risk indicators, success states, and positive status chips.
- **Risk Medium Amber** (`oklch(0.78 0.16 85)`): Caution states and moderate risk markers.
- **Risk High Orange** (`oklch(0.70 0.18 40)`): Elevated risk markers and strong warning states.
- **Risk Extreme Red** (`oklch(0.58 0.22 27)`): Destructive, critical, and urgent conditions.

### Neutral
- **Paper Background** (`oklch(0.985 0.003 170)`): Main page background.
- **Card White** (`oklch(1 0 0)`): Card and popover surfaces.
- **Ink** (`oklch(0.18 0.02 170)`): Primary text.
- **Muted Ink** (`oklch(0.50 0.015 170)`): Secondary text, helper copy, and metadata.
- **Border Mist** (`oklch(0.91 0.008 170)`): Borders, input strokes, dividers.

### Named Rules
**The One Accent Rule.** Teal is the primary system voice. Use it for primary actions, active navigation, focus, and meaningful status only, not decoration.

## Typography

**Display Font:** DM Sans, with Manrope and system sans fallbacks.  
**Body Font:** Manrope, with DM Sans and system sans fallbacks.  
**Mono Font:** Geist Mono for code, IDs, and technical values.

The typography should feel modern, legible, and slightly editorial without becoming theatrical. Headings use DM Sans to create a clean institutional voice, while body text stays neutral and highly readable for task work.

### Hierarchy
- **Display** (600, 1rem base in system tokens, used as the branded UI face): Section titles, nav labels, and compact emphasized labels.
- **Headline** (600, larger than body by at least 1.25x in screen components): Page titles and primary screen headers.
- **Title** (600, slightly smaller than headline): Card titles, panel labels, and form section headings.
- **Body** (400, 1rem, 1.5 line-height): Form copy, helper text, and task instructions. Keep prose around 65 to 75ch when possible.
- **Label** (600, compact size, tight tracking): Field labels, button text, and navigation items.

### Named Rules
**The Plain Voice Rule.** Labels and actions should read like trusted workplace software, not marketing copy. Avoid ornament in UI text.

## Elevation

The system uses subtle layered depth rather than dramatic shadows. Surfaces are mostly flat and light, with shadow acting as a small separation cue for cards, popovers, and dropdowns. Depth should come primarily from background tint, border, and spacing, not blur or heavy glow.

### Shadow Vocabulary
- **Card Lift** (`0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(24,24,27,0.05)`): Default card elevation for content panels.
- **Control Lift** (`0 1px 1px rgba(0,0,0,0.04)`): Buttons and small interactive controls.
- **Popover Lift** (`0 4px 24px rgba(0,0,0,0.08)`): Menus and transient overlays.

### Named Rules
**The Flat-First Rule.** Do not add shadow for decoration. If a surface needs emphasis, use hierarchy, spacing, or border before shadow.

## Components

Components should feel familiar, compact, and sturdy. They should disappear into the workflow and only become visible when their state changes.

### Buttons
- **Shape:** Rounded medium corners, currently 12px.
- **Primary:** Teal fill with light text, compact 8 to 12px padding, used for the main action in a task flow.
- **Hover / Focus:** Slight color shift and visible ring; no bounce, no motion flourish.
- **Secondary / Outline / Ghost:** Use neutral surfaces and subtle hover fills for supporting or low-priority actions.

### Cards
- **Corner Style:** 16px outer radius, with rounded internal header and footer treatment.
- **Background:** White card surface on a light paper background.
- **Shadow Strategy:** Small lift only, enough to distinguish content planes.
- **Border:** Thin mist border or inset ring for structure.
- **Internal Padding:** 16px standard, 12px for compact variants.

### Inputs / Fields
- **Style:** Compact 8px-high control feel with rounded corners, thin border, and transparent or lightly tinted fill.
- **Focus:** Teal ring and border reinforcement.
- **Error / Disabled:** Use semantic red for invalid state and lower-opacity neutral fills for disabled state.

### Navigation
- **Style:** Sidebar and header use familiar enterprise patterns, with compact rows, muted inactive state, and teal-backed active state.
- **Typography:** Small, legible labels with icon support.
- **Default / Hover / Active:** Inactive is muted, hover is softly tinted, active is filled or strongly accented.
- **Mobile Treatment:** Keep navigation structural and predictable rather than inventive.

### Dropdowns and Popovers
- **Style:** Compact white surfaces with rounded corners, small offset from trigger, and enough collision padding to keep away from screen edges.
- **Behavior:** Overlays should open near the trigger, remain readable, and never feel clipped or cramped.

## Do's and Don'ts

### Do:
- **Do** keep the interface light-first and use teal as the primary operational accent.
- **Do** preserve compact, familiar controls for forms, menus, and navigation.
- **Do** use subtle shadows and borders for separation, not decoration.
- **Do** keep text plain and directive, especially in high-pressure flows.
- **Do** let cards, popovers, and dropdowns breathe with enough edge padding and collision space.

### Don't:
- **Don't** default to dark mode as the main personality.
- **Don't** use `#000` or `#fff` as neutrals.
- **Don't** use gradient text, glassmorphism, or decorative blur as a system default.
- **Don't** make every surface the same card weight or repeat identical card grids across a page.
- **Don't** use side-stripe accent borders greater than 1px.
- **Don't** invent non-standard affordances where standard product patterns already solve the task.
