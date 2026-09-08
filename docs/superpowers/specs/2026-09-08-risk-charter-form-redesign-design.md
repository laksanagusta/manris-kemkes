# Risk Charter Form Redesign

**Date:** 2026-09-08
**Status:** Approved design, pending specification review

## Goal

Redesign the shared create/detail Risk Charter form at
`frontend/src/app/(app)/management/charters/[id]/page.tsx` so it follows the
Manris design system and matches the established form grammar used by other
management and risk workflows.

The create route and existing-charter route remain one component. This work
does not merge the form with the charter list page and does not change API
contracts, validation rules, or persistence behavior.

## Design direction

Use a full-width, single-column document form inside the existing `FormPage`
shell with `max-w-5xl`. The page should feel like a calm institutional working
document: clear sections, restrained neutral surfaces, compact controls, and no
decorative dashboard treatment.

Use separate shared `FormSection` surfaces rather than one long manually
composed card. Do not use accordions because users need to review the whole
charter sequentially. Do not add a sticky sidebar because the approved layout
is one full column.

## Page header

Use the shared `FormHeader` composition with:

- the shared back action to `/management/charters`;
- title `Buat Piagam` in create mode and `Detail Piagam` in existing mode;
- a concise subtitle explaining that the form establishes scope, basis, and
  operating context for risk management;
- one shared `CollectionStatusBadge` for the charter status;
- one shared primary save action with a visible loading state.

Remove the decorative `Risk Governance` badge, route-local status color helper,
and direct primitive button composition when a shared design-system action
already covers the behavior.

## Form structure

Render the form as six sequential shared `FormSection` components:

1. `Identitas Piagam`
2. `Ruang Lingkup`
3. `Dasar Hukum`
4. `Konteks Internal`
5. `Konteks Eksternal`
6. `Ringkasan Stakeholder`

### Identitas Piagam

Organization, UPR level, and period remain derived from the active account and
charter data. Present them as a responsive three-column metadata list that
stacks on small screens. Each item uses a muted label and a foreground value
without a nested card, ring, or elevated surface.

Keep validation messages adjacent to the affected value. If organization data
is unavailable, show the existing explicit recovery-oriented error copy.

### Narrative sections

Each narrative section uses the shared `Textarea` and `Label` components. The
section description supplies the concise guidance, so do not repeat equivalent
helper text between the description and field body. Use explicit accessible
field IDs and connect validation or helper text with `aria-describedby` where
applicable.

Keep textarea sizing consistent across the five narrative sections. Preserve
all existing form field names and values:

- `scope`
- `legalBasis`
- `internalContext`
- `externalContext`
- `stakeholderSummary`

## States and behavior

- Preserve the current create and update API calls.
- Preserve React Hook Form and Zod validation.
- Preserve the browser warning for unsaved changes.
- Preserve existing success and failure toast messages unless copy must be
  adjusted for clarity.
- During initial loading, use a shared collection/form loading state within the
  normal page shell rather than a manually composed spinner card.
- For a recoverable load failure, prefer an explicit shared error state with a
  retry action and a way back to the charter list. Do not silently represent a
  failure as an empty form.
- Disable the save action while a request is in flight and keep its loading
  label legible.

No new workflow statuses, autosave behavior, approval actions, or archive rules
are introduced.

## Responsive behavior

The page remains one column at every breakpoint. Only the identity metadata
layout changes: one column on narrow screens and three columns when space is
available. Textareas occupy the full section width. Header actions wrap without
overlapping the title or subtitle.

## Design-system alignment

Consume components through
`@/components/shared/design-system` wherever they are exported. Expected shared
building blocks include:

- `FormPage`, `FormHeader`, and `FormSection` from the shared form shell;
- `CollectionStatusBadge`;
- `AccentButton` or `LoadingActionButton`, according to the existing shared
  action contract;
- `CollectionLoadingState` and `CollectionErrorState`;
- `Label` where available through the canonical shared export, plus shared
  `Textarea`;
- shared `Card` primitives only where a shared shell requires them.

If the form needs a reusable metadata-row composition that is not yet in the
catalogue, extract it into the design-system component folder first, add a
catalogue example, and document the rule in `DESIGN.md`. Otherwise, reuse the
existing borderless metadata grammar without adding a new abstraction.

## Testing and acceptance criteria

Add or update source-contract tests and run the relevant frontend checks.

The redesign is accepted when:

- create and detail modes still use the same route component;
- all six sections render in the approved order;
- the page uses a single-column `max-w-5xl` form shell;
- each section uses the shared `FormSection` composition;
- the identity area contains no nested cards or local elevated surfaces;
- status uses `CollectionStatusBadge` instead of route-local badge colors;
- the primary action exposes a disabled loading state;
- field names, API payloads, validation, and unsaved-change behavior remain
  unchanged;
- loading and load-error states remain explicit;
- lint and targeted tests pass with no new warnings;
- the production build is run, with unrelated pre-existing blockers reported
  separately rather than hidden.

