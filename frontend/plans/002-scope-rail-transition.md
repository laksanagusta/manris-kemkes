# 002 — Scope SidebarRail transition-all to transition-colors

- **Status**: TODO
- **Commit**: da9c60d3
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 1 file, 1 class change

## Problem

The `SidebarRail` button at `sidebar.tsx:291` uses `transition-all`:

```tsx
/* sidebar.tsx:291 — SidebarRail */
"absolute inset-y-0 z-20 hidden w-4 transition-all ease-linear group-data-[side=left]:-right-4 ..."
```

`transition-all` animates **every** animatable CSS property on the element — not just what's intended to change. This wastes GPU/CPU cycles on properties that never change (position, width, z-index, display, etc.) and is explicitly flagged as a finding in the animation audit (AUDIT.md §5: "`transition: all` animates unintended properties off-GPU — always a finding").

The only property that actually changes here is `background-color` (via `hover:after:bg-sidebar-border` on the `::after` pseudo-element). There is no transform, width, or position animation — `transition-all` is pure waste.

## Target

Replace `transition-all ease-linear` with `transition-colors`:

```tsx
/* target */
"absolute inset-y-0 z-20 hidden w-4 transition-colors group-data-[side=left]:-right-4 ..."
```

`transition-colors` scopes to `color`, `background-color`, `border-color`, `outline-color`, `text-decoration-color`, `fill`, and `stroke` — only the properties that could meaningfully change on hover. No duration/easing needed since the default `ease` + `150ms` from Tailwind is acceptable for a color-only hover transition.

## Repo conventions to follow

- `transition-colors` is already used elsewhere in the codebase (scroll-area.tsx:23, app-sidebar.tsx:419).
- No explicit duration/easing matches the existing `transition-colors` usage patterns.

## Steps

1. Open `frontend/src/components/ui/sidebar.tsx`.
2. **Line 291**: Replace `transition-all ease-linear` with `transition-colors`.

   Before:
   ```tsx
   "absolute inset-y-0 z-20 hidden w-4 transition-all ease-linear group-data-[side=left]:-right-4 after:absolute after:inset-y-0 after:start-1/2 after:w-[2px] hover:after:bg-sidebar-border sm:flex ltr:-translate-x-1/2 rtl:-translate-x-1/2",
   ```
   After:
   ```tsx
   "absolute inset-y-0 z-20 hidden w-4 transition-colors group-data-[side=left]:-right-4 after:absolute after:inset-y-0 after:start-1/2 after:w-[2px] hover:after:bg-sidebar-border sm:flex ltr:-translate-x-1/2 rtl:-translate-x-1/2",
   ```

## Boundaries

- Do NOT change the `ease-linear` on other elements — that's covered by plan 001.
- Do NOT change the `group-*` or positioning classes.
- Do NOT modify files outside `sidebar.tsx`.

## Verification

- **Build**: `npm run build` (from `frontend/`) passes without errors.
- **Confirmation**: `grep "transition-all" frontend/src/components/ui/sidebar.tsx` returns zero matches.
- **Feel check**: Hover over the sidebar rail (the thin strip at the right edge). The hover highlight should appear identically to before — no visual difference, because the only animated property was `background-color`, which `transition-colors` still handles.
- **Done when**: `transition-all` is replaced with `transition-colors` on line 291 and the build passes.
