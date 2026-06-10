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

Use operational-first, flat table layouts. Each row should visually stay one
line high in normal desktop use. Cells may contain short inline badges, but they
should not stack metadata under the title.

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

`Kode | Risiko | Kategori | Skor/Level | Status Risiko | Status Pemantauan | Terakhir Dipantau | Update Terakhir | Aksi`

## Main Risk Register Column Rules

### `Kode`

- Keep the risk code as the first column.
- Use monospace styling as today.
- Preserve existing width behavior.

### `Risiko`

- Replace the current separate `Judul Risiko` column with a broader primary
  text column.
- The cell contains only one visible line.
- The title remains the main content and should truncate when long.
- The title remains the click target to open risk detail.
- A short `vN` badge may appear inline after the title when version information
  is useful, but it must not create a second line.
- Do not place category, unit, owner, or other metadata under the title.

### `Kategori`

- Keep category as a standalone compact column for flat-row scanning.
- Use the existing human-readable category label.
- If the category is missing, render `-`.

### `Skor/Level`

- Show the numeric score and risk level together as one scan target.
- The cell should stay one line: score plus compact level badge.
- This column should stay near the front because it is the main priority signal
  for daily triage.

### `Status Risiko`

- This column replaces the current status column as the operational status
  indicator for the risk lifecycle.
- It should show the user-facing risk workflow state, not just the raw storage
  status.
- For draft or active rows, display the most useful current work state:
  - `Draft`
  - `Dalam Review`
  - `Disetujui`
  - `Diarsipkan`

### `Status Pemantauan`

- Show the lifecycle state of the active or selected monitoring cycle.
- Use human-readable values such as:
  - `Belum Dimulai`
  - `Draf`
  - `Selesai`
  - `Dibatalkan`
  - `-` when monitoring is not applicable

### `Terakhir Dipantau`

- Show the timestamp of the most recent finalized monitoring transaction for
  the risk.
- If there has never been a finalized monitoring transaction, show `-`.

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

`Kode | Risiko | Kategori | Periode | Perubahan Skor | Status Pemantauan | Efektivitas | Update Terakhir | Aksi`

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
- The cell contains only one visible line.
- The title should truncate when long.
- A short source version badge may appear inline after the title when useful.
- Do not place source version, category, or monitoring mode under the title.

### `Kategori`

- Keep category as a standalone compact column for flat-row scanning.
- Use source risk category first, then draft category as fallback.
- If both are missing, render `-`.

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
- The full cell must remain one line.

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

The table should not use stacked secondary metadata inside a cell.

Allowed inline metadata:

- `Versi` as a short `vN` badge on the same line as the risk title.
- one compact status badge beside another status badge when needed.
- one compact level badge beside a score.

Not allowed inside the flat operational tables:

- muted subtext below the title,
- category below the title,
- unit or owner below the title,
- monitoring mode below the title.

Not recommended as standalone columns in either operational table:

- `Versi`
- `Dibuat`
- `Review Berikutnya`

Those values can still appear in the row, but they should no longer consume
prime column slots in the main register or monitoring transactions table.

## Layout Behavior

- Keep horizontal scrolling available.
- Keep header labels short and work-focused.
- Preserve row density.
- Keep normal desktop rows one line high.
- Apply truncation to long text fields instead of wrapping.
- Use tooltips or native `title` attributes for truncated long values when
  practical.
- Keep the table usable on smaller screens without reintroducing a wide,
  metadata-heavy layout.
- If a value does not fit, prioritize truncation in the title and effectiveness
  cells rather than stretching the table.

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
- Normal desktop rows stay one visible line high.
- `Skor/Level` is visible without requiring horizontal scanning past the
  metadata columns.
- `Dibuat` is no longer a standalone column in the main register table.
- `Versi` remains available only as inline metadata, not as a primary column.
- The monitoring transactions table renders with the new column order.
- Monitoring rows show `Periode` as a primary column.
- Monitoring rows combine source and observed score in `Perubahan Skor`.
- Monitoring rows no longer expose standalone `Versi`, `Tingkat Risiko`,
  `Penanganan`, or `Dibuat` columns.
- Empty or partial records still render safely with fallbacks.
