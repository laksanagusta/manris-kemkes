# 004 — Stagger Mitigation Modal Content

- **Status**: DONE
- **Commit**: 7adcb81f
- **Severity**: LOW
- **Category**: Cohesion & tokens; Missed opportunities
- **Estimated scope**: 4 files, small UI-only change

## Problem

The progress modal mounts its header, form, and footer as one synchronous group:

Current composition at
frontend/src/components/shared/design-system/domain/mitigation-progress-dialog.tsx:42-58:

~~~tsx
<div className="flex min-h-0 flex-col gap-5">
  <DialogHeader>
    <DialogTitle className="text-base">{title}</DialogTitle>
  </DialogHeader>
  <MitigationProgressForm {...formProps} />
  <DialogFooter>
    <CollectionDialogCancel ...>
      Batal
    </CollectionDialogCancel>
    {footerActions}
  </DialogFooter>
</div>
~~~

The modal shell already explains the spatial entrance with its centered
fade/zoom. The inner content has no secondary hierarchy, so the form feels like
a static block appearing all at once.

## Target

Add a restrained, non-blocking three-step reveal to the shared mitigation
progress dialog:

- Header: starts immediately.
- Form: starts after 40ms.
- Footer: starts after 80ms.

Use the same exact utility pattern for each group, changing only the delay:

~~~tsx
motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1
motion-safe:duration-200 motion-safe:ease-(--ease-out)
motion-safe:fill-mode-both
~~~

The form wrapper uses motion-safe:delay-[40ms] and the footer uses
motion-safe:delay-[80ms]. The header has no delay. The
slide-in-from-bottom-1 offset is the existing Tailwind spacing step (4px); do
not use a large slide.

The animation must affect only opacity and transform. fill-mode-both keeps a
delayed group visually quiet during its short delay, but the total delay stays
within the 30–80ms stagger budget and must not disable focus or pointer input.
motion-safe ensures the entire stagger is absent for reduced-motion users.

## Repo conventions to follow

- The shared strong ease-out token is defined at
  frontend/src/app/globals.css:56-58.
- Modal surface geometry is owned by DialogContent; do not add a second card
  or surface around the form. This is documented in DESIGN.md:371-374 and
  :429-430.
- The design system catalogue already renders the canonical example through
  frontend/src/components/shared/design-system/examples/mitigation-progress-dialog-example.tsx:22-37.
- Existing motion classes use motion-reduce/motion-safe variants and never use
  transition-all; follow that convention.

## Steps

1. In frontend/src/components/shared/design-system/domain/mitigation-progress-dialog.tsx,
   add the exact no-delay motion class pattern to DialogHeader.
2. Wrap MitigationProgressForm in one spacing-neutral div with the exact form
   motion pattern plus motion-safe:delay-[40ms]. Do not add padding, border,
   background, or a second elevation surface.
3. Add the exact footer motion pattern plus
   motion-safe:delay-[80ms] to DialogFooter.
4. Add contract assertions in
   frontend/src/components/shared-page-contracts.test.ts that the canonical
   mitigation dialog contains motion-safe:animate-in,
   motion-safe:fade-in-0, motion-safe:slide-in-from-bottom-1,
   motion-safe:duration-200, motion-safe:ease-(--ease-out), and the exact
   40ms/80ms delays. Assert that the dialog source does not contain
   transition-all.
5. Update the Mitigation Progress Dialog section in
   frontend/src/app/(app)/design-system/page.tsx with a short description of
   the 0/40/80ms hierarchy. Update DESIGN.md:373 to document the same exact
   stagger and its reduced-motion behavior.

## Boundaries

- Do NOT animate the outer Dialog overlay or change its scrim; Plan 002 owns
  modal timing.
- Do NOT animate width, height, margin, padding, or layout geometry.
- Do NOT add a new dependency, keyframe, spring, or easing token.
- Do NOT delay the submit action or keyboard focus programmatically.
- Do NOT add stagger to every field individually; keep the three-group reveal
  only.
- If the wrapper changes form semantics or focus behavior, stop and report
  rather than adding a different container structure.

## Verification

- **Mechanical**:
  - Run npm run lint -- src/components/shared/design-system/domain/mitigation-progress-dialog.tsx src/components/shared-page-contracts.test.ts from frontend/.
  - Run the focused mitigation dialog contract test.
  - Run npm run build from frontend/.
  - Run git diff --check from the repository root.
- **Feel check**:
  - Open the modal and confirm the title appears first, the form follows by
    roughly 40ms, and the footer follows by roughly 80ms.
  - Slow playback to 10%; confirm movement is only a subtle 4px upward settle
    plus opacity, with no resize or layout jump.
  - Immediately tab through the modal while it opens; focus must remain usable
    and the delayed groups must not block keyboard interaction.
  - Enable prefers-reduced-motion: reduce; all groups should appear without
    transform/opacity animation and the form must remain fully usable.
- **Done when**: the mitigation dialog has a restrained 0/40/80ms content
  hierarchy, no layout-property animation, and the reduced-motion path is
  static and accessible.
