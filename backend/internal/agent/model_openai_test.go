package agent

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"strings"
	"testing"

	openai "github.com/sashabaranov/go-openai"
)

type chatClientFunc func(context.Context, openai.ChatCompletionRequest) (openai.ChatCompletionResponse, error)

func (f chatClientFunc) CreateChatCompletion(ctx context.Context, r openai.ChatCompletionRequest) (openai.ChatCompletionResponse, error) {
	return f(ctx, r)
}
func TestModelResolvesCurrentConfigurationAndPreservesFunctionTurns(t *testing.T) {
	resolved := 0
	client := chatClientFunc(func(_ context.Context, r openai.ChatCompletionRequest) (openai.ChatCompletionResponse, error) {
		if r.Model != "configured-agent" || len(r.Messages) != 3 || r.Messages[2].ToolCallID != "call-1" || r.MaxCompletionTokens <= 0 {
			t.Fatalf("incorrect request %+v", r)
		}
		encoded, err := json.Marshal(r.Tools[0])
		if err != nil || !strings.Contains(string(encoded), `"parameters":{"type":"object"}`) {
			t.Fatalf("schema was not an object %s", encoded)
		}
		return openai.ChatCompletionResponse{Choices: []openai.ChatCompletionChoice{{Message: openai.ChatCompletionMessage{Role: "assistant", ToolCalls: []openai.ToolCall{{ID: "call-2", Type: openai.ToolTypeFunction, Function: openai.FunctionCall{Name: "load_skill", Arguments: `{"skill":"risks"}`}}}}}}}, nil
	})
	model := &OpenAIModel{client: client, resolve: func(context.Context) (string, error) { resolved++; return "configured-agent", nil }}
	result, err := model.Complete(context.Background(), []Turn{{Role: "system", Content: "Manris"}, {Role: "assistant", ToolCalls: []ToolCall{{ID: "call-1", Name: "read", Arguments: json.RawMessage(`{}`)}}}, {Role: "tool", ToolCallID: "call-1", Content: `{"result":1}`}}, []ToolDefinition{{Name: "read", Parameters: json.RawMessage(`{"type":"object"}`)}})
	if err != nil || resolved != 1 || len(result.ToolCalls) != 1 || result.ToolCalls[0].Name != "load_skill" {
		t.Fatalf("tool call mapping failed %+v %v", result, err)
	}
}
func TestModelProviderDetailsAreNotExposed(t *testing.T) {
	model := &OpenAIModel{client: chatClientFunc(func(context.Context, openai.ChatCompletionRequest) (openai.ChatCompletionResponse, error) {
		return openai.ChatCompletionResponse{}, errors.New("Authorization secret provider SQL details")
	}), resolve: func(context.Context) (string, error) { return "configured-agent", nil }}
	if _, err := model.Complete(context.Background(), nil, nil); err != ErrUnavailable {
		t.Fatalf("unsafe provider error %v", err)
	}
	model.resolve = func(context.Context) (string, error) { return "", nil }
	if err := model.ReadyContext(context.Background()); err != ErrUnavailable {
		t.Fatal("empty model accepted")
	}
	if err := NewOpenAIModel(nil, nil).Ready(); err != ErrUnavailable {
		t.Fatal("nil client accepted")
	}
}
func TestUnconfiguredDynamicModelDoesNotQueueWork(t *testing.T) {
	model := &OpenAIModel{client: chatClientFunc(func(context.Context, openai.ChatCompletionRequest) (openai.ChatCompletionResponse, error) {
		t.Fatal("unconfigured model invoked")
		return openai.ChatCompletionResponse{}, nil
	}), resolve: func(context.Context) (string, error) { return "", nil }}
	s, store, _, actor, cid := fixture(t, model)
	if _, err := s.SendMessage(context.Background(), actor, cid, SendMessageInput{Content: "Hi"}); !errors.Is(err, ErrUnavailable) {
		t.Fatal("empty agent model queued")
	}
	record, _ := store.Read(context.Background(), actor, cid)
	if len(record.Runs) != 0 || len(record.Messages) != 0 {
		t.Fatal("unconfigured AI persisted work")
	}
}

func TestModelDiagnosticsNeverLogMessagesBodiesOrUnknownProviderStrings(t *testing.T) {
	var output bytes.Buffer
	previous := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&output, nil)))
	t.Cleanup(func() { slog.SetDefault(previous) })
	secret := "CUSTOMER_TEXT_AND_API_KEY_SECRET"
	logModelFailure(context.Background(), &openai.APIError{HTTPStatusCode: 401, Message: secret, Code: "invalid_api_key", Type: "authentication_error"})
	logModelFailure(context.Background(), &openai.APIError{HTTPStatusCode: 400, Message: secret, Code: secret, Type: secret})
	logModelFailure(context.Background(), &openai.RequestError{HTTPStatusCode: 503, Err: errors.New(secret), Body: []byte(secret)})
	logModelFailure(context.Background(), errors.New(secret))
	captured := output.String()
	if strings.Contains(captured, secret) {
		t.Fatal("diagnostics leaked private error content")
	}
	for _, expected := range []string{`"httpStatus":401`, `"providerCode":"invalid_api_key"`, `"errorClass":"provider_request"`} {
		if !strings.Contains(captured, expected) {
			t.Fatalf("missing safe diagnostic %s", expected)
		}
	}
}
