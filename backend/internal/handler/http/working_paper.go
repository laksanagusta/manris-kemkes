package http

import (
	"errors"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
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
	Title           string                   `json:"title"`
	Description     string                   `json:"description"`
	AssessmentCycle string                   `json:"assessment_cycle"`
	Risks           []workingPaperRiskInput  `json:"risks"`
	Signatories     []createSignatoryRequest `json:"signatories"`
}

type workingPaperRiskInput struct {
	RiskID     uuid.UUID `json:"risk_id"`
	SourceMode string    `json:"source_mode"`
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
	if scope == nil || scope.IsGlobal || len(scope.AccessibleOrgIDs) == 0 {
		return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "no organization scope")
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

	risks := make([]workingpaper.RiskInput, len(req.Risks))
	for i, r := range req.Risks {
		risks[i] = workingpaper.RiskInput{
			RiskID:     r.RiskID,
			SourceMode: r.SourceMode,
		}
	}

	input := workingpaper.CreateWorkingPaperInput{
		Title:            req.Title,
		Description:      req.Description,
		AssessmentCycle:  req.AssessmentCycle,
		AccessibleOrgIDs: append([]uuid.UUID(nil), scope.AccessibleOrgIDs...),
		CreatedByUserID:  userID,
		Risks:            risks,
		Signatories:      signatories,
	}

	wp, err := h.uc.Create(c.Context(), input)
	if err != nil {
		return handleWPError(c, err)
	}

	return c.Status(201).JSON(fiber.Map{"data": wp})
}

// List handles GET /working-papers.
func (h *WorkingPaperHandler) List(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	status := c.Query("status", "")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	wps, total, err := h.uc.List(c.Context(), orgIDs, status, page, limit)
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
	Description     string    `json:"description"`
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
					Description:     wp.Description,
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
	if errors.As(err, &appErr) && appErr.Code == "INVALID_STATUS" {
		return sendProblemDetails(c, fiber.StatusConflict, "Conflict", "https://api.manris.com/errors/conflict", appErr.Message)
	}
	return handleError(c, err)
}
