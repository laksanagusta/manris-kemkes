package http

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	evaluationuc "github.com/manris/backend/internal/usecase/evaluation"
)

type shinkaSnapshotSource interface {
	Execute(context.Context, uuid.UUID, string) (evaluationuc.ShinkaSnapshot, error)
}
type shinkaSnapshotMemo interface {
	Get(context.Context, uuid.UUID) (string, json.RawMessage, error)
	Save(context.Context, uuid.UUID, string, json.RawMessage) (string, json.RawMessage, error)
}
type ShinkaSnapshotHandler struct {
	keyHash    [32]byte
	configured bool
	source     shinkaSnapshotSource
	memo       shinkaSnapshotMemo
}

func NewShinkaSnapshotHandler(apiKey string, source shinkaSnapshotSource, memo shinkaSnapshotMemo) *ShinkaSnapshotHandler {
	return &ShinkaSnapshotHandler{keyHash: sha256.Sum256([]byte(apiKey)), configured: len(apiKey) >= 32, source: source, memo: memo}
}
func (h *ShinkaSnapshotHandler) Handle(c *fiber.Ctx) error {
	fail := func(status int, code string) error {
		return c.Status(status).JSON(fiber.Map{"error": fiber.Map{"code": code}})
	}
	if !h.configured || h.source == nil || h.memo == nil {
		return fail(503, "snapshot_unavailable")
	}
	body := c.Body()
	if len(body) > 1<<20 {
		return fail(413, "payload_too_large")
	}
	supplied := c.Context().Request.Header.PeekAll("X-Api-Key")
	if len(supplied) != 1 {
		return fail(401, "invalid_api_key")
	}
	suppliedHash := sha256.Sum256(supplied[0])
	if subtle.ConstantTimeCompare(suppliedHash[:], h.keyHash[:]) != 1 {
		return fail(401, "invalid_api_key")
	}
	eventID := c.Get("X-Shinka-Event-ID")
	var input struct {
		WebhookID uuid.UUID `json:"webhookId"`
		EventID   uuid.UUID `json:"eventId"`
		Event     string    `json:"event"`
		Context   struct {
			WebhookID      uuid.UUID `json:"webhookId"`
			Period         string    `json:"period"`
			EvaluationType string    `json:"evaluationType"`
		} `json:"context"`
		Submission struct {
			ID             uuid.UUID `json:"id"`
			TopicID        uuid.UUID `json:"topicId"`
			OrganizationID uuid.UUID `json:"organizationId"`
			Status         string    `json:"status"`
		} `json:"submission"`
	}
	if json.Unmarshal(body, &input) != nil || input.Event != "submission.onCreate" || input.WebhookID == uuid.Nil || input.WebhookID.String() != c.Get("X-Shinka-Webhook-ID") || input.EventID == uuid.Nil || input.EventID.String() != eventID || input.Context.WebhookID != input.WebhookID || input.Submission.ID == uuid.Nil || input.Submission.TopicID == uuid.Nil || input.Submission.OrganizationID == uuid.Nil || (input.Submission.Status != "Draft" && input.Submission.Status != "Revision required") || input.Context.EvaluationType != "manris-evaluation" {
		return fail(422, "invalid_snapshot_request")
	}
	sum := sha256.Sum256(body)
	requestHash := hex.EncodeToString(sum[:])
	ctx, cancel := context.WithTimeout(c.UserContext(), 6*time.Second)
	defer cancel()
	existingHash, existing, err := h.memo.Get(ctx, input.EventID)
	if err != nil {
		return fail(503, "snapshot_unavailable")
	}
	if existing != nil {
		if existingHash != requestHash {
			return fail(409, "event_payload_changed")
		}
		return c.Type("json").Send(existing)
	}
	snapshot, err := h.source.Execute(ctx, input.Submission.OrganizationID, input.Context.Period)
	if err != nil {
		return fail(422, "snapshot_source_unavailable")
	}
	response, err := json.Marshal(fiber.Map{"customVar": fiber.Map{
		"riskCount":         snapshot.Data.RiskCount,
		"risks":             snapshot.Data.Risks,
		"mitigationSummary": snapshot.Data.MitigationSummary,
		"organization":      snapshot.Data.Organization,
		"_snapshot":         fiber.Map{"schemaVersion": snapshot.SchemaVersion, "source": snapshot.Source, "organizationId": snapshot.OrganizationID, "period": snapshot.Period, "capturedAt": snapshot.CapturedAt, "sourceVersion": snapshot.SourceVersion},
	}})
	if err != nil || len(response) > 1<<20 {
		return fail(413, "snapshot_too_large")
	}
	storedHash, stored, err := h.memo.Save(ctx, input.EventID, requestHash, response)
	if err != nil {
		return fail(503, "snapshot_unavailable")
	}
	if storedHash != requestHash {
		return fail(409, "event_payload_changed")
	}
	return c.Type("json").Send(stored)
}
