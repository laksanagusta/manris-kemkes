# Back-Quarter Monitoring Prevention Design

**Date:** 2026-06-16
**Status:** Approved

## Overview

Add a guard in the quarterly monitoring creation flow that prevents creating a
monitoring transaction for an earlier quarter when a monitoring for a later
quarter already exists for the same logical risk. This prevents chronological
inconsistency in the monitoring cycle.

## Problem

When a working paper (kertas kerja) for `2026-H2` is created on July 11 (during
Q3), the working paper roster auto-generates monitoring drafts only for Q4
(because `SemesterToTargetQuarter("2026-H2")` maps to Q4). After Q4 monitoring
drafts exist, the user can still go to the risk list and manually create a
monitoring for Q3 — which is chronologically earlier.

The semester reassessment flow (`CreateRiskReassessmentUseCase`) already has a
`validateNoNewerCycle()` guard that prevents creating a reassessment for an older
semester cycle (e.g., H1 blocked when H2 exists). The quarterly monitoring flow
(`StartMonitoringUseCase`) lacks an equivalent guard.

## Goals

1. Prevent creation of quarterly monitoring for an earlier quarter when a later
   quarter already has a monitoring transaction (draft or finalized) for the same
   `version_group_id`.
2. Return a clear error message explaining which later quarter is blocking the
   operation.
3. Follow the same pattern as `validateNoNewerCycle()` in the semester
   reassessment usecase.

## Non-Goals

1. Changing how working papers generate monitoring drafts (still generates Q4 only
   for H2).
2. Preventing creation of monitoring drafts for future quarters (Q4 before Q3 is
   allowed; Q3 after Q4 is not).
3. Adding database-level constraints (the existing `uq_risk_monitorings_group_cycle_active`
   unique constraint already prevents duplicates per cycle).
4. Changing the batch monitoring (spreadsheet upload) flow — scope limited to
   individual monitoring creation API.

## Design

### New Guard Function: `validateNoNewerQuarter`

**Location:** `backend/internal/usecase/risk/monitoring_transaction.go`

```go
func (uc *useCase) validateNoNewerQuarter(
    ctx context.Context,
    versionGroupID string,
    requestedCycle string,
) error {
    list, err := uc.monitoringRepo.ListByVersionGroup(ctx, versionGroupID)
    if err != nil {
        return err
    }

    for _, m := range list {
        if m.Status != entity.MonitoringStatusDraft &&
           m.Status != entity.MonitoringStatusFinalized {
            continue
        }

        cmp, err := CompareCycles(m.AssessmentCycle, requestedCycle)
        if err != nil {
            continue
        }

        if cmp > 0 {
            return domain.NewBusinessError(
                "MONITORING_BACK_QUARTER",
                fmt.Sprintf(
                    "Tidak dapat membuat pemantauan untuk %s karena pemantauan "+
                    "untuk periode yang lebih baru (%s) sudah ada.",
                    requestedCycle, m.AssessmentCycle,
                ),
            )
        }
    }

    return nil
}
```

**Dependencies:**
- `uc.monitoringRepo.ListByVersionGroup(ctx, versionGroupID)` — new repository
  method that returns all monitoring transactions for a given `version_group_id`.
- `CompareCycles(a, b string)` — existing function in `cycle.go` that compares
  two cycle strings (supports cross-format comparison: Q1 < Q2 < Q3 < Q4).

### Repository Addition

**Location:** `backend/internal/domain/repository/risk_monitoring.go`

New method on `RiskMonitoringRepository` interface:

```go
ListByVersionGroup(ctx context.Context, versionGroupID string) ([]entity.RiskMonitoring, error)
```

**Implementation:** `backend/internal/repository/postgres/risk_monitoring.go`

```sql
SELECT * FROM risk_monitorings
WHERE version_group_id = $1
  AND status IN ('draft', 'finalized')
ORDER BY assessment_cycle
```

### Guard Placement in StartMonitoringUseCase

**Location:** `backend/internal/usecase/risk/monitoring_transaction.go`, method `Execute()`

Insert the guard call after cycle format validation and `CanBeReassessed()` check,
before the duplicate draft/finalized checks:

```text
1. Validate cycle format (YYYY-QN)           ← existing
2. Fetch source risk                          ← existing
3. CanBeReassessed()                          ← existing
4. validateNoNewerQuarter(versionGroupID, cycle)  ← NEW
5. Check for existing finalized monitoring    ← existing
6. Check for existing draft monitoring        ← existing
7. Create new monitoring record               ← existing
```

### Error Response

**HTTP status:** `422 Unprocessable Entity`

**Response body:**
```json
{
    "error": {
        "code": "MONITORING_BACK_QUARTER",
        "message": "Tidak dapat membuat pemantauan untuk 2026-Q3 karena pemantauan untuk periode yang lebih baru (2026-Q4) sudah ada."
    }
}
```

### Cycle Comparison Logic

Uses the existing `CompareCycles()` function. Cycle indices:

| Quarter | Index (2026) |
|---------|-------------|
| Q1      | 8104        |
| Q2      | 8105        |
| Q3      | 8106        |
| Q4      | 8107        |

`CompareCycles("2026-Q4", "2026-Q3")` → `1` (Q4 > Q3) → guard blocks.

## Affected Files

| File | Change |
|------|--------|
| `backend/internal/domain/repository/risk_monitoring.go` | Add `ListByVersionGroup` to interface |
| `backend/internal/repository/postgres/risk_monitoring.go` | Implement `ListByVersionGroup` |
| `backend/internal/usecase/risk/monitoring_transaction.go` | Add `validateNoNewerQuarter()` + call it in `StartMonitoring.Execute()` |

## Test Plan

### Unit Tests

**File:** `backend/internal/usecase/risk/monitoring_transaction_test.go`

| Test Case | Input | Expected |
|-----------|-------|----------|
| No existing monitorings | Q3, no monitorings exist | No error |
| Earlier quarter exists | Q4 requested, Q1 already finalized | No error (Q1 < Q4) |
| Same quarter draft exists | Q3 requested, Q3 draft already exists | Existing duplicate-draft behavior (no error from guard) |
| Later quarter draft exists | Q3 requested, Q4 draft exists | Error: `MONITORING_BACK_QUARTER` |
| Later quarter finalized exists | Q3 requested, Q4 finalized exists | Error: `MONITORING_BACK_QUARTER` |
| Cross-year comparison | Q1 requested, Q4 of previous year finalized | No error (Q4-2025 < Q1-2026) |
| Voided monitorings ignored | Q3 requested, Q5 voided | No error (voided entries skipped) |

### Integration Test

Verify the full API endpoint `POST /api/risks/:id/monitorings` returns 422 when
a back-quarter scenario is attempted.

## Rollback / Backward Compatibility

- No database migration needed (read-only query addition).
- Existing monitorings are not affected.
- Users who already have out-of-order monitorings will not be blocked from
  reading or finalizing them — only new creation is guarded.
