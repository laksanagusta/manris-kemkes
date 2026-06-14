# Working Paper Monitoring Results Table Design

## Goal

Replace the current risk-profile-oriented table in the "Risiko dalam Kertas Kerja"
section with an evaluation-oriented view that shows the monitoring result for each
risk in the working paper.

The table must help reviewers evaluate implementation and follow-up without opening
each monitoring transaction.

## Scope

- Show monitoring for the working paper's assessment period only.
- Include both draft and finalized monitoring transactions.
- Keep every linked risk visible, including risks that have no monitoring transaction.
- Reduce the displayed risk profile to identity and baseline score.
- Do not show void monitoring transactions as the active result.
- Do not change the working paper export format in this work.

## Table Columns

The columns, in display order, are:

1. **Kode**: linked risk code and version badge when relevant.
2. **Risiko**: risk title.
3. **Skor Awal -> Aktual**: baseline score followed by the observed monitoring score
   and its observed risk-level badge.
4. **Tren**: increased, stable, or decreased based on baseline versus observed score.
5. **Progres Mitigasi**: completion percentage with the monitoring progress summary.
6. **Efektivitas**: monitoring effectiveness conclusion.
7. **Kondisi/Hasil Monitoring**: observed condition and event summary, preferring a
   concise combined presentation.
8. **Hambatan**: mitigation obstacles.
9. **Tindak Lanjut**: mitigation follow-up, falling back to the general follow-up note.
10. **Status**: `Draft`, `Final`, or `Belum Dimonitor`.
11. **Aksi**: open or continue the matching monitoring transaction.

The table should use a wide minimum width and horizontal scrolling rather than
compressing narrative columns until they become unreadable.

## Data Rules

The backend working paper detail response should attach the matching monitoring
transaction to each linked risk by:

- matching the risk version group or source risk lineage;
- matching the working paper assessment period;
- accepting `draft` or `finalized` status;
- excluding `void`;
- preferring `finalized` if inconsistent data contains more than one eligible
  transaction, otherwise using the most recently updated eligible draft.

The response should expose the monitoring transaction ID, status, baseline and
observed scores, observed level, trend, progress fields, effectiveness, condition,
event summary, obstacles, follow-up fields, and relevant timestamps. The frontend
should consume these values directly instead of deriving narrative evaluation from
the latest periodic risk version.

When no matching monitoring exists, the linked risk remains in the table with:

- baseline score from the working paper risk snapshot;
- empty monitoring evaluation fields displayed as `-`;
- status `Belum Dimonitor`;
- no monitoring action link unless the current workflow permits starting one.

## Presentation

Narrative cells are clamped to two lines to preserve row scanning. The full value
must remain accessible through a tooltip or a small detail dialog. Native browser
title text is acceptable only if the project has no suitable existing tooltip
pattern.

Status and level use existing linear status and risk-level badge styles. Trend uses
clear text or an icon plus accessible text:

- observed score greater than baseline: `Meningkat`;
- observed score equal to baseline: `Tetap`;
- observed score lower than baseline: `Menurun`.

Draft data must be visibly marked so users do not mistake it for an approved result.

## Interaction

- A draft monitoring row uses the action label `Lanjutkan monitoring`.
- A finalized monitoring row uses `Lihat monitoring`.
- A row without monitoring has no detail destination in this scope.
- Existing working paper actions, approval summary, signing flow, and export action
  remain unchanged.

## Error And Empty States

- A working paper with no linked risks keeps the existing empty-risk message.
- A linked risk with incomplete monitoring fields still renders using `-` fallbacks.
- Failure to load monitoring data as part of the working paper detail request follows
  the existing page-level loading error behavior; the UI must not silently present
  all risks as unmonitored after a partial backend failure.

## Testing

Backend tests should cover:

- matching monitoring by risk lineage and working paper period;
- returning draft and finalized monitoring;
- excluding void monitoring;
- finalized preference and latest-draft fallback;
- linked risks without monitoring.

Frontend tests should cover:

- the 11-column table contract;
- baseline-to-observed score rendering and trend;
- draft, finalized, and unmonitored states;
- narrative fallback and clamping behavior;
- correct monitoring action destination and label.

## Out Of Scope

- Displaying monitoring from another period.
- Displaying full monitoring history as multiple rows.
- Editing monitoring fields inside the working paper page.
- Redesigning the monitoring transaction page.
- Changing spreadsheet export sheets or columns.
