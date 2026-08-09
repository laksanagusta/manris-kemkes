# 005 — Migrate sidebar layout properties to transform

- **Status**: TODO
- **Commit**: da9c60d3
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 1 file, moderate complexity

## Problem

The sidebar collapse/expand currently animates layout properties:

```tsx
/* sidebar.tsx:220 */  transition-[width]
/* sidebar.tsx:232 */  transition-[left,right,width]
```

`width`, `left`, and `right` are **layout properties** — animating them triggers the full browser pipeline: layout → paint → composite. This means every frame of the collapse animation recalculates positions for all elements, re-paints affected areas, and then composites. On low-end devices or during heavy page loads, this causes visible jank.

`transform: translateX()` is **composite-only** — it runs entirely on the GPU compositor thread, without touching layout or paint. This is the single highest-leverage performance optimization for sidebar motion (see AUDIT.md §5).

## Target

Replace the width/left/right animation with `transform: translateX()`:

**Current approach:** The sidebar container sits at `left: 0` with `width: 16rem`. On collapse, `width` goes to `3rem`.

**Target approach:** The sidebar container keeps a fixed visual width always. On collapse, it translates left by `calc(3rem - 16rem) = -13rem` (or similar) using GPU-composited `transform`. The sidebar gap (the spacer div) is the only element that changes actual `width`.

This is the standard CSS sidebar collapse pattern — the sidebar itself is `width: 16rem` and `transform: translateX(0)` normally, and `transform: translateX(-13rem)` when collapsed, with the gap div handling the main content reflow.

**Specific changes:**

**Line 220** (sidebar gap) — keep `transition-[width]` as-is (the gap must reflow the main content; it's a layout necessity):

```tsx
// Keep as-is — the gap spacer needs to change actual width
"relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-(--ease-out) motion-reduce:transition-none ..."
```

**Line 232** (sidebar container) — change from positioning/width animation to pure transform:

Current classes applied to this element: `data-[side=left]:left-0 data-[side=left]:group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]` and `group-data-[collapsible=icon]:w-(--sidebar-width-icon)`.

Replace the `transition-[left,right,width]` with `transition-transform`. Keep `left: 0` / `right: 0` in place but remove `width` animation from the container. Make it always `width: var(--sidebar-width)` and use `transform: translateX(-100%)` on collapse for `icon` collapsible mode.

The exact transform values require careful calculation:
- Expanded: `transform: translateX(0)`
- Collapsed (icon mode): `transform: translateX(calc(var(--sidebar-width-icon) - var(--sidebar-width)))` ≈ `translateX(-13rem)`
- Collapsed (offcanvas mode): `transform: translateX(-100%)`

## Repo conventions to follow

- This pattern (fixed-width sidebar with translateX collapse) is the standard CSS approach used by dozens of production apps.
- The `transition-transform` class already exists in the codebase (sidebar.tsx:424, 556).
- Tailwind v4 arbitrary values like `translate-x-[calc(...)]` work natively.

## Steps

1. Open `frontend/src/components/ui/sidebar.tsx`.

2. **Line 232** — Update the sidebar container `className`:
   - Replace `transition-[left,right,width]` with `transition-transform`
   - Remove `group-data-[collapsible=icon]:w-(--sidebar-width-icon)` from the icon variant
   - Add fixed width: append `w-(--sidebar-width)`
   - Add translate transform for collapsed state

   The icon collapsible currently uses `group-data-[collapsible=icon]:w-(--sidebar-width-icon)` to shrink the sidebar. Replace this with a translate-based approach:

   ```tsx
   // Before (icon variant section):
   variant === "floating" || variant === "inset"
     ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
     : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",

   // After:
   variant === "floating" || variant === "inset"
     ? "p-2 group-data-[collapsible=icon]:-translate-x-[calc(var(--sidebar-width)-var(--sidebar-width-icon))]"
     : "group-data-[collapsible=icon]:-translate-x-[calc(var(--sidebar-width)-var(--sidebar-width-icon))] group-data-[side=left]:border-r group-data-[side=right]:border-l",
   ```

   And in the main class string:
   - Replace `transition-[left,right,width]` with `transition-transform`
   - Ensure `w-(--sidebar-width)` is present (it is already on line 232)

3. **Line 220** (sidebar gap) — no changes needed; the gap must keep `transition-[width]` since it reflows content.

## Boundaries

- Do NOT modify the gap div (line 220) — it must keep `transition-[width]` to push the main content.
- Do NOT modify `SidebarMenuButton` (line 469) `transition-[width,height,padding]` — those are separate.
- Do NOT modify floating/inset variant logic — only the icon collapsible path.
- Test on all three sidebar variants: `sidebar`, `floating`, `inset`.
- This is higher-complexity than other plans — verify thoroughly in multiple viewport sizes.

## Verification

- **Build**: `npm run build` (from `frontend/`) passes without errors.
- **Feel check**: 
  - Run the dev server. Toggle the sidebar (`Ctrl/Cmd+B`).
  - Confirm the sidebar slides smoothly with no visible jank.
  - Confirm the main content reflows correctly (the gap div pushes it).
  - In DevTools → Performance panel, record a toggle. Confirm no layout thrashing — only `Composite Layers` in the rendering pipeline.
- **Responsive check**: Toggle at mobile breakpoint (if applicable) and at desktop. Confirm no overflow/clipping issues.
- **Done when**: The sidebar collapses and expands using only `transform` on the container, with no layout/paint work triggered by the animation, and all three variants work correctly.
