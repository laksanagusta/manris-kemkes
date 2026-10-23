// Package requestmeta exposes non-sensitive request metadata for operational logs.
package requestmeta

import (
	"context"

	"github.com/google/uuid"
)

// CorrelationID reads the Fiber request local and only returns a canonical UUID.
// Never copy arbitrary client-provided header values into operational logs.
func CorrelationID(ctx context.Context) string {
	value, _ := ctx.Value("correlationId").(string)
	id, err := uuid.Parse(value)
	if err != nil {
		return ""
	}
	return id.String()
}
