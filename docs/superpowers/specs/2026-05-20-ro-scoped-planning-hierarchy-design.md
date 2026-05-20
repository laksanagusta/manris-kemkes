# RO-Scoped Planning Hierarchy Design

**Date:** 2026-05-20  
**Status:** Approved in brainstorming, ready for implementation planning

## Summary

Manris currently models KMK planning context in a flat `risk_objectives` record containing `tujuan`, `sasaran`, `IKU`, `program`, and `kegiatan`. That shape is no longer sufficient for the ministry use case.

The target model moves risk linkage from `Sasaran & IKU` to `RO`, with a centrally managed planning hierarchy:

`Tujuan -> Sasaran -> IKU -> Program -> Kegiatan -> RO`

This hierarchy is authored by the ministry center, while satker only consume eligible `RO` entries. `Program` and `Kegiatan` are reusable master data. `RO` is period-bound, centrally governed, frozen per period, and scoped to explicit satker visibility rules.

## Final Decisions

### Domain decisions

- Risk must anchor to `RO`.
- One `Tujuan` can have many `Sasaran`.
- One `Sasaran` can have many `IKU`.
- One `IKU` can have many `Program`.
- One `Program` can have many `Kegiatan`.
- One `Kegiatan` can have many `RO`.

### Ownership and governance

- Planning structure is centrally managed by the ministry, not authored by satker.
- Satker cannot create local `RO`.
- `RO` eligibility must be controllable down to specific satker, not only broad satker categories.
- Scope rules must support:
  - all satker
  - satker category or group
  - explicit satker list

### Time and versioning

- `Program` and `Kegiatan` are reusable master data.
- `RO` is created per period.
- Once a period is active and used by risks, that period's `RO` structure is frozen for historical integrity.
- Structural changes for a new period create new `RO` records instead of mutating historical ones.

## Goals

- Align the planning model with ministry planning reality.
- Make `RO` the operational anchor for risk registration and reporting.
- Preserve traceability from each risk up to `Tujuan`.
- Support ministry-controlled scope so each satker only sees relevant `RO`.
- Keep rollout safe for the existing codebase by using a deliberate compatibility transition.

## Non-Goals

- Allowing satker-authored local `RO`.
- Keeping `risk_objectives` as the long-term source of truth.
- Supporting live structural edits that rewrite historical planning context for past periods.
- Designing a cross-ministry generic planning engine beyond the current KMK-oriented hierarchy.

## Target Domain Model

### Planning hierarchy

- `Tujuan` is the highest planning node.
- `Sasaran` belongs to one `Tujuan`.
- `IKU` belongs to one `Sasaran`.
- `Program` belongs to one `IKU`.
- `Kegiatan` belongs to one `Program`.
- `RO` belongs to one `Kegiatan`.

### Risk linkage

- `Risk` stores `ro_id` as the required planning linkage.
- The full context shown to the user is derived from the linked `RO`:
  - `RO`
  - parent `Kegiatan`
  - parent `Program`
  - parent `IKU`
  - parent `Sasaran`
  - parent `Tujuan`

### Scope model

Each `RO` must declare one scope mode:

- `all_satker`
- `satker_group`
- `explicit_satker_list`

The system evaluates satker eligibility at selection time. Risks already linked to an `RO` remain historically valid even if the scope changes later.

## Data Model Direction

The long-term source of truth should move from the flat `risk_objectives` table to normalized planning tables.

### Proposed source-of-truth tables

- `planning_goals`
- `planning_objectives`
- `planning_ikus`
- `planning_programs`
- `planning_activities`
- `planning_ros`
- `planning_ro_scopes`

### Table responsibilities

- `planning_goals`: stores `Tujuan`
- `planning_objectives`: stores `Sasaran` and parent goal linkage
- `planning_ikus`: stores `IKU` and parent objective linkage
- `planning_programs`: stores reusable `Program` records and parent `IKU` linkage
- `planning_activities`: stores reusable `Kegiatan` records and parent `Program` linkage
- `planning_ros`: stores period-bound `RO` records, parent `Kegiatan` linkage, lifecycle state, and freeze metadata
- `planning_ro_scopes`: stores visibility rules for all-satker, satker-group, or explicit satker assignment

### Risk storage transition

- Current state: `risks.objective_id` points to `risk_objectives`
- Target state: `risks.ro_id` points to `planning_ros`
- During migration, the codebase may temporarily carry both fields, but `ro_id` becomes the intended primary linkage

## Transition Strategy

### Compatibility principle

The system will use the new hierarchy as the source of truth while still keeping existing screens functional during rollout. The old `risk_objectives` model may be adjusted if needed, but it must no longer define the authoritative domain model.

### Recommended compatibility approach

Use `risk_objectives` as a compatibility read model backed by the new hierarchy, not as the final write model.

This means:

- hierarchical planning data is created and updated in the new planning tables
- legacy objective screens can continue to render a flattened perspective derived from the new hierarchy
- create and edit flows from the old module can be reduced, redirected, or retired progressively

### Why this approach

- avoids long-term business logic duplication
- makes the new hierarchy the single source of truth immediately
- allows legacy UI to survive long enough for a safe rollout
- makes final legacy cleanup much simpler

## Application Behavior

### Central planning administration

The ministry center manages the full hierarchy:

- create and update `Tujuan`
- create and update `Sasaran`
- create and update `IKU`
- create and update reusable `Program`
- create and update reusable `Kegiatan`
- create period-bound `RO`
- assign scope for each `RO`

### Satker behavior

Satker do not create planning nodes.

When creating or updating a risk:

- the user selects an eligible `RO`
- the form automatically reveals the full planning chain
- the user experiences the flow as selecting a concrete operational output, not manually matching flat objective text

### Risk form behavior

The existing objective selection flow is replaced over time with `RO` selection:

- `ObjectivePicker` is replaced by `ROPicker`
- the summary panel shows:
  - `Tujuan`
  - `Sasaran`
  - `IKU`
  - `Program`
  - `Kegiatan`
  - `RO`

### Legacy screen behavior

`/management/objectives` should not disappear abruptly.

During transition it should become one of these:

- a compatibility list derived from the new hierarchy
- a read-oriented legacy page with action buttons that route into the new planning editor
- a temporary redirect entry point once the new planning module is complete

The legacy page should not remain the long-term primary planning editor.

## Validation Rules

- Risk creation and update must reject missing `ro_id` once rollout reaches enforcement stage.
- Satker must only be able to view and select `RO` allowed by scope.
- New entries must not select `RO` outside the allowed period context when period constraints are enforced.
- Historical risk links remain valid even when an `RO` is no longer selectable for new entries.
- Frozen historical `RO` records must not be structurally repointed after risks reference them.

## Error Handling Expectations

- If no eligible `RO` exists for a satker and period, the UI must show a clear empty state explaining that no central `RO` is available yet.
- If a formerly selectable `RO` is retired for new periods, historical risks still display normally.
- If scope rules change, only future selections are affected; existing risk links are preserved.
- If users reach legacy pages during migration, the UI should explain the transition and route them safely instead of failing silently.

## Reporting Implications

The new linkage enables roll-up reporting from `RO` upward:

- risk by `RO`
- risk by `Kegiatan`
- risk by `Program`
- risk by `IKU`
- risk by `Sasaran`
- risk by `Tujuan`

This is stronger than the current flat objective model because all strategic aggregation can be derived from one concrete anchor.

## AI and Document Intelligence Implications

Current document intelligence assumes a flatter `Sasaran -> IKU -> risks` shape. That is no longer sufficient.

The new target behavior is:

- AI extraction can still recognize `Tujuan`, `Sasaran`, `IKU`, `Program`, and `Kegiatan`
- final operational linkage must resolve to `RO`
- compatibility output may still render flattened summary data temporarily, but the canonical destination should be the hierarchy model

## Delivery Phases

### Phase 1: Build hierarchy foundation

- add normalized planning tables
- add `RO` scope storage
- expose hierarchical read APIs
- provide compatibility read behavior for old objective screens

### Phase 2: Move risk linkage to `RO`

- add `ro_id` to `risks`
- introduce `ROPicker`
- show full hierarchy summary in risk forms
- keep transitional compatibility where required

### Phase 3: Move management workflows

- introduce the new planning management module
- reduce or redirect write actions from `/management/objectives`
- make the new hierarchy the obvious operational admin path

### Phase 4: Remove legacy dependency

- retire legacy objective-centric write flows
- remove unused compatibility code
- update AI and supporting features to target the new hierarchy directly

## Testing Strategy

The implementation plan must include at least these verification categories:

- migration tests for hierarchical planning schema and `ro_id` linkage
- repository and use case tests for `RO` scope filtering
- compatibility tests for legacy objective list behavior
- frontend tests for `ROPicker` and hierarchy summary rendering
- regression tests for risk creation, risk editing, export paths, and AI prefill flows affected by the migration

## Key Risks and Mitigations

### Risk 1: Broken migration path from `objectiveId` to `roId`

Mitigation:

- introduce `ro_id` explicitly
- keep compatibility reads during the transition
- migrate UI flow incrementally instead of hard cutting all objective references at once

### Risk 2: Legacy screens diverge from the new source of truth

Mitigation:

- derive legacy reads from the new hierarchy
- avoid maintaining parallel domain write logic in both systems

### Risk 3: Scope filtering causes invisible planning gaps for satker

Mitigation:

- make empty states explicit
- test explicit satker assignment and group-based scope thoroughly

## Implementation Preference

Use the normalized planning hierarchy as the source of truth immediately, then keep legacy objective surfaces only as short-lived compatibility layers. Adjusting `risk_objectives` during transition is acceptable, but only in service of the new hierarchy and not as a competing long-term domain model.
