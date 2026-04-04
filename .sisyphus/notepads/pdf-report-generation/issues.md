# Issues — pdf-report-generation

## [2026-04-04] Pre-existing Issues (NOT introduced by this work)

### Pre-existing LSP errors in test files
- Files: `action_test.go`, `submit_test.go` (approval-related)
- Error: Missing `GetHeatmapVelocity` method on dashboard usecase interface
- Status: PRE-EXISTING — do NOT fix in this task, do NOT let verification fail on these

## Potential Gotchas to Watch

### maroto v2 API breaking changes from v1
- v1: `pdf.AddRow(height)` style API
- v2: Component-based: `maroto.New(cfg)` → `document.Add(row.New(height).Add(col.New(4).Add(text.New(...))))`
- Guard: ALWAYS import from `github.com/johnfercher/maroto/v2/...` paths

### vicanso/go-charts was archived April 2025
- Library is stable and pure Go, no external deps
- Pin specific version in go.mod
- No security concerns for internal PDF generation

### go-charts SeriesList for stacked bar
- Use `charts.NewPainter()` or `charts.BarRender()` with proper options
- Each risk level is a separate series with `StackedBar: true`

### Incident/KRI filtering
- No `assessmentCycle` field on these entities
- Must filter via: collect risk IDs from cycle → filter incidents/KRIs by `RiskID` field
- If `ListByLinkedRiskIDs` / `ListByRiskIDs` repo methods don't exist → use `List()` + in-memory filter
