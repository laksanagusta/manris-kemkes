package http

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/middleware"
	aiuc "github.com/manris/backend/internal/usecase/ai"
	"github.com/xuri/excelize/v2"
)

type documentUploadCaptureRepo struct {
	request entity.DocumentAnalysisRequest
	calls   int
}

func (r *documentUploadCaptureRepo) AnalyzeDocument(_ context.Context, request entity.DocumentAnalysisRequest) (*entity.DocumentIntelligenceResult, error) {
	r.request = request
	r.calls++
	return &entity.DocumentIntelligenceResult{SOP: &entity.SOPRiskUniverseResult{}}, nil
}

func TestDocumentUploadKeepsOriginalFilenameOutOfAnalysisRequest(t *testing.T) {
	workbook := excelize.NewFile()
	t.Cleanup(func() { _ = workbook.Close() })
	if err := workbook.SetCellValue("Sheet1", "A1", "Fakta sumber lengkap"); err != nil {
		t.Fatal(err)
	}
	content, err := workbook.WriteToBuffer()
	if err != nil {
		t.Fatal(err)
	}
	capture := &documentUploadCaptureRepo{}
	handler := &AIHandler{documentIntelligenceUC: aiuc.NewAnalyzeDocumentIntelligenceUseCase(capture, nil)}
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals(middleware.AccessScopeKey, &entity.AccessScope{IsGlobal: true})
		return c.Next()
	})
	app.Post("/analyze", handler.AnalyzeDocumentIntelligence)
	const originalFilename = "PRIVATE-IDENTITY-FILENAME.xlsx"
	req, err := newDocumentIntelligenceMultipartRequest("/analyze", originalFilename, "sop_risk_universe", content.Bytes())
	if err != nil {
		t.Fatal(err)
	}
	res, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		t.Fatalf("upload failed: %d", res.StatusCode)
	}
	var response struct {
		Data struct {
			Document struct {
				Filename string `json:"filename"`
			} `json:"document"`
		} `json:"data"`
	}
	if err := json.NewDecoder(res.Body).Decode(&response); err != nil {
		t.Fatal(err)
	}
	if response.Data.Document.Filename != originalFilename {
		t.Fatal("original filename must remain available to the uploader")
	}
	payload, err := json.Marshal(capture.request)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(payload), originalFilename) || !strings.Contains(capture.request.DocumentText, "Fakta sumber lengkap") {
		t.Fatal("analysis leaked upload metadata or lost source text")
	}
	var fields map[string]any
	if err := json.Unmarshal(payload, &fields); err != nil {
		t.Fatal(err)
	}
	if len(fields) != 2 || fields["mode"] != "sop_risk_universe" || fields["documentText"] == nil {
		t.Fatal("risk extraction sent fields beyond source text and mode")
	}
}

func TestAnalyzeDocumentIntelligenceRejectsMissingFile(t *testing.T) {
	handler := &AIHandler{}
	app := fiber.New()
	app.Post("/ai/document-intelligence/analyze", handler.AnalyzeDocumentIntelligence)

	req := httptest.NewRequest(fiber.MethodPost, "/ai/document-intelligence/analyze", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusBadRequest {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 400, got %d: %s", resp.StatusCode, body)
	}
}

func TestAnalyzeDocumentIntelligenceRejectsRemovedModesBeforeExtraction(t *testing.T) {
	for _, mode := range []string{"audit_finding_mapper", "strategic_objective_risk"} {
		t.Run(mode, func(t *testing.T) {
			app := fiber.New()
			app.Post("/analyze", (&AIHandler{}).AnalyzeDocumentIntelligence)
			req, err := newDocumentIntelligenceMultipartRequest("/analyze", "PRIVATE-FILENAME.pdf", mode, []byte("not a real PDF"))
			if err != nil {
				t.Fatal(err)
			}
			res, err := app.Test(req)
			if err != nil {
				t.Fatal(err)
			}
			defer res.Body.Close()
			if res.StatusCode != 400 {
				t.Fatalf("removed mode status = %d, want 400", res.StatusCode)
			}
		})
	}
}

func TestAnalyzeDocumentIntelligenceRejectsInvalidMode(t *testing.T) {
	handler := &AIHandler{}
	app := fiber.New()
	app.Post("/ai/document-intelligence/analyze", handler.AnalyzeDocumentIntelligence)

	req, err := newDocumentIntelligenceMultipartRequest("/ai/document-intelligence/analyze", "test.pdf", "not-a-mode", []byte("%PDF-1.4 fake"))
	if err != nil {
		t.Fatalf("build multipart request: %v", err)
	}

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusBadRequest {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 400, got %d: %s", resp.StatusCode, body)
	}
}

func TestAnalyzeDocumentIntelligenceRejectsUnsupportedFileType(t *testing.T) {
	handler := &AIHandler{}
	app := fiber.New()
	app.Post("/ai/document-intelligence/analyze", handler.AnalyzeDocumentIntelligence)

	req, err := newDocumentIntelligenceMultipartRequest("/ai/document-intelligence/analyze", "notes.txt", "sop_risk_universe", []byte("just text"))
	if err != nil {
		t.Fatalf("build multipart request: %v", err)
	}

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusBadRequest {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 400, got %d: %s", resp.StatusCode, body)
	}
}

func newDocumentIntelligenceMultipartRequest(path, filename, mode string, content []byte, extra ...map[string]string) (*http.Request, error) {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	if filename != "" {
		part, err := writer.CreateFormFile("file", filename)
		if err != nil {
			return nil, err
		}
		if _, err := part.Write(content); err != nil {
			return nil, err
		}
	}
	if mode != "" {
		if err := writer.WriteField("mode", mode); err != nil {
			return nil, err
		}
	}

	for _, fields := range extra {
		for key, value := range fields {
			if err := writer.WriteField(key, value); err != nil {
				return nil, err
			}
		}
	}

	if err := writer.Close(); err != nil {
		return nil, err
	}

	req := httptest.NewRequest(fiber.MethodPost, path, &body)
	req.Header.Set(fiber.HeaderContentType, writer.FormDataContentType())
	return req, nil
}

func TestRiskEventExtractionEnforcesOneMBLimit(t *testing.T) {
	handler := &AIHandler{}
	app := fiber.New()
	app.Post("/analyze", handler.AnalyzeDocumentIntelligence)
	req, err := newDocumentIntelligenceMultipartRequest("/analyze", "events.pdf", "risk_event_extraction", bytes.Repeat([]byte("x"), 1024*1024+1))
	if err != nil {
		t.Fatal(err)
	}
	resp, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != fiber.StatusRequestEntityTooLarge {
		t.Fatalf("status = %d", resp.StatusCode)
	}
}

func TestRiskEventExtractionRequiresAccessScope(t *testing.T) {
	handler := &AIHandler{}
	app := fiber.New()
	app.Post("/analyze", handler.AnalyzeDocumentIntelligence)
	req, err := newDocumentIntelligenceMultipartRequest("/analyze", "events.pdf", "risk_event_extraction", []byte("%PDF-1.4"))
	if err != nil {
		t.Fatal(err)
	}
	resp, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != fiber.StatusForbidden {
		t.Fatalf("status = %d", resp.StatusCode)
	}
}

type documentUploadTaskRepo struct {
	orgIDs []uuid.UUID
	calls  int
}

func (r *documentUploadTaskRepo) ListForDocumentAnalysis(_ context.Context, orgIDs []uuid.UUID, _ int) ([]entity.DocumentMitigationTaskContext, error) {
	r.calls++
	r.orgIDs = orgIDs
	return []entity.DocumentMitigationTaskContext{{ID: uuid.NewString(), RiskCode: "R-001", RiskTitle: "Distribusi terlambat", MitigationAction: "Menguji checklist", PeriodLabel: "2026-Q4"}}, nil
}

func TestDocumentMitigationAutomaticallyUsesAccountOrganizationAndActiveTaskPeriods(t *testing.T) {
	ownOrg, descendant := uuid.New(), uuid.New()
	workbook := excelize.NewFile()
	t.Cleanup(func() { _ = workbook.Close() })
	if err := workbook.SetCellValue("Sheet1", "A1", "Checklist distribusi sudah diuji."); err != nil {
		t.Fatal(err)
	}
	content, err := workbook.WriteToBuffer()
	if err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		name      string
		scope     *entity.AccessScope
		requested string
		status    int
	}{
		{"automatic own unit", &entity.AccessScope{OrganizationID: &ownOrg, AccessibleOrgIDs: []uuid.UUID{ownOrg, descendant}}, "", 200},
		{"own unit supplied by old client", &entity.AccessScope{OrganizationID: &ownOrg, AccessibleOrgIDs: []uuid.UUID{ownOrg, descendant}}, ownOrg.String(), 200},
		{"readable descendant cannot replace account unit", &entity.AccessScope{OrganizationID: &ownOrg, AccessibleOrgIDs: []uuid.UUID{ownOrg, descendant}}, descendant.String(), 403},
		{"global account still uses own unit", &entity.AccessScope{OrganizationID: &ownOrg, IsGlobal: true}, "", 200},
		{"global override rejected", &entity.AccessScope{OrganizationID: &ownOrg, IsGlobal: true}, descendant.String(), 403},
		{"unassigned global account fails closed", &entity.AccessScope{IsGlobal: true}, "", 422},
	} {
		t.Run(tc.name, func(t *testing.T) {
			capture, tasks := &documentUploadCaptureRepo{}, &documentUploadTaskRepo{}
			handler := &AIHandler{documentIntelligenceUC: aiuc.NewAnalyzeDocumentIntelligenceUseCase(capture, tasks)}
			app := fiber.New()
			app.Use(func(c *fiber.Ctx) error { c.Locals(middleware.AccessScopeKey, tc.scope); return c.Next() })
			app.Post("/analyze", handler.AnalyzeDocumentIntelligence)
			request, err := newDocumentIntelligenceMultipartRequest("/analyze", "laporan.xlsx", "mitigation_report_mapper", content.Bytes(), map[string]string{"organizationId": tc.requested, "period": "1999-Q1", "riskCode": "OBSOLETE-FILTER"})
			if err != nil {
				t.Fatal(err)
			}
			response, err := app.Test(request)
			if err != nil {
				t.Fatal(err)
			}
			defer response.Body.Close()
			if response.StatusCode != tc.status {
				t.Fatalf("status = %d, want %d", response.StatusCode, tc.status)
			}
			if tc.status == 200 {
				if len(tasks.orgIDs) != 1 || tasks.orgIDs[0] != ownOrg || capture.request.Period != "2026-Q4" || capture.calls != 1 {
					t.Fatal("automatic account/task scope was not enforced")
				}
			} else if tasks.calls != 0 || capture.calls != 0 {
				t.Fatal("unauthorized or unassigned scope reached context query or AI")
			}
		})
	}
}
