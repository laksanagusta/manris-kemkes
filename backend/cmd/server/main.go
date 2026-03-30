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
	httpHandler "github.com/manris/backend/internal/handler/http"
	"github.com/manris/backend/internal/middleware"
	openairepo "github.com/manris/backend/internal/repository/openai"
	postgresrepo "github.com/manris/backend/internal/repository/postgres"
	aiuc "github.com/manris/backend/internal/usecase/ai"
	approvaluc "github.com/manris/backend/internal/usecase/approval"
	authuc "github.com/manris/backend/internal/usecase/auth"
	cbauc "github.com/manris/backend/internal/usecase/cba"
	controluc "github.com/manris/backend/internal/usecase/control"
	incidentuc "github.com/manris/backend/internal/usecase/incident"
	kriuc "github.com/manris/backend/internal/usecase/kri"
	krireportuc "github.com/manris/backend/internal/usecase/kri_report"
	lessonuc "github.com/manris/backend/internal/usecase/lesson"
	mtuc "github.com/manris/backend/internal/usecase/mitigation_task"
	organizationuc "github.com/manris/backend/internal/usecase/organization"
	riskuc "github.com/manris/backend/internal/usecase/risk"
	systemuc "github.com/manris/backend/internal/usecase/system"
	useruc "github.com/manris/backend/internal/usecase/user"
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
	domainLessonRepo := postgresrepo.NewLessonRepository(pool)
	domainApprovalRepo := postgresrepo.NewApprovalRepository(pool)
	domainSystemRepo := postgresrepo.NewSystemRepository(pool)
	domainMitigationTaskRepo := postgresrepo.NewMitigationTaskRepository(pool)
	domainKRIReportRepo := postgresrepo.NewKRIReportRepository(pool)

	// AI repository (OpenAI)
	domainAIRepo := openairepo.NewAIRepository(cfg.OpenAIKey, domainRiskRepo)

	// CBA repository (OpenAI-backed)
	domainCBARepo := openairepo.NewCBARepository(domainAIRepo)

	// ============================================================================
	// CLEAN ARCHITECTURE - UseCase Layer (Business Logic)
	// ============================================================================

	// Risk usecases
	riskCreateUC := riskuc.NewCreateRiskUseCase(domainRiskRepo, domainUserRepo, domainOrgRepo)
	riskGetUC := riskuc.NewGetRiskUseCase(domainRiskRepo)
	riskUpdateUC := riskuc.NewUpdateRiskUseCase(domainRiskRepo, domainUserRepo, domainOrgRepo)
	riskDeleteUC := riskuc.NewDeleteRiskUseCase(domainRiskRepo)
	riskListUC := riskuc.NewListRisksUseCase(domainRiskRepo)
	riskDashboardSummaryUC := riskuc.NewDashboardSummaryUseCase(domainRiskRepo)
	riskHeatmapDataUC := riskuc.NewHeatmapDataUseCase(domainRiskRepo)
	riskTopRisksUC := riskuc.NewTopRisksUseCase(domainRiskRepo)

	// Incident usecases
	incidentCreateUC := incidentuc.NewCreateIncidentUseCase(domainIncidentRepo, domainUserRepo, domainOrgRepo, domainRiskRepo)
	incidentGetUC := incidentuc.NewGetIncidentUseCase(domainIncidentRepo)
	incidentUpdateUC := incidentuc.NewUpdateIncidentUseCase(domainIncidentRepo, domainRiskRepo)
	incidentDeleteUC := incidentuc.NewDeleteIncidentUseCase(domainIncidentRepo)
	incidentListUC := incidentuc.NewListIncidentsUseCase(domainIncidentRepo)

	// User usecases
	userCreateUC := useruc.NewCreateUserUseCase(domainUserRepo, domainOrgRepo)
	userGetUC := useruc.NewGetUserUseCase(domainUserRepo)
	userUpdateUC := useruc.NewUpdateUserUseCase(domainUserRepo, domainOrgRepo)
	userDeleteUC := useruc.NewDeleteUserUseCase(domainUserRepo)
	userListUC := useruc.NewListUsersUseCase(domainUserRepo)

	// Control usecases
	controlCreateUC := controluc.NewCreateControlUseCase(domainControlRepo, domainRiskRepo, domainOrgRepo)
	controlGetUC := controluc.NewGetControlUseCase(domainControlRepo)
	controlUpdateUC := controluc.NewUpdateControlUseCase(domainControlRepo, domainRiskRepo, domainOrgRepo)
	controlDeleteUC := controluc.NewDeleteControlUseCase(domainControlRepo)
	controlListUC := controluc.NewListControlsUseCase(domainControlRepo)
	controlDashboardUC := controluc.NewControlDashboardUseCase(domainControlRepo)

	// KRI usecases
	kriCreateUC := kriuc.NewCreateKRIUseCase(domainKRiRepo, domainRiskRepo, domainOrgRepo)
	kriGetUC := kriuc.NewGetKRIUseCase(domainKRiRepo)
	kriUpdateUC := kriuc.NewUpdateKRIUseCase(domainKRiRepo, domainRiskRepo, domainOrgRepo)
	kriDeleteUC := kriuc.NewDeleteKRIUseCase(domainKRiRepo)
	kriListUC := kriuc.NewListKRIsUseCase(domainKRiRepo)
	kriDashboardUC := kriuc.NewKRIDashboardUseCase(domainKRiRepo)

	// Lesson usecases
	lessonCreateUC := lessonuc.NewCreateLessonUseCase(domainLessonRepo, domainUserRepo, domainOrgRepo)
	lessonGetUC := lessonuc.NewGetLessonUseCase(domainLessonRepo)
	lessonUpdateUC := lessonuc.NewUpdateLessonUseCase(domainLessonRepo, domainUserRepo, domainOrgRepo)
	lessonDeleteUC := lessonuc.NewDeleteLessonUseCase(domainLessonRepo)
	lessonListUC := lessonuc.NewListLessonsUseCase(domainLessonRepo)
	lessonDashboardUC := lessonuc.NewLessonDashboardUseCase(domainLessonRepo)

	// Approval usecases
	approvalListUC := approvaluc.NewListApprovalUseCase(domainApprovalRepo)
	approvalSubmitUC := approvaluc.NewSubmitApprovalUseCase(domainApprovalRepo, domainRiskRepo, domainIncidentRepo)
	approvalActionUC := approvaluc.NewApprovalActionUseCase(domainApprovalRepo, domainRiskRepo, domainIncidentRepo)
	approvalGetDetailUC := approvaluc.NewGetApprovalDetailUseCase(domainApprovalRepo)
	approvalGetPendingCountUC := approvaluc.NewGetPendingCountUseCase(domainApprovalRepo)

	// Auth usecases
	authLoginUC := authuc.NewLoginUseCase(domainUserRepo, cfg.JWTSecret, cfg.JWTExpiry)
	authMeUC := authuc.NewGetCurrentUserUseCase(domainUserRepo)

	// AI usecases
	aiFishboneUC := aiuc.NewGenerateFishboneUseCase(domainAIRepo)
	aiImpactUC := aiuc.NewGenerateImpactUseCase(domainAIRepo)
	aiMitigationUC := aiuc.NewGenerateMitigationUseCase(domainAIRepo)
	aiMinutesUC := aiuc.NewGenerateMinutesUseCase(domainAIRepo)
	aiTranscriptUC := aiuc.NewAnalyzeTranscriptUseCase(domainAIRepo)
	aiPredictiveUC := aiuc.NewGeneratePredictiveUseCase(domainAIRepo)
	aiRiskSuggestionUC := aiuc.NewGenerateRiskSuggestionsUseCase(domainAIRepo)
	aiKRIUC := aiuc.NewGenerateKRIUseCase(domainAIRepo)

	// CBA usecases
	cbaRecommendUC := cbauc.NewRecommendVariablesUseCase(domainCBARepo)
	cbaCalculateUC := cbauc.NewCalculateUseCase()

	// Organization usecases
	orgListUC := organizationuc.NewListOrganizationsUseCase(domainOrgRepo)

	// System usecases
	systemSlowQueriesUC := systemuc.NewGetSlowQueriesUseCase(domainSystemRepo)

	// Mitigation Task usecases
	mtListUC := mtuc.NewListTasksUseCase(domainMitigationTaskRepo)
	mtSubmitUC := mtuc.NewSubmitProgressUseCase(domainMitigationTaskRepo)
	mtGenerateUC := mtuc.NewGenerateTasksUseCase(domainMitigationTaskRepo)
	mtOverdueUC := mtuc.NewMarkOverdueUseCase(domainMitigationTaskRepo)

	// KRI Report usecases
	kriReportListUC := krireportuc.NewListReportsUseCase(domainKRIReportRepo)
	kriReportSubmitUC := krireportuc.NewSubmitReportUseCase(domainKRIReportRepo, domainKRiRepo)
	kriReportGenerateUC := krireportuc.NewGenerateReportsUseCase(domainKRIReportRepo)
	kriReportOverdueUC := krireportuc.NewMarkOverdueUseCase(domainKRIReportRepo)

	// ============================================================================
	// CLEAN ARCHITECTURE - Handler Layer (Presentation / HTTP)
	// ============================================================================

	// Clean architecture handlers
	cleanRiskHandler := httpHandler.NewRiskHandler(
		riskCreateUC, riskGetUC, riskUpdateUC, riskDeleteUC, riskListUC,
		riskDashboardSummaryUC, riskHeatmapDataUC, riskTopRisksUC,
	)
	cleanIncidentHandler := httpHandler.NewIncidentHandler(
		incidentCreateUC, incidentGetUC, incidentUpdateUC, incidentDeleteUC, incidentListUC,
	)
	cleanUserHandler := httpHandler.NewUserHandler(
		userCreateUC, userGetUC, userUpdateUC, userDeleteUC, userListUC,
	)
	cleanControlHandler := httpHandler.NewControlHandler(
		controlCreateUC, controlGetUC, controlUpdateUC, controlDeleteUC, controlListUC, controlDashboardUC,
	)
	cleanKRIHandler := httpHandler.NewKRIHandler(
		kriCreateUC, kriGetUC, kriUpdateUC, kriDeleteUC, kriListUC, kriDashboardUC,
	)
	cleanLessonHandler := httpHandler.NewLessonHandler(
		lessonCreateUC, lessonGetUC, lessonUpdateUC, lessonDeleteUC, lessonListUC, lessonDashboardUC,
	)
	approvalHandler := httpHandler.NewApprovalHandler(
		approvalListUC, approvalSubmitUC, approvalActionUC, approvalGetDetailUC, approvalGetPendingCountUC,
	)

	// Auth handlers (Clean Architecture)
	cleanAuthHandler := httpHandler.NewAuthHandler(authLoginUC, authMeUC)

	// AI handlers (Clean Architecture)
	cleanAIHandler := httpHandler.NewAIHandler(
		aiFishboneUC,
		aiImpactUC,
		aiMitigationUC,
		aiMinutesUC,
		aiTranscriptUC,
		aiPredictiveUC,
		aiRiskSuggestionUC,
		aiKRIUC,
	)

	// CBA handler (Clean Architecture)
	cleanCBAHandler := httpHandler.NewCBAHandler(cbaRecommendUC, cbaCalculateUC)

	// Organization handlers (Clean Architecture)
	cleanOrgHandler := httpHandler.NewOrganizationHandler(orgListUC)

	// System handlers (Clean Architecture)
	cleanSystemHandler := httpHandler.NewSystemHandler(systemSlowQueriesUC)

	// Mitigation Task handler
	cleanMitigationTaskHandler := httpHandler.NewMitigationTaskHandler(
		mtListUC, mtSubmitUC, mtGenerateUC, mtOverdueUC,
	)

	// KRI Report handler
	cleanKRIReportHandler := httpHandler.NewKRIReportHandler(
		kriReportListUC, kriReportSubmitUC, kriReportGenerateUC, kriReportOverdueUC,
	)

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

	// Postgres Pro diagnostics endpoint (Clean Architecture)
	api.Get("/system/slow-queries", middleware.AuthRequired(cfg.JWTSecret), cleanSystemHandler.GetSlowQueries)

	// Protected routes
	protected := api.Group("", middleware.AuthRequired(cfg.JWTSecret))

	// Auth
	protected.Get("/auth/me", cleanAuthHandler.Me)

	// Organizations (Clean Architecture)
	protected.Get("/organizations", cleanOrgHandler.List)

	// Users (Clean Architecture)
	protected.Get("/users", cleanUserHandler.ListUsers)
	protected.Post("/users", cleanUserHandler.CreateUser)
	protected.Get("/users/:id", cleanUserHandler.GetUser)
	protected.Put("/users/:id", cleanUserHandler.UpdateUser)
	protected.Delete("/users/:id", cleanUserHandler.DeleteUser)

	// Risks (Clean Architecture)
	protected.Get("/risks", cleanRiskHandler.ListRisks)
	protected.Post("/risks", cleanRiskHandler.CreateRisk)
	protected.Get("/risks/:id", cleanRiskHandler.GetRisk)
	protected.Put("/risks/:id", cleanRiskHandler.UpdateRisk)
	protected.Delete("/risks/:id", cleanRiskHandler.DeleteRisk)

	// Risk Dashboard (Clean Architecture)
	protected.Get("/dashboard/summary", cleanRiskHandler.DashboardSummary)
	protected.Get("/dashboard/heatmap", cleanRiskHandler.HeatmapData)
	protected.Get("/dashboard/top-risks", cleanRiskHandler.TopRisks)

	// Incidents (Clean Architecture)
	protected.Get("/incidents", cleanIncidentHandler.ListIncidents)
	protected.Post("/incidents", cleanIncidentHandler.CreateIncident)
	protected.Get("/incidents/:id", cleanIncidentHandler.GetIncident)
	protected.Put("/incidents/:id", cleanIncidentHandler.UpdateIncident)
	protected.Delete("/incidents/:id", cleanIncidentHandler.DeleteIncident)

	// KRIs (Clean Architecture)
	protected.Get("/kris", cleanKRIHandler.ListKRIs)
	protected.Get("/kris/dashboard", cleanKRIHandler.KRIDashboard)
	protected.Post("/kris", cleanKRIHandler.CreateKRI)
	protected.Get("/kris/:id", cleanKRIHandler.GetKRI)
	protected.Put("/kris/:id", cleanKRIHandler.UpdateKRI)
	protected.Delete("/kris/:id", cleanKRIHandler.DeleteKRI)

	// Controls (Clean Architecture)
	protected.Get("/controls", cleanControlHandler.ListControls)
	protected.Get("/controls/dashboard", cleanControlHandler.ControlDashboard)
	protected.Post("/controls", cleanControlHandler.CreateControl)
	protected.Get("/controls/:id", cleanControlHandler.GetControl)
	protected.Put("/controls/:id", cleanControlHandler.UpdateControl)
	protected.Delete("/controls/:id", cleanControlHandler.DeleteControl)

	// Lessons Learned (Clean Architecture)
	protected.Get("/lessons", cleanLessonHandler.ListLessons)
	protected.Get("/lessons/dashboard", cleanLessonHandler.LessonDashboard)
	protected.Post("/lessons", cleanLessonHandler.CreateLesson)
	protected.Get("/lessons/:id", cleanLessonHandler.GetLesson)
	protected.Put("/lessons/:id", cleanLessonHandler.UpdateLesson)
	protected.Delete("/lessons/:id", cleanLessonHandler.DeleteLesson)

	// AI Generator (Clean Architecture - 100%)
	protected.Post("/ai/causes", cleanAIHandler.GenerateCause)
	protected.Post("/ai/impacts", cleanAIHandler.GenerateImpact)
	protected.Post("/ai/mitigations", cleanAIHandler.GenerateMitigation)
	protected.Post("/ai/minutes", cleanAIHandler.GenerateMinutes)
	protected.Post("/ai/transcripts", cleanAIHandler.GenerateTranscript)
	protected.Post("/ai/predictive-analyses", cleanAIHandler.GeneratePredictive)
	protected.Post("/ai/risk-suggestions", cleanAIHandler.GenerateRiskSuggestion)
	protected.Post("/ai/kris", cleanAIHandler.GenerateKRI)

	// CBA Advocacy (Clean Architecture)
	protected.Post("/cba/recommend", cleanCBAHandler.RecommendVariables)
	protected.Post("/cba/calculate", cleanCBAHandler.Calculate)

	// Approval Workflow (New Clean Architecture)
	protected.Get("/approvals", approvalHandler.List)
	protected.Get("/approvals/pending-count", approvalHandler.GetPendingCount)
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
	protected.Post("/kri-reports/:id/submit", cleanKRIReportHandler.SubmitReport)
	protected.Post("/kri-reports/generate", cleanKRIReportHandler.TriggerGenerate)



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
