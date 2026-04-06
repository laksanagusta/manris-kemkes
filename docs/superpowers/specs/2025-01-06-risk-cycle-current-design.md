# Risk Cycle Current Flag Design

**Date:** 2025-01-06  
**Status:** Draft  
**Author:** AI Assistant  

## Overview

Implementasi flag `is_cycle_current` untuk mendukung reassessment berkali-kali dalam satu semester dengan tetap mempertahankan history per semester untuk kebutuhan reporting.

## Problem Statement

**Flow Saat Ini:**
- Reassessment hanya bisa dilakukan sekali per semester (sakelek)
- Hanya satu versi risk yang bisa aktif dalam satu waktu menggunakan flag `is_current`

**Flow Yang Diinginkan:**
- Reassessment bisa dilakukan kapan saja dalam semester yang sama
- Setiap reassessment membuat versi baru (V1, V2, V3...)
- Versi terakhir dalam semester adalah yang berlaku untuk report semester tersebut
- Example: H1 -> V1 -> V2 -> V3 (V3 aktif di H1), H2 -> V4 -> V5 (V5 aktif di H2)
- Report harus bisa menampilkan H1 -> V3 dan H2 -> V5 secara terpisah

## Constraints

1. Semester yang sudah lewat terkunci (locked) - tidak bisa di-edit lagi
2. Hanya satu versi per semester yang boleh muncul di report
3. Query untuk report harus cepat dan efisien
4. Backward compatibility dengan data yang sudah ada

## Solution Design

### Database Schema Changes

**Migration File:** `0000XX_add_is_cycle_current.up.sql`

```sql
-- Add is_cycle_current column
ALTER TABLE risks ADD COLUMN IF NOT EXISTS is_cycle_current BOOLEAN NOT NULL DEFAULT FALSE;

-- Unique index: Only ONE is_cycle_current per (version_group_id, assessment_cycle)
CREATE UNIQUE INDEX IF NOT EXISTS idx_risks_cycle_current_unique
  ON risks(version_group_id, assessment_cycle)
  WHERE is_cycle_current = TRUE;

-- Create helper function to find latest approved risk in a cycle
CREATE OR REPLACE FUNCTION get_cycle_current_risk(p_version_group_id UUID, p_assessment_cycle TEXT)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM risks
    WHERE version_group_id = p_version_group_id
      AND assessment_cycle = p_assessment_cycle
      AND status = 'approved'
    ORDER BY review_approved_at DESC NULLS LAST, created_at DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;
```

**Down Migration:** `0000XX_add_is_cycle_current.down.sql`

```sql
DROP INDEX IF EXISTS idx_risks_cycle_current_unique;
DROP FUNCTION IF EXISTS get_cycle_current_risk(UUID, TEXT);
ALTER TABLE risks DROP COLUMN IF EXISTS is_cycle_current;
```

### Data Model Updates

**Entity (`internal/domain/entity/risk.go`):**

```go
type Risk struct {
    ID             uuid.UUID  `json:"id"`
    // ... existing fields ...
    
    // Versioning fields
    VersionGroupID uuid.UUID  `json:"versionGroupId"`
    PreviousRiskID *uuid.UUID `json:"previousRiskId,omitempty"`
    IsCurrent      bool       `json:"isCurrent"`       // Global current (latest across all cycles)
    IsCycleCurrent bool       `json:"isCycleCurrent"`  // Current within assessment_cycle
    
    // Cycle tracking
    AssessmentCycle string `json:"assessmentCycle,omitempty"`
    // ... other fields ...
}
```

### Business Logic

**Invariants:**
1. `is_cycle_current = TRUE` hanya boleh ada **satu** per kombinasi `(version_group_id, assessment_cycle)`
2. `is_current = TRUE` dan `is_cycle_current = TRUE` bisa sama-sama TRUE (contoh: V5 di H2 saat ini)
3. Ketika semester baru dimulai dan cycle ditutup:
   - Versi terakhir di cycle sebelumnya di-set `is_cycle_current = TRUE`, `is_current = FALSE`
   - `archived_at` diisi timestamp, `archived_reason = 'cycle_closed'`

**State Transitions:**

```
[Initial Risk Creation - H1]
Risk V1: version_group_id = X, assessment_cycle = "2024-H1"
         is_current = TRUE, is_cycle_current = TRUE, status = "approved"

[First Reassessment - H1]
Risk V2: version_group_id = X, assessment_cycle = "2024-H1"
         previous_risk_id = V1
         is_current = TRUE, is_cycle_current = TRUE, status = "approved"
Risk V1: is_current = FALSE, is_cycle_current = FALSE, archived_at = now

[Second Reassessment - H1]
Risk V3: version_group_id = X, assessment_cycle = "2024-H1"
         previous_risk_id = V2
         is_current = TRUE, is_cycle_current = TRUE, status = "approved"
Risk V2: is_current = FALSE, is_cycle_current = FALSE, archived_at = now
Risk V1: (unchanged)

[Start H2 - Cycle Closed]
Risk V3: is_current = FALSE, is_cycle_current = TRUE, archived_reason = "cycle_closed"

[Create new version - H2]
Risk V4: version_group_id = X, assessment_cycle = "2024-H2"
         is_current = TRUE, is_cycle_current = TRUE, status = "approved"

[Reassessment in H2]
Risk V5: version_group_id = X, assessment_cycle = "2024-H2"
         previous_risk_id = V4
         is_current = TRUE, is_cycle_current = TRUE, status = "approved"
Risk V4: is_current = FALSE, is_cycle_current = FALSE, archived_at = now

[Report Query - H1]
SELECT * FROM risks WHERE assessment_cycle = '2024-H1' AND is_cycle_current = TRUE
-> Returns V3

[Report Query - H2]
SELECT * FROM risks WHERE assessment_cycle = '2024-H2' AND is_cycle_current = TRUE
-> Returns V5
```

### Repository Changes

**File:** `internal/repository/postgres/risk.go`

**New Methods:**

```go
// GetCycleCurrentRisks retrieves risks that are current for a specific cycle
func (r *RiskRepository) GetCycleCurrentRisks(ctx context.Context, cycle string) ([]*entity.Risk, error) {
    query := `
        SELECT id, code, title, description, category, likelihood, impact, risk_score,
               risk_level, mitigation, status, created_by, created_at, updated_at,
               version_group_id, previous_risk_id, is_current, is_cycle_current,
               assessment_cycle, review_type, change_reason, review_summary,
               review_started_at, review_submitted_at, review_approved_at,
               archived_at, archived_reason
        FROM risks
        WHERE assessment_cycle = $1 AND is_cycle_current = TRUE
        ORDER BY created_at DESC
    `
    // ... implementation
}

// SetCycleCurrent marks a risk as the current for its cycle
func (r *RiskRepository) SetCycleCurrent(ctx context.Context, riskID uuid.UUID) error {
    // Get the risk first
    risk, err := r.GetByID(ctx, riskID)
    if err != nil {
        return err
    }
    
    // Start transaction
    tx, err := r.db.Begin(ctx)
    if err != nil {
        return err
    }
    defer tx.Rollback(ctx)
    
    // Unset previous cycle current (if any)
    _, err = tx.Exec(ctx, `
        UPDATE risks
        SET is_cycle_current = FALSE, archived_at = now(), archived_reason = 'superseded'
        WHERE version_group_id = $1 
          AND assessment_cycle = $2 
          AND is_cycle_current = TRUE
    `, risk.VersionGroupID, risk.AssessmentCycle)
    if err != nil {
        return err
    }
    
    // Set new cycle current
    _, err = tx.Exec(ctx, `
        UPDATE risks SET is_cycle_current = TRUE WHERE id = $1
    `, riskID)
    if err != nil {
        return err
    }
    
    return tx.Commit(ctx)
}

// CloseCycle archives all risks in a cycle and marks the latest as cycle_current
// This is called when an Administrator manually closes a semester/cycle
func (r *RiskRepository) CloseCycle(ctx context.Context, cycle string) error {
    tx, err := r.db.Begin(ctx)
    if err != nil {
        return err
    }
    defer tx.Rollback(ctx)
    
    // Find all version_group_ids that have risks in this cycle
    rows, err := tx.Query(ctx, `
        SELECT DISTINCT version_group_id FROM risks
        WHERE assessment_cycle = $1 AND status = 'approved'
    `, cycle)
    if err != nil {
        return err
    }
    defer rows.Close()
    
    for rows.Next() {
        var groupID uuid.UUID
        if err := rows.Scan(&groupID); err != nil {
            return err
        }
        
        // Find the latest approved risk for this group in this cycle
        var latestRiskID uuid.UUID
        err := tx.QueryRow(ctx, `
            SELECT id FROM risks
            WHERE version_group_id = $1 AND assessment_cycle = $2 AND status = 'approved'
            ORDER BY review_approved_at DESC NULLS LAST, created_at DESC
            LIMIT 1
        `, groupID, cycle).Scan(&latestRiskID)
        if err != nil {
            return err
        }
        
        // Mark it as cycle_current (keep is_cycle_current = TRUE if already set)
        // No change needed since reassessment already sets this
        
        // Set is_current = FALSE and archive for all risks in this cycle
        _, err = tx.Exec(ctx, `
            UPDATE risks
            SET is_current = FALSE, archived_at = COALESCE(archived_at, now()), 
                archived_reason = 'cycle_closed'
            WHERE version_group_id = $1 AND assessment_cycle = $2
        `, groupID, cycle)
        if err != nil {
            return err
        }
    }
    
    return tx.Commit(ctx)
}
```

### UseCase Changes

**File:** `internal/usecase/risk/usecase.go`

**Modified ApproveReassessment method:**

```go
func (u *RiskUseCase) ApproveReassessment(ctx context.Context, riskID uuid.UUID) error {
    // ... existing logic ...
    
    // Start transaction
    tx, err := u.db.Begin(ctx)
    if err != nil {
        return err
    }
    defer tx.Rollback(ctx)
    
    // Get the reassessment risk
    risk, err := u.riskRepo.GetByID(ctx, riskID)
    if err != nil {
        return err
    }
    
    // Unset previous cycle current (in same cycle)
    err = u.riskRepo.UnsetPreviousCycleCurrent(ctx, risk.VersionGroupID, risk.AssessmentCycle)
    if err != nil {
        return err
    }
    
    // Set both is_current and is_cycle_current for new version
    err = u.riskRepo.SetAsCurrent(ctx, riskID) // is_current = TRUE
    if err != nil {
        return err
    }
    
    err = u.riskRepo.SetAsCycleCurrent(ctx, riskID) // is_cycle_current = TRUE
    if err != nil {
        return err
    }
    
    // Update status to approved
    err = u.riskRepo.UpdateStatus(ctx, riskID, "approved")
    if err != nil {
        return err
    }
    
    return tx.Commit(ctx)
}
```

### API Endpoint Changes

**No new endpoints required.** Existing endpoints will return `isCycleCurrent` in the response.

**Modified Response Structure:**

```json
{
  "id": "uuid",
  "code": "R-001",
  "title": "Risk Title",
  "assessmentCycle": "2024-H1",
  "versionGroupId": "uuid",
  "previousRiskId": "uuid",
  "isCurrent": false,
  "isCycleCurrent": true,
  "status": "approved",
  "archivedAt": "2024-06-30T23:59:59Z",
  "archivedReason": "cycle_closed"
}
```

### Dashboard/Report Changes

**File:** `internal/handler/http/dashboard_handler.go`

**Modified Dashboard Queries:**

```go
// GetRiskHeatmapByCycle - new handler for cycle-specific reports
func (h *DashboardHandler) GetRiskHeatmapByCycle(c *fiber.Ctx) error {
    cycle := c.Query("cycle") // e.g., "2024-H1"
    
    risks, err := h.riskUseCase.GetCycleCurrentRisks(c.Context(), cycle)
    if err != nil {
        return err
    }
    
    // Build heatmap from risks
    // ... implementation
}
```

### Migration Strategy

**Step 1: Create Migration**
```bash
cd backend
make migrate-new name=add_is_cycle_current
```

**Step 2: Apply Migration**
```bash
make migrate-up
```

**Step 3: Data Migration (Manual SQL)**
```sql
-- Set is_cycle_current for existing risks
-- For each version_group_id, find the latest approved risk in each cycle
-- and set is_cycle_current = TRUE

UPDATE risks r
SET is_cycle_current = TRUE
WHERE id IN (
  SELECT DISTINCT ON (version_group_id, assessment_cycle)
    id
  FROM risks
  WHERE assessment_cycle IS NOT NULL
    AND status = 'approved'
  ORDER BY version_group_id, assessment_cycle, review_approved_at DESC NULLS LAST
);
```

### Testing Strategy

**Unit Tests:**
1. Test `SetCycleCurrent` unsets previous cycle current correctly
2. Test unique constraint violation when setting multiple cycle currents
3. Test `GetCycleCurrentRisks` returns correct risks for each cycle
4. Test cycle closing logic

**Integration Tests:**
1. Create risk -> reassess -> reassess in same cycle -> verify only latest has `is_cycle_current`
2. Create risk in H1 -> close H1 -> create risk in H2 -> verify both have correct flags
3. Report queries return correct risks per cycle

**Manual Testing:**
1. Run migration on dev database
2. Verify existing data migrated correctly
3. Test reassessment flow end-to-end
4. Test report generation for different cycles

## Implementation Assumptions

### Cycle Closing Mechanism
**Asumsi:** Cycle ditutup secara manual oleh Administrator melalui API endpoint khusus.

**Rationale:**
- Memberikan kontrol penuh kepada Administrator untuk menentukan kapan semester resmi ditutup
- Menghindari race condition jika ada reassessment yang masih dalam progress saat tanggal otomatis tiba
- Memungkinkan fleksibilitas jika ada pengecualian atau perpanjangan deadline

**API Endpoint (Future Implementation):**
```
POST /api/v1/cycles/:cycle/close
``

### Cycle Start Determination
**Asumsi:** Cycle baru dimulai ketika Risk pertama kali dibuat dengan `assessment_cycle` baru.

**Rationale:**
- Tidak perlu setup manual untuk setiap semester baru
- Sistem akan otomatis mengenali cycle baru berdasarkan input user
- Administrator dapat melompat ke cycle baru kapan saja (misal dari H1 2024 langsung ke H1 2025)

## Success Criteria

- [ ] Database migration applied successfully
- [ ] Entity updated with `IsCycleCurrent` field
- [ ] Repository methods implemented and tested
- [ ] UseCase logic updated for reassessment approval
- [ ] API responses include `isCycleCurrent`
- [ ] Dashboard/report queries work with `is_cycle_current`
- [ ] Existing data migrated correctly
- [ ] All tests passing