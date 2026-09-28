package http

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/service"
	"github.com/manris/backend/internal/middleware"
	reportuc "github.com/manris/backend/internal/usecase/report"
)

type quarterlyReportExecutor interface {
	Execute(context.Context, reportuc.QuarterlyReportInput) (*entity.QuarterlyReportData, error)
}

type QuarterlyReportHandler struct {
	uc            quarterlyReportExecutor
	pdf           service.QuarterlyReportPDFRenderer
	groupResolver organizationGroupReportResolver
}

func NewQuarterlyReportHandler(uc quarterlyReportExecutor, pdf service.QuarterlyReportPDFRenderer, groups organizationGroupReportResolver) *QuarterlyReportHandler {
	return &QuarterlyReportHandler{uc: uc, pdf: pdf, groupResolver: groups}
}

func (h *QuarterlyReportHandler) load(c *fiber.Ctx) (*entity.QuarterlyReportData, error) {
	scope := middleware.GetAccessScope(c)
	if scope == nil {
		return nil, domainerrors.ErrForbidden
	}
	// A blank comma-list must never become the unrestricted empty-ID sentinel.
	if raw := c.Query("org_id"); raw != "" && strings.Trim(raw, ", \t\r\n") == "" {
		return nil, domainerrors.ErrInvalidInput
	}
	ids, err := resolveReportOrgIDsFromQuery(c.Context(), scope, c.Query("org_id"), c.Query("organization_group_id"), h.groupResolver)
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return nil, err
		}
		return nil, domainerrors.Wrap(domainerrors.ErrInvalidInput, "filter organisasi tidak valid")
	}
	if c.Query("organization_group_id") != "" && len(ids) == 0 {
		return nil, domainerrors.ErrInvalidInput
	}
	if !scope.IsGlobal && len(ids) == 0 {
		return nil, domainerrors.ErrForbidden
	}
	if !scope.IsGlobal {
		for _, id := range ids {
			if !scope.CanRead(id) {
				return nil, domainerrors.ErrForbidden
			}
		}
	}
	return h.uc.Execute(c.Context(), reportuc.QuarterlyReportInput{Cycle: c.Query("cycle"), ComparisonCycle: c.Query("compare_cycle"), OrgIDs: ids})
}

func (h *QuarterlyReportHandler) Get(c *fiber.Ctx) error {
	data, err := h.load(c)
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(data)
}

func (h *QuarterlyReportHandler) PDF(c *fiber.Ctx) error {
	data, err := h.load(c)
	if err != nil {
		return handleError(c, err)
	}
	if expected := c.Query("expected_updated_at"); expected != "" {
		matches := expected == "none" && data.DataUpdatedAt == nil
		if expected != "none" {
			value, err := time.Parse(time.RFC3339Nano, expected)
			if err != nil {
				return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "expected_updated_at tidak valid")
			}
			matches = data.DataUpdatedAt != nil && data.DataUpdatedAt.Equal(value)
		}
		if !matches {
			return sendProblemDetails(c, 409, "Data Laporan Berubah", "https://api.manris.com/errors/conflict", "Data laporan berubah. Perbarui laporan sebelum mengekspor.")
		}
	}
	if expected := c.Query("expected_snapshot_hash"); expected != "" && expected != data.SnapshotHash {
		return sendProblemDetails(c, 409, "Data Laporan Berubah", "https://api.manris.com/errors/conflict", "Data laporan berubah. Perbarui laporan sebelum mengekspor.")
	}
	content, err := h.pdf.RenderQuarterly(c.Context(), data)
	if err != nil {
		return handleError(c, err)
	}
	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"quarterly-report-%s.pdf\"", data.Cycle))
	return c.Send(content)
}
