# Load environment variables
include .env
export

# Database variables
DB_URL=$(DATABASE_URL)
MIGRATIONS_DIR="db/migrations"

.PHONY: install-migrate migrate-up migrate-down migrate-force seed run

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
