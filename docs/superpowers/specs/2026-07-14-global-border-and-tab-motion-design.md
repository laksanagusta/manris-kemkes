# Global Border and Tab Motion Design

## Scope

Update the existing MANRIS design system in two tightly scoped ways:

1. Make neutral component borders use the same gray boundary treatment as collection tables.
2. Add smooth directional motion when switching tabs.

Semantic borders such as destructive, warning, success, risk-level, and focus-ring states are not neutral borders and must retain their semantic colors.

## Border System

The shared `border` and `input` color tokens are the source of truth for neutral component boundaries. In light mode they use the table shell's zinc-gray family and opacity; dark mode uses a legible zinc-gray counterpart. Components already consuming `border-border` or `border-input` inherit the update without local overrides.

Do not mechanically replace semantic border utilities. Explicit neutral gray borders that duplicate the shared token should be migrated only when they are touched in scope and doing so does not erase a meaningful state.

The `/design-system` table remains the visual reference for boundary weight: a single subtle one-pixel edge, without stacked rings or decorative shadows.

## Tab Motion

Tab content uses a **direction-aware transition**. Moving to a tab later in the tab order makes the incoming content translate slightly from the right; moving earlier makes it enter from the left. The transition combines a short horizontal `transform` with opacity over 200–240ms using the shared `ease-in-out` token.

The motion must:

- preserve Radix Tabs keyboard behavior and ARIA semantics;
- avoid animating layout properties;
- remain interruptible during quick tab changes;
- suppress translation when `prefers-reduced-motion: reduce` is active;
- avoid changing the dimensions or border treatment of the tab list.

The shared Tabs component owns the behavior so every consumer receives consistent motion. The `/design-system` Tabs preview demonstrates the canonical result.

## Documentation

`DESIGN.md` documents both the zinc-gray global neutral border rule and the direction-aware tab transition, including timing, easing, and reduced-motion behavior. The implementation and design-system page must remain synchronized with those rules.

## Verification

- Add focused tests for direction selection and reduced-motion styling where practical.
- Run the relevant frontend tests and lint/build checks.
- Manually verify the `/design-system` Tabs and neutral-bordered component previews in light and dark modes if a browser session is available.
