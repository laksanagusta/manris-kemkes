# 006 — Stabilize Editable Cause Rows on Add

- **Status**: DONE
- **Commit**: 7adcb81f
- **Severity**: MEDIUM
- **Category**: Purpose & frequency; Interruptibility; Performance
- **Estimated scope**: 3 files, small UI and contract-test change

## Problem

The shared editable list animates every row whenever the controlled `items`
array changes. Clicking `Tambah Sebab` adds one item through React Hook Form,
which re-renders the entire `EditableItemsTable`; because every row always has
the same entrance animation and an index-derived delay, existing rows fade and
slide again instead of remaining stable. With more than one or two rows, those
restarts overlap and the table appears to glitch or jump while the new row is
mounted.

The problematic implementation is shared by the cause list on the risk form at
`frontend/src/components/shared/editable-items-table.tsx:30-35,59-60`:

~~~tsx
const addItem = () => {
  const newItem: EditableItem = {
    id: `item-${Date.now()}`,
    text: "",
  };
  onChange([...items, newItem]);
};

{items.map((item, index) => (
  <TableRow
    key={item.id}
    className="h-auto animate-in fade-in slide-in-from-top-2 duration-200 ease-out motion-reduce:animate-none hover:bg-muted/30 transition-colors"
    style={{ animationDelay: `${index * 30}ms` }}
  >
~~~

The risk form consumes this shared component for causes at
`frontend/src/app/(app)/risk/register/new/page.tsx:2574-2588`:

~~~tsx
<Controller
  name="causes"
  control={control}
  render={({ field }) => (
    <EditableItemsTable
      items={field.value}
      onChange={field.onChange}
      placeholder="Tulis penyebab..."
      addItemLabel="Tambah Sebab"
      emptyMessage="Belum ada sebab"
      disabled={isRiskLocked}
    />
  )}
/>
~~~

This is a frequent inline editing interaction, not a one-time modal entrance.
An entrance keyframe that restarts for every controlled input update is not
interruptible in the useful sense and animates a layout-heavy table row.

## Target

Remove the row entrance animation and its index-based delay. Adding a cause
should insert the new editable row immediately while all existing rows keep
their position and focus. Preserve only the existing hover color feedback:

~~~tsx
<TableRow
  key={item.id}
  className="h-auto transition-colors hover:bg-muted/30"
>
~~~

The target has these observable properties:

- Existing rows never fade or slide again when a row is added, removed, or
  edited.
- Adding one or several causes does not animate `height`, `margin`, `padding`,
  or table geometry.
- The new row appears immediately and its input remains focusable without a
  delayed animation state.
- Hover feedback remains a color-only transition and does not move the row.
- No new animation library, keyframe, state machine, or timer is introduced.

## Repo conventions to follow

- Frequent list controls use quiet color-only feedback, as in
  `frontend/src/components/risk/risk-analysis-tab.tsx:336`, where table rows
  use `border-b transition-colors hover:bg-muted/50` without entrance motion.
- The repository's strong modal and short feedback motion uses the shared
  `--ease-out` token, but this fix should not add an entrance animation to a
  high-frequency editable list.
- Reduced-motion handling should remain implicit because the target has no
  row movement to suppress; keep `transition-colors` only and do not add a
  replacement keyframe.
- The shared component is used by risk causes, risk impacts, and risk substance
  fields. Apply the behavior in `EditableItemsTable`, not in a route-local
  causes wrapper.

## Steps

1. In `frontend/src/components/shared/editable-items-table.tsx:59-60`, remove
   `animate-in`, `fade-in`, `slide-in-from-top-2`, `duration-200`,
   `ease-out`, `motion-reduce:animate-none`, and the inline `animationDelay`
   style from `TableRow`. Keep `h-auto transition-colors hover:bg-muted/30`.
2. Add a source contract assertion in
   `frontend/src/components/shared-page-contracts.test.ts` for
   `editable-items-table.tsx` that:
   - contains `transition-colors` and `hover:bg-muted/30`;
   - does not contain `animate-in`, `slide-in-from-top-2`, or
     `animationDelay`;
   - does not contain `transition-all`.
3. Document the shared inline editable-list rule in
   `frontend/src/app/(app)/design-system/page.tsx` and `DESIGN.md`: editable
   cause/impact rows must insert synchronously with color-only hover feedback;
   do not replay row entrance animations when the controlled array changes.

## Boundaries

- Do NOT change the `EditableItemsTable` data model, generated IDs, add/remove
  behavior, input focus behavior, form validation, or React Hook Form wiring.
- Do NOT change row height, padding, borders, table columns, hover colors, or
  the cause/impact copy.
- Do NOT replace the row animation with a height, margin, padding, or layout
  transition.
- Do NOT add a new dependency, timer, `requestAnimationFrame`, keyframe, or
  per-row animation state for this fix.
- Do NOT modify `AccordionContent` or the shared Radix accordion animation;
  the glitch is in the child row entrance classes.
- If the quoted `TableRow` implementation has drifted from the current source,
  stop and report the drift instead of changing a different list component.

## Verification

- **Mechanical**:
  - Run `npm run lint -- src/components/shared/editable-items-table.tsx src/components/shared-page-contracts.test.ts` from `frontend/`; expect no new errors.
  - Run `node --test --experimental-specifier-resolution=node src/components/shared-page-contracts.test.ts` from `frontend/`; expect the new editable-list contract to pass.
  - Run `npm run build` from `frontend/`; expect the Next.js production build and TypeScript checks to pass.
  - Run `git diff --check` from the repository root.
- **Feel check**:
  - Open `/risk/register/new`, keep the Identifikasi section expanded, and add a cause with zero, one, two, and five existing rows.
  - Confirm only the new blank row appears; existing rows must not fade, slide from the top, or shift in a staggered sequence.
  - Type into an existing cause and confirm the table does not replay any row animation on each keystroke.
  - Add several rows quickly and confirm there is no overlapping animation, table jump, or delayed input interaction.
  - Hover a row and confirm only the muted background color changes.
  - Toggle `prefers-reduced-motion: reduce`; the result should be identical because there is no row entrance movement.
  - **Done when**: adding/editing causes is visually stable for 0–5+ rows, the new row is immediately interactive, and the contract/build checks pass.
