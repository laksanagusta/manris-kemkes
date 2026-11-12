package http

import (
	"context"
	"log/slog"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

type unitProgressExecutor interface {
	Execute(context.Context, string, []uuid.UUID) (*entity.UnitProgressReport, error)
}

type UnitProgressHandler struct {
	uc     unitProgressExecutor
	groups organizationGroupReportResolver
}

func NewUnitProgressHandler(uc unitProgressExecutor, groups organizationGroupReportResolver) *UnitProgressHandler {
	return &UnitProgressHandler{uc: uc, groups: groups}
}

func (h *UnitProgressHandler) Get(c *fiber.Ctx) error {
	ids, err := resolveQuarterlyReportScope(c, h.groups)
	if err != nil {
		return handleError(c, err)
	}
	report, err := h.uc.Execute(c.Context(), c.Query("cycle"), ids)
	if err != nil {
		if domainerrors.IsValidation(err) {
			return handleError(c, err)
		}
		slog.ErrorContext(c.Context(), "load unit progress failed", "error", err)
		return handleError(c, domainerrors.ErrInternal)
	}
	return c.JSON(report)
}
