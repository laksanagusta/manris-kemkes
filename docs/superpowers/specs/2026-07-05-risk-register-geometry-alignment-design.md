# Risk Register Geometry Alignment Design

## Goal

Align the primary `/risk/register` interface with the new shared Tailwind
geometry while preserving intentional density inside tables and pagination.

## Root Cause

The page predates the shared geometry update and still supplies local `h-8`,
`h-7`, `h-6`, `h-4`, `rounded-lg`, and `rounded-md` classes. Because component
class names are merged after primitive defaults, these local utilities override
the new shared sizes and radii.

## Design

### Main interface

- Replace the toolbar search `Input` with `SearchInput`.
- Remove `h-8` from the filter button so it inherits the default button
  contract.
- Change filter inputs and select triggers to `h-11 rounded-xl`.
- Keep the right-side filter sheet square against the viewport edge.
- Add `rounded-2xl p-4` to KPI cards.
- Let `TabsList` inherit the shared segmented-control geometry.
- Let modal containers inherit `rounded-3xl p-6`.
- Change modal summary boxes to `rounded-2xl`.
- Change the archive textarea to `rounded-xl`.

### Dense exceptions

The following remain explicitly compact:

- status and risk-level badges inside table rows;
- monitoring count badges inside tabs;
- action dropdown triggers;
- pagination buttons and page-size selectors;
- small timeline metadata badges.

These exceptions are content-density decisions, not accidental overrides.

## Testing

Add a source-level regression test that verifies:

- `SearchInput` is imported and used by the register toolbar;
- the main filter button has no `h-8` override;
- filter fields use `h-11 rounded-xl`;
- KPI cards use `rounded-2xl p-4`;
- modal summary boxes and textarea use the approved radii;
- documented compact table patterns remain allowed.

Run the focused regression test, focused ESLint, and the Next.js production
build.

