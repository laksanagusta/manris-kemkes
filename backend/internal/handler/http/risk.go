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
	listMonitoringUC        *riskuc.ListRiskMonitoringsUseCase
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
	startMonitoringUC       *riskuc.StartMonitoringUseCase
	getMonitoringUC         *riskuc.GetMonitoringUseCase
	updateMonitoringUC      *riskuc.UpdateMonitoringUseCase
	finalizeMonitoringUC    *riskuc.FinalizeMonitoringUseCase
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
	listMonitoringUC *riskuc.ListRiskMonitoringsUseCase,
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
	startMonitoringUC *riskuc.StartMonitoringUseCase,
	getMonitoringUC *riskuc.GetMonitoringUseCase,
	updateMonitoringUC *riskuc.UpdateMonitoringUseCase,
	finalizeMonitoringUC *riskuc.FinalizeMonitoringUseCase,
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
		listMonitoringUC:        listMonitoringUC,
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
		startMonitoringUC:       startMonitoringUC,
		getMonitoringUC:         getMonitoringUC,
		updateMonitoringUC:      updateMonitoringUC,
		finalizeMonitoringUC:    finalizeMonitoringUC,
		mmRepo:                  mmRepo,
	}
}

func (h *RiskHandler) ListRiskRegister(c *fiber.Ctx) error {
	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, c.Query("org_id"))
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "sort_by tidak valid")
	}
	// Validate sort_order
	if input.SortOrder != "" && input.SortOrder != "asc" && input.SortOrder != "desc" {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "sort_order tidak valid")
	}
	if input.View != "" && input.View != "monitoring-transactions" {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "view tidak valid")
	}
	if input.Lifecycle != "active" && input.Lifecycle != "archived" && input.Lifecycle != "all" {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "lifecycle tidak valid")
	}
	if category := strings.TrimSpace(c.Query("category")); category != "" {
		if !entity.IsValidRiskCategory(category) {
			return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "kategori tidak valid")
		}
		input.Category = category
	}
	if input.CreatedAt != "" {
		if _, err := time.Parse("2006-01-02", input.CreatedAt); err != nil {
			return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "tanggal created_at tidak valid")
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

// ListRiskMonitorings handles GET /api/risk-monitorings
func (h *RiskHandler) ListRiskMonitorings(c *fiber.Ctx) error {
	if h.listMonitoringUC == nil {
		return sendProblemDetails(c, fiber.StatusNotImplemented, "Belum Diimplementasikan", "https://api.manris.com/errors/not-implemented", "use case daftar pemantauan belum dikonfigurasi")
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, c.Query("org_id"))
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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

	result, err := h.listMonitoringUC.Execute(c.Context(), riskuc.ListRiskMonitoringsInput{
		OrgIDs:          orgIDs,
		Query:           strings.TrimSpace(c.Query("q", "")),
		Lifecycle:       strings.TrimSpace(c.Query("lifecycle", "active")),
		Category:        strings.TrimSpace(c.Query("category", "")),
		AssessmentCycle: strings.TrimSpace(c.Query("assessment_cycle", "")),
		CreatedAt:       strings.TrimSpace(c.Query("created_at", "")),
		Status:          strings.TrimSpace(c.Query("status", "all")),
		Page:            page,
		Limit:           limit,
		SortBy:          strings.TrimSpace(c.Query("sort_by", "")),
		SortOrder:       strings.TrimSpace(c.Query("sort_order", "")),
	})
	if err != nil {
		return handleError(c, err)
	}
	if result == nil {
		result = &riskuc.ListRiskMonitoringsResult{Data: []*entity.RiskMonitoring{}, Page: page, Limit: limit}
	}
	if result.Data == nil {
		result.Data = []*entity.RiskMonitoring{}
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
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID risiko tidak valid")
	}

	var input riskuc.ArchiveRiskInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}
	input.ID = id

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID risiko tidak valid")
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "cycle wajib diisi")
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveReportOrgIDs(scope, c.Query("org_id"))
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "file wajib diisi")
	}
	// Max 5MB file size
	const maxUploadSize = 5 << 20 // 5MB
	if fileHeader.Size > maxUploadSize {
		return sendProblemDetails(c, 413, "Payload Terlalu Besar", "https://api.manris.com/errors/payload-too-large", "ukuran file melebihi batas 5MB")
	}
	// Server-side file extension validation
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	allowedExts := map[string]bool{".xlsx": true, ".xls": true, ".csv": true}
	if !allowedExts[ext] {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "file harus berformat .xlsx, .xls, atau .csv")
	}
	file, err := fileHeader.Open()
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "gagal membuka file yang diunggah")
	}
	defer file.Close()
	content, err := io.ReadAll(file)
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "gagal membaca file yang diunggah")
	}
	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Tidak Sah", "https://api.manris.com/errors/unauthorized", "ID pengguna tidak ditemukan dalam konteks")
	}

	var orgID *uuid.UUID
	if orgIDStr := c.Query("organization_id"); orgIDStr != "" {
		parsed, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "organization_id tidak valid")
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

type startMonitoringRequest struct {
	Cycle string `json:"cycle"`
}

type updateMonitoringRequest struct {
	ObservedProbability         int                              `json:"observedProbability"`
	ObservedImpact              int                              `json:"observedImpact"`
	ConditionSummary            string                           `json:"conditionSummary"`
	EventSummary                string                           `json:"eventSummary"`
	Trend                       string                           `json:"trend"`
	EffectivenessConclusion     string                           `json:"effectivenessConclusion"`
	FollowUpNote                string                           `json:"followUpNote"`
	Conclusion                  string                           `json:"conclusion"`
	MitigationProgressSummary   string                           `json:"mitigationProgressSummary"`
	MitigationCompletionPercent int                              `json:"mitigationCompletionPercent"`
	MitigationObstacles         string                           `json:"mitigationObstacles"`
	MitigationFollowUp          string                           `json:"mitigationFollowUp"`
	Values                      entity.RiskMonitoringDraftValues `json:"values"`
}

type finalizeMonitoringRequest struct {
	FinalizedBy uuid.UUID `json:"finalizedBy"`
}

// CreateRisk handles POST /api/risks
func (h *RiskHandler) CreateRisk(c *fiber.Ctx) error {
	var input riskuc.CreateRiskInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", fmt.Sprintf("body permintaan tidak valid: %v", err))
	}

	// Get user ID from context (set by auth middleware)
	// Note: middleware sets "userId" (camelCase), not "userID"
	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Tidak Sah", "https://api.manris.com/errors/unauthorized", "ID pengguna tidak ditemukan dalam konteks")
	}
	input.CreatedBy = &userID

	// Scope enforcement — user must have write access to the target org
	scope := middleware.GetAccessScope(c)
	if input.OrganizationID != nil && scope != nil && !scope.CanWrite(*input.OrganizationID) {
		return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "tidak dapat membuat risiko di organisasi ini")
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
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", fmt.Sprintf("body permintaan tidak valid: %v", err))
	}
	const maxBatchSize = 100
	if len(req.Items) > maxBatchSize {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", fmt.Sprintf("ukuran batch melebihi batas %d item", maxBatchSize))
	}
	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Tidak Sah", "https://api.manris.com/errors/unauthorized", "ID pengguna tidak ditemukan dalam konteks")
	}

	var orgID *uuid.UUID
	if orgIDStr := c.Query("organization_id"); orgIDStr != "" {
		parsed, err := uuid.Parse(orgIDStr)
		if err != nil {
			return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "organization_id tidak valid")
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
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "organization_id wajib diisi")
	}
	orgID, err := uuid.Parse(orgIDStr)
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "organization_id tidak valid")
	}

	cycle := c.Query("cycle")
	if cycle == "" {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "cycle wajib diisi")
	}
	if !riskuc.IsValidCycleFormat(cycle) {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "format cycle harus YYYY-QN (contoh: 2026-Q1)")
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
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "file wajib diisi")
	}
	// Max 5MB file size
	const maxUploadSize = 5 << 20 // 5MB
	if fileHeader.Size > maxUploadSize {
		return sendProblemDetails(c, 413, "Payload Terlalu Besar", "https://api.manris.com/errors/payload-too-large", "ukuran file melebihi batas 5MB")
	}
	// Server-side file extension validation
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	allowedExts := map[string]bool{".xlsx": true, ".xls": true, ".csv": true}
	if !allowedExts[ext] {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "file harus berformat .xlsx, .xls, atau .csv")
	}
	file, err := fileHeader.Open()
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "gagal membuka file yang diunggah")
	}
	defer file.Close()
	content, err := io.ReadAll(file)
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "gagal membaca file yang diunggah")
	}

	orgIDStr := c.Query("organization_id")
	if orgIDStr == "" {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "organization_id wajib diisi")
	}
	orgID, err := uuid.Parse(orgIDStr)
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "organization_id tidak valid")
	}

	cycle := c.Query("cycle")
	if cycle == "" {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "cycle wajib diisi")
	}
	if !riskuc.IsValidCycleFormat(cycle) {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "format cycle harus YYYY-QN (contoh: 2026-Q1)")
	}

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Tidak Sah", "https://api.manris.com/errors/unauthorized", "ID pengguna tidak ditemukan dalam konteks")
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
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", fmt.Sprintf("body permintaan tidak valid: %v", err))
	}
	const maxBatchSize = 100
	if len(req.Items) > maxBatchSize {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", fmt.Sprintf("ukuran batch melebihi batas %d item", maxBatchSize))
	}
	cycle := strings.TrimSpace(req.Cycle)
	if cycle == "" {
		cycle = strings.TrimSpace(c.Query("cycle"))
	}
	if cycle == "" {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "cycle wajib diisi")
	}
	if !riskuc.IsValidCycleFormat(cycle) {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "format cycle harus YYYY-QN (contoh: 2026-Q1)")
	}

	userID, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		return sendProblemDetails(c, 401, "Tidak Sah", "https://api.manris.com/errors/unauthorized", "ID pengguna tidak ditemukan dalam konteks")
	}

	orgIDStr := c.Query("organization_id")
	if orgIDStr == "" {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "organization_id wajib diisi")
	}
	orgID, err := uuid.Parse(orgIDStr)
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "organization_id tidak valid")
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
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID risiko tidak valid")
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
		return sendProblemDetails(c, fiber.StatusInternalServerError, "Kesalahan Server Internal", "https://api.manris.com/errors/internal-server-error", "use case ekspor pdf risiko belum dikonfigurasi")
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID risiko tidak valid")
	}

	result, err := h.exportPDFUC.Execute(c.Context(), riskuc.ExportRiskPDFInput{
		ID:    id,
		Scope: middleware.GetAccessScope(c),
	})
	if err != nil {
		if errors.Is(err, domainerrors.ErrInvalidStatus) {
			return sendProblemDetails(c, fiber.StatusConflict, "Konflik", "https://api.manris.com/errors/conflict", "ekspor PDF hanya tersedia untuk risiko yang sudah difinalisasi")
		}
		return handleError(c, err)
	}
	if result == nil || len(result.Bytes) == 0 {
		return sendProblemDetails(c, fiber.StatusInternalServerError, "Kesalahan Server Internal", "https://api.manris.com/errors/internal-server-error", "ekspor pdf risiko menghasilkan hasil kosong")
	}

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, result.Filename))
	return c.Send(result.Bytes)
}

// CreateReassessment handles POST /api/risks/:id/reassess
func (h *RiskHandler) CreateReassessment(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID risiko tidak valid")
	}

	var req createRiskReassessmentRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
	}

	userID, _ := c.Locals("userId").(uuid.UUID)

	result, err := h.reassessUC.Execute(c.Context(), riskuc.CreateRiskReassessmentInput{RiskID: id, Cycle: req.Cycle, OrgIDs: orgIDs, CreatedBy: userID})
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(201).JSON(fiber.Map{"data": result})
}

// StartMonitoring handles POST /api/risks/:id/monitorings
func (h *RiskHandler) StartMonitoring(c *fiber.Ctx) error {
	if h.startMonitoringUC == nil {
		return sendProblemDetails(c, fiber.StatusNotImplemented, "Belum Diimplementasikan", "https://api.manris.com/errors/not-implemented", "use case pemantauan belum dikonfigurasi")
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID risiko tidak valid")
	}

	var req startMonitoringRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
	}

	userID, _ := c.Locals("userId").(uuid.UUID)
	result, err := h.startMonitoringUC.Execute(c.Context(), riskuc.StartMonitoringInput{
		SourceRiskID: id,
		Cycle:        req.Cycle,
		OrgIDs:       orgIDs,
		StartedBy:    userID,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": result})
}

// GetMonitoring handles GET /api/risk-monitorings/:id
func (h *RiskHandler) GetMonitoring(c *fiber.Ctx) error {
	if h.getMonitoringUC == nil {
		return sendProblemDetails(c, fiber.StatusNotImplemented, "Belum Diimplementasikan", "https://api.manris.com/errors/not-implemented", "use case pemantauan belum dikonfigurasi")
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID pemantauan tidak valid")
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
	}

	result, err := h.getMonitoringUC.Execute(c.Context(), id, orgIDs)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// UpdateMonitoring handles PUT /api/risk-monitorings/:id
func (h *RiskHandler) UpdateMonitoring(c *fiber.Ctx) error {
	if h.updateMonitoringUC == nil {
		return sendProblemDetails(c, fiber.StatusNotImplemented, "Belum Diimplementasikan", "https://api.manris.com/errors/not-implemented", "use case pemantauan belum dikonfigurasi")
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID pemantauan tidak valid")
	}

	var req updateMonitoringRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
	}

	result, err := h.updateMonitoringUC.Execute(c.Context(), riskuc.UpdateMonitoringInput{
		MonitoringID:                id,
		OrgIDs:                      orgIDs,
		ObservedProbability:         req.Values.Probability,
		ObservedImpact:              req.Values.Impact,
		ConditionSummary:            req.ConditionSummary,
		EventSummary:                req.EventSummary,
		Trend:                       req.Trend,
		EffectivenessConclusion:     req.EffectivenessConclusion,
		FollowUpNote:                req.FollowUpNote,
		Conclusion:                  req.Conclusion,
		MitigationProgressSummary:   req.MitigationProgressSummary,
		MitigationCompletionPercent: req.MitigationCompletionPercent,
		MitigationObstacles:         req.MitigationObstacles,
		MitigationFollowUp:          req.MitigationFollowUp,
		Values:                      req.Values,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// FinalizeMonitoring handles POST /api/risk-monitorings/:id/finalize
func (h *RiskHandler) FinalizeMonitoring(c *fiber.Ctx) error {
	if h.finalizeMonitoringUC == nil {
		return sendProblemDetails(c, fiber.StatusNotImplemented, "Belum Diimplementasikan", "https://api.manris.com/errors/not-implemented", "use case pemantauan belum dikonfigurasi")
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID pemantauan tidak valid")
	}

	var req finalizeMonitoringRequest
	if err := c.BodyParser(&req); err != nil && !errors.Is(err, io.EOF) {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
	}

	finalizedBy, _ := c.Locals("userId").(uuid.UUID)
	if req.FinalizedBy != uuid.Nil {
		finalizedBy = req.FinalizedBy
	}

	result, err := h.finalizeMonitoringUC.Execute(c.Context(), riskuc.FinalizeMonitoringInput{
		MonitoringID: id,
		OrgIDs:       orgIDs,
		FinalizedBy:  finalizedBy,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}

// UpdateRisk handles PUT /api/risks/:id
func (h *RiskHandler) UpdateRisk(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID risiko tidak valid")
	}

	var input riskuc.UpdateRiskInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "body permintaan tidak valid")
	}

	input.ID = id

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID risiko tidak valid")
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
	}

	var input riskuc.ListRisksInput
	input.OrgIDs = orgIDs
	input.Status = c.Query("status", "all")
	if category := strings.TrimSpace(c.Query("category")); category != "" {
		if !entity.IsValidRiskCategory(category) {
			return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "kategori tidak valid")
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
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID risiko tidak valid")
	}

	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID risiko tidak valid")
	}

	// Scope enforcement — verify the parent risk belongs to user's accessible orgs
	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveOperationalOrgIDs(scope, "")
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
			return sendProblemDetails(c, 403, "Terlarang", "https://api.manris.com/errors/forbidden", "organisasi tidak dapat diakses")
		}
		return sendProblemDetails(c, 400, "Permintaan Tidak Valid", "https://api.manris.com/errors/bad-request", "ID organisasi tidak valid")
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
