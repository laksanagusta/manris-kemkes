package http

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/middleware"
	approvaluc "github.com/manris/backend/internal/usecase/approval"
)

// ApprovalHandler handles HTTP requests for Approval operations using clean architecture
type ApprovalHandler struct {
	listUC            *approvaluc.ListApprovalUseCase
	submitUC          *approvaluc.SubmitApprovalUseCase
	actionUC          *approvaluc.ApprovalActionUseCase
	getDetailUC       *approvaluc.GetApprovalDetailUseCase
	getPendingCountUC *approvaluc.GetPendingCountUseCase
	getByEntityUC     *approvaluc.GetApprovalByEntityUseCase
}

// NewApprovalHandler creates a new approval handler
func NewApprovalHandler(
	listUC *approvaluc.ListApprovalUseCase,
	submitUC *approvaluc.SubmitApprovalUseCase,
	actionUC *approvaluc.ApprovalActionUseCase,
	getDetailUC *approvaluc.GetApprovalDetailUseCase,
	getPendingCountUC *approvaluc.GetPendingCountUseCase,
	getByEntityUC *approvaluc.GetApprovalByEntityUseCase,
) *ApprovalHandler {
	return &ApprovalHandler{
		listUC:            listUC,
		submitUC:          submitUC,
		actionUC:          actionUC,
		getDetailUC:       getDetailUC,
		getPendingCountUC: getPendingCountUC,
		getByEntityUC:     getByEntityUC,
	}
}

// List handles GET /api/approvals
func (h *ApprovalHandler) List(c *fiber.Ctx) error {
	status := c.Query("status", "all")
	approverRole := c.Query("approver_role", "")
	userRole, _ := c.Locals("role").(string)
	var approverUserID *uuid.UUID
	if userRole != "superadmin" {
		if userID, ok := c.Locals("userId").(uuid.UUID); ok {
			approverUserID = &userID
		}
	}

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	input := approvaluc.ListApprovalInput{
		Status:         status,
		ApproverRole:   approverRole,
		ApproverUserID: approverUserID,
		OrgIDs:         orgIDs,
		Page:           page,
		Limit:          limit,
	}

	result, err := h.listUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	if result.Data == nil {
		result.Data = []*approvaluc.ApprovalOutput{}
	}

	return c.JSON(fiber.Map{
		"data":  result.Data,
		"total": result.Total,
		"page":  result.Page,
		"limit": result.Limit,
	})
}

// GetDetail handles GET /api/approvals/:id
func (h *ApprovalHandler) GetDetail(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "approval ID is required")
	}

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	input := approvaluc.GetApprovalDetailInput{
		ApprovalID: id,
		OrgIDs:     orgIDs,
	}

	result, err := h.getDetailUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// Submit handles POST /api/approvals/submit
func (h *ApprovalHandler) Submit(c *fiber.Ctx) error {
	var input approvaluc.SubmitApprovalInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	userRole, ok := c.Locals("role").(string)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	userName, ok := c.Locals("username").(string)
	if !ok {
		userName = ""
	}

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	input.RequestedBy = userID.String()
	input.ActorName = userName
	input.Role = userRole
	input.OrgIDs = orgIDs

	if input.Notes == "" {
		input.Notes = "Submitted for approval by " + userName
	}

	result, err := h.submitUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(201).JSON(fiber.Map{"data": result})
}

// Action handles POST /api/approvals/:id/action
func (h *ApprovalHandler) Action(c *fiber.Ctx) error {
	approvalID := c.Params("id")
	if approvalID == "" {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "approval ID is required")
	}

	var input approvaluc.ApprovalActionInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	userRole, ok := c.Locals("role").(string)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	userName, ok := c.Locals("username").(string)
	if !ok {
		userName = ""
	}

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	input.ApprovalID = approvalID
	input.ActorID = userID.String()
	input.ActorRole = userRole
	input.ActorName = userName
	input.OrgIDs = orgIDs

	result, err := h.actionUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// GetPendingCount handles GET /api/approvals/pending-count
func (h *ApprovalHandler) GetPendingCount(c *fiber.Ctx) error {
	userRole, ok := c.Locals("role").(string)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	input := approvaluc.GetPendingCountInput{
		Role:   userRole,
		OrgIDs: orgIDs,
	}
	if userID, ok := c.Locals("userId").(uuid.UUID); ok {
		input.UserID = &userID
	}

	result, err := h.getPendingCountUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// GetByEntity handles GET /api/approvals/by-entity
func (h *ApprovalHandler) GetByEntity(c *fiber.Ctx) error {
	requestType := c.Query("request_type")
	entityID := c.Query("entity_id")

	if requestType == "" || entityID == "" {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "request_type and entity_id are required")
	}

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	result, err := h.getByEntityUC.Execute(c.Context(), approvaluc.GetApprovalByEntityInput{
		RequestType: requestType,
		EntityID:    entityID,
		OrgIDs:      orgIDs,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}
