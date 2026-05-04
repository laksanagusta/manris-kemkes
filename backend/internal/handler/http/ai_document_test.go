package http

import (
	"bytes"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

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

func newDocumentIntelligenceMultipartRequest(path, filename, mode string, content []byte) (*http.Request, error) {
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

	if err := writer.Close(); err != nil {
		return nil, err
	}

	req := httptest.NewRequest(fiber.MethodPost, path, &body)
	req.Header.Set(fiber.HeaderContentType, writer.FormDataContentType())
	return req, nil
}
