# Risk Detail Final PDF Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a server-side PDF export for finalized risk detail records and expose it from the existing risk detail route.

**Architecture:** Add a dedicated backend export use case plus PDF renderer entry point so the PDF is generated from persisted final risk data, then expose it through a new authenticated risk endpoint. Keep frontend changes thin: a download helper plus one `Export PDF` action on the current detail page at `/risk/register/new?id=...`.

**Tech Stack:** Go, Fiber, existing clean-architecture risk use cases, existing `pdfreport` service, Next.js 16, TypeScript, existing authenticated fetch helpers.

---

## File Map

### Backend

- Modify: `backend/internal/handler/http/risk.go`
  - Add handler dependency for risk PDF export.
  - Add `ExportRiskPDF` HTTP method.
- Modify: `backend/cmd/server/main.go`
  - Register `GET /api/v1/risks/:id/export-pdf`.
  - Pass the new use case into `NewRiskHandler`.
- Modify: `backend/internal/bootstrap/bootstrap.go`
  - Wire the new risk PDF export use case with the risk repository and PDF renderer.
- Create: `backend/internal/usecase/risk/export_pdf.go`
  - Read-only use case for access validation, final-status validation, view-model mapping, and renderer invocation.
- Create: `backend/internal/usecase/risk/export_pdf_test.go`
  - Unit tests for success, forbidden, not found, and non-final status.
- Create: `backend/internal/domain/entity/risk_export.go`
  - PDF-specific view model types for risk detail export.
- Modify: `backend/internal/domain/service/report.go`
  - Add an interface for risk detail PDF rendering if one does not already exist.
- Modify: `backend/internal/service/pdfreport/renderer.go`
  - Route new risk detail render entry point.
- Create: `backend/internal/service/pdfreport/risk_detail.go`
  - Formal A4 layout logic for risk detail PDF.
- Create: `backend/internal/service/pdfreport/risk_detail_test.go`
  - Smoke and content tests for risk detail PDF rendering.

### Frontend

- Create: `frontend/src/lib/api/risk-export-pdf.ts`
  - Authenticated file download helper for risk detail PDF.
- Modify: `frontend/src/app/(app)/risk/register/new/page.tsx`
  - Add `Export PDF` button and loading/error handling near the current detail actions.

### Verification

- Run backend focused tests for the new use case and PDF renderer.
- Run frontend lint for touched files.

---

### Task 1: Define Backend Export View Model and Use Case

**Files:**
- Create: `backend/internal/domain/entity/risk_export.go`
- Create: `backend/internal/usecase/risk/export_pdf.go`
- Create: `backend/internal/usecase/risk/export_pdf_test.go`

- [ ] **Step 1: Write the failing use case tests**

```go
package risk

import (
	"bytes"
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

func TestExportRiskPDFUseCase_Execute_Success(t *testing.T) {
	riskID := uuid.New()
	orgID := uuid.New()

	repo := &stubRiskRepository{
		riskByID: &entity.Risk{
			ID:             riskID,
			Status:         entity.RiskStatusApproved,
			OrganizationID: &orgID,
			Title:          "Keterlambatan pengadaan vaksin",
		},
	}
	renderer := &stubRiskPDFRenderer{
		bytesOut: []byte("%PDF-1.4 fake risk export"),
	}

	uc := NewExportRiskPDFUseCase(repo, renderer)
	result, err := uc.Execute(context.Background(), ExportRiskPDFInput{
		ID:     riskID,
		OrgIDs: []uuid.UUID{orgID},
	})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}
	if result == nil || !bytes.Equal(result.Bytes, []byte("%PDF-1.4 fake risk export")) {
		t.Fatalf("unexpected result = %#v", result)
	}
	if renderer.data == nil || renderer.data.Title != "Keterlambatan pengadaan vaksin" {
		t.Fatalf("renderer.data = %#v", renderer.data)
	}
}

func TestExportRiskPDFUseCase_Execute_RejectsNonFinalRisk(t *testing.T) {
	riskID := uuid.New()
	orgID := uuid.New()

	repo := &stubRiskRepository{
		riskByID: &entity.Risk{
			ID:             riskID,
			Status:         entity.RiskStatusDraft,
			OrganizationID: &orgID,
		},
	}

	uc := NewExportRiskPDFUseCase(repo, &stubRiskPDFRenderer{})
	_, err := uc.Execute(context.Background(), ExportRiskPDFInput{
		ID:     riskID,
		OrgIDs: []uuid.UUID{orgID},
	})
	if err == nil || !domainerrors.Is(err, domainerrors.ErrInvalidStatus) {
		t.Fatalf("expected invalid status, got %v", err)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/usecase/risk -run TestExportRiskPDFUseCase -v`
Expected: FAIL with missing `ExportRiskPDFUseCase`, input type, and renderer stubs.

- [ ] **Step 3: Write the export view model**

```go
package entity

import "time"

type RiskDetailPDFData struct {
	Title             string
	Code              string
	Status            string
	OrganizationName  string
	CategoryLabel     string
	RiskSource        string
	AssessmentCycle   string
	Description       string
	Causes            []string
	Impacts           []string
	ExistingControl   string
	ControlEffectiveness string
	Probability       int
	Impact            int
	Weight            float64
	Nilai             float64
	RiskLevelLabel    string
	RiskPriority      int
	RiskAppetite      string
	IsRiskUtamaLabel  string
	TreatmentOption   string
	ReviewSummary     string
	TargetProbability int
	TargetImpact      int
	TargetWeight      float64
	Mitigations       []Mitigation
	CreatedByName     string
	CreatedAt         time.Time
	UpdatedAt         time.Time
}
```

- [ ] **Step 4: Write the minimal use case implementation**

```go
package risk

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type RiskPDFRenderer interface {
	RenderRiskDetail(ctx context.Context, data *entity.RiskDetailPDFData) ([]byte, error)
}

type ExportRiskPDFInput struct {
	ID     uuid.UUID
	OrgIDs []uuid.UUID
}

type ExportRiskPDFResult struct {
	Filename string
	Bytes    []byte
}

type ExportRiskPDFUseCase struct {
	riskRepo  repository.RiskRepository
	renderer  RiskPDFRenderer
}

func NewExportRiskPDFUseCase(riskRepo repository.RiskRepository, renderer RiskPDFRenderer) *ExportRiskPDFUseCase {
	return &ExportRiskPDFUseCase{riskRepo: riskRepo, renderer: renderer}
}

func (uc *ExportRiskPDFUseCase) Execute(ctx context.Context, input ExportRiskPDFInput) (*ExportRiskPDFResult, error) {
	risk, err := uc.riskRepo.GetByID(ctx, input.ID, input.OrgIDs)
	if err != nil {
		return nil, domainerrors.ErrRiskNotFound
	}
	if risk.Status != entity.RiskStatusApproved {
		return nil, domainerrors.Wrap(domainerrors.ErrInvalidStatus, "risk is not finalized")
	}

	data := &entity.RiskDetailPDFData{
		Title:         risk.Title,
		Code:          risk.Code,
		Status:        risk.Status,
		OrganizationName: risk.OrgName,
		Description:   risk.Description,
		Causes:        risk.Cause,
		Impacts:       risk.ImpactDesc,
		Probability:   risk.Probability,
		Impact:        risk.Impact,
		Weight:        risk.Weight,
		Nilai:         risk.EffectiveNilai(),
		RiskPriority:  risk.GetRiskPriority(),
		Mitigations:   risk.Mitigations,
		CreatedByName: risk.CreatedByName,
		CreatedAt:     risk.CreatedAt,
		UpdatedAt:     risk.UpdatedAt,
	}

	bytesOut, err := uc.renderer.RenderRiskDetail(ctx, data)
	if err != nil {
		return nil, fmt.Errorf("render risk detail pdf: %w", err)
	}
	return &ExportRiskPDFResult{
		Filename: fmt.Sprintf("lampiran-risiko-%s.pdf", risk.Code),
		Bytes:    bytesOut,
	}, nil
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `go test ./internal/usecase/risk -run TestExportRiskPDFUseCase -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/internal/domain/entity/risk_export.go \
  backend/internal/usecase/risk/export_pdf.go \
  backend/internal/usecase/risk/export_pdf_test.go
git commit -m "feat: add risk pdf export use case"
```

### Task 2: Add PDF Renderer for Risk Detail Attachments

**Files:**
- Modify: `backend/internal/domain/service/report.go`
- Modify: `backend/internal/service/pdfreport/renderer.go`
- Create: `backend/internal/service/pdfreport/risk_detail.go`
- Create: `backend/internal/service/pdfreport/risk_detail_test.go`

- [ ] **Step 1: Write the failing renderer tests**

```go
package pdfreport

import (
	"bytes"
	"context"
	"testing"

	"github.com/manris/backend/internal/domain/entity"
)

func TestPDFReportRenderer_RenderRiskDetail_ReturnsPDFBytes(t *testing.T) {
	renderer := NewPDFReportRenderer().(*pdfReportRenderer)
	data := &entity.RiskDetailPDFData{
		Title:            "Gangguan distribusi logistik",
		Code:             "RISK-001",
		Status:           entity.RiskStatusApproved,
		OrganizationName: "Direktorat Surveilans",
		Description:      "Distribusi logistik berpotensi tertunda.",
		Causes:           []string{"Keterlambatan vendor"},
		Impacts:          []string{"Layanan terhambat"},
	}

	bytesOut, err := renderer.RenderRiskDetail(context.Background(), data)
	if err != nil {
		t.Fatalf("RenderRiskDetail() error = %v", err)
	}
	if len(bytesOut) == 0 || !bytes.HasPrefix(bytesOut, []byte("%PDF")) {
		t.Fatalf("expected PDF bytes, got %q", bytesOut[:4])
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/service/pdfreport -run TestPDFReportRenderer_RenderRiskDetail -v`
Expected: FAIL with missing `RenderRiskDetail`.

- [ ] **Step 3: Add renderer interface entry point**

```go
package service

import (
	"context"

	"github.com/manris/backend/internal/domain/entity"
)

type RiskDetailPDFRenderer interface {
	RenderRiskDetail(ctx context.Context, data *entity.RiskDetailPDFData) ([]byte, error)
}
```

- [ ] **Step 4: Implement minimal PDF renderer**

```go
package pdfreport

import (
	"bytes"
	"context"
	"fmt"

	"github.com/jung-kurt/gofpdf"
	"github.com/manris/backend/internal/domain/entity"
)

func (r *pdfReportRenderer) RenderRiskDetail(ctx context.Context, data *entity.RiskDetailPDFData) ([]byte, error) {
	if data == nil {
		return nil, fmt.Errorf("risk detail data is required")
	}

	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(25.4, 25.4, 25.4)
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 14)
	pdf.CellFormat(0, 8, "Lampiran Detail Risiko", "", 1, "C", false, 0, "")
	pdf.SetFont("Arial", "", 11)
	pdf.MultiCell(0, 6.35, data.Title, "", "J", false)
	pdf.Ln(2)
	pdf.CellFormat(0, 6.35, fmt.Sprintf("Kode Risiko: %s", fallbackString(data.Code)), "", 1, "L", false, 0, "")
	pdf.MultiCell(0, 6.35, fmt.Sprintf("Deskripsi Risiko: %s", fallbackString(data.Description)), "", "J", false)
	addBulletSection(pdf, "Sebab", data.Causes)
	addBulletSection(pdf, "Dampak", data.Impacts)

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
```

- [ ] **Step 5: Run tests to verify the renderer passes**

Run: `go test ./internal/service/pdfreport -run TestPDFReportRenderer_RenderRiskDetail -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/internal/domain/service/report.go \
  backend/internal/service/pdfreport/renderer.go \
  backend/internal/service/pdfreport/risk_detail.go \
  backend/internal/service/pdfreport/risk_detail_test.go
git commit -m "feat: add risk detail pdf renderer"
```

### Task 3: Wire Endpoint, Handler, and Dependency Injection

**Files:**
- Modify: `backend/internal/handler/http/risk.go`
- Modify: `backend/internal/bootstrap/bootstrap.go`
- Modify: `backend/cmd/server/main.go`

- [ ] **Step 1: Write the failing handler test**

```go
func TestRiskHandler_ExportRiskPDF(t *testing.T) {
	app := fiber.New()
	handler := &RiskHandler{
		exportPDFUC: &stubExportRiskPDFUseCase{
			result: &riskuc.ExportRiskPDFResult{
				Filename: "lampiran-risiko-RISK-001.pdf",
				Bytes:    []byte("%PDF-1.4 fake"),
			},
		},
	}

	app.Get("/risks/:id/export-pdf", handler.ExportRiskPDF)
	req := httptest.NewRequest(fiber.MethodGet, "/risks/"+uuid.NewString()+"/export-pdf", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("StatusCode = %d, want %d", resp.StatusCode, fiber.StatusOK)
	}
	if got := resp.Header.Get("Content-Type"); got != "application/pdf" {
		t.Fatalf("Content-Type = %q", got)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/handler/http -run TestRiskHandler_ExportRiskPDF -v`
Expected: FAIL with missing handler field or method.

- [ ] **Step 3: Implement handler and route wiring**

```go
type RiskHandler struct {
	// existing fields...
	exportPDFUC *riskuc.ExportRiskPDFUseCase
}

func (h *RiskHandler) ExportRiskPDF(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk ID")
	}

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	result, err := h.exportPDFUC.Execute(c.Context(), riskuc.ExportRiskPDFInput{
		ID:     id,
		OrgIDs: orgIDs,
	})
	if err != nil {
		return handleError(c, err)
	}

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, result.Filename))
	return c.Send(result.Bytes)
}
```

```go
// in main.go route registration
protected.Get("/risks/:id/export-pdf", cleanRiskHandler.ExportRiskPDF)
```

- [ ] **Step 4: Run tests to verify the backend path passes**

Run: `go test ./internal/handler/http -run TestRiskHandler_ExportRiskPDF -v`
Expected: PASS

Run: `go test ./internal/usecase/risk ./internal/service/pdfreport ./internal/handler/http -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/internal/handler/http/risk.go \
  backend/internal/bootstrap/bootstrap.go \
  backend/cmd/server/main.go
git commit -m "feat: expose risk pdf export endpoint"
```

### Task 4: Add Frontend Download Helper and Risk Detail Action

**Files:**
- Create: `frontend/src/lib/api/risk-export-pdf.ts`
- Modify: `frontend/src/app/(app)/risk/register/new/page.tsx`

- [ ] **Step 1: Write the failing frontend helper test**

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { buildRiskPDFExportFilename } from "./risk-export-pdf";

test("buildRiskPDFExportFilename prefers risk code", () => {
  assert.equal(
    buildRiskPDFExportFilename({ code: "RISK-001", id: "abc" }),
    "lampiran-risiko-RISK-001.pdf",
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test frontend/src/lib/api/risk-export-pdf.test.ts`
Expected: FAIL with missing module or function.

- [ ] **Step 3: Write the download helper**

```ts
import { ApiError, API_BASE } from "@/lib/api";
import { downloadBlob } from "@/lib/risk-export";

export function buildRiskPDFExportFilename(input: { code?: string; id: string }) {
  return `lampiran-risiko-${input.code || input.id}.pdf`;
}

export async function downloadRiskDetailPDF(token: string, riskId: string, fallbackFilename: string) {
  const response = await fetch(`${API_BASE}/risks/${riskId}/export-pdf`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ApiError(detail || "Gagal mengunduh PDF risiko.", response.status);
  }

  const blob = await response.blob();
  downloadBlob(blob, fallbackFilename);
}
```

- [ ] **Step 4: Add the detail-page action**

```tsx
const [isExportingPDF, setIsExportingPDF] = useState(false);

const handleExportPDF = async () => {
  if (!token || !riskId) return;

  setIsExportingPDF(true);
  try {
    await downloadRiskDetailPDF(
      token,
      riskId,
      buildRiskPDFExportFilename({ code: riskCode, id: riskId }),
    );
    toast.success("PDF risiko berhasil diunduh.");
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      toast.error("Export PDF hanya tersedia untuk risiko final.");
    } else {
      toast.error("PDF belum berhasil dibuat. Silakan coba lagi.");
    }
  } finally {
    setIsExportingPDF(false);
  }
};

<Button variant="outline" className="gap-2" onClick={handleExportPDF} disabled={isExportingPDF}>
  {isExportingPDF ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
  Export PDF
</Button>
```

- [ ] **Step 5: Run tests and lint**

Run: `node --test frontend/src/lib/api/risk-export-pdf.test.ts`
Expected: PASS

Run: `npm run lint -- 'src/lib/api/risk-export-pdf.ts' 'src/app/(app)/risk/register/new/page.tsx'`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/api/risk-export-pdf.ts \
  frontend/src/lib/api/risk-export-pdf.test.ts \
  frontend/src/app/(app)/risk/register/new/page.tsx
git commit -m "feat: add risk detail pdf download action"
```

### Task 5: Full Verification and Manual Review

**Files:**
- Modify: none
- Test: existing files above

- [ ] **Step 1: Run complete targeted backend verification**

```bash
cd backend
go test ./internal/usecase/risk ./internal/service/pdfreport ./internal/handler/http -v
```

Expected: PASS

- [ ] **Step 2: Run complete targeted frontend verification**

```bash
cd frontend
node --test src/lib/api/risk-export-pdf.test.ts
npm run lint -- 'src/lib/api/risk-export-pdf.ts' 'src/app/(app)/risk/register/new/page.tsx'
```

Expected: PASS

- [ ] **Step 3: Manual export check**

```text
1. Open a finalized risk in /risk/register/new?id=<stored-risk-id>
2. Click Export PDF
3. Confirm downloaded file opens as PDF
4. Confirm title, identity section, justification, and mitigation table render on A4
5. Repeat on a finalized risk with sparse optional fields and verify '-' placeholders render cleanly
```

- [ ] **Step 4: Commit verification notes if any fixture or test support changed**

```bash
git status --short
```

Expected: clean working tree or only intentional follow-up edits

## Self-Review

- Spec coverage:
  - Backend PDF generation from finalized stored risk: covered by Tasks 1-3.
  - Formal A4 document layout and mitigation table: covered by Task 2.
  - Frontend export action on current detail route: covered by Task 4.
  - Error handling and verification: covered by Tasks 3-5.
- Placeholder scan:
  - No `TODO`, `TBD`, or deferred “implement later” markers remain.
- Type consistency:
  - `RiskDetailPDFData`, `ExportRiskPDFUseCase`, `RenderRiskDetail`, and `downloadRiskDetailPDF` are named consistently across later tasks.
