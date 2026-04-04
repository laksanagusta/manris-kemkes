package http

import (
	"encoding/json"
	"errors"
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	formusecase "github.com/manris/backend/internal/usecase/form"
)

type FormHandler struct {
	createUC        *formusecase.CreateFormUseCase
	getUC           *formusecase.GetFormUseCase
	listUC          *formusecase.ListFormsUseCase
	updateUC        *formusecase.UpdateFormUseCase
	deleteUC        *formusecase.DeleteFormUseCase
	publishUC       *formusecase.PublishFormUseCase
	closeUC         *formusecase.CloseFormUseCase
	submitUC        *formusecase.SubmitResponseUseCase
	listResponsesUC *formusecase.ListResponsesUseCase
	analyticsUC     *formusecase.FormAnalyticsUseCase
}

func NewFormHandler(
	createUC *formusecase.CreateFormUseCase,
	getUC *formusecase.GetFormUseCase,
	listUC *formusecase.ListFormsUseCase,
	updateUC *formusecase.UpdateFormUseCase,
	deleteUC *formusecase.DeleteFormUseCase,
	publishUC *formusecase.PublishFormUseCase,
	closeUC *formusecase.CloseFormUseCase,
	submitUC *formusecase.SubmitResponseUseCase,
	listResponsesUC *formusecase.ListResponsesUseCase,
	analyticsUC *formusecase.FormAnalyticsUseCase,
) *FormHandler {
	return &FormHandler{
		createUC:        createUC,
		getUC:           getUC,
		listUC:          listUC,
		updateUC:        updateUC,
		deleteUC:        deleteUC,
		publishUC:       publishUC,
		closeUC:         closeUC,
		submitUC:        submitUC,
		listResponsesUC: listResponsesUC,
		analyticsUC:     analyticsUC,
	}
}

func extractFormUserID(c *fiber.Ctx) (uuid.UUID, error) {
	uid, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return uuid.Nil, fmt.Errorf("user ID not found in context")
	}
	return uid, nil
}

func extractFormRole(c *fiber.Ctx) string {
	role, _ := c.Locals("role").(string)
	return role
}

func extractFormOrgID(c *fiber.Ctx) *uuid.UUID {
	raw, _ := c.Locals("organizationId").(string)
	if raw == "" {
		return nil
	}
	parsed, err := uuid.Parse(raw)
	if err != nil {
		return nil
	}
	return &parsed
}

// mapFormError maps form domain errors to HTTP status codes.
// This is necessary because form errors (ErrFormLocked, ErrDuplicateResponse, etc.)
// require specific HTTP semantics (409 Conflict, 403 Forbidden) that the generic
// handleError in response.go does not cover.
func mapFormError(c *fiber.Ctx, err error) error {
	var appErr *domainerrors.AppError
	if errors.As(err, &appErr) {
		switch appErr {
		case domainerrors.ErrFormNotFound:
			return sendProblemDetails(c, fiber.StatusNotFound, "Not Found",
				"https://api.manris.com/errors/not-found", appErr.Message)

		case domainerrors.ErrFormLocked,
			domainerrors.ErrFormAlreadyPublished,
			domainerrors.ErrDuplicateResponse:
			return sendProblemDetails(c, fiber.StatusConflict, "Conflict",
				"https://api.manris.com/errors/conflict", appErr.Message)

		case domainerrors.ErrFormNotAssigned,
			domainerrors.ErrForbidden:
			return sendProblemDetails(c, fiber.StatusForbidden, "Forbidden",
				"https://api.manris.com/errors/forbidden", appErr.Message)

		case domainerrors.ErrFormNotPublished,
			domainerrors.ErrFormClosed,
			domainerrors.ErrInvalidFormTitle,
			domainerrors.ErrEmptySection,
			domainerrors.ErrFieldMissingOptions,
			domainerrors.ErrInvalidFieldType,
			domainerrors.ErrInvalidConditionalSource:
			return sendProblemDetails(c, fiber.StatusUnprocessableEntity, "Validation Error",
				"https://api.manris.com/errors/validation-error", appErr.Message)
		}

		if appErr.Code != "" {
			return sendProblemDetails(c, fiber.StatusUnprocessableEntity, "Validation Error",
				"https://api.manris.com/errors/validation-error", appErr.Message)
		}
	}

	return handleError(c, err)
}

type fieldOptionDTO struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

type fieldDTO struct {
	FieldType              string           `json:"field_type"`
	Label                  string           `json:"label"`
	Placeholder            *string          `json:"placeholder,omitempty"`
	IsRequired             bool             `json:"is_required"`
	Options                []fieldOptionDTO `json:"options,omitempty"`
	Position               int              `json:"position"`
	ConditionSourceFieldID *string          `json:"condition_source_field_id,omitempty"`
	ConditionValue         *string          `json:"condition_value,omitempty"`
}

type sectionDTO struct {
	Title       string     `json:"title"`
	Description *string    `json:"description,omitempty"`
	Position    int        `json:"position"`
	Fields      []fieldDTO `json:"fields"`
}

type createFormRequest struct {
	Title           string       `json:"title"`
	Description     *string      `json:"description,omitempty"`
	Sections        []sectionDTO `json:"sections"`
	TargetAudience  string       `json:"target_audience"`
	OrganizationIDs []string     `json:"organization_ids,omitempty"`
}

type updateFormRequest struct {
	Title           string       `json:"title"`
	Description     *string      `json:"description,omitempty"`
	Sections        []sectionDTO `json:"sections"`
	TargetAudience  string       `json:"target_audience"`
	OrganizationIDs []string     `json:"organization_ids,omitempty"`
}

type submitResponseRequest struct {
	Answers json.RawMessage `json:"answers"`
}

func toSectionInputs(dtos []sectionDTO) ([]formusecase.SectionInput, error) {
	sections := make([]formusecase.SectionInput, 0, len(dtos))
	for _, s := range dtos {
		fields, err := toFieldInputs(s.Fields)
		if err != nil {
			return nil, err
		}
		sections = append(sections, formusecase.SectionInput{
			Title:       s.Title,
			Description: s.Description,
			Position:    s.Position,
			Fields:      fields,
		})
	}
	return sections, nil
}

func toFieldInputs(dtos []fieldDTO) ([]formusecase.FieldInput, error) {
	fields := make([]formusecase.FieldInput, 0, len(dtos))
	for _, f := range dtos {
		var condSourceID *uuid.UUID
		if f.ConditionSourceFieldID != nil {
			parsed, err := uuid.Parse(*f.ConditionSourceFieldID)
			if err != nil {
				return nil, fmt.Errorf("invalid condition_source_field_id: %s", *f.ConditionSourceFieldID)
			}
			condSourceID = &parsed
		}

		options := make([]formusecase.FieldOptionInput, 0, len(f.Options))
		for _, o := range f.Options {
			options = append(options, formusecase.FieldOptionInput{
				Value: o.Value,
				Label: o.Label,
			})
		}

		fields = append(fields, formusecase.FieldInput{
			FieldType:              f.FieldType,
			Label:                  f.Label,
			Placeholder:            f.Placeholder,
			IsRequired:             f.IsRequired,
			Options:                options,
			Position:               f.Position,
			ConditionSourceFieldID: condSourceID,
			ConditionValue:         f.ConditionValue,
		})
	}
	return fields, nil
}

func parseOrgIDs(raw []string) ([]uuid.UUID, error) {
	ids := make([]uuid.UUID, 0, len(raw))
	for _, s := range raw {
		id, err := uuid.Parse(s)
		if err != nil {
			return nil, fmt.Errorf("invalid organization_id: %s", s)
		}
		ids = append(ids, id)
	}
	return ids, nil
}

func (h *FormHandler) CreateForm(c *fiber.Ctx) error {
	userID, err := extractFormUserID(c)
	if err != nil {
		return sendProblemDetails(c, fiber.StatusUnauthorized, "Unauthorized",
			"https://api.manris.com/errors/unauthorized", err.Error())
	}

	var req createFormRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request",
			"https://api.manris.com/errors/bad-request", fmt.Sprintf("invalid request body: %v", err))
	}

	sections, err := toSectionInputs(req.Sections)
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request",
			"https://api.manris.com/errors/bad-request", err.Error())
	}

	orgIDs, err := parseOrgIDs(req.OrganizationIDs)
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request",
			"https://api.manris.com/errors/bad-request", err.Error())
	}

	result, err := h.createUC.Execute(c.Context(), formusecase.CreateFormInput{
		Title:           req.Title,
		Description:     req.Description,
		Sections:        sections,
		TargetAudience:  req.TargetAudience,
		OrganizationIDs: orgIDs,
		CreatedBy:       userID,
	})
	if err != nil {
		return mapFormError(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": result})
}

func (h *FormHandler) ListForms(c *fiber.Ctx) error {
	role := extractFormRole(c)
	orgID := extractFormOrgID(c)

	var statusFilter *string
	if s := c.Query("status"); s != "" {
		statusFilter = &s
	}

	result, err := h.listUC.Execute(c.Context(), formusecase.ListFormsInput{
		UserRole:     role,
		UserOrgID:    orgID,
		StatusFilter: statusFilter,
	})
	if err != nil {
		return mapFormError(c, err)
	}

	if result == nil {
		result = []formusecase.FormSummary{}
	}
	return c.JSON(fiber.Map{"data": result})
}

func (h *FormHandler) ListMyForms(c *fiber.Ctx) error {
	orgID := extractFormOrgID(c)

	var statusFilter *string
	if s := c.Query("status"); s != "" {
		statusFilter = &s
	}

	result, err := h.listUC.Execute(c.Context(), formusecase.ListFormsInput{
		UserRole:     "unit",
		UserOrgID:    orgID,
		StatusFilter: statusFilter,
	})
	if err != nil {
		return mapFormError(c, err)
	}

	if result == nil {
		result = []formusecase.FormSummary{}
	}
	return c.JSON(fiber.Map{"data": result})
}

func (h *FormHandler) GetForm(c *fiber.Ctx) error {
	formID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request",
			"https://api.manris.com/errors/bad-request", "invalid form ID")
	}

	userID, err := extractFormUserID(c)
	if err != nil {
		return sendProblemDetails(c, fiber.StatusUnauthorized, "Unauthorized",
			"https://api.manris.com/errors/unauthorized", err.Error())
	}

	result, err := h.getUC.Execute(c.Context(), formusecase.GetFormInput{
		FormID:    formID,
		UserID:    userID,
		UserRole:  extractFormRole(c),
		UserOrgID: extractFormOrgID(c),
	})
	if err != nil {
		return mapFormError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *FormHandler) UpdateForm(c *fiber.Ctx) error {
	formID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request",
			"https://api.manris.com/errors/bad-request", "invalid form ID")
	}

	userID, err := extractFormUserID(c)
	if err != nil {
		return sendProblemDetails(c, fiber.StatusUnauthorized, "Unauthorized",
			"https://api.manris.com/errors/unauthorized", err.Error())
	}

	var req updateFormRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request",
			"https://api.manris.com/errors/bad-request", fmt.Sprintf("invalid request body: %v", err))
	}

	sections, err := toSectionInputs(req.Sections)
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request",
			"https://api.manris.com/errors/bad-request", err.Error())
	}

	orgIDs, err := parseOrgIDs(req.OrganizationIDs)
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request",
			"https://api.manris.com/errors/bad-request", err.Error())
	}

	result, err := h.updateUC.Execute(c.Context(), formusecase.UpdateFormInput{
		FormID:          formID,
		UpdaterID:       userID,
		Title:           req.Title,
		Description:     req.Description,
		Sections:        sections,
		TargetAudience:  req.TargetAudience,
		OrganizationIDs: orgIDs,
	})
	if err != nil {
		return mapFormError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *FormHandler) DeleteForm(c *fiber.Ctx) error {
	formID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request",
			"https://api.manris.com/errors/bad-request", "invalid form ID")
	}

	result, err := h.deleteUC.Execute(c.Context(), formID)
	if err != nil {
		return mapFormError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *FormHandler) PublishForm(c *fiber.Ctx) error {
	formID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request",
			"https://api.manris.com/errors/bad-request", "invalid form ID")
	}

	result, err := h.publishUC.Execute(c.Context(), formID)
	if err != nil {
		return mapFormError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *FormHandler) CloseForm(c *fiber.Ctx) error {
	formID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request",
			"https://api.manris.com/errors/bad-request", "invalid form ID")
	}

	result, err := h.closeUC.Execute(c.Context(), formID)
	if err != nil {
		return mapFormError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *FormHandler) SubmitResponse(c *fiber.Ctx) error {
	formID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request",
			"https://api.manris.com/errors/bad-request", "invalid form ID")
	}

	userID, err := extractFormUserID(c)
	if err != nil {
		return sendProblemDetails(c, fiber.StatusUnauthorized, "Unauthorized",
			"https://api.manris.com/errors/unauthorized", err.Error())
	}

	var req submitResponseRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request",
			"https://api.manris.com/errors/bad-request", fmt.Sprintf("invalid request body: %v", err))
	}

	orgIDPtr := extractFormOrgID(c)
	orgID := uuid.Nil
	if orgIDPtr != nil {
		orgID = *orgIDPtr
	}

	result, err := h.submitUC.Execute(c.Context(), formusecase.SubmitResponseInput{
		FormID:       formID,
		RespondentID: userID,
		OrgID:        orgID,
		Answers:      req.Answers,
	})
	if err != nil {
		return mapFormError(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": result})
}

func (h *FormHandler) ListResponses(c *fiber.Ctx) error {
	formID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request",
			"https://api.manris.com/errors/bad-request", "invalid form ID")
	}

	role := extractFormRole(c)

	result, err := h.listResponsesUC.Execute(c.Context(), formusecase.ListResponsesInput{
		FormID:     formID,
		CallerRole: role,
	})
	if err != nil {
		return mapFormError(c, err)
	}

	responses := result.Responses
	if responses == nil {
		responses = []*entity.FormResponse{}
	}
	return c.JSON(fiber.Map{"data": responses})
}

func (h *FormHandler) Analytics(c *fiber.Ctx) error {
	formID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request",
			"https://api.manris.com/errors/bad-request", "invalid form ID")
	}

	result, err := h.analyticsUC.Execute(c.Context(), formusecase.FormAnalyticsInput{
		FormID: formID,
	})
	if err != nil {
		return mapFormError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}
