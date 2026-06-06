package http

import (
	"context"
	"errors"
	"fmt"
	"log"
	"runtime/debug"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/middleware"
	evaluationuc "github.com/manris/backend/internal/usecase/evaluation"
)

type evaluationCreateUseCase interface {
	Execute(context.Context, evaluationuc.CreateInput) (*entity.Evaluation, error)
}

type evaluationListUseCase interface {
	Execute(context.Context, evaluationuc.ListInput) (*evaluationuc.ListOutput, error)
}

type evaluationGetUseCase interface {
	Execute(context.Context, evaluationuc.GetInput) (*entity.Evaluation, error)
}

type evaluationUpdateUseCase interface {
	Execute(context.Context, evaluationuc.UpdateInput) (*entity.Evaluation, error)
}

type evaluationFinalizeUseCase interface {
	Execute(context.Context, evaluationuc.FinalizeInput) (*entity.Evaluation, error)
}

type evaluationReopenUseCase interface {
	Execute(context.Context, evaluationuc.ReopenInput) (*entity.Evaluation, error)
}

type evaluationExportPDFUseCase interface {
	Execute(context.Context, evaluationuc.ExportPDFInput) (*evaluationuc.ExportPDFOutput, error)
}

type evaluationGroupResolver interface {
	ResolveReportGroup(ctx context.Context, groupID uuid.UUID, scope *entity.AccessScope) ([]uuid.UUID, error)
}

type EvaluationHandler struct {
	createUC      evaluationCreateUseCase
	listUC        evaluationListUseCase
	getUC         evaluationGetUseCase
	updateUC      evaluationUpdateUseCase
	finalizeUC    evaluationFinalizeUseCase
	reopenUC      evaluationReopenUseCase
	exportUC      evaluationExportPDFUseCase
	groupResolver evaluationGroupResolver
}

func NewEvaluationHandler(
	createUC evaluationCreateUseCase,
	getUC evaluationGetUseCase,
	listUC evaluationListUseCase,
	updateUC evaluationUpdateUseCase,
	finalizeUC evaluationFinalizeUseCase,
	reopenUC evaluationReopenUseCase,
	exportUC evaluationExportPDFUseCase,
	groupResolver evaluationGroupResolver,
) *EvaluationHandler {
	return &EvaluationHandler{
		createUC:      createUC,
		listUC:        listUC,
		getUC:         getUC,
		updateUC:      updateUC,
		finalizeUC:    finalizeUC,
		reopenUC:      reopenUC,
		exportUC:      exportUC,
		groupResolver: groupResolver,
	}
}

func (h *EvaluationHandler) List(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	scope := middleware.GetAccessScope(c)
	if scope == nil {
		return sendProblemDetails(c, fiber.StatusForbidden, "Forbidden", "https://api.manris.com/errors/forbidden", "missing access scope")
	}

	var organizationID *uuid.UUID
	var organizationIDs []uuid.UUID
	rawOrgID := c.Query("organization_id")
	rawGroupID := c.Query("organization_group_id")
	if rawOrgID != "" && rawGroupID != "" {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "organization_id and organization_group_id are mutually exclusive")
	}
	if rawOrgID != "" {
		orgID, err := uuid.Parse(rawOrgID)
		if err != nil {
			return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		if !scope.IsGlobal {
			narrowed, err := scope.NarrowToOrg(orgID)
			if err != nil {
				return sendProblemDetails(c, fiber.StatusForbidden, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
			}
			orgID = narrowed[0]
		}
		organizationID = &orgID
		organizationIDs = []uuid.UUID{orgID}
	} else if rawGroupID != "" {
		orgIDs, err := resolveReportOrgIDsFromQuery(c.Context(), scope, "", rawGroupID, h.groupResolver)
		if err != nil {
			if errors.Is(err, domainerrors.ErrForbidden) {
				return sendProblemDetails(c, fiber.StatusForbidden, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
			}
			if errors.Is(err, domainerrors.ErrInvalidInput) {
				return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "organization_id and organization_group_id are mutually exclusive")
			}
			return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization group ID")
		}
		organizationIDs = orgIDs
	} else if !scope.IsGlobal && scope.OrganizationID != nil {
		organizationID = scope.OrganizationID
		organizationIDs = []uuid.UUID{*scope.OrganizationID}
	}

	result, err := h.listUC.Execute(c.Context(), evaluationuc.ListInput{
		OrganizationID:  organizationID,
		OrganizationIDs: organizationIDs,
		Period:          c.Query("period"),
		Status:          c.Query("status"),
		Query: func() string {
			if query := c.Query("query"); query != "" {
				return query
			}
			return c.Query("q")
		}(),
		Page:  page,
		Limit: limit,
		Scope: scope,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(result)
}

func (h *EvaluationHandler) Create(c *fiber.Ctx) error {
	var input evaluationuc.CreateInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	scope := middleware.GetAccessScope(c)
	if scope == nil {
		return sendProblemDetails(c, fiber.StatusForbidden, "Forbidden", "https://api.manris.com/errors/forbidden", "missing access scope")
	}
	input.Scope = scope

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, fiber.StatusUnauthorized, "Unauthorized", "https://api.manris.com/errors/unauthorized", "user ID not found in context")
	}
	input.CreatedBy = &userID

	result, err := h.createUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": result})
}

func (h *EvaluationHandler) Get(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid evaluation ID")
	}

	result, err := h.getUC.Execute(c.Context(), evaluationuc.GetInput{
		ID:    id,
		Scope: middleware.GetAccessScope(c),
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *EvaluationHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid evaluation ID")
	}

	var input evaluationuc.UpdateInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}
	input.ID = id
	input.Scope = middleware.GetAccessScope(c)

	result, err := h.updateUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *EvaluationHandler) Finalize(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid evaluation ID")
	}

	result, err := h.finalizeUC.Execute(c.Context(), evaluationuc.FinalizeInput{
		ID:    id,
		Scope: middleware.GetAccessScope(c),
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *EvaluationHandler) Reopen(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid evaluation ID")
	}

	result, err := h.reopenUC.Execute(c.Context(), evaluationuc.ReopenInput{
		ID:    id,
		Scope: middleware.GetAccessScope(c),
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *EvaluationHandler) ExportPDF(c *fiber.Ctx) error {
	defer func() {
		if recovered := recover(); recovered != nil {
			log.Printf("panic during evaluation download %q: %v\n%s", c.Params("id"), recovered, debug.Stack())
			_ = sendProblemDetails(c, fiber.StatusInternalServerError, "Internal Server Error", "https://api.manris.com/errors/internal-server-error", fmt.Sprintf("evaluation pdf panic: %v", recovered))
		}
	}()

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid evaluation ID")
	}
	if h.exportUC == nil {
		return sendProblemDetails(c, fiber.StatusInternalServerError, "Internal Server Error", "https://api.manris.com/errors/internal-server-error", "evaluation pdf export use case is not configured")
	}

	result, err := h.exportUC.Execute(c.Context(), evaluationuc.ExportPDFInput{
		ID:    id,
		Scope: middleware.GetAccessScope(c),
	})
	if err != nil {
		return handleError(c, err)
	}
	if result == nil {
		return sendProblemDetails(c, fiber.StatusInternalServerError, "Internal Server Error", "https://api.manris.com/errors/internal-server-error", "evaluation pdf export returned empty result")
	}

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, result.Filename))
	return c.Send(result.Bytes)
}
