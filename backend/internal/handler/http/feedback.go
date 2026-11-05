package http

import (
	"errors"
	"log/slog"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/middleware"
	feedbackuc "github.com/manris/backend/internal/usecase/feedback"
)

type FeedbackHandler struct{ service *feedbackuc.Service }

func NewFeedbackHandler(service *feedbackuc.Service) *FeedbackHandler {
	return &FeedbackHandler{service: service}
}

func (h *FeedbackHandler) Create(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	if scope == nil || scope.UserID == uuid.Nil {
		return handleError(c, domainerrors.ErrUnauthorized)
	}
	var input struct {
		Message   string `json:"message"`
		RequestID string `json:"requestId"`
	}
	if err := c.BodyParser(&input); err != nil {
		return handleError(c, domainerrors.ErrInvalidInput)
	}
	requestID, err := uuid.Parse(input.RequestID)
	if err != nil {
		return handleError(c, domainerrors.ErrInvalidInput)
	}
	item, err := h.service.Create(c.Context(), scope, input.Message, requestID)
	if errors.Is(err, domainerrors.ErrConflict) {
		return sendProblemDetails(c, fiber.StatusConflict, "Konflik feedback", "about:blank", "Gunakan permintaan baru untuk pesan yang berbeda.")
	}
	if err != nil {
		if domainerrors.IsValidation(err) || domainerrors.IsUnauthorized(err) {
			return handleError(c, err)
		}
		slog.ErrorContext(c.Context(), "feedback_save_failed")
		return handleError(c, domainerrors.ErrInternal)
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": item})
}
