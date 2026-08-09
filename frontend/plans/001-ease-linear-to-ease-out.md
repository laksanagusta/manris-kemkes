# 001 — Replace ease-linear with ease-out on sidebar collapse transitions

- **Status**: TODO
- **Commit**: da9c60d3
- **Severity**: HIGH
- **Category**: Easing & duration
- **Estimated scope**: 1 file, 3 class changes
- **Depends on**: Plan 006 (easing tokens in globals.css)

## Problem

The sidebar collapse/expand is the most frequently-triggered motion in the app (every navigation toggle). Three elements in `sidebar.tsx` use `ease-linear` for their collapse transition:

```tsx
/* sidebar.tsx:220 — sidebar gap */
"relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",

/* sidebar.tsx:232 — sidebar container */
"fixed inset-y-0 z-10 ... transition-[left,right,width] duration-200 ease-linear",

/* sidebar.tsx:404 — sidebar group label */
"flex h-8 ... transition-[margin,opacity] duration-200 ease-linear",
```

`ease-linear` (`cubic-bezier(0, 0, 1, 1)`) moves at constant speed — it starts at full speed, so it feels abrupt, and ends at full speed, so it feels like it stops suddenly. There is no deceleration to signal "the motion is complete." For a collapse animation seen dozens of times per session, this feels mechanical and unresponsive.

## Target

Replace all three `ease-linear` with `ease-(--ease-out)` (the strong ease-out from token `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`):

```tsx
/* target */
"relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-(--ease-out)",
"fixed inset-y-0 z-10 ... transition-[left,right,width] duration-200 ease-(--ease-out)",
"flex h-8 ... transition-[margin,opacity] duration-200 ease-(--ease-out)",
```

This curve starts fast (responsive to the click) and decelerates smoothly (feels natural, signals completion). Keep `duration-200` (200ms) — it's within the acceptable range for UI and matches the existing timing.

## Repo conventions to follow

- Use Tailwind v4 arbitrary-value syntax: `ease-(--ease-out)` to reference CSS variable tokens.
- The `--ease-out` token is defined in `globals.css` by plan 006 — that plan must be applied first.

## Steps

1. Open `frontend/src/components/ui/sidebar.tsx`.
2. **Line 220**: Change `duration-200 ease-linear` to `duration-200 ease-(--ease-out)`.
   ```
   Before: "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear"
   After:  "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-(--ease-out)"
   ```
3. **Line 232**: Change `duration-200 ease-linear` to `duration-200 ease-(--ease-out)`.
   ```
   Before: "fixed inset-y-0 z-10 ... transition-[left,right,width] duration-200 ease-linear"
   After:  "fixed inset-y-0 z-10 ... transition-[left,right,width] duration-200 ease-(--ease-out)"
   ```
4. **Line 404**: Change `duration-200 ease-linear` to `duration-200 ease-(--ease-out)`.
   ```
   Before: "transition-[margin,opacity] duration-200 ease-linear group-data-[collapsible=icon]:-mt-8"
   After:  "transition-[margin,opacity] duration-200 ease-(--ease-out) group-data-[collapsible=icon]:-mt-8"
   ```

## Boundaries

- Do NOT touch any other classes in these className strings.
- Do NOT change duration (keep 200ms).
- Do NOT modify `transition-[left,right,width]` or other property lists — only the easing value.
- Do NOT modify files outside `sidebar.tsx`.

## Verification

- **Build**: `npm run build` (from `frontend/`) passes without errors.
- **Feel check**: Run the dev server. Click the sidebar toggle (`Ctrl/Cmd+B` or the rail). Confirm:
  - The sidebar collapse/expand feels snappier — it starts fast and glides to a stop.
  - In DevTools → Animations panel, set playback speed to 25%. The deceleration curve is visible as a smooth arc, not a straight line.
- **Confirmation**: `grep "ease-linear" frontend/src/components/ui/sidebar.tsx` returns zero matches for the three changed lines.
- **Done when**: Three `ease-linear` occurrences on lines 220, 232, 404 are replaced with `ease-(--ease-out)` and the build passes.
