# Multi-stage build: Stage 1 - Builder
FROM golang:1.26-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git curl tar

WORKDIR /build

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build binary with CGO disabled for Alpine compatibility
RUN CGO_ENABLED=0 GOOS=linux go build -o server cmd/server/main.go

# Download golang-migrate CLI
RUN curl -L https://github.com/golang-migrate/migrate/releases/download/v4.18.2/migrate.linux-amd64.tar.gz | tar xvz && \
    mv migrate /build/migrate

# Multi-stage build: Stage 2 - Runtime
FROM alpine:3.21

# Install ca-certificates for HTTPS calls (e.g., OpenAI API)
RUN apk add --no-cache ca-certificates

# Create non-root user
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser

WORKDIR /app

# Copy binary from builder
COPY --from=builder /build/server .

# Copy migrate binary from builder
COPY --from=builder /build/migrate .

# Copy migrations directory
COPY db/migrations ./migrations

# Copy entrypoint script
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Set ownership to non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port (default Fiber port)
EXPOSE 8080

# Health check (optional - can be used by orchestrators)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Run entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]
