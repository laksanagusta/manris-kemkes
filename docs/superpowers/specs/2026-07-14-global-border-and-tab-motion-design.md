# Global Border and Tab Motion Design

## Scope

Update the existing MANRIS design system in two tightly scoped ways:

1. Make neutral component borders use the same gray boundary treatment as collection tables.
2. Add a smooth sliding active indicator when switching tabs.

Semantic borders such as destructive, warning, success, risk-level, and focus-ring states are not neutral borders and must retain their semantic colors.

## Border System

The shared `border` and `input` color tokens are the source of truth for neutral component boundaries. In light mode they use the table shell's zinc-gray family and opacity; dark mode uses a legible zinc-gray counterpart. Components already consuming `border-border` or `border-input` inherit the update without local overrides.

Do not mechanically replace semantic border utilities. Explicit neutral gray borders that duplicate the shared token should be migrated only when they are touched in scope and doing so does not erase a meaningful state.

The `/design-system` table remains the visual reference for boundary weight: a single subtle one-pixel edge, without stacked rings or decorative shadows.

## Tab Motion

The default tab list uses a **layout animation / shared element transition**. One white active indicator with a subtle `shadow-sm` measures the selected trigger and slides beneath it when selection changes. Tab content itself changes without directional motion. The indicator uses the shared `ease-in-out` token over 300ms.

The motion must:

- preserve Radix Tabs keyboard behavior and ARIA semantics;
- follow active-trigger position and width, including after resizing;
- remain interruptible during quick tab changes;
- suppress the transition when `prefers-reduced-motion: reduce` is active;
- avoid changing the dimensions or border treatment of the tab list;
- retain the underline treatment for line-variant tabs.

The shared Tabs component owns the behavior so every consumer receives consistent motion. The `/design-system` Tabs preview demonstrates the canonical result.

## Documentation

`DESIGN.md` documents both the zinc-gray global neutral border rule and the direction-aware tab transition, including timing, easing, and reduced-motion behavior. The implementation and design-system page must remain synchronized with those rules.

## Verification

- Add focused tests for direction selection and reduced-motion styling where practical.
- Run the relevant frontend tests and lint/build checks.
- Manually verify the `/design-system` Tabs and neutral-bordered component previews in light and dark modes if a browser session is available.
