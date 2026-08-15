# 001 — Keep Select Borders Stable and Animate the Chevron

- **Status**: DONE
- **Commit**: 9ecb6347
- **Severity**: MEDIUM
- **Category**: Purpose & frequency; Easing & duration; Cohesion & tokens
- **Estimated scope**: 4 files, small UI-only change

## Problem

The shared select trigger changes its neutral border to the active black border
when clicked or focused, even though this control is meant to communicate its
open state through the chevron. The form-level CSS repeats the same behavior,
so risk-form selects can still change border color after the shared component is
updated.

The chevron itself is static, so the select trigger gives no spatial cue that
the menu opened.

Current shared trigger at
`frontend/src/components/ui/select.tsx:43-55`:

```tsx
<SelectPrimitive.Trigger
  data-slot="select-trigger"
  data-size={size}
  className={cn(
    "flex w-full items-center justify-between gap-1.5 rounded-lg border border-border bg-card py-2 pr-3 pl-3 text-sm whitespace-nowrap transition-[background-color,border-color,box-shadow] outline-none select-none focus:border-black focus-visible:border-black focus:ring-0 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-9 data-[size=sm]:h-8 data-[size=sm]:rounded-lg *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50 dark:focus:border-white dark:focus-visible:border-white dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    className
  )}
  {...props}
>
  {children}
  <SelectPrimitive.Icon asChild>
    <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
  </SelectPrimitive.Icon>
</SelectPrimitive.Trigger>
```

The risk-form override at
`frontend/src/app/globals.css:413-426` also includes
`[data-slot="select-trigger"]:focus` and `:focus-visible` in the selector group
that sets `border-color: var(--primary)`.

## Target

Normal select triggers keep `border-border` in both resting and focused/open
states. Keep `focus:ring-0` and `focus-visible:ring-0` so the control does not
gain an extra focus ring. Preserve `aria-invalid` red border/ring behavior.

Change the trigger transition to avoid listing the border color, and add a
named group to the trigger so its child icon can react to the Radix `data-state`:

```tsx
className={cn(
  "group/select-trigger flex w-full items-center justify-between gap-1.5 rounded-lg border border-border bg-card py-2 pr-3 pl-3 text-sm whitespace-nowrap transition-[background-color,box-shadow] outline-none select-none focus:ring-0 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-9 data-[size=sm]:h-8 data-[size=sm]:rounded-lg *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  className
)}
```

The chevron should rotate from its current position when the trigger opens:

```tsx
<ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground transition-transform duration-150 ease-(--ease-out) group-data-[state=open]/select-trigger:rotate-180 motion-reduce:transition-none" />
```

In `frontend/src/app/globals.css`, remove the select-trigger focus selectors
from the active black-border group. Leave the input and textarea selectors in
that group, and keep the select-trigger selector in the `aria-invalid` group so
validation remains visibly red.

## Repo conventions to follow

- The motion personality is crisp and restrained; UI animations stay below
  300ms.
- Entering/opening controls use the shared strong ease-out curve:
  `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` at
  `frontend/src/app/globals.css:56`.
- The existing `SelectContent` uses Radix state-driven Tailwind variants and
  trigger-origin positioning at `frontend/src/components/ui/select.tsx:72`.
- Shared field geometry and focus behavior are documented in
  `DESIGN.md:358-364`; update the focus rule to distinguish text fields from
  select triggers.

## Steps

1. In `frontend/src/components/ui/select.tsx`, add
   `group/select-trigger` to the `SelectPrimitive.Trigger` class list.
2. In the same file, remove `focus:border-black`,
   `focus-visible:border-black`, `dark:focus:border-white`, and
   `dark:focus-visible:border-white` from `SelectTrigger`. Keep the focus ring
   suppression and semantic invalid-state classes. Change
   `transition-[background-color,border-color,box-shadow]` to
   `transition-[background-color,box-shadow]`.
3. In the same file, add the exact chevron class from the Target section to
   `ChevronDownIcon`, using the trigger group state to rotate it 180 degrees
   over `150ms` with `ease-(--ease-out)` and disabling the transition under
   `prefers-reduced-motion`.
4. In `frontend/src/app/globals.css`, remove the two
   `.risk-form-filter-controls [data-slot="select-trigger"]` focus selectors
   from the shared active-field block. Keep the input and textarea focus rules
   and the select-trigger invalid-state rule.
5. Update `frontend/src/components/ui/elevated-surface-contract.test.ts` so the
   shared-field contract expects black focus borders for text/textarea/search
   primitives but explicitly expects `select.tsx` to omit the black focus-border
   utilities while retaining the no-ring utilities. Add a contract asserting the
   risk-form global focus rule does not include select-trigger.
6. Update `DESIGN.md` so the Inputs / Fields focus rule states: text and
   textarea fields use the black active border; SelectTrigger keeps the neutral
   border while its chevron rotates on open; invalid states remain red.

## Boundaries

- Do NOT change `SelectContent`, `SelectItem`, dropdown-menu, combobox, or
  popover geometry.
- Do NOT change the neutral resting border token `border-border`.
- Do NOT remove semantic `aria-invalid` styling.
- Do NOT add a new motion library or a new easing token.
- Do NOT change select behavior, keyboard navigation, selection values, or
  Radix event handling.
- If `data-state="open"` is not present on `SelectPrimitive.Trigger` in the
  installed Radix version, stop and report instead of adding stateful React
  bookkeeping; verify the rendered DOM before improvising.

## Verification

- **Mechanical**:
  - Run `node --test --experimental-specifier-resolution=node src/components/ui/elevated-surface-contract.test.ts src/components/ui/component-geometry.test.ts` from `frontend/`; all relevant tests must pass.
  - Run `git diff --check` from the repository root.
  - Run the normal frontend build or typecheck command used by the repository;
    it must complete without new errors.
- **Feel check**:
  - Open a select with mouse and keyboard. The trigger border must remain the
    same neutral `border-border` color while focused and while the option list
    is open.
  - Confirm the chevron rotates 180 degrees on open and returns to its original
    orientation on close.
  - In DevTools, slow animation playback to 10% and confirm the rotation takes
    150ms, starts quickly with `--ease-out`, and does not animate the border.
  - Select an invalid value or render `aria-invalid="true"`; the semantic red
    border/ring must still appear.
  - Enable `prefers-reduced-motion: reduce`; the chevron should switch state
    without a movement transition, while the select remains usable and the
    neutral border stays unchanged.
- **Done when**: every shared `SelectTrigger`, including risk-form selects, has
  a stable neutral border on click/focus, and its chevron visibly communicates
  open/closed state with the specified motion.
