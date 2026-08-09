# 004 — Add prefers-reduced-motion to sidebar collapse

- **Status**: TODO
- **Commit**: da9c60d3
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 file, 3 class insertions

## Problem

The sidebar collapse/expand animates `width`, `left`, and `right` (sidebar.tsx:220, 232) — pure layout movement that triggers vestibular discomfort in users with motion sensitivity. There is **no `prefers-reduced-motion` handling** anywhere in `sidebar.tsx` or `app-sidebar.tsx`.

Without reduced-motion gating:
- Every sidebar toggle (dozens of times per session) triggers full layout motion.
- Users who set `prefers-reduced-motion: reduce` in their OS settings get no relief.
- The animation audit (AUDIT.md §6) requires: "keep transitions that aid comprehension, remove position changes."

## Target

Add `motion-reduce:transition-none` to the two sidebar elements that animate layout (lines 220, 232) and the group label (line 404). This drops all movement while preserving opacity transitions (the group label's opacity change is informational, not spatial — but for simplicity, `transition-none` is the safe default; opacity is not jarring like movement is).

For the three elements:

```tsx
/* Line 220 — sidebar gap */
"relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-(--ease-out) motion-reduce:transition-none ..."

/* Line 232 — sidebar container */
"fixed inset-y-0 z-10 ... transition-[left,right,width] duration-200 ease-(--ease-out) motion-reduce:transition-none ..."

/* Line 404 — sidebar group label */
"flex h-8 ... transition-[margin,opacity] duration-200 ease-(--ease-out) motion-reduce:transition-none ..."
```

With `motion-reduce:transition-none`, the sidebar collapses/expands instantly when the user prefers reduced motion, while responsive users keep the animation.

## Repo conventions to follow

- `motion-reduce:transition-none` is already used in the codebase (e.g., `risk-rating-slider.tsx` has `motion-reduce:transition-none`).
- The project also uses `motion-reduce:animate-none` in table components — `transition-none` is the correct variant for CSS transitions.
- The reduced-motion variant is a Tailwind v4 built-in utility — no imports needed.

## Steps

1. Open `frontend/src/components/ui/sidebar.tsx`.

2. **Line 220** (sidebar gap): Insert `motion-reduce:transition-none` after `ease-(--ease-out)` (or `ease-linear` if plan 001 hasn't been applied).

   Before (assuming plan 001 applied):
   ```
   "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-(--ease-out) group-data-[collapsible=offcanvas]:w-0 ..."
   ```
   After:
   ```
   "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-(--ease-out) motion-reduce:transition-none group-data-[collapsible=offcanvas]:w-0 ..."
   ```

3. **Line 232** (sidebar container): Insert `motion-reduce:transition-none` after `ease-(--ease-out)`.

   Before (assuming plan 001 applied):
   ```
   "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-(--ease-out) data-[side=left]:left-0 ..."
   ```
   After:
   ```
   "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-(--ease-out) motion-reduce:transition-none data-[side=left]:left-0 ..."
   ```

4. **Line 404** (sidebar group label): Insert `motion-reduce:transition-none` after `ease-(--ease-out)`.

   Before (assuming plan 001 applied):
   ```
   "flex h-8 shrink-0 items-center rounded-md px-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground ring-sidebar-ring outline-hidden transition-[margin,opacity] duration-200 ease-(--ease-out) group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
   ```
   After:
   ```
   "flex h-8 shrink-0 items-center rounded-md px-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground ring-sidebar-ring outline-hidden transition-[margin,opacity] duration-200 ease-(--ease-out) motion-reduce:transition-none group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
   ```

## Boundaries

- Do NOT modify `app-sidebar.tsx` — it has no motion to gate (its only transition is `transition-colors` on the dropdown button, which is color-only and fine).
- Do NOT modify the sidebar rail (line 291) — plan 002 scopes it to `transition-colors`, which is color-only and doesn't need motion-reduce gating.
- Do NOT add JS reduced-motion detection — the CSS `motion-reduce:` variant is sufficient for this transition-based animation.

## Verification

- **Build**: `npm run build` (from `frontend/`) passes without errors.
- **Feel check**: 
  1. Open DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`.
  2. Toggle the sidebar. Confirm it snaps instantly (no width/left/right animation).
  3. Disable the emulation. Toggle again. Confirm the animation plays normally.
- **Done when**: All three `transition-*` class strings contain `motion-reduce:transition-none` and the build passes.
