# AI Document Intelligence MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a stateless AI Document Intelligence MVP that turns PDF/XLSX ministry documents into reviewable risk, objective, audit finding, and mitigation reporting suggestions.

**Architecture:** Add one reusable backend document text extraction service, one clean architecture AI use case, one multipart AI endpoint, and one frontend workspace at `/intelligence/document`. Results are preview-only; users manually apply suggestions through existing risk, risk objective, and mitigation task reporting flows.

**Tech Stack:** Go 1.26, Fiber, Clean Architecture, existing OpenAI repository, `pdftotext`, `excelize`, Next.js 16, React 19, TypeScript, shadcn/ui, lucide-react.

---

## Locked MVP Decisions

- Supported inputs: PDF and XLSX.
- Not supported in MVP: DOCX, OCR/scanned PDFs, image evidence.
- Persistence: stateless preview only, no new database tables.
- Apply behavior: prefill existing forms/dialogs, user saves manually.
- Excluded flows: incident, approval, and KRI.
- AI must always return confidence and source quotes for review.

## File Map

- Create `backend/internal/service/documenttext/documenttext.go`: reusable PDF/XLSX text extraction.
- Create `backend/internal/service/documenttext/documenttext_test.go`: extractor tests.
- Create `backend/internal/domain/entity/ai_document.go`: shared request/result structs.
- Modify `backend/internal/domain/repository/ai.go`: add document analysis method.
- Modify `backend/internal/repository/openai/ai.go`: implement mode-specific document prompts.
- Create `backend/internal/repository/openai/ai_document_test.go`: prompt and response parsing tests.
- Create `backend/internal/usecase/ai/document_intelligence.go`: clean architecture use case.
- Create `backend/internal/usecase/ai/document_intelligence_test.go`: use case tests.
- Modify `backend/internal/handler/http/ai.go`: add multipart handler and remove local PDF helper duplication.
- Modify `backend/internal/bootstrap/bootstrap.go`: wire new use case.
- Modify `backend/cmd/server/main.go`: add route and constructor argument.
- Create `frontend/src/types/document-intelligence.ts`: frontend contract types.
- Create `frontend/src/lib/api/document-intelligence.ts`: API client.
- Create `frontend/src/lib/document-intelligence-prefill.ts`: one-time prefill tokens.
- Create `frontend/src/lib/document-intelligence-prefill.test.ts`: prefill tests.
- Create `frontend/src/app/(app)/intelligence/document/page.tsx`: workspace UI.
- Modify `frontend/src/components/app-sidebar.tsx`: add navigation.
- Modify `frontend/src/app/(app)/risk/register/new/page.tsx`: consume risk prefill.
- Modify `frontend/src/app/(app)/management/objectives/[id]/page.tsx`: consume objective prefill.
- Modify `frontend/src/components/shared/mitigation-progress-tab.tsx`: allow optional AI report draft prefill.

---

### Task 1: Create Reusable Document Text Extraction Service

**Files:**
- Create: `backend/internal/service/documenttext/documenttext.go`
- Create: `backend/internal/service/documenttext/documenttext_test.go`
- Modify: `backend/internal/handler/http/ai.go`

- [x] **Step 1: Write extractor tests first**

Create tests covering XLSX extraction, unsupported extensions, empty text, and truncation.

```go
package documenttext

import (
	"bytes"
	"mime/multipart"
	"strings"
	"testing"

	"github.com/xuri/excelize/v2"
)

func TestExtractXLSXIncludesSheetAndRows(t *testing.T) {
	f := excelize.NewFile()
	sheet := f.GetSheetName(0)
	_ = f.SetCellValue(sheet, "A1", "Risiko")
	_ = f.SetCellValue(sheet, "B1", "Mitigasi")
	_ = f.SetCellValue(sheet, "A2", "Keterlambatan laporan")
	_ = f.SetCellValue(sheet, "B2", "Checklist mingguan")
	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		t.Fatal(err)
	}

	result, err := Extract(ExtractInput{
		Filename: "monitoring.xlsx",
		Content:  buf.Bytes(),
		MaxChars: 60000,
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(result.Text, "Sheet: Sheet1 | Row 2") {
		t.Fatalf("expected row marker, got %q", result.Text)
	}
	if !strings.Contains(result.Text, "Keterlambatan laporan") {
		t.Fatalf("expected cell text, got %q", result.Text)
	}
}

func TestExtractRejectsUnsupportedExtension(t *testing.T) {
	_, err := Extract(ExtractInput{Filename: "doc.txt", Content: []byte("abc"), MaxChars: 60000})
	if err == nil {
		t.Fatal("expected unsupported extension error")
	}
}

func TestTruncateAddsWarning(t *testing.T) {
	result := truncateText("abcdef", 3)
	if result.Text != "abc" {
		t.Fatalf("Text = %q, want abc", result.Text)
	}
	if len(result.Warnings) != 1 {
		t.Fatalf("expected warning, got %v", result.Warnings)
	}
}

func newFileHeader(t *testing.T, filename string, body []byte) *multipart.FileHeader {
	t.Helper()
	var b bytes.Buffer
	w := multipart.NewWriter(&b)
	part, err := w.CreateFormFile("file", filename)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write(body); err != nil {
		t.Fatal(err)
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	return &multipart.FileHeader{Filename: filename, Size: int64(len(body))}
}
```

- [x] **Step 2: Run failing tests**

Run:

```bash
cd backend
go test ./internal/service/documenttext
```

Expected: FAIL because `documenttext` package does not exist.

- [x] **Step 3: Implement extractor service**

Create `documenttext.go` with:

```go
package documenttext

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/manris/backend/internal/domain/errors"
	"github.com/xuri/excelize/v2"
)

const DefaultMaxChars = 60000

type ExtractInput struct {
	Filename string
	Content  []byte
	MaxChars int
}

type ExtractResult struct {
	Text     string   `json:"text"`
	Length   int      `json:"textLength"`
	Warnings []string `json:"warnings"`
}

func Extract(input ExtractInput) (*ExtractResult, error) {
	ext := strings.ToLower(filepath.Ext(input.Filename))
	var text string
	var err error
	switch ext {
	case ".pdf":
		text, err = extractPDF(input.Content)
	case ".xlsx", ".xls":
		text, err = extractXLSX(input.Content)
	default:
		return nil, errors.ErrInvalidFileType
	}
	if err != nil {
		return nil, err
	}
	text = strings.TrimSpace(text)
	if text == "" {
		return nil, errors.ErrDocumentUnreadable
	}
	return truncateText(text, input.MaxChars), nil
}

func truncateText(text string, maxChars int) *ExtractResult {
	if maxChars <= 0 {
		maxChars = DefaultMaxChars
	}
	runes := []rune(text)
	result := &ExtractResult{Text: text, Length: len(runes)}
	if len(runes) > maxChars {
		result.Text = string(runes[:maxChars])
		result.Warnings = append(result.Warnings, fmt.Sprintf("Document text was truncated to %d characters for AI analysis.", maxChars))
	}
	return result
}

func extractPDF(content []byte) (string, error) {
	tmpFile, err := os.CreateTemp("", "document-intelligence-*.pdf")
	if err != nil {
		return "", errors.Wrap(err, "failed to prepare temporary PDF")
	}
	tmpPath := tmpFile.Name()
	defer os.Remove(tmpPath)
	if _, err := tmpFile.Write(content); err != nil {
		_ = tmpFile.Close()
		return "", errors.Wrap(err, "failed to write temporary PDF")
	}
	if err := tmpFile.Close(); err != nil {
		return "", errors.Wrap(err, "failed to close temporary PDF")
	}
	cmd := exec.Command("pdftotext", "-layout", "-enc", "UTF-8", tmpPath, "-")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", errors.Wrap(err, fmt.Sprintf("failed to extract PDF text: %s", string(output)))
	}
	return string(output), nil
}

func extractXLSX(content []byte) (string, error) {
	f, err := excelize.OpenReader(bytes.NewReader(content))
	if err != nil {
		return "", errors.Wrap(err, "failed to read spreadsheet")
	}
	defer f.Close()
	var b strings.Builder
	for _, sheet := range f.GetSheetList() {
		rows, err := f.GetRows(sheet)
		if err != nil {
			continue
		}
		for i, row := range rows {
			cells := make([]string, 0, len(row))
			for _, cell := range row {
				cell = strings.TrimSpace(cell)
				if cell != "" {
					cells = append(cells, cell)
				}
			}
			if len(cells) == 0 {
				continue
			}
			b.WriteString(fmt.Sprintf("Sheet: %s | Row %d\n%s\n\n", sheet, i+1, strings.Join(cells, " | ")))
		}
	}
	return b.String(), nil
}
```

- [x] **Step 4: Refactor AI handler to use service later**

Leave the existing incident batch endpoint behavior unchanged in this task. In Task 9, remove duplicate PDF helper usage from `ai.go` once the new document endpoint is added.

- [x] **Step 5: Verify and commit**

Run:

```bash
cd backend
go test ./internal/service/documenttext
```

Expected: PASS.

Commit:

```bash
git add backend/internal/service/documenttext
git commit -m "feat: add document text extraction service"
```

---

### Task 2: Add Backend Domain Contracts

**Files:**
- Create: `backend/internal/domain/entity/ai_document.go`
- Test: compile through downstream tests in Task 3 and Task 8

- [x] **Step 1: Add document intelligence entity file**

Create `ai_document.go` with mode constants and result contracts:

```go
package entity

type DocumentAnalysisMode string

const (
	DocumentModeSOPRiskUniverse       DocumentAnalysisMode = "sop_risk_universe"
	DocumentModeAuditFindingMapper    DocumentAnalysisMode = "audit_finding_mapper"
	DocumentModeStrategicObjectiveRisk DocumentAnalysisMode = "strategic_objective_risk"
	DocumentModeMitigationReportMapper DocumentAnalysisMode = "mitigation_report_mapper"
)

func IsValidDocumentAnalysisMode(mode DocumentAnalysisMode) bool {
	switch mode {
	case DocumentModeSOPRiskUniverse, DocumentModeAuditFindingMapper, DocumentModeStrategicObjectiveRisk, DocumentModeMitigationReportMapper:
		return true
	default:
		return false
	}
}

type DocumentAnalysisRequest struct {
	Mode              DocumentAnalysisMode `json:"mode"`
	DocumentText      string               `json:"documentText"`
	Filename          string               `json:"filename"`
	Period            string               `json:"period,omitempty"`
	ExistingRisksJSON string               `json:"existingRisksJson,omitempty"`
	ObjectivesJSON     string               `json:"objectivesJson,omitempty"`
	OpenTasksJSON      string               `json:"openTasksJson,omitempty"`
}

type DocumentSourceRef struct {
	Quote    string `json:"quote"`
	Location string `json:"location,omitempty"`
}

type DocumentRiskSuggestion struct {
	ClientKey            string              `json:"clientKey"`
	Title                string              `json:"title"`
	Description          string              `json:"description"`
	Category             string              `json:"category"`
	RiskSource           string              `json:"riskSource"`
	Cause                []string            `json:"cause"`
	ImpactDesc           []string            `json:"impactDesc"`
	ExistingControl      string              `json:"existingControl,omitempty"`
	ControlGap           string              `json:"controlGap,omitempty"`
	Probability          int                 `json:"probability"`
	Impact               int                 `json:"impact"`
	TreatmentOption      string              `json:"treatmentOption"`
	Mitigations          []Mitigation         `json:"mitigations"`
	Reasoning            string              `json:"reasoning"`
	Confidence           int                 `json:"confidence"`
	SourceRefs           []DocumentSourceRef `json:"sourceRefs"`
	RelatedObjectiveText string              `json:"relatedObjectiveText,omitempty"`
	RelatedIKUText       string              `json:"relatedIkuText,omitempty"`
}

type SOPProcessStageSuggestion struct {
	ClientKey      string                   `json:"clientKey"`
	StageName      string                   `json:"stageName"`
	Description    string                   `json:"description"`
	ExistingControl string                  `json:"existingControl,omitempty"`
	ControlGap     string                  `json:"controlGap,omitempty"`
	Confidence     int                     `json:"confidence"`
	SourceRefs     []DocumentSourceRef     `json:"sourceRefs"`
	SuggestedRisks  []DocumentRiskSuggestion `json:"suggestedRisks"`
}

type SOPRiskUniverseResult struct {
	ProcessStages []SOPProcessStageSuggestion `json:"processStages"`
}

type AuditFindingSuggestion struct {
	ClientKey          string                  `json:"clientKey"`
	FindingTitle       string                  `json:"findingTitle"`
	FindingDescription string                  `json:"findingDescription"`
	RootCause          string                  `json:"rootCause"`
	Impact             string                  `json:"impact"`
	AffectedArea       string                  `json:"affectedArea"`
	MappingStatus      string                  `json:"mappingStatus"`
	ExistingRiskID     string                  `json:"existingRiskId,omitempty"`
	ExistingRiskCode   string                  `json:"existingRiskCode,omitempty"`
	ExistingRiskTitle  string                  `json:"existingRiskTitle,omitempty"`
	SuggestedRisk      *DocumentRiskSuggestion `json:"suggestedRisk,omitempty"`
	Reasoning          string                  `json:"reasoning"`
	Confidence         int                     `json:"confidence"`
	SourceRefs         []DocumentSourceRef     `json:"sourceRefs"`
}

type AuditFindingMapperResult struct {
	Findings []AuditFindingSuggestion `json:"findings"`
}

type StrategicIKUSuggestion struct {
	ClientKey      string                   `json:"clientKey"`
	Name           string                   `json:"name"`
	Target         string                   `json:"target,omitempty"`
	Program        string                   `json:"program,omitempty"`
	Kegiatan       string                   `json:"kegiatan,omitempty"`
	ProcessBusiness string                  `json:"processBusiness,omitempty"`
	Confidence     int                     `json:"confidence"`
	SourceRefs     []DocumentSourceRef     `json:"sourceRefs"`
	SuggestedRisks  []DocumentRiskSuggestion `json:"suggestedRisks"`
}

type StrategicObjectiveSuggestion struct {
	ClientKey   string                   `json:"clientKey"`
	Tujuan      string                   `json:"tujuan"`
	Sasaran     string                   `json:"sasaran"`
	Period      string                   `json:"period,omitempty"`
	Unit        string                   `json:"unit,omitempty"`
	Confidence  int                      `json:"confidence"`
	SourceRefs  []DocumentSourceRef      `json:"sourceRefs"`
	IKUs        []StrategicIKUSuggestion `json:"ikus"`
}

type StrategicObjectiveRiskResult struct {
	Objectives []StrategicObjectiveSuggestion `json:"objectives"`
}

type MitigationTaskReportSuggestion struct {
	ClientKey        string              `json:"clientKey"`
	TaskID           string              `json:"taskId"`
	RiskCode         string              `json:"riskCode"`
	RiskTitle        string              `json:"riskTitle"`
	MitigationAction string              `json:"mitigationAction"`
	PeriodLabel      string              `json:"periodLabel"`
	SuggestedStatus  string              `json:"suggestedStatus"`
	ProgressPct      int                 `json:"progressPct"`
	ActualCost       float64             `json:"actualCost"`
	ReportNotes      string              `json:"reportNotes"`
	Blocker           string              `json:"blocker,omitempty"`
	Reasoning         string              `json:"reasoning"`
	Confidence        int                 `json:"confidence"`
	SourceRefs        []DocumentSourceRef `json:"sourceRefs"`
}

type MitigationReportMapperResult struct {
	TaskMatches []MitigationTaskReportSuggestion `json:"taskMatches"`
}

type DocumentIntelligenceResult struct {
	Mode       DocumentAnalysisMode          `json:"mode"`
	SOP        *SOPRiskUniverseResult         `json:"sop,omitempty"`
	Audit      *AuditFindingMapperResult      `json:"audit,omitempty"`
	Strategic  *StrategicObjectiveRiskResult `json:"strategic,omitempty"`
	Mitigation *MitigationReportMapperResult  `json:"mitigation,omitempty"`
}
```

- [x] **Step 2: Verify compile surface**

Run:

```bash
cd backend
go test ./internal/domain/entity
```

Expected: PASS.

- [x] **Step 3: Commit**

```bash
git add backend/internal/domain/entity/ai_document.go
git commit -m "feat: define document intelligence contracts"
```

---

### Task 3: Extend AI Repository Interface and OpenAI Implementation

**Files:**
- Modify: `backend/internal/domain/repository/ai.go`
- Modify: `backend/internal/repository/openai/ai.go`
- Create: `backend/internal/repository/openai/ai_document_test.go`

- [x] **Step 1: Write prompt builder tests**

Create tests that enforce mode-specific schema fragments:

```go
package openai

import (
	"strings"
	"testing"

	"github.com/manris/backend/internal/domain/entity"
)

func TestBuildDocumentPromptStrategicIncludesHierarchy(t *testing.T) {
	repo := &aiRepository{}
	prompt := repo.buildDocumentIntelligencePrompt(entity.DocumentAnalysisRequest{
		Mode:         entity.DocumentModeStrategicObjectiveRisk,
		DocumentText: "Sasaran meningkatnya deteksi dini. IKU cakupan laporan tepat waktu 90%.",
		Period:       "2026-H1",
	})
	for _, fragment := range []string{`"objectives"`, `"ikus"`, `"suggestedRisks"`, "Risiko harus berada di bawah IKU"} {
		if !strings.Contains(prompt, fragment) {
			t.Fatalf("expected prompt to contain %q", fragment)
		}
	}
}

func TestBuildDocumentPromptMitigationIncludesOpenTasks(t *testing.T) {
	repo := &aiRepository{}
	prompt := repo.buildDocumentIntelligencePrompt(entity.DocumentAnalysisRequest{
		Mode:         entity.DocumentModeMitigationReportMapper,
		DocumentText: "Checklist sudah selesai.",
		OpenTasksJSON: `[{"id":"task-1","riskCode":"R-001","mitigationAction":"Susun checklist"}]`,
	})
	for _, fragment := range []string{`"taskMatches"`, `"progressPct"`, `"reportNotes"`, "Jangan isi evidenceUrl"} {
		if !strings.Contains(prompt, fragment) {
			t.Fatalf("expected prompt to contain %q", fragment)
		}
	}
}
```

- [x] **Step 2: Run failing tests**

```bash
cd backend
go test ./internal/repository/openai -run TestBuildDocumentPrompt
```

Expected: FAIL because prompt builder does not exist.

- [x] **Step 3: Update repository interface**

Add to `AIRepository` in `backend/internal/domain/repository/ai.go`:

```go
AnalyzeDocument(ctx context.Context, req entity.DocumentAnalysisRequest, orgContext string) (*entity.DocumentIntelligenceResult, error)
```

- [x] **Step 4: Implement `AnalyzeDocument` and prompt builder**

Add method to `backend/internal/repository/openai/ai.go`:

```go
func (r *aiRepository) AnalyzeDocument(ctx context.Context, req entity.DocumentAnalysisRequest, orgContext string) (*entity.DocumentIntelligenceResult, error) {
	if r.client == nil {
		return nil, fmt.Errorf("OpenAI client is not configured")
	}
	prompt := r.buildDocumentIntelligencePrompt(req)
	content, err := r.callOpenAI(ctx, prompt, "Anda adalah analis manajemen risiko sektor kesehatan pemerintahan. Kembalikan JSON valid saja tanpa markdown.", "document-intelligence", orgContext)
	if err != nil {
		return nil, err
	}
	var result entity.DocumentIntelligenceResult
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		return nil, fmt.Errorf("failed to parse AI response: %w", err)
	}
	result.Mode = req.Mode
	return &result, nil
}
```

Add `buildDocumentIntelligencePrompt(req)` with four branches. Each branch must include:

```text
Aturan wajib:
- Balas JSON valid tanpa markdown.
- Jangan mengarang kutipan sumber. sourceRefs.quote harus potongan teks yang benar-benar ada di dokumen.
- confidence memakai angka 0 sampai 100.
- Jika data tidak ditemukan, isi string kosong atau array kosong.
- Gunakan bahasa Indonesia formal dan ringkas.
```

- [x] **Step 5: Verify and commit**

Run:

```bash
cd backend
go test ./internal/repository/openai -run TestBuildDocumentPrompt
```

Expected: PASS.

Commit:

```bash
git add backend/internal/domain/repository/ai.go backend/internal/repository/openai/ai.go backend/internal/repository/openai/ai_document_test.go
git commit -m "feat: add OpenAI document intelligence prompts"
```

---

### Task 4: Implement Document Intelligence Use Case

**Files:**
- Create: `backend/internal/usecase/ai/document_intelligence.go`
- Create: `backend/internal/usecase/ai/document_intelligence_test.go`

- [x] **Step 1: Write use case tests**

Cover empty document, invalid mode, mitigation task filtering, and normalization.

```go
package ai

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func TestDocumentIntelligenceRejectsInvalidMode(t *testing.T) {
	uc := NewAnalyzeDocumentIntelligenceUseCase(&fakeDocumentAIRepo{}, &fakeDocumentOrgRepo{}, &fakeDocumentRiskRepo{}, &fakeDocumentObjectiveRepo{}, &fakeDocumentTaskRepo{})
	_, err := uc.Execute(context.Background(), AnalyzeDocumentIntelligenceInput{
		Mode:         "bad_mode",
		DocumentText: "isi dokumen",
	})
	if err == nil {
		t.Fatal("expected invalid input error")
	}
}

func TestNormalizeDocumentRiskSuggestionBoundsScores(t *testing.T) {
	risk := entity.DocumentRiskSuggestion{Probability: 9, Impact: 0, Confidence: 200, Category: "strategis", TreatmentOption: "mitigasi"}
	got := normalizeDocumentRiskSuggestion(risk)
	if got.Probability != 5 {
		t.Fatalf("Probability = %d, want 5", got.Probability)
	}
	if got.Impact != 1 {
		t.Fatalf("Impact = %d, want 1", got.Impact)
	}
	if got.Confidence != 100 {
		t.Fatalf("Confidence = %d, want 100", got.Confidence)
	}
	if got.Category != "kebijakan" {
		t.Fatalf("Category = %q, want kebijakan", got.Category)
	}
}

func TestMitigationModeSendsOnlyOpenTasks(t *testing.T) {
	orgID := uuid.New()
	aiRepo := &fakeDocumentAIRepo{}
	taskRepo := &fakeDocumentTaskRepo{tasks: []*entity.MitigationTask{
		{ID: uuid.New(), Status: "pending", RiskCode: "R-001", RiskTitle: "Risiko 1", MitigationAction: "Aksi 1"},
		{ID: uuid.New(), Status: "done", RiskCode: "R-002", RiskTitle: "Risiko 2", MitigationAction: "Aksi 2"},
	}}
	uc := NewAnalyzeDocumentIntelligenceUseCase(aiRepo, &fakeDocumentOrgRepo{}, &fakeDocumentRiskRepo{}, &fakeDocumentObjectiveRepo{}, taskRepo)
	_, err := uc.Execute(context.Background(), AnalyzeDocumentIntelligenceInput{
		Mode:           entity.DocumentModeMitigationReportMapper,
		DocumentText:   "Aksi 1 telah selesai",
		OrganizationID: &orgID,
	})
	if err != nil {
		t.Fatal(err)
	}
	if aiRepo.lastReq.OpenTasksJSON == "" {
		t.Fatal("expected open tasks context")
	}
	if contains(aiRepo.lastReq.OpenTasksJSON, "R-002") {
		t.Fatalf("done task leaked into context: %s", aiRepo.lastReq.OpenTasksJSON)
	}
}
```

- [x] **Step 2: Run failing tests**

```bash
cd backend
go test ./internal/usecase/ai -run 'TestDocumentIntelligence|TestNormalizeDocument|TestMitigationMode'
```

Expected: FAIL because use case does not exist.

- [x] **Step 3: Implement use case**

Define:

```go
type AnalyzeDocumentIntelligenceUseCase struct {
	aiRepo        repository.AIRepository
	orgRepo       repository.OrganizationRepository
	riskRepo      repository.RiskRepository
	objectiveRepo repository.RiskObjectiveRepository
	taskRepo      repository.MitigationTaskRepository
}

type AnalyzeDocumentIntelligenceInput struct {
	Mode           entity.DocumentAnalysisMode
	DocumentText   string
	Filename       string
	Period         string
	OrganizationID *uuid.UUID
	OrgIDs         []uuid.UUID
}
```

Implement `Execute`:

- Validate mode with `entity.IsValidDocumentAnalysisMode`.
- Reject blank text with `errors.ErrDocumentUnreadable`.
- Load org context with `orgRepo.GetContext` when organization ID exists.
- Load context JSON per mode:
  - SOP and audit: `riskRepo.List(input.OrgIDs, "", "")`.
  - Strategic: risk objectives list plus risk list.
  - Mitigation: `taskRepo.ListAll(input.OrgIDs)` then keep `status != "done"`.
- Call `aiRepo.AnalyzeDocument`.
- Normalize scores, categories, confidence, treatment option.

- [x] **Step 4: Add fake repositories in test file**

Test fakes must implement only methods needed by `document_intelligence.go`. For large interfaces, embed compile-time helper methods returning zero values in the test file.

- [x] **Step 5: Verify and commit**

```bash
cd backend
go test ./internal/usecase/ai -run 'TestDocumentIntelligence|TestNormalizeDocument|TestMitigationMode'
```

Expected: PASS.

Commit:

```bash
git add backend/internal/usecase/ai/document_intelligence.go backend/internal/usecase/ai/document_intelligence_test.go
git commit -m "feat: add document intelligence use case"
```

---

### Task 5: Add Multipart HTTP Endpoint

**Files:**
- Modify: `backend/internal/handler/http/ai.go`
- Modify: `backend/internal/bootstrap/bootstrap.go`
- Modify: `backend/cmd/server/main.go`
- Test: `backend/internal/handler/http/ai_document_test.go`

- [x] **Step 1: Write handler tests**

Test missing file and invalid mode:

```go
func TestAnalyzeDocumentIntelligenceRequiresFile(t *testing.T) {
	app := fiber.New()
	handler := &AIHandler{}
	app.Post("/ai/document-intelligence/analyze", handler.AnalyzeDocumentIntelligence)
	req := httptest.NewRequest("POST", "/ai/document-intelligence/analyze", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}
```

- [x] **Step 2: Run failing tests**

```bash
cd backend
go test ./internal/handler/http -run TestAnalyzeDocumentIntelligence
```

Expected: FAIL because handler method does not exist.

- [x] **Step 3: Extend AIHandler**

Add field:

```go
documentIntelligenceUC *aiuc.AnalyzeDocumentIntelligenceUseCase
```

Add constructor parameter and assignment.

- [x] **Step 4: Implement handler**

Handler behavior:

- Read `file` from multipart request.
- Reject size over 10MB.
- Read file bytes.
- Extract text with `documenttext.Extract`.
- Parse `mode`, `period`, and optional `organizationId`.
- Resolve default organization ID from access scope when form value is absent.
- Call use case.
- Return:

```go
return c.JSON(fiber.Map{"data": fiber.Map{
	"mode": mode,
	"document": fiber.Map{
		"filename": fileHeader.Filename,
		"textLength": extracted.Length,
		"warnings": extracted.Warnings,
	},
	"result": result,
}})
```

- [x] **Step 5: Wire bootstrap and route**

In `bootstrap.Container`, add:

```go
AIDocumentIntelligenceUC *aiuc.AnalyzeDocumentIntelligenceUseCase
```

In `Build`, initialize:

```go
c.AIDocumentIntelligenceUC = aiuc.NewAnalyzeDocumentIntelligenceUseCase(c.AIRepository, c.OrgRepository, c.RiskRepository, c.RiskObjectiveRepository, c.MitigationTaskRepository)
```

In `main.go`, pass the use case to `NewAIHandler`.

Register route:

```go
protected.Post("/ai/document-intelligence/analyze", cleanAIHandler.AnalyzeDocumentIntelligence)
```

- [x] **Step 6: Verify and commit**

```bash
cd backend
go test ./internal/handler/http -run TestAnalyzeDocumentIntelligence
go test ./internal/usecase/ai ./internal/repository/openai ./internal/service/documenttext
```

Expected: PASS.

Commit:

```bash
git add backend/internal/handler/http/ai.go backend/internal/handler/http/ai_document_test.go backend/internal/bootstrap/bootstrap.go backend/cmd/server/main.go
git commit -m "feat: expose document intelligence endpoint"
```

---

### Task 6: Add Frontend Types and API Client

**Files:**
- Create: `frontend/src/types/document-intelligence.ts`
- Create: `frontend/src/lib/api/document-intelligence.ts`

- [x] **Step 1: Add TypeScript contracts**

Create types matching backend JSON:

```ts
import type { RiskMitigation } from "@/types/risk";

export type DocumentAnalysisMode =
  | "sop_risk_universe"
  | "audit_finding_mapper"
  | "strategic_objective_risk"
  | "mitigation_report_mapper";

export interface DocumentSourceRef {
  quote: string;
  location?: string;
}

export interface DocumentRiskSuggestion {
  clientKey: string;
  title: string;
  description: string;
  category: string;
  riskSource: string;
  cause: string[];
  impactDesc: string[];
  existingControl?: string;
  controlGap?: string;
  probability: number;
  impact: number;
  treatmentOption: string;
  mitigations: RiskMitigation[];
  reasoning: string;
  confidence: number;
  sourceRefs: DocumentSourceRef[];
  relatedObjectiveText?: string;
  relatedIkuText?: string;
}
```

Also define `SOPRiskUniverseResult`, `AuditFindingMapperResult`, `StrategicObjectiveRiskResult`, `MitigationReportMapperResult`, and `DocumentIntelligenceAnalyzeResponse`.

- [x] **Step 2: Add API client**

Create:

```ts
import { api } from "@/lib/api";
import type { DocumentIntelligenceAnalyzeResponse } from "@/types/document-intelligence";

export async function analyzeDocumentIntelligence(
  token: string,
  body: FormData,
) {
  return api.postForm<DocumentIntelligenceAnalyzeResponse>(
    "/ai/document-intelligence/analyze",
    body,
    token,
  );
}
```

- [x] **Step 3: Verify frontend typecheck through build later**

No standalone test is required for this task; compile in Task 14.

- [x] **Step 4: Commit**

```bash
git add frontend/src/types/document-intelligence.ts frontend/src/lib/api/document-intelligence.ts
git commit -m "feat: add document intelligence frontend contracts"
```

---

### Task 7: Add One-Time Document Prefill Helper

**Files:**
- Create: `frontend/src/lib/document-intelligence-prefill.ts`
- Create: `frontend/src/lib/document-intelligence-prefill.test.ts`

- [x] **Step 1: Write tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";

const lib = await import(new URL("./document-intelligence-prefill.ts", import.meta.url).href);

test("document intelligence prefill saves and consumes once", () => {
  const store = new Map<string, string>();
  globalThis.window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    },
  } as unknown as Window & typeof globalThis;

  const token = "token-1";
  lib.saveDocumentIntelligencePrefill(token, {
    target: "risk",
    payload: { title: "Risiko A", description: "Deskripsi A" },
  });

  const first = lib.consumeDocumentIntelligencePrefill(token);
  assert.equal(first?.target, "risk");
  const second = lib.consumeDocumentIntelligencePrefill(token);
  assert.equal(second, null);
});
```

- [x] **Step 2: Run failing test**

```bash
cd frontend
npm run test -- src/lib/document-intelligence-prefill.test.ts
```

Expected: FAIL because helper does not exist.

- [x] **Step 3: Implement helper**

Create:

```ts
export const DOCUMENT_INTELLIGENCE_PREFILL_PREFIX = "manris:document-intelligence-prefill:";
export const DOCUMENT_INTELLIGENCE_PREFILL_PARAM = "documentPrefillToken";

export type DocumentPrefillTarget = "risk" | "objective" | "mitigation-report";

export interface DocumentIntelligencePrefillPayload {
  target: DocumentPrefillTarget;
  payload: Record<string, unknown>;
}

function getStorageKey(token: string) {
  return `${DOCUMENT_INTELLIGENCE_PREFILL_PREFIX}${token}`;
}

export function createDocumentIntelligencePrefillToken() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function saveDocumentIntelligencePrefill(
  token: string,
  payload: DocumentIntelligencePrefillPayload,
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getStorageKey(token), JSON.stringify(payload));
}

export function consumeDocumentIntelligencePrefill(token: string) {
  if (typeof window === "undefined") return null;
  const key = getStorageKey(token);
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  window.localStorage.removeItem(key);
  try {
    return JSON.parse(raw) as DocumentIntelligencePrefillPayload;
  } catch {
    return null;
  }
}
```

- [x] **Step 4: Verify and commit**

```bash
cd frontend
npm run test -- src/lib/document-intelligence-prefill.test.ts
```

Expected: PASS.

Commit:

```bash
git add frontend/src/lib/document-intelligence-prefill.ts frontend/src/lib/document-intelligence-prefill.test.ts
git commit -m "feat: add document intelligence prefill helper"
```

---

### Task 8: Build Document Intelligence Workspace Shell

**Files:**
- Create: `frontend/src/app/(app)/intelligence/document/page.tsx`
- Modify: `frontend/src/components/app-sidebar.tsx`

- [x] **Step 1: Add navigation**

In `app-sidebar.tsx`, import `FileSearch` from `lucide-react` and add item under `AI & Automation`:

```ts
{
  label: "Document Intelligence",
  href: "/intelligence/document",
  icon: FileSearch,
}
```

- [x] **Step 2: Create page state and form**

Page state must include:

```ts
const [mode, setMode] = useState<DocumentAnalysisMode>("sop_risk_universe");
const [file, setFile] = useState<File | null>(null);
const [period, setPeriod] = useState("");
const [organizationId, setOrganizationId] = useState("");
const [loading, setLoading] = useState(false);
const [result, setResult] = useState<DocumentIntelligenceAnalyzeResponse | null>(null);
```

- [x] **Step 3: Add analyze handler**

Implementation shape:

```ts
async function handleAnalyze() {
  if (!token || !file) return;
  const body = new FormData();
  body.set("file", file);
  body.set("mode", mode);
  if (period.trim()) body.set("period", period.trim());
  if (organizationId) body.set("organizationId", organizationId);
  setLoading(true);
  try {
    const response = await analyzeDocumentIntelligence(token, body);
    setResult(response);
    toast.success("Dokumen berhasil dianalisis.");
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Gagal menganalisis dokumen.");
  } finally {
    setLoading(false);
  }
}
```

- [x] **Step 4: Render mode selector**

Modes:

- SOP to Risk Universe
- Audit Finding Mapper
- Strategic Objective Risk
- Mitigation Report Mapper

Use buttons or `Tabs`; keep labels short and readable.

- [x] **Step 5: Render upload controls**

Accept:

```tsx
accept=".pdf,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
```

- [x] **Step 6: Commit shell**

```bash
git add frontend/src/app/\(app\)/intelligence/document/page.tsx frontend/src/components/app-sidebar.tsx
git commit -m "feat: add document intelligence workspace"
```

---

### Task 9: Render SOP and Audit Results

**Files:**
- Modify: `frontend/src/app/(app)/intelligence/document/page.tsx`

- [x] **Step 1: Add shared confidence and source components**

Add local components:

```tsx
function ConfidenceBadge({ value }: { value: number }) {
  const tone = value >= 80 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : value >= 60 ? "text-amber-700 bg-amber-50 border-amber-200" : "text-red-700 bg-red-50 border-red-200";
  return <Badge variant="outline" className={tone}>{value}%</Badge>;
}

function SourceQuoteList({ refs }: { refs?: DocumentSourceRef[] }) {
  if (!refs?.length) return null;
  return (
    <div className="space-y-2">
      {refs.map((ref, index) => (
        <blockquote key={`${ref.quote}-${index}`} className="border-l-2 pl-3 text-xs text-muted-foreground">
          {ref.location ? `${ref.location}: ` : ""}{ref.quote}
        </blockquote>
      ))}
    </div>
  );
}
```

- [x] **Step 2: Render SOP results**

For `result.result.sop?.processStages`, show:

- stage name
- stage description
- existing control
- control gap
- nested risk suggestion cards
- action button for each risk

- [x] **Step 3: Render Audit results**

For `result.result.audit?.findings`, show:

- finding title and description
- root cause
- impact
- mapping status badge
- matched existing risk if present
- suggested new risk if present
- action button only when `suggestedRisk` exists

- [x] **Step 4: Commit**

```bash
git add frontend/src/app/\(app\)/intelligence/document/page.tsx
git commit -m "feat: render SOP and audit document intelligence results"
```

---

### Task 10: Render Strategic Objective and Mitigation Results

**Files:**
- Modify: `frontend/src/app/(app)/intelligence/document/page.tsx`

- [x] **Step 1: Render Strategic hierarchy**

For `result.result.strategic?.objectives`, render:

- Sasaran card
- Tujuan
- Period
- source quotes
- nested IKU rows
- nested risk suggestion cards under each IKU

Add two actions:

- `Gunakan sebagai draft Sasaran & IKU`
- `Gunakan sebagai draft risiko`

- [x] **Step 2: Render Mitigation matches**

For `result.result.mitigation?.taskMatches`, render:

- risk code/title
- mitigation action
- period label
- suggested status
- progress percentage
- report notes
- blocker
- source quotes

- [x] **Step 3: Store mitigation prefill locally**

When clicking `Gunakan sebagai draft laporan`, save payload:

```ts
saveDocumentIntelligencePrefill(token, {
  target: "mitigation-report",
  payload: {
    taskId: match.taskId,
    progressPct: match.progressPct,
    actualCost: match.actualCost,
    notes: match.reportNotes,
  },
});
```

Then navigate user to the risk detail route if `riskId` is later added to the result. For MVP, keep the action as a copy/apply control inside the page until Task 13 wires dialog prefill.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/\(app\)/intelligence/document/page.tsx
git commit -m "feat: render strategic and mitigation document results"
```

---

### Task 11: Add Risk Draft Prefill Application

**Files:**
- Modify: `frontend/src/app/(app)/intelligence/document/page.tsx`
- Modify: `frontend/src/app/(app)/risk/register/new/page.tsx`

- [x] **Step 1: Add create risk draft action in workspace**

Convert a `DocumentRiskSuggestion` into payload:

```ts
function buildRiskPrefill(risk: DocumentRiskSuggestion) {
  return {
    title: risk.title,
    description: [
      risk.description,
      risk.relatedObjectiveText ? `Sasaran terkait: ${risk.relatedObjectiveText}` : "",
      risk.relatedIkuText ? `IKU terkait: ${risk.relatedIkuText}` : "",
      risk.reasoning ? `Alasan AI: ${risk.reasoning}` : "",
    ].filter(Boolean).join("\n\n"),
    category: risk.category,
    source: risk.riskSource,
    probability: risk.probability,
    impact: risk.impact,
    cause: risk.cause,
    impactDesc: risk.impactDesc,
    existingControl: risk.existingControl || "",
    treatmentOption: risk.treatmentOption,
    mitigations: risk.mitigations,
    quote: risk.sourceRefs?.[0]?.quote || "",
  };
}
```

Save it with `target: "risk"` and open `/risk/register/new?documentPrefillToken=${token}`.

- [x] **Step 2: Consume token in risk form**

In `risk/register/new/page.tsx`, import helper and param constant. During create-mode initialization:

- read `documentPrefillToken`
- consume once
- ignore unless payload target is `risk`
- call `form.reset` or `setValue` for:
  - `title`
  - `description`
  - `category`
  - `riskSource`
  - `causes`
  - `impactDesc`
  - `existingControl`
  - `probability`
  - `impact`
  - `treatmentOption`
  - `mitigations`
  - target probability and impact as `Math.max(1, current - 1)`

- [ ] **Step 3: Verify prefill manually**

Start frontend after backend route exists and check risk form fields are filled from a saved token.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/\(app\)/intelligence/document/page.tsx frontend/src/app/\(app\)/risk/register/new/page.tsx
git commit -m "feat: apply document risk suggestions as draft prefill"
```

---

### Task 12: Add Risk Objective Draft Prefill Application

**Files:**
- Modify: `frontend/src/app/(app)/intelligence/document/page.tsx`
- Modify: `frontend/src/app/(app)/management/objectives/[id]/page.tsx`

- [x] **Step 1: Add create objective draft action**

Convert strategic objective + IKU into payload:

```ts
function buildObjectivePrefill(objective: StrategicObjectiveSuggestion, iku: StrategicIKUSuggestion) {
  return {
    period: objective.period || "",
    tujuan: objective.tujuan,
    sasaran: objective.sasaran,
    indikatorKinerjaUtama: iku.name,
    target: iku.target || "",
    program: iku.program || "",
    kegiatan: iku.kegiatan || "",
    processBusiness: iku.processBusiness || "",
  };
}
```

Save with `target: "objective"` and open `/management/objectives/new?documentPrefillToken=${token}`.

- [x] **Step 2: Consume token in objective form**

In `management/objectives/[id]/page.tsx`:

- read token only when `id === "new"`
- consume once
- ignore unless target is `objective`
- merge values into form defaults after organizations load
- leave `organizationId` as current user organization when available; otherwise user chooses it

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\(app\)/intelligence/document/page.tsx frontend/src/app/\(app\)/management/objectives/\[id\]/page.tsx
git commit -m "feat: apply strategic document suggestions to objective drafts"
```

---

### Task 13: Add Mitigation Report Prefill Support

**Files:**
- Modify: `frontend/src/components/shared/mitigation-progress-tab.tsx`
- Modify: `frontend/src/app/(app)/intelligence/document/page.tsx`

- [x] **Step 1: Add optional prop to mitigation tab**

Add prop:

```ts
interface MitigationProgressDraft {
  taskId: string;
  progressPct: number;
  actualCost: number;
  notes: string;
}
```

Extend props:

```ts
aiDraft?: MitigationProgressDraft | null;
onAiDraftConsumed?: () => void;
```

- [x] **Step 2: Auto-open matching task dialog**

After tasks load, if `aiDraft` exists:

- find task by `task.id === aiDraft.taskId`
- call the existing open submit dialog flow
- set `progressPct`, `actualCost`, and `notes`
- keep `evidenceUrl` empty
- call `onAiDraftConsumed`

- [x] **Step 3: Add workspace instruction for mitigation**

Because the Document Intelligence page is not inside a specific risk detail context, show copy:

```text
Buka detail risiko terkait untuk menerapkan draft laporan mitigasi. Evidence URL tetap wajib diisi manual.
```

Also provide a copy-to-clipboard button for notes and progress in MVP if direct navigation lacks `riskId`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/shared/mitigation-progress-tab.tsx frontend/src/app/\(app\)/intelligence/document/page.tsx
git commit -m "feat: support AI mitigation report draft prefill"
```

---

### Task 14: Backend Verification

**Files:**
- No source changes unless tests expose defects.

- [x] **Step 1: Run targeted backend tests**

```bash
cd backend
go test ./internal/service/documenttext
go test ./internal/repository/openai
go test ./internal/usecase/ai
go test ./internal/handler/http
```

Expected: all PASS.

- [x] **Step 2: Run full backend suite**

```bash
cd backend
go test ./...
```

Expected: PASS.

- [x] **Step 3: Fix failures within scope**

Allowed fixes:

- compile errors from interface changes
- test fakes missing new `AnalyzeDocument` method
- route constructor mismatch
- handler import cleanup

Not allowed in this task:

- new product behavior
- database migrations
- automatic create/update from AI results

- [ ] **Step 4: Commit verification fixes**

```bash
git add backend
git commit -m "test: verify document intelligence backend"
```

If no files changed after verification, skip the commit.

---

### Task 15: Frontend Verification

**Files:**
- No source changes unless checks expose defects.

- [x] **Step 1: Run frontend unit tests**

```bash
cd frontend
npm run test
```

Expected: PASS.

- [x] **Step 2: Run lint**

```bash
cd frontend
npm run lint
```

Expected: PASS.

- [x] **Step 3: Run production build**

```bash
cd frontend
npm run build
```

Expected: PASS.

- [ ] **Step 4: Manual browser checks**

Start backend and frontend:

```bash
cd backend
go run ./cmd/server
```

```bash
cd frontend
npm run dev
```

Check:

- `/intelligence/document` loads.
- PDF upload works for SOP mode.
- XLSX upload works for mitigation mode.
- Strategic mode renders Sasaran -> IKU -> risks.
- Audit mode renders findings and mapping status.
- Risk suggestion opens risk form with prefilled fields.
- Strategic objective suggestion opens objective form with prefilled fields.
- Mitigation result displays progress and notes with evidence URL left blank.

- [ ] **Step 5: Commit verification fixes**

```bash
git add frontend
git commit -m "test: verify document intelligence frontend"
```

If no files changed after verification, skip the commit.

---

## Acceptance Checklist

- [ ] User can upload PDF/XLSX in `/intelligence/document`.
- [ ] User can choose one of four modes.
- [ ] SOP mode returns process stages with risk suggestions.
- [ ] Audit mode returns findings with mapping status.
- [ ] Strategic mode returns Sasaran and IKU first, with risks nested under IKU.
- [ ] Mitigation mode uses open mitigation tasks only.
- [ ] Every suggestion displays confidence and source quote.
- [ ] No AI result is saved automatically.
- [ ] Risk draft apply uses prefill and manual save.
- [ ] Objective draft apply uses prefill and manual save.
- [ ] Mitigation report suggestion keeps evidence URL manual.
- [ ] Incident, approval, and KRI are not part of this flow.

---

## Execution Notes

- Prefer one commit per task.
- Keep the endpoint stateless.
- Do not add migrations for MVP.
- Do not add DOCX or OCR in this implementation branch.
- If OpenAI returns malformed JSON, return a standard API error rather than trying to save partial data.
