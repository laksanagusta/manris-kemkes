package http

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/agent"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/service/documenttext"
)

// AgentApplication keeps HTTP transport separate from private conversation storage.
type AgentApplication interface {
	Skills() []agent.Skill
	ListConversations(context.Context, uuid.UUID) ([]agent.Conversation, error)
	CreateConversation(context.Context, uuid.UUID, string) (agent.Conversation, error)
	Detail(context.Context, uuid.UUID, uuid.UUID) (agent.ConversationDetail, error)
	SendMessage(context.Context, uuid.UUID, uuid.UUID, agent.SendMessageInput) (agent.Run, error)
	AddAttachment(context.Context, uuid.UUID, uuid.UUID, agent.AttachmentInput) (agent.Attachment, error)
	Cancel(context.Context, uuid.UUID, uuid.UUID, uuid.UUID) error
	UpdateProposal(context.Context, uuid.UUID, uuid.UUID, uuid.UUID, int, []agent.Operation) (agent.Proposal, error)
	ApplyProposal(context.Context, uuid.UUID, uuid.UUID, uuid.UUID, int, string) (agent.Proposal, error)
	RejectProposal(context.Context, uuid.UUID, uuid.UUID, uuid.UUID, int) (agent.Proposal, error)
}

type AgentHandler struct{ service AgentApplication }

func NewAgentHandler(service AgentApplication) *AgentHandler { return &AgentHandler{service: service} }

// RegisterRoutes must receive the application's identity/full-session router.
func (h *AgentHandler) RegisterRoutes(parent fiber.Router) {
	routes := parent.Group("/agent", func(c *fiber.Ctx) error {
		c.Set(fiber.HeaderCacheControl, "no-store")
		actor, _ := userIDFromContext(c)
		if actor == uuid.Nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Sesi pengguna diperlukan"})
		}
		c.Locals("agentActor", actor)
		if h.service == nil {
			return agentHTTPError(c, agent.ErrUnavailable)
		}
		return c.Next()
	})
	routes.Get("/skills", func(c *fiber.Ctx) error { return c.JSON(fiber.Map{"data": h.service.Skills()}) })
	routes.Get("/conversations", h.List)
	routes.Post("/conversations", h.Create)
	routes.Get("/conversations/:id", h.Detail)
	routes.Post("/conversations/:id/messages", h.Send)
	routes.Post("/conversations/:id/attachments", h.Upload)
	routes.Get("/conversations/:id/messages/:messageId/export", h.Export)
	routes.Post("/conversations/:id/runs/:runId/cancel", h.Cancel)
	routes.Put("/conversations/:id/proposals/:proposalId", h.UpdateProposal)
	routes.Post("/conversations/:id/proposals/:proposalId/apply", h.ApplyProposal)
	routes.Post("/conversations/:id/proposals/:proposalId/reject", h.RejectProposal)
}

func agentActor(c *fiber.Ctx) uuid.UUID { return c.Locals("agentActor").(uuid.UUID) }

func agentParam(c *fiber.Ctx, key string) (uuid.UUID, error) {
	id, err := uuid.Parse(c.Params(key))
	if err != nil || id == uuid.Nil {
		return uuid.Nil, agent.ErrInvalidInput
	}
	return id, nil
}

func agentDecode(c *fiber.Ctx, target any) error {
	if len(c.Body()) == 0 || len(c.Body()) > 256*1024 {
		return agent.ErrInvalidInput
	}
	decoder := json.NewDecoder(bytes.NewReader(c.Body()))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return agent.ErrInvalidInput
	}
	var trailing any
	if err := decoder.Decode(&trailing); err != io.EOF {
		return agent.ErrInvalidInput
	}
	return nil
}

func (h *AgentHandler) List(c *fiber.Ctx) error {
	items, err := h.service.ListConversations(c.Context(), agentActor(c))
	if err != nil {
		return agentHTTPError(c, err)
	}
	return c.JSON(fiber.Map{"data": items})
}

func (h *AgentHandler) Create(c *fiber.Ctx) error {
	var input struct {
		Title string `json:"title"`
	}
	if err := agentDecode(c, &input); err != nil {
		return agentHTTPError(c, err)
	}
	item, err := h.service.CreateConversation(c.Context(), agentActor(c), input.Title)
	if err != nil {
		return agentHTTPError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": item})
}

func (h *AgentHandler) Detail(c *fiber.Ctx) error {
	id, err := agentParam(c, "id")
	if err != nil {
		return agentHTTPError(c, err)
	}
	item, err := h.service.Detail(c.Context(), agentActor(c), id)
	if err != nil {
		return agentHTTPError(c, err)
	}
	return c.JSON(fiber.Map{"data": item})
}

func (h *AgentHandler) Send(c *fiber.Ctx) error {
	id, err := agentParam(c, "id")
	if err != nil {
		return agentHTTPError(c, err)
	}
	var input agent.SendMessageInput
	if err := agentDecode(c, &input); err != nil {
		return agentHTTPError(c, err)
	}
	item, err := h.service.SendMessage(c.Context(), agentActor(c), id, input)
	if err != nil {
		return agentHTTPError(c, err)
	}
	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{"data": item})
}

const agentUploadLimit = 1024 * 1024

func (h *AgentHandler) Upload(c *fiber.Ctx) error {
	id, err := agentParam(c, "id")
	if err != nil {
		return agentHTTPError(c, err)
	}
	// Verify ownership before opening or extracting potentially expensive content.
	if _, err := h.service.Detail(c.Context(), agentActor(c), id); err != nil {
		return agentHTTPError(c, err)
	}
	file, err := c.FormFile("file")
	if err != nil {
		return agentHTTPError(c, agent.ErrInvalidInput)
	}
	if file.Size <= 0 || file.Size > agentUploadLimit {
		return agentProblem(c, fiber.StatusRequestEntityTooLarge, "Unggah file berukuran maksimal 1 MB.")
	}
	name := filepath.Base(strings.ReplaceAll(file.Filename, "\\", "/"))
	mimeType := ""
	switch strings.ToLower(filepath.Ext(name)) {
	case ".pdf":
		mimeType = "application/pdf"
	case ".xlsx":
		mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	default:
		return agentProblem(c, fiber.StatusUnprocessableEntity, "Gunakan dokumen PDF atau Excel (.xlsx).")
	}
	source, err := file.Open()
	if err != nil {
		return agentHTTPError(c, agent.ErrInvalidInput)
	}
	defer source.Close()
	content, err := io.ReadAll(io.LimitReader(source, agentUploadLimit+1))
	if err != nil {
		return agentHTTPError(c, agent.ErrInvalidInput)
	}
	if len(content) > agentUploadLimit {
		return agentProblem(c, fiber.StatusRequestEntityTooLarge, "Unggah file berukuran maksimal 1 MB.")
	}
	if !agentFileSignature(name, content) {
		return agentProblem(c, fiber.StatusUnprocessableEntity, "Isi file tidak sesuai dengan format PDF atau Excel.")
	}
	extracted, err := documenttext.Extract(documenttext.ExtractInput{Filename: name, Content: content, MaxChars: documenttext.DefaultMaxChars})
	if err != nil {
		if errors.Is(err, domainerrors.ErrSensitiveDataDetected) {
			return agentProblem(c, fiber.StatusUnprocessableEntity, domainerrors.ErrSensitiveDataDetected.Error())
		}
		return agentProblem(c, fiber.StatusUnprocessableEntity, "Dokumen tidak dapat dibaca. Gunakan PDF berbasis teks atau file Excel yang valid.")
	}
	item, err := h.service.AddAttachment(c.Context(), agentActor(c), id, agent.AttachmentInput{
		Name: name, MimeType: mimeType, Size: int64(len(content)), Text: extracted.Text,
		Warnings:       extracted.Warnings,
		IdempotencyKey: c.FormValue("idempotencyKey"),
	})
	if err != nil {
		return agentHTTPError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": item})
}

func agentFileSignature(name string, content []byte) bool {
	if strings.EqualFold(filepath.Ext(name), ".pdf") {
		return bytes.HasPrefix(content, []byte("%PDF-"))
	}
	return len(content) >= 4 && bytes.Equal(content[:4], []byte{'P', 'K', 3, 4})
}

func (h *AgentHandler) Cancel(c *fiber.Ctx) error {
	cid, err := agentParam(c, "id")
	if err != nil {
		return agentHTTPError(c, err)
	}
	rid, err := agentParam(c, "runId")
	if err != nil {
		return agentHTTPError(c, err)
	}
	if err := h.service.Cancel(c.Context(), agentActor(c), cid, rid); err != nil {
		return agentHTTPError(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *AgentHandler) UpdateProposal(c *fiber.Ctx) error {
	cid, pid, err := agentProposalParams(c)
	if err != nil {
		return agentHTTPError(c, err)
	}
	var input struct {
		Revision   int               `json:"revision"`
		Operations []agent.Operation `json:"operations"`
	}
	if err := agentDecode(c, &input); err != nil {
		return agentHTTPError(c, err)
	}
	item, err := h.service.UpdateProposal(c.Context(), agentActor(c), cid, pid, input.Revision, input.Operations)
	if err != nil {
		return agentHTTPError(c, err)
	}
	return c.JSON(fiber.Map{"data": item})
}

func (h *AgentHandler) ApplyProposal(c *fiber.Ctx) error {
	cid, pid, err := agentProposalParams(c)
	if err != nil {
		return agentHTTPError(c, err)
	}
	var input struct {
		Revision       int    `json:"revision"`
		IdempotencyKey string `json:"idempotencyKey"`
	}
	if err := agentDecode(c, &input); err != nil {
		return agentHTTPError(c, err)
	}
	item, err := h.service.ApplyProposal(c.Context(), agentActor(c), cid, pid, input.Revision, input.IdempotencyKey)
	if err != nil {
		return agentHTTPError(c, err)
	}
	return c.JSON(fiber.Map{"data": item})
}

func (h *AgentHandler) RejectProposal(c *fiber.Ctx) error {
	cid, pid, err := agentProposalParams(c)
	if err != nil {
		return agentHTTPError(c, err)
	}
	var input struct {
		Revision int `json:"revision"`
	}
	if err := agentDecode(c, &input); err != nil {
		return agentHTTPError(c, err)
	}
	item, err := h.service.RejectProposal(c.Context(), agentActor(c), cid, pid, input.Revision)
	if err != nil {
		return agentHTTPError(c, err)
	}
	return c.JSON(fiber.Map{"data": item})
}

func agentProposalParams(c *fiber.Ctx) (uuid.UUID, uuid.UUID, error) {
	cid, err := agentParam(c, "id")
	if err != nil {
		return uuid.Nil, uuid.Nil, err
	}
	pid, err := agentParam(c, "proposalId")
	return cid, pid, err
}

func agentProblem(c *fiber.Ctx, status int, detail string) error {
	return sendProblemDetails(c, status, "Manris Agent", "https://api.manris.com/errors/agent", detail)
}

func agentHTTPError(c *fiber.Ctx, err error) error {
	status, detail := fiber.StatusInternalServerError, "Pekerjaan agent belum dapat diselesaikan. Silakan coba lagi."
	switch {
	case errors.Is(err, agent.ErrNotFound):
		status, detail = fiber.StatusNotFound, agent.ErrNotFound.Error()
	case errors.Is(err, agent.ErrForbidden):
		status, detail = fiber.StatusForbidden, agent.ErrForbidden.Error()
	case errors.Is(err, agent.ErrStale):
		status, detail = fiber.StatusConflict, agent.ErrStale.Error()
	case errors.Is(err, agent.ErrConflict):
		status, detail = fiber.StatusConflict, agent.ErrConflict.Error()
	case errors.Is(err, agent.ErrInvalidInput):
		status, detail = fiber.StatusUnprocessableEntity, "Periksa isi permintaan dan kolom usulan, lalu coba lagi."
	case errors.Is(err, agent.ErrUnavailable):
		status, detail = fiber.StatusServiceUnavailable, agent.ErrUnavailable.Error()
	case errors.Is(err, agent.ErrStorageNotReady):
		status, detail = fiber.StatusServiceUnavailable, agent.ErrStorageNotReady.Error()
	}
	return agentProblem(c, status, detail)
}
