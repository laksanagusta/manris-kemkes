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
	JSONRPC string                 `json:"jsonrpc"`
	ID      int                    `json:"id"`
	Method  string                 `json:"method"`
	Params  map[string]interface{} `json:"params"`
}

type JSONRPCResponse struct {
	JSONRPC string                 `json:"jsonrpc"`
	ID      int                    `json:"id"`
	Result  map[string]interface{} `json:"result,omitempty"`
	Error   *JSONRPCError          `json:"error,omitempty"`
}

type JSONRPCError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

type MCPServerHarness struct {
	cmd     *exec.Cmd
	stdin   io.WriteCloser
	stdout  io.ReadCloser
	scanner *bufio.Scanner

	mu         sync.Mutex
	nextID     int
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
		respCh:    make(chan *JSONRPCResponse, 100),
	}

	go harness.readResponses()

	return harness, nil
}

func (h *MCPServerHarness) readResponses() {
	defer func() {
		if r := recover(); r != nil {
			_ = r
		}
	}()

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
		h.mu.Unlock()

		select {
		case h.respCh <- &resp:
		case <-time.After(100 * time.Millisecond):
		}
	}

	if err := h.scanner.Err(); err != nil {
		_ = err
	}
}

func (h *MCPServerHarness) Call(ctx context.Context, toolName string, args map[string]interface{}) (map[string]interface{}, error) {
	h.mu.Lock()
	id := h.nextID
	h.nextID++
	h.mu.Unlock()

	params := map[string]interface{}{
		"name":      toolName,
		"arguments": args,
	}

	req := JSONRPCRequest{
		JSONRPC: "2.0",
		ID:      id,
		Method:  "tools/call",
		Params:  params,
	}

	data, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	line := string(data)
	if _, err := io.WriteString(h.stdin, line+"\n"); err != nil {
		return nil, fmt.Errorf("failed to write request: %w", err)
	}

	timeout := time.After(5 * time.Second)

	for {
		select {
		case resp := <-h.respCh:
			if resp.ID == id {
				if resp.Error != nil {
					return nil, fmt.Errorf("rpc error: %s", resp.Error.Message)
				}
				return resp.Result, nil
			}
			continue

		case <-ctx.Done():
			return nil, ctx.Err()

		case <-timeout:
			h.mu.Lock()
			availableResponses := len(h.responses)
			h.mu.Unlock()
			return nil, fmt.Errorf("request timeout (expected ID %d, have %d responses in map)", id, availableResponses)
		}
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
