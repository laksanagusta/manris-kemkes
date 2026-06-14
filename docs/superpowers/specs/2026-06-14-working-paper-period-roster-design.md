# Working Paper Period Roster Design

**Date:** 2026-06-14
**Status:** Approved for planning review

## Overview

Working papers are monitoring documents for a specific semester. Their risk list
must therefore represent the risks covered by monitoring in that period, not a
mixture of whichever risk versions happen to be current when the document is
created.

The working paper creation flow will use an explicit **period roster** keyed by
logical risk identity (`version_group_id`). The roster resolves the correct source
risk version and monitoring transaction for the target period before the working
paper is persisted.

## Problem

The current create flow lists only current risk rows and lets users choose one of
two source modes per risk:

- `latest_approved` links the current approved risk version;
- `review_periodic` creates or reuses a reassessment draft and creates a monitoring
  transaction.

This produces inconsistent period reporting. For example:

```text
risiko-01 v1 -> monitoring 2026-Q2 -> risiko-01 v2
risiko-02 v1
risiko-03 v1
```

When a working paper for `2026-H1` is created after the monitoring is finalized,
the current flow can show `risiko-01 v2`, `risiko-02 v1`, and `risiko-03 v1`.
However, the Q2 monitoring for `risiko-01` evaluated `v1`; `v2` is its result.
The document therefore mixes monitoring sources and outcomes.

The per-row source selector also exposes an implementation distinction that users
should not need to decide. The system can determine whether a finalized result,
an existing draft, or a new draft is required.

## Goals

1. Represent monitoring activity for the selected working paper period consistently.
2. Resolve risks by `version_group_id`, not by the current risk row alone.
3. Keep the exact source version that was monitored distinct from any result version.
4. Include every risk that was active at any point during the semester.
5. Reuse existing monitoring transactions and create only missing drafts.
6. Make automatic draft creation visible before the working paper is created.
7. Allow audited exclusions without including excluded risks in the formal document.
8. Prevent signing until all included monitoring transactions are finalized.

## Non-Goals

1. Changing the risk monitoring form or its scoring rules.
2. Creating more than one active monitoring transaction for the same risk group and
   target quarter.
3. Displaying excluded risks in the formal working paper detail or export.
4. Replacing risk versioning with mutable risk records.
5. Rewriting historical completed working papers under the new roster rules.

## Core Decisions

### Document Meaning

A working paper represents **monitoring performed during the selected semester**.
It does not represent only the final risk register state at the end of that semester.

For each included logical risk, the document must retain:

- the source risk version evaluated by the monitoring transaction;
- the monitoring transaction for the target quarter;
- the result risk version, when finalized monitoring produced a profile revision.

### Target Monitoring Quarter

- `YYYY-H1` resolves to `YYYY-Q2`.
- `YYYY-H2` resolves to `YYYY-Q4`.

### Roster Identity

One roster entry represents one logical risk, identified by `version_group_id`.
Risk versions are attributes of the entry, not separate roster items.

### Source Mode Removal

The create page will remove the per-risk `latest_approved` and `review_periodic`
selector. Monitoring state determines behavior automatically.

## Period Roster

### Eligibility

The roster includes every logical risk that was approved and active at any time
during the selected semester, including risks first approved in the middle of the
semester.

An eligible risk must belong to the working paper organization. A logical risk
appears only once even when multiple versions existed during the semester.

Historical archive and activation timestamps must be used to determine period
overlap. The implementation must not approximate eligibility using only
`is_current = true`.

For lifecycle calculations:

- `effective_from` is `review_approved_at`, falling back to `created_at` only for
  legacy approved rows that do not have an approval timestamp;
- `effective_to` is `archived_at`, or open-ended when `archived_at` is null;
- a logical risk is eligible when at least one approved version's effective interval
  overlaps the semester.

### Roster Entry

Each preview entry should expose at least:

```text
version_group_id
code
title
organization_id
source_risk_id
source_version_number
result_risk_id?
result_version_number?
monitoring_id?
monitoring_cycle
monitoring_status
roster_status
exclusion_reason?
```

`roster_status` is one of:

- `finalized_result`: a finalized monitoring transaction already exists;
- `existing_draft`: a draft monitoring transaction already exists;
- `draft_will_be_created`: no eligible transaction exists;
- `excluded`: the user has excluded the risk with a reason.

### Source Version Resolution

Resolution is deterministic:

1. If a non-void monitoring transaction exists for the target quarter, use its
   `source_risk_id` as the source version.
2. If no monitoring exists, select the approved version effective at the start of
   the target quarter: April 1 for Q2 and October 1 for Q4.
3. If the logical risk was first approved later in the semester, use its first
   approved version after the target quarter began.
4. Never replace the resolved source version with a newer current version merely
   because the working paper is created later.

For finalized monitoring with a profile revision, `result_risk_id` is recorded as
the outcome but does not replace `source_risk_id` as the monitored baseline.

### Monitoring Resolution

For each non-excluded roster entry:

1. Prefer the existing finalized transaction for the target quarter.
2. Otherwise reuse the existing draft transaction.
3. Ignore void transactions.
4. If no eligible transaction exists, mark the entry `draft_will_be_created`.
5. Enforce at most one non-void monitoring transaction per
   `version_group_id + assessment_cycle`.

If inconsistent legacy data contains multiple eligible transactions, creation must
fail with a conflict rather than silently choosing one.

## Create Workflow

### Preview

Opening the create page requests a backend-generated roster preview for the selected
organization and semester. The frontend must not reproduce version-resolution logic.

All entries are selected by default.

The table shows:

- risk identity;
- source version;
- target monitoring period;
- monitoring state;
- whether an existing transaction will be reused;
- whether a new draft will be created.

Rows with `draft_will_be_created` display the badge:

`Draft monitoring akan dibuat`

### Exclusion

Users may exclude a roster entry only by entering a non-empty reason.

Excluded entries:

- do not create or reuse a monitoring link for the working paper;
- do not appear in formal working paper detail or export;
- are stored in a dedicated exclusion/audit record;
- remain visible in the create preview as excluded until submission.

The audit record must preserve the working paper, logical risk, period, reason,
actor, and timestamp.

### Confirmation

Before submission, the UI presents a confirmation summary containing:

- total eligible risks;
- total included risks;
- total excluded risks;
- existing finalized monitoring count;
- existing draft count;
- new draft count;
- target quarter.

Example:

`2 dari 5 risiko akan dibuatkan draft monitoring 2026-Q2.`

The confirmation must state that creating the working paper also creates those
monitoring drafts.

### Atomic Creation

Working paper creation, roster persistence, exclusions, and missing monitoring draft
creation must execute atomically in one database transaction.

At creation time the backend re-resolves and validates the preview. It must reject
stale input when monitoring or risk lifecycle state changed after preview.

For each included entry:

- finalized monitoring is linked as-is;
- an existing draft is linked as-is;
- a missing draft is created from the resolved source version and then linked.

The operation must not create reassessment risk versions merely because a working
paper is created. A result risk version is created only through the monitoring
workflow when profile revision is actually finalized.

## Persistence Model

The current `working_paper_risks.risk_id` model is insufficient on its own because
one field cannot express both the monitored source version and a later result
version.

Extend `working_paper_risks` to persist:

```text
working_paper_id
version_group_id
source_risk_id
monitoring_id
result_risk_id?
sort_order
created_at
```

The table keeps its existing primary key and gains a unique constraint on
`working_paper_id + version_group_id`. The legacy `risk_id` column remains readable
during migration and is backfilled from `source_risk_id`; new roster code treats
`source_risk_id` as authoritative.

Add `working_paper_risk_exclusions` with:

```text
id
working_paper_id
version_group_id
assessment_cycle
reason
excluded_by
created_at
```

It has a unique constraint on `working_paper_id + version_group_id`. Exclusions stay
auditable without appearing as document rows.

The old `source_mode` field becomes legacy metadata and is not accepted from the new
create workflow.

## Working Paper Lifecycle

### Draft

A working paper may be created while included monitoring transactions are still
draft. Users can open and continue those drafts from the working paper detail page.

The detail page distinguishes:

- finalized monitoring results;
- monitoring drafts still in progress;
- unexpected missing or void links as integrity errors.

### Signing Gate

Transition from `draft` to `signing` is blocked unless every included roster entry:

- references a non-void monitoring transaction;
- has monitoring status `finalized`;
- still matches the stored source risk and target quarter.

Excluded risks do not participate in this gate.

The API must return a structured validation error listing blocking risks and their
monitoring state.

### Signing And Completed

When signing starts, roster links become immutable. Detail and export continue to
use the stored source, monitoring, and result references. They must not dynamically
resolve to the latest current risk version.

## API Boundaries

### Roster Preview

Add a backend operation shaped around:

```text
organization_id
assessment_cycle
```

It returns roster entries and summary counts. The frontend submits decisions using
`version_group_id` plus optional exclusion reason, not arbitrary risk row IDs or
source modes.

### Create Working Paper

The new request contains:

```text
assessment_cycle
organization_id
roster_decisions[]
signatories[]
```

Each roster decision contains:

```text
version_group_id
included
exclusion_reason?
```

Source versions and monitoring IDs are resolved by the backend and are not trusted
from the client.

### Working Paper Detail

Each included row returns:

- source risk snapshot/reference;
- monitoring transaction;
- optional result risk snapshot/reference;
- roster status;
- available action.

The detail monitoring table uses the monitoring source score as baseline and the
observed monitoring score as the result. A result version badge may be shown
separately when profile revision created a new risk version.

## Error Handling

- Reject an invalid semester format.
- Reject risks from another organization.
- Reject exclusion without a reason.
- Reject an empty included roster.
- Reject duplicate non-void monitoring transactions for one risk group and quarter.
- Reject stale preview decisions with a conflict response and require refresh.
- Roll back the whole create operation if any monitoring draft or roster row fails.
- Block signing with structured per-risk errors while monitoring remains incomplete.

## Migration And Compatibility

1. Existing completed and signing working papers keep their current exact risk links.
2. Existing draft working papers may continue under legacy behavior or be migrated
   explicitly; they must not be silently re-resolved.
3. New working papers use the period-roster contract.
4. Legacy `source_mode` remains readable while historical rows exist.
5. Export and detail readers support both legacy links and roster links during the
   compatibility window.

This design supersedes the create-flow source selection in
`2026-04-11-working-paper-risk-linking-design.md` and the unmonitored-row behavior in
`2026-06-14-working-paper-monitoring-results-table-design.md`.

## Testing

### Backend

Cover:

- H1 to Q2 and H2 to Q4 resolution;
- risks active at semester start and risks first approved mid-semester;
- one roster entry per `version_group_id`;
- existing finalized transaction reuse;
- existing draft transaction reuse;
- missing transaction marked for draft creation;
- void transaction ignored;
- duplicate eligible transaction conflict;
- source version retained when monitoring produces a newer result version;
- exclusion reason validation and audit persistence;
- atomic rollback;
- stale preview conflict;
- signing blocked until all included monitoring is finalized;
- legacy working paper compatibility.

### Frontend

Cover:

- all roster entries selected by default;
- source version and target period display;
- monitoring status badges;
- `Draft monitoring akan dibuat` per-row information;
- exclusion reason requirement;
- confirmation summary counts and target quarter;
- removal of the source mode selector;
- stale preview and create conflict handling;
- signing blockers displayed with risk identity.

## Acceptance Examples

### Finalized Monitoring Created A New Version

```text
risiko-01 v1 -> finalized monitoring 2026-Q2 -> risiko-01 v2
```

The `2026-H1` working paper row stores and displays:

- source: `risiko-01 v1`;
- monitoring: `2026-Q2`, finalized;
- result version: `risiko-01 v2`.

It must not use `v2` as the monitoring baseline.

### No Monitoring Exists

```text
risiko-02 v1
```

Preview displays `Draft monitoring akan dibuat`. Creation atomically creates a
`2026-Q2` draft monitoring sourced from `v1` and links it to the working paper.

### Existing Draft

```text
risiko-03 v1 -> draft monitoring 2026-Q2
```

Preview displays `Draft tersedia`. Creation reuses the existing draft and does not
create another transaction.

### Excluded Risk

The risk remains visible in preview with its exclusion reason. It is stored in the
exclusion audit record but does not appear in working paper detail, export, or the
signing-completeness check.

## Decision Summary

1. Working papers represent monitoring performed during a semester.
2. The system builds an explicit period roster by `version_group_id`.
3. All risks active at any time in the semester are included by default.
4. Mid-semester risks are included.
5. Existing finalized or draft monitoring is reused.
6. Missing monitoring drafts are created automatically and visibly.
7. Per-risk source mode selection is removed.
8. Exclusions require reasons and remain audit-only.
9. Source and result risk versions remain distinct.
10. Signing is blocked until every included monitoring transaction is finalized.
