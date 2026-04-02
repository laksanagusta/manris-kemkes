package http

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	mmuc "github.com/manris/backend/internal/usecase/meeting_minute"
)

type MeetingMinuteHandler struct {
	createUC *mmuc.CreateMeetingMinuteUseCase
	getUC    *mmuc.GetMeetingMinuteUseCase
	listUC   *mmuc.ListMeetingMinutesUseCase
	deleteUC *mmuc.DeleteMeetingMinuteUseCase
	linkUC   *mmuc.LinkRisksUseCase
}

func NewMeetingMinuteHandler(
	createUC *mmuc.CreateMeetingMinuteUseCase,
	getUC *mmuc.GetMeetingMinuteUseCase,
	listUC *mmuc.ListMeetingMinutesUseCase,
	deleteUC *mmuc.DeleteMeetingMinuteUseCase,
	linkUC *mmuc.LinkRisksUseCase,
) *MeetingMinuteHandler {
	return &MeetingMinuteHandler{
		createUC: createUC,
		getUC:    getUC,
		listUC:   listUC,
		deleteUC: deleteUC,
		linkUC:   linkUC,
	}
}

type CreateMeetingMinuteRequest struct {
	Title          string              `json:"title"`
	Date           string              `json:"date"`
	Participants   []string            `json:"participants"`
	Agenda         []string            `json:"agenda"`
	Summary        string              `json:"summary"`
	KeyPoints      []string            `json:"keyPoints"`
	Decisions      []string            `json:"decisions"`
	OpenIssues     []string            `json:"openIssues"`
	ActionItems    []entity.ActionItem `json:"actionItems"`
	NextCheckIn    *string             `json:"nextCheckIn"`
	Transcript     string              `json:"transcript"`
	OrganizationID *uuid.UUID          `json:"organizationId"`
	RiskIDs        []uuid.UUID         `json:"riskIds"`
}

func (h *MeetingMinuteHandler) Create(c *fiber.Ctx) error {
	var req CreateMeetingMinuteRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, fiber.StatusUnauthorized, "Unauthorized", "https://api.manris.com/errors/unauthorized", "user ID not found in context")
	}

	result, err := h.createUC.Execute(c.Context(), mmuc.CreateInput{
		Title:          req.Title,
		Date:           req.Date,
		Participants:   req.Participants,
		Agenda:         req.Agenda,
		Summary:        req.Summary,
		KeyPoints:      req.KeyPoints,
		Decisions:      req.Decisions,
		OpenIssues:     req.OpenIssues,
		ActionItems:    req.ActionItems,
		NextCheckIn:    req.NextCheckIn,
		Transcript:     req.Transcript,
		OrganizationID: req.OrganizationID,
		CreatedBy:      userID,
		RiskIDs:        req.RiskIDs,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": result})
}

func (h *MeetingMinuteHandler) Get(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "meeting minute ID is required")
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid meeting minute ID")
	}

	result, err := h.getUC.Execute(c.Context(), mmuc.GetInput{ID: id})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *MeetingMinuteHandler) List(c *fiber.Ctx) error {
	var input mmuc.ListInput

	if orgIDStr := c.Query("organizationId"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		input.OrganizationID = &orgID
	}

	if createdByIDStr := c.Query("createdBy"); createdByIDStr != "" {
		createdBy, err := uuid.Parse(createdByIDStr)
		if err != nil {
			return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid created by ID")
		}
		input.CreatedBy = &createdBy
	}

	if riskIDStr := c.Query("riskId"); riskIDStr != "" {
		riskID, err := uuid.Parse(riskIDStr)
		if err != nil {
			return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk ID")
		}
		input.RiskID = &riskID
	}

	limit := c.QueryInt("limit", 20)
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	input.Limit = limit

	offset := c.QueryInt("offset", 0)
	if offset < 0 {
		offset = 0
	}
	input.Offset = offset

	result, err := h.listUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *MeetingMinuteHandler) Delete(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "meeting minute ID is required")
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid meeting minute ID")
	}

	if err := h.deleteUC.Execute(c.Context(), mmuc.DeleteInput{ID: id}); err != nil {
		return handleError(c, err)
	}

	return c.SendStatus(fiber.StatusNoContent)
}

type LinkRisksRequest struct {
	RiskIDs []uuid.UUID `json:"riskIds"`
}

func (h *MeetingMinuteHandler) LinkRisks(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "meeting minute ID is required")
	}

	meetingID, err := uuid.Parse(idStr)
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid meeting minute ID")
	}

	var req LinkRisksRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	if len(req.RiskIDs) == 0 {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "at least one risk ID is required")
	}

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, fiber.StatusUnauthorized, "Unauthorized", "https://api.manris.com/errors/unauthorized", "user ID not found in context")
	}

	err = h.linkUC.Execute(c.Context(), mmuc.LinkRisksInput{
		MeetingID: meetingID,
		RiskIDs:   req.RiskIDs,
		LinkedBy:  userID,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"linkedAt": time.Now().Format(time.RFC3339),
		},
	})
}

type UnlinkRisksRequest struct {
	RiskIDs []uuid.UUID `json:"riskIds"`
}

func (h *MeetingMinuteHandler) UnlinkRisks(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "meeting minute ID is required")
	}

	meetingID, err := uuid.Parse(idStr)
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid meeting minute ID")
	}

	var req UnlinkRisksRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	if len(req.RiskIDs) == 0 {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "at least one risk ID is required")
	}

	err = h.linkUC.Unlink(c.Context(), mmuc.UnlinkRisksInput{
		MeetingID: meetingID,
		RiskIDs:   req.RiskIDs,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"unlinkedAt": time.Now().Format(time.RFC3339),
		},
	})
}
