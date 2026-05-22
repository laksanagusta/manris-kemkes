# Skip TTE (Tanda Tangan Elektronik) — Design Spec

**Date**: 2026-05-22
**Status**: Approved

## Summary

Fitur Skip TTE memungkinkan creator kertas kerja (working paper) untuk melewati seluruh proses tanda tangan elektronik saat membuat kertas kerja. Semua nama penandatangan tetap tercantum, tapi tidak ada QR code/tanda tangan digital, dan kertas kerja langsung berstatus `completed`.

## Requirements

| # | Requirement |
|---|---|
| 1 | Skip TTE hanya bisa dilakukan saat **create** working paper (status draft awal) |
| 2 | Hanya **creator** yang bisa menentukan skip TTE |
| 3 | Saat skip, **semua penandatangan** di-skip sekaligus — tidak ada partial skip |
| 4 | Nama penandatangan tetap muncul, tapi **tanda tangan (QR code) kosong** |
| 5 | Skip TTE **membypass persyaratan** semua risiko harus approved |
| 6 | Working paper langsung menjadi `completed` |

## Database Changes

### Migration: Add `tte_skipped` column

```sql
ALTER TABLE working_papers ADD COLUMN tte_skipped BOOLEAN NOT NULL DEFAULT false;
```

No changes to `working_paper_signatories` table — signatories remain `pending` with no `signed_at` or `qr_code_png`, which indicates they never signed.

## Entity Changes (`internal/domain/entity/working_paper.go`)

- Add field `TTESkipped bool` to `WorkingPaper` struct
- Add method `SkipTTE()`:
  - Set `TTESkipped = true`
  - Set `Status = WorkingPaperStatusCompleted`
  - Set `CompletedAt = time.Now()`
  - Signatories remain untouched (status = `pending`, no QR, no signed_at)

## API Changes

### Modify `POST /api/v1/working-papers` (Create)

Add optional boolean field `skip_tte` to request body:

```json
{
  "title": "...",
  "description": "...",
  "org_id": "...",
  "assessment_cycle": "...",
  "risk_ids": ["..."],
  "signatories": [...],
  "skip_tte": true
}
```

**Behavior**:
- `skip_tte = false` (default): existing behavior — status = `draft`, signatories = `pending`
- `skip_tte = true`: 
  - Call `SkipTTE()` on newly created working paper
  - **Skip** the "all risks must be approved" validation for risk linking
  - Working paper created directly as `completed`
  - Signatories saved with status `pending` (no QR codes generated)

No new endpoints needed.

## UseCase Changes (`internal/usecase/working_paper/create.go`)

1. Parse `skip_tte` from request body
2. Create working paper with signatories as usual
3. If `skip_tte = true`:
   - Skip `validateRisksApproved()` check
   - Call `workingPaper.SkipTTE()`
4. Save via repository
5. Return created working paper

## Frontend Changes

### 1. Create Working Paper Page (`/risk/working-papers/new`)

- Add toggle/switch labeled "Lewati TTE (tanpa tanda tangan elektronik)"
- When active:
  - Hide or show info banner: "Kertas kerja akan langsung selesai tanpa proses TTE"
  - Disable any risk approval validation warnings
- Set `skip_tte: true` in create request body

### 2. Working Paper Detail Page (`/risk/working-papers/[id]`)

**View model** (`working-paper-detail-view-model.ts`):
- Add `tteSkipped` field derived from `working_paper.tte_skipped`

**Timeline component**:
- If `tteSkipped = true`: all signatory nodes show "Dilewati" badge instead of "signed"/"upcoming"/"current"
  - Names still visible
  - No QR code displayed
  - Strikethrough or muted styling for the signing slot

**Action banner** (`currentAction`):
- If `tteSkipped = true`: show "TTE dilewati — kertas kerja selesai tanpa tanda tangan elektronik" with warning/neutral tone
- Hide "Tanda tangani sekarang" button

### 3. Excel Export (`working-paper-export.ts`)

- Sheet "Tanda Tangan": 
  - If `tteSkipped = true`: show all signatory names, but QR code column empty, status column shows "(Dilewati)"
  - No QR images embedded

### 4. Inbox (`/inbox`)

- Working papers with `tteSkipped = true` do not appear in TTE inbox (already `completed`)

### 5. Working Paper List (`/risk/working-papers`)

- Status column: `completed` papers with `tteSkipped = true` could show a small badge/tooltip "(tanpa TTE)" to differentiate from normal completions

## TypeScript Types

Add to `working-paper.ts`:

```typescript
export interface WorkingPaper {
  // ... existing fields
  tte_skipped: boolean;
}
```

## Edge Cases

| Case | Behavior |
|---|---|
| Edit after skip | Not allowed — status is `completed`, same as normal completion |
| Sign after skip | Not allowed — `CanSign()` returns false for `completed` |
| Cancel after skip | Not allowed — `CanCancel()` returns false for `completed` |
| Delete after skip | Not allowed — `CanDelete()` only works on `draft` |
| Risk lock after skip | Same as normal completion — linked risks cannot be updated when paper is in `completed` status |
| Document hash | Still computed at creation time — integrity is maintained even without TTE |

## Audit Trail

- `completed_at` is set to the timestamp when skip TTE occurred
- `tte_skipped = true` is the explicit indicator that completion happened without TTE
- Signatory records remain in `pending` status as permanent evidence they never signed