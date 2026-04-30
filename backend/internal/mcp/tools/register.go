package tools

import (
	"context"
	"encoding/json"
	"time"

	"github.com/manris/backend/internal/bootstrap"
	"github.com/manris/backend/internal/mcp/session"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

func successResult(data map[string]interface{}) *mcp.CallToolResult {
	b, err := json.Marshal(data)
	if err != nil {
		return errorResult("failed to marshal result: " + err.Error())
	}
	return &mcp.CallToolResult{
		Content: []mcp.Content{mcp.TextContent{Type: "text", Text: string(b)}},
		IsError: false,
	}
}

func errorResult(msg string) *mcp.CallToolResult {
	return &mcp.CallToolResult{
		Content: []mcp.Content{mcp.TextContent{Type: "text", Text: msg}},
		IsError: true,
	}
}

func argsMap(req mcp.CallToolRequest) map[string]interface{} {
	args, _ := req.Params.Arguments.(map[string]interface{})
	if args == nil {
		args = map[string]interface{}{}
	}
	return args
}

func RegisterAuthTools(s *server.MCPServer, c *bootstrap.Container, mgr *session.Manager, ttl time.Duration) {
	tool := mcp.Tool{
		Name:        "login",
		Description: "Authenticate a user and establish a session",
		InputSchema: mcp.ToolInputSchema{
			Type: "object",
			Properties: map[string]interface{}{
				"email":    map[string]interface{}{"type": "string", "description": "User email"},
				"password": map[string]interface{}{"type": "string", "description": "User password"},
			},
			Required: []string{"email", "password"},
		},
	}
	s.AddTool(tool, func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := argsMap(req)
		email, _ := args["email"].(string)
		password, _ := args["password"].(string)
		deps := Deps{
			AuthLoginUC:    c.AuthLoginUC,
			SessionManager: mgr,
			SessionTTL:     ttl,
		}
		result, err := HandleLogin(ctx, deps, email, password)
		if err != nil {
			return errorResult(err.Error()), nil
		}
		return successResult(result), nil
	})
}

func RegisterRiskQueryTools(s *server.MCPServer, c *bootstrap.Container, mgr *session.Manager) {
	getTool := mcp.Tool{
		Name:        "get_risk",
		Description: "Get a specific risk by ID",
		InputSchema: mcp.ToolInputSchema{
			Type: "object",
			Properties: map[string]interface{}{
				"id": map[string]interface{}{"type": "string", "description": "Risk ID"},
			},
			Required: []string{"id"},
		},
	}
	s.AddTool(getTool, func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := argsMap(req)
		idStr, _ := args["id"].(string)
		sess, _ := mgr.Get()
		result, err := HandleGetRisk(ctx, c.RiskGetUC, sess, idStr)
		if err != nil {
			return errorResult(err.Error()), nil
		}
		return successResult(result), nil
	})

	listTool := mcp.Tool{
		Name:        "list_risks",
		Description: "List risks with optional filters",
		InputSchema: mcp.ToolInputSchema{
			Type: "object",
			Properties: map[string]interface{}{
				"status": map[string]interface{}{"type": "string"},
				"limit":  map[string]interface{}{"type": "number"},
				"offset": map[string]interface{}{"type": "number"},
			},
		},
	}
	s.AddTool(listTool, func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := argsMap(req)
		sess, _ := mgr.Get()
		result, err := HandleListRisks(ctx, c.RiskListUC, sess, args)
		if err != nil {
			return errorResult(err.Error()), nil
		}
		return successResult(result), nil
	})
}

func RegisterRiskWriteTools(s *server.MCPServer, c *bootstrap.Container, mgr *session.Manager) {
	createTool := mcp.Tool{
		Name:        "create_and_approve_risk",
		Description: "Create a new risk",
		InputSchema: mcp.ToolInputSchema{
			Type: "object",
			Properties: map[string]interface{}{
				"title": map[string]interface{}{"type": "string"},
				"category": map[string]interface{}{
					"type": "string",
					"defs": "category of the risk",
				},
				"organizationId": map[string]interface{}{"type": "string"},
				"description":    map[string]interface{}{"type": "string"},
				"probability":    map[string]interface{}{"type": "number"},
				"impact":         map[string]interface{}{"type": "number"},
				"submissionType": map[string]interface{}{"type": "string"},
				"controllability": map[string]interface{}{
					"type": "string",
					"enum": []string{"C", "UC"},
					"defs": "C for Controllable, UC for Uncontrollable",
				},
				"controlEffectiveness": map[string]interface{}{"type": "string"},
			},
			Required: []string{"title", "category", "organizationId", "probability", "impact", "controllability"},
		},
	}
	s.AddTool(createTool, func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := argsMap(req)
		sess, _ := mgr.Get()
		result, err := HandleCreateRisk(ctx, c.RiskCreateUC, c.RiskGetUC, sess, args)
		if err != nil {
			return errorResult(err.Error()), nil
		}
		return successResult(result), nil
	})

	updateTool := mcp.Tool{
		Name:        "update_risk_draft",
		Description: "Update a draft risk this is a put request so need to merge with existing data first",
		InputSchema: mcp.ToolInputSchema{
			Type: "object",
			Properties: map[string]interface{}{
				"id":    map[string]interface{}{"type": "string"},
				"title": map[string]interface{}{"type": "string"},
				"category": map[string]interface{}{
					"type": "string",
					"defs": "category of the risk",
				},
				"organizationId": map[string]interface{}{"type": "string"},
				"description":    map[string]interface{}{"type": "string"},
				"probability":    map[string]interface{}{"type": "number"},
				"impact":         map[string]interface{}{"type": "number"},
				"status": map[string]interface{}{
					"type": "string",
					"defs": "status of the risk (assessment_draft, assessment_in_review, approved)",
				},
			},
			Required: []string{"id"},
		},
	}
	s.AddTool(updateTool, func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := argsMap(req)
		sess, _ := mgr.Get()
		result, err := HandleUpdateRiskDraft(ctx, c.RiskUpdateUC, c.RiskGetUC, sess, args)
		if err != nil {
			return errorResult(err.Error()), nil
		}
		return successResult(result), nil
	})
}

func RegisterRiskMonitoringTools(s *server.MCPServer, c *bootstrap.Container, mgr *session.Manager) {
	monitorTool := mcp.Tool{
		Name:        "monitor_and_approve_risk",
		Description: "Legacy tool name. Current behavior creates a risk reassessment draft only",
		InputSchema: mcp.ToolInputSchema{
			Type: "object",
			Properties: map[string]interface{}{
				"riskId":          map[string]interface{}{"type": "string"},
				"assessmentCycle": map[string]interface{}{"type": "string"},
				"submissionType":  map[string]interface{}{"type": "string"},
			},
			Required: []string{"riskId", "assessmentCycle"},
		},
	}
	s.AddTool(monitorTool, func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := argsMap(req)
		sess, _ := mgr.Get()
		result, err := HandleMonitorRisk(ctx, c.RiskReassessUC, sess, args)
		if err != nil {
			return errorResult(err.Error()), nil
		}
		return successResult(result), nil
	})

	updateTool := mcp.Tool{
		Name:        "update_monitoring_draft",
		Description: "Update a risk reassessment draft",
		InputSchema: mcp.ToolInputSchema{
			Type: "object",
			Properties: map[string]interface{}{
				"id":              map[string]interface{}{"type": "string"},
				"reviewSummary":   map[string]interface{}{"type": "string"},
				"assessmentCycle": map[string]interface{}{"type": "string"},
			},
			Required: []string{"id"},
		},
	}
	s.AddTool(updateTool, func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := argsMap(req)
		sess, _ := mgr.Get()
		result, err := HandleUpdateMonitoringDraft(ctx, c.RiskUpdateUC, c.RiskGetUC, sess, args)
		if err != nil {
			return errorResult(err.Error()), nil
		}
		return successResult(result), nil
	})
}
