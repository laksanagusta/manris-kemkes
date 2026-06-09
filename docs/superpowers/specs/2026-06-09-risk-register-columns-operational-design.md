# Risk Register Columns Operational Design

## Context

The current `Daftar Risiko` table on `/risk/register` is functional, but its
column order leans too much toward record metadata and versioning. For unit
users working on risks day to day, the table should surface what they need to
scan, continue, or act on first.

The existing table currently shows:

`Kode | Versi | Judul Risiko | Kategori | Nilai | Tingkat Risiko | Status | Penanganan | Dibuat | Aksi`

That order works for record lookup, but it does not prioritize operational
actionability. `Versi` and `Dibuat` are useful, but they should not take prime
positions in the primary scan path.

This design applies to the main risk register table and the monitoring
transactions table used by unit users. It does not change the drafts table,
history table, or backend data contracts.

## Goal

Make the risk register and monitoring transactions tables easier for unit users
to scan and act on during daily work by reordering columns around operational
priority.

## Non-Goals

- No backend schema changes.
- No API payload changes.
- No changes to filtering, sorting behavior, pagination, or row actions.
- No changes to the drafts table or history table.
- No addition of new computed metrics.

## Design Decision

Use operational-first layouts with one primary text column and compact secondary
metadata inside it.

The main risk register table should answer:

1. What is the risk?
2. How urgent or severe is it?
3. What should I do next?

The monitoring transactions table should answer:

1. Which monitoring transaction is this?
2. What period does it belong to?
3. What changed and what is the next action?

## Main Risk Register Column Design

Recommended column order:

`Kode | Risiko | Skor/Level | Status Kerja | Tindak Lanjut | Review Berikutnya | Update Terakhir | Aksi`

## Main Risk Register Column Rules

### `Kode`

- Keep the risk code as the first column.
- Use monospace styling as today.
- Preserve existing width behavior.

### `Risiko`

- Replace the current separate `Judul Risiko` column with a broader primary
  text column.
- The main line remains the risk title.
- Secondary metadata may live under the title in muted text, in this order:
  - category,
  - version badge when relevant,
  - owning unit or organization if available in the row payload.
- The title remains the click target to open risk detail.

### `Skor/Level`

- Show the numeric score and risk level together as one scan target.
- If space is tight, the numeric score may remain primary and the level may be a
  compact badge in the same cell.
- This column should stay near the front because it is the main priority signal
  for daily triage.

### `Status Kerja`

- This column replaces the current status column as the operational status
  indicator.
- It should show the user-facing work state, not just the raw storage status.
- For draft or active rows, display the most useful current work state:
  - `Draft`
  - `Dalam Review`
  - `Disetujui`
  - `Pemantauan Berjalan`
  - `Diarsipkan`
- If a row has both a main status and an ongoing draft status, show the ongoing
  state as the dominant badge and the main status as secondary only when needed.

### `Tindak Lanjut`

- Replace the generic `Penanganan` wording with a more operational label.
- This column should describe the next practical action or the current
  treatment posture.
- Use human-readable values such as:
  - `Mulai pemantauan`
  - `Lanjutkan pemantauan`
  - `Menunggu review`
  - `Mitigasi`
  - `Menerima risiko`
  - `-` when no useful action is available

### `Review Berikutnya`

- Replace `Dibuat` with a next-review oriented column for the main register.
- Prefer a due/review signal over creation time for day-to-day work.
- If the source data has no review target, show `-`.
- If the row is archived or closed and no review is expected, keep the column as
  `-`.

### `Update Terakhir`

- Show the last meaningful update timestamp instead of creation timestamp.
- If only `createdAt` is available for a row, fall back to that value.
- Format should remain compact and localized.

### `Aksi`

- Keep the action menu in the last column.
- Do not expand it into text buttons.
- Preserve existing row action behavior.

## Monitoring Transactions Column Design

The monitoring transactions table should not mirror the main risk register
table. A monitoring row is not just another risk profile row; it represents a
semester monitoring transaction with source values, observed values, status, and
follow-up.

Current monitoring table order:

`Kode | Versi | Judul Risiko | Kategori | Nilai Sebelum | Nilai Hasil Pemantauan | Tingkat Risiko | Status | Penanganan | Dibuat | Aksi`

Recommended column order:

`Kode | Risiko | Periode | Perubahan Skor | Status Pemantauan | Efektivitas | Update Terakhir | Aksi`

This keeps the user's scan path focused on the transaction lifecycle rather than
static risk metadata.

## Monitoring Transactions Column Rules

### `Kode`

- Keep the source risk code as the first column.
- Use the same monospace styling as the main register.
- If the source risk is missing, render `-`.

### `Risiko`

- Use the source risk title as the primary link text.
- Fall back to the monitoring draft title when source risk title is unavailable.
- Keep the link target pointed to the monitoring transaction detail, not the
  source risk detail.
- Secondary metadata may live under the title in muted text, in this order:
  - source version,
  - category,
  - monitoring mode when useful.

### `Periode`

- Show `assessmentCycle`, such as `2026-H1`.
- This column replaces standalone `Versi` as the main temporal context.
- If the period is missing, render `-`.

### `Perubahan Skor`

- Combine `Nilai Sebelum` and `Nilai Hasil Pemantauan` into one column.
- Preferred display is `before -> after`, using localized number formatting.
- If `trend` is available, add a compact visual or text indicator in the same
  cell.
- If the observed value is still missing for a draft, show the source value and a
  draft placeholder rather than implying a completed comparison.
- The resulting level may appear as a small badge in the same cell when useful,
  but it should not be a standalone primary column.

### `Status Pemantauan`

- Show the monitoring transaction status, not the source risk status.
- Use user-facing labels:
  - `Draft`
  - `Final`
  - `Void`
- Draft rows should be visually easy to spot because they represent unfinished
  work.

### `Efektivitas`

- Replace `Penanganan` with a monitoring-specific effectiveness or progress
  summary.
- Prefer `effectivenessConclusion`.
- If effectiveness is empty, fall back to `mitigationProgressSummary`.
- If both are empty, render `-`.
- Keep the content compact; long explanations belong in the detail page.

### `Update Terakhir`

- Show `updatedAt` when available.
- Fall back to `startedAt`.
- Do not keep `Dibuat` as a standalone column label because it is less useful
  than the last meaningful update for daily work.

### `Aksi`

- Keep the dropdown action menu in the last column.
- Preserve existing action behavior.
- Label intent remains:
  - `Lanjutkan Pemantauan` for draft transactions.
  - `Lihat Hasil Pemantauan` for non-draft transactions.

## Secondary Metadata Rules

The table should avoid widening the visual footprint just to preserve metadata
that is less important for scanning.

Allowed secondary metadata inside `Risiko` for the main register:

- `Versi` as a small badge when present.
- `Kategori` as muted secondary text when useful.
- `Unit` or owner label when the row payload already exposes it cleanly.

Allowed secondary metadata inside `Risiko` for monitoring transactions:

- source version,
- category,
- monitoring mode.

Not recommended as standalone columns in either operational table:

- `Versi`
- `Kategori`
- `Dibuat`

Those values can still appear in the row, but they should no longer consume
prime column slots in the main register or monitoring transactions table.

## Layout Behavior

- Keep horizontal scrolling available.
- Keep header labels short and work-focused.
- Preserve row density.
- Keep the table usable on smaller screens without reintroducing a wide,
  metadata-heavy layout.
- If a value does not fit, prioritize truncation in the title cell rather than
  stretching the table.

## Data Flow

This design does not require new data-fetching behavior.

The existing register payload already provides the values needed for:

- risk code,
- title,
- version number,
- category,
- score,
- level,
- status,
- treatment option,
- created timestamp,
- and any existing draft/ongoing state.

The existing monitoring payload already provides the values needed for:

- source risk code,
- source or draft title,
- source version number,
- category,
- assessment cycle,
- source score,
- observed score,
- observed level,
- transaction status,
- effectiveness conclusion,
- mitigation progress summary,
- started timestamp,
- and updated timestamp when available.

The UI layer should simply remap those values into more operational column
structures.

## Error Handling

No new error states are introduced.

If a field is missing:

- text fields render `-`,
- badge fields render a neutral fallback,
- timestamps render `-`,
- and the action menu remains available unless the existing permission logic
  disables a specific action.

## Testing

Verify the following after implementation:

- The main register table renders with the new column order.
- `Risiko` remains the primary clickable text column.
- `Skor/Level` is visible without requiring horizontal scanning past the
  metadata columns.
- `Dibuat` is no longer a standalone column in the main register table.
- `Versi` remains available only as secondary metadata, not as a primary
  column.
- The monitoring transactions table renders with the new column order.
- Monitoring rows show `Periode` as a primary column.
- Monitoring rows combine source and observed score in `Perubahan Skor`.
- Monitoring rows no longer expose standalone `Versi`, `Kategori`,
  `Tingkat Risiko`, `Penanganan`, or `Dibuat` columns.
- Empty or partial records still render safely with fallbacks.
