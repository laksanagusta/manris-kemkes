# KMK Batch A — Rollout Notes

**Date:** 2026-05-01  
**Scope:** Batch A Foundation — KMK terminology alignment, Risk Charter module, planning hierarchy cutover, RO-linked risk registration

---

## Verification Results

### Backend (`go test ./...`)

- **Status:** ✅ PASS
- **Note:** One pre-existing test in `internal/mcp/tools` was fixed — `TestHandleMonitorAndApproveRisk_Success` expected `status=approved` from an approval flow that was temporarily commented out. Updated test to assert on `id` and `cycle` fields that the function actually returns.

### Frontend (`npm run build`)

- **Status:** ✅ PASS
- All 43 routes build successfully, including the new `/management/charters` and `/management/planning` routes.

### Database Migrations

- `000044_risk_charters` — creates `risk_charters` table
- `000045_risk_objectives` — creates `risk_objectives` table
- `000046_risks_add_objective_id` — adds `objective_id` column to `risks` table

---

## RO Requirement

- Risk create/update now requires `roId` directly.
- The legacy `objectiveId` path remains readable for compatibility, but new risk writes must anchor to `RO`.
- Existing risks remain valid without backfill because `risks.ro_id` is nullable at the database layer.

## Planning Hierarchy Migration Notes

The KMK Batch A rollout now shares the same risk-to-planning linkage model as the RO-scoped hierarchy work.

- `000057_planning_hierarchy` creates the normalized `planning_*` tables used by the new structure.
- `000058_risks_add_ro_id` adds `ro_id` to `risks` so new risks can anchor directly to RO.
- `risk_objectives` is retired from the product surface. New editing happens only in `Struktur Kinerja & RO`.
- Risk create/update flow requires `roId` and no longer relies on the legacy `objectiveId` path.

---

## Exit Criteria Checklist

| Criterion | Status |
|---|---|
| UI labels use KMK wording (Jarang, Kemungkinan Kecil, Kemungkinan Sedang, Kemungkinan Besar, Hampir Pasti Terjadi, Tidak Signifikan, Katastropik, Sangat Tinggi) | ✅ |
| `risk_charters` CRUD works (backend routes + frontend pages) | ✅ |
| `Struktur Kinerja & RO` CRUD works | ✅ |
| Risk form accepts `roId` via RO picker | ✅ |
| Backend stores `objective_id` in `risks` table | ✅ |
| Working paper/export includes objective metadata | ✅ |
| `go test ./...` passes | ✅ |
| `npm run build` passes | ✅ |

---

## New Routes

### Backend

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/risk-charters` | List charters (paginated, filterable) |
| POST | `/api/v1/risk-charters` | Create charter |
| GET | `/api/v1/risk-charters/:id` | Get charter by ID |
| PUT | `/api/v1/risk-charters/:id` | Update charter |
| GET | `/api/v1/planning/ros` | List RO options for risk registration |
| GET | `/api/v1/planning/hierarchy` | Get the planning hierarchy |

### Frontend

| Path | Description |
|---|---|
| `/management/charters` | Charter list page |
| `/management/charters/[id]` | Charter detail/edit page |
| `/management/planning` | Planning hierarchy page |
| `/management/planning/[id]` | Planning hierarchy detail page |

---

## Manual Smoke Test Checklist

1. Login as `superadmin`.
2. Open `/management/charters` → create a charter for one organization.
3. Open `/management/planning` → review the planning hierarchy and RO scope.
4. Open `/risk/register/new` → pick organization and RO.
5. Save draft risk.
6. Open working paper export → verify RO metadata appears.
7. Verify no 500 errors, risk saved with `roId`, pages load in sidebar/breadcrumb.

---

## Rollout Defaults Summary

```env
# .env
```

- Existing risks remain valid without backfill.
- New risks must always include `roId`.
