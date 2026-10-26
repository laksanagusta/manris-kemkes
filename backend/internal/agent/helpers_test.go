package agent

import (
	"errors"
	"fmt"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
)

func TestMissingAgentSchemaDoesNotBlameAIConfiguration(t *testing.T) {
	cause := fmt.Errorf("list private conversation: %w", &pgconn.PgError{Code: "42P01", Message: `relation "agent_conversations" does not exist; private SQL`})
	got := publicError(cause)
	if errors.Is(got, ErrUnavailable) || !strings.Contains(strings.ToLower(got.Error()), "migrasi") {
		t.Fatalf("missing schema is misreported: %v", got)
	}
	if strings.Contains(got.Error(), "private SQL") || strings.Contains(got.Error(), "agent_conversations") {
		t.Fatal("database details exposed", got)
	}
	if publicError(got) != got {
		t.Fatal("safe schema error not preserved")
	}
}
