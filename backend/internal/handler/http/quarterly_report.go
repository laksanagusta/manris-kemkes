package http

import (
	"context"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/service"
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
	ids, err := resolveRiskReportScope(c, h.groupResolver)
	if err != nil {
		return nil, err
	}
	return h.uc.Execute(c.Context(), reportuc.QuarterlyReportInput{ComparisonPeriodID: c.Query("compare_period"), ProfileID: c.Query("profile"), PeriodID: c.Query("period"), Cycle: c.Query("cycle"), ComparisonCycle: c.Query("compare_cycle"), OrgIDs: ids})
}

func (h *QuarterlyReportHandler) Get(c *fiber.Ctx) error {
	data, err := h.load(c)
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(data)
}

func (h *QuarterlyReportHandler) Overview(c *fiber.Ctx) error {
	data, err := h.load(c)
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(reportuc.BuildQuarterlyReportOverview(data))
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
