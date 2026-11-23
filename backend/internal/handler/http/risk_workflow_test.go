package http

import (
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

func TestRiskWorkflowConflictResponse(t *testing.T) {
	for _, blocked := range []struct {
		name string
		err  error
	}{
		{"revision", domainerrors.ErrRiskRevisionInProgress}, {"monitoring", domainerrors.ErrRiskMonitoringInProgress},
		{"period", domainerrors.ErrRiskRevisionPeriodInProgress},
	} {
		t.Run(blocked.name, func(t *testing.T) {
			app := fiber.New()
			app.Post("/start", func(c *fiber.Ctx) error { return handleError(c, domainerrors.Wrap(blocked.err, "start rejected")) })
			response, err := app.Test(httptest.NewRequest("POST", "/start", nil))
			if err != nil {
				t.Fatal(err)
			}
			defer response.Body.Close()
			body, err := io.ReadAll(response.Body)
			if err != nil {
				t.Fatal(err)
			}
			if response.StatusCode != 409 || !strings.Contains(string(body), blocked.err.Error()) {
				t.Fatalf("status=%d body=%s", response.StatusCode, body)
			}
		})
	}
}
