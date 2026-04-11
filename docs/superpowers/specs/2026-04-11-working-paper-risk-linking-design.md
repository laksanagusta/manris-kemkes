# Working Paper Risk Linking Design

**Date:** 2026-04-11  
**Status:** Approved for planning review  
**Author:** AI Assistant

## Overview

Revise working paper risk storage from embedded `risk_snapshots` JSON to a many-to-many relationship that links each working paper to a **specific risk version row** in `risks.id`.

This keeps the model aligned with the existing risk versioning flow, where reassessment creates a new risk row under the same `version_group_id` instead of overwriting the approved version.

## Problem Statement

### Current Working Paper Model
- `working_papers` stores `risk_snapshots JSONB`
- working paper creation resolves `risk_ids` into copied point-in-time risk data
- exports and detail pages read from `risk_snapshots`

### Target Model
- working papers should **not** duplicate risk payload
- working papers should store **many-to-many links** to risk rows
- links must point to **version-specific** `risks.id`
- working paper rendering/export must never dynamically switch to the latest risk version

## Goals

1. Remove risk payload duplication from working papers
2. Preserve document integrity by linking to version-specific risk rows
3. Keep reassessment available per risk
4. Prevent historical documents from silently drifting to newer risk versions
5. Support formal approval/signing with stable linked versions

## Non-Goals

1. No redesign of risk reassessment mechanics
2. No linking to `version_group_id` as the document source
3. No automatic migration of old working papers to newer risk versions after creation

## Core Decision

**Working papers only store many-to-many links to `risks.id` version-specific rows, and the system must never resolve a working paper to the newest/current risk version dynamically.**

This means:
- reassessment remains supported
- a working paper can link to an approved risk version or to a reassessment draft version
- once linked, the document reads from that exact `risk_id`
- new reassessment versions create new risk rows and do not change old working papers automatically

## Data Model

### Table Changes

#### `working_papers`
Remove:
- `risk_snapshots JSONB`

Revisit:
- `document_hash` should no longer be derived from `risk_snapshots`

Keep:
- document metadata
- signatory workflow fields
- `assessment_cycle`

#### New table: `working_paper_risks`

Suggested fields:

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
working_paper_id UUID NOT NULL REFERENCES working_papers(id) ON DELETE CASCADE
risk_id UUID NOT NULL REFERENCES risks(id)
sort_order INT NOT NULL DEFAULT 0
source_mode VARCHAR(30) NOT NULL -- latest_approved | reassessment_draft
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
UNIQUE (working_paper_id, risk_id)
```

### Referential Principle

`working_paper_risks.risk_id` must always point to a concrete row in `risks`.

It must **not** point to:
- `version_group_id`
- a logical risk identity that later resolves to whatever row is current

## UX Design

### Risk Source Mode

On the create working paper page, add a mode selector above the risk selection table.

Options:
- `Review berkala`
- `Gunakan data terakhir`

Default:
- `Review berkala`

Reason:
- the primary user intent for working papers is periodic review

### Helper Copy

For `Review berkala`:
- `Review berkala akan menautkan kertas kerja ke draft reassessment untuk cycle ini.`

For `Gunakan data terakhir`:
- `Gunakan data terakhir akan menautkan kertas kerja ke versi risiko approved terbaru.`

### Row Status Copy

Per selected risk, the UI may surface:
- `Approved terbaru`
- `Draft reassessment aktif`
- `Perlu reassessment baru`

## Lifecycle Rules

### Mode A — Gunakan data terakhir

When the user selects a risk:
1. system resolves the latest approved current `risk_id` at that moment
2. working paper stores a link to that exact `risk_id`
3. later reassessments create new risk rows but do not alter the existing link

### Mode B — Review berkala

When the user selects a risk:
1. system checks whether a reassessment draft already exists for the same cycle
2. if an existing draft is found, working paper links to that draft `risk_id`
3. if no draft exists, system creates a new reassessment draft and links to the new `risk_id`

This preserves the current reassessment architecture while avoiding payload copies.

## Locking Rules

### Selected Decision

**Lock linked risk versions when the working paper enters `signing`.**

### Why not earlier
- locking at `draft` is too restrictive during authoring

### Why not later
- locking only at `completed` lets the document drift during the signing process

### Final Rule Set

#### While working paper is `draft`
- linked reassessment draft risks may still be edited
- linked approved risks remain naturally stable because changes should happen through new versions
- working paper risk links may still be replaced by the author if business rules allow it

#### When working paper transitions to `signing`
- all linked `risk_id`s become locked for this document context
- the system must block direct editing of any linked reassessment draft rows
- any further business change must happen by creating a new risk version row and moving the working paper back to `draft` before relinking

#### When working paper is `completed`
- links remain fixed
- detail and export always read the exact linked `risk_id`s
- no dynamic resolution to `is_current = true` is allowed

## Integrity Rules

1. Export/detail must always read linked `risk_id`s from `working_paper_risks`
2. The system must never re-resolve a working paper using `version_group_id` + `is_current`
3. Approved risk changes should continue to happen through versioning/reassessment rather than in-place overwrite
4. A linked reassessment draft that is already under a signing working paper must not be editable
5. If a signed-in-progress document needs changes, it must be returned to `draft` and linked to a newer risk version

## API/Use Case Implications

### Create Working Paper

Current input can remain centered around `risk_ids`, but semantics change:
- `risk_ids` now represent the exact rows to be linked
- create use case persists rows in `working_paper_risks` instead of building snapshots

Optional future input refinement:

```json
{
  "title": "...",
  "assessment_cycle": "2026-H1",
  "risk_source_mode": "review_periodic",
  "risk_ids": ["..."]
}
```

### Get/List Working Paper

Working paper reads should join:
- `working_papers`
- `working_paper_risks`
- `risks`
- signatories

The frontend should receive a linked risk collection instead of `risk_snapshots`.

## Export Implications

Current export logic reads `workingPaper.risk_snapshots`.

Under the new design:
- export resolves rows from linked risks
- export sheet builders continue to consume a normalized risk view model
- that view model is built at read time from linked risk rows, not from stored JSON snapshots

This keeps export behavior consistent while changing the persistence strategy.

## Migration Strategy

1. Add `working_paper_risks`
2. Backfill existing `risk_snapshots` into relation rows where feasible
3. If exact mapping from snapshot to `risks.id` cannot be guaranteed for historical records, keep legacy read support temporarily
4. Update create/read/export paths to prefer relation-based working papers
5. Remove `risk_snapshots` after backfill and compatibility window are complete

## Trade-offs

### Benefits
- cleaner normalized data model
- no duplicated risk payload in working papers
- naturally aligned with existing risk versioning architecture

### Costs
- detail/export paths become join-based instead of self-contained
- integrity depends on strict version discipline
- linked draft versions require explicit locking rules

## Decision Summary

This design is approved with the following business contract:

1. Working paper stores many-to-many links to exact `risks.id` rows
2. Reassessment remains available and creates new risk versions as before
3. Working paper never resolves itself to the newest/current risk version dynamically
4. Linked risk versions are locked when the working paper enters `signing`
5. Any later change must happen through a new risk version and an explicit relink from `draft`

## Open Questions Resolved

### Does this remove reassessment per risk?
No.

Reassessment still works per risk by creating a new row in `risks`. The working paper simply points to whichever version is intended for that document.

### Why version-specific linking instead of latest-current lookup?
Because latest-current lookup would make historical working papers silently change as new reassessments are approved.

### When should linked versions become immutable?
At `signing`, not at `draft`, and not only at `completed`.
