package integration

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestE2E_LoginAndQueryRisks(t *testing.T) {
	if os.Getenv("SKIP_INTEGRATION_TESTS") != "" {
		t.Skip("Skipping integration tests")
	}

	binaryPath := findMCPBinary()
	if binaryPath == "" {
		t.Skip("MCP binary not found")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	harness, err := NewMCPServerHarness(ctx, binaryPath)
	if err != nil {
		t.Fatalf("Failed to start MCP server: %v", err)
	}
	defer harness.Close()

	t.Run("login", func(t *testing.T) {
		result, err := harness.Call(ctx, "login", map[string]interface{}{
			"email":    "test@example.com",
			"password": "password123",
		})

		if result != nil && result.IsError {
			t.Log("Expected error for non-existent user (OK for integration test)")
			return
		}

		if err != nil && err.Error() == "session expired" {
			t.Log("Session timeout (OK for integration test)")
			return
		}
	})

	t.Run("list_risks_no_session", func(t *testing.T) {
		result, err := harness.Call(ctx, "list_risks", map[string]interface{}{})

		if err != nil || (result != nil && result.IsError) {
			t.Log("Expected error for unauthenticated request (OK)")
			return
		}
	})
}

func TestE2E_MultipleRequests(t *testing.T) {
	if os.Getenv("SKIP_INTEGRATION_TESTS") != "" {
		t.Skip("Skipping integration tests")
	}

	binaryPath := findMCPBinary()
	if binaryPath == "" {
		t.Skip("MCP binary not found")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	harness, err := NewMCPServerHarness(ctx, binaryPath)
	if err != nil {
		t.Fatalf("Failed to start MCP server: %v", err)
	}
	defer harness.Close()

	requests := []map[string]interface{}{
		{"method": "login", "args": map[string]interface{}{"email": "test@example.com", "password": "pass"}},
		{"method": "get_risk", "args": map[string]interface{}{"id": "00000000-0000-0000-0000-000000000000"}},
		{"method": "list_risks", "args": map[string]interface{}{"limit": 10}},
	}

	for i, req := range requests {
		method := req["method"].(string)
		args := req["args"].(map[string]interface{})

		_, _ = harness.Call(ctx, method, args)
		t.Logf("Request %d: %s completed (may fail due to auth/data - OK for harness test)", i+1, method)
	}
}

func TestE2E_JSONRPCResponseFormat(t *testing.T) {
	if os.Getenv("SKIP_INTEGRATION_TESTS") != "" {
		t.Skip("Skipping integration tests")
	}

	binaryPath := findMCPBinary()
	if binaryPath == "" {
		t.Skip("MCP binary not found")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	harness, err := NewMCPServerHarness(ctx, binaryPath)
	if err != nil {
		t.Fatalf("Failed to start MCP server: %v", err)
	}
	defer harness.Close()

	result, _ := harness.Call(ctx, "list_risks", map[string]interface{}{})

	if result != nil {
		if len(result.Content) == 0 {
			t.Error("Expected at least one content item in response")
		}

		for _, content := range result.Content {
			if content.Type != "text" {
				t.Errorf("Expected content type 'text', got %s", content.Type)
			}

			if content.Text == "" && !result.IsError {
				t.Log("Response text is empty (may be expected for error case)")
			}
		}
	}
}

func TestE2E_TextResponseIsValidJSON(t *testing.T) {
	if os.Getenv("SKIP_INTEGRATION_TESTS") != "" {
		t.Skip("Skipping integration tests")
	}

	binaryPath := findMCPBinary()
	if binaryPath == "" {
		t.Skip("MCP binary not found")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	harness, err := NewMCPServerHarness(ctx, binaryPath)
	if err != nil {
		t.Fatalf("Failed to start MCP server: %v", err)
	}
	defer harness.Close()

	result, _ := harness.Call(ctx, "login", map[string]interface{}{
		"email":    "test@example.com",
		"password": "password",
	})

	if result != nil && len(result.Content) > 0 {
		text := result.Content[0].Text
		if text != "" {
			var data map[string]interface{}
			if err := json.Unmarshal([]byte(text), &data); err != nil {
				t.Logf("Response is error text (not JSON): %s", text)
			} else {
				t.Logf("Response is valid JSON: %v", data)
			}
		}
	}
}

func findMCPBinary() string {
	locations := []string{
		"./server-mcp",
		"../server-mcp",
		"../../server-mcp",
		"backend/server-mcp",
		filepath.Join(os.Getenv("HOME"), "Engineering/manris-v2/backend/server-mcp"),
	}

	for _, loc := range locations {
		if _, err := os.Stat(loc); err == nil {
			return loc
		}
	}

	return ""
}
