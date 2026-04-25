package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/manris/backend/internal/bootstrap"
	"github.com/manris/backend/internal/config"
	"github.com/manris/backend/internal/mcp/session"
	"github.com/manris/backend/internal/mcp/tools"
	"github.com/mark3labs/mcp-go/server"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Printf("mcp: no .env file loaded: %v", err)
	}

	cfg := config.Load()

	if cfg.RiskApprovalWorkflowEnabled {
		log.Println("mcp: WARNING — RISK_APPROVAL_WORKFLOW_ENABLED=true, but MVP iteration assumes false (auto-approve)")
	} else {
		log.Println("mcp: approval workflow disabled (MVP)")
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	container, err := bootstrap.Build(ctx, cfg)
	if err != nil {
		log.Fatalf("failed to build container: %v", err)
	}
	defer container.Close()

	sessionMgr := &session.Manager{}
	sessionTTL := time.Duration(cfg.JWTExpiry) * time.Hour
	if sessionTTL <= 0 {
		sessionTTL = 24 * time.Hour
	}

	mcpServer := server.NewMCPServer(
		"manris-mcp",
		"1.0.0",
	)

	tools.RegisterAuthTools(mcpServer, container, sessionMgr, sessionTTL)
	tools.RegisterRiskQueryTools(mcpServer, container, sessionMgr)
	tools.RegisterRiskWriteTools(mcpServer, container, sessionMgr)
	tools.RegisterRiskMonitoringTools(mcpServer, container, sessionMgr)

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		log.Println("mcp: shutdown signal received")
		cancel()
	}()

	if err := server.ServeStdio(mcpServer); err != nil {
		log.Fatalf("stdio server error: %v", err)
	}
}
