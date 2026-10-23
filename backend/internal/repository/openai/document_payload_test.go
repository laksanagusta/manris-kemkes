package openai

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	sdk "github.com/sashabaranov/go-openai"
)

type documentPayloadClient struct {
	calls   int
	request sdk.ChatCompletionRequest
	content string
}

func (c *documentPayloadClient) Do(req *http.Request) (*http.Response, error) {
	c.calls++
	if err := json.NewDecoder(req.Body).Decode(&c.request); err != nil {
		return nil, err
	}
	body, err := json.Marshal(sdk.ChatCompletionResponse{Choices: []sdk.ChatCompletionChoice{{Message: sdk.ChatCompletionMessage{Content: c.content}, FinishReason: sdk.FinishReasonStop}}})
	if err != nil {
		return nil, err
	}
	return &http.Response{StatusCode: 200, Header: http.Header{"Content-Type": {"application/json"}}, Body: io.NopCloser(strings.NewReader(string(body))), Request: req}, nil
}

func TestSensitiveDocumentPayloadIsBlockedAtProviderBoundary(t *testing.T) {
	tests := []struct {
		name      string
		request   entity.DocumentAnalysisRequest
		sensitive bool
	}{
		{name: "document", sensitive: true, request: entity.DocumentAnalysisRequest{Mode: entity.DocumentModeSOPRiskUniverse, DocumentText: "Email: private-synthetic@example.test"}},
		{name: "decoded task context", sensitive: true, request: entity.DocumentAnalysisRequest{
			Mode: entity.DocumentModeMitigationReportMapper, DocumentText: "Laporan biasa", Period: "2026-Q4",
			OpenTasksJSON: `[{"id":"72ed67a9-6df4-479e-879f-a5710826ded5","riskTitle":"private-synthetic\u0040example.test"}]`,
		}},
		{name: "duplicate key keeps earlier sensitive content", sensitive: true, request: entity.DocumentAnalysisRequest{
			Mode: entity.DocumentModeMitigationReportMapper, DocumentText: "Laporan biasa", Period: "2026-Q4",
			OpenTasksJSON: `[{"id":"72ed67a9-6df4-479e-879f-a5710826ded5","riskTitle":"private-synthetic@example.test","riskTitle":"Judul aman"}]`,
		}},
		{name: "unknown context field", request: entity.DocumentAnalysisRequest{
			Mode: entity.DocumentModeMitigationReportMapper, DocumentText: "Laporan biasa", Period: "2026-Q4",
			OpenTasksJSON: `[{"id":"72ed67a9-6df4-479e-879f-a5710826ded5","unexpected":"private-synthetic@example.test"}]`,
		}},
		{name: "malformed context", request: entity.DocumentAnalysisRequest{
			Mode: entity.DocumentModeMitigationReportMapper, DocumentText: "Laporan biasa", Period: "2026-Q4", OpenTasksJSON: `{"private-synthetic@example.test":`,
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logs := captureAILogs(t)
			client := &documentPayloadClient{}
			config := sdk.DefaultConfig("dummy-key")
			config.HTTPClient = client
			_, err := (&aiRepository{client: sdk.NewClientWithConfig(config)}).AnalyzeDocument(context.Background(), tt.request)
			if err == nil || client.calls != 0 {
				t.Fatal("blocked payload reached provider")
			}
			if tt.sensitive && !errors.Is(err, domainerrors.ErrSensitiveDataDetected) {
				t.Fatal("expected sensitive-data validation error")
			}
			if strings.Contains(err.Error(), "private-synthetic") || strings.Contains(logs.String(), "private-synthetic") {
				t.Fatal("error or logs exposed matched content")
			}
		})
	}
}

func TestDocumentProviderPayloadContainsOnlyModeSpecificContext(t *testing.T) {
	cases := []struct {
		mode    entity.DocumentAnalysisMode
		content string
	}{
		{entity.DocumentModeSOPRiskUniverse, `{"processStages":[]}`},
		{entity.DocumentModeRiskEventExtraction, `{"items":[]}`},
		{entity.DocumentModeMitigationReportMapper, `{"taskMatches":[]}`},
	}
	for _, tc := range cases {
		t.Run(string(tc.mode), func(t *testing.T) {
			client := &documentPayloadClient{content: tc.content}
			config := sdk.DefaultConfig("dummy-key")
			config.HTTPClient = client
			repo := &aiRepository{client: sdk.NewClientWithConfig(config)}
			_, err := repo.AnalyzeDocument(context.Background(), entity.DocumentAnalysisRequest{
				Mode: tc.mode, DocumentText: "FAKTA-DOKUMEN-UTUH", Period: "2026-Q4", OpenTasksJSON: `[{"id":"72ed67a9-6df4-479e-879f-a5710826ded5"}]`,
			})
			if err != nil {
				t.Fatal(err)
			}
			if len(client.request.Messages) != 2 {
				t.Fatal("unexpected context messages")
			}
			system, prompt := client.request.Messages[0].Content, client.request.Messages[1].Content
			if strings.Contains(system, "Konteks Piagam") || !strings.Contains(prompt, "FAKTA-DOKUMEN-UTUH") || !strings.Contains(prompt, "Dokumen sumber") {
				t.Fatal("source text or generic source label missing, or organization context was attached")
			}
			isMitigation := tc.mode == entity.DocumentModeMitigationReportMapper
			if strings.Contains(prompt, "72ed67a9-6df4-479e-879f-a5710826ded5") != isMitigation || strings.Contains(prompt, "2026-Q4") != isMitigation {
				t.Fatal("irrelevant database context or period sent for extraction")
			}
		})
	}
}
