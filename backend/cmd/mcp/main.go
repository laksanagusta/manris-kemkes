package main

import (
	"context"
	"encoding/json"
	"log"

	"github.com/manris/backend/internal/bootstrap"
	"github.com/manris/backend/internal/config"
	"github.com/manris/backend/internal/mcp/session"
	"github.com/manris/backend/internal/mcp/tools"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

func main() {
	cfg := config.Load()

	ctx := context.Background()
	container, err := bootstrap.Build(ctx, cfg)
	if err != nil {
		log.Fatalf("failed to build container: %v", err)
	}
	defer container.Close()

	sessionMgr := &session.Manager{}

	mcpServer := server.NewMCPServer(
		"manris-mcp",
		"1.0.0",
	)

	toolList := []mcp.Tool{
		{
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
		},
		{
			Name:        "get_risk",
			Description: "Get a specific risk by ID",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"id": map[string]interface{}{"type": "string", "description": "Risk ID"},
				},
				Required: []string{"id"},
			},
		},
		{
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
		},
		{
			Name:        "create_and_approve_risk",
			Description: "Create a new risk and submit for approval",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"title":           map[string]interface{}{"type": "string"},
					"category":        map[string]interface{}{"type": "string"},
					"organizationId":  map[string]interface{}{"type": "string"},
					"description":     map[string]interface{}{"type": "string"},
					"probability":     map[string]interface{}{"type": "number"},
					"impact":          map[string]interface{}{"type": "number"},
					"weight":          map[string]interface{}{"type": "number"},
					"riskApproverIds": map[string]interface{}{"type": "array"},
					"submissionType":  map[string]interface{}{"type": "string"},
				},
				Required: []string{"title", "category", "organizationId", "probability", "impact"},
			},
		},
		{
			Name:        "update_risk_draft",
			Description: "Update a draft risk",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"id":          map[string]interface{}{"type": "string"},
					"title":       map[string]interface{}{"type": "string"},
					"category":    map[string]interface{}{"type": "string"},
					"description": map[string]interface{}{"type": "string"},
					"probability": map[string]interface{}{"type": "number"},
					"impact":      map[string]interface{}{"type": "number"},
				},
				Required: []string{"id"},
			},
		},
		{
			Name:        "monitor_and_approve_risk",
			Description: "Create a risk reassessment and submit for approval",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"riskId":          map[string]interface{}{"type": "string"},
					"assessmentCycle": map[string]interface{}{"type": "string"},
					"riskApproverIds": map[string]interface{}{"type": "array"},
					"submissionType":  map[string]interface{}{"type": "string"},
				},
				Required: []string{"riskId", "assessmentCycle"},
			},
		},
		{
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
		},
	}

	for _, tool := range toolList {
		toolCopy := tool
		mcpServer.AddTool(toolCopy, makeTool(ctx, container, sessionMgr, tool.Name))
	}

	if err := server.ServeStdio(mcpServer); err != nil {
		log.Fatalf("stdio server error: %v", err)
	}
}

func makeTool(ctx context.Context, container *bootstrap.Container, sessionMgr *session.Manager, toolName string) func(context.Context, mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.Params.Arguments.(map[string]interface{})

		switch toolName {
		case "login":
			email, _ := args["email"].(string)
			password, _ := args["password"].(string)
			deps := tools.Deps{
				AuthLoginUC:    container.AuthLoginUC,
				SessionManager: sessionMgr,
			}
			result, err := tools.HandleLogin(ctx, deps, email, password)
			if err != nil {
				return errorResult(err.Error()), nil
			}
			return successResult(result), nil

		case "get_risk":
			idStr, _ := args["id"].(string)
			sess, _ := sessionMgr.Get()
			result, err := tools.HandleGetRisk(ctx, container.RiskGetUC, sess, idStr)
			if err != nil {
				return errorResult(err.Error()), nil
			}
			return successResult(result), nil

		case "list_risks":
			sess, _ := sessionMgr.Get()
			result, err := tools.HandleListRisks(ctx, container.RiskListUC, sess, args)
			if err != nil {
				return errorResult(err.Error()), nil
			}
			return successResult(result), nil

		case "create_and_approve_risk":
			sess, _ := sessionMgr.Get()
			result, err := tools.HandleCreateAndApproveRisk(ctx, container.RiskCreateUC, container.ApprovalSubmitUC, container.RiskGetUC, sess, args)
			if err != nil {
				return errorResult(err.Error()), nil
			}
			return successResult(result), nil

		case "update_risk_draft":
			sess, _ := sessionMgr.Get()
			result, err := tools.HandleUpdateRiskDraft(ctx, container.RiskUpdateUC, container.RiskGetUC, sess, args)
			if err != nil {
				return errorResult(err.Error()), nil
			}
			return successResult(result), nil

		case "monitor_and_approve_risk":
			sess, _ := sessionMgr.Get()
			result, err := tools.HandleMonitorAndApproveRisk(ctx, container.RiskReassessUC, container.ApprovalSubmitUC, sess, args)
			if err != nil {
				return errorResult(err.Error()), nil
			}
			return successResult(result), nil

		case "update_monitoring_draft":
			sess, _ := sessionMgr.Get()
			result, err := tools.HandleUpdateMonitoringDraft(ctx, container.RiskUpdateUC, sess, args)
			if err != nil {
				return errorResult(err.Error()), nil
			}
			return successResult(result), nil

		default:
			return errorResult("unknown tool: " + toolName), nil
		}
	}
}

func successResult(data map[string]interface{}) *mcp.CallToolResult {
	b, _ := json.Marshal(data)
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
