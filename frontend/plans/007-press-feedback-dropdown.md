# 007 — Add press feedback to user dropdown trigger button

- **Status**: TODO
- **Commit**: da9c60d3
- **Severity**: LOW
- **Category**: Physicality & origin
- **Estimated scope**: 1 file, 1 class addition

## Problem

The user dropdown trigger button in `app-sidebar.tsx:417-419` has `transition-colors` on hover but **no press (active) feedback**:

```tsx
/* app-sidebar.tsx:417-419 */
<button
  type="button"
  className="rounded-lg border border-zinc-200/80 bg-white p-3 text-left shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors hover:bg-muted/30 focus-visible:outline-none"
>
```

When clicked, the button provides no tactile response — no scale-down, no visual depth change. Per AUDIT.md §3: "Press feedback: `transform: scale(0.97)` on `:active` with `transition: transform 160ms ease-out`. Keep it subtle (0.95–0.98)."

The user clicks this button dozens of times per session to check their profile, settings, or logout. The lack of press feedback makes the UI feel unresponsive to touch/click.

## Target

Add `transition-transform duration-100 active:scale-[0.97]` to the button:

```tsx
/* target */
"rounded-lg border border-zinc-200/80 bg-white p-3 text-left shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors transition-transform duration-100 active:scale-[0.97] hover:bg-muted/30 focus-visible:outline-none"
```

When the user presses the button:
- It scales down 3% (`scale(0.97)`) — subtle but perceptible
- The scale animation is fast (100ms) and uses the browser default timing (`ease`) — instant enough for press feedback
- Release returns to `scale(1)` over the same 100ms

Note: Tailwind v4 applies transitions cumulatively with multiple `transition-*` classes — the shorthand `transition-colors transition-transform` correctly applies both.

## Repo conventions to follow

- The `active:` variant is used elsewhere in the codebase for press states.
- `transition-transform` is already used in sidebar.tsx:424, 556.
- The scale value `0.97` is within the recommended 0.95–0.98 range from the audit.
- Duration `100ms` matches the "Button press feedback" budget (100–160ms) from AUDIT.md.

## Steps

1. Open `frontend/src/components/app-sidebar.tsx`.

2. **Line 419**: Insert `transition-transform duration-100 active:scale-[0.97]` before `hover:bg-muted/30`.

   Before:
   ```
   "rounded-lg border border-zinc-200/80 bg-white p-3 text-left shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors hover:bg-muted/30 focus-visible:outline-none"
   ```
   After:
   ```
   "rounded-lg border border-zinc-200/80 bg-white p-3 text-left shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors transition-transform duration-100 active:scale-[0.97] hover:bg-muted/30 focus-visible:outline-none"
   ```

## Boundaries

- Do NOT modify the DropdownMenu or DropdownMenuContent — they inherit Radix's built-in entrance animation.
- Do NOT modify other buttons in the file — only the user dropdown trigger.
- Do NOT add a `hover:scale-*` effect — only press feedback via `active:`.

## Verification

- **Build**: `npm run build` (from `frontend/`) passes without errors.
- **Feel check**:
  - Run the dev server. Open the user dropdown at the sidebar footer.
  - Click and hold the button. Confirm it scales down ~3% (subtle press).
  - Release. Confirm it springs back to full size.
  - In DevTools → Animations panel, set playback to 10%. The scale animation should complete in ~100ms.
- **Reduced motion check**: Enable DevTools Rendering → `prefers-reduced-motion: reduce`. Confirm the press feedback still works (scale is a visual cue, not movement; it's acceptable under reduced motion per the audit).
- **Done when**: The dropdown trigger button scales to 0.97 on `:active` and back on release, with a 100ms transition.
