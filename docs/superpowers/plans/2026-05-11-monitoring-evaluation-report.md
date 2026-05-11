# Monitoring Evaluation Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new Formal Reports export that renders `LAPORAN HASIL PEMANTAUAN DAN EVALUASI PENERAPAN MANAJEMEN RISIKO` per unit, matching the supplied reference structure while leaving unavailable metadata blank.

**Architecture:** Extend the existing formal report type system with `monitoring_evaluation_report`, build a typed backend payload from organization + risk cycle snapshot data, then render it through a dedicated Maroto PDF renderer. Frontend only adds the new report card/type to the existing Formal Reports flow; no metadata form is added in this iteration.

**Tech Stack:** Go 1.25, Fiber backend, Maroto v2 PDF renderer, Next.js 16/React/TypeScript frontend, Node test runner for frontend tests.

---

## File Structure

- Modify `backend/internal/domain/entity/formal_report.go`: add the new report type constant and validation entry.
- Modify `backend/internal/domain/entity/formal_report_test.go`: prove the type helper accepts the new type.
- Modify `backend/internal/domain/entity/report.go`: add typed payload structs for monitoring evaluation data, checklist rows, mitigation summary rows, and signatures.
- Create `backend/internal/usecase/formalreport/monitoring_evaluation.go`: compute the monitoring evaluation report payload and mitigation summary from risks.
- Create `backend/internal/usecase/formalreport/monitoring_evaluation_test.go`: test level counts, movement counts, empty data behavior, and checklist derivation.
- Modify `backend/internal/usecase/formalreport/helpers.go`: add the new headline.
- Modify `backend/internal/usecase/formalreport/download.go`: route the new type to the monitoring evaluation payload.
- Modify `backend/internal/usecase/formalreport/download_test.go`: assert type-specific payload wiring and rendered output text.
- Modify `backend/internal/service/pdfreport/renderer.go`: route the new report type and use Letter dimensions for this report type only.
- Create `backend/internal/service/pdfreport/monitoring_evaluation.go`: render the reference-style PDF sections.
- Create `backend/internal/service/pdfreport/monitoring_evaluation_test.go`: smoke-test PDF rendering and recognizable text.
- Modify `frontend/src/types/formal-report.ts`: add the new report type literal.
- Create `frontend/src/lib/formal-report-definitions.ts`: centralize Formal Reports card definitions for testability.
- Create `frontend/src/lib/formal-report-definitions.test.ts`: assert the new card exists.
- Modify `frontend/src/app/(app)/reports/formal/page.tsx`: consume centralized report definitions.

## Task 1: Register the New Formal Report Type

**Files:**
- Modify: `backend/internal/domain/entity/formal_report.go`
- Modify: `backend/internal/domain/entity/formal_report_test.go`
- Modify: `backend/internal/usecase/formalreport/helpers.go`
- Modify: `backend/internal/usecase/formalreport/generate_test.go`

- [ ] **Step 1: Write the failing backend type test**

Add `FormalReportTypeMonitoringEvaluation` to the helper test expectation before defining it:

```go
func TestFormalReportTypeHelpers(t *testing.T) {
	for _, typ := range []string{
		FormalReportTypeAnnualRiskProfile,
		FormalReportTypeSemiannualImplementation,
		FormalReportTypeSemiannualSupervision,
		FormalReportTypeTMPMR,
		FormalReportTypeMonitoringEvaluation,
	} {
		if !IsValidFormalReportType(typ) {
			t.Fatalf("expected report type %q to be valid", typ)
		}
	}

	if IsValidFormalReportType("unknown") {
		t.Fatal("expected unknown report type to be invalid")
	}
}
```

- [ ] **Step 2: Run the backend type test and confirm RED**

Run:

```bash
go test ./internal/domain/entity -run TestFormalReportTypeHelpers -count=1
```

Expected: FAIL with `undefined: FormalReportTypeMonitoringEvaluation`.

- [ ] **Step 3: Add the new backend report type**

In `backend/internal/domain/entity/formal_report.go`, add:

```go
FormalReportTypeMonitoringEvaluation = "monitoring_evaluation_report"
```

Then include it in `validFormalReportTypes`:

```go
FormalReportTypeMonitoringEvaluation: {},
```

- [ ] **Step 4: Add the formal report headline**

In `backend/internal/usecase/formalreport/helpers.go`, extend `formalReportHeadline`:

```go
case entity.FormalReportTypeMonitoringEvaluation:
	return "Laporan hasil pemantauan dan evaluasi manajemen risiko"
```

- [ ] **Step 5: Extend generate metadata test**

In `backend/internal/usecase/formalreport/generate_test.go`, add this case to `TestGenerateFormalReportUseCase_StoresTypeAwareSummaryMetadata`:

```go
{
	name:         "monitoring evaluation report",
	reportType:   entity.FormalReportTypeMonitoringEvaluation,
	wantHeadline: "Laporan hasil pemantauan dan evaluasi manajemen risiko",
	wantFocus:    entity.FormalReportTypeMonitoringEvaluation,
},
```

- [ ] **Step 6: Run type/generate tests and confirm GREEN**

Run:

```bash
go test ./internal/domain/entity ./internal/usecase/formalreport -run 'TestFormalReportTypeHelpers|TestGenerateFormalReportUseCase_StoresTypeAwareSummaryMetadata' -count=1
```

Expected: PASS.

## Task 2: Add Monitoring Evaluation Payload and Aggregation

**Files:**
- Modify: `backend/internal/domain/entity/report.go`
- Create: `backend/internal/usecase/formalreport/monitoring_evaluation.go`
- Create: `backend/internal/usecase/formalreport/monitoring_evaluation_test.go`

- [ ] **Step 1: Write failing aggregation tests**

Create `backend/internal/usecase/formalreport/monitoring_evaluation_test.go`:

```go
package formalreport

import (
	"testing"

	"github.com/manris/backend/internal/domain/entity"
)

func TestBuildMonitoringMitigationSummary(t *testing.T) {
	beforeHigh := 18.0
	afterMedium := 12.0
	beforeSame := 11.0
	afterSame := 11.0
	beforeUp := 7.0
	afterUp := 15.0

	risks := []*entity.Risk{
		{
			Code: "R-1", Title: "Turun", Probability: 4, Impact: 5, Weight: 1, Nilai: 20,
			BeforeMonitoringNilai: &beforeHigh, MonitoringResultNilai: &afterMedium,
			Mitigations: []entity.Mitigation{{Action: "Mitigasi A"}},
		},
		{
			Code: "R-2", Title: "Menetap", Probability: 3, Impact: 4, Weight: 1, Nilai: 12,
			BeforeMonitoringNilai: &beforeSame, MonitoringResultNilai: &afterSame,
			Mitigations: []entity.Mitigation{{Action: "Mitigasi B"}, {Action: "Mitigasi C"}},
		},
		{
			Code: "R-3", Title: "Naik", Probability: 2, Impact: 3, Weight: 1, Nilai: 6,
			BeforeMonitoringNilai: &beforeUp, MonitoringResultNilai: &afterUp,
		},
		{
			Code: "R-4", Title: "Baru", Probability: 5, Impact: 5, Weight: 1, Nilai: 25,
		},
	}

	rows := buildMonitoringMitigationSummary(risks)
	total := rows[len(rows)-1]

	if total.RiskCount != 4 {
		t.Fatalf("total risk count = %d, want 4", total.RiskCount)
	}
	if total.MitigationPlanCount != 3 {
		t.Fatalf("mitigation plan count = %d, want 3", total.MitigationPlanCount)
	}
	if total.MitigationRealizationCount != 3 {
		t.Fatalf("mitigation realization count = %d, want fallback 3", total.MitigationRealizationCount)
	}
	if total.DownCount != 1 || total.SameCount != 1 || total.UpCount != 1 || total.NewCount != 1 {
		t.Fatalf("movement totals = down:%d same:%d up:%d new:%d, want 1/1/1/1", total.DownCount, total.SameCount, total.UpCount, total.NewCount)
	}
}

func TestBuildMonitoringEvaluationReportDataUsesBlankMetadata(t *testing.T) {
	report := &entity.FormalReport{Period: "2025-H2", ReportType: entity.FormalReportTypeMonitoringEvaluation}
	org := &entity.Organization{Name: "Balai Contoh"}
	data := buildMonitoringEvaluationReportData(report, org, entity.ReportSummary{Cycle: "2025-H2"}, nil)

	if data == nil {
		t.Fatal("expected monitoring evaluation payload")
	}
	if data.OrganizationName != "Balai Contoh" {
		t.Fatalf("organization name = %q, want Balai Contoh", data.OrganizationName)
	}
	if data.SemesterLabel != "SEMESTER II" {
		t.Fatalf("semester label = %q, want SEMESTER II", data.SemesterLabel)
	}
	if data.Year != "2025" {
		t.Fatalf("year = %q, want 2025", data.Year)
	}
	if data.ReportNumber != "" || data.AssignmentLetterNumber != "" {
		t.Fatalf("expected unavailable metadata to stay blank: %#v", data)
	}
	if len(data.DocumentChecklist) != 9 {
		t.Fatalf("document checklist rows = %d, want 9", len(data.DocumentChecklist))
	}
}
```

- [ ] **Step 2: Run aggregation tests and confirm RED**

Run:

```bash
go test ./internal/usecase/formalreport -run 'TestBuildMonitoring' -count=1
```

Expected: FAIL with undefined `buildMonitoringMitigationSummary` and `buildMonitoringEvaluationReportData`.

- [ ] **Step 3: Add payload structs**

In `backend/internal/domain/entity/report.go`, add:

```go
type MonitoringEvaluationReportData struct {
	Report                 *FormalReport
	Organization           *Organization
	Summary                ReportSummary
	OrganizationName       string
	Year                   string
	SemesterLabel          string
	ReportNumber           string
	ReportDate             string
	AssignmentLetterNumber string
	AssignmentLetterDate   string
	MonitoringDateRange    string
	UnitCode               string
	UnitLocation           string
	UnitAddress            string
	UnitEselonI            string
	UnitLeaderName         string
	DocumentChecklist      []MonitoringEvaluationChecklistRow
	InfrastructureChecklist []MonitoringEvaluationChecklistRow
	ResultChecklist        []MonitoringEvaluationChecklistRow
	MitigationSummary      []MonitoringEvaluationMitigationSummaryRow
}

type MonitoringEvaluationChecklistRow struct {
	No          string
	Item        string
	Yes         bool
	NoChecked   bool
	Condition   string
	Description string
	Analysis    string
}

type MonitoringEvaluationMitigationSummaryRow struct {
	No                         string
	LevelKey                   string
	LevelLabel                 string
	RiskCount                  int
	MitigationPlanCount        int
	MitigationRealizationCount int
	DownCount                  int
	SameCount                  int
	UpCount                    int
	NewCount                   int
	Total                      bool
}
```

Also add `MonitoringEvaluationReport *MonitoringEvaluationReportData` to `KMKFormalReportData`.

- [ ] **Step 4: Implement aggregation helpers**

Create `backend/internal/usecase/formalreport/monitoring_evaluation.go`:

```go
package formalreport

import (
	"fmt"
	"strings"

	"github.com/manris/backend/internal/domain/entity"
)

var monitoringRiskLevels = []struct {
	key   string
	label string
}{
	{entity.RiskLevelSangatTinggi, "Risiko Sangat Tinggi"},
	{entity.RiskLevelTinggi, "Risiko Tinggi"},
	{entity.RiskLevelSedang, "Risiko Sedang"},
	{entity.RiskLevelRendah, "Risiko Rendah"},
	{entity.RiskLevelSangatRendah, "Risiko Sangat Rendah"},
}

func buildMonitoringEvaluationReportData(
	report *entity.FormalReport,
	org *entity.Organization,
	summary entity.ReportSummary,
	risks []*entity.Risk,
) *entity.MonitoringEvaluationReportData {
	period := ""
	if report != nil {
		period = report.Period
	}
	if period == "" {
		period = summary.Cycle
	}
	year, semester := monitoringYearAndSemester(period)
	orgName := ""
	if org != nil {
		orgName = org.Name
	}

	return &entity.MonitoringEvaluationReportData{
		Report:                  report,
		Organization:            org,
		Summary:                 summary,
		OrganizationName:        orgName,
		Year:                    year,
		SemesterLabel:           semester,
		UnitEselonI:             "",
		DocumentChecklist:       buildMonitoringDocumentChecklist(risks),
		InfrastructureChecklist: buildMonitoringInfrastructureChecklist(risks),
		ResultChecklist:         buildMonitoringResultChecklist(risks),
		MitigationSummary:       buildMonitoringMitigationSummary(risks),
	}
}

func monitoringYearAndSemester(period string) (string, string) {
	trimmed := strings.TrimSpace(period)
	parts := strings.Split(trimmed, "-")
	year := trimmed
	semester := ""
	if len(parts) >= 1 {
		year = parts[0]
	}
	if len(parts) >= 2 {
		switch strings.ToUpper(parts[1]) {
		case "H1":
			semester = "SEMESTER I"
		case "H2":
			semester = "SEMESTER II"
		}
	}
	return year, semester
}

func buildMonitoringDocumentChecklist(risks []*entity.Risk) []entity.MonitoringEvaluationChecklistRow {
	riskCount := len(compactRisks(risks))
	mitigationCount := countMonitoringMitigations(risks)
	return []entity.MonitoringEvaluationChecklistRow{
		{No: "1", Item: "Kebijakan yang mendasari penerapan manajemen risiko"},
		{No: "2", Item: "SK tim Penyelenggara Manajemen Risiko"},
		{No: "3", Item: "RAP untuk UPR-T.I, RAK/RSB untuk UPR-T.II"},
		{No: "4", Item: "RKT untuk UPT, Renja K untuk Eselon II dan I (Awal dan Revisi)"},
		{No: "5", Item: "Proses Bisnis / Strategi Maps"},
		{No: "6", Item: "Profil Risiko UPR-T.I/UPR-T.II", Yes: riskCount > 0, Condition: countCondition("Jumlah", riskCount)},
		{No: "7", Item: "Dokumen pengkomunikasian risiko kepada pihak terkait (contoh : pegawai, stakeholder dll)"},
		{No: "8", Item: "Dokumen Rencana Pengendalian/mitigasi dan bukti pelaksanaan", Yes: mitigationCount > 0},
		{No: "9", Item: "Laporan Pelaksanaan Manajemen Risiko (Berkala )", Yes: riskCount > 0},
	}
}

func buildMonitoringInfrastructureChecklist(risks []*entity.Risk) []entity.MonitoringEvaluationChecklistRow {
	riskCount := len(compactRisks(risks))
	mitigationCount := countMonitoringMitigations(risks)
	return []entity.MonitoringEvaluationChecklistRow{
		{No: "1.a.1", Item: "Pemahaman pimpinan sebagai role model dan pemahaman pemilik risiko"},
		{No: "1.a.2", Item: "Menggunakan informasi terkait risiko dalam pengambilan keputusan"},
		{No: "1.a.3", Item: "Pimpinan mendorong penerapan MR dan budaya sadar risiko"},
		{No: "1.b.1", Item: "MR dikelola oleh pegawai yang berkompeten"},
		{No: "1.b.2", Item: "Pegawai mendapatkan kesempatan peningkatan kapasitas SDM dalam MR"},
		{No: "1.b.3", Item: "Memiliki program pelatihan/sertifikasi terkait MR"},
		{No: "1.c", Item: "Kemitraan telah mengidentifikasi, menilai dan mengelola risiko terkait seluruh kemitraan"},
		{No: "1.d", Item: "Proses manajemen risiko telah terintegrasi dengan proses bisnis utama unit kerja"},
		{No: "2.a", Item: "Identifikasi kelemahan lingkungan pengendalian", Yes: riskCount > 0},
		{No: "2.b", Item: "Penilaian Risiko telah dilakukan", Yes: riskCount > 0},
		{No: "2.c", Item: "Rencana mitigasi risiko telah ditetapkan dan dilaksanakan", Yes: mitigationCount > 0},
		{No: "2.d", Item: "Pemantauan berkala pelaksanaan mitigasi telah dilakukan", Yes: riskCount > 0},
		{No: "2.e", Item: "Laporan pemantauan berkala dan laporan akhir pelaksanaan manajemen risiko telah disusun", Yes: riskCount > 0},
	}
}

func buildMonitoringResultChecklist(risks []*entity.Risk) []entity.MonitoringEvaluationChecklistRow {
	mitigationCount := countMonitoringMitigations(risks)
	return []entity.MonitoringEvaluationChecklistRow{
		{No: "1.a", Item: "Aktivitas mitigasi risiko telah dijalankan atau direalisasikan sesuai dengan rencana", Yes: mitigationCount > 0},
		{No: "1.b", Item: "Terjadi kejadian risiko pasca penerapan mitigasi"},
		{No: "1.c", Item: "Aktivitas mitigasi berhasil menurunkan level risiko di bawah garis toleransi risiko", Yes: hasMonitoringDecrease(risks)},
		{No: "2", Item: "Tujuan organisasi dan target kinerja organisasi tercapai"},
	}
}

func buildMonitoringMitigationSummary(risks []*entity.Risk) []entity.MonitoringEvaluationMitigationSummaryRow {
	rows := make([]entity.MonitoringEvaluationMitigationSummaryRow, 0, len(monitoringRiskLevels)+1)
	total := entity.MonitoringEvaluationMitigationSummaryRow{LevelLabel: "Jumlah", Total: true}
	for index, level := range monitoringRiskLevels {
		row := entity.MonitoringEvaluationMitigationSummaryRow{
			No:         fmt.Sprintf("%d", index+1),
			LevelKey:   level.key,
			LevelLabel: level.label,
		}
		for _, risk := range compactRisks(risks) {
			if risk.GetRiskLevel() != level.key {
				continue
			}
			applyRiskToMonitoringSummary(&row, risk)
		}
		addMonitoringSummary(&total, row)
		rows = append(rows, row)
	}
	rows = append(rows, total)
	return rows
}

func applyRiskToMonitoringSummary(row *entity.MonitoringEvaluationMitigationSummaryRow, risk *entity.Risk) {
	row.RiskCount++
	row.MitigationPlanCount += len(risk.Mitigations)
	row.MitigationRealizationCount += len(risk.Mitigations)
	switch monitoringMovement(risk) {
	case "down":
		row.DownCount++
	case "up":
		row.UpCount++
	case "new":
		row.NewCount++
	default:
		row.SameCount++
	}
}

func addMonitoringSummary(total *entity.MonitoringEvaluationMitigationSummaryRow, row entity.MonitoringEvaluationMitigationSummaryRow) {
	total.RiskCount += row.RiskCount
	total.MitigationPlanCount += row.MitigationPlanCount
	total.MitigationRealizationCount += row.MitigationRealizationCount
	total.DownCount += row.DownCount
	total.SameCount += row.SameCount
	total.UpCount += row.UpCount
	total.NewCount += row.NewCount
}

func monitoringMovement(risk *entity.Risk) string {
	if risk == nil || risk.BeforeMonitoringNilai == nil {
		return "new"
	}
	if risk.MonitoringResultNilai == nil {
		return "same"
	}
	switch {
	case *risk.BeforeMonitoringNilai > *risk.MonitoringResultNilai:
		return "down"
	case *risk.BeforeMonitoringNilai < *risk.MonitoringResultNilai:
		return "up"
	default:
		return "same"
	}
}

func countMonitoringMitigations(risks []*entity.Risk) int {
	count := 0
	for _, risk := range compactRisks(risks) {
		count += len(risk.Mitigations)
	}
	return count
}

func hasMonitoringDecrease(risks []*entity.Risk) bool {
	for _, risk := range compactRisks(risks) {
		if monitoringMovement(risk) == "down" {
			return true
		}
	}
	return false
}

func countCondition(label string, count int) string {
	if count == 0 {
		return ""
	}
	return fmt.Sprintf("%s :%d", label, count)
}
```

- [ ] **Step 5: Run aggregation tests and confirm GREEN**

Run:

```bash
go test ./internal/usecase/formalreport -run 'TestBuildMonitoring' -count=1
```

Expected: PASS.

## Task 3: Wire Download Use Case Payload

**Files:**
- Modify: `backend/internal/usecase/formalreport/download.go`
- Modify: `backend/internal/usecase/formalreport/download_test.go`

- [ ] **Step 1: Write failing payload wiring test updates**

In `TestDownloadUseCase_ExecutePopulatesTypeSpecificPayloads`, add:

```go
monitoringID := uuid.MustParse("ffffffff-ffff-ffff-ffff-ffffffffffff")
```

Add a report entry:

```go
monitoringID: &entity.FormalReport{
	ID:             monitoringID,
	OrganizationID: orgID,
	Period:         "2025-H2",
	ReportType:     entity.FormalReportTypeMonitoringEvaluation,
	Status:         entity.FormalReportStatusGenerated,
	GeneratedAt:    &generatedAt,
	Metadata: map[string]any{
		"summary": map[string]any{"riskCount": 1},
	},
},
```

Add the assertion block:

```go
renderer.data = nil
_, err = uc.Execute(context.Background(), DownloadInput{
	ID:    monitoringID,
	Scope: &entity.AccessScope{IsGlobal: true},
})
if err != nil {
	t.Fatalf("Execute(monitoring evaluation) error = %v", err)
}
if renderer.data == nil || renderer.data.MonitoringEvaluationReport == nil {
	t.Fatal("expected monitoring evaluation payload to be populated")
}
if renderer.data.AnnualProfile != nil || renderer.data.ImplementationReport != nil || renderer.data.SupervisionReport != nil || renderer.data.TMPMRReport != nil {
	t.Fatalf("monitoring evaluation payload populated unexpected type-specific fields: %#v", renderer.data)
}
if len(renderer.data.MonitoringEvaluationReport.MitigationSummary) != 6 {
	t.Fatalf("monitoring evaluation mitigation rows = %d, want 6", len(renderer.data.MonitoringEvaluationReport.MitigationSummary))
}
```

- [ ] **Step 2: Run test and confirm RED**

Run:

```bash
go test ./internal/usecase/formalreport -run TestDownloadUseCase_ExecutePopulatesTypeSpecificPayloads -count=1
```

Expected: FAIL because the new type is not routed.

- [ ] **Step 3: Implement download routing**

In `backend/internal/usecase/formalreport/download.go`, update the switch:

```go
case entity.FormalReportTypeMonitoringEvaluation:
	// payload built after data shell via buildMonitoringEvaluationData below
```

After the existing supervision block, add:

```go
if report.ReportType == entity.FormalReportTypeMonitoringEvaluation {
	monitoringReport, err := uc.buildMonitoringEvaluationData(ctx, report, org, summary, input.Scope)
	if err != nil {
		return nil, err
	}
	data.MonitoringEvaluationReport = monitoringReport
}
```

Add helper:

```go
func (uc *DownloadUseCase) buildMonitoringEvaluationData(
	ctx context.Context,
	report *entity.FormalReport,
	org *entity.Organization,
	summary entity.ReportSummary,
	scope *entity.AccessScope,
) (*entity.MonitoringEvaluationReportData, error) {
	if uc.riskRepo == nil {
		return buildMonitoringEvaluationReportData(report, org, summary, nil), nil
	}
	orgIDs := reportScopeOrgIDs(scope, report.OrganizationID)
	risks, err := uc.riskRepo.ListCycleSnapshot(ctx, report.Period, orgIDs)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load monitoring evaluation risk snapshot")
	}
	return buildMonitoringEvaluationReportData(report, org, summary, compactRisks(risks)), nil
}
```

- [ ] **Step 4: Run payload test and confirm GREEN**

Run:

```bash
go test ./internal/usecase/formalreport -run TestDownloadUseCase_ExecutePopulatesTypeSpecificPayloads -count=1
```

Expected: PASS.

## Task 4: Render the Monitoring Evaluation PDF

**Files:**
- Modify: `backend/internal/service/pdfreport/renderer.go`
- Create: `backend/internal/service/pdfreport/monitoring_evaluation.go`
- Create: `backend/internal/service/pdfreport/monitoring_evaluation_test.go`
- Modify: `backend/internal/usecase/formalreport/download_test.go`

- [ ] **Step 1: Add failing renderer route test expectation**

In `TestDownloadUseCase_ExecuteUsesDistinctFormalTemplatesPerType`, add `monitoringID` and a report entry:

```go
monitoringID := uuid.MustParse("ffffffff-ffff-ffff-ffff-ffffffffffff")
```

```go
monitoringID: &entity.FormalReport{
	ID:             monitoringID,
	OrganizationID: orgID,
	Period:         "2025-H2",
	ReportType:     entity.FormalReportTypeMonitoringEvaluation,
	Status:         entity.FormalReportStatusGenerated,
	GeneratedAt:    &generatedAt,
	Metadata: map[string]any{
		"summary": map[string]any{"riskCount": 1},
	},
},
```

Add test case:

```go
{
	name: "monitoring evaluation",
	id:   monitoringID,
	wantContain: []string{
		"LAPORAN HASIL PEMANTAUAN DAN EVALUASI",
		"PENERAPAN MANAJEMEN RISIKO",
		"Kelengkapan dokumen pendukung",
		"Format pemantauan pelaksanaan mitigasi risiko",
	},
	wantNotContain: []string{
		"Ringkasan Profil Risiko Tahunan",
		"Ringkasan Skor TMPMR",
		"Tahapan Proses Penerapan MR",
	},
},
```

- [ ] **Step 2: Run route test and confirm RED**

Run:

```bash
go test ./internal/usecase/formalreport -run TestDownloadUseCase_ExecuteUsesDistinctFormalTemplatesPerType -count=1
```

Expected: FAIL because renderer does not output monitoring evaluation sections.

- [ ] **Step 3: Add report-specific Letter dimensions**

The supplied reference PDF is Letter portrait (`612 x 792 pt`, or `215.9 x 279.4 mm`). Existing formal reports use A4 via global `PageWidth`/`PageHeight`, so do not change those constants.

In `backend/internal/service/pdfreport/renderer.go`, move `reportType` extraction before Maroto config creation:

```go
reportType := ""
if data.Report != nil {
	reportType = data.Report.ReportType
}

pageWidth, pageHeight := formalReportDimensions(reportType)
```

Then update the config:

```go
cfg := config.NewBuilder().
	WithDimensions(pageWidth, pageHeight).
```

Add this helper in the same file:

```go
func formalReportDimensions(reportType string) (float64, float64) {
	if reportType == entity.FormalReportTypeMonitoringEvaluation {
		return 215.9, 279.4
	}
	return PageWidth, PageHeight
}
```

- [ ] **Step 4: Route renderer switch**

In `backend/internal/service/pdfreport/renderer.go`, extend `RenderFormal`:

```go
case entity.FormalReportTypeMonitoringEvaluation:
	r.renderFormalMonitoringEvaluation(m, data)
```

- [ ] **Step 5: Implement dedicated renderer**

Create `backend/internal/service/pdfreport/monitoring_evaluation.go`. Use the existing Maroto imports from `renderer.go`, plus `strconv` and `strings`. Start with these helpers and sections:

```go
package pdfreport

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/johnfercher/maroto/v2/pkg/components/col"
	"github.com/johnfercher/maroto/v2/pkg/components/row"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/consts/align"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontfamily"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontstyle"
	"github.com/johnfercher/maroto/v2/pkg/core"
	"github.com/johnfercher/maroto/v2/pkg/props"
	"github.com/manris/backend/internal/domain/entity"
)

const monitoringFooterText = "Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat elektronik yang diterbitkan oleh Balai Besar Sertifikasi Elektronik (BSrE), Badan Siber dan Sandi Negara (BSSN)."

func (r *pdfReportRenderer) renderFormalMonitoringEvaluation(m core.Maroto, data *entity.KMKFormalReportData) {
	report := data.MonitoringEvaluationReport
	if report == nil {
		report = &entity.MonitoringEvaluationReportData{}
	}
	r.addMonitoringCover(m, report)
	r.addMonitoringNarrative(m, report)
	r.addMonitoringDocumentChecklist(m, report)
	r.addMonitoringInfrastructureChecklist(m, report)
	r.addMonitoringResultChecklist(m, report)
	r.addMonitoringMitigationSection(m, report)
	r.addMonitoringClosing(m, report)
}

func (r *pdfReportRenderer) addMonitoringCover(m core.Maroto, data *entity.MonitoringEvaluationReportData) {
	m.AddRows(row.New(20))
	addMonitoringCenteredText(m, "LAPORAN HASIL PEMANTAUAN DAN EVALUASI", 15, true)
	addMonitoringCenteredText(m, "PENERAPAN MANAJEMEN RISIKO", 15, true)
	m.AddRows(row.New(45))
	addMonitoringCenteredText(m, "PADA", 14, true)
	addMonitoringCenteredText(m, "SATUAN KERJA "+strings.ToUpper(defaultIfEmpty(data.OrganizationName, "")), 14, true)
	addMonitoringCenteredText(m, defaultIfEmpty(data.SemesterLabel, ""), 14, true)
	addMonitoringCenteredText(m, "TAHUN "+defaultIfEmpty(data.Year, ""), 14, true)
	m.AddRows(row.New(55))
	addMonitoringPair(m, "Nomor", data.ReportNumber)
	addMonitoringPair(m, "Tanggal", data.ReportDate)
	m.AddRows(row.New(50))
	rows := [][]string{
		{"Satuan / Unit Kerja", data.OrganizationName},
		{"Tahun Anggaran", data.Year},
		{"Kode", data.UnitCode},
		{"Lokasi", data.UnitLocation},
		{"Unit Eselon I", data.UnitEselonI},
	}
	m.AddRows(RenderTable([]string{"", ""}, rows, []uint{4, 8}, WithFontSize(FontSizeSmall), WithLeftAligned(0, 1))...)
	m.AddRows(row.New(35))
	addMonitoringFooter(m)
}
```

Continue the file with simple paragraph/table helpers:

```go
func (r *pdfReportRenderer) addMonitoringNarrative(m core.Maroto, data *entity.MonitoringEvaluationReportData) {
	m.AddRows(row.New(8))
	addMonitoringParagraph(m, fmt.Sprintf("Yth. Kepala Satuan %s", defaultIfEmpty(data.OrganizationName, "")))
	addMonitoringParagraph(m, "Kementerian Kesehatan")
	addMonitoringParagraph(m, defaultIfEmpty(data.UnitAddress, ""))
	addMonitoringParagraph(m, "")
	addMonitoringParagraph(m, "Sesuai surat tugas tanggal "+defaultIfEmpty(data.AssignmentLetterDate, "")+" nomor "+defaultIfEmpty(data.AssignmentLetterNumber, "")+" kami telah melakukan pemantauan dan evaluasi penerapan Manajemen Risiko dengan hasil sebagai berikut :")
	addMonitoringNumberedSection(m, "1.", "Dasar Pelaksanaan Pemantauan dan Evaluasi", []string{
		"Peraturan Pemerintah Nomor 60 Tahun 2008 tentang Sistem Pengendalian Intern Pemerintah;",
		"Peraturan Menteri Kesehatan Republik Indonesia nomor 84 tahun 2019 tentang Tata Kelola Pengawasan Intern di Lingkungan Kementerian Kesehatan;",
		"Peraturan Menteri Kesehatan Republik Indonesia Nomor 21 Tahun 2024 tentang Organisasi dan Tata Kerja Kementerian Kesehatan;",
		"Keputusan Menteri Kesehatan Nomor 1354 tahun 2024 tentang Penerapan Manajemen Risiko di lingkungan Kementerian Kesehatan;",
		"Keputusan Inspektur Jenderal Nomor HK.02.02/G/432/2025 Tentang pedoman pemantauan dan Evaluasi penerapan Manajemen Risiko.",
	})
	addMonitoringNumberedSection(m, "2.", "Tujuan Pemantauan dan Evaluasi", []string{
		"Memastikan efektivitas pelaksanaan rencana manajemen risiko dalam mencapai tujuan organisasi.",
		"Meningkatkan kualitas pengelolaan risiko melalui identifikasi kelemahan dan rekomendasi perbaikan.",
		"Memberikan keyakinan yang memadai kepada pimpinan atas efektivitas pengendalian intern dan manajemen risiko.",
		"Mendorong perbaikan berkelanjutan dalam menghadapi perubahan lingkungan dan perkembangan risiko.",
		"Menilai tingkat kematangan penerapan manajemen risiko di seluruh unit kerja.",
	})
	addMonitoringNumberedSection(m, "3.", "Sasaran dan ruang lingkup Pemantauan dan Evaluasi", []string{
		"Sasaran pemantauan dan evaluasi adalah penerapan manajemen risiko pada satuan kerja.",
		"Ruang lingkup meliputi infrastruktur manajemen risiko dan hasil kegiatan pengendalian risiko.",
	})
	addMonitoringNumberedSection(m, "4.", "Metodologi Pemantauan dan Evaluasi", []string{
		"Reviu Dokumen.",
		"Wawancara.",
		"Observasi.",
		"Konfirmasi atau Klarifikasi.",
	})
	addMonitoringParagraph(m, "5. Waktu Pemantauan dan Evaluasi")
	addMonitoringParagraph(m, "Pemantauan dan Evaluasi dilaksanakan "+defaultIfEmpty(data.MonitoringDateRange, "-")+".")
	addMonitoringParagraph(m, "6. Susunan Tim Pemantauan dan Evaluasi")
	addMonitoringParagraph(m, "Koordinator :")
	addMonitoringParagraph(m, "Ketua Tim Reviu :")
	addMonitoringParagraph(m, "Anggota Tim Reviu :")
	addMonitoringParagraph(m, "7. Identitas Unit Kerja")
	addMonitoringParagraph(m, "Nama Unit Kerja : "+defaultIfEmpty(data.OrganizationName, ""))
	addMonitoringParagraph(m, "Alamat : "+defaultIfEmpty(data.UnitAddress, ""))
	addMonitoringParagraph(m, "Nama Pimpinan : "+defaultIfEmpty(data.UnitLeaderName, ""))
	addMonitoringFooter(m)
}
```

Add table sections:

```go
func (r *pdfReportRenderer) addMonitoringDocumentChecklist(m core.Maroto, data *entity.MonitoringEvaluationReportData) {
	addMonitoringParagraph(m, "8. Hasil Pemantauan dan Evaluasi")
	addMonitoringParagraph(m, "a. Kelengkapan dokumen pendukung pemantauan dan evaluasi manajemen risiko")
	addMonitoringChecklistTable(m, []string{"No", "Dokumen", "Ya", "Tidak", "Uraian Kondisi", "Keterangan"}, data.DocumentChecklist)
	addMonitoringParagraph(m, "Kesimpulan : Infrastruktur pendukung penerapan manajemen risiko telah lengkap.")
	addMonitoringFooter(m)
}

func (r *pdfReportRenderer) addMonitoringInfrastructureChecklist(m core.Maroto, data *entity.MonitoringEvaluationReportData) {
	addMonitoringParagraph(m, "b. Pengujian atas kecukupan infrastruktur / rancangan proses MR")
	addMonitoringChecklistTable(m, []string{"No", "Infrastruktur", "Ya", "Tidak", "Uraian Kondisi", "Hasil Analisa"}, data.InfrastructureChecklist)
	addMonitoringParagraph(m, "Kesimpulan : Infrastruktur pendukung penerapan manajemen risiko telah mendukung kerangka kerja manajemen risiko organisasi secara komprehensif.")
	addMonitoringFooter(m)
}

func (r *pdfReportRenderer) addMonitoringResultChecklist(m core.Maroto, data *entity.MonitoringEvaluationReportData) {
	addMonitoringParagraph(m, "c. Pengujian atas hasil pelaksanaan manajemen risiko")
	addMonitoringChecklistTable(m, []string{"No", "Infrastruktur", "Ya", "Tidak", "Uraian Kondisi", "Keterangan"}, data.ResultChecklist)
	addMonitoringParagraph(m, "Kesimpulan : Pelaksanaan manajemen risiko telah efektif.")
	addMonitoringFooter(m)
}
```

Add mitigation section:

```go
func (r *pdfReportRenderer) addMonitoringMitigationSection(m core.Maroto, data *entity.MonitoringEvaluationReportData) {
	addMonitoringParagraph(m, "d. Format pemantauan pelaksanaan mitigasi risiko")
	tableRows := make([][]string, 0, len(data.MitigationSummary))
	for _, item := range data.MitigationSummary {
		tableRows = append(tableRows, []string{
			item.No,
			item.LevelLabel,
			strconv.Itoa(item.RiskCount),
			strconv.Itoa(item.MitigationPlanCount),
			strconv.Itoa(item.MitigationRealizationCount),
			strconv.Itoa(item.DownCount),
			strconv.Itoa(item.SameCount),
			strconv.Itoa(item.UpCount),
			strconv.Itoa(item.NewCount),
		})
	}
	m.AddRows(RenderTable(
		[]string{"No", "Uraian", "Jml Risiko", "Jml Rencana Mitigasi", "Jml Realisasi Mitigasi", "Jml Risiko Turun", "Jml Risiko Menetap", "Jml Risiko Naik", "Jml Risiko Baru"},
		tableRows,
		[]uint{1, 2, 1, 2, 2, 1, 2, 1, 1},
		WithFontSize(FontSizeSmall),
		WithLeftAligned(1),
	)...)
	addMonitoringParagraph(m, "Kesimpulan :")
	for _, item := range data.MitigationSummary {
		if item.Total {
			continue
		}
		addMonitoringParagraph(m, item.LevelLabel)
		addMonitoringParagraph(m, fmt.Sprintf("Jumlah %s sebanyak %d risiko dengan rencana mitigasi sebanyak %d rencana.", strings.ToLower(item.LevelLabel), item.RiskCount, item.MitigationPlanCount))
		addMonitoringParagraph(m, fmt.Sprintf("Jumlah mitigasi risiko yang sudah dilaksanakan sebanyak %d mitigasi.", item.MitigationRealizationCount))
		addMonitoringParagraph(m, fmt.Sprintf("Hasil intervensi risiko menunjukkan risiko yang berhasil diturunkan sebanyak %d risiko, menetap sebanyak %d risiko, dan naik sebanyak %d risiko.", item.DownCount, item.SameCount, item.UpCount))
	}
	addMonitoringFooter(m)
}
```

Add closing and helpers:

```go
func (r *pdfReportRenderer) addMonitoringClosing(m core.Maroto, data *entity.MonitoringEvaluationReportData) {
	addMonitoringParagraph(m, "9. Permasalahan")
	addMonitoringParagraph(m, "-")
	addMonitoringParagraph(m, "10. Saran Perbaikan")
	addMonitoringParagraph(m, "Berdasarkan hasil pemantauan diatas, diharapkan timker dapat memonitoring kembali risiko yang masih menetap dengan memperhatikan kembali pengendalian yang harus dilakukan.")
	addMonitoringParagraph(m, fmt.Sprintf("Kami menyampaikan terima kasih atas bantuan dan kerja sama dari seluruh pejabat/pegawai pada satuan kerja %s atas kesediannya memberikan data/dokumen yang diperlukan, sehingga kegiatan pemantauan dan evaluasi penerapan manajemen risiko ini dapat terlaksana.", defaultIfEmpty(data.OrganizationName, "")))
	addMonitoringParagraph(m, "Demikian Laporan hasil pemantauan dan evaluasi penerapan manajemen risiko ini disampaikan, atas perhatian dan kerjasamanya diucapkan terima kasih.")
	m.AddRows(row.New(12))
	signatureRows := [][]string{
		{"Kepala "+defaultIfEmpty(data.OrganizationName, ""), "Ketua SKI,"},
		{"", ""},
		{"", ""},
		{"NIP.", "NIP."},
		{"", "Tim Reviu,"},
		{"", ""},
		{"", "NIP."},
	}
	m.AddRows(RenderTable([]string{"", ""}, signatureRows, []uint{6, 6}, WithFontSize(FontSizeBody), WithLeftAligned(0, 1))...)
	addMonitoringFooter(m)
}

func addMonitoringChecklistTable(m core.Maroto, headers []string, rows []entity.MonitoringEvaluationChecklistRow) {
	tableRows := make([][]string, 0, len(rows))
	for _, item := range rows {
		yes := ""
		if item.Yes {
			yes = "√"
		}
		no := ""
		if item.NoChecked {
			no = "√"
		}
		tableRows = append(tableRows, []string{item.No, item.Item, yes, no, item.Condition, firstNonEmpty(item.Description, item.Analysis)})
	}
	m.AddRows(RenderTable(headers, tableRows, []uint{1, 5, 1, 1, 3, 5}, WithFontSize(FontSizeSmall), WithLeftAligned(1, 4, 5))...)
}

func addMonitoringCenteredText(m core.Maroto, value string, size float64, bold bool) {
	style := fontstyle.Normal
	if bold {
		style = fontstyle.Bold
	}
	itemRow := row.New(size + 4)
	itemRow.Add(col.New(gridSize).Add(text.New(value, props.Text{Size: size, Align: align.Center, Style: style, Family: fontfamily.Arial, Color: BlackColor})))
	m.AddRows(itemRow)
}

func addMonitoringParagraph(m core.Maroto, value string) {
	itemRow := row.New(8)
	itemRow.Add(col.New(gridSize).Add(text.New(value, props.Text{Size: FontSizeBody, Align: align.Left, Family: fontfamily.Arial, Color: BlackColor})))
	m.AddRows(itemRow)
}

func addMonitoringPair(m core.Maroto, label, value string) {
	itemRow := row.New(8)
	itemRow.Add(col.New(2).Add(text.New(label, props.Text{Size: FontSizeBody, Align: align.Left, Family: fontfamily.Arial})))
	itemRow.Add(col.New(1).Add(text.New(":", props.Text{Size: FontSizeBody, Align: align.Center, Family: fontfamily.Arial})))
	itemRow.Add(col.New(9).Add(text.New(value, props.Text{Size: FontSizeBody, Align: align.Left, Family: fontfamily.Arial})))
	m.AddRows(itemRow)
}

func addMonitoringNumberedSection(m core.Maroto, number, title string, items []string) {
	addMonitoringParagraph(m, number+" "+title)
	for index, item := range items {
		addMonitoringParagraph(m, fmt.Sprintf("%c. %s", 'a'+index, item))
	}
}

func addMonitoringFooter(m core.Maroto) {
	m.AddRows(row.New(6))
	footerRow := row.New(8)
	footerRow.Add(col.New(gridSize).Add(text.New(monitoringFooterText, props.Text{Size: 8, Align: align.Center, Family: fontfamily.Arial, Color: BlackColor})))
	m.AddRows(footerRow)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
```

- [ ] **Step 6: Add renderer smoke test**

Create `backend/internal/service/pdfreport/monitoring_evaluation_test.go`:

```go
package pdfreport

import (
	"bytes"
	"context"
	"testing"

	"github.com/manris/backend/internal/domain/entity"
)

func TestRenderFormalMonitoringEvaluationReport(t *testing.T) {
	renderer := NewPDFReportRenderer()
	data := &entity.KMKFormalReportData{
		Report: &entity.FormalReport{ReportType: entity.FormalReportTypeMonitoringEvaluation, Period: "2025-H2"},
		MonitoringEvaluationReport: &entity.MonitoringEvaluationReportData{
			OrganizationName: "Balai Contoh",
			Year:             "2025",
			SemesterLabel:    "SEMESTER II",
			DocumentChecklist: []entity.MonitoringEvaluationChecklistRow{
				{No: "1", Item: "Kebijakan yang mendasari penerapan manajemen risiko"},
			},
			InfrastructureChecklist: []entity.MonitoringEvaluationChecklistRow{
				{No: "1.a", Item: "Kepemimpinan"},
			},
			ResultChecklist: []entity.MonitoringEvaluationChecklistRow{
				{No: "1", Item: "Efektifitas aktivitas penanganan risiko"},
			},
			MitigationSummary: []entity.MonitoringEvaluationMitigationSummaryRow{
				{No: "1", LevelLabel: "Risiko Sangat Tinggi", RiskCount: 1},
				{LevelLabel: "Jumlah", RiskCount: 1, Total: true},
			},
		},
	}

	bytesOut, err := renderer.RenderFormal(context.Background(), data)
	if err != nil {
		t.Fatalf("RenderFormal() error = %v", err)
	}
	if len(bytesOut) == 0 {
		t.Fatal("expected non-empty PDF bytes")
	}
	if !bytes.Contains(bytesOut, []byte("LAPORAN HASIL PEMANTAUAN DAN EVALUASI")) {
		t.Fatal("PDF bytes missing monitoring evaluation title")
	}
}
```

- [ ] **Step 7: Run renderer and route tests**

Run:

```bash
go test ./internal/service/pdfreport ./internal/usecase/formalreport -run 'TestRenderFormalMonitoringEvaluationReport|TestDownloadUseCase_ExecuteUsesDistinctFormalTemplatesPerType' -count=1
```

Expected: PASS.

## Task 5: Add Frontend Report Type and Card

**Files:**
- Modify: `frontend/src/types/formal-report.ts`
- Create: `frontend/src/lib/formal-report-definitions.ts`
- Create: `frontend/src/lib/formal-report-definitions.test.ts`
- Modify: `frontend/src/app/(app)/reports/formal/page.tsx`

- [ ] **Step 1: Write failing frontend definition test**

Create `frontend/src/lib/formal-report-definitions.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { formalReportDefinitions } from "./formal-report-definitions.ts";

test("formalReportDefinitions includes monitoring evaluation report", () => {
  const item = formalReportDefinitions.find(
    (definition) => definition.reportType === "monitoring_evaluation_report",
  );

  assert.ok(item, "expected monitoring evaluation report definition");
  assert.equal(item.title, "Laporan Hasil Pemantauan dan Evaluasi MR");
});
```

- [ ] **Step 2: Run frontend test and confirm RED**

Run:

```bash
cd frontend
node --test --experimental-specifier-resolution=node src/lib/formal-report-definitions.test.ts
```

Expected: FAIL because `formal-report-definitions.ts` does not exist.

- [ ] **Step 3: Add frontend type literal**

In `frontend/src/types/formal-report.ts`, extend `FormalReportType`:

```ts
| "monitoring_evaluation_report";
```

- [ ] **Step 4: Create centralized definitions**

Create `frontend/src/lib/formal-report-definitions.ts`:

```ts
import type { FormalReportType } from "@/types/formal-report";

export const formalReportDefinitions: Array<{
  reportType: FormalReportType;
  title: string;
  description: string;
}> = [
  {
    reportType: "annual_risk_profile",
    title: "Profil Risiko Tahunan",
    description: "Ringkasan profil risiko organisasi untuk periode tahunan.",
  },
  {
    reportType: "semiannual_mr_implementation",
    title: "Laporan Penerapan MR Semesteran",
    description: "Rekap penerapan manajemen risiko pada semester berjalan.",
  },
  {
    reportType: "semiannual_mr_supervision",
    title: "Laporan Pengawasan MR Semesteran",
    description: "Ringkasan pengawasan manajemen risiko oleh fungsi pengawas.",
  },
  {
    reportType: "tmpmr_report",
    title: "Laporan TMPMR",
    description: "Output resmi penilaian maturitas manajemen risiko.",
  },
  {
    reportType: "monitoring_evaluation_report",
    title: "Laporan Hasil Pemantauan dan Evaluasi MR",
    description: "Laporan resmi hasil pemantauan dan evaluasi penerapan manajemen risiko per unit.",
  },
];
```

- [ ] **Step 5: Use centralized definitions in the Formal Reports page**

In `frontend/src/app/(app)/reports/formal/page.tsx`, remove the local `formalReportDefinitions` constant and add:

```ts
import { formalReportDefinitions } from "@/lib/formal-report-definitions";
```

Keep the existing `FormalReportType` type import because page state still uses it.

- [ ] **Step 6: Run frontend test and build check**

Run:

```bash
cd frontend
node --test --experimental-specifier-resolution=node src/lib/formal-report-definitions.test.ts
npm run build
```

Expected: test PASS and build PASS.

## Task 6: Full Verification and Commit

**Files:**
- All files changed in Tasks 1-5.

- [ ] **Step 1: Run backend focused tests**

Run:

```bash
cd backend
go test ./internal/domain/entity ./internal/usecase/formalreport ./internal/service/pdfreport -count=1
```

Expected: PASS.

- [ ] **Step 2: Run frontend tests**

Run:

```bash
cd frontend
npm test
```

Expected: PASS with all tests passing.

- [ ] **Step 3: Run frontend build**

Run:

```bash
cd frontend
npm run build
```

Expected: PASS.

- [ ] **Step 4: Check git diff**

Run:

```bash
git diff --stat
git status --short
```

Expected: only intended backend/frontend/report plan files are changed, plus pre-existing unrelated worktree files remain untouched.

- [ ] **Step 5: Commit implementation**

Stage only implementation files:

```bash
git add \
  backend/internal/domain/entity/formal_report.go \
  backend/internal/domain/entity/formal_report_test.go \
  backend/internal/domain/entity/report.go \
  backend/internal/usecase/formalreport/helpers.go \
  backend/internal/usecase/formalreport/generate_test.go \
  backend/internal/usecase/formalreport/download.go \
  backend/internal/usecase/formalreport/download_test.go \
  backend/internal/usecase/formalreport/monitoring_evaluation.go \
  backend/internal/usecase/formalreport/monitoring_evaluation_test.go \
  backend/internal/service/pdfreport/renderer.go \
  backend/internal/service/pdfreport/monitoring_evaluation.go \
  backend/internal/service/pdfreport/monitoring_evaluation_test.go \
  frontend/src/types/formal-report.ts \
  frontend/src/lib/formal-report-definitions.ts \
  frontend/src/lib/formal-report-definitions.test.ts \
  frontend/src/app/\(app\)/reports/formal/page.tsx
git commit -m "feat: add monitoring evaluation report export"
```

Expected: commit succeeds.
