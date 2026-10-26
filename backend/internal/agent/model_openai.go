package agent

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net"
	"strings"

	openai "github.com/sashabaranov/go-openai"
)

type ChatClient interface {
	CreateChatCompletion(context.Context, openai.ChatCompletionRequest) (openai.ChatCompletionResponse, error)
}
type OpenAIModel struct {
	client  ChatClient
	resolve func(context.Context) (string, error)
}

// NewOpenAIModel resolves the configured agent model on each call. No credential is
// persisted in a conversation or background job. Pass nil when AI is unconfigured.
func NewOpenAIModel(client *openai.Client, resolve func(context.Context) (string, error)) *OpenAIModel {
	m := &OpenAIModel{resolve: resolve}
	if client != nil {
		m.client = client
	}
	return m
}
func (m *OpenAIModel) Ready() error {
	if m == nil || m.client == nil || m.resolve == nil {
		return ErrUnavailable
	}
	return nil
}

func (m *OpenAIModel) ReadyContext(ctx context.Context) error {
	if err := m.Ready(); err != nil {
		return err
	}
	model, err := m.resolve(ctx)
	if err != nil || strings.TrimSpace(model) == "" {
		return ErrUnavailable
	}
	return nil
}

func (m *OpenAIModel) Complete(ctx context.Context, turns []Turn, defs []ToolDefinition) (Turn, error) {
	if err := m.Ready(); err != nil {
		return Turn{}, err
	}
	model, err := m.resolve(ctx)
	if err != nil || strings.TrimSpace(model) == "" {
		slog.WarnContext(ctx, "Manris Agent model unavailable", "errorClass", "model_configuration")
		return Turn{}, ErrUnavailable
	}
	messages := make([]openai.ChatCompletionMessage, 0, len(turns))
	for _, t := range turns {
		msg := openai.ChatCompletionMessage{Role: t.Role, Content: t.Content, ToolCallID: t.ToolCallID}
		for _, call := range t.ToolCalls {
			msg.ToolCalls = append(msg.ToolCalls, openai.ToolCall{ID: call.ID, Type: openai.ToolTypeFunction, Function: openai.FunctionCall{Name: call.Name, Arguments: string(call.Arguments)}})
		}
		messages = append(messages, msg)
	}
	tools := make([]openai.Tool, 0, len(defs))
	for _, d := range defs {
		tools = append(tools, openai.Tool{Type: openai.ToolTypeFunction, Function: &openai.FunctionDefinition{Name: d.Name, Description: d.Description, Parameters: json.RawMessage(d.Parameters)}})
	}
	response, err := m.client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{Model: model, Messages: messages, Tools: tools, MaxCompletionTokens: 4000, ParallelToolCalls: false})
	if err != nil {
		logModelFailure(ctx, err)
		return Turn{}, ErrUnavailable
	}
	if len(response.Choices) == 0 {
		slog.WarnContext(ctx, "Manris Agent model unavailable", "errorClass", "empty_response")
		return Turn{}, ErrUnavailable
	}
	choice := response.Choices[0]
	if choice.FinishReason == openai.FinishReasonLength {
		slog.WarnContext(ctx, "Manris Agent model unavailable", "errorClass", "output_limit")
		return Turn{}, ErrUnavailable
	}
	msg := choice.Message
	out := Turn{Role: "assistant", Content: msg.Content}
	for _, c := range msg.ToolCalls {
		out.ToolCalls = append(out.ToolCalls, ToolCall{ID: c.ID, Name: c.Function.Name, Arguments: json.RawMessage(c.Function.Arguments)})
	}
	return out, nil
}

// Provider strings may contain submitted content or credentials. Diagnostics only
// record a fixed class, a numeric status, and explicitly recognized public codes.
func logModelFailure(ctx context.Context, err error) {
	class := "unknown"
	status := 0
	code := ""
	providerType := ""
	var apiError *openai.APIError
	var requestError *openai.RequestError
	var networkError net.Error
	switch {
	case errors.As(err, &apiError):
		class = "provider_api"
		status = apiError.HTTPStatusCode
		if value, ok := apiError.Code.(string); ok {
			switch value {
			case "invalid_api_key", "model_not_found", "insufficient_quota", "rate_limit_exceeded", "context_length_exceeded", "invalid_value", "invalid_json_schema", "unsupported_parameter", "account_deactivated", "billing_hard_limit_reached":
				code = value
			}
		}
		switch apiError.Type {
		case "invalid_request_error", "authentication_error", "permission_error", "rate_limit_error", "server_error", "insufficient_quota":
			providerType = apiError.Type
		}
	case errors.As(err, &requestError):
		class = "provider_request"
		status = requestError.HTTPStatusCode
	case errors.Is(err, context.DeadlineExceeded):
		class = "timeout"
	case errors.Is(err, context.Canceled):
		class = "cancelled"
	case errors.As(err, &networkError):
		if networkError.Timeout() {
			class = "network_timeout"
		} else {
			class = "network"
		}
	}
	if status < 100 || status > 599 {
		status = 0
	}
	slog.WarnContext(ctx, "Manris Agent model request failed", "errorClass", class, "httpStatus", status, "providerCode", code, "providerType", providerType)
}
