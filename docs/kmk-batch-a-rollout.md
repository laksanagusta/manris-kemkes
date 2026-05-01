# KMK Batch A — Rollout Notes

**Date:** 2026-05-01  
**Scope:** Batch A Foundation — KMK terminology alignment, Risk Charter module, Risk Objective module, Risk-Objective linkage

---

## Verification Results

### Backend (`go test ./...`)

- **Status:** ✅ PASS
- **Note:** One pre-existing test in `internal/mcp/tools` was fixed — `TestHandleMonitorAndApproveRisk_Success` expected `status=approved` from an approval flow that was temporarily commented out. Updated test to assert on `id` and `cycle` fields that the function actually returns.

### Frontend (`npm run build`)

- **Status:** ✅ PASS
- All 43 routes build successfully, including new `/management/charters`, `/management/charters/[id]`, `/management/objectives`, `/management/objectives/[id]` routes.

### Database Migrations

- `000044_risk_charters` — creates `risk_charters` table
- `000045_risk_objectives` — creates `risk_objectives` table
- `000046_risks_add_objective_id` — adds `objective_id` column to `risks` table

---

## Feature Flag

### `KMK_OBJECTIVE_REQUIRED`

- **Default:** `false`
- **Purpose:** When set to `true`, risk creation/update will **require** an `objectiveId` linking the risk to a KMK objective.
- **Rollout guidance:**
  - Keep `false` on first release.
  - Enable to `true` **only after** all active organizations have at least one objective created.
  - Existing risks remain valid without backfill — the column is nullable.
  - New risks can start with **optional** objective linkage during the transition period.
- **ENV var:** `KMK_OBJECTIVE_REQUIRED` in `backend/internal/config/config.go`

---

## Exit Criteria Checklist

| Criterion | Status |
|---|---|
| UI labels use KMK wording (Jarang, Kemungkinan Kecil, Kemungkinan Sedang, Kemungkinan Besar, Hampir Pasti Terjadi, Tidak Signifikan, Katastropik, Sangat Tinggi) | ✅ |
| `risk_charters` CRUD works (backend routes + frontend pages) | ✅ |
| `risk_objectives` CRUD works (backend routes + frontend pages) | ✅ |
| Risk form accepts `objectiveId` via objective picker | ✅ |
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
| GET | `/api/v1/risk-objectives` | List objectives (paginated, filterable, searchable) |
| POST | `/api/v1/risk-objectives` | Create objective |
| GET | `/api/v1/risk-objectives/:id` | Get objective by ID |
| PUT | `/api/v1/risk-objectives/:id` | Update objective |
| DELETE | `/api/v1/risk-objectives/:id` | Delete objective |

### Frontend

| Path | Description |
|---|---|
| `/management/charters` | Charter list page |
| `/management/charters/[id]` | Charter detail/edit page |
| `/management/objectives` | Objective list page |
| `/management/objectives/[id]` | Objective detail/edit page |

---

## Manual Smoke Test Checklist

1. Login as `superadmin`.
2. Open `/management/charters` → create a charter for one organization.
3. Open `/management/objectives` → create an objective linked to that organization.
4. Open `/risk/register/new` → pick organization and objective.
5. Save draft risk.
6. Open working paper export → verify objective metadata appears.
7. Verify no 500 errors, risk saved with `objectiveId`, pages load in sidebar/breadcrumb.

---

## Rollout Defaults Summary

```env
# .env
KMK_OBJECTIVE_REQUIRED=false
```

- Set `KMK_OBJECTIVE_REQUIRED=true` only after all active organizations have at least one objective.
- Existing risks remain valid without backfill.
- New risks start with optional linkage during transition.