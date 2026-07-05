# Finalization Progress Card Design

## Scope

Replace the current "Kesiapan Finalisasi" checklist card on the risk
registration form with a compact segmented progress card. This is a visual-only
change and does not alter section validation or form behavior.

## Visual Design

- Keep the title "Kesiapan Finalisasi".
- Remove the completion count, section labels, item buttons, and status icons.
- Show one horizontal bar containing five equal segments.
- Use the primary color for completed sections and the muted surface color for
  incomplete sections.
- Match the modal card language: rounded corners, a subtle zinc border/ring,
  card background, compact padding, and no shadow.

## Data

The five segments map directly to the existing `sectionStatuses` array. A
segment is filled when its corresponding `section.done` value is true.

## Accessibility

Expose the completed and total section counts through an `aria-label` on the
progress group. No visible numbers are rendered.

## Verification

- Confirm the old checklist item buttons are absent.
- Confirm exactly one segment is rendered per `sectionStatuses` entry.
- Run the focused visual-alignment test and ESLint for the modified files.
