# MANRIS Logo Refresh Design

## Summary

Refresh the current MANRIS logo from a detailed 3D bitmap illustration into a minimal, clean, icon-first SVG system. The approved direction is an abstract shield with soft rounded geometry that communicates protection first and insight second.

## Context

- Product: MANRIS v2, a risk and incident management platform for ministry teams.
- Brand personality: calm, credible, decisive, institutional without feeling stiff.
- Current issue: the existing `frontend/public/logo.png` is visually busy, 3D, and feels generic relative to the product's more restrained operational UI.
- Main usage points today:
  - `frontend/src/components/app-sidebar.tsx`
  - `frontend/src/app/page.tsx`
  - `frontend/src/app/(public)/login/page.tsx`

## Goals

- Make the logo feel more minimal, clean, and modern.
- Keep a clear association with protection and operational risk management.
- Introduce a subtle sense of monitoring, analysis, or intelligence without using literal dashboard tropes.
- Prioritize legibility in small sizes for sidebar and favicon-style usage.
- Align the mark with the product's teal-based interface and light-first editorial tone.

## Non-Goals

- No full brand redesign.
- No wordmark redesign in this phase.
- No multi-color illustration, 3D rendering, bevel, glow, or skeuomorphic treatment.
- No complex emblem that depends on fine internal detail.

## Approved Direction

### Core Direction

- Category: abstract shield
- Meaning: protection + insight
- Style: soft rounded
- Usage priority: icon first
- Chosen concept: Shield pulse

### Concept Description

The logo will use a simplified rounded shield silhouette as the primary shape. Inside it, a single internal gesture will suggest scanning, signal reading, or analytical flow. The mark should read as stable and protective at first glance, with the intelligence layer appearing as a secondary interpretation.

The internal shape must remain abstract. It should not become a literal arrow, bar chart, gear, cloud, or checkmark. This keeps the symbol more timeless and avoids the generic enterprise-security look of the current bitmap mark.

## Visual Structure

### 1. Outer Shield

- Rounded, compact, and slightly wide rather than tall.
- Symmetrical enough to feel dependable.
- Corners softened to support a modern and approachable tone.
- Strong silhouette so the mark stays recognizable at small sizes.

### 2. Inner Pulse

- A single internal path, sweep, or cut that suggests monitoring or signal interpretation.
- Built with either negative space or a subtle contrasting shape.
- Thick enough to survive reduction to small icon sizes.
- Must feel integrated with the shield, not placed on top as a separate symbol.

## Color System

### Primary Palette

- Use the product's teal family as the base.
- Favor a mature, flat teal rather than a saturated or glossy finish.
- Keep the mark to one dominant tone or two tones maximum.

### Usage Rules

- Default asset should work as a flat SVG.
- Provide a solid version that remains clear on light and dark surfaces.
- Avoid orange, green, and other accent colors currently used in the 3D bitmap logo.
- Avoid gradients unless they are extremely subtle and still reproduce well as flat artwork. A fully flat solution is preferred.

## Application Behavior

### Sidebar

- The mark should remain readable inside the existing compact logo slot.
- It must still look clear when rendered around `24px` inside the sidebar container.
- The icon should not rely on shadows or extra framing to feel complete.

### Login and Public Entry

- The mark can be displayed larger with more surrounding whitespace.
- It should feel formal, stable, and clean rather than flashy.

### Small-Size Identity

- The favicon or smallest app identity variant should use the same core shape.
- If simplification is needed, it should come from reducing the inner pulse detail, not changing the overall silhouette language.

## Asset Format

- Replace the current bitmap-first usage with SVG-first assets.
- The implementation should support current image placements without requiring a broader layout redesign.
- If needed, a retained `logo.png` export can be generated from the approved SVG for compatibility, but the source of truth should be vector.

## Constraints

- Must fit the existing teal visual system in `frontend/src/app/globals.css`.
- Must work in both light and dark mode.
- Must feel institutional and credible, not playful, aggressive, or startup-branded.
- Must avoid returning to a crowded emblem with multiple metaphors combined into one mark.

## Recommended Implementation Scope

1. Create a new SVG logo asset for the chosen Shield pulse direction.
2. Swap current logo usage in sidebar and public/login entry points to the new SVG asset.
3. Verify legibility in small and medium presentation sizes.
4. Keep wordmark treatment unchanged for this phase unless implementation reveals a spacing issue.

## Acceptance Criteria

- The new logo is visibly more minimal and cleaner than the current 3D bitmap logo.
- The mark clearly reads as protective and stable, with a secondary hint of analysis or monitoring.
- The icon remains legible in the sidebar and on the login page.
- The asset is delivered in SVG and works on both light and dark backgrounds.
- The final result feels consistent with MANRIS's calm, credible, operational product language.

## Open Decisions Resolved

- The direction will not include a wordmark redesign in this phase.
- The logo system is icon-first, not full brand-system-first.
- The symbol will stay abstract instead of using literal charts or security metaphors.
