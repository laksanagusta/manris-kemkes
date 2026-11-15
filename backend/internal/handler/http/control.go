package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/middleware"
	controluc "github.com/manris/backend/internal/usecase/control"
	"strings"
	"time"
)

type controlPageItem struct {
	ID             uuid.UUID  `json:"id"`
	Name           string     `json:"name"`
	Description    string     `json:"description"`
	Type           string     `json:"type"`
	Frequency      string     `json:"frequency"`
	Owner          string     `json:"owner"`
	Effectiveness  string     `json:"effectiveness"`
	OrganizationID *uuid.UUID `json:"organizationId"`
	CreatedAt      time.Time  `json:"createdAt"`
}

// ControlHandler handles HTTP requests for Control operations using clean architecture
type ControlHandler struct {
	createUC    *controluc.CreateControlUseCase
	getUC       *controluc.GetControlUseCase
	updateUC    *controluc.UpdateControlUseCase
	deleteUC    *controluc.DeleteControlUseCase
	listUC      *controluc.ListControlsUseCase
	dashboardUC *controluc.ControlDashboardUseCase
}

func NewControlHandler(
	createUC *controluc.CreateControlUseCase,
	getUC *controluc.GetControlUseCase,
	updateUC *controluc.UpdateControlUseCase,
	deleteUC *controluc.DeleteControlUseCase,
	listUC *controluc.ListControlsUseCase,
	dashboardUC *controluc.ControlDashboardUseCase,
) *ControlHandler {
	return &ControlHandler{
		createUC:    createUC,
		getUC:       getUC,
		updateUC:    updateUC,
		deleteUC:    deleteUC,
		listUC:      listUC,
		dashboardUC: dashboardUC,
	}
}

// CreateControl handles POST /api/controls
func (h *ControlHandler) CreateControl(c *fiber.Ctx) error {
	var input controluc.CreateControlInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}

	// Parse risk_id if provided
	if riskIDStr := c.Query("risk_id"); riskIDStr != "" {
		riskID, err := uuid.Parse(riskIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "invalid risk ID")
		}
		input.RiskID = &riskID
	}

	// Parse organization_id if provided
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
	var err error
	input.OrganizationID, err = resolveWritableOrganization(scope, input.OrganizationID)
	if err != nil {
		return handleError(c, err)
	}
	input.OrgIDs, err = resolveOperationalOrgIDs(scope, "")
	if err != nil {
		return handleError(c, err)
	}

	result, err := h.createUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(201).JSON(fiber.Map{"data": result})
}

// GetControl handles GET /api/controls/:id
func (h *ControlHandler) GetControl(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID kontrol tidak valid")
	}

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	control, err := h.getUC.Execute(c.Context(), id, orgIDs)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": control})
}

// UpdateControl handles PUT /api/controls/:id
func (h *ControlHandler) UpdateControl(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID kontrol tidak valid")
	}

	var input controluc.UpdateControlInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}

	input.ID = id

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		return handleError(c, err)
	}

	result, err := h.updateUC.Execute(c.Context(), input, orgIDs, scope)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// DeleteControl handles DELETE /api/controls/:id
func (h *ControlHandler) DeleteControl(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID kontrol tidak valid")
	}

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	result, err := h.deleteUC.Execute(c.Context(), id, orgIDs, scope)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// ListControls handles GET /api/controls
func (h *ControlHandler) ListControls(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveReadableOrgIDs(scope, c.Query("org_id"))
	if err != nil {
		return handleError(c, err)
	}

	if c.Query("page") != "" || c.Query("limit") != "" {
		var organizationID *uuid.UUID
		if raw := c.Query("organization_id"); raw != "" {
			id, err := uuid.Parse(raw)
			if err != nil {
				return fiber.ErrBadRequest
			}
			organizationID = &id
		}
		page := max(1, min(c.QueryInt("page", 1), 1_000_000_000))
		limit := max(1, min(c.QueryInt("limit", 20), 100))
		controls, total, err := h.listUC.ListPage(c.Context(), repository.ControlListFilter{
			OrgIDs: orgIDs, OrganizationID: organizationID,
			Query: strings.TrimSpace(c.Query("q")), Page: page, Limit: limit,
		})
		if err != nil {
			return handleError(c, err)
		}
		items := make([]controlPageItem, 0, len(controls))
		for _, control := range controls {
			items = append(items, controlPageItem{
				ID: control.ID, Name: control.Name, Description: control.Description,
				Type: control.Type, Frequency: control.Frequency, Owner: control.Owner,
				Effectiveness: control.Effectiveness, OrganizationID: control.OrganizationID,
				CreatedAt: control.CreatedAt,
			})
		}
		return c.JSON(fiber.Map{"data": items, "total": total, "page": page, "limit": limit})
	}

	input := controluc.ListControlsInput{
		OrgIDs: orgIDs,
	}

	controls, err := h.listUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	if controls == nil {
		controls = []*entity.Control{}
	}
	return c.JSON(fiber.Map{"data": controls})
}

// ControlDashboard handles GET /api/controls/dashboard
func (h *ControlHandler) ControlDashboard(c *fiber.Ctx) error {
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

	input := controluc.ControlDashboardInput{
		OrgIDs: orgIDs,
	}

	metrics, err := h.dashboardUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": metrics})
}
