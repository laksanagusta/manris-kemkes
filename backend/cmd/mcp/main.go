package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/manris/backend/internal/bootstrap"
	"github.com/manris/backend/internal/config"
	"github.com/manris/backend/internal/mcp/session"
	"github.com/manris/backend/internal/mcp/tools"
	"github.com/mark3labs/mcp-go/server"
)

// loadEnvFile attempts to load .env file from multiple locations with fallback chain.
// Lookup order (first hit wins):
// 1. MANRIS_ENV_FILE env var (if set, MUST exist or logs error)
// 2. .env in current working directory
// 3. .env in the directory containing the executable
// 4. .env in the parent of the executable's directory
// Returns the resolved absolute path on success, empty string if all attempts fail.
// Does NOT fail if .env is not found — env vars may come from parent process.
func loadEnvFile() string {
	// Attempt 1: MANRIS_ENV_FILE env var
	if envPath := os.Getenv("MANRIS_ENV_FILE"); envPath != "" {
		if _, err := os.Stat(envPath); err == nil {
			if err := godotenv.Load(envPath); err != nil {
				log.Printf("mcp: failed to load MANRIS_ENV_FILE=%s: %v", envPath, err)
			} else {
				absPath, _ := filepath.Abs(envPath)
				log.Printf("mcp: loaded env from MANRIS_ENV_FILE: %s", absPath)
				return absPath
			}
		} else {
			log.Printf("mcp: MANRIS_ENV_FILE=%s not found: %v", envPath, err)
		}
	}

	// Attempt 2: .env in current working directory
	if err := godotenv.Load(".env"); err == nil {
		absPath, _ := filepath.Abs(".env")
		log.Printf("mcp: loaded env from cwd: %s", absPath)
		return absPath
	}

	// Attempt 3: .env in executable's directory
	exePath, err := os.Executable()
	if err == nil {
		exePath, _ = filepath.EvalSymlinks(exePath)
		exeDir := filepath.Dir(exePath)
		envPath := filepath.Join(exeDir, ".env")
		if err := godotenv.Load(envPath); err == nil {
			absPath, _ := filepath.Abs(envPath)
			log.Printf("mcp: loaded env from exe dir: %s", absPath)
			return absPath
		}
	}

	// Attempt 4: .env in parent of executable's directory
	if err == nil {
		exePath, _ := filepath.EvalSymlinks(exePath)
		exeDir := filepath.Dir(exePath)
		parentDir := filepath.Dir(exeDir)
		envPath := filepath.Join(parentDir, ".env")
		if err := godotenv.Load(envPath); err == nil {
			absPath, _ := filepath.Abs(envPath)
			log.Printf("mcp: loaded env from parent dir: %s", absPath)
			return absPath
		}
	}

	// No .env found in any location
	log.Println("mcp: no .env file found in any fallback location — env vars may be set by parent process")
	return ""
}

func main() {
	loadEnvFile()

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
