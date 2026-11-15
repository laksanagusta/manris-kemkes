package http

import (
	"context"
	reportuc "github.com/manris/backend/internal/usecase/report"
	"log/slog"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

type unitProgressExecutor interface {
	Profiles(context.Context, []uuid.UUID) ([]entity.UnitProgressProfile, error)
	ExecuteProfile(context.Context, string, string, []uuid.UUID) (*entity.UnitProgressReport, error)
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
	var report *entity.UnitProgressReport
	if c.Query("profile") != "" {
		report, err = h.uc.ExecuteProfile(c.Context(), c.Query("profile"), c.Query("period"), ids)
	} else if c.Query("period") != "" {
		return handleError(c, domainerrors.Wrap(domainerrors.ErrInvalidInput, "pilih profil terlebih dahulu"))
	} else {
		report, err = h.uc.Execute(c.Context(), c.Query("cycle"), ids)
	}
	if err != nil {
		if domainerrors.IsValidation(err) {
			return handleError(c, err)
		}
		slog.ErrorContext(c.Context(), "load unit progress failed", "error", err)
		return handleError(c, domainerrors.ErrInternal)
	}
	if tab := c.Query("tab"); tab != "" {
		switch tab {
		case "summary", "papers", "risks", "monitoring", "evaluations", "mitigations":
		default:
			return handleError(c, domainerrors.ErrInvalidInput)
		}
		if unitID := c.Query("unit"); unitID != "" {
			if _, err := uuid.Parse(unitID); err != nil {
				return handleError(c, domainerrors.ErrInvalidInput)
			}
		}
		return c.JSON(reportuc.PaginateUnitProgressReport(report, reportuc.UnitProgressPageFilter{
			Tab: tab, UnitID: c.Query("unit"), Query: c.Query("q"),
			AttentionOnly: c.Query("attention") == "required", Status: c.Query("status"),
			Page: c.QueryInt("page", 1), Limit: c.QueryInt("limit", 20),
		}))
	}
	return c.JSON(report)
}

func (h *UnitProgressHandler) Profiles(c *fiber.Ctx) error {
	ids, err := resolveQuarterlyReportScope(c, h.groups)
	if err != nil {
		return handleError(c, err)
	}
	profiles, err := h.uc.Profiles(c.Context(), ids)
	if err != nil {
		slog.ErrorContext(c.Context(), "load report profiles failed", "error", err)
		return handleError(c, domainerrors.ErrInternal)
	}
	return c.JSON(profiles)
}
