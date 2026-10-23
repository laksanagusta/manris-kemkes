package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/service/sensitivedata"
)

const maxDocumentAnalysisTasks = 50
const maxDocumentTaskContextBytes = 24000

type documentIntelligenceAIRepository interface {
	AnalyzeDocument(context.Context, entity.DocumentAnalysisRequest) (*entity.DocumentIntelligenceResult, error)
}

type documentIntelligenceTaskRepository interface {
	ListForDocumentAnalysis(context.Context, []uuid.UUID, int) ([]entity.DocumentMitigationTaskContext, error)
}

type AnalyzeDocumentIntelligenceInput struct {
	Mode           entity.DocumentAnalysisMode
	DocumentText   string
	Period         string // Legacy caller input is ignored; periods come from active tasks.
	OrganizationID *uuid.UUID
	OrgIDs         []uuid.UUID
}

type AnalyzeDocumentIntelligenceUseCase struct {
	aiRepo   documentIntelligenceAIRepository
	taskRepo documentIntelligenceTaskRepository
}

func NewAnalyzeDocumentIntelligenceUseCase(aiRepo documentIntelligenceAIRepository, taskRepo documentIntelligenceTaskRepository) *AnalyzeDocumentIntelligenceUseCase {
	return &AnalyzeDocumentIntelligenceUseCase{aiRepo: aiRepo, taskRepo: taskRepo}
}

func (uc *AnalyzeDocumentIntelligenceUseCase) Execute(ctx context.Context, input AnalyzeDocumentIntelligenceInput) (*entity.DocumentIntelligenceResult, error) {
	if !entity.IsValidDocumentAnalysisMode(input.Mode) {
		return nil, domainerrors.Wrap(domainerrors.ErrInvalidInput, "mode analisis dokumen tidak valid")
	}
	if strings.TrimSpace(input.DocumentText) == "" {
		return nil, domainerrors.ErrDocumentUnreadable
	}
	if err := sensitivedata.Validate(input.DocumentText, sensitivedata.Document); err != nil {
		return nil, err
	}
	req := entity.DocumentAnalysisRequest{Mode: input.Mode, DocumentText: input.DocumentText}
	if input.Mode == entity.DocumentModeMitigationReportMapper {
		orgIDs := resolveDocumentIntelligenceOrgIDs(input)
		if len(orgIDs) != 1 {
			return nil, domainerrors.Wrap(domainerrors.ErrInvalidInput, "Organisasi akun belum tersedia. Hubungi administrator untuk menghubungkan akun ke satu organisasi.")
		}
		tasks, err := uc.taskRepo.ListForDocumentAnalysis(ctx, orgIDs, maxDocumentAnalysisTasks+1)
		if err != nil {
			return nil, fmt.Errorf("failed to load document analysis tasks: %w", err)
		}
		if len(tasks) > maxDocumentAnalysisTasks {
			return nil, domainerrors.Wrap(domainerrors.ErrInvalidInput, "Tugas mitigasi aktif melebihi batas 50 kandidat. Gunakan pelaporan manual untuk sementara.")
		}
		if len(tasks) == 0 {
			return nil, domainerrors.Wrap(domainerrors.ErrInvalidInput, "Tidak ada tugas mitigasi terbuka pada profil risiko aktif organisasi Anda.")
		}
		if err := sensitivedata.ValidateTaskContext("", tasks); err != nil {
			return nil, err
		}
		encoded, err := json.Marshal(tasks)
		if err != nil {
			return nil, fmt.Errorf("failed to encode document analysis tasks: %w", err)
		}
		if len(encoded) > maxDocumentTaskContextBytes {
			return nil, domainerrors.Wrap(domainerrors.ErrInvalidInput, "Konteks tugas mitigasi terlalu besar. Gunakan pelaporan manual untuk sementara.")
		}
		periods := make([]string, 0)
		seenPeriods := make(map[string]bool)
		for _, task := range tasks {
			if !seenPeriods[task.PeriodLabel] {
				seenPeriods[task.PeriodLabel] = true
				periods = append(periods, task.PeriodLabel)
			}
		}
		sort.Strings(periods)
		req.Period, req.OpenTasksJSON = strings.Join(periods, ", "), string(encoded)
	}
	result, err := uc.aiRepo.AnalyzeDocument(ctx, req)
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, domainerrors.ErrInternal
	}
	normalizeDocumentIntelligenceResult(result)
	result.Mode = input.Mode
	if input.Mode == entity.DocumentModeRiskEventExtraction {
		if result.Kejadian == nil {
			return nil, domainerrors.ErrInternal
		}
		normalizeRiskEventExtraction(result.Kejadian, input.DocumentText)
	}
	return result, nil
}

func resolveDocumentIntelligenceOrgIDs(input AnalyzeDocumentIntelligenceInput) []uuid.UUID {
	if input.OrganizationID != nil {
		return []uuid.UUID{*input.OrganizationID}
	}
	return input.OrgIDs
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
	case result.Mitigation != nil:
		for i := range result.Mitigation.TaskMatches {
			match := &result.Mitigation.TaskMatches[i]
			match.ClientKey = sanitizeDocumentClientKey(match.ClientKey, match.TaskID)
			match.Confidence = clampConfidence(match.Confidence)
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

func clampConfidence(value int) int {
	if value < 0 {
		return 0
	}
	if value > 100 {
		return 100
	}
	return value
}
