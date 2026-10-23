package http

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	evaluationuc "github.com/manris/backend/internal/usecase/evaluation"
)

type shinkaSourceFixture struct{ calls int }

func (f *shinkaSourceFixture) Execute(_ context.Context, id uuid.UUID, period string) (evaluationuc.ShinkaSnapshot, error) {
	f.calls++
	return evaluationuc.ShinkaSnapshot{SchemaVersion: 1, OrganizationID: id, Period: period, CapturedAt: time.Now()}, nil
}

type shinkaMemoFixture struct {
	bodies map[uuid.UUID]json.RawMessage
	hashes map[uuid.UUID]string
}

func (f *shinkaMemoFixture) Get(_ context.Context, id uuid.UUID) (string, json.RawMessage, error) {
	return f.hashes[id], f.bodies[id], nil
}
func (f *shinkaMemoFixture) Save(_ context.Context, id uuid.UUID, hash string, body json.RawMessage) (string, json.RawMessage, error) {
	f.hashes[id] = hash
	f.bodies[id] = body
	return hash, body, nil
}
func TestShinkaWebhookAuthenticatesAndReplaysFrozenResponse(t *testing.T) {
	key := strings.Repeat("test-key", 5)
	source := &shinkaSourceFixture{}
	memo := &shinkaMemoFixture{bodies: map[uuid.UUID]json.RawMessage{}, hashes: map[uuid.UUID]string{}}
	hookID := uuid.NewString()
	handler := NewShinkaSnapshotHandler(key, source, memo)
	app := fiber.New()
	app.Post("/hook", handler.Handle)
	eventID := uuid.NewString()
	body := fmt.Sprintf(`{"webhookId":%q,"eventId":%q,"event":"submission.onCreate","context":{"webhookId":%q,"period":"2026-Q4","evaluationType":"manris-evaluation"},"submission":{"id":%q,"topicId":%q,"organizationId":%q,"status":"Draft"}}`, hookID, eventID, hookID, uuid.NewString(), uuid.NewString(), uuid.NewString())
	request := func(payload string, authenticated bool, overrideKey ...string) (int, string) {
		t.Helper()
		req := httptest.NewRequest("POST", "/hook", strings.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Shinka-Webhook-ID", hookID)
		if authenticated {
			credential := key
			if len(overrideKey) > 0 {
				credential = overrideKey[0]
			}
			req.Header.Set("X-Api-Key", credential)
		}
		req.Header.Set("X-Shinka-Event-ID", eventID)
		response, err := app.Test(req)
		if err != nil {
			t.Fatal(err)
		}
		defer response.Body.Close()
		raw, _ := io.ReadAll(response.Body)
		return response.StatusCode, string(raw)
	}
	if status, _ := request(body, false); status != 401 || source.calls != 0 {
		t.Fatal("unsigned event reached source")
	}
	if status, _ := request(body, true, "wrong-key"); status != 401 || source.calls != 0 {
		t.Fatal("wrong API key reached source")
	}
	status, first := request(body, true)
	if status != 200 {
		t.Fatal(status, first)
	}
	var response struct {
		CustomVar map[string]json.RawMessage `json:"customVar"`
	}
	if json.Unmarshal([]byte(first), &response) != nil || string(response.CustomVar["riskCount"]) != "0" || response.CustomVar["_snapshot"] == nil || response.CustomVar["manris"] != nil {
		t.Fatal("wrong direct customVar shape")
	}
	if status, _ := request(strings.ReplaceAll(body, hookID, uuid.NewString()), true); status != 422 {
		t.Fatal("wrong webhook ID accepted", status)
	}
	status, second := request(body, true)
	if status != 200 || first != second || source.calls != 1 {
		t.Fatal("retry regenerated snapshot")
	}
	changed := strings.Replace(body, "2026-Q4", "2026-Q3", 1)
	if status, _ := request(changed, true); status != 409 {
		t.Fatal("event reused with different payload", status)
	}
	oldHook, oldEvent := hookID, eventID
	hookID, eventID = uuid.NewString(), uuid.NewString()
	another := strings.ReplaceAll(strings.ReplaceAll(body, oldHook, hookID), oldEvent, eventID)
	if status, _ := request(another, true); status != 200 || source.calls != 2 {
		t.Fatal("same integration API key could not serve another webhook", status)
	}

}
