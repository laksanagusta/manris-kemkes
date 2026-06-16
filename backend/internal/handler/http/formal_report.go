package http

import (
	"errors"
	"fmt"
	"log"
	"runtime/debug"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/middleware"
	formalreportuc "github.com/manris/backend/internal/usecase/formalreport"
)

type FormalReportHandler struct {
	generateUC    *formalreportuc.GenerateFormalReportUseCase
	getUC         *formalreportuc.GetUseCase
	listUC        *formalreportuc.ListUseCase
	downloadUC    *formalreportuc.DownloadUseCase
	groupResolver organizationGroupReportResolver
}

func NewFormalReportHandler(
	generateUC *formalreportuc.GenerateFormalReportUseCase,
	getUC *formalreportuc.GetUseCase,
	listUC *formalreportuc.ListUseCase,
	downloadUC *formalreportuc.DownloadUseCase,
	groupResolver organizationGroupReportResolver,
) *FormalReportHandler {
	return &FormalReportHandler{
		generateUC:    generateUC,
		getUC:         getUC,
		listUC:        listUC,
		downloadUC:    downloadUC,
		groupResolver: groupResolver,
	}
}

func (h *FormalReportHandler) Generate(c *fiber.Ctx) error {
	var input formalreportuc.GenerateFormalReportInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}
	input.Scope = middleware.GetAccessScope(c)

	result, err := h.generateUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": result})
}

func (h *FormalReportHandler) List(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	scope := middleware.GetAccessScope(c)
	var organizationID *uuid.UUID
	var organizationIDs []uuid.UUID
	if raw := c.Query("organization_id"); raw != "" || c.Query("organization_group_id") != "" {
		orgIDs, err := resolveReportOrgIDsFromQuery(c.Context(), scope, raw, c.Query("organization_group_id"), h.groupResolver)
		if err != nil {
			if errors.Is(err, domainerrors.ErrForbidden) {
				return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
			}
			if errors.Is(err, domainerrors.ErrInvalidInput) {
				return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "organization_id dan organization_group_id tidak dapat digunakan bersamaan")
			}
			return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
		}
		organizationIDs = orgIDs
		if len(orgIDs) == 1 {
			organizationID = &orgIDs[0]
		}
	} else if scope != nil && !scope.IsGlobal && scope.OrganizationID != nil {
		organizationID = scope.OrganizationID
		organizationIDs = []uuid.UUID{*scope.OrganizationID}
	}

	result, err := h.listUC.Execute(c.Context(), formalreportuc.ListInput{
		OrganizationID:  organizationID,
		OrganizationIDs: organizationIDs,
		Period:          c.Query("period"),
		ReportType:      c.Query("report_type"),
		Status:          c.Query("status"),
		Page:            page,
		Limit:           limit,
		Scope:           scope,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(result)
}

func (h *FormalReportHandler) Get(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID laporan formal tidak valid")
	}

	result, err := h.getUC.Execute(c.Context(), formalreportuc.GetInput{
		ID:    id,
		Scope: middleware.GetAccessScope(c),
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *FormalReportHandler) Download(c *fiber.Ctx) error {
	defer func() {
		if recovered := recover(); recovered != nil {
			log.Printf("panic during formal report download %q: %v\n%s", c.Params("id"), recovered, debug.Stack())
			_ = sendProblemDetails(
				c,
				500,
				"Kesalahan Server Internal",
				"https://api.manris.com/errors/internal-server-error",
				fmt.Sprintf("panic unduhan laporan formal: %v", recovered),
			)
		}
	}()

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID laporan formal tidak valid")
	}

	if h.downloadUC == nil {
		return sendProblemDetails(c, 500, "Kesalahan Server Internal", "https://api.manris.com/errors/internal-server-error", "use case unduhan belum dikonfigurasi")
	}

	result, err := h.downloadUC.Execute(c.Context(), formalreportuc.DownloadInput{
		ID:    id,
		Scope: middleware.GetAccessScope(c),
	})
	if err != nil {
		return handleError(c, err)
	}
	if result == nil {
		return sendProblemDetails(c, 500, "Kesalahan Server Internal", "https://api.manris.com/errors/internal-server-error", "unduhan laporan formal menghasilkan hasil kosong")
	}

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, result.Filename))
	return c.Send(result.Bytes)
}
