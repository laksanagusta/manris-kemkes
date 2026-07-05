# Tailwind Component Geometry Design

## Goal

Standardize the geometry of all shared frontend primitives using only native
Tailwind utility classes, then make `DESIGN.md` the normative reference for the
new component dimensions.

## Shape Decision

The implementation uses ordinary CSS border radii through Tailwind
`rounded-*` utilities. Apple/Figma corner smoothing is intentionally set to
0%. True 60% corner smoothing was rejected because it requires path-based
geometry, runtime size measurement for responsive DOM elements, and non-native
handling for borders, focus rings, and shadows.

## Component Contract

| Component | Tailwind contract |
| --- | --- |
| Primary/default button | `h-11 rounded-xl px-5` |
| Premium button size | `h-12 rounded-2xl px-6` |
| Input | `h-11 rounded-xl px-3` |
| Search input | `h-11 rounded-2xl px-4` |
| Card | `rounded-2xl p-4` |
| Large card | `rounded-3xl p-6` |
| Modal | `rounded-3xl p-6` |
| Bottom sheet | `rounded-t-3xl p-5` |
| List group | `rounded-2xl overflow-hidden` |
| Segmented control | `rounded-xl p-1` |
| Chip | `h-8 rounded-full px-3` |
| Icon button | `size-10 rounded-full` |
| Large icon button | `size-11 rounded-full` |
| Icon tile | `size-11 rounded-2xl` |
| App icon tile | `size-14 rounded-3xl` |
| Toast | `rounded-2xl px-4 py-3` |
| Dropdown | `rounded-2xl` |
| Popover | `rounded-3xl` |

## Architecture

### Existing shared primitives

Update the existing primitives so all consumers inherit the new geometry:

- `Button`: default size becomes the primary contract; add
  `size="premium"`; icon sizes become circular 40px and 44px controls.
- `Input`: default contract becomes 44px high with 12px horizontal padding.
- `Card`: default becomes `rounded-2xl p-4`; add `size="lg"` for the large
  contract while retaining `size="sm"` for dense legacy contexts.
- `TabsList`: becomes the segmented-control contract.
- `DialogContent`: becomes the modal contract; its footer offsets change from
  16px to 24px so the inset footer still meets the modal edge.
- `SheetContent`: applies the bottom-sheet contract only when
  `side="bottom"`; left and right sheets remain edge-aligned.
- `Badge`: becomes the 32px chip contract.
- `PopoverContent`, `DropdownMenuContent`, and submenu content receive their
  respective overlay radii.
- The Sonner toaster receives the toast geometry through its toast class
  configuration.

### New focused primitives

- `SearchInput`: wraps the standard input geometry with the search-specific
  radius and padding while preserving refs and native input props.
- `ListGroup`: provides the shared clipped group container.
- `IconTile`: provides `default` and `app` sizes without prescribing color.

These primitives define geometry only. Color, semantic state, and content
remain caller-controlled.

## Compatibility

Existing button variants remain unchanged. Existing compact button sizes
remain available for dense table and menu actions, but the default button and
default input become 44px controls. Local class names may still override the
shared contract where a documented dense context requires it.

Changing shared primitives is intentionally application-wide. Layout
regressions are most likely in compact table toolbars, dialogs, and headers,
so verification must include both static contract tests and production
compilation.

## DESIGN.md

Update the machine-readable front matter with the new radius scale and
component geometry, including default, premium, large, icon, chip, segmented,
overlay, and toast entries. Update the prose sections in canonical order:

1. Overview
2. Colors
3. Typography
4. Layout
5. Elevation & Depth
6. Shapes
7. Components
8. Do's and Don'ts

The Shapes section must explicitly state that Tailwind-native circular radii
are normative and corner smoothing is 0%.

## Testing and Verification

- Add focused contract tests that read primitive source files and assert the
  required Tailwind class combinations.
- Run the focused tests before implementation to confirm they fail.
- Apply primitive changes and confirm focused tests pass.
- Run focused ESLint over all changed TypeScript files.
- Run the Next.js production build.
- Run the Google `design.md` linter when the CLI is available; otherwise
  manually validate front matter references and canonical section order.
- Review the scoped diff to ensure unrelated working-tree changes remain
  untouched.

