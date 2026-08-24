# 002 — Smooth Mitigation Modal Timing

- **Status**: DONE
- **Commit**: 7adcb81f
- **Severity**: MEDIUM
- **Category**: Easing & duration; Cohesion & tokens
- **Estimated scope**: 5 files, small UI-only change

## Problem

The mitigation reporting modal and its detail modal both use the shared Dialog
primitive. The overlay and content currently run their enter/exit animations
for only 100ms and do not select the repository's strong UI ease-out token.
tw-animate-css therefore falls back to its generic ease timing function.

Current overlay at frontend/src/components/ui/dialog.tsx:39-44:

~~~tsx
<DialogPrimitive.Overlay
  data-slot="dialog-overlay"
  className={cn(
    "fixed inset-0 isolate z-50 frosted-scrim duration-100 motion-reduce:animate-none motion-reduce:transition-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
    className
  )}
  {...props}
/>
~~~

Current content at frontend/src/components/ui/dialog.tsx:61-66:

~~~tsx
<DialogPrimitive.Content
  data-slot="dialog-content"
  className={cn(
    "fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col gap-5 overflow-y-auto overscroll-contain rounded-xl bg-card p-5 text-sm smooth-shadow-ring-xl shadow-black smooth-ring-neutral-300/30 duration-100 motion-reduce:animate-none motion-reduce:transition-none outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
    className
  )}
  {...props}
>
~~~

AlertDialog repeats the same 100ms/default-easing pattern at
frontend/src/components/ui/alert-dialog.tsx:36-42 and
frontend/src/components/ui/alert-dialog.tsx:57-63, so the shared modal family
would otherwise feel inconsistent.

## Target

Use the existing strong ease-out token and a 200ms modal duration for the
overlay and modal panel. Keep the current frosted-scrim, centered zoom-in-95
geometry, smooth-shadow-ring-xl, and reduced-motion behavior unchanged.

The target overlay class must include these exact motion utilities:

~~~tsx
"fixed inset-0 isolate z-50 frosted-scrim duration-200 ease-(--ease-out) motion-reduce:animate-none motion-reduce:transition-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
~~~

The target Dialog content class must replace duration-100 with
duration-200 ease-(--ease-out) and keep all existing transform, opacity, and
surface utilities.

Apply the same duration-200 ease-(--ease-out) change to both overlay and
content in frontend/src/components/ui/alert-dialog.tsx.

## Repo conventions to follow

- Shared easing tokens live in frontend/src/app/globals.css:56-59:
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1).
- The product is a crisp operational dashboard; UI motion stays below 300ms.
- The existing modal shell and frosted scrim are documented in DESIGN.md:370-374.
  Do not replace the scrim or shadow implementation.
- Existing reduced-motion handling on modal primitives is deliberate and must
  remain in place.

## Steps

1. In frontend/src/components/ui/dialog.tsx, change the overlay motion from
   duration-100 to duration-200 ease-(--ease-out).
2. In the same file, change the content motion from duration-100 to
   duration-200 ease-(--ease-out).
3. In frontend/src/components/ui/alert-dialog.tsx, apply the same exact
   overlay and content motion classes.
4. Extend the modal contract test in
   frontend/src/components/ui/elevated-surface-contract.test.ts or
   frontend/src/components/shared-page-contracts.test.ts so Dialog and
   AlertDialog sources both contain duration-200, ease-(--ease-out), and
   motion-reduce:animate-none, and neither contains duration-100 on the modal
   overlay/content class.
5. Update DESIGN.md in the Overlays and Groups modal rule to document the exact
   200ms ease-out enter/exit timing. Update the Dialog / AlertDialog catalogue
   section in frontend/src/app/(app)/design-system/page.tsx with a short
   description that the modal uses a 200ms strong ease-out transition and keeps
   its frosted scrim; do not change the visual surface example.

## Boundaries

- Do NOT change the scrim background, blur, modal shadow, radius, dimensions,
  or zoom-in-95 scale.
- Do NOT change Sheet timing in this plan.
- Do NOT remove reduced-motion handling.
- Do NOT add a new dependency or a new easing token.
- Do NOT animate layout properties such as width, height, padding, or margin.
- If the modal classes have drifted from the quoted commit, stop and report the
  drift instead of replacing unrelated utilities.

## Verification

- **Mechanical**:
  - Run npm run lint -- src/components/ui/dialog.tsx src/components/ui/alert-dialog.tsx src/components/ui/elevated-surface-contract.test.ts from frontend/.
  - Run the targeted elevated-surface/shared-page contract tests from frontend/.
  - Run npm run build from frontend/.
  - Run git diff --check from the repository root.
- **Feel check**:
  - Open and close both Detail Laporan Penanganan and Lapor Progress Penanganan
    at normal speed. They should feel responsive but no longer snap in at
    100ms.
  - Set DevTools animation playback to 10%; confirm the panel and scrim use the
    same 200ms strong ease-out timing, with the panel staying centered.
  - Confirm the background remains the existing frosted scrim and recognizable
    behind the modal.
  - Enable prefers-reduced-motion: reduce; the modal should appear/disappear
    without movement animation while remaining usable.
- **Done when**: Dialog and AlertDialog use the exact 200ms shared ease-out
  timing, all existing modal geometry/surface behavior remains unchanged, and
  the contract/build checks pass.
