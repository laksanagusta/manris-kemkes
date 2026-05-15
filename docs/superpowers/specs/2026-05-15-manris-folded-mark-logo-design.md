# MANRIS Folded Mark Logo Design

## Summary

Replace the current MANRIS logo asset with a minimalist black-and-white abstract mark. The approved direction is a full abstract "Folded Mark": a sharp, compact geometric form with a slight futuristic character, inspired by the restrained product identity style of Ramp, Linear, Cursor, and Codex.

## Context

MANRIS currently has a teal shield-style SVG at `frontend/public/logo.svg`. The header also contains a commented-out logo image block next to the `M A N R I S` wordmark, while public auth screens use the text wordmark more prominently.

The new request is to create one minimal logo and place it beside the `M A N R I S` text. The user approved replacing the primary `logo.svg`, so the mark should be suitable for header, login, register, change-password, favicon-style usage, and future app surfaces.

## Goals

- Make the MANRIS identity feel more modern, neutral, and premium.
- Use a black-and-white logo system rather than the current teal shield.
- Avoid literal risk, shield, chart, or ministry symbolism.
- Keep the logo legible at compact header sizes.
- Preserve the existing `M A N R I S` wordmark text treatment for this phase.

## Non-Goals

- No full brand system redesign.
- No change to the product name or wordmark typography beyond spacing/alignment needed for the icon.
- No gradients, shadows, 3D effects, illustrative details, or color variants in this pass.
- No literal monogram that reads directly as `M`.

## Approved Direction

### Folded Mark

The logo will be a full abstract folded geometric symbol. It should suggest a precise folded surface or directional form, but it should not resolve into a recognizable object or letter. The mark should feel structured, intelligent, and slightly futuristic while staying quiet enough for an operational SaaS interface.

The silhouette should be strong in one color. Negative space can be used sparingly to create the folded effect, but the mark must remain readable at small sizes.

## Visual Requirements

- Format: SVG as the source of truth.
- Palette: black and white only.
- Shape language: angular, compact, geometric, and balanced.
- Detail level: minimal enough to survive 20-24px rendering.
- Alignment: icon sits to the left of `M A N R I S`.
- Header behavior: when expanded, show icon + `M A N R I S`; when collapsed, icon alone should remain recognizable.
- Auth screens: logo may appear above or beside the text depending on available space, but should not dominate the login card.

## Implementation Scope

1. Replace `frontend/public/logo.svg` with the new Folded Mark SVG.
2. Update header branding so the logo appears beside `M A N R I S`.
3. Update public auth branding surfaces that currently show only the text wordmark so the same logo identity is visible.
4. Keep layout changes minimal and consistent with the current compact UI.

## Acceptance Criteria

- The new logo is black-and-white, minimal, and abstract.
- The mark does not read as a shield, chart, or explicit `M`.
- The logo appears beside `M A N R I S` in the app header.
- The same primary asset is used consistently where `logo.svg` is referenced.
- The icon remains crisp and readable at small sizes.
- The implementation does not introduce broad layout or theme changes.

## Resolved Decisions

- Direction: Folded Mark.
- Style: full abstract, slightly futuristic.
- Color: black-and-white.
- Usage: replace the primary `frontend/public/logo.svg`.
- Wordmark: keep `M A N R I S` text and place the icon beside it.
