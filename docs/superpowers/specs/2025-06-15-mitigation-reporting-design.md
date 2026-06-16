# Spec: Mitigation Reporting Restructure

**Date:** 2025-06-15
**Status:** Draft
**Context:** KMK PP 92 — Bab IV, Pemantauan dan Reviu (line 2440-2692), Perlakuan Risiko (line 2298-2438)

## Problem

Current mitigation reporting di monitoring bersifat free-text summary (`mitigation_progress_summary`, `mitigation_obstacles`, `mitigation_follow_up` di `risk_monitorings`). Tidak ada:
- Pelaporan per-item mitigasi secara terstruktur
- Enforcement bahwa semua mitigasi harus dilaporkan sebelum finalisasi
- Kaitan formal antara rencana mitigasi di profil risiko dengan laporan pelaksanaan di monitoring
- Cron-based task generation untuk recurring mitigasi — bertentangan dengan KMK (mitigasi = kegiatan terobosan, bukan rutin)

## Target State

```
Risk v1 approved Q1
  → EnsureTasks (cycle=Q1) → Q1 tasks created

  ┌─ Q1 monitoring started ─────────────────────────────┐
  │ → EnsureTasks (cycle=Q1) → sudah ada, skip          │
  │ → Link Q1 tasks ke monitoring → user report → done  │
  └──────────────────────────────────────────────────────┘
                                │
  ┌─ Q1 DISKIP, Q2 monitoring started ──────────────────┐
  │ → EnsureTasks (cycle=Q2) → belum ada → generate     │
  │ → Link Q2 tasks ke monitoring → user report → done  │
  │ → Q1 tasks tetap ada sbg historical (overdue)        │
  └──────────────────────────────────────────────────────┘
                                │
  Monitoring finalized → v2 approved Q2
    → EnsureTasks (cycle=Q2) → Q2 tasks for v2
  
  Monitoring finalized → v2 approved Q3
    → EnsureTasks (cycle=Q3) → Q3 tasks for v2
                                │
  Mitigasi 'done' + efektif → usulan pengendalian internal
```

## Changes

### 1. Database Migration

```sql
-- Migration: 000078_mitigation_task_monitoring_fields.up.sql

ALTER TABLE mitigation_tasks
  ADD COLUMN monitoring_id UUID REFERENCES risk_monitorings(id) ON DELETE SET NULL,
  ADD COLUMN report_output TEXT NOT NULL DEFAULT '',
  ADD COLUMN report_obstacle TEXT NOT NULL DEFAULT '';

-- Optional: index for querying tasks by monitoring
CREATE INDEX idx_mitigation_tasks_monitoring_id ON mitigation_tasks(monitoring_id)
  WHERE monitoring_id IS NOT NULL;
```

**No recurring deprecation migration needed** — existing columns (`frequency`, `recurring_interval`, `report_day`, `report_date`) remain but are ignored for new tasks. Old tasks with these values stay as-is.

### 2. Backend: Remove Cron-Based Task Generation

**Files to modify:**
- `backend/cmd/cron/main.go` — remove `GenerateTasksUseCase` and `MarkOverdueUseCase` calls from cron runner
- `backend/internal/usecase/mitigation_task/usecases.go` — deprecate `GenerateTasksUseCase` and `MarkOverdueUseCase` (keep code, remove from cron registration)
- `backend/internal/handler/http/mitigation_task.go` — remove `POST /mitigation-tasks/generate` endpoint

### 3. Backend: Task Generation on Approval/Version Create

**Modify:** `backend/internal/usecase/mitigation_task/approval_sync.go`

`EnsureTasksForApprovedRiskUseCase` → renamed to `EnsureTasksForRiskVersionUseCase`:

**Logic:**
1. Receive: `risk_id`, `cycle` (e.g., "2026-Q1")
2. Load all mitigations for this risk (from `mitigations` table)
3. Calculate due_date:
   - Q1 → March 31
   - Q2 → June 30
   - Q3 → September 30
   - Q4 → December 31
4. For each mitigation plan item that has no existing task for this cycle:
   - Create `mitigation_task`:
     - `mitigation_id` = mitigation.id
     - `risk_id` = risk.id
     - `period_label` = cycle (e.g., "2026-Q1")
     - `period_start` = start of quarter
     - `period_end` = end of quarter
     - `due_date` = end of quarter
     - `status` = 'pending'
     - `generated_by` = 'system'
     - `monitoring_id` = NULL (linked later when reassessment starts)
   - Skip mitigations marked `is_existing_control = true`

### Task Generation Triggers

Tasks digenerate di dua momen:

**1. Saat risk approved (initial):**
- Risk v1 approved di Q1 → tasks generated untuk Q1
- Due date = akhir Q1 (31 Mar)

**2. Saat reassessment dimulai (ensure untuk kuartal saat ini):**
- Jika monitoring dimulai di Q1 → Q1 tasks sudah ada, langsung link
- Jika Q1 diskip dan monitoring baru dimulai di Q2:
  - System deteksi: belum ada tasks untuk Q2 → generate Q2 tasks
  - Q1 tasks tetap ada sebagai historical record (overdue, tidak terpakai)
  - Q2 tasks di-link ke monitoring

**Rule:** `EnsureTasksForRiskVersionUseCase(risk_id, cycle)` selalu dipanggil di dua titik:
- Risk approval handler (cycle = current quarter)
- Reassessment creation handler (cycle = current quarter)
- Idempotent: jika tasks untuk cycle tersebut sudah ada, skip

### 4. Backend: Ensure Tasks on Reassessment

**Modify:** Reassessment creation flow (`POST /risks/:riskId/reassess` handler)

Setelah membuat `risk_monitoring` record:
1. Panggil `EnsureTasksForRiskVersionUseCase(risk_id, current_quarter)` → idempotent
2. Query semua `mitigation_tasks` untuk risk ini dengan `cycle = current_quarter`
3. Set `monitoring_id` ke monitoring yang baru dibuat
4. Return tasks dalam response monitoring

### 5. Backend: Validation Before Finalization

**New endpoint or validation in finalization handler:**
`GET /api/v1/monitorings/:id/validate-finalize`

**Response:**
```json
{
  "can_finalize": false,
  "total_tasks": 5,
  "reported_tasks": 3,
  "pending_tasks": [
    { "id": "uuid", "mitigation_action": "Reviu SPIP triwulan", "status": "pending" }
  ]
}
```

**Finalization handler** (`POST /monitorings/:id/finalize`):
- Before processing, call validation logic
- If `can_finalize = false`, return `400` with validation details
- If `can_finalize = true`, proceed with finalization

### 6. Backend: Mitigation Task Report Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/monitorings/:id/tasks` | GET | Get all tasks linked to this monitoring |
| `/api/v1/monitorings/:id/tasks/:taskId` | PUT | Update task report (status, output, obstacle, evidence) |

**PUT body:**
```json
{
  "status": "done",
  "progress_pct": 100,
  "report_output": "95% unit sudah mengikuti sosialisasi SOP",
  "report_obstacle": "3 unit di daerah sulit dijangkau",
  "evidence_url": "https://drive.google.com/..."
}
```

### 7. Frontend: Monitoring Report UI

**Modify:** `frontend/src/app/(app)/risk/assessment/[id]/page.tsx`

Replace existing free-text fields (`mitigationProgressSummary`, `mitigationObstacles`, etc.) with structured section:

**Section: "Laporan Pelaksanaan Mitigasi"**

```
┌──────────────────────────────────────────────────────────────┐
│ Laporan Pelaksanaan Mitigasi                                  │
│                                                              │
│ ┌────────────┬────────┬────────────────────────┬───────────┐ │
│ │ Mitigasi   │ PIC    │ Status │ Output │ ⋮   │           │ │
│ ├────────────┼────────┼────────────────────────┼───────────┤ │
│ │ Sosialisasi│ Budi   │ [Sel▼]│ 95% un..│ ✎   │           │ │
│ │ SOP        │        │        │         │     │           │ │
│ │ Reviu SPIP │ Ani    │ [Pen▼]│ -       │ ✎   │           │ │
│ │ Audit int  │ Cici   │ [Ter▼]│ -       │ ✎   │           │ │
│ └────────────┴────────┴────────────────────────┴───────────┘ │
│                                                              │
│ Progress: ████████░░ 3/5 dilaporkan                          │
│                                                              │
│ [Finalisasi — disabled: laporkan 2 mitigasi lagi]            │
└──────────────────────────────────────────────────────────────┘
```

**Status dropdown values:**
- `pending` (default) — Belum Dilaporkan
- `done` — Selesai Dilaporkan

**Expandable row (click ✎):**
- Output tercapai (textarea)
- Kendala (textarea)
- Bukti/lampiran (URL input)
- Progress percentage (0-100%)

**Finalize button logic:**
- Disabled jika ada task dengan status `pending`
- Tooltip: "Laporkan status seluruh mitigasi terlebih dahulu (X tersisa)"
- Setelah semua `done`, tombol enabled

### 8. Frontend: Progress Kertas Kerja Update

**Modify:** `monitoring-latest-progress-chart.tsx`

Update the progress calculation to reflect mitigation reporting status:
- `progressPercent` = (done tasks / total tasks) * 100 per organization
- Currently uses `approved_risks / total_risks`, should incorporate mitigation reporting

### 9. Form Simplifications

**Due date dihapus dari form mitigasi:**
- `mitigations.due_date` — field tetap ada di DB (untuk legacy data), tapi dihapus dari form create/edit risk dan form monitoring
- Due date task (`mitigation_tasks.due_date`) sekarang auto-calculated = akhir kuartal (31 Mar utk Q1, 30 Jun utk Q2, 30 Sep utk Q3, 31 Des utk Q4)
- User tidak perlu lagi set due date per mitigasi — cukup isi rencana, output, target, PIC

**Frequency & recurring dihapus dari form:**
- `mitigations.frequency` — field tetap di DB, tapi dihapus dari UI
- Semua mitigasi diperlakukan sebagai kegiatan terobosan per siklus (sesuai KMK)
- Tidak ada lagi opsi "Rutin" dengan interval harian/mingguan/bulanan

### 10. What Stays the Same

- **Mitigation plan di profil risiko** — tetap diisi saat create/edit risk, sesuai KMK line 2364-2398
- **Mitigation Monitoring Panel** (`compliance/penanganan`) — tetap berfungsi untuk tracking on-going
- **Mitigation Progress Tab** di risk detail — tetap menampilkan tasks
- **Operational Panel chart** — tetap menampilkan completion/overdue

### 11. Rollout Plan

1. **Migration** — Add columns to `mitigation_tasks` (000078)
2. **Backend** — Modify `EnsureTasksForRiskVersionUseCase` — generate per kuartal, idempotent
3. **Backend** — Ensure tasks called on: (a) risk approval, (b) reassessment creation
4. **Backend** — Add validation + report endpoints
5. **Backend** — Remove cron + generate endpoint
6. **Frontend** — Remove due_date, frequency from mitigation form + table
7. **Frontend** — New monitoring report UI section (per-item, per kuartal)
8. **Frontend** — Update progress charts
9. **Testing** — E2E flow: create → approve Q1 → tasks Q1 → monitoring Q2 → ensure Q2 tasks → report → finalize

## Files Checklist

| File | Action |
|---|---|
| `backend/db/migrations/000078_mitigation_task_monitoring_fields.up.sql` | Create |
| `backend/db/migrations/000078_mitigation_task_monitoring_fields.down.sql` | Create |
| `backend/internal/usecase/mitigation_task/approval_sync.go` | Modify |
| `backend/internal/usecase/mitigation_task/usecases.go` | Deprecate cron methods |
| `backend/cmd/cron/main.go` | Remove mitigation task cron |
| `backend/internal/handler/http/mitigation_task.go` | Add report endpoints, remove generate |
| `backend/internal/handler/http/risk_handler.go` (or monitoring handler) | Add validation on finalize |
| `frontend/src/app/(app)/risk/register/new/page.tsx` | Remove due_date, frequency, recurring from mitigation form |
| `frontend/src/components/shared/mitigation-table.tsx` | Remove due_date, frequency columns from UI |
| `frontend/src/app/(app)/risk/assessment/[id]/page.tsx` | New report UI section |
| `frontend/src/app/(app)/compliance/_components/monitoring-latest-progress-chart.tsx` | Update progress calc |
| `frontend/src/types/risk.ts` | Add `report_output`, `report_obstacle` to MitigationTask |
