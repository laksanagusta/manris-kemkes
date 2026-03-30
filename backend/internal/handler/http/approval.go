package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	approvaluc "github.com/manris/backend/internal/usecase/approval"
)

// ApprovalHandler handles HTTP requests for Approval operations using clean architecture
type ApprovalHandler struct {
	listUC            *approvaluc.ListApprovalUseCase
	submitUC          *approvaluc.SubmitApprovalUseCase
	actionUC          *approvaluc.ApprovalActionUseCase
	getDetailUC       *approvaluc.GetApprovalDetailUseCase
	getPendingCountUC *approvaluc.GetPendingCountUseCase
}

// NewApprovalHandler creates a new approval handler
func NewApprovalHandler(
	listUC *approvaluc.ListApprovalUseCase,
	submitUC *approvaluc.SubmitApprovalUseCase,
	actionUC *approvaluc.ApprovalActionUseCase,
	getDetailUC *approvaluc.GetApprovalDetailUseCase,
	getPendingCountUC *approvaluc.GetPendingCountUseCase,
) *ApprovalHandler {
	return &ApprovalHandler{
		listUC:            listUC,
		submitUC:          submitUC,
		actionUC:          actionUC,
		getDetailUC:       getDetailUC,
		getPendingCountUC: getPendingCountUC,
	}
}

// List handles GET /api/approvals
func (h *ApprovalHandler) List(c *fiber.Ctx) error {
	// Parse query parameters
	status := c.Query("status", "all")
	approverRole := c.Query("approver_role", "")

	input := approvaluc.ListApprovalInput{
		Status:       status,
		ApproverRole: approverRole,
	}

	result, err := h.listUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// GetDetail handles GET /api/approvals/:id
func (h *ApprovalHandler) GetDetail(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "approval ID is required")
	}

	input := approvaluc.GetApprovalDetailInput{
		ApprovalID: id,
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

	// Get user info from context (set by auth middleware)
	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	// Get user role from context
	userRole, ok := c.Locals("role").(string)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	// Get user name from context
	userName, ok := c.Locals("username").(string)
	if !ok {
		userName = ""
	}

	input.RequestedBy = userID.String()
	input.Role = userRole

	// Set notes if not provided
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

	// Get user info from context (set by auth middleware)
	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	// Get user role from context
	userRole, ok := c.Locals("role").(string)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	// Get user name from context
	userName, ok := c.Locals("username").(string)
	if !ok {
		userName = ""
	}

	input.ApprovalID = approvalID
	input.ActorID = userID.String()
	input.ActorRole = userRole
	input.ActorName = userName

	result, err := h.actionUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// GetPendingCount handles GET /api/approvals/pending-count
func (h *ApprovalHandler) GetPendingCount(c *fiber.Ctx) error {
	// Get user role from context
	userRole, ok := c.Locals("role").(string)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	input := approvaluc.GetPendingCountInput{
		Role: userRole,
	}

	result, err := h.getPendingCountUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}
