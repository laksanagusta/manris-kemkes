package http

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"log/slog"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/middleware"
)

func TestProblemLogsExcludeSensitiveDetails(t *testing.T) {
	const secret = "PRIVATE-HTTP-CONTENT-445566"
	const correlationID = "72ed67a9-6df4-479e-879f-a5710826ded5"
	cases := []struct {
		name   string
		status int
		handle fiber.Handler
	}{
		{"unexpected error", 500, func(c *fiber.Ctx) error { return handleError(c, fmt.Errorf("provider: %s", secret)) }},
		{"validation error", 422, func(c *fiber.Ctx) error {
			return handleError(c, domainerrors.Wrap(domainerrors.ErrInvalidInput, secret))
		}},
		{"not found", 404, func(c *fiber.Ctx) error { return handleError(c, domainerrors.Wrap(domainerrors.ErrNotFound, secret)) }},
		{"unauthorized", 401, func(c *fiber.Ctx) error {
			return handleError(c, domainerrors.Wrap(domainerrors.ErrUnauthorized, secret))
		}},
		{"forbidden", 403, func(c *fiber.Ctx) error { return handleError(c, domainerrors.Wrap(domainerrors.ErrForbidden, secret)) }},
		{"direct problem", 400, func(c *fiber.Ctx) error { return sendProblemDetails(c, 400, secret, secret, secret) }},
		{"problem with details", 422, func(c *fiber.Ctx) error {
			return sendProblemDetailsWithDetails(c, 422, secret, secret, secret, map[string]string{"source": secret})
		}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var logs bytes.Buffer
			previousLogger, previousWriter, previousFlags := slog.Default(), log.Writer(), log.Flags()
			slog.SetDefault(slog.New(slog.NewJSONHandler(&logs, nil)))
			t.Cleanup(func() {
				slog.SetDefault(previousLogger)
				log.SetOutput(previousWriter)
				log.SetFlags(previousFlags)
			})
			app := fiber.New()
			app.Use(middleware.CorrelationID())
			app.Post("/imports/:id", tc.handle)
			req := httptest.NewRequest("POST", "/imports/"+secret+"?query="+secret, strings.NewReader(secret))
			req.Header.Set("X-Correlation-ID", correlationID)
			req.Header.Set("Authorization", "Bearer "+secret)
			res, err := app.Test(req)
			if err != nil {
				t.Fatal(err)
			}
			defer res.Body.Close()
			if res.StatusCode != tc.status {
				t.Fatalf("status = %d, want %d", res.StatusCode, tc.status)
			}
			var problem map[string]any
			if err := json.NewDecoder(res.Body).Decode(&problem); err != nil {
				t.Fatal(err)
			}
			if problem["detail"] == nil || problem["status"] != float64(tc.status) {
				t.Fatal("problem response contract was lost")
			}
			if strings.Contains(logs.String(), secret) {
				t.Fatal("request, error, or problem details leaked to logs")
			}
			if strings.Count(strings.TrimSpace(logs.String()), "\n") != 0 {
				t.Fatal("one problem must produce a single log event")
			}
			var event map[string]any
			if err := json.Unmarshal(bytes.TrimSpace(logs.Bytes()), &event); err != nil {
				t.Fatalf("log must be structured JSON: %v", err)
			}
			if event["route"] != "/imports/:id" || event["correlation_id"] != correlationID || event["status"] != float64(tc.status) || event["error_code"] == "" {
				t.Fatal("safe troubleshooting metadata is missing")
			}
		})
	}
}
