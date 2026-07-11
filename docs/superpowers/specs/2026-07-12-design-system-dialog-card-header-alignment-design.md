# Design System Dialog and Card Header Alignment

## Scope

Update the design-system reference page so its dialog actions use the compact button size and every demonstrated card header follows the visual language established by the dashboard KPI card. Synchronize the resulting rules into `DESIGN.md`.

## Dialog Buttons

- Apply `size="sm"` to both Dialog and AlertDialog trigger buttons.
- Apply the same compact size to cancel and confirmation actions in both dialog footers.
- Preserve the existing variants, labels, behavior, and hierarchy.

## Card Headers

Use the dashboard KPI header as the canonical pattern throughout the design-system page:

- A bottom divider using `border-border/60`.
- Horizontal padding of `px-4` and vertical padding of `py-6`.
- Header titles at `text-[10px]`, semibold, uppercase, `tracking-[0.15em]`, and muted foreground.
- Existing card content, descriptions, and card geometry remain unchanged. Descriptions that belong to a header remain below the title while preserving the KPI-derived header shell.

This applies to the standard, frosted, table, state, and side-panel card examples. It does not alter non-card section labels or table headers.

## Documentation

Add explicit guidance to `DESIGN.md` defining the KPI-derived card-header shell and compact dialog actions. This makes the page implementation and written design system agree.

## Verification

- Search the design-system page for remaining `CardHeader` instances that do not use the canonical shell.
- Confirm all buttons in the Dialog/AlertDialog example use `size="sm"`.
- Run the frontend lint check against the changed page where supported by the project script.
