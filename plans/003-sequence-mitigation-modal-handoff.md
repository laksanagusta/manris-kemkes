# 003 — Sequence Mitigation Modal Handoff

- **Status**: DONE
- **Commit**: 7adcb81f
- **Severity**: MEDIUM
- **Category**: Interruptibility; Physicality & origin
- **Estimated scope**: 5 files, medium interaction-state change

## Problem

The mitigation page owns two independent Radix Dialog roots: the detail modal
and the progress-report modal. The Lapor Progress actions close the detail
modal and open the report modal in the same event.

Current overdue action at
frontend/src/app/(app)/compliance/_components/mitigation-monitoring-panel.tsx:690-701:

~~~tsx
<ActionButton
  size="sm"
  variant="destructive"
  onClick={() => {
    setShowDetailDialog(false);
    handleOpenSubmit(detailTask);
  }}
  icon={<Send className="size-3" />}
>
  Lapor Progress
</ActionButton>
~~~

Current pending action at
frontend/src/app/(app)/compliance/_components/mitigation-monitoring-panel.tsx:703-712:

~~~tsx
<AccentButton
  size="sm"
  onClick={() => {
    setShowDetailDialog(false);
    handleOpenSubmit(detailTask);
  }}
  icon={<Send className="size-3" />}
>
  Lapor Progress
</AccentButton>
~~~

Because both state changes are committed together, Radix can keep the closing
detail content in its exit lifecycle while the second Dialog mounts its own
overlay and panel. This can create an overlay overlap, flash, or an abrupt
modal swap.

## Target

Treat the detail-to-report action as a queued handoff:

1. Store the selected task in a ref.
2. Close the detail Dialog only.
3. After the detail Dialog's own exit animation finishes, open the report
   Dialog using the existing handleOpenSubmit behavior.
4. When reduced motion is requested, bypass the animation-end wait and open the
   report Dialog on the next animation frame so the handoff still completes.

Use the existing Dialog Content animation lifecycle rather than a hard-coded
timeout. The animation-end handler must only flush the queued task when
event.currentTarget === event.target and event.animationName === "exit".

The intended state flow is:

~~~tsx
const pendingReportTaskRef = useRef<MitigationTaskRow | null>(null);

const flushPendingReport = useCallback(() => {
  const task = pendingReportTaskRef.current;
  if (!task) return;
  pendingReportTaskRef.current = null;
  handleOpenSubmit(task);
}, [handleOpenSubmit]);

const handleOpenSubmitFromDetail = (task: MitigationTaskRow) => {
  pendingReportTaskRef.current = task;
  setShowDetailDialog(false);
  if (reducedMotion) {
    window.requestAnimationFrame(flushPendingReport);
  }
};
~~~

The exact implementation may use a stable callback/ref arrangement to satisfy
React hook dependencies, but it must preserve this behavior and must not use a
fixed setTimeout as a substitute for the Radix exit lifecycle.

## Repo conventions to follow

- The page already uses refs for form focus targets at
  frontend/src/app/(app)/compliance/_components/mitigation-monitoring-panel.tsx:125-126.
- The page uses controlled Radix Dialogs at
  frontend/src/app/(app)/compliance/_components/mitigation-monitoring-panel.tsx:584
  and :725.
- Reduced-motion-safe behavior is already used by shared motion primitives;
  import useReducedMotion from the installed motion/react package if needed,
  rather than inventing a second media-query hook.
- The shared Dialog content forwards DOM props, including onAnimationEnd,
  through frontend/src/components/ui/dialog.tsx:50-67.

## Steps

1. In frontend/src/app/(app)/compliance/_components/mitigation-monitoring-panel.tsx,
   import useReducedMotion from motion/react and create a ref for a pending
   MitigationTaskRow handoff.
2. Keep the existing handleOpenSubmit as the single function that populates
   evidence, notes, validation state, selected task, and showDialog.
3. Add a stable flushPendingReport callback that consumes the pending-task ref
   exactly once and calls handleOpenSubmit.
4. Add handleOpenSubmitFromDetail, which queues the task, calls only
   setShowDetailDialog(false), and calls
   requestAnimationFrame(flushPendingReport) when useReducedMotion() returns
   true.
5. Replace both duplicated inline handlers at the overdue and pending Lapor
   Progress buttons with handleOpenSubmitFromDetail(detailTask).
6. Add onAnimationEnd to the detail DialogContent. For the root content
   element only, when animationName === "exit", call flushPendingReport().
   Ignore bubbled child animation events and all enter animations.
7. Clear pendingReportTaskRef in an unmount cleanup if the page can unmount
   while a handoff is queued. Do not add a timer.
8. Add a focused contract test for the compliance panel that asserts the two
   inline close-then-open handlers are gone and that the detail Dialog has an
   exit animation handler plus a reduced-motion fallback. Update the mitigation
   interaction note in DESIGN.md and the Mitigation Progress Dialog section in
   frontend/src/app/(app)/design-system/page.tsx to document that modal
   handoffs are sequential and reduced-motion-safe.

## Boundaries

- Do NOT change the API request, validation rules, task selection data, or
  success/error toasts.
- Do NOT add a fixed timeout based on the modal duration.
- Do NOT alter the shared Dialog animation classes in this plan; Plan 002 owns
  that change.
- Do NOT change the detail modal's layout, shadow, scrim, or form fields.
- If the installed Radix content does not emit animationName === "exit" on
  close, stop and report; do not guess a timeout. Verify the rendered DOM and
  animation event before improvising.

## Verification

- **Mechanical**:
  - Run npm run lint -- src/app/(app)/compliance/_components/mitigation-monitoring-panel.tsx from frontend/.
  - Run the focused shared-page/compliance contract test.
  - Run npm run build from frontend/.
  - Run git diff --check from the repository root.
- **Feel check**:
  - Open a detail modal and click Lapor Progress for both overdue and pending
    tasks. The detail panel must finish closing before the report panel appears;
    there must be one continuous scrim with no flash or overlap.
  - Repeat the action rapidly and confirm only one report modal opens with the
    correct task's existing evidence and notes.
  - Enable prefers-reduced-motion: reduce; the report modal must still open on
    the next frame without waiting for an animation event.
  - Use DevTools animation playback at 10% and confirm the handoff order follows
    the detail exit animation.
- **Done when**: every detail-to-report handoff is sequential, exactly one modal
  is active at a time, the correct task data is preserved, and reduced-motion
  users never get stuck between dialogs.
