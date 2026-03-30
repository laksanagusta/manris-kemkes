package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	lessonuc "github.com/manris/backend/internal/usecase/lesson"
)

// LessonHandler handles HTTP requests for Lesson operations using clean architecture
type LessonHandler struct {
	createUC    *lessonuc.CreateLessonUseCase
	getUC       *lessonuc.GetLessonUseCase
	updateUC    *lessonuc.UpdateLessonUseCase
	deleteUC    *lessonuc.DeleteLessonUseCase
	listUC      *lessonuc.ListLessonsUseCase
	dashboardUC *lessonuc.LessonDashboardUseCase
}

func NewLessonHandler(
	createUC *lessonuc.CreateLessonUseCase,
	getUC *lessonuc.GetLessonUseCase,
	updateUC *lessonuc.UpdateLessonUseCase,
	deleteUC *lessonuc.DeleteLessonUseCase,
	listUC *lessonuc.ListLessonsUseCase,
	dashboardUC *lessonuc.LessonDashboardUseCase,
) *LessonHandler {
	return &LessonHandler{
		createUC:    createUC,
		getUC:       getUC,
		updateUC:    updateUC,
		deleteUC:    deleteUC,
		listUC:      listUC,
		dashboardUC: dashboardUC,
	}
}

// CreateLesson handles POST /api/lessons
func (h *LessonHandler) CreateLesson(c *fiber.Ctx) error {
	var input lessonuc.CreateLessonInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	// Get user ID from context (set by auth middleware)
	// Note: middleware sets "userId" (camelCase)
	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "user ID not found in context")
	}
	input.AuthorID = &userID

	// Parse source_ref if provided
	if sourceRefStr := c.Query("source_ref"); sourceRefStr != "" {
		input.SourceRef = sourceRefStr
	}

	result, err := h.createUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(201).JSON(fiber.Map{"data": result})
}

// GetLesson handles GET /api/lessons/:id
func (h *LessonHandler) GetLesson(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid lesson ID")
	}

	lesson, err := h.getUC.Execute(c.Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": lesson})
}

// UpdateLesson handles PUT /api/lessons/:id
func (h *LessonHandler) UpdateLesson(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid lesson ID")
	}

	var input lessonuc.UpdateLessonInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	input.ID = id

	result, err := h.updateUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// DeleteLesson handles DELETE /api/lessons/:id
func (h *LessonHandler) DeleteLesson(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid lesson ID")
	}

	result, err := h.deleteUC.Execute(c.Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// ListLessons handles GET /api/lessons
func (h *LessonHandler) ListLessons(c *fiber.Ctx) error {
	var input lessonuc.ListLessonsInput

	// Parse optional org_id filter
	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		input.OrgID = &orgID
	}

	lessons, err := h.listUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	if lessons == nil {
		lessons = []*entity.Lesson{}
	}
	return c.JSON(fiber.Map{"data": lessons})
}

// LessonDashboard handles GET /api/lessons/dashboard
func (h *LessonHandler) LessonDashboard(c *fiber.Ctx) error {
	var input lessonuc.LessonDashboardInput

	// Parse optional org_id filter
	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		input.OrgID = &orgID
	}

	metrics, err := h.dashboardUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": metrics})
}
