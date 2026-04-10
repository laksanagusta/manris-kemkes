# Kertas Kerja (Working Paper) - Frontend Wave 1 Learnings

## Completed Tasks

### 1. Created TypeScript Types (`frontend/src/types/working-paper.ts`)
- Defined 2 type unions: `WorkingPaperStatus` ('draft' | 'signing' | 'completed' | 'cancelled') and `SignatoryStatus` ('pending' | 'signed')
- Created 5 interfaces:
  - `RiskSnapshot`: Captures full risk assessment data at time of working paper creation (37 fields including optional monitoring fields)
  - `WorkingPaperSignatory`: Individual signatory record with sequence, QR code, and status tracking
  - `WorkingPaper`: Main entity with full lifecycle (draft → signing → completed/cancelled)
  - `CreateSignatoryInput`: Input DTO for signatory creation
  - `CreateWorkingPaperRequest`: Input DTO with risk_ids array and signatories array
  - `WorkingPaperListResponse`: Paginated list response with total/page/limit metadata

### 2. Created API Client (`frontend/src/lib/api/working-papers.ts`)
- Implemented 7 functions following exact pattern from `frontend/src/lib/api/forms.ts`:
  1. `listWorkingPapers(token, params?)`: GET /working-papers with URLSearchParams for query filtering
  2. `getWorkingPaper(id, token)`: GET /working-papers/:id
  3. `createWorkingPaper(data, token)`: POST /working-papers
  4. `deleteWorkingPaper(id, token)`: DELETE /working-papers/:id
  5. `signWorkingPaper(id, token)`: POST /working-papers/:id/sign
  6. `cancelWorkingPaper(id, token)`: POST /working-papers/:id/cancel
  7. `getPendingSigningCount(token)`: GET /working-papers/pending-count
- All functions use `api.get<T>()`, `api.post<T>()`, `api.delete<T>()` pattern from `@/lib/api`
- Token passed as parameter (not header) — api.ts wrapper handles Authorization header

### 3. Updated Navigation (`frontend/src/lib/app-navigation.ts`)
- Added nav item after "Risk Register": `{ label: "Kertas Kerja", href: "/risk/working-papers", icon: "FileSignature" }`
- Added breadcrumb mappings:
  - `"/risk/working-papers": "Kertas Kerja"`
  - `"/risk/working-papers/new": "Buat Kertas Kerja"`

### 4. Updated Sidebar Icon Map (`frontend/src/components/app-sidebar.tsx`)
- Imported `FileSignature` from lucide-react
- Added to `iconMap` object for icon string-to-component resolution

## Verification Results
✅ Files created: 2
  - `frontend/src/types/working-paper.ts` (100 lines)
  - `frontend/src/lib/api/working-papers.ts` (47 lines)
✅ Files modified: 2
  - `frontend/src/lib/app-navigation.ts` (nav item + breadcrumbs)
  - `frontend/src/components/app-sidebar.tsx` (icon import + iconMap)
✅ Build: `npx next build` passes with exit code 0
✅ TypeScript: `npx tsc --noEmit --skipLibCheck` produces no errors

## Key Patterns Used
1. **API Client Pattern**: URLSearchParams for query building, token as last parameter
2. **Auto-unwrap Logic**: api.ts auto-unwraps `{ data: ... }` envelope only if single key in response
3. **List Response Handling**: Returns full response object with pagination metadata (not auto-unwrapped because has multiple keys)
4. **Icon Mapping**: String icon names resolved via iconMap object in sidebar component
5. **Breadcrumb Structure**: Hierarchical paths map to user-friendly labels

## Type Safety Notes
- WorkingPaper fully captures risk snapshot state (immutable at creation time)
- Monitoring fields (monitoring_p, monitoring_d, etc.) are optional on RiskSnapshot for initial creation, populated during monitoring phase
- Signatory status progression: pending → signed
- Working paper status progression: draft → signing → completed/cancelled

### Working Paper List Page Implementation
- Followed established patterns from `risk/register/page.tsx` for client-side data fetching, utilizing `useEffect` with `activeToken` and dependencies.
- Standardized UI with shadcn/ui components (`Card`, `Table`, `Badge`, `Tabs`, `AlertDialog`) keeping the existing `animate-fade-in` and loading styles.
- Implemented client-side handling for nested records (e.g. `signatories` array length for calculating progress and `risk_snapshots` length for risk counts).
- Kept the UI in Bahasa Indonesia consistently (e.g. "Kertas Kerja", "Proses TTE", "Dibatalkan").
- Next.js build passes cleanly without any linting or type issues since we leveraged exact predefined types (`WorkingPaper`, `WorkingPaperListResponse`) from `src/types/working-paper.ts`.

### Working Paper Detail & Sign Page
- Created detail view page for Working Papers at `/risk/working-papers/[id]/page.tsx`.
- Used `statusVariant` mapping to style UI appropriately based on state (draft, signing, completed, cancelled).
- Extracted and displayed document hash (first 16 chars) with an easy "copy to clipboard" button.
- Built a vertical timeline/stepper for tracking signatory progress using simple absolute positioned lines and circles, instead of a heavy third-party library. 
- Integrated dynamic import for `exportWorkingPaper` function to handle future implementations seamlessly (`catch()` block is very useful here).

## 2026-04-10
- When implementing Working Paper creation, used `react-hook-form` with `zodResolver` to handle complex dynamic arrays (signatories) efficiently. 
- Integrated multi-select table for Risks and auto-populated signatory details via API user fetch.

### 5. Created Excel Export Utility (`frontend/src/lib/working-paper-export.ts`)
- Generated multi-sheet .xlsx from WorkingPaper object using ExcelJS (no xlsx library needed)
- 4 sheets: "Profil Risiko", "KK Penilaian Risiko", "KK Pemantauan Reviu", "Tanda Tangan"
- Followed exact ExcelJS patterns from `risk-cycle-detail-export.ts`:
  - `new ExcelJS.Workbook()` → `addWorksheet()` → `ws.columns = [...]` → `ws.addRow()` → `writeBuffer()` → Blob download
  - Header: dark blue fill (#FF1F4E79), white bold font, thin borders
  - Data rows: thin borders on all cells, wrapText alignment
- QR code embedding: `workbook.addImage({ base64: stripped, extension: 'png' })` → `ws.addImage(id, { tl: { col, row }, ext: { width: 100, height: 100 } })`
  - IMPORTANT: `tl` uses 0-based coordinates while ExcelJS rows are 1-based — subtract 1 from row number
  - Must strip `data:image/png;base64,` prefix before passing to addImage
- `safeStr`/`safeNum` helpers handle optional fields gracefully (return empty string instead of undefined)
- File naming: `Kertas_Kerja_{sanitized_title}_{YYYYMMDD}.xlsx`
- Download pattern: `URL.createObjectURL(blob)` → create `<a>` link → click → revoke
- All labels in Bahasa Indonesia matching government risk management templates
- Build verified: `npx next build` exit 0, no TypeScript errors

### T10: Backend Working Paper CRUD Usecases
- Used single shared `UseCase` struct pattern (vs approval's separate structs per operation) — cleaner for CRUD ops
- Risk → RiskSnapshot field mapping gotchas:
  - `Risk.Weight` → `RiskSnapshot.Bobot`
  - `Risk.Cause` → `RiskSnapshot.Sebab`
  - `Risk.ImpactDesc` → `RiskSnapshot.Dampak`
  - `Risk.Controllability` → `RiskSnapshot.ControlUncontrol`
  - `Risk.ExistingControl` → `RiskSnapshot.PengendalianUraian`
  - `Risk.ControlEffectiveness` → `RiskSnapshot.PengendalianEfektif`
  - `Risk.RiskAppetite` → `RiskSnapshot.SeleraRisiko`
  - `Risk.TreatmentOption` → `RiskSnapshot.PenangananRisiko`
- `riskLevelFromScore(p, i)` uses P*I product thresholds (4/8/12/16) — different from entity's `GetRiskLevelFromNilai` which uses Nilai (P*I*Weight) thresholds
- Entity already has `ComputeHash()` method — no need to reimplement SHA-256 logic
- Entity `CanDelete()` returns bool (not error) — caller wraps with AppError
- `riskRepo.GetByID` requires orgIDs parameter — pass `[]uuid.UUID{input.OrgID}` for single-org scoping
- Pre-existing `sign.go` in the package — T11 already created it; our `usecase.go` struct is compatible

## T11: Sign & Cancel Usecases (Backend)

### Sign Usecase Pattern
- Follows same pattern as `approval/action.go`: fetch entity → validate state → validate actor → perform action → persist
- Entity methods (`CanSign`, `NextSignatory`, `MarkSigned`) handle all business logic; usecase just orchestrates
- `GetByIDForUpdate` provides row-level locking (SELECT FOR UPDATE) for concurrent signing protection
- `MarkSigned` handles in-place signatory update, sequence advance, and status transitions (draft→signing, signing→completed)
- After `MarkSigned`, find the updated signatory by ID in `wp.Signatories` slice to get a pointer for `UpdateSignatory`
- QR code generated via direct call to `qrcode.GenerateQRCode()` — no interface needed since it's a pure utility
- QR payload marshaled to `json.RawMessage` for JSONB storage alongside the base64 PNG

### Cancel Usecase
- Simple: fetch → validate via `CanCancel()` (blocks completed status) → set cancelled + timestamps → persist
- `userID` param accepted but not used for authorization check in usecase (handler/middleware responsibility)

### Key Decisions
- No QRCodeGenerator interface on UseCase struct — direct package call is simpler for a stateless utility
- usecase.go unchanged from T10 — only needs `wpRepo` and `riskRepo` dependencies
- Same `ctx` passed through all repo calls to maintain transaction scope from `GetByIDForUpdate`

## T14: Inbox Integration for Working Paper Signing

### Files Modified
1. `frontend/src/app/(app)/inbox/page.tsx` — Added working paper signing items as third entity type
2. `frontend/src/components/app-shell.tsx` — Added WP pending-count to sidebar inbox badge

### Key Patterns
- **Discriminated union extension**: Added `WorkingPaperSigningItem` with `requestType: "working_paper"` to existing `InboxItem = ApprovalRequest | KRIReportReview` union
- **Three-way type check pattern**: `isKRIReport` / `isWorkingPaper` / `approvalItem` (fallback) — each display variable now uses ternary chain
- **Graceful degradation**: `getWorkingPaperSigningItems(token).catch(() => [])` — silently returns empty array if backend endpoint doesn't exist yet
- **WP items map to "Menunggu Review" tab**: Since they're always pending_signing, they show under the review tab alongside KRI submitted items
- **No approve/reject actions**: WP signing items get a "Tanda Tangan" link button to navigate to detail page (signing happens there)
- **Badge count**: app-shell.tsx uses `Promise.all` to fetch both `/approvals/pending-count` and `/working-papers/pending-count`, summing both for sidebar badge

### API Endpoint Expected
- `GET /working-papers/pending-signing` — returns list of working papers where current user is next signatory
- Response shape: `{ id, working_paper_id, title, description, assessment_cycle, sequence_no, signer_role_label, created_at }[]`
- Falls back gracefully if endpoint not yet built

### Status Mappings Added
- `pending_signing` → variant: `bg-blue-100 text-blue-700 border-blue-200`, label: "Menunggu TTE"

### Type Filter
- Added `"working_paper"` to typeFilter state union type and Select dropdown ("Kertas Kerja")

## T13: Backend HTTP Handlers for Working Paper

### Files Created
- `backend/internal/handler/http/working_paper.go` — 8 handlers + `handleWPError` helper

### Files Modified
- `backend/cmd/server/main.go` — import, repo, usecase, handler, routes

### Key Decisions
- **INVALID_STATUS → 409 Conflict**: Created `handleWPError` that checks `errors.As(err, &appErr)` with `appErr.Code == "INVALID_STATUS"` before delegating to `handleError`. This is necessary because `handleError` maps `IsValidation` → 422, but delete/cancel create NEW AppError instances (not sentinel errors), so `errors.Is(err, ErrInvalidStatus)` would return false and they'd fall through to 500.
- **Cancel returns `error` only**: The usecase's `Cancel` returns just `error` (not `*entity.WorkingPaper, error`), so handler returns `{"message": "working paper cancelled"}` instead of the entity.
- **Pending-signing flat response**: Frontend expects `{id, working_paper_id, title, description, assessment_cycle, sequence_no, signer_role_label, created_at}[]`. Handler iterates WP signatories to find the matching user's pending signatory and builds flat `pendingSigningItem` structs.
- **Repo direct calls**: `GetPendingSigningCount` and `ListPendingSigning` call `wpRepo` directly (not through usecase) since these are simple read-through queries with no business logic.
- **Route ordering**: Static routes (`/pending-count`, `/pending-signing`) registered BEFORE `/:id` to prevent Fiber wildcard route swallowing.
- **OrgID for Create**: Uses `scope.AccessibleOrgIDs[0]` — consistent with how other handlers derive org context from JWT scope.
