package http

import (
	"context"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/manris/backend/internal/agent"
	"github.com/manris/backend/internal/service/agentreport"
)

// Export renders the frozen answer after the same current-access check as chat.
// It neither creates a formal report nor changes business data.
func (h *AgentHandler) Export(c *fiber.Ctx) error {
	cid, err := agentParam(c, "id")
	if err != nil {
		return agentHTTPError(c, err)
	}
	mid, err := agentParam(c, "messageId")
	if err != nil {
		return agentHTTPError(c, err)
	}
	format := c.Query("format")
	if format != "pdf" && format != "xlsx" {
		return agentHTTPError(c, agent.ErrInvalidInput)
	}
	ctx, cancel := context.WithTimeout(c.Context(), 30*time.Second)
	defer cancel()
	detail, err := h.service.Detail(ctx, agentActor(c), cid)
	if err != nil {
		return agentHTTPError(c, err)
	}
	for _, message := range detail.Messages {
		if message.ID != mid {
			continue
		}
		if message.Role != "assistant" || len(message.Widgets) == 0 {
			return agentHTTPError(c, agent.ErrNotFound)
		}
		result, err := agentreport.Render(ctx, detail.Conversation.Title, message, format)
		if err != nil {
			return agentHTTPError(c, err)
		}
		c.Set(fiber.HeaderContentType, result.ContentType)
		c.Set(fiber.HeaderContentDisposition, fmt.Sprintf(`attachment; filename="manris-agent-%s.%s"`, mid.String()[:8], result.Extension))
		c.Set("X-Content-Type-Options", "nosniff")
		return c.Send(result.Bytes)
	}
	return agentHTTPError(c, agent.ErrNotFound)
}
