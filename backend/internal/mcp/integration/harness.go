package integration

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os/exec"
	"sync"
	"time"
)

type JSONRPCRequest struct {
	JSONRPC string        `json:"jsonrpc"`
	ID      int           `json:"id"`
	Method  string        `json:"method"`
	Params  JSONRPCParams `json:"params"`
}

type JSONRPCParams struct {
	Arguments map[string]interface{} `json:"arguments"`
}

type JSONRPCResponse struct {
	JSONRPC string         `json:"jsonrpc"`
	ID      int            `json:"id"`
	Result  *JSONRPCResult `json:"result,omitempty"`
	Error   *JSONRPCError  `json:"error,omitempty"`
}

type JSONRPCResult struct {
	Content []JSONRPCContent `json:"content"`
	IsError bool             `json:"isError"`
}

type JSONRPCContent struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type JSONRPCError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

type MCPServerHarness struct {
	cmd        *exec.Cmd
	stdin      io.WriteCloser
	stdout     io.ReadCloser
	scanner    *bufio.Scanner
	nextID     int
	mu         sync.Mutex
	responses  map[int]*JSONRPCResponse
	respCh     chan *JSONRPCResponse
	closedOnce sync.Once
}

func NewMCPServerHarness(ctx context.Context, binaryPath string) (*MCPServerHarness, error) {
	cmd := exec.CommandContext(ctx, binaryPath)

	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stdin pipe: %w", err)
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stdout pipe: %w", err)
	}

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to start MCP server: %w", err)
	}

	harness := &MCPServerHarness{
		cmd:       cmd,
		stdin:     stdin,
		stdout:    stdout,
		scanner:   bufio.NewScanner(stdout),
		nextID:    1,
		responses: make(map[int]*JSONRPCResponse),
		respCh:    make(chan *JSONRPCResponse, 10),
	}

	go harness.readResponses()

	return harness, nil
}

func (h *MCPServerHarness) readResponses() {
	for h.scanner.Scan() {
		line := h.scanner.Text()
		if line == "" {
			continue
		}

		var resp JSONRPCResponse
		if err := json.Unmarshal([]byte(line), &resp); err != nil {
			continue
		}

		h.mu.Lock()
		h.responses[resp.ID] = &resp
		h.respCh <- &resp
		h.mu.Unlock()
	}
}

func (h *MCPServerHarness) Call(ctx context.Context, method string, args map[string]interface{}) (*JSONRPCResult, error) {
	h.mu.Lock()
	id := h.nextID
	h.nextID++
	h.mu.Unlock()

	req := JSONRPCRequest{
		JSONRPC: "2.0",
		ID:      id,
		Method:  method,
		Params: JSONRPCParams{
			Arguments: args,
		},
	}

	data, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	if _, err := fmt.Fprintln(h.stdin, string(data)); err != nil {
		return nil, fmt.Errorf("failed to write request: %w", err)
	}

	select {
	case resp := <-h.respCh:
		if resp.ID == id {
			if resp.Error != nil {
				return nil, fmt.Errorf("rpc error: %s", resp.Error.Message)
			}
			return resp.Result, nil
		}
		return nil, fmt.Errorf("response ID mismatch")
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-time.After(5 * time.Second):
		return nil, fmt.Errorf("request timeout")
	}
}

func (h *MCPServerHarness) Close() error {
	var err error
	h.closedOnce.Do(func() {
		h.stdin.Close()
		h.stdout.Close()
		err = h.cmd.Wait()
	})
	return err
}

func (h *MCPServerHarness) ExtractText(result *JSONRPCResult) string {
	if result == nil || len(result.Content) == 0 {
		return ""
	}
	return result.Content[0].Text
}

func (h *MCPServerHarness) ExtractJSON(result *JSONRPCResult) map[string]interface{} {
	text := h.ExtractText(result)
	var data map[string]interface{}
	_ = json.Unmarshal([]byte(text), &data)
	return data
}
