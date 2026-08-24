// Package bootstrap initializes and wires all application dependencies.
package bootstrap

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/manris/backend/internal/config"
	"github.com/manris/backend/internal/database"
	domainrepo "github.com/manris/backend/internal/domain/repository"
	domainsvc "github.com/manris/backend/internal/domain/service"
	openairepo "github.com/manris/backend/internal/repository/openai"
	postgresrepo "github.com/manris/backend/internal/repository/postgres"
	reportpdf "github.com/manris/backend/internal/service/pdfreport"
	aiuc "github.com/manris/backend/internal/usecase/ai"
	approvaluc "github.com/manris/backend/internal/usecase/approval"
	authuc "github.com/manris/backend/internal/usecase/auth"
	cbauc "github.com/manris/backend/internal/usecase/cba"
	commloguc "github.com/manris/backend/internal/usecase/communication_log"
	controluc "github.com/manris/backend/internal/usecase/control"
	evaluationuc "github.com/manris/backend/internal/usecase/evaluation"
	externalextPICuc "github.com/manris/backend/internal/usecase/external_pic"
	formalreportuc "github.com/manris/backend/internal/usecase/formalreport"
	impactcriteriauc "github.com/manris/backend/internal/usecase/impactcriteria"
	kriuc "github.com/manris/backend/internal/usecase/kri"
	krireportuc "github.com/manris/backend/internal/usecase/kri_report"
	likelihoodassessmentuc "github.com/manris/backend/internal/usecase/likelihoodassessment"
	mmuc "github.com/manris/backend/internal/usecase/meeting_minute"
	mtuc "github.com/manris/backend/internal/usecase/mitigation_task"
	organizationuc "github.com/manris/backend/internal/usecase/organization"
	organizationgroupuc "github.com/manris/backend/internal/usecase/organizationgroup"
	planninguc "github.com/manris/backend/internal/usecase/planning"
	reportuc "github.com/manris/backend/internal/usecase/report"
	riskuc "github.com/manris/backend/internal/usecase/risk"
	riskcascadeuc "github.com/manris/backend/internal/usecase/riskcascade"
	riskcharteruc "github.com/manris/backend/internal/usecase/riskcharter"
	systemuc "github.com/manris/backend/internal/usecase/system"
	systemsettinguc "github.com/manris/backend/internal/usecase/system_setting"
	tmpmruc "github.com/manris/backend/internal/usecase/tmpmr"
	useruc "github.com/manris/backend/internal/usecase/user"
	workingpaperusecase "github.com/manris/backend/internal/usecase/workingpaper"
)

// Container holds all application dependencies.
type Container struct {
	// Infrastructure
	Pool *pgxpool.Pool
	Cfg  *config.Config

	// Repositories
	UserRepository                 domainrepo.UserRepository
	OrgRepository                  domainrepo.OrganizationRepository
	OrgGroupRepository             domainrepo.OrganizationGroupRepository
	RiskRepository                 domainrepo.RiskRepository
	RiskCascadeRepository          domainrepo.RiskCascadeRepository
	IncidentRepository             domainrepo.IncidentRepository
	KRIRepository                  domainrepo.KRIRepository
	ControlRepository              domainrepo.ControlRepository
	ApprovalRepository             domainrepo.ApprovalRepository
	SystemRepository               domainrepo.SystemRepository
	SystemSettingRepository        domainrepo.SystemSettingRepository
	MitigationTaskRepository       domainrepo.MitigationTaskRepository
	KRIReportRepository            domainrepo.KRIReportRepository
	CommLogRepository              domainrepo.CommunicationLogRepository
	MMRepository                   domainrepo.MeetingMinuteRepository
	ExternalPICRepository          domainrepo.ExternalPICRepository
	WPRepository                   domainrepo.WorkingPaperRepository
	RiskCharterRepository          domainrepo.RiskCharterRepository
	PlanningHierarchyRepository    domainrepo.PlanningHierarchyRepository
	TMPMRRepository                domainrepo.TMPMRRepository
	EvaluationRepository           domainrepo.EvaluationRepository
	FormalReportRepository         domainrepo.FormalReportRepository
	LikelihoodAssessmentRepository domainrepo.LikelihoodAssessmentRepository
	ImpactCriteriaRepository       domainrepo.ImpactCriteriaRepository
	RiskMonitoringRepository       domainrepo.RiskMonitoringRepository

	// Domain Services
	OrgHierarchySvc *domainsvc.OrganizationHierarchy

	// System Settings Services
	SystemSettingGetUC    *systemsettinguc.GetSettingService
	SystemSettingCache    *systemsettinguc.SettingCache
	SystemSettingUpsertUC *systemsettinguc.UpsertSettingService
	SystemSettingDeleteUC *systemsettinguc.DeleteSettingService

	// AI Infrastructure
	ModelProvider openairepo.AIModelProvider
	AIRepository  domainrepo.AIRepository
	CBARepository domainrepo.CBARepository

	// Risk UseCases
	RiskCreateUC                *riskuc.CreateRiskUseCase
	RiskCreateBatchUC           *riskuc.CreateRiskBatchUseCase
	RiskSpreadsheetUC           *riskuc.BulkRiskSpreadsheetUseCase
	RiskGetUC                   *riskuc.GetRiskUseCase
	RiskExportPDFUC             *riskuc.ExportRiskPDFUseCase
	RiskArchiveUC               *riskuc.ArchiveRiskUseCase
	RiskRestoreUC               *riskuc.RestoreRiskUseCase
	RiskUpdateUC                *riskuc.UpdateRiskUseCase
	RiskDeleteUC                *riskuc.DeleteRiskUseCase
	RiskListUC                  *riskuc.ListRisksUseCase
	RiskListRegisterUC          *riskuc.ListRiskRegisterUseCase
	RiskListMonitoringUC        *riskuc.ListRiskMonitoringsUseCase
	RiskListVersionsUC          *riskuc.ListRiskVersionsUseCase
	RiskReviewQueueUC           *riskuc.ListRiskReviewQueueUseCase
	RiskCompareCyclesUC         *riskuc.CompareRiskCyclesUseCase
	RiskCompareCycleDetailsUC   *riskuc.CompareRiskCycleDetailsUseCase
	RiskReviewSummaryUC         *riskuc.RiskReviewSummaryUseCase
	RiskDashboardSummaryUC      *riskuc.DashboardSummaryUseCase
	RiskActionPressureUC        *riskuc.DashboardActionPressureUseCase
	RiskExecutiveAlertsUC       *riskuc.ExecutiveAlertsUseCase
	RiskHeatmapDataUC           *riskuc.HeatmapDataUseCase
	RiskHeatmapMultiUC          *riskuc.HeatmapMultiUseCase
	RiskTopRisksUC              *riskuc.TopRisksUseCase
	RiskDashboardCategoriesUC   *riskuc.DashboardRiskCategoriesUseCase
	RiskListApprovedUC          *riskuc.ListApprovedRisksUseCase
	RiskHeatmapVelocityUC       *riskuc.HeatmapVelocityUseCase
	RiskOverdueTimelineUC       *riskuc.OverdueMitigationTimelineUseCase
	RiskKRIBreachUC             *riskuc.KRIBreachSummaryUseCase
	RiskUnitResponseUC          *riskuc.UnitResponseTimeUseCase
	RiskListCycleSnapshotUC     *riskuc.ListRiskCycleSnapshotUseCase
	RiskMonitoringSpreadsheetUC *riskuc.BulkMonitoringSpreadsheetUseCase
	RiskCreateMonitoringBatchUC *riskuc.CreateMonitoringBatchUseCase
	RiskMonitoringStartUC       *riskuc.StartMonitoringUseCase
	RiskMonitoringGetUC         *riskuc.GetMonitoringUseCase
	RiskMonitoringUpdateUC      *riskuc.UpdateMonitoringUseCase
	RiskMonitoringFinalizeUC    *riskuc.FinalizeMonitoringUseCase
	RiskMonitoringCorrectUC     *riskuc.CorrectMonitoringUseCase

	// Risk Cascade UseCases
	RiskCascadeCreateMandatoryUC *riskcascadeuc.CreateMandatoryUseCase
	RiskCascadeCreateBottomUpUC  *riskcascadeuc.CreateBottomUpUseCase
	RiskCascadeDecideUC          *riskcascadeuc.DecideUseCase
	RiskCascadeDeleteUC          *riskcascadeuc.DeleteUseCase
	RiskCascadeListUC            *riskcascadeuc.ListUseCase

	// User UseCases
	UserCreateUC              *useruc.CreateUserUseCase
	UserGetUC                 *useruc.GetUserUseCase
	UserUpdateUC              *useruc.UpdateUserUseCase
	UserDeleteUC              *useruc.DeleteUserUseCase
	UserListUC                *useruc.ListUsersUseCase
	UserListFilterUC          *useruc.ListUsersWithFilterUseCase
	UserApproveRegistrationUC *useruc.ApproveRegistrationUseCase
	UserRejectRegistrationUC  *useruc.RejectRegistrationUseCase

	// Control UseCases
	ControlCreateUC    *controluc.CreateControlUseCase
	ControlGetUC       *controluc.GetControlUseCase
	ControlUpdateUC    *controluc.UpdateControlUseCase
	ControlDeleteUC    *controluc.DeleteControlUseCase
	ControlListUC      *controluc.ListControlsUseCase
	ControlDashboardUC *controluc.ControlDashboardUseCase

	// KRI UseCases
	KRICreateUC    *kriuc.CreateKRIUseCase
	KRIGetUC       *kriuc.GetKRIUseCase
	KRIUpdateUC    *kriuc.UpdateKRIUseCase
	KRIArchiveUC   *kriuc.ArchiveKRIUseCase
	KRIListUC      *kriuc.ListKRIsUseCase
	KRIDashboardUC *kriuc.KRIDashboardUseCase

	// Approval UseCases
	ApprovalListUC            *approvaluc.ListApprovalUseCase
	ApprovalSubmitUC          *approvaluc.SubmitApprovalUseCase
	ApprovalActionUC          *approvaluc.ApprovalActionUseCase
	ApprovalGetDetailUC       *approvaluc.GetApprovalDetailUseCase
	ApprovalGetPendingCountUC *approvaluc.GetPendingCountUseCase
	ApprovalGetByEntityUC     *approvaluc.GetApprovalByEntityUseCase

	// Auth UseCases
	AuthLoginUC          *authuc.LoginUseCase
	AuthRegisterUC       *authuc.RegisterUseCase
	AuthMeUC             *authuc.GetCurrentUserUseCase
	AuthUpdateProfileUC  *authuc.UpdateProfileUseCase
	AuthChangePasswordUC *authuc.ChangePasswordUseCase

	// AI UseCases
	AIFishboneUC                  *aiuc.GenerateFishboneUseCase
	AIImpactUC                    *aiuc.GenerateImpactUseCase
	AIMitigationUC                *aiuc.GenerateMitigationUseCase
	AIMinutesUC                   *aiuc.GenerateMinutesUseCase
	AITranscriptUC                *aiuc.AnalyzeTranscriptUseCase
	AIApplyTranscriptRiskChangeUC *aiuc.ApplyTranscriptRiskChangesUseCase
	AIPredictiveUC                *aiuc.GeneratePredictiveUseCase
	AIRiskSuggestionUC            *aiuc.GenerateRiskSuggestionsUseCase
	AIKIUUC                       *aiuc.GenerateKRIUseCase
	AIIncidentBatchUC             *aiuc.GenerateIncidentBatchExtractionUseCase
	AIIncidentRiskUC              *aiuc.GenerateManualIncidentRiskSuggestionsUseCase
	AIDocumentIntelligenceUC      *aiuc.AnalyzeDocumentIntelligenceUseCase

	// CBA UseCases
	CBARecommendUC *cbauc.RecommendVariablesUseCase
	CBACalculateUC *cbauc.CalculateUseCase

	// Organization UseCases
	OrgCreateUC       *organizationuc.CreateOrganizationUseCase
	OrgGetUC          *organizationuc.GetOrganizationUseCase
	OrgUpdateUC       *organizationuc.UpdateOrganizationUseCase
	OrgDeleteUC       *organizationuc.DeleteOrganizationUseCase
	OrgListUC         *organizationuc.ListOrganizationsUseCase
	OrgListFilterUC   *organizationuc.ListOrganizationsWithFilterUseCase
	OrgGroupCreateUC  *organizationgroupuc.CreateUseCase
	OrgGroupUpdateUC  *organizationgroupuc.UpdateUseCase
	OrgGroupListUC    *organizationgroupuc.ListUseCase
	OrgGroupGetUC     *organizationgroupuc.GetUseCase
	OrgGroupDeleteUC  *organizationgroupuc.DeleteUseCase
	OrgGroupResolveUC *organizationgroupuc.ResolveUseCase

	// Risk Charter UseCases
	RiskCharterCreateUC *riskcharteruc.CreateRiskCharterUseCase
	RiskCharterGetUC    *riskcharteruc.GetRiskCharterUseCase
	RiskCharterUpdateUC *riskcharteruc.UpdateRiskCharterUseCase
	RiskCharterListUC   *riskcharteruc.ListRiskChartersUseCase

	// TMPMR UseCases
	TMPMRCreateUC  *tmpmruc.CreateUseCase
	TMPMRGetUC     *tmpmruc.GetUseCase
	TMPMRListUC    *tmpmruc.ListUseCase
	TMPMRUpdateUC  *tmpmruc.UpdateUseCase
	TMPMRSubmitUC  *tmpmruc.SubmitUseCase
	TMPMRReviewUC  *tmpmruc.ReviewUseCase
	TMPMRApproveUC *tmpmruc.ApproveUseCase

	// Evaluation UseCases
	EvaluationCreateUC    *evaluationuc.CreateUseCase
	EvaluationGetUC       *evaluationuc.GetUseCase
	EvaluationListUC      *evaluationuc.ListUseCase
	EvaluationUpdateUC    *evaluationuc.UpdateUseCase
	EvaluationFinalizeUC  *evaluationuc.FinalizeUseCase
	EvaluationReopenUC    *evaluationuc.ReopenUseCase
	EvaluationExportPDFUC *evaluationuc.ExportPDFUseCase

	// Formal Report UseCases
	FormalReportGenerateUC *formalreportuc.GenerateFormalReportUseCase
	FormalReportGetUC      *formalreportuc.GetUseCase
	FormalReportListUC     *formalreportuc.ListUseCase
	FormalReportDownloadUC *formalreportuc.DownloadUseCase

	// Likelihood Assessment UseCases
	LikelihoodAssessmentUpsertUC *likelihoodassessmentuc.UpsertUseCase
	LikelihoodAssessmentGetUC    *likelihoodassessmentuc.GetByRiskIDUseCase

	// Impact Criteria UseCases
	ImpactCriteriaListUC impactcriteriauc.ListUseCase

	// Planning UseCases
	PlanningROOptionsUC       *planninguc.ListROOptionsUseCase
	PlanningObjectiveCompatUC *planninguc.ListObjectiveCompatibilityUseCase

	// External PIC UseCases
	ExternalPICGetOrCreateUC *externalextPICuc.GetOrCreateByNameUseCase
	ExternalPICListUC        *externalextPICuc.ListExternalPICsUseCase
	ExternalPICDeleteUC      *externalextPICuc.DeleteExternalPICUseCase

	// System UseCases
	SystemSlowQueriesUC *systemuc.GetSlowQueriesUseCase

	// Mitigation Task UseCases
	MTListUC         *mtuc.ListTasksUseCase
	MTSubmitUC       *mtuc.SubmitProgressUseCase
	MTSubmitReportUC *mtuc.SubmitMonitoringReportUseCase
	MTEnsureUC       *mtuc.EnsureTasksForRiskVersionUseCase
	MTGenerateUC     *mtuc.GenerateTasksUseCase
	MTOverdueUC      *mtuc.MarkOverdueUseCase

	// KRI Report UseCases
	KRIReportListUC     *krireportuc.ListReportsUseCase
	KRIReportSubmitUC   *krireportuc.SubmitReportUseCase
	KRIReportAcceptUC   *krireportuc.AcceptReportUseCase
	KRIReportRevisionUC *krireportuc.RequestRevisionUseCase
	KRIReportSkipUC     *krireportuc.SkipReportUseCase
	KRIReportGenerateUC *krireportuc.GenerateReportsUseCase
	KRIReportOverdueUC  *krireportuc.MarkOverdueUseCase

	// Communication Log UseCases
	CommLogCreateUC *commloguc.CreateCommunicationLogUseCase
	CommLogListUC   *commloguc.ListCommunicationLogsUseCase
	CommLogDeleteUC *commloguc.DeleteCommunicationLogUseCase

	// Meeting Minute UseCases
	MMCreateUC    *mmuc.CreateMeetingMinuteUseCase
	MMGetUC       *mmuc.GetMeetingMinuteUseCase
	MMListUC      *mmuc.ListMeetingMinutesUseCase
	MMDeleteUC    *mmuc.DeleteMeetingMinuteUseCase
	MMLinkUseCase *mmuc.LinkRisksUseCase

	// Working Paper UseCase
	WPUseCase *workingpaperusecase.UseCase

	// Report UseCases
	GenerateReportUC        *reportuc.GenerateReportUseCase
	PDFReportRenderer       domainsvc.ReportPDFRenderer
	FormalReportPDFRenderer domainsvc.FormalReportPDFRenderer
}

// Build initializes and wires all application dependencies.
func Build(ctx context.Context, cfg *config.Config) (*Container, error) {
	// Connect to database
	pool, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	c := &Container{
		Pool: pool,
		Cfg:  cfg,
	}

	// ============================================================================
	// Repository Layer
	// ============================================================================

	c.UserRepository = postgresrepo.NewUserRepository(pool)
	c.OrgRepository = postgresrepo.NewOrganizationRepository(pool)
	c.OrgGroupRepository = postgresrepo.NewOrganizationGroupRepository(pool)
	c.RiskRepository = postgresrepo.NewRiskRepository(pool)
	c.RiskCascadeRepository = postgresrepo.NewRiskCascadeRepository(pool)
	c.IncidentRepository = postgresrepo.NewIncidentRepository(pool)
	c.KRIRepository = postgresrepo.NewKRIRepository(pool)
	c.ControlRepository = postgresrepo.NewControlRepository(pool)
	c.ApprovalRepository = postgresrepo.NewApprovalRepository(pool)
	c.SystemRepository = postgresrepo.NewSystemRepository(pool)
	c.SystemSettingRepository = postgresrepo.NewSystemSettingRepository(pool)
	c.MitigationTaskRepository = postgresrepo.NewMitigationTaskRepository(pool)
	c.KRIReportRepository = postgresrepo.NewKRIReportRepository(pool)
	c.CommLogRepository = postgresrepo.NewCommunicationLogRepository(pool)
	c.MMRepository = postgresrepo.NewMeetingMinuteRepository(pool)
	c.ExternalPICRepository = postgresrepo.NewExternalPICRepository(pool)
	c.WPRepository = postgresrepo.NewWorkingPaperRepository(pool)
	c.RiskCharterRepository = postgresrepo.NewRiskCharterRepository(pool)
	c.PlanningHierarchyRepository = postgresrepo.NewPlanningHierarchyRepository(pool)
	c.TMPMRRepository = postgresrepo.NewTMPMRRepository(pool)
	c.EvaluationRepository = postgresrepo.NewEvaluationRepository(pool)
	c.FormalReportRepository = postgresrepo.NewFormalReportRepository(pool)
	c.LikelihoodAssessmentRepository = postgresrepo.NewLikelihoodAssessmentRepository(pool)
	c.ImpactCriteriaRepository = postgresrepo.NewImpactCriteriaRepository(pool)
	c.RiskMonitoringRepository = postgresrepo.NewRiskMonitoringRepository(pool)

	// ============================================================================
	// Domain Services
	// ============================================================================

	c.OrgHierarchySvc = domainsvc.NewOrganizationHierarchy(c.OrgRepository)
	renderer := reportpdf.NewPDFReportRenderer().(interface {
		domainsvc.ReportPDFRenderer
		domainsvc.FormalReportPDFRenderer
		domainsvc.RiskDetailPDFRenderer
	})
	c.PDFReportRenderer = renderer
	c.FormalReportPDFRenderer = renderer

	// ============================================================================
	// System Settings Services with Shared Cache
	// ============================================================================

	c.SystemSettingGetUC = systemsettinguc.NewGetSettingService(c.SystemSettingRepository)
	c.SystemSettingCache = systemsettinguc.GetSharedCache(c.SystemSettingGetUC)
	c.SystemSettingUpsertUC = systemsettinguc.NewUpsertSettingService(c.SystemSettingRepository, c.SystemSettingCache)
	c.SystemSettingDeleteUC = systemsettinguc.NewDeleteSettingService(c.SystemSettingRepository, c.SystemSettingCache)

	// ============================================================================
	// AI Infrastructure
	// ============================================================================

	c.ModelProvider = openairepo.NewModelProviderAdapter(c.SystemSettingGetUC)
	c.AIRepository = openairepo.NewAIRepository(cfg.OpenAIKey, c.RiskRepository, c.ModelProvider)
	c.CBARepository = openairepo.NewCBARepository(c.AIRepository)

	// ============================================================================
	// Risk UseCases
	// ============================================================================

	c.RiskCreateUC = riskuc.NewCreateRiskUseCase(c.RiskRepository, c.UserRepository, c.OrgRepository)
	c.RiskCreateBatchUC = riskuc.NewCreateRiskBatchUseCase(c.RiskCreateUC, c.UserRepository)
	c.RiskSpreadsheetUC = riskuc.NewBulkRiskSpreadsheetUseCase(c.OrgRepository, c.UserRepository)
	c.RiskGetUC = riskuc.NewGetRiskUseCase(c.RiskRepository)
	c.RiskExportPDFUC = riskuc.NewExportRiskPDFUseCase(c.RiskRepository, renderer)
	c.RiskArchiveUC = riskuc.NewArchiveRiskUseCase(c.RiskRepository, c.WPRepository)
	c.RiskRestoreUC = riskuc.NewRestoreRiskUseCase(c.RiskRepository)
	c.RiskUpdateUC = riskuc.NewUpdateRiskUseCase(c.RiskRepository, c.UserRepository, c.OrgRepository, c.WPRepository, c.MitigationTaskRepository)
	c.RiskDeleteUC = riskuc.NewDeleteRiskUseCase(c.RiskRepository)
	c.RiskListUC = riskuc.NewListRisksUseCase(c.RiskRepository, c.OrgHierarchySvc)
	c.RiskListRegisterUC = riskuc.NewListRiskRegisterUseCase(c.RiskRepository)
	c.RiskListMonitoringUC = riskuc.NewListRiskMonitoringsUseCase(c.RiskMonitoringRepository)
	c.RiskListVersionsUC = riskuc.NewListRiskVersionsUseCase(c.RiskRepository)
	c.RiskReviewQueueUC = riskuc.NewListRiskReviewQueueUseCase(c.RiskRepository, c.OrgHierarchySvc)
	c.RiskCompareCyclesUC = riskuc.NewCompareRiskCyclesUseCase(c.RiskRepository, c.OrgHierarchySvc)
	c.RiskCompareCycleDetailsUC = riskuc.NewCompareRiskCycleDetailsUseCase(c.RiskRepository, c.OrgHierarchySvc)
	c.RiskReviewSummaryUC = riskuc.NewRiskReviewSummaryUseCase(c.RiskRepository, c.OrgHierarchySvc)
	c.RiskDashboardSummaryUC = riskuc.NewDashboardSummaryUseCase(c.RiskRepository)
	c.RiskActionPressureUC = riskuc.NewDashboardActionPressureUseCase(c.MitigationTaskRepository)
	c.RiskExecutiveAlertsUC = riskuc.NewExecutiveAlertsUseCase(c.RiskRepository, c.MitigationTaskRepository)
	c.RiskHeatmapDataUC = riskuc.NewHeatmapDataUseCase(c.RiskRepository)
	c.RiskHeatmapMultiUC = riskuc.NewHeatmapMultiUseCase(c.RiskRepository)
	c.RiskTopRisksUC = riskuc.NewTopRisksUseCase(c.RiskRepository)
	c.RiskDashboardCategoriesUC = riskuc.NewDashboardRiskCategoriesUseCase(c.RiskRepository)
	c.RiskListApprovedUC = riskuc.NewListApprovedRisksUseCase(c.RiskRepository, c.OrgHierarchySvc)
	c.RiskHeatmapVelocityUC = riskuc.NewHeatmapVelocityUseCase(c.RiskRepository)
	c.RiskOverdueTimelineUC = riskuc.NewOverdueMitigationTimelineUseCase(c.RiskRepository)
	c.RiskKRIBreachUC = riskuc.NewKRIBreachSummaryUseCase(c.RiskRepository)
	c.RiskUnitResponseUC = riskuc.NewUnitResponseTimeUseCase(c.RiskRepository)
	c.RiskListCycleSnapshotUC = riskuc.NewListRiskCycleSnapshotUseCase(c.RiskRepository, c.OrgHierarchySvc)
	c.RiskMonitoringSpreadsheetUC = riskuc.NewBulkMonitoringSpreadsheetUseCase(c.OrgRepository, c.UserRepository, c.RiskRepository)
	periodRepo, ok := c.RiskRepository.(riskuc.MonitoringPeriodRepository)
	if !ok {
		return nil, fmt.Errorf("risk repository does not implement monitoring period policy")
	}
	c.RiskMonitoringStartUC = riskuc.NewStartMonitoringUseCase(c.RiskRepository, c.RiskMonitoringRepository, c.RiskRepository, c.MitigationTaskRepository, periodRepo)
	c.RiskCreateMonitoringBatchUC = riskuc.NewCreateMonitoringBatchUseCase(c.RiskRepository, c.RiskMonitoringStartUC)
	c.RiskMonitoringGetUC = riskuc.NewGetMonitoringUseCase(c.RiskMonitoringRepository)
	c.RiskMonitoringUpdateUC = riskuc.NewUpdateMonitoringUseCase(c.RiskRepository, c.RiskMonitoringRepository)
	c.RiskMonitoringFinalizeUC = riskuc.NewFinalizeMonitoringUseCase(c.RiskRepository, c.RiskMonitoringRepository, c.MitigationTaskRepository, c.RiskRepository)
	c.RiskMonitoringCorrectUC = riskuc.NewCorrectMonitoringUseCase(c.RiskRepository, c.RiskMonitoringRepository)

	c.RiskCascadeCreateMandatoryUC = riskcascadeuc.NewCreateMandatoryUseCase(c.RiskCascadeRepository, c.RiskRepository, c.OrgRepository)
	c.RiskCascadeCreateBottomUpUC = riskcascadeuc.NewCreateBottomUpUseCase(c.RiskCascadeRepository, c.RiskRepository, c.OrgRepository)
	c.RiskCascadeDecideUC = riskcascadeuc.NewDecideUseCase(c.RiskCascadeRepository, c.RiskRepository, c.OrgRepository, c.UserRepository, c.MitigationTaskRepository)
	c.RiskCascadeDeleteUC = riskcascadeuc.NewDeleteUseCase(c.RiskCascadeRepository)
	c.RiskCascadeListUC = riskcascadeuc.NewListUseCase(c.RiskCascadeRepository)

	// ============================================================================
	// User UseCases
	// ============================================================================

	c.UserCreateUC = useruc.NewCreateUserUseCase(c.UserRepository, c.OrgRepository)
	c.UserGetUC = useruc.NewGetUserUseCase(c.UserRepository)
	c.UserUpdateUC = useruc.NewUpdateUserUseCase(c.UserRepository, c.OrgRepository)
	c.UserDeleteUC = useruc.NewDeleteUserUseCase(c.UserRepository)
	c.UserListUC = useruc.NewListUsersUseCase(c.UserRepository)
	c.UserListFilterUC = useruc.NewListUsersWithFilterUseCase(c.UserRepository)
	c.UserApproveRegistrationUC = useruc.NewApproveRegistrationUseCase(c.UserRepository)
	c.UserRejectRegistrationUC = useruc.NewRejectRegistrationUseCase(c.UserRepository)

	// ============================================================================
	// Control UseCases
	// ============================================================================

	c.ControlCreateUC = controluc.NewCreateControlUseCase(c.ControlRepository, c.RiskRepository, c.OrgRepository)
	c.ControlGetUC = controluc.NewGetControlUseCase(c.ControlRepository)
	c.ControlUpdateUC = controluc.NewUpdateControlUseCase(c.ControlRepository, c.RiskRepository, c.OrgRepository)
	c.ControlDeleteUC = controluc.NewDeleteControlUseCase(c.ControlRepository)
	c.ControlListUC = controluc.NewListControlsUseCase(c.ControlRepository, c.OrgHierarchySvc)
	c.ControlDashboardUC = controluc.NewControlDashboardUseCase(c.ControlRepository, c.OrgHierarchySvc)

	// ============================================================================
	// KRI UseCases
	// ============================================================================

	c.KRICreateUC = kriuc.NewCreateKRIUseCase(c.KRIRepository, c.RiskRepository, c.OrgRepository)
	c.KRIGetUC = kriuc.NewGetKRIUseCase(c.KRIRepository)
	c.KRIUpdateUC = kriuc.NewUpdateKRIUseCase(c.KRIRepository, c.RiskRepository, c.OrgRepository)
	c.KRIArchiveUC = kriuc.NewArchiveKRIUseCase(c.KRIRepository)
	c.KRIListUC = kriuc.NewListKRIsUseCase(c.KRIRepository, c.OrgHierarchySvc)
	c.KRIDashboardUC = kriuc.NewKRIDashboardUseCase(c.KRIRepository, c.OrgHierarchySvc)

	// ============================================================================
	// Approval UseCases
	// ============================================================================

	c.ApprovalListUC = approvaluc.NewListApprovalUseCase(c.ApprovalRepository)
	c.ApprovalSubmitUC = approvaluc.NewSubmitApprovalUseCase(c.ApprovalRepository, c.RiskRepository, c.IncidentRepository, c.UserRepository, c.MitigationTaskRepository, cfg.RiskApprovalWorkflowEnabled)
	c.ApprovalActionUC = approvaluc.NewApprovalActionUseCase(c.ApprovalRepository, c.RiskRepository, c.IncidentRepository, c.MitigationTaskRepository)
	c.ApprovalGetDetailUC = approvaluc.NewGetApprovalDetailUseCase(c.ApprovalRepository)
	c.ApprovalGetPendingCountUC = approvaluc.NewGetPendingCountUseCase(c.ApprovalRepository)
	c.ApprovalGetByEntityUC = approvaluc.NewGetApprovalByEntityUseCase(c.ApprovalRepository)

	// ============================================================================
	// Auth UseCases
	// ============================================================================

	c.AuthLoginUC = authuc.NewLoginUseCase(c.UserRepository, c.OrgHierarchySvc, cfg.JWTSecret, cfg.JWTExpiry, cfg.RiskApprovalWorkflowEnabled)
	c.AuthRegisterUC = authuc.NewRegisterUseCase(c.UserRepository, c.OrgRepository)
	c.AuthMeUC = authuc.NewGetCurrentUserUseCase(c.UserRepository, c.OrgHierarchySvc, cfg.RiskApprovalWorkflowEnabled)
	c.AuthUpdateProfileUC = authuc.NewUpdateProfileUseCase(c.UserRepository, c.OrgHierarchySvc, cfg.RiskApprovalWorkflowEnabled)
	c.AuthChangePasswordUC = authuc.NewChangePasswordUseCase(c.UserRepository, c.OrgHierarchySvc, cfg.JWTSecret, cfg.JWTExpiry, cfg.RiskApprovalWorkflowEnabled)

	// ============================================================================
	// AI UseCases
	// ============================================================================

	c.AIFishboneUC = aiuc.NewGenerateFishboneUseCase(c.AIRepository, c.OrgRepository)
	c.AIImpactUC = aiuc.NewGenerateImpactUseCase(c.AIRepository, c.OrgRepository)
	c.AIMitigationUC = aiuc.NewGenerateMitigationUseCase(c.AIRepository, c.OrgRepository)
	c.AIMinutesUC = aiuc.NewGenerateMinutesUseCase(c.AIRepository, c.OrgRepository)
	c.AITranscriptUC = aiuc.NewAnalyzeTranscriptUseCase(c.AIRepository, c.OrgRepository)
	c.AIApplyTranscriptRiskChangeUC = aiuc.NewApplyTranscriptRiskChangesUseCase(c.RiskRepository)
	c.AIPredictiveUC = aiuc.NewGeneratePredictiveUseCase(c.AIRepository, c.OrgRepository)
	c.AIRiskSuggestionUC = aiuc.NewGenerateRiskSuggestionsUseCase(c.AIRepository, c.OrgRepository)
	c.AIKIUUC = aiuc.NewGenerateKRIUseCase(c.AIRepository, c.OrgRepository)
	c.AIIncidentBatchUC = aiuc.NewGenerateIncidentBatchExtractionUseCase(c.AIRepository, c.OrgRepository)
	c.AIIncidentRiskUC = aiuc.NewGenerateManualIncidentRiskSuggestionsUseCase(c.AIRepository, c.OrgRepository)
	c.AIDocumentIntelligenceUC = aiuc.NewAnalyzeDocumentIntelligenceUseCase(
		c.AIRepository,
		c.OrgRepository,
		c.RiskRepository,
		c.PlanningHierarchyRepository,
		c.MitigationTaskRepository,
	)

	c.PlanningROOptionsUC = planninguc.NewListROOptionsUseCase(c.PlanningHierarchyRepository)
	c.PlanningObjectiveCompatUC = planninguc.NewListObjectiveCompatibilityUseCase(c.PlanningHierarchyRepository)

	// ============================================================================
	// CBA UseCases
	// ============================================================================

	c.CBARecommendUC = cbauc.NewRecommendVariablesUseCase(c.CBARepository, c.OrgRepository)
	c.CBACalculateUC = cbauc.NewCalculateUseCase()

	// ============================================================================
	// Organization UseCases
	// ============================================================================

	c.OrgCreateUC = organizationuc.NewCreateOrganizationUseCase(c.OrgRepository)
	c.OrgGetUC = organizationuc.NewGetOrganizationUseCase(c.OrgRepository)
	c.OrgUpdateUC = organizationuc.NewUpdateOrganizationUseCase(c.OrgRepository)
	c.OrgDeleteUC = organizationuc.NewDeleteOrganizationUseCase(c.OrgRepository)
	c.OrgListUC = organizationuc.NewListOrganizationsUseCase(c.OrgRepository)
	c.OrgListFilterUC = organizationuc.NewListOrganizationsWithFilterUseCase(c.OrgRepository)
	c.OrgGroupCreateUC = organizationgroupuc.NewCreateUseCase(c.OrgGroupRepository, c.OrgRepository)
	c.OrgGroupUpdateUC = organizationgroupuc.NewUpdateUseCase(c.OrgGroupRepository, c.OrgRepository)
	c.OrgGroupListUC = organizationgroupuc.NewListUseCase(c.OrgGroupRepository)
	c.OrgGroupGetUC = organizationgroupuc.NewGetUseCase(c.OrgGroupRepository)
	c.OrgGroupDeleteUC = organizationgroupuc.NewDeleteUseCase(c.OrgGroupRepository)
	c.OrgGroupResolveUC = organizationgroupuc.NewResolveUseCase(c.OrgGroupRepository)

	// ============================================================================
	// Risk Charter UseCases
	// ============================================================================

	c.RiskCharterCreateUC = riskcharteruc.NewCreateRiskCharterUseCase(c.RiskCharterRepository)
	c.RiskCharterGetUC = riskcharteruc.NewGetRiskCharterUseCase(c.RiskCharterRepository)
	c.RiskCharterUpdateUC = riskcharteruc.NewUpdateRiskCharterUseCase(c.RiskCharterRepository)
	c.RiskCharterListUC = riskcharteruc.NewListRiskChartersUseCase(c.RiskCharterRepository)

	c.TMPMRCreateUC = tmpmruc.NewCreateUseCase(c.TMPMRRepository)
	c.TMPMRGetUC = tmpmruc.NewGetUseCase(c.TMPMRRepository)
	c.TMPMRListUC = tmpmruc.NewListUseCase(c.TMPMRRepository)
	c.TMPMRUpdateUC = tmpmruc.NewUpdateUseCase(c.TMPMRRepository)
	c.TMPMRSubmitUC = tmpmruc.NewSubmitUseCase(c.TMPMRRepository)
	c.TMPMRReviewUC = tmpmruc.NewReviewUseCase(c.TMPMRRepository)
	c.TMPMRApproveUC = tmpmruc.NewApproveUseCase(c.TMPMRRepository)

	c.EvaluationCreateUC = evaluationuc.NewCreateUseCase(c.EvaluationRepository, c.OrgRepository)
	c.EvaluationGetUC = evaluationuc.NewGetUseCase(c.EvaluationRepository)
	c.EvaluationListUC = evaluationuc.NewListUseCase(c.EvaluationRepository)
	c.EvaluationUpdateUC = evaluationuc.NewUpdateUseCase(c.EvaluationRepository)
	c.EvaluationFinalizeUC = evaluationuc.NewFinalizeUseCase(c.EvaluationRepository)
	c.EvaluationReopenUC = evaluationuc.NewReopenUseCase(c.EvaluationRepository)
	c.EvaluationExportPDFUC = evaluationuc.NewExportPDFUseCase(c.EvaluationRepository, c.OrgRepository, c.RiskRepository, c.FormalReportPDFRenderer)

	c.FormalReportGenerateUC = formalreportuc.NewGenerateFormalReportUseCase(
		c.FormalReportRepository,
		c.RiskRepository,
		c.IncidentRepository,
		c.KRIRepository,
		c.TMPMRRepository,
	)
	c.FormalReportGetUC = formalreportuc.NewGetUseCase(c.FormalReportRepository)
	c.FormalReportListUC = formalreportuc.NewListUseCase(c.FormalReportRepository)
	c.FormalReportDownloadUC = formalreportuc.NewDownloadUseCase(
		c.FormalReportRepository,
		c.OrgRepository,
		c.RiskRepository,
		c.TMPMRRepository,
		c.FormalReportPDFRenderer,
	)
	c.LikelihoodAssessmentUpsertUC = likelihoodassessmentuc.NewUpsertUseCase(c.LikelihoodAssessmentRepository)
	c.LikelihoodAssessmentGetUC = likelihoodassessmentuc.NewGetByRiskIDUseCase(c.LikelihoodAssessmentRepository)
	c.ImpactCriteriaListUC = impactcriteriauc.NewListUseCase(c.ImpactCriteriaRepository)

	// ============================================================================
	// External PIC UseCases
	// ============================================================================

	c.ExternalPICGetOrCreateUC = externalextPICuc.NewGetOrCreateByNameUseCase(c.ExternalPICRepository)
	c.ExternalPICListUC = externalextPICuc.NewListExternalPICsUseCase(c.ExternalPICRepository)
	c.ExternalPICDeleteUC = externalextPICuc.NewDeleteExternalPICUseCase(c.ExternalPICRepository)

	// ============================================================================
	// System UseCases
	// ============================================================================

	c.SystemSlowQueriesUC = systemuc.NewGetSlowQueriesUseCase(c.SystemRepository)

	// ============================================================================
	// Mitigation Task UseCases
	// ============================================================================

	c.MTListUC = mtuc.NewListTasksUseCase(c.MitigationTaskRepository, c.RiskRepository)
	c.MTSubmitUC = mtuc.NewSubmitProgressUseCase(c.MitigationTaskRepository, c.RiskRepository)
	c.MTSubmitReportUC = mtuc.NewSubmitMonitoringReportUseCase(c.MitigationTaskRepository, c.RiskRepository)
	c.MTEnsureUC = mtuc.NewEnsureTasksForRiskVersionUseCase(c.MitigationTaskRepository, c.RiskRepository)
	c.MTGenerateUC = mtuc.NewGenerateTasksUseCase(c.MitigationTaskRepository)
	c.MTOverdueUC = mtuc.NewMarkOverdueUseCase(c.MitigationTaskRepository)

	// ============================================================================
	// KRI Report UseCases
	// ============================================================================

	c.KRIReportListUC = krireportuc.NewListReportsUseCase(c.KRIReportRepository, c.KRIRepository)
	c.KRIReportSubmitUC = krireportuc.NewSubmitReportUseCase(c.KRIReportRepository, c.KRIRepository)
	c.KRIReportAcceptUC = krireportuc.NewAcceptReportUseCase(c.KRIReportRepository, c.KRIRepository)
	c.KRIReportRevisionUC = krireportuc.NewRequestRevisionUseCase(c.KRIReportRepository, c.KRIRepository)
	c.KRIReportSkipUC = krireportuc.NewSkipReportUseCase(c.KRIReportRepository, c.KRIRepository)
	c.KRIReportGenerateUC = krireportuc.NewGenerateReportsUseCase(c.KRIReportRepository)
	c.KRIReportOverdueUC = krireportuc.NewMarkOverdueUseCase(c.KRIReportRepository)

	// ============================================================================
	// Communication Log UseCases
	// ============================================================================

	c.CommLogCreateUC = commloguc.NewCreateCommunicationLogUseCase(c.CommLogRepository, c.RiskRepository, c.UserRepository)
	c.CommLogListUC = commloguc.NewListCommunicationLogsUseCase(c.CommLogRepository, c.RiskRepository)
	c.CommLogDeleteUC = commloguc.NewDeleteCommunicationLogUseCase(c.CommLogRepository, c.RiskRepository)

	// ============================================================================
	// Meeting Minute UseCases
	// ============================================================================

	c.MMCreateUC = mmuc.NewCreateMeetingMinuteUseCase(c.MMRepository, c.UserRepository)
	c.MMGetUC = mmuc.NewGetMeetingMinuteUseCase(c.MMRepository)
	c.MMListUC = mmuc.NewListMeetingMinutesUseCase(c.MMRepository)
	c.MMDeleteUC = mmuc.NewDeleteMeetingMinuteUseCase(c.MMRepository)
	c.MMLinkUseCase = mmuc.NewLinkRisksUseCase(c.MMRepository)

	// ============================================================================
	// Working Paper UseCase
	// ============================================================================

	c.WPUseCase = workingpaperusecase.NewWorkingPaperUseCase(c.WPRepository, c.RiskRepository, c.RiskMonitoringRepository)

	// ============================================================================
	// Report UseCases
	// ============================================================================

	c.GenerateReportUC = reportuc.NewGenerateReportUseCase(c.RiskRepository, c.IncidentRepository, c.KRIRepository)
	return c, nil
}

// Close closes the database pool.
func (c *Container) Close() {
	if c.Pool != nil {
		c.Pool.Close()
	}
}
