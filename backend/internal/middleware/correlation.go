package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// CorrelationID is a middleware that injects a Correlation ID into the request context.
// It accepts a UUID from "X-Correlation-ID", or generates one when absent or invalid.
func CorrelationID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		id, err := uuid.Parse(c.Get("X-Correlation-ID"))
		if err != nil {
			id = uuid.New()
		}
		correlationID := id.String()

		// Inject to response headers as well
		c.Set("X-Correlation-ID", correlationID)

		// Inject into locals for context propagation
		c.Locals("correlationId", correlationID)

		return c.Next()
	}
}
