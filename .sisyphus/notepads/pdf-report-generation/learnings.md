# Learnings — pdf-report-generation

## [2026-04-04] Session Initialized

### Architecture Conventions
- Backend: Clean Architecture — domain → usecase → handler
- Repository pattern, no raw SQL in usecases or handlers
- Route DI pattern: `repo → usecase → handler → app.Get(...)` in `cmd/server/main.go:221-260`
- Binary response pattern: `c.Set("Content-Type", ...) + c.Set("Content-Disposition", ...) + c.Send(bytes)` at `handler/http/risk.go:226-235`

### Frontend Conventions
- Raw `fetch()` + `response.blob()` for binary downloads (NOT `api.get()` which calls `.json()` internally)
- Pattern at: `src/app/(app)/risk/register/bulk/page.tsx:136-161`
- `downloadBlob()` utility at: `src/lib/risk-export.ts:241-250`
- Auth via `useAuth()` hook from `contexts/auth-context.tsx`

### Risk Scoring Model
- Formula: `InherentScore = Probability × Impact` (1-5 scale each)
- Levels: Rendah (<5), Sedang (5-9), Tinggi (10-14), Ekstrem (≥15)
- Defined in `backend/internal/domain/entity/risk.go:128-144`

### Repository Methods Available
- `riskRepo.ListByCycle(ctx, cycle)` — approved risks for a cycle
- `incidentRepo.List()` — full incident list (filter in-memory if no `ListByLinkedRiskIDs`)
- `kriRepo.List()` — full KRI list (filter in-memory if no `ListByRiskIDs`)

### Critical Constraints
- Use maroto v2 exclusively (`github.com/johnfercher/maroto/v2`) — NOT v1
- Use vicanso/go-charts v2 for PNG chart rendering — NOT go-echarts/chromedp
- Dashboard usecases are NOT cycle-aware — must compute KPIs in-memory from ListByCycle snapshot
- Incidents/KRIs have no assessmentCycle field — filter via linked risk IDs

### PDF Libraries
- maroto v2: Bootstrap-like grid layout, component API `v2/pkg/components/`
- vicanso/go-charts v2: Pure Go PNG rendering, `charts.BarRender()` → `chart.Bytes()`
- Landscape A4, margins 15mm
