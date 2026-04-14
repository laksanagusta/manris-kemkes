package http

import (
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/middleware"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

// RiskHandler handles HTTP requests for Risk operations using clean architecture
type RiskHandler struct {
	createUC              *riskuc.CreateRiskUseCase
	createBatchUC         *riskuc.CreateRiskBatchUseCase
	spreadsheetUC         *riskuc.BulkRiskSpreadsheetUseCase
	getUC                 *riskuc.GetRiskUseCase
	reassessUC            *riskuc.CreateRiskReassessmentUseCase
	updateUC              *riskuc.UpdateRiskUseCase
	deleteUC              *riskuc.DeleteRiskUseCase
	listUC                *riskuc.ListRisksUseCase
	listRegisterUC        *riskuc.ListRiskRegisterUseCase
	listCycleSnapshotUC   *riskuc.ListRiskCycleSnapshotUseCase
	listVersionsUC        *riskuc.ListRiskVersionsUseCase
	reviewQueueUC         *riskuc.ListRiskReviewQueueUseCase
	compareCyclesUC       *riskuc.CompareRiskCyclesUseCase
	compareDetailUC       *riskuc.CompareRiskCycleDetailsUseCase
	reviewSummaryUC       *riskuc.RiskReviewSummaryUseCase
	dashboardSummaryUC    *riskuc.DashboardSummaryUseCase
	actionPressureUC      *riskuc.DashboardActionPressureUseCase
	executiveAlertsUC     *riskuc.ExecutiveAlertsUseCase
	heatmapDataUC         *riskuc.HeatmapDataUseCase
	dashboardCategoriesUC *riskuc.DashboardRiskCategoriesUseCase
	topRisksUC            *riskuc.TopRisksUseCase
	listApprovedUC        *riskuc.ListApprovedRisksUseCase
	heatmapVelocityUC     *riskuc.HeatmapVelocityUseCase
	overdueTimelineUC     *riskuc.OverdueMitigationTimelineUseCase
	kriBreachSummaryUC    *riskuc.KRIBreachSummaryUseCase
	unitResponseTimeUC    *riskuc.UnitResponseTimeUseCase
	mmRepo                repository.MeetingMinuteRepository
}

func NewRiskHandler(
	createUC *riskuc.CreateRiskUseCase,
	createBatchUC *riskuc.CreateRiskBatchUseCase,
	spreadsheetUC *riskuc.BulkRiskSpreadsheetUseCase,
	getUC *riskuc.GetRiskUseCase,
	reassessUC *riskuc.CreateRiskReassessmentUseCase,
	updateUC *riskuc.UpdateRiskUseCase,
	deleteUC *riskuc.DeleteRiskUseCase,
	listUC *riskuc.ListRisksUseCase,
	listRegisterUC *riskuc.ListRiskRegisterUseCase,
	listCycleSnapshotUC *riskuc.ListRiskCycleSnapshotUseCase,
	listVersionsUC *riskuc.ListRiskVersionsUseCase,
	reviewQueueUC *riskuc.ListRiskReviewQueueUseCase,
	compareCyclesUC *riskuc.CompareRiskCyclesUseCase,
	compareDetailUC *riskuc.CompareRiskCycleDetailsUseCase,
	reviewSummaryUC *riskuc.RiskReviewSummaryUseCase,
	dashboardSummaryUC *riskuc.DashboardSummaryUseCase,
	actionPressureUC *riskuc.DashboardActionPressureUseCase,
	executiveAlertsUC *riskuc.ExecutiveAlertsUseCase,
	heatmapDataUC *riskuc.HeatmapDataUseCase,
	topRisksUC *riskuc.TopRisksUseCase,
	dashboardCategoriesUC *riskuc.DashboardRiskCategoriesUseCase,
	listApprovedUC *riskuc.ListApprovedRisksUseCase,
	heatmapVelocityUC *riskuc.HeatmapVelocityUseCase,
	overdueTimelineUC *riskuc.OverdueMitigationTimelineUseCase,
	kriBreachSummaryUC *riskuc.KRIBreachSummaryUseCase,
	unitResponseTimeUC *riskuc.UnitResponseTimeUseCase,
	mmRepo repository.MeetingMinuteRepository,
) *RiskHandler {
	return &RiskHandler{
		createUC:              createUC,
		createBatchUC:         createBatchUC,
		spreadsheetUC:         spreadsheetUC,
		getUC:                 getUC,
		reassessUC:            reassessUC,
		updateUC:              updateUC,
		deleteUC:              deleteUC,
		listUC:                listUC,
		listRegisterUC:        listRegisterUC,
		listCycleSnapshotUC:   listCycleSnapshotUC,
		listVersionsUC:        listVersionsUC,
		reviewQueueUC:         reviewQueueUC,
		compareCyclesUC:       compareCyclesUC,
		compareDetailUC:       compareDetailUC,
		reviewSummaryUC:       reviewSummaryUC,
		dashboardSummaryUC:    dashboardSummaryUC,
		actionPressureUC:      actionPressureUC,
		executiveAlertsUC:     executiveAlertsUC,
		heatmapDataUC:         heatmapDataUC,
		topRisksUC:            topRisksUC,
		dashboardCategoriesUC: dashboardCategoriesUC,
		listApprovedUC:        listApprovedUC,
		heatmapVelocityUC:     heatmapVelocityUC,
		overdueTimelineUC:     overdueTimelineUC,
		kriBreachSummaryUC:    kriBreachSummaryUC,
		unitResponseTimeUC:    unitResponseTimeUC,
		mmRepo:                mmRepo,
	}
}

func (h *RiskHandler) ListRiskRegister(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		if scope != nil && !scope.IsGlobal {
			narrowed, err := scope.NarrowToOrg(orgID)
			if err != nil {
				return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
			}
			orgIDs = narrowed
		} else {
			orgIDs = []uuid.UUID{orgID}
		}
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

	input := riskuc.ListRiskRegisterInput{
		OrgIDs:          orgIDs,
		Status:          strings.TrimSpace(c.Query("status", "all")),
		AssessmentCycle: strings.TrimSpace(c.Query("assessment_cycle", "")),
		CreatedAt:       strings.TrimSpace(c.Query("created_at", "")),
		Query:           strings.TrimSpace(c.Query("q", "")),
		Page:            page,
		Limit:           limit,
	}
	if category := strings.TrimSpace(c.Query("category")); category != "" {
		if !entity.IsValidRiskCategory(category) {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid category")
		}
		input.Category = category
	}
	if input.CreatedAt != "" {
		if _, err := time.Parse("2006-01-02", input.CreatedAt); err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid created_at date")
		}
	}

	result, err := h.listRegisterUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}
	if result == nil {
		result = &riskuc.ListRiskRegisterResult{Data: []*entity.Risk{}, Page: page, Limit: limit}
	}
	if result.Data == nil {
		result.Data = []*entity.Risk{}
	}

	return c.JSON(fiber.Map{
		"data":  result.Data,
		"total": result.Total,
		"page":  result.Page,
		"limit": result.Limit,
	})
}

// ListCycleSnapshot handles GET /api/risks/cycle-snapshot?cycle=YYYY-H1
func (h *RiskHandler) ListCycleSnapshot(c *fiber.Ctx) error {
	cycle := c.Query("cycle")
	if cycle == "" {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "cycle is required")
	}

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		if scope != nil && !scope.IsGlobal {
			narrowed, err := scope.NarrowToOrg(orgID)
			if err != nil {
				return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
			}
			orgIDs = narrowed
		} else {
			orgIDs = []uuid.UUID{orgID}
		}
	}

	input := riskuc.ListRiskCycleSnapshotInput{
		Cycle:  cycle,
		OrgIDs: orgIDs,
	}

	risks, err := h.listCycleSnapshotUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}
	if risks == nil {
		risks = []*entity.Risk{}
	}
	return c.JSON(fiber.Map{"data": risks})
}

// CompareCyclesDetail handles GET /api/risks/compare/detail
func (h *RiskHandler) CompareCyclesDetail(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		if scope != nil && !scope.IsGlobal {
			narrowed, err := scope.NarrowToOrg(orgID)
			if err != nil {
				return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
			}
			orgIDs = narrowed
		} else {
			orgIDs = []uuid.UUID{orgID}
		}
	}

	input := riskuc.CompareRiskCycleDetailsInput{
		FromCycle:     c.Query("from"),
		ToCycle:       c.Query("to"),
		OrgIDs:        orgIDs,
		IncludeStable: strings.EqualFold(c.Query("include_stable", "false"), "true"),
	}

	report, err := h.compareDetailUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}
	if report == nil {
		report = &entity.RiskCycleDetailedComparisonReport{
			Summary: &entity.RiskCycleDetailedComparisonSummary{FromCycle: input.FromCycle, ToCycle: input.ToCycle},
			Items:   []*entity.RiskCycleDetailedComparisonItem{},
		}
	}
	if report.Items == nil {
		report.Items = []*entity.RiskCycleDetailedComparisonItem{}
	}
	return c.JSON(fiber.Map{"data": report})
}

// ListReviewQueue handles GET /api/risks/review-queue
func (h *RiskHandler) ListReviewQueue(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		if scope != nil && !scope.IsGlobal {
			narrowed, err := scope.NarrowToOrg(orgID)
			if err != nil {
				return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
			}
			orgIDs = narrowed
		} else {
			orgIDs = []uuid.UUID{orgID}
		}
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	search := c.Query("search", "")

	input := riskuc.ListRiskReviewQueueInput{
		Cycle:  c.Query("cycle"),
		OrgIDs: orgIDs,
		Status: c.Query("status", "all"),
		Search: search,
		Page:   page,
		Limit:  limit,
	}

	result, err := h.reviewQueueUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(result)
}

// CompareCycles handles GET /api/risks/compare
func (h *RiskHandler) CompareCycles(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		if scope != nil && !scope.IsGlobal {
			narrowed, err := scope.NarrowToOrg(orgID)
			if err != nil {
				return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
			}
			orgIDs = narrowed
		} else {
			orgIDs = []uuid.UUID{orgID}
		}
	}

	input := riskuc.CompareRiskCyclesInput{
		FromCycle: c.Query("from"),
		ToCycle:   c.Query("to"),
		OrgIDs:    orgIDs,
	}

	items, err := h.compareCyclesUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}
	if items == nil {
		items = []*entity.RiskCycleComparisonItem{}
	}
	return c.JSON(fiber.Map{"data": items})
}

// ReviewSummary handles GET /api/dashboard/risk-review-summary
func (h *RiskHandler) ReviewSummary(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		if scope != nil && !scope.IsGlobal {
			narrowed, err := scope.NarrowToOrg(orgID)
			if err != nil {
				return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
			}
			orgIDs = narrowed
		} else {
			orgIDs = []uuid.UUID{orgID}
		}
	}

	input := riskuc.RiskReviewSummaryInput{
		Cycle:  c.Query("cycle"),
		OrgIDs: orgIDs,
	}

	summary, err := h.reviewSummaryUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(fiber.Map{"data": summary})
}

// DownloadBulkRiskTemplate handles GET /api/risks/batch/template
func (h *RiskHandler) DownloadBulkRiskTemplate(c *fiber.Ctx) error {
	content, filename, err := h.spreadsheetUC.Template()
	if err != nil {
		return handleError(c, err)
	}
	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	return c.Send(content)
}

// PreviewRiskBatchUpload handles POST /api/risks/batch/preview
func (h *RiskHandler) PreviewRiskBatchUpload(c *fiber.Ctx) error {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "file is required")
	}
	file, err := fileHeader.Open()
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "failed to open uploaded file")
	}
	defer file.Close()
	content, err := io.ReadAll(file)
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "failed to read uploaded file")
	}
	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "user ID not found in context")
	}
	result, err := h.spreadsheetUC.Preview(c.Context(), riskuc.BulkRiskSpreadsheetInput{
		Filename:   fileHeader.Filename,
		Content:    content,
		UploaderID: userID,
	})
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}

type createRiskBatchRequest struct {
	Items []riskuc.CreateRiskBatchItemInput `json:"items"`
}

type createRiskReassessmentRequest struct {
	Cycle string `json:"cycle"`
}

// CreateRisk handles POST /api/risks
func (h *RiskHandler) CreateRisk(c *fiber.Ctx) error {
	var input riskuc.CreateRiskInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", fmt.Sprintf("invalid request body: %v", err))
	}

	// Get user ID from context (set by auth middleware)
	// Note: middleware sets "userId" (camelCase), not "userID"
	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "user ID not found in context")
	}
	input.CreatedBy = &userID

	// Scope enforcement — user must have write access to the target org
	scope := middleware.GetAccessScope(c)
	if input.OrganizationID != nil && scope != nil && !scope.CanWrite(*input.OrganizationID) {
		return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "cannot create risk in this organization")
	}

	result, err := h.createUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(201).JSON(fiber.Map{"data": result})
}

// CreateRiskBatch handles POST /api/risks/batch
func (h *RiskHandler) CreateRiskBatch(c *fiber.Ctx) error {
	var req createRiskBatchRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", fmt.Sprintf("invalid request body: %v", err))
	}

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "user ID not found in context")
	}

	// Scope enforcement — validate each item's org
	scope := middleware.GetAccessScope(c)
	for _, item := range req.Items {
		if item.OrganizationID != nil && scope != nil && !scope.CanWrite(*item.OrganizationID) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden",
				fmt.Sprintf("cannot create risk in organization %s", item.OrganizationID.String()))
		}
	}

	result, err := h.createBatchUC.Execute(c.Context(), riskuc.CreateRiskBatchInput{
		Items:     req.Items,
		CreatedBy: &userID,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(201).JSON(fiber.Map{"data": result})
}

// GetRisk handles GET /api/risks/:id
func (h *RiskHandler) GetRisk(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk ID")
	}

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	risk, err := h.getUC.Execute(c.Context(), id, orgIDs)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": risk})
}

// CreateReassessment handles POST /api/risks/:id/reassess
func (h *RiskHandler) CreateReassessment(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk ID")
	}

	var req createRiskReassessmentRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	result, err := h.reassessUC.Execute(c.Context(), riskuc.CreateRiskReassessmentInput{RiskID: id, Cycle: req.Cycle, OrgIDs: orgIDs})
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(201).JSON(fiber.Map{"data": result})
}

// UpdateRisk handles PUT /api/risks/:id
func (h *RiskHandler) UpdateRisk(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk ID")
	}

	var input riskuc.UpdateRiskInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	input.ID = id

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	result, err := h.updateUC.Execute(c.Context(), input, orgIDs)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// DeleteRisk handles DELETE /api/risks/:id
func (h *RiskHandler) DeleteRisk(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk ID")
	}

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	result, err := h.deleteUC.Execute(c.Context(), id, orgIDs)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// ListApprovedRisks handles GET /api/risks/trend
func (h *RiskHandler) ListApprovedRisks(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		if scope != nil && !scope.IsGlobal {
			narrowed, err := scope.NarrowToOrg(orgID)
			if err != nil {
				return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
			}
			orgIDs = narrowed
		} else {
			orgIDs = []uuid.UUID{orgID}
		}
	}

	input := riskuc.ListApprovedRisksInput{
		OrgIDs: orgIDs,
	}

	risks, err := h.listApprovedUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	if risks == nil {
		risks = []*entity.Risk{}
	}
	return c.JSON(fiber.Map{"data": risks})
}

// ListRisks handles GET /api/risks
func (h *RiskHandler) ListRisks(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		if scope != nil && !scope.IsGlobal {
			narrowed, err := scope.NarrowToOrg(orgID)
			if err != nil {
				return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
			}
			orgIDs = narrowed
		} else {
			orgIDs = []uuid.UUID{orgID}
		}
	}

	var input riskuc.ListRisksInput
	input.OrgIDs = orgIDs
	input.Status = c.Query("status", "all")
	if category := strings.TrimSpace(c.Query("category")); category != "" {
		if !entity.IsValidRiskCategory(category) {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid category")
		}
		input.Category = category
	}

	risks, err := h.listUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	if risks == nil {
		risks = []*entity.Risk{}
	}
	return c.JSON(fiber.Map{"data": risks})
}

// ListVersions handles GET /api/risks/:id/versions
func (h *RiskHandler) ListVersions(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk ID")
	}

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	versions, err := h.listVersionsUC.Execute(c.Context(), id, orgIDs)
	if err != nil {
		return handleError(c, err)
	}
	if versions == nil {
		versions = []*entity.Risk{}
	}
	return c.JSON(fiber.Map{"data": versions})
}

// DashboardSummary handles GET /api/risks/dashboard/summary
func (h *RiskHandler) DashboardSummary(c *fiber.Ctx) error {
	cycle := c.Query("cycle")
	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}
	summary, err := h.dashboardSummaryUC.Execute(c.Context(), riskuc.DashboardSummaryInput{Cycle: cycle, OrgIDs: orgIDs})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": summary.Summary})
}

// ActionPressure handles GET /api/dashboard/action-pressure
func (h *RiskHandler) ActionPressure(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	points, err := h.actionPressureUC.Execute(c.Context(), riskuc.DashboardActionPressureInput{
		Interval: c.Query("interval", "month"),
		Window:   c.QueryInt("window", 6),
		OrgIDs:   orgIDs,
	})
	if err != nil {
		return handleError(c, err)
	}
	if points == nil {
		points = []*entity.DashboardActionPressurePoint{}
	}
	return c.JSON(fiber.Map{"data": points})
}

// ExecutiveAlerts handles GET /api/dashboard/executive-alerts
func (h *RiskHandler) ExecutiveAlerts(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}
	alerts, err := h.executiveAlertsUC.Execute(c.Context(), riskuc.ExecutiveAlertsInput{
		Cycle:  c.Query("cycle"),
		Limit:  c.QueryInt("limit", 10),
		OrgIDs: orgIDs,
	})
	if err != nil {
		return handleError(c, err)
	}
	if alerts == nil {
		alerts = []*entity.ExecutiveAlert{}
	}
	return c.JSON(fiber.Map{"data": alerts})
}

// HeatmapData handles GET /api/risks/dashboard/heatmap
func (h *RiskHandler) HeatmapData(c *fiber.Ctx) error {
	cycle := c.Query("cycle")
	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}
	data, err := h.heatmapDataUC.Execute(c.Context(), riskuc.HeatmapDataInput{Cycle: cycle, OrgIDs: orgIDs})
	if err != nil {
		return handleError(c, err)
	}

	matrix := [5][5]int{}
	for _, cell := range data.Data {
		pIdx := cell.Probability - 1
		iIdx := cell.Impact - 1
		if pIdx >= 0 && pIdx < 5 && iIdx >= 0 && iIdx < 5 {
			matrix[pIdx][iIdx] = cell.Count
		}
	}

	return c.JSON(fiber.Map{"data": matrix})
}

// TopRisks handles GET /api/risks/dashboard/top
func (h *RiskHandler) TopRisks(c *fiber.Ctx) error {
	cycle := c.Query("cycle")
	limit := 10
	if l := c.QueryInt("limit"); l > 0 {
		limit = l
	}

	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}

	input := riskuc.TopRisksInput{Cycle: cycle, Limit: limit, OrgIDs: orgIDs}

	result, err := h.topRisksUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	risks := result.Risks
	if risks == nil {
		risks = []*entity.Risk{}
	}
	return c.JSON(fiber.Map{"data": risks})
}

func (h *RiskHandler) GetDashboardRiskCategories(c *fiber.Ctx) error {
	cycle := c.Query("cycle")
	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}
	result, err := h.dashboardCategoriesUC.Execute(c.Context(), riskuc.DashboardRiskCategoriesInput{Cycle: cycle, OrgIDs: orgIDs})
	if err != nil {
		return handleError(c, err)
	}
	data := result.Counts
	if data == nil {
		data = []*entity.DashboardCategoryCount{}
	}
	return c.JSON(fiber.Map{"data": data})
}

func (h *RiskHandler) GetMeetingMinutes(c *fiber.Ctx) error {
	riskID, err := uuid.Parse(c.Params("riskId"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk ID")
	}

	// Scope enforcement — verify the parent risk belongs to user's accessible orgs
	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}
	if _, err := h.getUC.Execute(c.Context(), riskID, orgIDs); err != nil {
		return handleError(c, err)
	}

	minutes, err := h.mmRepo.ListByRiskID(c.Context(), riskID)
	if err != nil {
		return handleError(c, err)
	}

	if minutes == nil {
		minutes = []entity.MeetingMinutesRisk{}
	}
	return c.JSON(fiber.Map{"data": minutes})
}

func (h *RiskHandler) GetHeatmapVelocity(c *fiber.Ctx) error {
	fromCycle := c.Query("from")
	toCycle := c.Query("to")
	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}
	input := riskuc.HeatmapVelocityInput{FromCycle: fromCycle, ToCycle: toCycle, OrgIDs: orgIDs}
	data, err := h.heatmapVelocityUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}
	if data == nil {
		data = []entity.HeatmapVelocityCell{}
	}
	return c.JSON(fiber.Map{"data": data})
}

func (h *RiskHandler) GetOverdueMitigationsTimeline(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}
	data, err := h.overdueTimelineUC.Execute(c.Context(), riskuc.OverdueMitigationTimelineInput{OrgIDs: orgIDs})
	if err != nil {
		return handleError(c, err)
	}
	if data == nil {
		data = []entity.OverdueMitigationTimelineItem{}
	}
	return c.JSON(fiber.Map{"data": data})
}

func (h *RiskHandler) GetKRIBreachSummary(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}
	data, err := h.kriBreachSummaryUC.Execute(c.Context(), riskuc.KRIBreachSummaryInput{OrgIDs: orgIDs})
	if err != nil {
		return handleError(c, err)
	}
	if data == nil {
		data = []entity.KRIBreachItem{}
	}
	return c.JSON(fiber.Map{"data": data})
}

func (h *RiskHandler) GetUnitResponseTime(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	var orgIDs []uuid.UUID
	if scope != nil && !scope.IsGlobal {
		orgIDs = scope.AccessibleOrgIDs
	}
	data, err := h.unitResponseTimeUC.Execute(c.Context(), riskuc.UnitResponseTimeInput{OrgIDs: orgIDs})
	if err != nil {
		return handleError(c, err)
	}
	if data == nil {
		data = []entity.UnitResponseTime{}
	}
	return c.JSON(fiber.Map{"data": data})
}
