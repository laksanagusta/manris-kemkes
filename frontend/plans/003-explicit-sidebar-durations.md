# 003 — Add explicit duration and easing to missing sidebar elements

- **Status**: TODO
- **Commit**: da9c60d3
- **Severity**: MEDIUM
- **Category**: Cohesion & tokens
- **Estimated scope**: 1 file, 3 class changes
- **Depends on**: Plan 006 (easing tokens in globals.css)

## Problem

Three sidebar elements have `transition-*` classes but **no explicit duration or easing**, falling back to browser defaults (`ease`, `0s`):

```tsx
/* sidebar.tsx:424 — SidebarGroupAction */
"absolute top-3.5 right-3 flex aspect-square w-5 ... transition-transform group-data-[collapsible=icon]:hidden ..."

/* sidebar.tsx:469 — SidebarMenuButton (via cva) */
"peer/menu-button ... transition-[width,height,padding] group-has-data-[sidebar=menu-action]/menu-item:pr-8 ..."

/* sidebar.tsx:556 — SidebarMenuAction */
"absolute top-1.5 right-1 flex aspect-square w-5 ... transition-transform group-data-[collapsible=icon]:hidden ..."
```

Without explicit duration/easing:
- They animate at browser-default speed (~0s = instant on some browsers, ~150ms on others) — inconsistent.
- The easing defaults to `ease` (`cubic-bezier(0.25, 0.1, 0.25, 1)`) which is a weak, unexpressive curve.
- They break visual cohesion — the rest of the sidebar animates at 200ms, these animate at an unpredictable speed.

## Target

Add `duration-200 ease-(--ease-out)` to all three:
- `transition-transform` → `transition-transform duration-200 ease-(--ease-out)`
- `transition-[width,height,padding]` → `transition-[width,height,padding] duration-200 ease-(--ease-out)`

This matches the other sidebar transitions (200ms, strong ease-out from token `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`).

## Repo conventions to follow

- Duration `200` matches all other sidebar transitions (sidebar.tsx:220, 232, 404).
- Uses `ease-(--ease-out)` Tailwind v4 syntax, referencing the easing token from plan 006.
- Token `--ease-out` is defined in `globals.css` — plan 006 must be applied first.

## Steps

1. Open `frontend/src/components/ui/sidebar.tsx`.

2. **Line 424** (SidebarGroupAction): Insert `duration-200 ease-(--ease-out)` after `transition-transform`.

   Before:
   ```
   "absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform group-data-[collapsible=icon]:hidden after:absolute after:-inset-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0",
   ```
   After:
   ```
   "absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform duration-200 ease-(--ease-out) group-data-[collapsible=icon]:hidden after:absolute after:-inset-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0",
   ```

3. **Line 469** (SidebarMenuButton cva): Insert `duration-200 ease-(--ease-out)` after `transition-[width,height,padding]`.

   Before:
   ```
   "peer/menu-button group/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm ring-sidebar-ring outline-hidden transition-[width,height,padding] group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! ..."
   ```
   After:
   ```
   "peer/menu-button group/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm ring-sidebar-ring outline-hidden transition-[width,height,padding] duration-200 ease-(--ease-out) group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! ..."
   ```

4. **Line 556** (SidebarMenuAction): Insert `duration-200 ease-(--ease-out)` after `transition-transform`.

   Before:
   ```
   "absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform group-data-[collapsible=icon]:hidden peer-hover/menu-button:text-sidebar-accent-foreground ..."
   ```
   After:
   ```
   "absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform duration-200 ease-(--ease-out) group-data-[collapsible=icon]:hidden peer-hover/menu-button:text-sidebar-accent-foreground ..."
   ```

## Boundaries

- Do NOT change the existing class ordering — only insert the two new classes after `transition-*`.
- Do NOT modify `transition-[width,height,padding]` — it will be separately addressed by plan 005 (transform migration).
- Do NOT modify files outside `sidebar.tsx`.

## Verification

- **Build**: `npm run build` (from `frontend/`) passes without errors.
- **Confirmation**: Search for `transition-transform` and `transition-[width,height,padding]` in `sidebar.tsx` and confirm each is followed by `duration-200 ease-(--ease-out)`.
- **Feel check**: Run the dev server. Hover over sidebar nav items (triggers `SidebarMenuAction` on some items). The action button appearance should smoothly fade/scale at the same 200ms cadence as the sidebar itself.
- **Done when**: All three `transition-*` classes have `duration-200 ease-(--ease-out)` appended and the build passes.
