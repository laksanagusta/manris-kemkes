package openai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"log/slog"
	"net/http"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	sdk "github.com/sashabaranov/go-openai"
)

// Capture both loggers so legacy log.Printf calls cannot bypass this regression test.
// These tests must remain sequential because the default loggers are process-wide.
func captureAILogs(t *testing.T) *bytes.Buffer {
	t.Helper()
	var output bytes.Buffer
	previousLogger, previousWriter, previousFlags := slog.Default(), log.Writer(), log.Flags()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&output, nil)))
	t.Cleanup(func() {
		slog.SetDefault(previousLogger)
		log.SetOutput(previousWriter)
		log.SetFlags(previousFlags)
	})
	return &output
}

type loggingHTTPClient struct {
	status int
	body   string
	err    error
}

func (c loggingHTTPClient) Do(req *http.Request) (*http.Response, error) {
	if c.err != nil {
		return nil, c.err
	}
	return &http.Response{
		StatusCode: c.status,
		Header:     http.Header{"Content-Type": {"application/json"}},
		Body:       io.NopCloser(strings.NewReader(c.body)),
		Request:    req,
	}, nil
}

func TestAIRequestsLogMetadataWithoutSensitiveContent(t *testing.T) {
	const secret = "PRIVATE-DOCUMENT-778899"
	const correlationID = "72ed67a9-6df4-479e-879f-a5710826ded5"
	cases := []struct {
		name      string
		content   string
		finish    string
		status    int
		transport error
		plain     bool
		wantError bool
		noChoices bool
	}{
		{name: "document success", content: `{"processStages":[{"stageName":"` + secret + `"}]}`, status: 200},
		{name: "untrusted finish reason", content: `{"processStages":[]}`, finish: secret, status: 200},
		{name: "malformed JSON", content: `{"processStages":"` + secret, status: 200, wantError: true},
		{name: "invalid response shape", content: `{"processStages":"` + secret + `"}`, status: 200, wantError: true},
		{name: "provider error echoes input", content: secret, status: 400, wantError: true},
		{name: "transport error contains input", transport: fmt.Errorf("transport failed: %s", secret), wantError: true},
		{name: "truncated response", content: secret, finish: "length", status: 200, wantError: true},
		{name: "content filter", content: secret, finish: "content_filter", status: 200, wantError: true},
		{name: "empty response", status: 200, wantError: true},
		{name: "no choices", status: 200, noChoices: true, wantError: true},
		{name: "plain completion success", content: secret, status: 200, plain: true},
		{name: "plain completion provider error", content: secret, status: 400, plain: true, wantError: true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			logs := captureAILogs(t)
			finish := tc.finish
			if finish == "" {
				finish = "stop"
			}
			choices := []sdk.ChatCompletionChoice{{Message: sdk.ChatCompletionMessage{Role: "assistant", Content: tc.content}, FinishReason: sdk.FinishReason(finish)}}
			if tc.noChoices {
				choices = nil
			}
			var body []byte
			var err error
			if tc.status == 400 {
				body, err = json.Marshal(map[string]any{"error": map[string]any{"message": secret, "type": "invalid_request_error"}})
			} else {
				body, err = json.Marshal(sdk.ChatCompletionResponse{Choices: choices})
			}
			if err != nil {
				t.Fatal(err)
			}
			config := sdk.DefaultConfig("dummy-api-key-" + secret)
			config.HTTPClient = loggingHTTPClient{status: tc.status, body: string(body), err: tc.transport}
			repo := &aiRepository{client: sdk.NewClientWithConfig(config)}
			ctx := context.WithValue(context.Background(), "correlationId", correlationID)
			if tc.plain {
				_, err = repo.callOpenAI(ctx, secret, "system "+secret, "incident", secret)
			} else {
				_, err = repo.AnalyzeDocument(ctx, entity.DocumentAnalysisRequest{
					Mode: entity.DocumentModeSOPRiskUniverse, DocumentText: secret,
				})
			}
			if (err != nil) != tc.wantError {
				t.Fatalf("error presence = %v, want %v", err != nil, tc.wantError)
			}
			if strings.Contains(logs.String(), secret) {
				t.Fatal("sensitive document, response, credential, or error content leaked to logs")
			}
			decoder := json.NewDecoder(bytes.NewReader(logs.Bytes()))
			allowed := map[string]bool{
				"time": true, "level": true, "msg": true, "correlation_id": true,
				"feature": true, "model": true, "duration_ms": true, "status": true, "error_code": true,
			}
			var events []map[string]any
			for decoder.More() {
				var event map[string]any
				if err := decoder.Decode(&event); err != nil {
					t.Fatalf("log must be structured JSON: %v", err)
				}
				for key := range event {
					if !allowed[key] {
						t.Errorf("unexpected log field %q outside metadata allowlist", key)
					}
				}
				if event["correlation_id"] != correlationID {
					t.Error("log event lost request correlation")
				}
				events = append(events, event)
			}
			if len(events) == 0 {
				t.Fatal("request produced no operational log")
			}
			request := events[0]
			if request["model"] != "gpt-4o-mini" || request["feature"] == nil || request["duration_ms"] == nil {
				t.Error("request log lost operational metadata")
			}
			last := events[len(events)-1]
			if tc.wantError && (last["status"] != "failed" || last["error_code"] == "" || last["error_code"] == nil) {
				t.Error("failure log is missing a safe status or error code")
			}
			if !tc.wantError && last["status"] != "success" {
				t.Error("successful completion must be logged as successful")
			}
		})
	}
}

type loggingRiskRepository struct {
	repository.RiskRepository
	risks []*entity.Risk
}

func (r loggingRiskRepository) List(context.Context, []uuid.UUID, string, string) ([]*entity.Risk, error) {
	return r.risks, nil
}

func TestIncidentCandidatesDoNotLogRiskRecords(t *testing.T) {
	logs := captureAILogs(t)
	const secret = "PRIVATE-RISK-112233"
	repo := &aiRepository{riskRepo: loggingRiskRepository{risks: []*entity.Risk{{
		ID: uuid.New(), Code: secret, Title: secret, Description: secret, Status: entity.RiskStatusApproved,
	}}}}
	data, err := repo.buildIncidentRiskCandidatesJSON(context.Background(), nil)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Contains(data, []byte(secret)) {
		t.Fatal("risk candidate data was not preserved for analysis")
	}
	if logs.Len() != 0 {
		t.Fatal("building risk context must not write risk records to logs")
	}
}
