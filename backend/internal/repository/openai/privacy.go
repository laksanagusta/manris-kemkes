package openai

import (
	"context"

	"github.com/manris/backend/internal/service/sensitivedata"
	sdk "github.com/sashabaranov/go-openai"
)

// createChatCompletion is the shared outbound boundary for all current AI features.
// Raw source fields are checked before prompt construction as well: formatting
// must not obscure a classified header or a populated personal-data field.
func (r *aiRepository) createChatCompletion(ctx context.Context, request sdk.ChatCompletionRequest) (sdk.ChatCompletionResponse, error) {
	for _, message := range request.Messages {
		if err := sensitivedata.ValidateAIInput(message.Content); err != nil {
			return sdk.ChatCompletionResponse{}, err
		}
	}
	// This disables stored completions. It does not configure training opt-ins
	// or abuse-monitoring retention, which are provider account controls.
	// The pinned SDK omits false on the wire; Chat Completions defaults to false.
	request.Store = false
	return r.client.CreateChatCompletion(ctx, request)
}
