package http

import (
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	krireportuc "github.com/manris/backend/internal/usecase/kri_report"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

// RiskHandler handles HTTP requests for Risk operations using clean architecture
type RiskHandler struct {
	createUC             *riskuc.CreateRiskUseCase
	createBatchUC        *riskuc.CreateRiskBatchUseCase
	spreadsheetUC        *riskuc.BulkRiskSpreadsheetUseCase
	getUC                *riskuc.GetRiskUseCase
	reassessUC           *riskuc.CreateRiskReassessmentUseCase
	updateUC             *riskuc.UpdateRiskUseCase
	deleteUC             *riskuc.DeleteRiskUseCase
	listUC               *riskuc.ListRisksUseCase
	listApprovedUC       *riskuc.ListApprovedRisksUseCase
	listCycleSnapshotUC  *riskuc.ListRiskCycleSnapshotUseCase
	listVersionsUC       *riskuc.ListRiskVersionsUseCase
	kriSemesterSummaryUC *krireportuc.BuildKRISemesterSummaryUseCase
	reviewQueueUC        *riskuc.ListRiskReviewQueueUseCase
	compareCyclesUC      *riskuc.CompareRiskCyclesUseCase
	compareDetailUC      *riskuc.CompareRiskCycleDetailsUseCase
	reviewSummaryUC      *riskuc.RiskReviewSummaryUseCase
	dashboardSummaryUC   *riskuc.DashboardSummaryUseCase
	actionPressureUC     *riskuc.DashboardActionPressureUseCase
	executiveAlertsUC    *riskuc.ExecutiveAlertsUseCase
	heatmapDataUC        *riskuc.HeatmapDataUseCase
	topRisksUC           *riskuc.TopRisksUseCase
	mmRepo               repository.MeetingMinuteRepository
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
	listApprovedUC *riskuc.ListApprovedRisksUseCase,
	listCycleSnapshotUC *riskuc.ListRiskCycleSnapshotUseCase,
	listVersionsUC *riskuc.ListRiskVersionsUseCase,
	kriSemesterSummaryUC *krireportuc.BuildKRISemesterSummaryUseCase,
	reviewQueueUC *riskuc.ListRiskReviewQueueUseCase,
	compareCyclesUC *riskuc.CompareRiskCyclesUseCase,
	compareDetailUC *riskuc.CompareRiskCycleDetailsUseCase,
	reviewSummaryUC *riskuc.RiskReviewSummaryUseCase,
	dashboardSummaryUC *riskuc.DashboardSummaryUseCase,
	actionPressureUC *riskuc.DashboardActionPressureUseCase,
	executiveAlertsUC *riskuc.ExecutiveAlertsUseCase,
	heatmapDataUC *riskuc.HeatmapDataUseCase,
	topRisksUC *riskuc.TopRisksUseCase,
	mmRepo repository.MeetingMinuteRepository,
) *RiskHandler {
	return &RiskHandler{
		createUC:             createUC,
		createBatchUC:        createBatchUC,
		spreadsheetUC:        spreadsheetUC,
		getUC:                getUC,
		reassessUC:           reassessUC,
		updateUC:             updateUC,
		deleteUC:             deleteUC,
		listUC:               listUC,
		listApprovedUC:       listApprovedUC,
		listCycleSnapshotUC:  listCycleSnapshotUC,
		listVersionsUC:       listVersionsUC,
		kriSemesterSummaryUC: kriSemesterSummaryUC,
		reviewQueueUC:        reviewQueueUC,
		compareCyclesUC:      compareCyclesUC,
		compareDetailUC:      compareDetailUC,
		reviewSummaryUC:      reviewSummaryUC,
		dashboardSummaryUC:   dashboardSummaryUC,
		actionPressureUC:     actionPressureUC,
		executiveAlertsUC:    executiveAlertsUC,
		heatmapDataUC:        heatmapDataUC,
		topRisksUC:           topRisksUC,
		mmRepo:               mmRepo,
	}
}

// ListCycleSnapshot handles GET /api/risks/cycle-snapshot?cycle=YYYY-H1
func (h *RiskHandler) ListCycleSnapshot(c *fiber.Ctx) error {
	cycle := c.Query("cycle")
	if cycle == "" {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "cycle is required")
	}

	var input riskuc.ListRiskCycleSnapshotInput
	input.Cycle = cycle

	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		input.OrgID = &orgID
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
	var input riskuc.CompareRiskCycleDetailsInput
	input.FromCycle = c.Query("from")
	input.ToCycle = c.Query("to")
	input.IncludeStable = strings.EqualFold(c.Query("include_stable", "false"), "true")
	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		input.OrgID = &orgID
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
	var input riskuc.ListRiskReviewQueueInput
	input.Cycle = c.Query("cycle")
	input.Status = c.Query("status", "all")
	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		input.OrgID = &orgID
	}

	items, err := h.reviewQueueUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}
	if items == nil {
		items = []*entity.RiskReviewQueueItem{}
	}
	return c.JSON(fiber.Map{"data": items})
}

// CompareCycles handles GET /api/risks/compare
func (h *RiskHandler) CompareCycles(c *fiber.Ctx) error {
	var input riskuc.CompareRiskCyclesInput
	input.FromCycle = c.Query("from")
	input.ToCycle = c.Query("to")
	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		input.OrgID = &orgID
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
	var input riskuc.RiskReviewSummaryInput
	input.Cycle = c.Query("cycle")
	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		input.OrgID = &orgID
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

	risk, err := h.getUC.Execute(c.Context(), id)
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

	result, err := h.reassessUC.Execute(c.Context(), riskuc.CreateRiskReassessmentInput{RiskID: id, Cycle: req.Cycle})
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

	result, err := h.updateUC.Execute(c.Context(), input)
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

	result, err := h.deleteUC.Execute(c.Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// ListRisks handles GET /api/risks
func (h *RiskHandler) ListRisks(c *fiber.Ctx) error {
	var input riskuc.ListRisksInput

	// Parse optional org_id filter
	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		input.OrgID = &orgID
	}

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

// ListApprovedRisks handles GET /api/risks/trend - returns all approved risks for trend analysis
func (h *RiskHandler) ListApprovedRisks(c *fiber.Ctx) error {
	var input riskuc.ListApprovedRisksInput

	// Parse optional org_id filter
	if orgIDStr := c.Query("org_id"); orgIDStr != "" {
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		}
		input.OrgID = &orgID
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

// ListVersions handles GET /api/risks/:id/versions
func (h *RiskHandler) ListVersions(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk ID")
	}

	versions, err := h.listVersionsUC.Execute(c.Context(), id)
	if err != nil {
		return handleError(c, err)
	}
	if versions == nil {
		versions = []*entity.Risk{}
	}
	return c.JSON(fiber.Map{"data": versions})
}

func (h *RiskHandler) GetKRISemesterSummary(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk ID")
	}

	risk, err := h.getUC.Execute(c.Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	sourceCycle := strings.TrimSpace(c.Query("cycle"))
	if sourceCycle == "" {
		sourceCycle = previousAssessmentCycle(risk.AssessmentCycle)
	}
	if sourceCycle == "" {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "cycle is required")
	}

	summary, err := h.kriSemesterSummaryUC.Execute(c.Context(), krireportuc.BuildKRISemesterSummaryInput{
		RiskID:             risk.ID,
		RiskVersionGroupID: risk.VersionGroupID,
		SourceCycle:        sourceCycle,
	})
	if err != nil {
		return handleError(c, err)
	}
	if summary.KRIs == nil {
		summary.KRIs = []*entity.KRISummary{}
	}
	return c.JSON(fiber.Map{"data": summary})
}

// DashboardSummary handles GET /api/risks/dashboard/summary
func (h *RiskHandler) DashboardSummary(c *fiber.Ctx) error {
	summary, err := h.dashboardSummaryUC.Execute(c.Context())
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": summary})
}

// ActionPressure handles GET /api/dashboard/action-pressure
func (h *RiskHandler) ActionPressure(c *fiber.Ctx) error {
	points, err := h.actionPressureUC.Execute(c.Context(), riskuc.DashboardActionPressureInput{
		Interval: c.Query("interval", "month"),
		Window:   c.QueryInt("window", 6),
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
	alerts, err := h.executiveAlertsUC.Execute(c.Context(), riskuc.ExecutiveAlertsInput{
		Cycle: c.Query("cycle"),
		Limit: c.QueryInt("limit", 10),
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
	data, err := h.heatmapDataUC.Execute(c.Context())
	if err != nil {
		return handleError(c, err)
	}

	// Initialize 5x5 matrix
	matrix := [5][5]int{}
	for _, cell := range data {
		// probability and impact are 1-5, matrix is 0-4
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
	limit := 10
	if l := c.QueryInt("limit"); l > 0 {
		limit = l
	}

	input := riskuc.TopRisksInput{Limit: limit}

	risks, err := h.topRisksUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	if risks == nil {
		risks = []*entity.Risk{}
	}
	return c.JSON(fiber.Map{"data": risks})
}

func (h *RiskHandler) GetMeetingMinutes(c *fiber.Ctx) error {
	riskID, err := uuid.Parse(c.Params("riskId"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid risk ID")
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

func previousAssessmentCycle(cycle string) string {
	parts := strings.Split(strings.TrimSpace(cycle), "-")
	if len(parts) != 2 {
		return ""
	}
	year, err := time.Parse("2006", parts[0])
	if err != nil {
		return ""
	}
	if strings.EqualFold(parts[1], "H1") {
		return fmt.Sprintf("%d-H2", year.Year()-1)
	}
	if strings.EqualFold(parts[1], "H2") {
		return fmt.Sprintf("%d-H1", year.Year())
	}
	return ""
}
