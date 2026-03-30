package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// CorrelationID is a middleware that injects a Correlation ID into the request context.
// It reads from the "X-Correlation-ID" header, or generates a new UUID if it doesn't exist.
func CorrelationID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		correlationID := c.Get("X-Correlation-ID")
		if correlationID == "" {
			correlationID = uuid.New().String()
		}

		// Inject to response headers as well
		c.Set("X-Correlation-ID", correlationID)

		// Inject into locals for context propagation
		c.Locals("correlationId", correlationID)

		return c.Next()
	}
}
