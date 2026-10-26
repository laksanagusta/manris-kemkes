package http

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"mime/multipart"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/agent"
	"github.com/xuri/excelize/v2"
)

type agentHTTPStub struct {
	AgentApplication
	detailErr  error
	detail     agent.ConversationDetail
	createErr  error
	uploaded   *agent.AttachmentInput
	sendCalls  int
	applyCalls int
	revision   int
	key        string
}

func (s *agentHTTPStub) Detail(context.Context, uuid.UUID, uuid.UUID) (agent.ConversationDetail, error) {
	return s.detail, s.detailErr
}
func (s *agentHTTPStub) CreateConversation(context.Context, uuid.UUID, string) (agent.Conversation, error) {
	return agent.Conversation{}, s.createErr
}
func (s *agentHTTPStub) SendMessage(context.Context, uuid.UUID, uuid.UUID, agent.SendMessageInput) (agent.Run, error) {
	s.sendCalls++
	return agent.Run{ID: uuid.New(), Status: "queued"}, nil
}
func (s *agentHTTPStub) AddAttachment(_ context.Context, _, _ uuid.UUID, input agent.AttachmentInput) (agent.Attachment, error) {
	s.uploaded = &input
	return agent.Attachment{ID: uuid.New(), Name: input.Name, MIMEType: input.MimeType, Size: input.Size}, nil
}
func (s *agentHTTPStub) ApplyProposal(_ context.Context, _, _, _ uuid.UUID, revision int, key string) (agent.Proposal, error) {
	s.applyCalls++
	s.revision, s.key = revision, key
	return agent.Proposal{ID: uuid.New(), Status: "applied", Revision: revision}, nil
}

func agentTestApp(service AgentApplication, authenticated bool) *fiber.App {
	app := fiber.New()
	if authenticated {
		app.Use(func(c *fiber.Ctx) error { c.Locals("userId", uuid.New()); return c.Next() })
	}
	NewAgentHandler(service).RegisterRoutes(app)
	return app
}

func TestAgentHTTPRequiresIdentityAndNeverCachesPrivateResponses(t *testing.T) {
	app := agentTestApp(nil, false)
	response, err := app.Test(httptest.NewRequest("GET", "/agent/conversations", nil))
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if response.StatusCode != 401 || response.Header.Get("Cache-Control") != "no-store" {
		t.Fatalf("status=%d cache=%q", response.StatusCode, response.Header.Get("Cache-Control"))
	}
}

func TestAgentHTTPRejectsUnknownMessageFieldsWithoutExecuting(t *testing.T) {
	service := &agentHTTPStub{}
	app := agentTestApp(service, true)
	req := httptest.NewRequest("POST", "/agent/conversations/"+uuid.NewString()+"/messages", strings.NewReader(`{"content":"buat mitigasi","approve":true}`))
	req.Header.Set("Content-Type", "application/json")
	response, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if response.StatusCode != 422 || service.sendCalls != 0 || service.applyCalls != 0 {
		t.Fatalf("status=%d sends=%d applies=%d", response.StatusCode, service.sendCalls, service.applyCalls)
	}
}

func TestAgentHTTPDoesNotLeakProviderOrDatabaseErrors(t *testing.T) {
	service := &agentHTTPStub{createErr: errors.New("provider-response-containing-private-document")}
	app := agentTestApp(service, true)
	req := httptest.NewRequest("POST", "/agent/conversations", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	response, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	body, _ := io.ReadAll(response.Body)
	if response.StatusCode != 500 || bytes.Contains(body, []byte("private-document")) {
		t.Fatalf("unsafe error response: status=%d body=%s", response.StatusCode, body)
	}
}

func agentMultipart(t *testing.T, name string, data []byte) (*bytes.Buffer, string) {
	t.Helper()
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	part, err := w.CreateFormFile("file", name)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write(data); err != nil {
		t.Fatal(err)
	}
	if err := w.WriteField("idempotencyKey", "attachment-request-123"); err != nil {
		t.Fatal(err)
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	return &body, w.FormDataContentType()
}

func TestAgentUploadChecksOwnershipBeforeExtraction(t *testing.T) {
	service := &agentHTTPStub{detailErr: agent.ErrNotFound}
	app := agentTestApp(service, true)
	body, contentType := agentMultipart(t, "report.pdf", []byte("invalid content"))
	req := httptest.NewRequest("POST", "/agent/conversations/"+uuid.NewString()+"/attachments", body)
	req.Header.Set("Content-Type", contentType)
	response, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if response.StatusCode != 404 || service.uploaded != nil {
		t.Fatalf("status=%d uploaded=%v", response.StatusCode, service.uploaded)
	}
}

func TestAgentUploadRejectsSpoofedAndOversizedDocuments(t *testing.T) {
	for _, tt := range []struct {
		name string
		data []byte
		want int
	}{
		{"spoofed.pdf", []byte("this is not a PDF"), 422},
		{"oversized.pdf", bytes.Repeat([]byte{'a'}, agentUploadLimit+1), 413},
		{"unsupported.csv", []byte("a,b"), 422},
	} {
		t.Run(tt.name, func(t *testing.T) {
			service := &agentHTTPStub{}
			body, contentType := agentMultipart(t, tt.name, tt.data)
			req := httptest.NewRequest("POST", "/agent/conversations/"+uuid.NewString()+"/attachments", body)
			req.Header.Set("Content-Type", contentType)
			response, err := agentTestApp(service, true).Test(req)
			if err != nil {
				t.Fatal(err)
			}
			defer response.Body.Close()
			if response.StatusCode != tt.want || service.uploaded != nil {
				t.Fatalf("status=%d want=%d uploaded=%v", response.StatusCode, tt.want, service.uploaded)
			}
		})
	}
}

func TestAgentUploadExtractsExcelAndPreservesRetryKey(t *testing.T) {
	workbook := excelize.NewFile()
	defer workbook.Close()
	if err := workbook.SetCellValue("Sheet1", "A1", "Laporan pengendalian operasional"); err != nil {
		t.Fatal(err)
	}
	data, err := workbook.WriteToBuffer()
	if err != nil {
		t.Fatal(err)
	}
	service := &agentHTTPStub{}
	body, contentType := agentMultipart(t, "laporan.xlsx", data.Bytes())
	req := httptest.NewRequest("POST", "/agent/conversations/"+uuid.NewString()+"/attachments", body)
	req.Header.Set("Content-Type", contentType)
	response, err := agentTestApp(service, true).Test(req)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if response.StatusCode != 201 {
		b, _ := io.ReadAll(response.Body)
		t.Fatalf("status=%d: %s", response.StatusCode, b)
	}
	if service.uploaded == nil || !strings.Contains(service.uploaded.Text, "pengendalian operasional") || service.uploaded.IdempotencyKey != "attachment-request-123" {
		t.Fatalf("unexpected extracted input: %+v", service.uploaded)
	}
}

func TestAgentHTTPApplyBindsExactRevisionAndIdempotencyKey(t *testing.T) {
	service := &agentHTTPStub{}
	req := httptest.NewRequest("POST", "/agent/conversations/"+uuid.NewString()+"/proposals/"+uuid.NewString()+"/apply", strings.NewReader(`{"revision":7,"idempotencyKey":"apply-request-123"}`))
	req.Header.Set("Content-Type", "application/json")
	response, err := agentTestApp(service, true).Test(req)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	var result struct {
		Data agent.Proposal `json:"data"`
	}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != 200 || service.revision != 7 || service.key != "apply-request-123" || result.Data.Status != "applied" {
		t.Fatalf("unexpected apply result: %d %+v", response.StatusCode, result)
	}
}

func TestAgentExportRechecksAccessAndUsesOnlySavedAnswer(t *testing.T) {
	cid, mid := uuid.New(), uuid.New()
	snapshot := agent.ConversationDetail{Conversation: agent.Conversation{ID: cid, Title: "Tinjauan uji"}, Messages: []agent.Message{{ID: mid, Role: "assistant", Content: "Angka dari snapshot", Widgets: []agent.Widget{{Type: "table", Title: "Hasil tersimpan", Columns: []agent.Column{{Key: "count", Label: "Jumlah"}}, Rows: []map[string]any{{"count": 7}}}}}}}
	for _, tc := range []struct {
		name, format string
		detailErr    error
		want         int
	}{
		{"saved snapshot", "xlsx", nil, 200}, {"PDF snapshot", "pdf", nil, 200}, {"private conversation", "xlsx", agent.ErrNotFound, 404}, {"revoked scope", "xlsx", agent.ErrForbidden, 403}, {"invalid format", "html", nil, 422},
	} {
		t.Run(tc.name, func(t *testing.T) {
			stub := &agentHTTPStub{detail: snapshot, detailErr: tc.detailErr}
			response, err := agentTestApp(stub, true).Test(httptest.NewRequest("GET", "/agent/conversations/"+cid.String()+"/messages/"+mid.String()+"/export?format="+tc.format, nil))
			if err != nil {
				t.Fatal(err)
			}
			defer response.Body.Close()
			if response.StatusCode != tc.want || response.Header.Get("Cache-Control") != "no-store" {
				t.Fatalf("status=%d headers=%v", response.StatusCode, response.Header)
			}
			if tc.want != 200 {
				return
			}
			if !strings.Contains(response.Header.Get("Content-Disposition"), "attachment;") || response.Header.Get("X-Content-Type-Options") != "nosniff" {
				t.Fatal("unsafe download headers")
			}
			body, err := io.ReadAll(response.Body)
			if err != nil {
				t.Fatal(err)
			}
			if tc.format == "pdf" {
				if !bytes.HasPrefix(body, []byte("%PDF")) {
					t.Fatal("invalid PDF")
				}
				return
			}
			file, err := excelize.OpenReader(bytes.NewReader(body))
			if err != nil {
				t.Fatal(err)
			}
			defer file.Close()
			if value, _ := file.GetCellValue("Hasil 1", "A7"); value != "7" {
				t.Fatal("saved count changed", value)
			}
		})
	}
}

func TestAgentHTTPMissingSchemaExplainsMigrationInsteadOfAISettings(t *testing.T) {
	service := &agentHTTPStub{createErr: agent.ErrStorageNotReady}
	request := httptest.NewRequest("POST", "/agent/conversations", strings.NewReader(`{}`))
	request.Header.Set("Content-Type", "application/json")
	response, err := agentTestApp(service, true).Test(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != 503 || !bytes.Contains(body, []byte("migrasi database")) || bytes.Contains(body, []byte("pengaturan AI")) {
		t.Fatalf("misleading schema error: status=%d body=%s", response.StatusCode, body)
	}
}
