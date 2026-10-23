package requestmeta

import (
	"context"
	"testing"
)

func TestCorrelationIDRejectsUntrustedContextValues(t *testing.T) {
	for _, value := range []any{nil, "PRIVATE-TEXT", "private\nforged-log", 42} {
		ctx := context.Background()
		if value != nil {
			ctx = context.WithValue(ctx, "correlationId", value)
		}
		if CorrelationID(ctx) != "" {
			t.Fatal("non-UUID context value must not reach logs")
		}
	}
}
