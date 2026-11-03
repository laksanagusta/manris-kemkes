package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/middleware"
	eventuc "github.com/manris/backend/internal/usecase/risk_event"
)

type RiskEventNoteHandler struct{ service *eventuc.NoteService }

func NewRiskEventNoteHandler(s *eventuc.NoteService) *RiskEventNoteHandler {
	return &RiskEventNoteHandler{service: s}
}
func (h *RiskEventNoteHandler) List(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.ErrBadRequest
	}
	items, err := h.service.List(c.Context(), middleware.GetAccessScope(c), id)
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(fiber.Map{"data": items})
}
func (h *RiskEventNoteHandler) Add(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.ErrBadRequest
	}
	var input struct {
		Body      string `json:"body"`
		RequestID string `json:"requestId"`
	}
	if err := c.BodyParser(&input); err != nil {
		return fiber.ErrBadRequest
	}
	requestID, err := uuid.Parse(input.RequestID)
	if err != nil {
		return fiber.ErrBadRequest
	}
	n, err := h.service.Add(c.Context(), middleware.GetAccessScope(c), id, input.Body, requestID)
	if err != nil {
		return handleError(c, err)
	}
	return c.Status(201).JSON(fiber.Map{"data": n})
}
