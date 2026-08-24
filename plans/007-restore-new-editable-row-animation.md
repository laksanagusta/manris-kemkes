# 007 — Restore New Editable Row Animation Without Replay

- **Status**: DONE
- **Commit**: 7adcb81f
- **Severity**: MEDIUM
- **Category**: Purpose & frequency; Interruptibility; Performance
- **Estimated scope**: 4 files, small shared-component and contract-test change

## Problem

Plan 006 correctly stopped existing rows from replaying entrance motion, but it
removed the row entrance animation entirely. The shared editable list now uses
only a hover transition at `frontend/src/components/shared/editable-items-table.tsx:60`:

~~~tsx
<TableRow key={item.id} className="h-auto transition-colors hover:bg-muted/30">
~~~

The risk form uses this shared component for causes, impacts, and substance
items. The add interaction should still acknowledge the newly inserted row,
but animation must be scoped to the new ID. Replaying an animation on every row
when the controlled `items` array changes caused the original glitch with
multiple rows; removing all motion loses the intended feedback.

## Target

Restore a short, reduced-motion-safe entrance animation only for rows whose IDs
were added since the previous committed `items` snapshot. Existing rows must
remain unanimated when a new row is inserted, an input is edited, or a row is
removed. The row should use the existing short modal/list motion convention:

~~~tsx
<TableRow
  key={item.id}
  className={cn(
    "h-auto transition-colors hover:bg-muted/30",
    animatingItemIds.has(item.id) &&
      "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both motion-reduce:animate-none",
  )}
>
~~~

Track the previous item IDs with a ref and keep a short set of currently
animating new IDs in component state. When the controlled array gains IDs, add
only those IDs to the set and clear that set after 200ms (a 220ms cleanup
window is acceptable to let the 200ms CSS animation finish). Do not derive the
animation from the array index. Do not use an animation delay. Do not animate
height, margin, padding, or table layout.

The target has these observable properties:

- Adding one row animates only the new row with a subtle fade/slide from above.
- Adding several rows quickly animates each newly added row once without
  replaying motion on earlier rows.
- Editing an existing input does not restart any row animation.
- Removing a row does not animate the remaining rows.
- Hover remains a color-only transition.
- With `prefers-reduced-motion: reduce`, the entrance animation is suppressed.

## Repo conventions to follow

- Use React state/ref already available in the shared component; do not add a
  motion dependency. The component currently imports only `Input`, `Button`,
  table primitives, and icons from
  `frontend/src/components/shared/editable-items-table.tsx:1-6`.
- Use the repository's existing `--ease-out` token and `motion-safe:` /
  `motion-reduce:` class conventions, matching
  `frontend/src/components/shared/design-system/domain/mitigation-progress-dialog.tsx:43-49`.
- Use `cn` from `@/lib/utils` for conditional classes, as used throughout the
  frontend shared and route components.
- Keep the existing `transition-colors hover:bg-muted/30` row feedback.

## Steps

1. In `frontend/src/components/shared/editable-items-table.tsx`, import
   `useEffect`, `useRef`, and `useState` from React plus `cn` from
   `@/lib/utils`. Initialize the previous-ID ref from the initial `items`
   collection so existing rows do not animate on mount. Add state for a
   `Set<string>` of currently animating IDs.
2. Add an effect that runs when `items` changes. Build the current ID set,
   compare it with the previous ref, and add only newly present IDs to the
   animation set. Update the previous-ID ref every time. Do not mark IDs as
   new based on array index or text changes. Add a cleanup timer that removes
   the animation set after the 200ms animation has completed; clear the timer
   on effect cleanup. If several rows are added before cleanup, preserve all
   newly added IDs in the set and allow the latest 200ms window to finish.
3. Change the `TableRow` class to use `cn` with the stable base classes and the
   exact conditional `motion-safe:` animation classes in the Target section.
   Do not add `animationDelay`, `transition-all`, or any layout transition.
4. Update the editable-list contract in
   `frontend/src/components/shared-page-contracts.test.ts` so it asserts that
   `editable-items-table.tsx` still contains `transition-colors`,
   `hover:bg-muted/30`, `motion-safe:animate-in`,
   `motion-safe:slide-in-from-top-2`, `motion-safe:duration-200`, and
   `motion-reduce:animate-none`; it must not contain `animationDelay` or
   `transition-all`. The test should verify the stable base plus scoped
   animation implementation without requiring a specific hook formatting.
5. Sync the motion rule in `DESIGN.md` and
   `frontend/src/app/(app)/design-system/page.tsx`: shared inline editable
   rows may animate only newly inserted IDs once with the existing 200ms
   ease-out fade/slide; controlled updates must not replay existing rows, and
   reduced motion must suppress the entrance animation.

## Boundaries

- Do NOT change the `EditableItem` data model, generated IDs, add/remove
  behavior, input focus behavior, form validation, or React Hook Form wiring.
- Do NOT change row height, padding, borders, table columns, hover colors, or
  cause/impact/substance copy.
- Do NOT use index-based animation delays, `transition-all`, or layout
  transitions.
- Do NOT animate every row on render or on every controlled array update.
- Do NOT add a new dependency, CSS keyframe, or route-local workaround.
- Do NOT modify the AI suggestion modal, accordion shell, or unrelated table
  components.
- If the quoted row implementation or the shared contract has drifted, stop
  and report the drift instead of improvising outside this plan.

## Verification

- **Mechanical**:
  - Run `npx eslint src/components/shared/editable-items-table.tsx src/components/shared-page-contracts.test.ts` from `frontend/`; expect no new errors.
  - Run `node --test --experimental-specifier-resolution=node src/components/shared-page-contracts.test.ts` from `frontend/`; expect the editable-list contract to pass. Record any unrelated pre-existing contract failures separately.
  - Run `npm run build` from `frontend/`; expect the Next.js production build and TypeScript checks to pass.
  - Run `git diff --check` from the repository root.
- **Feel check**:
  - Open `/risk/register/new`, keep the Identifikasi section expanded, and add a
    cause with zero, one, two, and five existing rows.
  - Confirm only each newly inserted blank row fades/slides from the top once;
    existing rows must not replay or stagger.
  - Type into an existing cause, add several rows quickly, and remove one row.
    Confirm no existing row restarts, jumps, or becomes delayed/unfocusable.
  - In DevTools, slow animation playback and confirm the motion is a subtle
    200ms opacity/translate entrance with no height or table geometry tween.
  - Toggle `prefers-reduced-motion: reduce` and confirm the new row appears
    without entrance motion while the list remains usable.
  - **Done when**: the new-row acknowledgment is visible, existing rows stay
    stable for 0–5+ rows, the contract/build checks pass, and no animation
    replay occurs during typing or controlled updates.
