package http

import (
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/middleware"
	workingpaper "github.com/manris/backend/internal/usecase/workingpaper"
)

// WorkingPaperHandler handles HTTP requests for Working Paper operations.
type WorkingPaperHandler struct {
	uc     *workingpaper.UseCase
	wpRepo repository.WorkingPaperRepository
}

// NewWorkingPaperHandler creates a new working paper handler.
func NewWorkingPaperHandler(uc *workingpaper.UseCase, wpRepo repository.WorkingPaperRepository) *WorkingPaperHandler {
	return &WorkingPaperHandler{uc: uc, wpRepo: wpRepo}
}

// createWorkingPaperRequest is the JSON body for POST /working-papers.
type createWorkingPaperRequest struct {
	OrganizationID  uuid.UUID                      `json:"organization_id"`
	AssessmentCycle string                         `json:"assessment_cycle"`
	RosterRevision  string                         `json:"roster_revision"`
	RosterDecisions []workingPaperRosterDecision   `json:"roster_decisions"`
	Signatories     []createSignatoryRequest       `json:"signatories"`
}

type workingPaperRosterDecision struct {
	VersionGroupID  uuid.UUID `json:"version_group_id"`
	Included        bool      `json:"included"`
	ExclusionReason string    `json:"exclusion_reason"`
}

type createSignatoryRequest struct {
	UserID        uuid.UUID `json:"user_id"`
	SequenceNo    int       `json:"sequence_no"`
	SignerName    string    `json:"signer_name"`
	SignerNIP     string    `json:"signer_nip"`
	SignerJabatan string    `json:"signer_jabatan"`
	SignerPangkat string    `json:"signer_pangkat"`
}

// Create handles POST /working-papers.
func (h *WorkingPaperHandler) Create(c *fiber.Ctx) error {
	var req createWorkingPaperRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	scope := middleware.GetAccessScope(c)
	if scope == nil {
		return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "no organization scope")
	}

	var accessibleOrgIDs []uuid.UUID
	if !scope.IsGlobal {
		if len(scope.AccessibleOrgIDs) == 0 {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "no organization scope")
		}
		accessibleOrgIDs = scope.AccessibleOrgIDs
	}

	signatories := make([]workingpaper.CreateSignatoryInput, len(req.Signatories))
	for i, s := range req.Signatories {
		signatories[i] = workingpaper.CreateSignatoryInput{
			UserID:        s.UserID,
			SequenceNo:    s.SequenceNo,
			SignerName:    s.SignerName,
			SignerNIP:     s.SignerNIP,
			SignerJabatan: s.SignerJabatan,
			SignerPangkat: s.SignerPangkat,
		}
	}

	decisions := make([]entity.WorkingPaperRosterDecision, len(req.RosterDecisions))
	for i, d := range req.RosterDecisions {
		decisions[i] = entity.WorkingPaperRosterDecision{
			VersionGroupID:  d.VersionGroupID,
			Included:        d.Included,
			ExclusionReason: d.ExclusionReason,
		}
	}

	input := workingpaper.CreateWorkingPaperInput{
		AssessmentCycle:  req.AssessmentCycle,
		OrganizationID:   req.OrganizationID,
		RosterRevision:   req.RosterRevision,
		AccessibleOrgIDs: append([]uuid.UUID(nil), accessibleOrgIDs...),
		IsGlobal:         scope.IsGlobal,
		CreatedByUserID:  userID,
		Decisions:        decisions,
		Signatories:      signatories,
	}

	wp, err := h.uc.Create(c.Context(), input)
	if err != nil {
		return handleWPError(c, err)
	}

	return c.Status(201).JSON(fiber.Map{"data": wp})
}

func (h *WorkingPaperHandler) PreviewRoster(c *fiber.Ctx) error {
	orgID, err := uuid.Parse(strings.TrimSpace(c.Query("organization_id")))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization_id")
	}
	cycle := strings.TrimSpace(c.Query("assessment_cycle"))

	scope := middleware.GetAccessScope(c)
	if scope == nil {
		return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "no organization scope")
	}

	var accessibleOrgIDs []uuid.UUID
	if !scope.IsGlobal {
		accessibleOrgIDs = scope.AccessibleOrgIDs
	}

	preview, err := h.uc.PreviewRoster(c.Context(), orgID, cycle, accessibleOrgIDs, scope.IsGlobal)
	if err != nil {
		return handleWPError(c, err)
	}

	return c.JSON(fiber.Map{"data": preview})
}

// List handles GET /working-papers.
func (h *WorkingPaperHandler) List(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	status := strings.TrimSpace(c.Query("status", ""))
	query := strings.TrimSpace(c.Query("q", ""))
	assessmentCycle := strings.TrimSpace(c.Query("assessment_cycle", ""))
	createdAt := strings.TrimSpace(c.Query("created_at", ""))
	page, _ := strconv.Atoi(c.Query("page", "1"))
	if createdAt != "" {
		if _, err := time.Parse("2006-01-02", createdAt); err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid created_at date")
		}
	}
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

	wps, total, err := h.uc.List(c.Context(), orgIDs, status, query, assessmentCycle, createdAt, page, limit)
	if err != nil {
		return handleWPError(c, err)
	}

	return c.JSON(fiber.Map{
		"data":  wps,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// Get handles GET /working-papers/:id.
func (h *WorkingPaperHandler) Get(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid working paper ID")
	}

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	wp, err := h.uc.Get(c.Context(), id, orgIDs)
	if err != nil {
		return handleWPError(c, err)
	}

	return c.JSON(fiber.Map{"data": wp})
}

// Delete handles DELETE /working-papers/:id.
func (h *WorkingPaperHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid working paper ID")
	}

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	if err := h.uc.Delete(c.Context(), id, userID); err != nil {
		return handleWPError(c, err)
	}

	return c.JSON(fiber.Map{"message": "working paper deleted"})
}

// Sign handles POST /working-papers/:id/sign.
func (h *WorkingPaperHandler) Sign(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid working paper ID")
	}

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	wp, err := h.uc.Sign(c.Context(), id, userID)
	if err != nil {
		return handleWPError(c, err)
	}

	return c.JSON(fiber.Map{"data": wp})
}

// StartSigning handles POST /working-papers/:id/start-signing.
func (h *WorkingPaperHandler) StartSigning(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid working paper ID")
	}

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	wp, err := h.uc.StartSigning(c.Context(), id, userID)
	if err != nil {
		return handleWPError(c, err)
	}

	return c.JSON(fiber.Map{"data": wp})
}

// Cancel handles POST /working-papers/:id/cancel.
func (h *WorkingPaperHandler) Cancel(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid working paper ID")
	}

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	if err := h.uc.Cancel(c.Context(), id, userID); err != nil {
		return handleWPError(c, err)
	}

	return c.JSON(fiber.Map{"message": "working paper cancelled"})
}

// SkipTTE handles POST /working-papers/:id/skip-tte.
func (h *WorkingPaperHandler) SkipTTE(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid working paper ID")
	}

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	wp, err := h.uc.SkipTTE(c.Context(), id, userID)
	if err != nil {
		return handleWPError(c, err)
	}

	return c.JSON(fiber.Map{"data": wp})
}

// GetPendingSigningCount handles GET /working-papers/pending-count.
func (h *WorkingPaperHandler) GetPendingSigningCount(c *fiber.Ctx) error {
	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	count, err := h.wpRepo.CountPendingSigningByUserID(c.Context(), userID)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": fiber.Map{"count": count}})
}

// pendingSigningItem is the flat response shape for pending-signing list.
type pendingSigningItem struct {
	ID              uuid.UUID `json:"id"`
	WorkingPaperID  uuid.UUID `json:"working_paper_id"`
	Title           string    `json:"title"`
	AssessmentCycle string    `json:"assessment_cycle"`
	SequenceNo      int       `json:"sequence_no"`
	SignerJabatan   string    `json:"signer_jabatan"`
	SignerPangkat   string    `json:"signer_pangkat"`
	CreatedAt       time.Time `json:"created_at"`
}

// ListPendingSigning handles GET /working-papers/pending-signing.
func (h *WorkingPaperHandler) ListPendingSigning(c *fiber.Ctx) error {
	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "unauthorized")
	}

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	wps, err := h.wpRepo.GetPendingSigningByUserID(c.Context(), userID, orgIDs)
	if err != nil {
		return handleError(c, err)
	}

	items := make([]pendingSigningItem, 0, len(wps))
	for _, wp := range wps {
		for _, sig := range wp.Signatories {
			if sig.UserID == userID && sig.Status == "pending" {
				items = append(items, pendingSigningItem{
					ID:              sig.ID,
					WorkingPaperID:  wp.ID,
					Title:           wp.Title,
					AssessmentCycle: wp.AssessmentCycle,
					SequenceNo:      sig.SequenceNo,
					SignerJabatan:   sig.SignerJabatan,
					SignerPangkat:   sig.SignerPangkat,
					CreatedAt:       wp.CreatedAt,
				})
				break
			}
		}
	}

	return c.JSON(fiber.Map{"data": items})
}

// handleWPError extends handleError with INVALID_STATUS → 409 Conflict.
func handleWPError(c *fiber.Ctx, err error) error {
	var appErr *domainerrors.AppError
	if errors.As(err, &appErr) {
		switch appErr.Code {
		case "INVALID_STATUS", "ROSTER_STALE", "MONITORING_CONFLICT", "SEMESTER_CONFLICT":
			return sendProblemDetails(c, fiber.StatusConflict, "Conflict", "https://api.manris.com/errors/conflict", appErr.Message)
		case "MONITORING_INCOMPLETE":
			return sendProblemDetailsWithDetails(
				c,
				fiber.StatusConflict,
				"Monitoring Incomplete",
				"https://api.manris.com/errors/monitoring-incomplete",
				appErr.Message,
				appErr.Details,
			)
		}
	}
	return handleError(c, err)
}
