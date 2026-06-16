package http

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/middleware"
	riskcascadeuc "github.com/manris/backend/internal/usecase/riskcascade"
)

type RiskCascadeHandler struct {
	createMandatoryUC *riskcascadeuc.CreateMandatoryUseCase
	createBottomUpUC  *riskcascadeuc.CreateBottomUpUseCase
	decideUC          *riskcascadeuc.DecideUseCase
	deleteUC          *riskcascadeuc.DeleteUseCase
	listUC            *riskcascadeuc.ListUseCase
}

func NewRiskCascadeHandler(
	createMandatoryUC *riskcascadeuc.CreateMandatoryUseCase,
	createBottomUpUC *riskcascadeuc.CreateBottomUpUseCase,
	decideUC *riskcascadeuc.DecideUseCase,
	deleteUC *riskcascadeuc.DeleteUseCase,
	listUC *riskcascadeuc.ListUseCase,
) *RiskCascadeHandler {
	return &RiskCascadeHandler{
		createMandatoryUC: createMandatoryUC,
		createBottomUpUC:  createBottomUpUC,
		decideUC:          decideUC,
		deleteUC:          deleteUC,
		listUC:            listUC,
	}
}

func (h *RiskCascadeHandler) List(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	result, err := h.listUC.Execute(c.Context(), riskcascadeuc.ListInput{
		OrgIDs:      orgIDs,
		Status:      c.Query("status"),
		CascadeType: c.Query("cascade_type"),
		Query:       c.Query("q"),
		Page:        page,
		Limit:       limit,
	})
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(result)
}

func (h *RiskCascadeHandler) CreateMandatory(c *fiber.Ctx) error {
	return h.createCascade(c, "mandatory")
}

func (h *RiskCascadeHandler) CreateBottomUp(c *fiber.Ctx) error {
	return h.createCascade(c, "bottom-up")
}

func (h *RiskCascadeHandler) createCascade(c *fiber.Ctx, mode string) error {
	scope := middleware.GetAccessScope(c)
	if scope == nil {
		return sendProblemDetails(c, fiber.StatusForbidden, "Terlarang", "https://api.manris.com/errors/forbidden", "akses tidak tersedia")
	}
	var input struct {
		SourceRiskID uuid.UUID `json:"sourceRiskId"`
		TargetOrgID  uuid.UUID `json:"targetOrgId"`
		AnalysisNote string    `json:"analysisNote"`
	}
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}

	currentUserID, _ := c.Locals("userId").(uuid.UUID)
	currentUserName, _ := c.Locals("username").(string)
	orgIDs := scope.AccessibleOrgIDs
	if scope.IsGlobal {
		orgIDs = nil
	}

	switch mode {
	case "mandatory":
		result, err := h.createMandatoryUC.Execute(c.Context(), riskcascadeuc.CreateMandatoryInput{
			SourceRiskID:  input.SourceRiskID,
			TargetOrgID:   input.TargetOrgID,
			AnalysisNote:  input.AnalysisNote,
			CreatedBy:     currentUserID,
			CreatedByName: currentUserName,
			OrgIDs:        orgIDs,
		})
		if err != nil {
			return handleError(c, err)
		}
		return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": result})
	case "bottom-up":
		result, err := h.createBottomUpUC.Execute(c.Context(), riskcascadeuc.CreateBottomUpInput{
			SourceRiskID:  input.SourceRiskID,
			TargetOrgID:   input.TargetOrgID,
			AnalysisNote:  input.AnalysisNote,
			CreatedBy:     currentUserID,
			CreatedByName: currentUserName,
			OrgIDs:        orgIDs,
		})
		if err != nil {
			return handleError(c, err)
		}
		return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": result})
	default:
		return sendProblemDetails(c, fiber.StatusBadRequest, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "mode kaskade tidak valid")
	}
}

func (h *RiskCascadeHandler) Decide(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	if scope == nil {
		return sendProblemDetails(c, fiber.StatusForbidden, "Terlarang", "https://api.manris.com/errors/forbidden", "akses tidak tersedia")
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID kaskade tidak valid")
	}
	var input struct {
		Decision     string `json:"decision"`
		AdoptionType string `json:"adoptionType"`
		DecisionNote string `json:"decisionNote"`
	}
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}
	currentUserID, _ := c.Locals("userId").(uuid.UUID)
	currentUserName, _ := c.Locals("username").(string)

	orgIDs := scope.AccessibleOrgIDs
	if scope.IsGlobal {
		orgIDs = nil
	}

	result, err := h.decideUC.Execute(c.Context(), riskcascadeuc.DecideInput{
		ID:            id,
		Decision:      input.Decision,
		AdoptionType:  input.AdoptionType,
		DecisionNote:  input.DecisionNote,
		CreatedBy:     currentUserID,
		CreatedByName: currentUserName,
		OrgIDs:        orgIDs,
	})
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}

func (h *RiskCascadeHandler) Delete(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	if scope == nil {
		return sendProblemDetails(c, fiber.StatusForbidden, "Terlarang", "https://api.manris.com/errors/forbidden", "akses tidak tersedia")
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID kaskade tidak valid")
	}
	orgIDs := scope.AccessibleOrgIDs
	if scope.IsGlobal {
		orgIDs = nil
	}
	if err := h.deleteUC.Execute(c.Context(), riskcascadeuc.DeleteInput{ID: id, OrgIDs: orgIDs}); err != nil {
		return handleError(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}
