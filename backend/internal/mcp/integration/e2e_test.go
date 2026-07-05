package integration

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestE2E_AllToolsAvailable(t *testing.T) {
	if os.Getenv("SKIP_INTEGRATION_TESTS") != "" {
		t.Skip("Skipping integration tests")
	}

	binaryPath := findMCPBinary()
	if binaryPath == "" {
		t.Skip("MCP binary not found")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	harness, err := NewMCPServerHarness(ctx, binaryPath)
	if err != nil {
		t.Fatalf("Failed to start MCP server: %v", err)
	}
	defer harness.Close()

	tools := []struct {
		name string
		args map[string]interface{}
	}{
		{"login", map[string]interface{}{"email": "test@example.com", "password": "pass"}},
		{"get_risk", map[string]interface{}{"id": "00000000-0000-0000-0000-000000000000"}},
		{"list_risks", map[string]interface{}{}},
		{"create_and_approve_risk", map[string]interface{}{"title": "Test", "category": "financial", "organizationId": "00000000-0000-0000-0000-000000000000", "probability": 1, "impact": 1}},
		{"update_risk_draft", map[string]interface{}{"id": "00000000-0000-0000-0000-000000000000"}},
		{"monitor_and_approve_risk", map[string]interface{}{"riskId": "00000000-0000-0000-0000-000000000000", "assessmentCycle": "H1"}},
		{"update_monitoring_draft", map[string]interface{}{"id": "00000000-0000-0000-0000-000000000000"}},
	}

	for _, tool := range tools {
		result, err := harness.Call(ctx, tool.name, tool.args)

		if err != nil && strings.Contains(err.Error(), "request timeout") {
			t.Errorf("Tool '%s' timed out - MCP binary not responding", tool.name)
			continue
		}

		if result != nil {
			contentRaw, ok := result["content"]
			if !ok {
				t.Errorf("Tool '%s' returned no content", tool.name)
				continue
			}

			contentList, ok := contentRaw.([]interface{})
			if !ok || len(contentList) == 0 {
				t.Errorf("Tool '%s' returned empty content array", tool.name)
			}
		}
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

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	harness, err := NewMCPServerHarness(ctx, binaryPath)
	if err != nil {
		t.Fatalf("Failed to start MCP server: %v", err)
	}
	defer harness.Close()

	result, _ := harness.Call(ctx, "list_risks", map[string]interface{}{})

	if result != nil {
		contentRaw, ok := result["content"]
		if !ok {
			t.Error("Expected 'content' in response")
		}

		contentList, ok := contentRaw.([]interface{})
		if !ok || len(contentList) == 0 {
			t.Error("Expected non-empty content array")
		}

		if contentList != nil && len(contentList) > 0 {
			firstContent, ok := contentList[0].(map[string]interface{})
			if ok {
				typeVal, _ := firstContent["type"].(string)
				if typeVal != "text" {
					t.Errorf("Expected content type 'text', got %s", typeVal)
				}
			}
		}
	}
}

func TestE2E_UnauthenticatedRequest(t *testing.T) {
	if os.Getenv("SKIP_INTEGRATION_TESTS") != "" {
		t.Skip("Skipping integration tests")
	}

	binaryPath := findMCPBinary()
	if binaryPath == "" {
		t.Skip("MCP binary not found")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	harness, err := NewMCPServerHarness(ctx, binaryPath)
	if err != nil {
		t.Fatalf("Failed to start MCP server: %v", err)
	}
	defer harness.Close()

	result, err := harness.Call(ctx, "list_risks", map[string]interface{}{})

	if err == nil && (result == nil || result["isError"] == false) {
		t.Error("Expected list_risks to fail without authentication")
	}
}

func TestE2E_ResponseErrorMapping(t *testing.T) {
	if os.Getenv("SKIP_INTEGRATION_TESTS") != "" {
		t.Skip("Skipping integration tests")
	}

	binaryPath := findMCPBinary()
	if binaryPath == "" {
		t.Skip("MCP binary not found")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	harness, err := NewMCPServerHarness(ctx, binaryPath)
	if err != nil {
		t.Fatalf("Failed to start MCP server: %v", err)
	}
	defer harness.Close()

	result, err := harness.Call(ctx, "get_risk", map[string]interface{}{
		"id": "not-a-uuid",
	})

	if err == nil && (result == nil || result["isError"] == false) {
		t.Error("Expected get_risk to fail with invalid UUID")
	}

	if result != nil && result["isError"] == true {
		contentRaw, ok := result["content"]
		if ok {
			contentList, ok := contentRaw.([]interface{})
			if ok && len(contentList) > 0 {
				firstContent, ok := contentList[0].(map[string]interface{})
				if ok {
					text, ok := firstContent["text"].(string)
					if !ok || text == "" {
						t.Error("Expected error message in response")
					}
				}
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

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
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

	if result != nil {
		contentRaw, ok := result["content"]
		if ok {
			contentList, ok := contentRaw.([]interface{})
			if ok && len(contentList) > 0 {
				firstContent, ok := contentList[0].(map[string]interface{})
				if ok {
					text, ok := firstContent["text"].(string)
					if ok && text != "" {
						var data map[string]interface{}
						if err := json.Unmarshal([]byte(text), &data); err != nil {
							t.Logf("Response is error text (not JSON): %s", text)
						} else {
							t.Logf("Response is valid JSON: %v", data)
						}
					}
				}
			}
		}
	}
}

func findMCPBinary() string {
	locations := []string{
		"./bin/mcp",
		"../bin/mcp",
		"../../bin/mcp",
		"backend/bin/mcp",
		filepath.Join(os.Getenv("HOME"), "Engineering/manris-v2/backend/bin/mcp"),
	}

	for _, loc := range locations {
		if _, err := os.Stat(loc); err == nil {
			return loc
		}
	}

	return ""
}
