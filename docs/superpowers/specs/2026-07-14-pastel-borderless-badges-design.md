# Pastel Borderless Badges Design

## Scope

Restyle the shared MANRIS `Badge` system to match the supplied chip reference: soft pastel fills, strongly contrasting dark text, larger readable labels, and no visible border. Apply the result through the shared component and synchronize the `/design-system` catalogue and `DESIGN.md`.

## Palette

- Neutral: soft zinc-gray fill with near-black text.
- Progress and info: pale cyan fill with dark blue text.
- Success: pale mint fill with dark green text.
- Warning: pale cream-yellow fill with dark burnt-orange text.
- Danger/destructive: pale blush fill with dark red text.

The palette should resemble the reference rather than using Tailwind's very light `*-50` defaults. Semantic meaning must still come from the badge label, not color alone.

## Geometry and Typography

- Default badges remain 32px high, fully rounded, and use 14px medium text.
- Compact badges remain suitable for dense tables but increase to 12px text and at least 24px height.
- Micro badges increase to 11px text and at least 20px height.
- All variants and tones remove their visible border.
- Focus-visible rings and invalid-state signaling remain available for interactive or form-associated badges.

## Component Boundaries

`frontend/src/components/ui/badge.tsx` is the source of truth. Feature code should use `tone` and `size` instead of repeating background, text, and border utilities. The design-system preview must demonstrate the canonical tones without local color overrides.

## Verification

- Add source-contract tests for palette, border removal, and the new type scale.
- Run focused tests, ESLint, and the production build.
- Confirm `DESIGN.md` and `/design-system` describe and render the same badge system.
