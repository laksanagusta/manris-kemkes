# Risk Form Visual Alignment Design

## Objective

Align the visual design of the risk registration form and risk assessment form
with the established design language on the risk register page, while preserving
all existing behavior.

## Reference And Scope

The visual reference is:

- `frontend/src/app/(app)/risk/register/page.tsx`

The target pages are:

- `frontend/src/app/(app)/risk/register/new/page.tsx`
- `frontend/src/app/(app)/risk/assessment/[id]/page.tsx`

This work is visual only. It must not change:

- form fields or their order;
- API requests, payloads, or endpoints;
- validation rules or error conditions;
- hooks, state transitions, permissions, or status logic;
- submit, draft, archive, restore, review, or navigation behavior;
- conditional rendering driven by business state.

## Design Direction

Use surgical class-level alignment instead of rebuilding either form or
extracting new behavioral components. Existing component boundaries and JSX
conditions remain intact. Shared primitives already used by the pages, including
`FormPage`, `FormHeader`, `Button`, `Badge`, `Card`, and `Accordion`, remain the
foundation.

## Page Geometry

- Use the same full-width content frame and vertical rhythm as the register
  page.
- Use `space-y-6` as the primary separation between major page regions.
- Keep responsive grids intact while normalizing their gaps to the reference.
- Preserve the assessment page's two-column desktop layout because it conveys
  supporting information, but style both columns with the same card language.

## Header And Actions

- Keep `FormHeader` as the header primitive.
- Match title hierarchy, description width, badge sizing, and action spacing.
- Use compact secondary actions with subtle borders and no elevated shadow.
- Use the primary button treatment for submit/finalize actions.
- Preserve destructive and warning semantics for archive or irreversible
  actions.

## Sections And Accordions

- Major form sections use `rounded-xl`, `border-border/40`, `bg-card`,
  `shadow-sm`, and clipped overflow.
- Open sections use a restrained `border-primary/20` state.
- Section headers use `px-5 py-4`, a compact numbered or icon marker, a
  semibold title, and a status badge aligned to the right.
- Section content uses `space-y-5 px-5 pb-6 pt-2`.
- Nested content panels use the same border radius, border opacity, background,
  and spacing instead of introducing stronger shadows or unrelated surfaces.

## Form Controls

- Labels use consistent `text-sm font-medium`.
- Helper text uses `text-xs` with muted foreground and readable line height.
- Validation errors remain visually distinct with destructive color and compact
  sizing.
- Inputs, selects, textareas, and read-only values retain their current
  components and behavior while receiving consistent height, radius, border,
  background, and typography.
- Disabled and read-only fields remain visibly distinct without reducing
  legibility.

## Assessment Side Panel

- Preserve the existing side-panel content and order.
- Normalize its cards to the same radius, border, background, and shadow rules
  as the main form.
- Keep the panel sticky or responsive behavior unchanged.
- Use compact section headers and consistent internal padding.

## Responsive Behavior

- Desktop remains optimized for the supplied 1710x952 viewport.
- Existing mobile stacking behavior remains intact.
- Header actions may wrap without overlapping the title.
- Form grids collapse according to their existing breakpoints.
- No fixed widths may create horizontal overflow.

## Review Checklist

After implementation:

1. Compare both target pages against the reference for page width, spacing,
   typography, borders, radii, shadows, buttons, badges, controls, and section
   hierarchy.
2. Search both target files for obsolete section styles such as inconsistent
   `rounded-lg`/`rounded-2xl`, heavy shadows, or mismatched border opacity.
3. Review the diff to confirm that only presentation properties changed.
4. Run ESLint on both target files.
5. Run TypeScript validation and distinguish pre-existing failures from new
   failures.
6. Inspect desktop rendering and responsive behavior when an authenticated
   browser session is available.

## Acceptance Criteria

- Both target pages visibly belong to the same design system as the risk
  register page.
- Equivalent elements use equivalent spacing, typography, radius, border,
  shadow, and color treatment.
- No business behavior or data contract changes.
- No new ESLint errors or TypeScript errors are introduced.
