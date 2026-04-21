// Package main is the entry point for the MANRIS v2 backend server.
package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"github.com/manris/backend/internal/config"
	"github.com/manris/backend/internal/database"
	domainsvc "github.com/manris/backend/internal/domain/service"
	httpHandler "github.com/manris/backend/internal/handler/http"
	"github.com/manris/backend/internal/middleware"
	openairepo "github.com/manris/backend/internal/repository/openai"
	postgresrepo "github.com/manris/backend/internal/repository/postgres"
	reportpdf "github.com/manris/backend/internal/service/pdfreport"
	aiuc "github.com/manris/backend/internal/usecase/ai"
	approvaluc "github.com/manris/backend/internal/usecase/approval"
	authuc "github.com/manris/backend/internal/usecase/auth"
	cbauc "github.com/manris/backend/internal/usecase/cba"
	commloguc "github.com/manris/backend/internal/usecase/communication_log"
	controluc "github.com/manris/backend/internal/usecase/control"
	externalextPICuc "github.com/manris/backend/internal/usecase/external_pic"
	formusecase "github.com/manris/backend/internal/usecase/form"
	incidentuc "github.com/manris/backend/internal/usecase/incident"
	kriuc "github.com/manris/backend/internal/usecase/kri"
	krireportuc "github.com/manris/backend/internal/usecase/kri_report"
	mmuc "github.com/manris/backend/internal/usecase/meeting_minute"
	mtuc "github.com/manris/backend/internal/usecase/mitigation_task"
	organizationuc "github.com/manris/backend/internal/usecase/organization"
	reportuc "github.com/manris/backend/internal/usecase/report"
	riskuc "github.com/manris/backend/internal/usecase/risk"
	systemuc "github.com/manris/backend/internal/usecase/system"
	systemsettinguc "github.com/manris/backend/internal/usecase/system_setting"
	useruc "github.com/manris/backend/internal/usecase/user"
	workingpaperusecase "github.com/manris/backend/internal/usecase/workingpaper"
)

func main() {
	cfg := config.Load()

	// Connect to database
	pool, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	// ============================================================================
	// CLEAN ARCHITECTURE - Repository Layer (Domain Layer Interfaces)
	// ============================================================================

	// Domain repositories
	domainUserRepo := postgresrepo.NewUserRepository(pool)
	domainOrgRepo := postgresrepo.NewOrganizationRepository(pool)
	domainRiskRepo := postgresrepo.NewRiskRepository(pool)
	domainIncidentRepo := postgresrepo.NewIncidentRepository(pool)
	domainKRiRepo := postgresrepo.NewKRIRepository(pool)
	domainControlRepo := postgresrepo.NewControlRepository(pool)
	domainApprovalRepo := postgresrepo.NewApprovalRepository(pool)
	domainSystemRepo := postgresrepo.NewSystemRepository(pool)
	domainSystemSettingRepo := postgresrepo.NewSystemSettingRepository(pool)
	domainMitigationTaskRepo := postgresrepo.NewMitigationTaskRepository(pool)
	domainKRIReportRepo := postgresrepo.NewKRIReportRepository(pool)
	domainCommLogRepo := postgresrepo.NewCommunicationLogRepository(pool)
	domainMMRepo := postgresrepo.NewMeetingMinuteRepository(pool)
	domainFormRepo := postgresrepo.NewFormRepository(pool)
	domainFormAssignmentRepo := postgresrepo.NewFormAssignmentRepository(pool)
	domainFormResponseRepo := postgresrepo.NewFormResponseRepository(pool)
	domainExternalPICRepo := postgresrepo.NewExternalPICRepository(pool)
	domainWPRepo := postgresrepo.NewWorkingPaperRepository(pool)

	// Domain services
	orgHierarchySvc := domainsvc.NewOrganizationHierarchy(domainOrgRepo)

	// System settings services with shared cache
	systemSettingGetUC := systemsettinguc.NewGetSettingService(domainSystemSettingRepo)
	systemSettingCache := systemsettinguc.GetSharedCache(systemSettingGetUC)
	systemSettingUpsertUC := systemsettinguc.NewUpsertSettingService(domainSystemSettingRepo, systemSettingCache)
	systemSettingDeleteUC := systemsettinguc.NewDeleteSettingService(domainSystemSettingRepo, systemSettingCache)

	// AI model provider (uses settings from database with in-memory cache)
	modelProvider := openairepo.NewModelProviderAdapter(systemSettingGetUC)

	// AI repository (OpenAI)
	domainAIRepo := openairepo.NewAIRepository(cfg.OpenAIKey, domainRiskRepo, modelProvider)

	// CBA repository (OpenAI-backed)
	domainCBARepo := openairepo.NewCBARepository(domainAIRepo)

	// ============================================================================
	// CLEAN ARCHITECTURE - UseCase Layer (Business Logic)
	// ============================================================================

	// Risk usecases
	riskCreateUC := riskuc.NewCreateRiskUseCase(domainRiskRepo, domainUserRepo, domainOrgRepo)
	riskCreateBatchUC := riskuc.NewCreateRiskBatchUseCase(riskCreateUC)
	riskSpreadsheetUC := riskuc.NewBulkRiskSpreadsheetUseCase(domainOrgRepo, domainUserRepo)
	riskGetUC := riskuc.NewGetRiskUseCase(domainRiskRepo)
	riskReassessUC := riskuc.NewCreateRiskReassessmentUseCase(domainRiskRepo)
	riskUpdateUC := riskuc.NewUpdateRiskUseCase(domainRiskRepo, domainUserRepo, domainOrgRepo, domainWPRepo)
	riskDeleteUC := riskuc.NewDeleteRiskUseCase(domainRiskRepo)
	riskListUC := riskuc.NewListRisksUseCase(domainRiskRepo, orgHierarchySvc)
	riskListRegisterUC := riskuc.NewListRiskRegisterUseCase(domainRiskRepo)
	riskListVersionsUC := riskuc.NewListRiskVersionsUseCase(domainRiskRepo)
	riskReviewQueueUC := riskuc.NewListRiskReviewQueueUseCase(domainRiskRepo, orgHierarchySvc)
	riskCompareCyclesUC := riskuc.NewCompareRiskCyclesUseCase(domainRiskRepo, orgHierarchySvc)
	riskCompareCycleDetailsUC := riskuc.NewCompareRiskCycleDetailsUseCase(domainRiskRepo, orgHierarchySvc)
	riskReviewSummaryUC := riskuc.NewRiskReviewSummaryUseCase(domainRiskRepo, orgHierarchySvc)
	riskDashboardSummaryUC := riskuc.NewDashboardSummaryUseCase(domainRiskRepo)
	riskActionPressureUC := riskuc.NewDashboardActionPressureUseCase(domainIncidentRepo, domainMitigationTaskRepo)
	riskExecutiveAlertsUC := riskuc.NewExecutiveAlertsUseCase(domainRiskRepo, domainMitigationTaskRepo)
	riskHeatmapDataUC := riskuc.NewHeatmapDataUseCase(domainRiskRepo)
	riskHeatmapMultiUC := riskuc.NewHeatmapMultiUseCase(domainRiskRepo)
	riskTopRisksUC := riskuc.NewTopRisksUseCase(domainRiskRepo)
	riskDashboardCategoriesUC := riskuc.NewDashboardRiskCategoriesUseCase(domainRiskRepo)
	riskListApprovedUC := riskuc.NewListApprovedRisksUseCase(domainRiskRepo, orgHierarchySvc)
	riskHeatmapVelocityUC := riskuc.NewHeatmapVelocityUseCase(domainRiskRepo)
	riskOverdueTimelineUC := riskuc.NewOverdueMitigationTimelineUseCase(domainRiskRepo)
	riskKRIBreachUC := riskuc.NewKRIBreachSummaryUseCase(domainRiskRepo)
	riskUnitResponseUC := riskuc.NewUnitResponseTimeUseCase(domainRiskRepo)

	// Incident usecases
	incidentCreateUC := incidentuc.NewCreateIncidentUseCase(domainIncidentRepo, domainUserRepo, domainOrgRepo, domainRiskRepo)
	incidentCreateBatchUC := incidentuc.NewCreateIncidentBatchUseCase(incidentCreateUC)
	incidentGetUC := incidentuc.NewGetIncidentUseCase(domainIncidentRepo)
	incidentUpdateUC := incidentuc.NewUpdateIncidentUseCase(domainIncidentRepo, domainRiskRepo)
	incidentDeleteUC := incidentuc.NewDeleteIncidentUseCase(domainIncidentRepo)
	incidentListUC := incidentuc.NewListIncidentsUseCase(domainIncidentRepo, orgHierarchySvc)
	incidentSummaryUC := incidentuc.NewGetIncidentSummaryUseCase(domainIncidentRepo)

	// User usecases
	userCreateUC := useruc.NewCreateUserUseCase(domainUserRepo, domainOrgRepo)
	userGetUC := useruc.NewGetUserUseCase(domainUserRepo)
	userUpdateUC := useruc.NewUpdateUserUseCase(domainUserRepo, domainOrgRepo)
	userDeleteUC := useruc.NewDeleteUserUseCase(domainUserRepo)
	userListUC := useruc.NewListUsersUseCase(domainUserRepo)
	userListFilterUC := useruc.NewListUsersWithFilterUseCase(domainUserRepo)

	// Control usecases
	controlCreateUC := controluc.NewCreateControlUseCase(domainControlRepo, domainRiskRepo, domainOrgRepo)
	controlGetUC := controluc.NewGetControlUseCase(domainControlRepo)
	controlUpdateUC := controluc.NewUpdateControlUseCase(domainControlRepo, domainRiskRepo, domainOrgRepo)
	controlDeleteUC := controluc.NewDeleteControlUseCase(domainControlRepo)
	controlListUC := controluc.NewListControlsUseCase(domainControlRepo, orgHierarchySvc)
	controlDashboardUC := controluc.NewControlDashboardUseCase(domainControlRepo, orgHierarchySvc)

	// KRI usecases
	kriCreateUC := kriuc.NewCreateKRIUseCase(domainKRiRepo, domainRiskRepo, domainOrgRepo)
	kriGetUC := kriuc.NewGetKRIUseCase(domainKRiRepo)
	kriUpdateUC := kriuc.NewUpdateKRIUseCase(domainKRiRepo, domainRiskRepo, domainOrgRepo)
	kriArchiveUC := kriuc.NewArchiveKRIUseCase(domainKRiRepo)
	kriListUC := kriuc.NewListKRIsUseCase(domainKRiRepo, orgHierarchySvc)
	kriDashboardUC := kriuc.NewKRIDashboardUseCase(domainKRiRepo, orgHierarchySvc)

	// Approval usecases
	approvalListUC := approvaluc.NewListApprovalUseCase(domainApprovalRepo)
	approvalSubmitUC := approvaluc.NewSubmitApprovalUseCase(domainApprovalRepo, domainRiskRepo, domainIncidentRepo, domainUserRepo)
	approvalActionUC := approvaluc.NewApprovalActionUseCase(domainApprovalRepo, domainRiskRepo, domainIncidentRepo)
	approvalGetDetailUC := approvaluc.NewGetApprovalDetailUseCase(domainApprovalRepo)
	approvalGetPendingCountUC := approvaluc.NewGetPendingCountUseCase(domainApprovalRepo)
	approvalGetByEntityUC := approvaluc.NewGetApprovalByEntityUseCase(domainApprovalRepo)

	// Auth usecases
	authLoginUC := authuc.NewLoginUseCase(domainUserRepo, orgHierarchySvc, cfg.JWTSecret, cfg.JWTExpiry)
	authMeUC := authuc.NewGetCurrentUserUseCase(domainUserRepo, orgHierarchySvc)
	authUpdateProfileUC := authuc.NewUpdateProfileUseCase(domainUserRepo, orgHierarchySvc)
	authChangePasswordUC := authuc.NewChangePasswordUseCase(domainUserRepo, orgHierarchySvc, cfg.JWTSecret, cfg.JWTExpiry)

	// AI usecases
	aiFishboneUC := aiuc.NewGenerateFishboneUseCase(domainAIRepo, domainOrgRepo)
	aiImpactUC := aiuc.NewGenerateImpactUseCase(domainAIRepo, domainOrgRepo)
	aiMitigationUC := aiuc.NewGenerateMitigationUseCase(domainAIRepo, domainOrgRepo)
	aiMinutesUC := aiuc.NewGenerateMinutesUseCase(domainAIRepo, domainOrgRepo)
	aiTranscriptUC := aiuc.NewAnalyzeTranscriptUseCase(domainAIRepo, domainOrgRepo)
	aiApplyTranscriptRiskChangeUC := aiuc.NewApplyTranscriptRiskChangesUseCase(domainRiskRepo)
	aiPredictiveUC := aiuc.NewGeneratePredictiveUseCase(domainAIRepo, domainOrgRepo)
	aiRiskSuggestionUC := aiuc.NewGenerateRiskSuggestionsUseCase(domainAIRepo, domainOrgRepo)
	aiKRIUC := aiuc.NewGenerateKRIUseCase(domainAIRepo, domainOrgRepo)
	aiIncidentBatchUC := aiuc.NewGenerateIncidentBatchExtractionUseCase(domainAIRepo, domainOrgRepo)
	aiIncidentRiskUC := aiuc.NewGenerateManualIncidentRiskSuggestionsUseCase(domainAIRepo, domainOrgRepo)

	// CBA usecases
	cbaRecommendUC := cbauc.NewRecommendVariablesUseCase(domainCBARepo, domainOrgRepo)
	cbaCalculateUC := cbauc.NewCalculateUseCase()

	// Organization usecases
	orgCreateUC := organizationuc.NewCreateOrganizationUseCase(domainOrgRepo)
	orgGetUC := organizationuc.NewGetOrganizationUseCase(domainOrgRepo)
	orgUpdateUC := organizationuc.NewUpdateOrganizationUseCase(domainOrgRepo)
	orgDeleteUC := organizationuc.NewDeleteOrganizationUseCase(domainOrgRepo)
	orgListUC := organizationuc.NewListOrganizationsUseCase(domainOrgRepo)
	orgListFilterUC := organizationuc.NewListOrganizationsWithFilterUseCase(domainOrgRepo)

	// External PIC usecases
	externalextPICGetOrCreateUC := externalextPICuc.NewGetOrCreateByNameUseCase(domainExternalPICRepo)
	externalextPICListUC := externalextPICuc.NewListExternalPICsUseCase(domainExternalPICRepo)
	externalextPICDeleteUC := externalextPICuc.NewDeleteExternalPICUseCase(domainExternalPICRepo)

	// System usecases
	systemSlowQueriesUC := systemuc.NewGetSlowQueriesUseCase(domainSystemRepo)

	// Mitigation Task usecases
	mtListUC := mtuc.NewListTasksUseCase(domainMitigationTaskRepo, domainRiskRepo)
	mtSubmitUC := mtuc.NewSubmitProgressUseCase(domainMitigationTaskRepo, domainRiskRepo)
	mtGenerateUC := mtuc.NewGenerateTasksUseCase(domainMitigationTaskRepo)
	mtOverdueUC := mtuc.NewMarkOverdueUseCase(domainMitigationTaskRepo)

	// KRI Report usecases
	kriReportListUC := krireportuc.NewListReportsUseCase(domainKRIReportRepo, domainKRiRepo)
	kriReportSubmitUC := krireportuc.NewSubmitReportUseCase(domainKRIReportRepo, domainKRiRepo)
	kriReportAcceptUC := krireportuc.NewAcceptReportUseCase(domainKRIReportRepo, domainKRiRepo)
	kriReportRevisionUC := krireportuc.NewRequestRevisionUseCase(domainKRIReportRepo, domainKRiRepo)
	kriReportSkipUC := krireportuc.NewSkipReportUseCase(domainKRIReportRepo, domainKRiRepo)
	kriReportGenerateUC := krireportuc.NewGenerateReportsUseCase(domainKRIReportRepo)
	kriReportOverdueUC := krireportuc.NewMarkOverdueUseCase(domainKRIReportRepo)

	// Communication Log usecases
	commLogCreateUC := commloguc.NewCreateCommunicationLogUseCase(domainCommLogRepo, domainRiskRepo, domainUserRepo)
	commLogListUC := commloguc.NewListCommunicationLogsUseCase(domainCommLogRepo, domainRiskRepo)
	commLogDeleteUC := commloguc.NewDeleteCommunicationLogUseCase(domainCommLogRepo, domainRiskRepo)

	// Meeting Minute usecases
	mmCreateUC := mmuc.NewCreateMeetingMinuteUseCase(domainMMRepo, domainUserRepo)
	mmGetUC := mmuc.NewGetMeetingMinuteUseCase(domainMMRepo)
	mmListUC := mmuc.NewListMeetingMinutesUseCase(domainMMRepo)
	mmDeleteUC := mmuc.NewDeleteMeetingMinuteUseCase(domainMMRepo)
	mmLinkUC := mmuc.NewLinkRisksUseCase(domainMMRepo)
	riskListCycleSnapshotUC := riskuc.NewListRiskCycleSnapshotUseCase(domainRiskRepo, orgHierarchySvc)

	formCreateUC := formusecase.NewCreateFormUseCase(domainFormRepo, domainFormAssignmentRepo)
	formGetUC := formusecase.NewGetFormUseCase(domainFormRepo, domainFormAssignmentRepo)
	formListUC := formusecase.NewListFormsUseCase(domainFormRepo, domainFormAssignmentRepo)
	formUpdateUC := formusecase.NewUpdateFormUseCase(domainFormRepo, domainFormAssignmentRepo)
	formDeleteUC := formusecase.NewDeleteFormUseCase(domainFormRepo)
	formPublishUC := formusecase.NewPublishFormUseCase(domainFormRepo, domainFormAssignmentRepo)
	formCloseUC := formusecase.NewCloseFormUseCase(domainFormRepo)
	formSubmitUC := formusecase.NewSubmitResponseUseCase(domainFormRepo, domainFormResponseRepo, domainFormAssignmentRepo)
	formListResponsesUC := formusecase.NewListResponsesUseCase(domainFormRepo, domainFormResponseRepo)
	formAnalyticsUC := formusecase.NewFormAnalyticsUseCase(domainFormRepo, domainFormResponseRepo)

	// Working Paper usecases
	wpUseCase := workingpaperusecase.NewWorkingPaperUseCase(domainWPRepo, domainRiskRepo)

	// Report usecases
	generateReportUC := reportuc.NewGenerateReportUseCase(domainRiskRepo, domainIncidentRepo, domainKRiRepo)
	pdfReportRenderer := reportpdf.NewPDFReportRenderer()

	// ============================================================================
	// CLEAN ARCHITECTURE - Handler Layer (Presentation / HTTP)
	// ============================================================================

	// Clean architecture handlers
	cleanRiskHandler := httpHandler.NewRiskHandler(
		riskCreateUC, riskCreateBatchUC, riskSpreadsheetUC, riskGetUC, riskReassessUC, riskUpdateUC, riskDeleteUC, riskListUC, riskListRegisterUC, riskListCycleSnapshotUC, riskListVersionsUC, riskReviewQueueUC, riskCompareCyclesUC, riskCompareCycleDetailsUC, riskReviewSummaryUC,
		riskDashboardSummaryUC, riskActionPressureUC, riskExecutiveAlertsUC, riskHeatmapDataUC, riskHeatmapMultiUC, riskTopRisksUC, riskDashboardCategoriesUC, riskListApprovedUC,
		riskHeatmapVelocityUC, riskOverdueTimelineUC, riskKRIBreachUC, riskUnitResponseUC, domainMMRepo,
	)
	cleanIncidentHandler := httpHandler.NewIncidentHandler(
		incidentCreateUC, incidentCreateBatchUC, incidentGetUC, incidentUpdateUC, incidentDeleteUC, incidentListUC, incidentSummaryUC,
	)
	cleanUserHandler := httpHandler.NewUserHandler(
		userCreateUC, userGetUC, userUpdateUC, userDeleteUC, userListUC, userListFilterUC,
	)
	cleanControlHandler := httpHandler.NewControlHandler(
		controlCreateUC, controlGetUC, controlUpdateUC, controlDeleteUC, controlListUC, controlDashboardUC,
	)
	cleanKRIHandler := httpHandler.NewKRIHandler(
		kriCreateUC, kriGetUC, kriUpdateUC, kriArchiveUC, kriListUC, kriDashboardUC,
	)
	approvalHandler := httpHandler.NewApprovalHandler(
		approvalListUC, approvalSubmitUC, approvalActionUC, approvalGetDetailUC, approvalGetPendingCountUC, approvalGetByEntityUC,
	)

	// Auth handlers (Clean Architecture)
	cleanAuthHandler := httpHandler.NewAuthHandler(authLoginUC, authMeUC, authUpdateProfileUC, authChangePasswordUC)

	// AI handlers (Clean Architecture)
	cleanAIHandler := httpHandler.NewAIHandler(
		aiFishboneUC,
		aiImpactUC,
		aiMitigationUC,
		aiMinutesUC,
		aiTranscriptUC,
		aiApplyTranscriptRiskChangeUC,
		aiPredictiveUC,
		aiRiskSuggestionUC,
		aiKRIUC,
		aiIncidentBatchUC,
		aiIncidentRiskUC,
	)

	// CBA handler (Clean Architecture)
	cleanCBAHandler := httpHandler.NewCBAHandler(cbaRecommendUC, cbaCalculateUC)

	// Organization handlers (Clean Architecture)
	cleanOrgHandler := httpHandler.NewOrganizationHandler(orgCreateUC, orgGetUC, orgUpdateUC, orgDeleteUC, orgListUC, orgListFilterUC)

	// System handlers (Clean Architecture)
	cleanSystemHandler := httpHandler.NewSystemHandler(systemSlowQueriesUC)

	// System Setting handlers
	cleanSystemSettingHandler := httpHandler.NewSystemSettingHandler(
		systemSettingGetUC, systemSettingUpsertUC, systemSettingDeleteUC,
	)

	// Mitigation Task handler
	cleanMitigationTaskHandler := httpHandler.NewMitigationTaskHandler(
		mtListUC, mtSubmitUC, mtGenerateUC, mtOverdueUC,
	)

	// KRI Report handler
	cleanKRIReportHandler := httpHandler.NewKRIReportHandler(
		kriReportListUC, kriReportSubmitUC, kriReportAcceptUC, kriReportRevisionUC, kriReportSkipUC, kriReportGenerateUC, kriReportOverdueUC,
	)

	// Communication Log handler
	cleanCommLogHandler := httpHandler.NewCommunicationLogHandler(
		commLogCreateUC, commLogListUC, commLogDeleteUC,
	)

	// Meeting Minute handler
	cleanMMHandler := httpHandler.NewMeetingMinuteHandler(
		mmCreateUC, mmGetUC, mmListUC, mmDeleteUC, mmLinkUC,
	)

	// Report handler
	cleanReportHandler := httpHandler.NewReportHandler(generateReportUC, pdfReportRenderer)

	cleanFormHandler := httpHandler.NewFormHandler(
		formCreateUC, formGetUC, formListUC, formUpdateUC, formDeleteUC,
		formPublishUC, formCloseUC, formSubmitUC, formListResponsesUC, formAnalyticsUC,
	)

	// External PIC handler
	cleanExternalPICHandler := httpHandler.NewExternalPICHandler(
		externalextPICGetOrCreateUC, externalextPICListUC, externalextPICDeleteUC,
	)

	wpHandler := httpHandler.NewWorkingPaperHandler(wpUseCase, domainWPRepo)

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

	authProtected := api.Group("/auth", middleware.AuthRequired(cfg.JWTSecret))
	authProtected.Get("/me", cleanAuthHandler.Me)
	authProtected.Put("/me", middleware.RequireFullSession(), cleanAuthHandler.UpdateProfile)
	authProtected.Post("/change-password", cleanAuthHandler.ChangePassword)

	protected := api.Group("", middleware.AuthRequired(cfg.JWTSecret), middleware.RequireFullSession(), middleware.ResolveOrgScope(orgHierarchySvc))

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

	// Users — read endpoints open to all authenticated users
	protected.Get("/users", cleanUserHandler.ListUsers)
	protected.Get("/users/:id", cleanUserHandler.GetUser)
	// Users — write endpoints restricted to superadmin
	usersAdmin := protected.Group("/users", middleware.RoleGuard("superadmin"))
	usersAdmin.Post("/", cleanUserHandler.CreateUser)
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
	protected.Get("/risks/trend", cleanRiskHandler.ListApprovedRisks)
	protected.Get("/risks/:id", cleanRiskHandler.GetRisk)
	protected.Get("/risks/:id/versions", cleanRiskHandler.ListVersions)
	protected.Post("/risks/:id/reassess", cleanRiskHandler.CreateReassessment)
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
