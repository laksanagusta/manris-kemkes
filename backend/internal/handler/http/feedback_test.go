package http

import (
	"context"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	feedbackuc "github.com/manris/backend/internal/usecase/feedback"
)

type feedbackRepoStub struct {
	saved *entity.Feedback
	err   error
}

func (r *feedbackRepoStub) Create(_ context.Context, input *entity.Feedback) (*entity.Feedback, error) {
	r.saved = input
	return input, r.err
}

func TestFeedbackCreate(t *testing.T) {
	actor, requestID := uuid.New(), uuid.New()
	valid := `{"message":"  Saran untuk aplikasi\n  ","requestId":"` + requestID.String() + `","createdBy":"` + uuid.NewString() + `"}`
	for _, tt := range []struct {
		name, role, body string
		authenticated    bool
		repoErr          error
		status           int
	}{
		{"unit", "unit", valid, true, nil, 201},
		{"reviewer", "reviewer", valid, true, nil, 201},
		{"pimpinan", "pimpinan", valid, true, nil, 201},
		{"superadmin", "superadmin", valid, true, nil, 201},
		{"unauthenticated", "", valid, false, nil, 401},
		{"malformed JSON", "unit", `{`, true, nil, 422},
		{"empty", "unit", `{"message":" \n\t","requestId":"` + requestID.String() + `"}`, true, nil, 422},
		{"over limit", "unit", `{"message":"` + strings.Repeat("a", 2001) + `","requestId":"` + requestID.String() + `"}`, true, nil, 422},
		{"unicode at limit", "unit", `{"message":"` + strings.Repeat("漢", 2000) + `","requestId":"` + requestID.String() + `"}`, true, nil, 201},
		{"null character", "unit", `{"message":"a\u0000b","requestId":"` + requestID.String() + `"}`, true, nil, 422},
		{"invalid key", "unit", `{"message":"Hello","requestId":"bad"}`, true, nil, 422},
		{"nil key", "unit", `{"message":"Hello","requestId":"` + uuid.Nil.String() + `"}`, true, nil, 422},
		{"conflicting retry", "unit", valid, true, domainerrors.ErrConflict, 409},
		{"database error", "unit", valid, true, errors.New("private database connection details"), 500},
	} {
		t.Run(tt.name, func(t *testing.T) {
			repo := &feedbackRepoStub{err: tt.repoErr}
			h := NewFeedbackHandler(feedbackuc.NewService(repo))
			app := fiber.New()
			app.Post("/feedback", func(c *fiber.Ctx) error {
				if tt.authenticated {
					c.Locals("accessScope", &entity.AccessScope{UserID: actor, Role: tt.role})
				}
				return h.Create(c)
			})
			req := httptest.NewRequest("POST", "/feedback", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			res, err := app.Test(req)
			if err != nil {
				t.Fatal(err)
			}
			defer res.Body.Close()
			if res.StatusCode != tt.status {
				t.Fatalf("got %d want %d", res.StatusCode, tt.status)
			}
			if tt.status == 201 {
				if repo.saved == nil || repo.saved.CreatedBy != actor || repo.saved.RequestID != requestID {
					t.Fatal("identity or request key not preserved")
				}
				if tt.name != "unicode at limit" && repo.saved.Message != "Saran untuk aplikasi" {
					t.Fatal("message not normalized")
				}
			}
			if tt.status == 422 || tt.status == 401 {
				if repo.saved != nil {
					t.Fatal("invalid request reached persistence")
				}
			}
			if tt.status == 500 {
				var body map[string]any
				if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
					t.Fatal(err)
				}
				if strings.Contains(body["detail"].(string), "private") {
					t.Fatal("internal error exposed")
				}
			}
		})
	}
}
