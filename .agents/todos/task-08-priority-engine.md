# Task 8 — KMK Priority Engine

## Status: IN PROGRESS

**Goal:** Implement priority sorting based on KMK rules — no new tables, hardcode static data.

## Rules (from kmk.md)

Priority sort: higher `nilai` first, tie-breaker: higher `impactLevel`, tie-breaker: lower `categoryOrder`.

Category order (hardcoded, no table):
1. Kebijakan
2. Operasional
3. Kepatuhan
4. Reputasi
5. Legal
6. Fraud/Korupsi

## Implementation

### Backend (Go)

1. **Domain service** `risk_priority.go`:
   - `CategoryOrder()` → hardcoded map (no DB)
   - `CalculatePrioritySortValue(nilai float64, impactLevel int, categoryOrder int) float64`
   - Formula: `(nilai * 10000) + ((5 - impactLevel) * 100) + (categoryOrder - 1)`
   
2. **Update list queries** in `risk.go` (repository):
   - Add computed `priority_sort_value` to SELECT (not stored, computed on the fly)
   - Default ORDER BY: `priority_sort_value DESC, nilai DESC, created_at DESC`
   
3. **LeaderJudgementRank** — skip (optional enhancement)

### Frontend

4. **Update sort behavior** in register list — sort by priority (highest first)
5. **Show priority rank** in assessment view

## Notes

- No new tables needed
- Category order hardcoded in Go (static data)
- `priority_sort_value` computed in SQL, not stored
- No migration needed for existing queries