package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type documentIntelligenceAIRepository interface {
	AnalyzeDocument(ctx context.Context, req entity.DocumentAnalysisRequest, orgContext string) (*entity.DocumentIntelligenceResult, error)
}

type documentIntelligenceRiskRepository interface {
	List(ctx context.Context, orgIDs []uuid.UUID, status string, category string) ([]*entity.Risk, error)
}

type documentIntelligenceObjectiveRepository interface {
	ListObjectiveCompatibilityRows(ctx context.Context, filter repository.PlanningCompatibilityFilter) ([]*entity.RiskObjective, int, error)
}

type documentIntelligenceTaskRepository interface {
	ListAll(ctx context.Context, orgIDs []uuid.UUID) ([]*entity.MitigationTask, error)
}

type documentIntelligenceOrgRepository interface {
	GetContext(ctx context.Context, id uuid.UUID) (string, error)
}

type AnalyzeDocumentIntelligenceInput struct {
	Mode           entity.DocumentAnalysisMode
	DocumentText   string
	Filename       string
	Period         string
	OrganizationID *uuid.UUID
	OrgIDs         []uuid.UUID
}

type AnalyzeDocumentIntelligenceUseCase struct {
	aiRepo        documentIntelligenceAIRepository
	orgRepo       documentIntelligenceOrgRepository
	riskRepo      documentIntelligenceRiskRepository
	objectiveRepo documentIntelligenceObjectiveRepository
	taskRepo      documentIntelligenceTaskRepository
}

func NewAnalyzeDocumentIntelligenceUseCase(
	aiRepo documentIntelligenceAIRepository,
	orgRepo documentIntelligenceOrgRepository,
	riskRepo documentIntelligenceRiskRepository,
	objectiveRepo documentIntelligenceObjectiveRepository,
	taskRepo documentIntelligenceTaskRepository,
) *AnalyzeDocumentIntelligenceUseCase {
	return &AnalyzeDocumentIntelligenceUseCase{
		aiRepo:        aiRepo,
		orgRepo:       orgRepo,
		riskRepo:      riskRepo,
		objectiveRepo: objectiveRepo,
		taskRepo:      taskRepo,
	}
}

func (uc *AnalyzeDocumentIntelligenceUseCase) Execute(ctx context.Context, input AnalyzeDocumentIntelligenceInput) (*entity.DocumentIntelligenceResult, error) {
	if !entity.IsValidDocumentAnalysisMode(input.Mode) {
		return nil, domainerrors.Wrap(domainerrors.ErrInvalidInput, "invalid document analysis mode")
	}
	if strings.TrimSpace(input.DocumentText) == "" {
		return nil, domainerrors.ErrDocumentUnreadable
	}

	orgIDs := resolveDocumentIntelligenceOrgIDs(input)

	contextOrgID := input.OrganizationID
	if contextOrgID == nil && len(orgIDs) > 0 {
		contextOrgID = &orgIDs[0]
	}

	var orgContext string
	if contextOrgID != nil {
		contextText, err := uc.orgRepo.GetContext(ctx, *contextOrgID)
		if err != nil {
			return nil, fmt.Errorf("failed to load organization context: %w", err)
		}
		orgContext = contextText
	}

	req := entity.DocumentAnalysisRequest{
		Mode:         input.Mode,
		DocumentText: input.DocumentText,
		Filename:     input.Filename,
		Period:       input.Period,
	}

	switch input.Mode {
	case entity.DocumentModeSOPRiskUniverse:
		risks, err := uc.riskRepo.List(ctx, orgIDs, "", "")
		if err != nil {
			return nil, fmt.Errorf("failed to load risks for SOP analysis: %w", err)
		}
		req.ExistingRisksJSON, err = marshalDocumentRiskContexts(buildDocumentRiskContexts(risks))
		if err != nil {
			return nil, fmt.Errorf("failed to encode risks context: %w", err)
		}
	case entity.DocumentModeAuditFindingMapper:
		risks, err := uc.riskRepo.List(ctx, orgIDs, "", "")
		if err != nil {
			return nil, fmt.Errorf("failed to load risks for audit analysis: %w", err)
		}
		req.ExistingRisksJSON, err = marshalDocumentRiskContexts(buildDocumentRiskContexts(risks))
		if err != nil {
			return nil, fmt.Errorf("failed to encode risks context: %w", err)
		}
	case entity.DocumentModeStrategicObjectiveRisk:
		objectives, _, err := uc.objectiveRepo.ListObjectiveCompatibilityRows(ctx, repository.PlanningCompatibilityFilter{
			OrganizationID: contextOrgID,
			Period:         input.Period,
			Page:           1,
			Limit:          500,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to load objectives for strategic analysis: %w", err)
		}
		req.ObjectivesJSON, err = marshalDocumentObjectiveContexts(buildDocumentObjectiveContexts(objectives))
		if err != nil {
			return nil, fmt.Errorf("failed to encode objectives context: %w", err)
		}

		risks, err := uc.riskRepo.List(ctx, orgIDs, "", "")
		if err != nil {
			return nil, fmt.Errorf("failed to load risks for strategic analysis: %w", err)
		}
		req.ExistingRisksJSON, err = marshalDocumentRiskContexts(buildDocumentRiskContexts(risks))
		if err != nil {
			return nil, fmt.Errorf("failed to encode risks context: %w", err)
		}
	case entity.DocumentModeMitigationReportMapper:
		tasks, err := uc.taskRepo.ListAll(ctx, orgIDs)
		if err != nil {
			return nil, fmt.Errorf("failed to load mitigation tasks: %w", err)
		}
		req.OpenTasksJSON, err = marshalDocumentTaskContexts(buildOpenMitigationTaskContexts(tasks))
		if err != nil {
			return nil, fmt.Errorf("failed to encode mitigation task context: %w", err)
		}
	}

	result, err := uc.aiRepo.AnalyzeDocument(ctx, req, orgContext)
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, domainerrors.ErrInternal
	}

	normalizeDocumentIntelligenceResult(result)
	result.Mode = input.Mode
	return result, nil
}

type documentRiskContext struct {
	ID              string   `json:"id"`
	Code            string   `json:"code,omitempty"`
	Title           string   `json:"title"`
	Category        string   `json:"category,omitempty"`
	Description     string   `json:"description,omitempty"`
	RiskSource      string   `json:"riskSource,omitempty"`
	Cause           []string `json:"cause,omitempty"`
	ImpactDesc      []string `json:"impactDesc,omitempty"`
	ExistingControl string   `json:"existingControl,omitempty"`
	TreatmentOption string   `json:"treatmentOption,omitempty"`
	Probability     int      `json:"probability,omitempty"`
	Impact          int      `json:"impact,omitempty"`
	AssessmentCycle string   `json:"assessmentCycle,omitempty"`
	OrgName         string   `json:"orgName,omitempty"`
}

type documentObjectiveContext struct {
	ID                    string `json:"id"`
	Period                string `json:"period"`
	Tujuan                string `json:"tujuan"`
	Sasaran               string `json:"sasaran"`
	IndikatorKinerjaUtama string `json:"indikatorKinerjaUtama"`
	Target                string `json:"target,omitempty"`
	Program               string `json:"program,omitempty"`
	Kegiatan              string `json:"kegiatan,omitempty"`
	ROTitle               string `json:"roTitle,omitempty"`
	ProcessBusiness       string `json:"processBusiness,omitempty"`
	Status                string `json:"status,omitempty"`
}

type documentMitigationTaskContext struct {
	ID               string `json:"id"`
	RiskID           string `json:"riskId"`
	RiskCode         string `json:"riskCode"`
	RiskTitle        string `json:"riskTitle"`
	MitigationAction string `json:"mitigationAction"`
	MitigationOwner  string `json:"mitigationOwner,omitempty"`
	PeriodLabel      string `json:"periodLabel"`
	DueDate          string `json:"dueDate,omitempty"`
	Status           string `json:"status"`
	ProgressPct      int    `json:"progressPct,omitempty"`
	Notes            string `json:"notes,omitempty"`
}

func buildDocumentRiskContexts(risks []*entity.Risk) []documentRiskContext {
	result := make([]documentRiskContext, 0, len(risks))
	for _, risk := range risks {
		if risk == nil {
			continue
		}
		result = append(result, documentRiskContext{
			ID:              risk.ID.String(),
			Code:            risk.Code,
			Title:           risk.Title,
			Category:        risk.Category,
			Description:     risk.Description,
			RiskSource:      risk.RiskSource,
			Cause:           append([]string(nil), risk.Cause...),
			ImpactDesc:      append([]string(nil), risk.ImpactDesc...),
			ExistingControl: risk.ExistingControl,
			TreatmentOption: risk.TreatmentOption,
			Probability:     risk.Probability,
			Impact:          risk.Impact,
			AssessmentCycle: risk.AssessmentCycle,
			OrgName:         risk.OrgName,
		})
	}
	return result
}

func buildDocumentObjectiveContexts(objectives []*entity.RiskObjective) []documentObjectiveContext {
	result := make([]documentObjectiveContext, 0, len(objectives))
	for _, objective := range objectives {
		if objective == nil {
			continue
		}
		result = append(result, documentObjectiveContext{
			ID:                    objective.ID.String(),
			Period:                objective.Period,
			Tujuan:                objective.Tujuan,
			Sasaran:               objective.Sasaran,
			IndikatorKinerjaUtama: objective.IndikatorKinerjaUtama,
			Target:                objective.Target,
			Program:               objective.Program,
			Kegiatan:              objective.Kegiatan,
			ROTitle:               objective.ProcessBusiness,
			ProcessBusiness:       objective.ProcessBusiness,
			Status:                objective.Status,
		})
	}
	return result
}

func buildOpenMitigationTaskContexts(tasks []*entity.MitigationTask) []documentMitigationTaskContext {
	result := make([]documentMitigationTaskContext, 0, len(tasks))
	for _, task := range tasks {
		if task == nil || strings.EqualFold(task.Status, "done") {
			continue
		}
		result = append(result, documentMitigationTaskContext{
			ID:               task.ID.String(),
			RiskID:           task.RiskID.String(),
			RiskCode:         task.RiskCode,
			RiskTitle:        task.RiskTitle,
			MitigationAction: task.MitigationAction,
			MitigationOwner:  task.MitigationOwner,
			PeriodLabel:      task.PeriodLabel,
			DueDate:          task.DueDate,
			Status:           task.Status,
			ProgressPct:      task.ProgressPct,
			Notes:            task.Notes,
		})
	}
	return result
}

func resolveDocumentIntelligenceOrgIDs(input AnalyzeDocumentIntelligenceInput) []uuid.UUID {
	if len(input.OrgIDs) > 0 {
		return input.OrgIDs
	}
	if input.OrganizationID != nil {
		return []uuid.UUID{*input.OrganizationID}
	}
	return nil
}

func marshalDocumentRiskContexts(v any) (string, error) {
	b, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func marshalDocumentObjectiveContexts(v any) (string, error) {
	b, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func marshalDocumentTaskContexts(v any) (string, error) {
	b, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func normalizeDocumentIntelligenceResult(result *entity.DocumentIntelligenceResult) {
	switch {
	case result == nil:
		return
	case result.SOP != nil:
		for i := range result.SOP.ProcessStages {
			stage := &result.SOP.ProcessStages[i]
			stage.ClientKey = sanitizeDocumentClientKey(stage.ClientKey, stage.StageName)
			stage.Confidence = clampConfidence(stage.Confidence)
			stage.SourceRefs = normalizeSourceRefs(stage.SourceRefs)
			for j := range stage.SuggestedRisks {
				stage.SuggestedRisks[j] = normalizeDocumentRiskSuggestion(stage.SuggestedRisks[j])
			}
		}
	case result.Audit != nil:
		for i := range result.Audit.Findings {
			finding := &result.Audit.Findings[i]
			finding.ClientKey = sanitizeDocumentClientKey(finding.ClientKey, finding.FindingTitle)
			finding.Confidence = clampConfidence(finding.Confidence)
			finding.SourceRefs = normalizeSourceRefs(finding.SourceRefs)
			if finding.SuggestedRisk != nil {
				suggestion := normalizeDocumentRiskSuggestion(*finding.SuggestedRisk)
				finding.SuggestedRisk = &suggestion
			}
		}
	case result.Strategic != nil:
		for i := range result.Strategic.Objectives {
			objective := &result.Strategic.Objectives[i]
			objective.ClientKey = sanitizeDocumentClientKey(objective.ClientKey, objective.Sasaran)
			objective.Confidence = clampConfidence(objective.Confidence)
			objective.SourceRefs = normalizeSourceRefs(objective.SourceRefs)
			for j := range objective.IKUs {
				iku := &objective.IKUs[j]
				iku.ClientKey = sanitizeDocumentClientKey(iku.ClientKey, iku.Name)
				iku.Confidence = clampConfidence(iku.Confidence)
				iku.SourceRefs = normalizeSourceRefs(iku.SourceRefs)
				for k := range iku.SuggestedRisks {
					iku.SuggestedRisks[k] = normalizeDocumentRiskSuggestion(iku.SuggestedRisks[k])
				}
			}
		}
	case result.Mitigation != nil:
		for i := range result.Mitigation.TaskMatches {
			match := &result.Mitigation.TaskMatches[i]
			match.ClientKey = sanitizeDocumentClientKey(match.ClientKey, match.TaskID)
			match.Confidence = clampConfidence(match.Confidence)
			match.ProgressPct = clampProgress(match.ProgressPct)
			match.SuggestedStatus = normalizeDocumentMitigationStatus(match.SuggestedStatus)
			match.SourceRefs = normalizeSourceRefs(match.SourceRefs)
		}
	}
}

func normalizeDocumentRiskSuggestion(s entity.DocumentRiskSuggestion) entity.DocumentRiskSuggestion {
	s.ClientKey = sanitizeDocumentClientKey(s.ClientKey, s.Title)
	s.Category = normalizeDocumentRiskCategory(s.Category)
	s.RiskSource = normalizeDocumentRiskSource(s.RiskSource)
	s.TreatmentOption = normalizeDocumentTreatmentOption(s.TreatmentOption)
	s.Probability = clampRiskScore(s.Probability)
	s.Impact = clampRiskScore(s.Impact)
	s.Confidence = clampConfidence(s.Confidence)
	s.SourceRefs = normalizeSourceRefs(s.SourceRefs)
	return s
}

func normalizeDocumentRiskCategory(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "", "operasional":
		return entity.RiskCategoryOperasional
	case "kebijakan", "strategis", "strategic":
		return entity.RiskCategoryKebijakan
	case "kepatuhan":
		return entity.RiskCategoryKepatuhan
	case "fraud", "fraud_korupsi", "korupsi":
		return entity.RiskCategoryFraud
	case "reputasi":
		return entity.RiskCategoryReputasi
	case "legal":
		return entity.RiskCategoryLegal
	default:
		return entity.RiskCategoryOperasional
	}
}

func normalizeDocumentRiskSource(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "internal":
		return "internal"
	case "eksternal", "external":
		return "eksternal"
	default:
		return "internal"
	}
}

func normalizeDocumentTreatmentOption(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "avoid", "hindari", "menghindari", "menghindari risiko":
		return "avoid"
	case "transfer", "berbagi", "berbagi risiko":
		return "transfer"
	case "mitigate", "mitigasi", "mitigasi risiko":
		return "mitigate"
	case "accept", "terima", "menerima", "menerima risiko":
		return "accept"
	default:
		return "mitigate"
	}
}

func normalizeDocumentMitigationStatus(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "done", "on_track", "blocked", "pending":
		return strings.TrimSpace(strings.ToLower(value))
	default:
		return "pending"
	}
}

func normalizeSourceRefs(refs []entity.DocumentSourceRef) []entity.DocumentSourceRef {
	result := make([]entity.DocumentSourceRef, 0, len(refs))
	for _, ref := range refs {
		quote := strings.TrimSpace(ref.Quote)
		if quote == "" {
			continue
		}
		result = append(result, entity.DocumentSourceRef{
			Quote:    quote,
			Location: strings.TrimSpace(ref.Location),
		})
	}
	return result
}

func sanitizeDocumentClientKey(value string, fallback string) string {
	if trimmed := strings.TrimSpace(value); trimmed != "" {
		return trimmed
	}
	trimmedFallback := strings.TrimSpace(fallback)
	if trimmedFallback == "" {
		return "doc-" + uuid.NewString()
	}
	key := strings.ToLower(trimmedFallback)
	key = strings.ReplaceAll(key, " ", "-")
	key = strings.ReplaceAll(key, "_", "-")
	key = strings.ReplaceAll(key, "/", "-")
	return key
}

func clampRiskScore(value int) int {
	if value < 1 {
		return 1
	}
	if value > 5 {
		return 5
	}
	return value
}

func clampProgress(value int) int {
	if value < 0 {
		return 0
	}
	if value > 100 {
		return 100
	}
	return value
}

func clampConfidence(value int) int {
	if value < 0 {
		return 0
	}
	if value > 100 {
		return 100
	}
	return value
}
