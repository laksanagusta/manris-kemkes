# 005 — Animate Mitigation Validation Errors

- **Status**: DONE
- **Commit**: 7adcb81f
- **Severity**: LOW
- **Category**: Missed opportunities; Accessibility; Easing & duration
- **Estimated scope**: 4 files, small UI-only change

## Problem

Validation messages are conditionally inserted as plain paragraphs. They are
semantically announced with role="alert", but visually teleport into the layout
after submit:

Current evidence error at
frontend/src/components/shared/design-system/domain/mitigation-progress-form.tsx:67-75:

~~~tsx
{showValidationErrors && evidenceError ? (
  <p
    role="alert"
    className="text-xs leading-5 text-destructive"
  >
    {evidenceError}
  </p>
) : null}
~~~

The notes error at frontend/src/components/shared/design-system/domain/mitigation-progress-form.tsx:97-105
uses the same static class.

## Target

Give each newly mounted error message a short, accessible reveal using only
opacity and a 4px transform:

~~~tsx
className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-150 motion-safe:ease-(--ease-out)"
~~~

Apply the exact class to both error paragraphs. Do not add a delay or animate
the input's height, margin, padding, border, or surrounding layout. Keep
role="alert", the existing IDs, aria-describedby, and destructive color
unchanged. motion-safe must ensure the message remains immediately visible
without movement when reduced motion is requested.

## Repo conventions to follow

- The validation messages already use the shared minimum text-xs size and
  readable line height, documented in DESIGN.md:362-368.
- The repository's strong UI ease-out token is
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1) at
  frontend/src/app/globals.css:56-58.
- Short feedback motion stays below 200ms; the existing loading icon is the
  only continuous animation in this workflow at
  frontend/src/app/(app)/compliance/_components/mitigation-monitoring-panel.tsx:743-751.
- The canonical form is reused by the design-system example and the compliance
  page; change MitigationProgressForm, not a route-local error renderer.

## Steps

1. In frontend/src/components/shared/design-system/domain/mitigation-progress-form.tsx,
   replace the evidence error paragraph's class with the exact target class.
2. Apply the same exact class to the notes error paragraph. Preserve its id,
   role, text, and conditional rendering.
3. Add contract assertions in
   frontend/src/components/shared-page-contracts.test.ts that both error
   paragraphs retain role="alert" and contain the exact motion-safe,
   fade-in-0, slide-in-from-top-1, duration-150, and ease-(--ease-out)
   utilities.
4. Update DESIGN.md's form-modal rule and the Mitigation Progress Form
   catalogue copy in frontend/src/app/(app)/design-system/page.tsx to state
   that validation errors use a 150ms opacity/4px reveal and stay static under
   reduced motion. Do not change the required-field or validation semantics.

## Boundaries

- Do NOT change validation logic, URL rules, notes rules, error copy, focus
  management, or submit behavior.
- Do NOT animate layout properties or use transition-all.
- Do NOT remove role="alert", aria-invalid, or aria-describedby.
- Do NOT add a new dependency, keyframe, or easing token.
- Do NOT add a delay; errors must be announced and visible immediately.
- If the form no longer renders errors as the quoted conditional paragraphs,
  stop and report the drift instead of changing unrelated validation code.

## Verification

- **Mechanical**:
  - Run npm run lint -- src/components/shared/design-system/domain/mitigation-progress-form.tsx src/components/shared-page-contracts.test.ts from frontend/.
  - Run the focused mitigation form contract test.
  - Run the existing validation smoke test for validateMitigationReportForm.
  - Run npm run build from frontend/.
  - Run git diff --check from the repository root.
- **Feel check**:
  - Submit the empty form. Both errors should appear with a quick 150ms fade
    and 4px downward settle, without pushing the fields sideways or resizing
    the input itself beyond the natural message insertion.
  - Submit with only one invalid field and confirm only that field's error
    animates.
  - Confirm the browser/screen reader still announces each role="alert"
    message and focus still lands on the first invalid field.
  - Enable prefers-reduced-motion: reduce; error text should appear immediately
    with no transform animation.
- **Done when**: both mitigation validation errors have the specified short
  reveal, semantic announcement and focus behavior are unchanged, and no
  layout-property animation has been introduced.
