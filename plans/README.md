# Animation Plans

| # | Title | Severity | Status |
|---|---|---|---|
| 001 | Keep Select Borders Stable and Animate the Chevron | MEDIUM | DONE |
| 002 | Smooth Mitigation Modal Timing | MEDIUM | DONE |
| 003 | Sequence Mitigation Modal Handoff | MEDIUM | DONE |
| 004 | Stagger Mitigation Modal Content | LOW | DONE |
| 005 | Animate Mitigation Validation Errors | LOW | DONE |
| 006 | Stabilize Editable Cause Rows on Add | MEDIUM | DONE |
| 007 | Restore New Editable Row Animation Without Replay | MEDIUM | DONE |

## Recommended execution order

1. Plan 001 is complete. It was self-contained and had no dependencies.
2. Plan 002 is complete; shared Dialog/AlertDialog timing is stable.
3. Plan 003 is complete; the detail-to-report modal handoff uses the
   shared exit animation lifecycle.
4. Plans 004 and 005 are complete; both remain limited to the mitigation
   reporting experience.
5. Plan 006 is complete; it stabilizes the shared editable list used by risk
   causes, impacts, and substance fields.
6. Plan 007 follows Plan 006; it restores a one-time entrance cue only for
   newly inserted editable rows while preserving the stability fix.

## Dependencies

Plan 003 depends on the existing Radix `data-closed:animate-out` lifecycle and
should be verified after Plan 002. Plans 004 and 005 do not depend on Plan 003.
Plan 006 has no dependency on Plans 001–005.
Plan 007 depends on Plan 006's stable-row baseline and supersedes its
animation-free target without restoring index-based replay.
