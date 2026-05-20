// Package main is the entry point for the MANRIS v2 backend server.
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"github.com/manris/backend/internal/bootstrap"
	"github.com/manris/backend/internal/config"
	httpHandler "github.com/manris/backend/internal/handler/http"
	"github.com/manris/backend/internal/middleware"
)

func main() {
	cfg := config.Load()

	// ============================================================================
	// Dependency Injection Bootstrap
	// ============================================================================

	ctx := context.Background()
	container, err := bootstrap.Build(ctx, cfg)
	if err != nil {
		log.Fatalf("Failed to bootstrap application: %v", err)
	}
	defer container.Close()

	// ============================================================================
	// CLEAN ARCHITECTURE - Handler Layer (Presentation / HTTP)
	// ============================================================================

	// Clean architecture handlers
	cleanRiskHandler := httpHandler.NewRiskHandler(
		container.RiskCreateUC, container.RiskCreateBatchUC, container.RiskSpreadsheetUC, container.RiskGetUC, container.RiskExportPDFUC, container.RiskReassessUC, container.RiskArchiveUC, container.RiskRestoreUC, container.RiskUpdateUC, container.RiskDeleteUC, container.RiskListUC, container.RiskListRegisterUC, container.RiskListCycleSnapshotUC, container.RiskListVersionsUC, container.RiskReviewQueueUC, container.RiskCompareCyclesUC, container.RiskCompareCycleDetailsUC, container.RiskReviewSummaryUC,
		container.RiskDashboardSummaryUC, container.RiskActionPressureUC, container.RiskExecutiveAlertsUC, container.RiskHeatmapDataUC, container.RiskHeatmapMultiUC, container.RiskTopRisksUC, container.RiskDashboardCategoriesUC, container.RiskListApprovedUC,
		container.RiskHeatmapVelocityUC, container.RiskOverdueTimelineUC, container.RiskKRIBreachUC, container.RiskUnitResponseUC, container.RiskMonitoringSpreadsheetUC, container.RiskCreateMonitoringBatchUC, container.MMRepository,
	)
	cleanIncidentHandler := httpHandler.NewIncidentHandler(
		container.IncidentCreateUC, container.IncidentCreateBatchUC, container.IncidentGetUC, container.IncidentUpdateUC, container.IncidentDeleteUC, container.IncidentListUC, container.IncidentSummaryUC,
	)
	cleanUserHandler := httpHandler.NewUserHandler(
		container.UserCreateUC, container.UserGetUC, container.UserUpdateUC, container.UserDeleteUC, container.UserListUC, container.UserListFilterUC, container.UserApproveRegistrationUC, container.UserRejectRegistrationUC,
	)
	cleanControlHandler := httpHandler.NewControlHandler(
		container.ControlCreateUC, container.ControlGetUC, container.ControlUpdateUC, container.ControlDeleteUC, container.ControlListUC, container.ControlDashboardUC,
	)
	cleanKRIHandler := httpHandler.NewKRIHandler(
		container.KRICreateUC, container.KRIGetUC, container.KRIUpdateUC, container.KRIArchiveUC, container.KRIListUC, container.KRIDashboardUC,
	)
	approvalHandler := httpHandler.NewApprovalHandler(
		container.ApprovalListUC, container.ApprovalSubmitUC, container.ApprovalActionUC, container.ApprovalGetDetailUC, container.ApprovalGetPendingCountUC, container.ApprovalGetByEntityUC,
	)

	// Auth handlers (Clean Architecture)
	cleanAuthHandler := httpHandler.NewAuthHandler(container.AuthLoginUC, container.AuthRegisterUC, container.AuthMeUC, container.AuthUpdateProfileUC, container.AuthChangePasswordUC)

	// AI handlers (Clean Architecture)
	cleanAIHandler := httpHandler.NewAIHandler(
		container.AIFishboneUC,
		container.AIImpactUC,
		container.AIMitigationUC,
		container.AIMinutesUC,
		container.AITranscriptUC,
		container.AIApplyTranscriptRiskChangeUC,
		container.AIPredictiveUC,
		container.AIRiskSuggestionUC,
		container.AIKIUUC,
		container.AIIncidentBatchUC,
		container.AIIncidentRiskUC,
		container.AIDocumentIntelligenceUC,
	)

	// CBA handler (Clean Architecture)
	cleanCBAHandler := httpHandler.NewCBAHandler(container.CBARecommendUC, container.CBACalculateUC)

	// Organization handlers (Clean Architecture)
	cleanOrgHandler := httpHandler.NewOrganizationHandler(container.OrgCreateUC, container.OrgGetUC, container.OrgUpdateUC, container.OrgDeleteUC, container.OrgListUC, container.OrgListFilterUC)
	cleanRiskCharterHandler := httpHandler.NewRiskCharterHandler(
		container.RiskCharterCreateUC,
		container.RiskCharterGetUC,
		container.RiskCharterUpdateUC,
		container.RiskCharterListUC,
	)
	cleanTMPMRHandler := httpHandler.NewTMPMRHandler(
		container.TMPMRCreateUC,
		container.TMPMRGetUC,
		container.TMPMRListUC,
		container.TMPMRUpdateUC,
		container.TMPMRSubmitUC,
		container.TMPMRReviewUC,
		container.TMPMRApproveUC,
	)
	cleanRiskCascadeHandler := httpHandler.NewRiskCascadeHandler(
		container.RiskCascadeCreateMandatoryUC,
		container.RiskCascadeCreateBottomUpUC,
		container.RiskCascadeDecideUC,
		container.RiskCascadeDeleteUC,
		container.RiskCascadeListUC,
	)
	cleanPlanningHierarchyHandler := httpHandler.NewPlanningHierarchyHandler(
		container.PlanningROOptionsUC,
		container.PlanningObjectiveCompatUC,
	)
	cleanFormalReportHandler := httpHandler.NewFormalReportHandler(
		container.FormalReportGenerateUC,
		container.FormalReportGetUC,
		container.FormalReportListUC,
		container.FormalReportDownloadUC,
	)

	// Likelihood Assessment handler (Clean Architecture)
	cleanLikelihoodAssessmentHandler := httpHandler.NewLikelihoodAssessmentHandler(
		container.LikelihoodAssessmentUpsertUC,
		container.LikelihoodAssessmentGetUC,
	)

	// Impact Criteria handler (Clean Architecture)
	impactCriteriaHandler := httpHandler.NewImpactCriteriaHandler(
		container.ImpactCriteriaListUC,
	)

	// System handlers (Clean Architecture)
	cleanSystemHandler := httpHandler.NewSystemHandler(container.SystemSlowQueriesUC)

	// System Setting handlers
	cleanSystemSettingHandler := httpHandler.NewSystemSettingHandler(
		container.SystemSettingGetUC, container.SystemSettingUpsertUC, container.SystemSettingDeleteUC,
	)

	// Mitigation Task handler
	cleanMitigationTaskHandler := httpHandler.NewMitigationTaskHandler(
		container.MTListUC, container.MTSubmitUC, container.MTGenerateUC, container.MTOverdueUC,
	)

	// KRI Report handler
	cleanKRIReportHandler := httpHandler.NewKRIReportHandler(
		container.KRIReportListUC, container.KRIReportSubmitUC, container.KRIReportAcceptUC, container.KRIReportRevisionUC, container.KRIReportSkipUC, container.KRIReportGenerateUC, container.KRIReportOverdueUC,
	)

	// Communication Log handler
	cleanCommLogHandler := httpHandler.NewCommunicationLogHandler(
		container.CommLogCreateUC, container.CommLogListUC, container.CommLogDeleteUC,
	)

	// Meeting Minute handler
	cleanMMHandler := httpHandler.NewMeetingMinuteHandler(
		container.MMCreateUC, container.MMGetUC, container.MMListUC, container.MMDeleteUC, container.MMLinkUseCase,
	)

	// Report handler
	cleanReportHandler := httpHandler.NewReportHandler(container.GenerateReportUC, container.PDFReportRenderer)

	cleanFormHandler := httpHandler.NewFormHandler(
		container.FormCreateUC, container.FormGetUC, container.FormListUC, container.FormUpdateUC, container.FormDeleteUC,
		container.FormPublishUC, container.FormCloseUC, container.FormSubmitUC, container.FormListResponsesUC, container.FormAnalyticsUC,
	)

	// External PIC handler
	cleanExternalPICHandler := httpHandler.NewExternalPICHandler(
		container.ExternalPICGetOrCreateUC, container.ExternalPICListUC, container.ExternalPICDeleteUC,
	)

	wpHandler := httpHandler.NewWorkingPaperHandler(container.WPUseCase, container.WPRepository)

	// Fiber app
	app := fiber.New(fiber.Config{
		AppName:   "MANRIS v2 API",
		BodyLimit: 10 * 1024 * 1024, // 10MB
	})

	// Global middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "${time} | ${status} | ${latency} | ${method} ${path}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, X-Correlation-ID",
		AllowMethods:     "GET, POST, PUT, DELETE, PATCH, OPTIONS",
		AllowCredentials: true,
	}))

	// Inject Correlation ID
	app.Use(middleware.CorrelationID())

	// Health check
	app.Get("/api/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "manris-v2"})
	})

	// API routes
	api := app.Group("/api/v1")

	// Auth (public)
	api.Post("/auth/login", cleanAuthHandler.Login)
	api.Post("/auth/register", cleanAuthHandler.Register)
	api.Get("/auth/register/organizations", cleanOrgHandler.List)

	authProtected := api.Group("/auth", middleware.AuthRequired(cfg.JWTSecret))
	authProtected.Get("/me", cleanAuthHandler.Me)
	authProtected.Put("/me", middleware.RequireFullSession(), cleanAuthHandler.UpdateProfile)
	authProtected.Post("/change-password", cleanAuthHandler.ChangePassword)

	protected := api.Group("", middleware.AuthRequired(cfg.JWTSecret), middleware.RequireFullSession(), middleware.ResolveOrgScope(container.OrgHierarchySvc))

	// Postgres Pro diagnostics endpoint (Clean Architecture)
	protected.Get("/system/slow-queries", cleanSystemHandler.GetSlowQueries)

	// System Settings (Super Admin only)
	protected.Get("/system-settings", middleware.RoleGuard("superadmin"), cleanSystemSettingHandler.List)
	protected.Get("/system-settings/ai-models", middleware.RoleGuard("superadmin"), cleanSystemSettingHandler.GetAIModels)
	protected.Get("/system-settings/:key", middleware.RoleGuard("superadmin"), cleanSystemSettingHandler.Get)
	protected.Put("/system-settings/:key", middleware.RoleGuard("superadmin"), cleanSystemSettingHandler.Upsert)
	protected.Put("/system-settings/ai-models", middleware.RoleGuard("superadmin"), cleanSystemSettingHandler.UpdateAIModels)
	protected.Delete("/system-settings/:key", middleware.RoleGuard("superadmin"), cleanSystemSettingHandler.Delete)

	// Organizations (Clean Architecture)
	protected.Get("/organizations", cleanOrgHandler.List)
	protected.Post("/organizations", cleanOrgHandler.Create)
	protected.Get("/organizations/:id", cleanOrgHandler.Get)
	protected.Put("/organizations/:id", cleanOrgHandler.Update)
	protected.Delete("/organizations/:id", cleanOrgHandler.Delete)

	// Risk Charters (Clean Architecture)
	protected.Get("/risk-charters", cleanRiskCharterHandler.List)
	protected.Post("/risk-charters", cleanRiskCharterHandler.Create)
	protected.Get("/risk-charters/:id", cleanRiskCharterHandler.Get)
	protected.Put("/risk-charters/:id", cleanRiskCharterHandler.Update)

	// TMPMR (Clean Architecture)
	protected.Get("/tmpmr", cleanTMPMRHandler.List)
	protected.Post("/tmpmr", cleanTMPMRHandler.Create)
	protected.Get("/tmpmr/:id", cleanTMPMRHandler.Get)
	protected.Put("/tmpmr/:id", cleanTMPMRHandler.Update)
	protected.Post("/tmpmr/:id/submit", cleanTMPMRHandler.Submit)
	protected.Post("/tmpmr/:id/review", cleanTMPMRHandler.Review)
	protected.Post("/tmpmr/:id/approve", cleanTMPMRHandler.Approve)

	// Risk Cascades (Clean Architecture)
	protected.Get("/risk-cascades", cleanRiskCascadeHandler.List)
	protected.Post("/risk-cascades/mandatory", cleanRiskCascadeHandler.CreateMandatory)
	protected.Post("/risk-cascades/bottom-up", cleanRiskCascadeHandler.CreateBottomUp)
	protected.Post("/risk-cascades/:id/decision", cleanRiskCascadeHandler.Decide)
	protected.Delete("/risk-cascades/:id", cleanRiskCascadeHandler.Delete)
	protected.Get("/planning/ros", cleanPlanningHierarchyHandler.ListROOptions)
	protected.Get("/planning/objectives", cleanPlanningHierarchyHandler.ListObjectiveCompatibility)

	protected.Post("/formal-reports/generate", cleanFormalReportHandler.Generate)
	protected.Get("/formal-reports", cleanFormalReportHandler.List)
	protected.Get("/formal-reports/:id/download", cleanFormalReportHandler.Download)
	protected.Get("/formal-reports/:id", cleanFormalReportHandler.Get)

	// Likelihood Assessment routes
	protected.Post("/likelihood-assessments", cleanLikelihoodAssessmentHandler.Upsert)
	protected.Get("/likelihood-assessments/:riskId", cleanLikelihoodAssessmentHandler.GetByRiskID)

	// Impact Criteria routes
	protected.Get("/impact-criteria", impactCriteriaHandler.List)

	// Users — read endpoints open to all authenticated users
	protected.Get("/users", cleanUserHandler.ListUsers)
	protected.Get("/users/:id", cleanUserHandler.GetUser)
	// Users — write endpoints restricted to superadmin
	usersAdmin := protected.Group("/users", middleware.RoleGuard("superadmin"))
	usersAdmin.Post("/", cleanUserHandler.CreateUser)
	usersAdmin.Post("/:id/approve-registration", cleanUserHandler.ApproveRegistration)
	usersAdmin.Delete("/:id/reject-registration", cleanUserHandler.RejectRegistration)
	usersAdmin.Put("/:id", cleanUserHandler.UpdateUser)
	usersAdmin.Delete("/:id", cleanUserHandler.DeleteUser)

	// Risks (Clean Architecture)
	protected.Get("/risks", cleanRiskHandler.ListRisks)
	protected.Get("/risks/register", cleanRiskHandler.ListRiskRegister)
	protected.Get("/risks/cycle-snapshot", cleanRiskHandler.ListCycleSnapshot)
	protected.Get("/risks/review-queue", cleanRiskHandler.ListReviewQueue)
	protected.Get("/risks/compare", cleanRiskHandler.CompareCycles)
	protected.Get("/risks/compare/detail", cleanRiskHandler.CompareCyclesDetail)
	protected.Post("/risks", cleanRiskHandler.CreateRisk)
	protected.Get("/risks/batch/template", cleanRiskHandler.DownloadBulkRiskTemplate)
	protected.Post("/risks/batch/preview", cleanRiskHandler.PreviewRiskBatchUpload)
	protected.Post("/risks/batch", cleanRiskHandler.CreateRiskBatch)
	protected.Get("/risks/batch/monitoring/template", cleanRiskHandler.DownloadMonitoringTemplate)
	protected.Post("/risks/batch/monitoring/preview", cleanRiskHandler.PreviewMonitoringBatchUpload)
	protected.Post("/risks/batch/monitoring", cleanRiskHandler.CreateMonitoringBatch)
	protected.Get("/risks/trend", cleanRiskHandler.ListApprovedRisks)
	protected.Get("/risks/:id", cleanRiskHandler.GetRisk)
	protected.Get("/risks/:id/export-pdf", cleanRiskHandler.ExportRiskPDF)
	protected.Get("/risks/:id/versions", cleanRiskHandler.ListVersions)
	protected.Post("/risks/:id/reassess", cleanRiskHandler.CreateReassessment)
	protected.Post("/risks/:id/archive", cleanRiskHandler.ArchiveRisk)
	protected.Post("/risks/:id/restore", cleanRiskHandler.RestoreRisk)
	protected.Put("/risks/:id", cleanRiskHandler.UpdateRisk)
	protected.Delete("/risks/:id", cleanRiskHandler.DeleteRisk)

	// Risk Dashboard (Clean Architecture)
	protected.Get("/dashboard/summary", cleanRiskHandler.DashboardSummary)
	protected.Get("/dashboard/action-pressure", cleanRiskHandler.ActionPressure)
	protected.Get("/dashboard/executive-alerts", cleanRiskHandler.ExecutiveAlerts)
	protected.Get("/dashboard/risk-review-summary", cleanRiskHandler.ReviewSummary)
	protected.Get("/dashboard/heatmap", cleanRiskHandler.HeatmapData)
	protected.Get("/dashboard/heatmap-multi", cleanRiskHandler.HeatmapMulti)
	protected.Get("/dashboard/top-risks", cleanRiskHandler.TopRisks)
	protected.Get("/dashboard/risk-categories", cleanRiskHandler.GetDashboardRiskCategories)
	protected.Get("/dashboard/heatmap-velocity", cleanRiskHandler.GetHeatmapVelocity)
	protected.Get("/dashboard/overdue-mitigation-timeline", cleanRiskHandler.GetOverdueMitigationsTimeline)
	protected.Get("/dashboard/kri-breach-summary", cleanRiskHandler.GetKRIBreachSummary)
	protected.Get("/dashboard/unit-response-time", cleanRiskHandler.GetUnitResponseTime)

	// Reports (Clean Architecture)
	protected.Get("/reports/risk-pdf", cleanReportHandler.GenerateRiskPDF)

	// Incidents (Clean Architecture)
	protected.Get("/incidents", cleanIncidentHandler.ListIncidents)
	protected.Get("/incidents/summary", cleanIncidentHandler.GetSummary)
	protected.Post("/incidents", cleanIncidentHandler.CreateIncident)
	protected.Post("/incidents/batch", cleanIncidentHandler.CreateIncidentBatch)
	protected.Get("/incidents/:id", cleanIncidentHandler.GetIncident)
	protected.Put("/incidents/:id", cleanIncidentHandler.UpdateIncident)
	protected.Delete("/incidents/:id", cleanIncidentHandler.DeleteIncident)

	// KRIs (Clean Architecture)
	protected.Get("/kris", cleanKRIHandler.ListKRIs)
	protected.Get("/kris/dashboard", cleanKRIHandler.KRIDashboard)
	protected.Post("/kris", cleanKRIHandler.CreateKRI)
	protected.Get("/kris/:id", cleanKRIHandler.GetKRI)
	protected.Put("/kris/:id", cleanKRIHandler.UpdateKRI)
	protected.Post("/kris/:id/archive", cleanKRIHandler.ArchiveKRI)

	// Controls (Clean Architecture)
	protected.Get("/controls", cleanControlHandler.ListControls)
	protected.Get("/controls/dashboard", cleanControlHandler.ControlDashboard)
	protected.Post("/controls", cleanControlHandler.CreateControl)
	protected.Get("/controls/:id", cleanControlHandler.GetControl)
	protected.Put("/controls/:id", cleanControlHandler.UpdateControl)
	protected.Delete("/controls/:id", cleanControlHandler.DeleteControl)

	// External PICs (Clean Architecture)
	protected.Get("/external-pics", cleanExternalPICHandler.List)
	protected.Post("/external-pics", cleanExternalPICHandler.Create)
	protected.Delete("/external-pics/:id", cleanExternalPICHandler.Delete)

	// AI Generator (Clean Architecture - 100%)
	protected.Post("/ai/causes", cleanAIHandler.GenerateCause)
	protected.Post("/ai/impacts", cleanAIHandler.GenerateImpact)
	protected.Post("/ai/mitigations", cleanAIHandler.GenerateMitigation)
	protected.Post("/ai/minutes", cleanAIHandler.GenerateMinutes)
	protected.Post("/ai/transcripts", cleanAIHandler.GenerateTranscript)
	protected.Post("/ai/transcripts/apply-risk-change", cleanAIHandler.ApplyTranscriptRiskChange)
	protected.Post("/ai/predictive-analyses", cleanAIHandler.GeneratePredictive)
	protected.Post("/ai/risk-suggestions", cleanAIHandler.GenerateRiskSuggestion)
	protected.Post("/ai/kris", cleanAIHandler.GenerateKRI)
	protected.Post("/ai/incidents/suggest-risks", cleanAIHandler.GenerateManualIncidentRiskSuggestions)
	protected.Post("/ai/incidents/extract-batch", cleanAIHandler.GenerateIncidentBatch)
	protected.Post("/ai/document-intelligence/analyze", cleanAIHandler.AnalyzeDocumentIntelligence)

	// CBA Advocacy (Clean Architecture)
	protected.Post("/cba/recommend", cleanCBAHandler.RecommendVariables)
	protected.Post("/cba/calculate", cleanCBAHandler.Calculate)

	// Approval Workflow (New Clean Architecture)
	protected.Get("/approvals", approvalHandler.List)
	protected.Get("/approvals/pending-count", approvalHandler.GetPendingCount)
	protected.Get("/approvals/by-entity", approvalHandler.GetByEntity)
	protected.Get("/approvals/:id", approvalHandler.GetDetail)
	protected.Post("/approvals/submit", approvalHandler.Submit)
	protected.Post("/approvals/:id/action", approvalHandler.Action)

	// Mitigation Tasks (Plan-to-Tasks)
	protected.Get("/risks/:riskId/tasks", cleanMitigationTaskHandler.ListByRisk)
	protected.Get("/mitigation-tasks/all", cleanMitigationTaskHandler.ListAll)
	protected.Get("/mitigation-tasks/my", cleanMitigationTaskHandler.ListMyTasks)
	protected.Post("/mitigation-tasks/:id/submit", cleanMitigationTaskHandler.SubmitProgress)
	protected.Post("/mitigation-tasks/generate", cleanMitigationTaskHandler.TriggerGenerate)

	// KRI Reports (Periodic Reporting)
	protected.Get("/kris/:kriId/reports", cleanKRIReportHandler.ListByKRI)
	protected.Get("/kri-reports/my", cleanKRIReportHandler.ListMyReports)
	protected.Get("/kri-reports/review-queue", cleanKRIReportHandler.ListReviewQueue)
	protected.Post("/kri-reports/:id/submit", cleanKRIReportHandler.SubmitReport)
	protected.Post("/kri-reports/:id/skip", cleanKRIReportHandler.SkipReport)
	protected.Post("/kri-reports/:id/accept", cleanKRIReportHandler.AcceptReport)
	protected.Post("/kri-reports/:id/request-revision", cleanKRIReportHandler.RequestRevision)
	protected.Post("/kri-reports/generate", cleanKRIReportHandler.TriggerGenerate)

	// Communication Logs
	protected.Get("/risks/:riskId/communication-logs", cleanCommLogHandler.List)
	protected.Post("/risks/:riskId/communication-logs", cleanCommLogHandler.Create)
	protected.Delete("/communication-logs/:id", cleanCommLogHandler.Delete)

	// Meeting Minutes
	protected.Post("/meeting-minutes", cleanMMHandler.Create)
	protected.Get("/meeting-minutes/:id", cleanMMHandler.Get)
	protected.Get("/meeting-minutes", cleanMMHandler.List)
	protected.Delete("/meeting-minutes/:id", cleanMMHandler.Delete)
	protected.Post("/meeting-minutes/:id/risks", cleanMMHandler.LinkRisks)
	protected.Delete("/meeting-minutes/:id/risks", cleanMMHandler.UnlinkRisks)

	// Risk Meeting Minutes
	protected.Get("/risks/:riskId/meeting-minutes", cleanRiskHandler.GetMeetingMinutes)

	// Dynamic Forms
	protected.Get("/forms", cleanFormHandler.ListForms)
	protected.Get("/forms/mine", cleanFormHandler.ListMyForms)
	protected.Post("/forms", cleanFormHandler.CreateForm)
	protected.Get("/forms/:id", cleanFormHandler.GetForm)
	protected.Put("/forms/:id", cleanFormHandler.UpdateForm)
	protected.Delete("/forms/:id", cleanFormHandler.DeleteForm)
	protected.Post("/forms/:id/publish", cleanFormHandler.PublishForm)
	protected.Post("/forms/:id/close", cleanFormHandler.CloseForm)
	protected.Post("/forms/:id/responses", cleanFormHandler.SubmitResponse)
	protected.Get("/forms/:id/responses", cleanFormHandler.ListResponses)
	protected.Get("/forms/:id/analytics", cleanFormHandler.Analytics)

	// Working Papers — static routes MUST come before /:id
	protected.Get("/working-papers", wpHandler.List)
	protected.Get("/working-papers/pending-count", wpHandler.GetPendingSigningCount)
	protected.Get("/working-papers/pending-signing", wpHandler.ListPendingSigning)
	protected.Post("/working-papers", wpHandler.Create)
	protected.Get("/working-papers/:id", wpHandler.Get)
	protected.Delete("/working-papers/:id", wpHandler.Delete)
	protected.Post("/working-papers/:id/sign", wpHandler.Sign)
	protected.Post("/working-papers/:id/cancel", wpHandler.Cancel)

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		addr := fmt.Sprintf(":%s", cfg.Port)
		log.Printf("🚀 MANRIS v2 API starting on %s", addr)
		if err := app.Listen(addr); err != nil {
			log.Fatalf("Server error: %v", err)
		}
	}()

	<-quit
	log.Println("🛑 Shutting down server...")
	_ = app.Shutdown()
}
