package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/middleware"
	kriuc "github.com/manris/backend/internal/usecase/kri"
)

type KRIHandler struct {
	createUC    *kriuc.CreateKRIUseCase
	getUC       *kriuc.GetKRIUseCase
	updateUC    *kriuc.UpdateKRIUseCase
	archiveUC   *kriuc.ArchiveKRIUseCase
	listUC      *kriuc.ListKRIsUseCase
	dashboardUC *kriuc.KRIDashboardUseCase
}

func NewKRIHandler(
	createUC *kriuc.CreateKRIUseCase,
	getUC *kriuc.GetKRIUseCase,
	updateUC *kriuc.UpdateKRIUseCase,
	archiveUC *kriuc.ArchiveKRIUseCase,
	listUC *kriuc.ListKRIsUseCase,
	dashboardUC *kriuc.KRIDashboardUseCase,
) *KRIHandler {
	return &KRIHandler{
		createUC:    createUC,
		getUC:       getUC,
		updateUC:    updateUC,
		archiveUC:   archiveUC,
		listUC:      listUC,
		dashboardUC: dashboardUC,
	}
}

func (h *KRIHandler) CreateKRI(c *fiber.Ctx) error {
	var input kriuc.CreateKRIInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}

	if riskIDStr := c.Query("risk_id"); riskIDStr != "" {
		riskID, err := uuid.Parse(riskIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID risiko tidak valid")
		}
		input.RiskID = riskID
	}

	if orgIDStr := c.Query("organization_id"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
		}
		input.OrganizationID = &orgID
	}

	// Get access scope for linked-risk validation
	scope := middleware.GetAccessScope(c)
	if scope == nil {
		return sendProblemDetails(c, fiber.StatusForbidden, "Terlarang", "https://api.manris.com/errors/forbidden", "cakupan akses tidak tersedia")
	}
	input.OrgIDs = scope.AccessibleOrgIDs

	result, err := h.createUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(201).JSON(fiber.Map{"data": result})
}

func (h *KRIHandler) GetKRI(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID KRI tidak valid")
	}

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	kri, err := h.getUC.Execute(c.Context(), id, orgIDs)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": kri})
}

func (h *KRIHandler) UpdateKRI(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID KRI tidak valid")
	}

	var input kriuc.UpdateKRIInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}

	input.ID = id

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	result, err := h.updateUC.Execute(c.Context(), input, orgIDs, scope)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *KRIHandler) ArchiveKRI(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID KRI tidak valid")
	}

	var input kriuc.ArchiveKRIInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}

	input.ID = id

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	result, err := h.archiveUC.Execute(c.Context(), input, orgIDs, scope)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *KRIHandler) ListKRIs(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
		}
		if scope != nil && !scope.IsGlobal {
			narrowed, err := scope.NarrowToOrg(orgID)
			if err != nil {
				return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
			}
			orgIDs = narrowed
		} else {
			orgIDs = []uuid.UUID{orgID}
		}
	}

	input := kriuc.ListKRIsInput{
		OrgIDs: orgIDs,
	}

	kris, err := h.listUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	if kris == nil {
		kris = []*entity.KRI{}
	}
	return c.JSON(fiber.Map{"data": kris})
}

func (h *KRIHandler) KRIDashboard(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
		}
		if scope != nil && !scope.IsGlobal {
			narrowed, err := scope.NarrowToOrg(orgID)
			if err != nil {
				return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
			}
			orgIDs = narrowed
		} else {
			orgIDs = []uuid.UUID{orgID}
		}
	}

	input := kriuc.KRIDashboardInput{
		OrgIDs: orgIDs,
	}

	metrics, err := h.dashboardUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": metrics})
}
