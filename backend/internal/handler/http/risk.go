package http

import (
	"context"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/middleware"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

// RiskHandler handles HTTP requests for Risk operations using clean architecture
type RiskHandler struct {
	createUC                *riskuc.CreateRiskUseCase
	createBatchUC           *riskuc.CreateRiskBatchUseCase
	spreadsheetUC           *riskuc.BulkRiskSpreadsheetUseCase
	getUC                   *riskuc.GetRiskUseCase
	exportPDFUC             riskExportPDFUseCase
	reassessUC              *riskuc.CreateRiskReassessmentUseCase
	archiveUC               *riskuc.ArchiveRiskUseCase
	restoreUC               *riskuc.RestoreRiskUseCase
	updateUC                *riskuc.UpdateRiskUseCase
	deleteUC                *riskuc.DeleteRiskUseCase
	listUC                  *riskuc.ListRisksUseCase
	listRegisterUC          *riskuc.ListRiskRegisterUseCase
	listCycleSnapshotUC     *riskuc.ListRiskCycleSnapshotUseCase
	listVersionsUC          *riskuc.ListRiskVersionsUseCase
	reviewQueueUC           *riskuc.ListRiskReviewQueueUseCase
	compareCyclesUC         *riskuc.CompareRiskCyclesUseCase
	compareDetailUC         *riskuc.CompareRiskCycleDetailsUseCase
	reviewSummaryUC         *riskuc.RiskReviewSummaryUseCase
	dashboardSummaryUC      *riskuc.DashboardSummaryUseCase
	actionPressureUC        *riskuc.DashboardActionPressureUseCase
	executiveAlertsUC       *riskuc.ExecutiveAlertsUseCase
	heatmapDataUC           *riskuc.HeatmapDataUseCase
	heatmapMultiUC          *riskuc.HeatmapMultiUseCase
	dashboardCategoriesUC   *riskuc.DashboardRiskCategoriesUseCase
	topRisksUC              *riskuc.TopRisksUseCase
	listApprovedUC          *riskuc.ListApprovedRisksUseCase
	heatmapVelocityUC       *riskuc.HeatmapVelocityUseCase
	overdueTimelineUC       *riskuc.OverdueMitigationTimelineUseCase
	kriBreachSummaryUC      *riskuc.KRIBreachSummaryUseCase
	unitResponseTimeUC      *riskuc.UnitResponseTimeUseCase
	monitoringSpreadsheetUC *riskuc.BulkMonitoringSpreadsheetUseCase
	createMonitoringBatchUC *riskuc.CreateMonitoringBatchUseCase
	mmRepo                  repository.MeetingMinuteRepository
}

type riskExportPDFUseCase interface {
	Execute(ctx context.Context, input riskuc.ExportRiskPDFInput) (*riskuc.ExportRiskPDFResult, error)
}

func NewRiskHandler(
	createUC *riskuc.CreateRiskUseCase,
	createBatchUC *riskuc.CreateRiskBatchUseCase,
	spreadsheetUC *riskuc.BulkRiskSpreadsheetUseCase,
	getUC *riskuc.GetRiskUseCase,
	exportPDFUC riskExportPDFUseCase,
	reassessUC *riskuc.CreateRiskReassessmentUseCase,
	archiveUC *riskuc.ArchiveRiskUseCase,
	restoreUC *riskuc.RestoreRiskUseCase,
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
	heatmapMultiUC *riskuc.HeatmapMultiUseCase,
	topRisksUC *riskuc.TopRisksUseCase,
	dashboardCategoriesUC *riskuc.DashboardRiskCategoriesUseCase,
	listApprovedUC *riskuc.ListApprovedRisksUseCase,
	heatmapVelocityUC *riskuc.HeatmapVelocityUseCase,
	overdueTimelineUC *riskuc.OverdueMitigationTimelineUseCase,
	kriBreachSummaryUC *riskuc.KRIBreachSummaryUseCase,
	unitResponseTimeUC *riskuc.UnitResponseTimeUseCase,
	monitoringSpreadsheetUC *riskuc.BulkMonitoringSpreadsheetUseCase,
	createMonitoringBatchUC *riskuc.CreateMonitoringBatchUseCase,
	mmRepo repository.MeetingMinuteRepository,
) *RiskHandler {
	return &RiskHandler{
		createUC:                createUC,
		createBatchUC:           createBatchUC,
		spreadsheetUC:           spreadsheetUC,
		getUC:                   getUC,
		exportPDFUC:             exportPDFUC,
		reassessUC:              reassessUC,
		archiveUC:               archiveUC,
		restoreUC:               restoreUC,
		updateUC:                updateUC,
		deleteUC:                deleteUC,
		listUC:                  listUC,
		listRegisterUC:          listRegisterUC,
		listCycleSnapshotUC:     listCycleSnapshotUC,
		listVersionsUC:          listVersionsUC,
		reviewQueueUC:           reviewQueueUC,
		compareCyclesUC:         compareCyclesUC,
		compareDetailUC:         compareDetailUC,
		reviewSummaryUC:         reviewSummaryUC,
		dashboardSummaryUC:      dashboardSummaryUC,
		actionPressureUC:        actionPressureUC,
		executiveAlertsUC:       executiveAlertsUC,
		heatmapDataUC:           heatmapDataUC,
		heatmapMultiUC:          heatmapMultiUC,
		topRisksUC:              topRisksUC,
		dashboardCategoriesUC:   dashboardCategoriesUC,
		listApprovedUC:          listApprovedUC,
		heatmapVelocityUC:       heatmapVelocityUC,
		overdueTimelineUC:       overdueTimelineUC,
		kriBreachSummaryUC:      kriBreachSummaryUC,
		unitResponseTimeUC:      unitResponseTimeUC,
		monitoringSpreadsheetUC: monitoringSpreadsheetUC,
		createMonitoringBatchUC: createMonitoringBatchUC,
		mmRepo:                  mmRepo,
	}
}

func (h *RiskHandler) ListRiskRegister(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, c.Query("org_id"))
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
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
		View:            strings.TrimSpace(c.Query("view", "")),
		OrgIDs:          orgIDs,
		Status:          strings.TrimSpace(c.Query("status", "all")),
		Lifecycle:       strings.TrimSpace(c.Query("lifecycle", "active")),
		AssessmentCycle: strings.TrimSpace(c.Query("assessment_cycle", "")),
		CreatedAt:       strings.TrimSpace(c.Query("created_at", "")),
		Query:           strings.TrimSpace(c.Query("q", "")),
		Page:            page,
		Limit:           limit,
		SortBy:          strings.TrimSpace(c.Query("sort_by", "")),
		SortOrder:       strings.TrimSpace(c.Query("sort_order", "")),
	}
	// Validate sort_by — only "created_at" or "nilai" (priority) allowed
	if input.SortBy != "" && input.SortBy != "created_at" && input.SortBy != "nilai" {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid sort_by")
	}
	// Validate sort_order
	if input.SortOrder != "" && input.SortOrder != "asc" && input.SortOrder != "desc" {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid sort_order")
	}
	if input.View != "" && input.View != "monitoring-transactions" {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid view")
	}
	if input.Lifecycle != "active" && input.Lifecycle != "archived" && input.Lifecycle != "all" {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid lifecycle")
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

func (h *RiskHandler) ArchiveRisk(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk ID")
	}

	var input riskuc.ArchiveRiskInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}
	input.ID = id

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
	}

	result, err := h.archiveUC.Execute(c.Context(), input, orgIDs, scope)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

func (h *RiskHandler) RestoreRisk(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk ID")
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
	}

	result, err := h.restoreUC.Execute(c.Context(), riskuc.RestoreRiskInput{ID: id}, orgIDs, scope)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// ListCycleSnapshot handles GET /api/risks/cycle-snapshot?cycle=YYYY-H1
func (h *RiskHandler) ListCycleSnapshot(c *fiber.Ctx) error {
	cycle := c.Query("cycle")
	if cycle == "" {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "cycle is required")
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveReportOrgIDs(scope, c.Query("org_id"))
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
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
	orgIDs, err := resolveReportOrgIDs(scope, c.Query("org_id"))
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
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
	orgIDs, err := resolveOperationalOrgIDs(scope, c.Query("org_id"))
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
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
	orgIDs, err := resolveReportOrgIDs(scope, c.Query("org_id"))
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
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
	orgIDs, err := resolveOperationalOrgIDs(scope, c.Query("org_id"))
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
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
	// Max 5MB file size
	const maxUploadSize = 5 << 20 // 5MB
	if fileHeader.Size > maxUploadSize {
		return sendProblemDetails(c, 413, "Payload Too Large", "https://api.manris.com/errors/payload-too-large", "file size exceeds 5MB limit")
	}
	// Server-side file extension validation
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	allowedExts := map[string]bool{".xlsx": true, ".xls": true, ".csv": true}
	if !allowedExts[ext] {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "file must be .xlsx, .xls, or .csv")
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

	var orgID *uuid.UUID
	if orgIDStr := c.Query("organization_id"); orgIDStr != "" {
		parsed, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization_id")
		}
		orgID = &parsed
	}

	result, err := h.spreadsheetUC.Preview(c.Context(), riskuc.BulkRiskSpreadsheetInput{
		Filename:       fileHeader.Filename,
		Content:        content,
		UploaderID:     userID,
		OrganizationID: orgID,
	})
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}

type createRiskBatchRequest struct {
	Items []riskuc.CreateRiskBatchItemInput `json:"items"`
}

type createMonitoringBatchRequest struct {
	Items []riskuc.BulkMonitoringBatchItemInput `json:"items"`
	Cycle string                                `json:"cycle"`
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
	const maxBatchSize = 100
	if len(req.Items) > maxBatchSize {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", fmt.Sprintf("batch size exceeds %d items limit", maxBatchSize))
	}
	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "user ID not found in context")
	}

	var orgID *uuid.UUID
	if orgIDStr := c.Query("organization_id"); orgIDStr != "" {
		parsed, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization_id")
		}
		orgID = &parsed
	}

	result, err := h.createBatchUC.Execute(c.Context(), riskuc.CreateRiskBatchInput{
		Items:          req.Items,
		CreatedBy:      &userID,
		OrganizationID: orgID,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(201).JSON(fiber.Map{"data": result})
}

// DownloadMonitoringTemplate handles GET /api/risks/batch/monitoring/template
func (h *RiskHandler) DownloadMonitoringTemplate(c *fiber.Ctx) error {
	orgIDStr := c.Query("organization_id")
	if orgIDStr == "" {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "organization_id is required")
	}
	orgID, err := uuid.Parse(orgIDStr)
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization_id")
	}

	cycle := c.Query("cycle")
	if cycle == "" {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "cycle is required")
	}
	if !riskuc.IsValidCycleFormat(cycle) {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "cycle must be in YYYY-HN format (e.g. 2026-H1)")
	}

	content, filename, err := h.monitoringSpreadsheetUC.Template(c.Context(), orgID, cycle)
	if err != nil {
		return handleError(c, err)
	}
	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	return c.Send(content)
}

// PreviewMonitoringBatchUpload handles POST /api/risks/batch/monitoring/preview
func (h *RiskHandler) PreviewMonitoringBatchUpload(c *fiber.Ctx) error {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "file is required")
	}
	// Max 5MB file size
	const maxUploadSize = 5 << 20 // 5MB
	if fileHeader.Size > maxUploadSize {
		return sendProblemDetails(c, 413, "Payload Too Large", "https://api.manris.com/errors/payload-too-large", "file size exceeds 5MB limit")
	}
	// Server-side file extension validation
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	allowedExts := map[string]bool{".xlsx": true, ".xls": true, ".csv": true}
	if !allowedExts[ext] {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "file must be .xlsx, .xls, or .csv")
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

	orgIDStr := c.Query("organization_id")
	if orgIDStr == "" {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "organization_id is required")
	}
	orgID, err := uuid.Parse(orgIDStr)
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization_id")
	}

	cycle := c.Query("cycle")
	if cycle == "" {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "cycle is required")
	}
	if !riskuc.IsValidCycleFormat(cycle) {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "cycle must be in YYYY-HN format (e.g. 2026-H1)")
	}

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "user ID not found in context")
	}

	result, err := h.monitoringSpreadsheetUC.Preview(c.Context(), riskuc.BulkMonitoringSpreadsheetInput{
		Filename:       fileHeader.Filename,
		Content:        content,
		UploaderID:     userID,
		OrganizationID: orgID,
		Cycle:          cycle,
	})
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}

// CreateMonitoringBatch handles POST /api/risks/batch/monitoring
func (h *RiskHandler) CreateMonitoringBatch(c *fiber.Ctx) error {
	var req createMonitoringBatchRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", fmt.Sprintf("invalid request body: %v", err))
	}
	const maxBatchSize = 100
	if len(req.Items) > maxBatchSize {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", fmt.Sprintf("batch size exceeds %d items limit", maxBatchSize))
	}
	cycle := strings.TrimSpace(req.Cycle)
	if cycle == "" {
		cycle = strings.TrimSpace(c.Query("cycle"))
	}
	if cycle == "" {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "cycle is required")
	}
	if !riskuc.IsValidCycleFormat(cycle) {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "cycle must be in YYYY-HN format (e.g. 2026-H1)")
	}

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Unauthorized", "https://api.manris.com/errors/unauthorized", "user ID not found in context")
	}

	orgIDStr := c.Query("organization_id")
	if orgIDStr == "" {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "organization_id is required")
	}
	orgID, err := uuid.Parse(orgIDStr)
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization_id")
	}

	result, err := h.createMonitoringBatchUC.Execute(c.Context(), riskuc.CreateMonitoringBatchInput{
		Items:          req.Items,
		Cycle:          cycle,
		OrganizationID: orgID,
		CreatedBy:      &userID,
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
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
	}

	risk, err := h.getUC.Execute(c.Context(), id, orgIDs)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": risk})
}

// ExportRiskPDF handles GET /api/v1/risks/:id/export-pdf
func (h *RiskHandler) ExportRiskPDF(c *fiber.Ctx) error {
	if h.exportPDFUC == nil {
		return sendProblemDetails(c, fiber.StatusInternalServerError, "Internal Server Error", "https://api.manris.com/errors/internal-server-error", "risk pdf export use case is not configured")
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk ID")
	}

	result, err := h.exportPDFUC.Execute(c.Context(), riskuc.ExportRiskPDFInput{
		ID:    id,
		Scope: middleware.GetAccessScope(c),
	})
	if err != nil {
		if errors.Is(err, domainerrors.ErrInvalidStatus) {
			return sendProblemDetails(c, fiber.StatusConflict, "Conflict", "https://api.manris.com/errors/conflict", "export PDF only available for finalized risks")
		}
		return handleError(c, err)
	}
	if result == nil || len(result.Bytes) == 0 {
		return sendProblemDetails(c, fiber.StatusInternalServerError, "Internal Server Error", "https://api.manris.com/errors/internal-server-error", "risk pdf export returned empty result")
	}

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, result.Filename))
	return c.Send(result.Bytes)
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
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
	}

	userID, _ := c.Locals("userId").(uuid.UUID)

	result, err := h.reassessUC.Execute(c.Context(), riskuc.CreateRiskReassessmentInput{RiskID: id, Cycle: req.Cycle, OrgIDs: orgIDs, CreatedBy: userID})
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
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
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
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
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
	orgIDs, err := resolveReportOrgIDs(scope, c.Query("org_id"))
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
	}

	input := riskuc.ListApprovedRisksInput{
		OrgIDs: orgIDs,
		Query:  c.Query("q"),
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
	orgIDs, err := resolveReportOrgIDs(scope, c.Query("org_id"))
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
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
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
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
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
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
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
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
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
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
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
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

func (h *RiskHandler) HeatmapMulti(c *fiber.Ctx) error {
	year, err := strconv.Atoi(c.Query("year"))
	if err != nil || year <= 0 {
		year = time.Now().Year()
	}
	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
	}
	data, err := h.heatmapMultiUC.Execute(c.Context(), riskuc.HeatmapMultiInput{Year: year, OrgIDs: orgIDs})
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(fiber.Map{"data": data})
}

// TopRisks handles GET /api/risks/dashboard/top
func (h *RiskHandler) TopRisks(c *fiber.Ctx) error {
	cycle := c.Query("cycle")
	limit := 10
	if l := c.QueryInt("limit"); l > 0 {
		limit = l
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
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
	orgIDs, err := resolveReportOrgIDs(scope, c.Query("org_id"))
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
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
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
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
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
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
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
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
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
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
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
		}
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
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
