package http

import (
	"context"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/middleware"
)

type monitoringEvidenceReader interface {
	Get(context.Context, uuid.UUID, []uuid.UUID) (*entity.RiskMonitoringEvidenceResult, error)
}
type MonitoringEvidenceHandler struct{ reader monitoringEvidenceReader }

func NewMonitoringEvidenceHandler(reader monitoringEvidenceReader) *MonitoringEvidenceHandler {
	return &MonitoringEvidenceHandler{reader: reader}
}
func (h *MonitoringEvidenceHandler) Get(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	if scope == nil || (!scope.IsGlobal && len(scope.AccessibleOrgIDs) == 0) {
		return fiber.ErrForbidden
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return fiber.ErrBadRequest
	}
	ids := scope.AccessibleOrgIDs
	if scope.IsGlobal {
		ids = nil
	}
	evidence, err := h.reader.Get(c.Context(), id, ids)
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(fiber.Map{"data": evidence})
}
