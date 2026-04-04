# Decisions — pdf-report-generation

## [2026-04-04] Architecture Decisions

### PDF Generation Approach: Backend-Only
- Decision: Go + maroto v2 (layout) + vicanso/go-charts v2 (charts)
- Reason: Recharts v3.8.0 incompatible with react-pdf-charts; pure Go approach avoids headless browser deps

### Heatmap: maroto colored grid cells
- Decision: Draw 5×5 grid directly with maroto `col.New()` + background colors
- Reason: No external chart library needed for grid layout

### Trend Chart: go-charts stacked bar
- Decision: vicanso/go-charts v2 for stacked bar PNG
- Reason: Pure Go, no headless browser, direct PNG bytes output

### Cycle Filter Only
- Decision: Single `?cycle=2026-H1` query param
- Reason: User requirement — only cycle/period filter needed

### No Tests: QA Only
- Decision: No unit/integration tests, verify via curl + Playwright
- Reason: User explicitly chose QA-only approach

### Empty Cycle: 404
- Decision: Return 404 when no risks found for cycle
- Reason: Metis gap analysis recommendation

### Language: Bilingual (ID/EN)
- Decision: All section titles and labels bilingual
- Format: "Indonesian / English" pattern

### Layout: Landscape A4
- Decision: `WithPageSize(consts.A4)` + landscape orientation in maroto config
- Margins: 15mm

### No Cover Page
- Decision: Start directly with Executive Summary section
- Reason: User explicitly declined cover page
