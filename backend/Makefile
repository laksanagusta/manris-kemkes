# Load environment variables
include .env
export

# Database variables
DB_URL=$(DATABASE_URL)
MIGRATIONS_DIR="db/migrations"

.PHONY: install-migrate migrate-up migrate-down migrate-force seed run build-mcp run-mcp test-mcp

# Install golang-migrate CLI
install-migrate:
	go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Run migrations (create schema)
migrate-up:
	migrate -path $(MIGRATIONS_DIR) -database "$(DB_URL)" up

# Run migrations down (destroy schema)
migrate-down:
	migrate -path $(MIGRATIONS_DIR) -database "$(DB_URL)" down 1

# Force a specific migration version (if dirty state occurs)
migrate-force:
	@read -p "Enter version: " version; \
	migrate -path $(MIGRATIONS_DIR) -database "$(DB_URL)" force $$version

# Create a new migration file (usage: make migrate-new name=your_migration)
migrate-new:
	migrate create -ext sql -dir $(MIGRATIONS_DIR) -seq $(name)

# Run application
run:
	go run cmd/server/main.go

# ============================================================================
# MCP Server (Model Context Protocol) Targets
# ============================================================================

# Build MCP stdio server binary
build-mcp:
	@echo "Building manris-mcp binary..."
	go build -o server-mcp ./cmd/mcp
	@echo "✓ Built: ./server-mcp"

# Build MCP with optimizations
build-mcp-prod:
	@echo "Building manris-mcp binary (production)..."
	go build -ldflags="-s -w" -o server-mcp ./cmd/mcp
	@echo "✓ Built: ./server-mcp (optimized)"

# Run MCP server directly (stdio mode)
run-mcp: build-mcp
	@echo "Starting MCP server (stdio mode)..."
	@echo "Listening on stdin/stdout. Send JSON-RPC 2.0 requests."
	./server-mcp

# Test MCP tools and components
test-mcp:
	@echo "Running MCP test suite..."
	go test ./internal/mcp/... -v
	@echo "✓ All MCP tests passed"

# Test with coverage
test-mcp-coverage:
	go test ./internal/mcp/... -v -coverprofile=coverage-mcp.out
	go tool cover -html=coverage-mcp.out -o coverage-mcp.html
	@echo "✓ Coverage report: coverage-mcp.html"

# Lint MCP code
lint-mcp:
	go vet ./internal/mcp/...
	go fmt ./internal/mcp/...
	@echo "✓ MCP code linted"
