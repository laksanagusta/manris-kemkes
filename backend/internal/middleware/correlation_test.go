package middleware

import (
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/pkg/requestmeta"
)

func TestCorrelationIDUsesOnlyCanonicalUUIDs(t *testing.T) {
	cases := []struct {
		name   string
		header string
		want   string
	}{
		{name: "missing header"},
		{name: "sensitive header", header: "PRIVATE-DOCUMENT-IN-HEADER"},
		{name: "valid UUID", header: "72ed67a9-6df4-479e-879f-a5710826ded5", want: "72ed67a9-6df4-479e-879f-a5710826ded5"},
		{name: "canonicalize UUID", header: "72ED67A9-6DF4-479E-879F-A5710826DED5", want: "72ed67a9-6df4-479e-879f-a5710826ded5"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			app := fiber.New()
			app.Use(CorrelationID())
			app.Get("/test", func(c *fiber.Ctx) error {
				id, ok := c.Locals("correlationId").(string)
				if !ok || requestmeta.CorrelationID(c.Context()) != id {
					t.Error("correlation ID is not available to downstream context/logging")
				}
				return c.SendStatus(204)
			})
			req := httptest.NewRequest("GET", "/test", nil)
			req.Header.Set("X-Correlation-ID", tc.header)
			res, err := app.Test(req)
			if err != nil {
				t.Fatal(err)
			}
			defer res.Body.Close()
			id := res.Header.Get("X-Correlation-ID")
			if _, err := uuid.Parse(id); err != nil {
				t.Fatalf("response ID is not a UUID: %v", err)
			}
			if tc.want != "" && id != tc.want {
				t.Fatal("valid correlation ID was not preserved")
			}
			if tc.want == "" && id == tc.header {
				t.Fatal("untrusted header was not replaced")
			}
		})
	}
}
