package ai

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type fakeDocumentAIRepo struct {
	lastReq       entity.DocumentAnalysisRequest
	lastOrgContext string
	result        *entity.DocumentIntelligenceResult
	err           error
}

func (r *fakeDocumentAIRepo) AnalyzeDocument(_ context.Context, req entity.DocumentAnalysisRequest, orgContext string) (*entity.DocumentIntelligenceResult, error) {
	r.lastReq = req
	r.lastOrgContext = orgContext
	if r.err != nil {
		return nil, r.err
	}
	return r.result, nil
}

type fakeDocumentRiskRepo struct {
	risks         []*entity.Risk
	lastOrgIDs    []uuid.UUID
	lastStatus    string
	lastCategory  string
	err           error
}

func (r *fakeDocumentRiskRepo) List(_ context.Context, orgIDs []uuid.UUID, status string, category string) ([]*entity.Risk, error) {
	r.lastOrgIDs = append([]uuid.UUID(nil), orgIDs...)
	r.lastStatus = status
	r.lastCategory = category
	return r.risks, r.err
}

type fakeDocumentObjectiveRepo struct {
	objectives []*entity.RiskObjective
	lastFilter repository.PlanningCompatibilityFilter
	err        error
}

func (r *fakeDocumentObjectiveRepo) ListROOptions(context.Context, repository.PlanningROOptionFilter) ([]entity.PlanningROOption, error) {
	return nil, nil
}

func (r *fakeDocumentObjectiveRepo) ListObjectiveCompatibilityRows(_ context.Context, filter repository.PlanningCompatibilityFilter) ([]*entity.RiskObjective, int, error) {
	r.lastFilter = filter
	return r.objectives, len(r.objectives), r.err
}

type fakeDocumentTaskRepo struct {
	tasks      []*entity.MitigationTask
	lastOrgIDs []uuid.UUID
	err        error
}

func (r *fakeDocumentTaskRepo) ListAll(_ context.Context, orgIDs []uuid.UUID) ([]*entity.MitigationTask, error) {
	r.lastOrgIDs = append([]uuid.UUID(nil), orgIDs...)
	return r.tasks, r.err
}

type fakeDocumentOrgRepo struct {
	ctx string
	err error
}

func (r *fakeDocumentOrgRepo) GetContext(context.Context, uuid.UUID) (string, error) {
	return r.ctx, r.err
}

func TestAnalyzeDocumentIntelligenceRejectsInvalidMode(t *testing.T) {
	uc := NewAnalyzeDocumentIntelligenceUseCase(
		&fakeDocumentAIRepo{},
		&fakeDocumentOrgRepo{},
		&fakeDocumentRiskRepo{},
		&fakeDocumentObjectiveRepo{},
		&fakeDocumentTaskRepo{},
	)

	_, err := uc.Execute(context.Background(), AnalyzeDocumentIntelligenceInput{
		Mode:         "bad_mode",
		DocumentText: "isi dokumen",
	})
	if !errors.Is(err, domainerrors.ErrInvalidInput) {
		t.Fatalf("expected invalid input error, got %v", err)
	}
}

func TestAnalyzeDocumentIntelligenceRejectsEmptyDocument(t *testing.T) {
	uc := NewAnalyzeDocumentIntelligenceUseCase(
		&fakeDocumentAIRepo{},
		&fakeDocumentOrgRepo{},
		&fakeDocumentRiskRepo{},
		&fakeDocumentObjectiveRepo{},
		&fakeDocumentTaskRepo{},
	)

	_, err := uc.Execute(context.Background(), AnalyzeDocumentIntelligenceInput{
		Mode:         entity.DocumentModeSOPRiskUniverse,
		DocumentText: "   ",
	})
	if !errors.Is(err, domainerrors.ErrDocumentUnreadable) {
		t.Fatalf("expected document unreadable error, got %v", err)
	}
}

func TestAnalyzeDocumentIntelligenceFiltersOpenMitigationTasksAndNormalizesResult(t *testing.T) {
	orgID := uuid.New()
	pendingTaskID := uuid.New()
	doneTaskID := uuid.New()
	aiRepo := &fakeDocumentAIRepo{
		result: &entity.DocumentIntelligenceResult{
			Mitigation: &entity.MitigationReportMapperResult{
				TaskMatches: []entity.MitigationTaskReportSuggestion{{
					ClientKey:       "",
					TaskID:          pendingTaskID.String(),
					RiskCode:        "R-001",
					RiskTitle:       "Terlambat laporan",
					MitigationAction: "Susun checklist",
					PeriodLabel:     "2026-H1",
					SuggestedStatus: "something-else",
					ProgressPct:     123,
					ActualCost:      0,
					ReportNotes:     "Ringkasan laporan",
					Confidence:      180,
					SourceRefs: []entity.DocumentSourceRef{{Quote: " checklist sudah dipakai ", Location: " Halaman 3 "}},
				}},
			},
		},
	}
	taskRepo := &fakeDocumentTaskRepo{
		tasks: []*entity.MitigationTask{
			{
				ID:               pendingTaskID,
				RiskID:           uuid.New(),
				RiskCode:         "R-001",
				RiskTitle:        "Terlambat laporan",
				MitigationAction: "Susun checklist",
				PeriodLabel:      "2026-H1",
				DueDate:          "2026-05-30",
				Status:           "pending",
				ProgressPct:      0,
			},
			{
				ID:               doneTaskID,
				RiskID:           uuid.New(),
				RiskCode:         "R-002",
				RiskTitle:        "Selesai",
				MitigationAction: "Aksi selesai",
				PeriodLabel:      "2026-H1",
				DueDate:          "2026-05-30",
				Status:           "done",
				ProgressPct:      100,
			},
		},
	}
	uc := NewAnalyzeDocumentIntelligenceUseCase(
		aiRepo,
		&fakeDocumentOrgRepo{ctx: "Konteks organisasi"},
		&fakeDocumentRiskRepo{},
		&fakeDocumentObjectiveRepo{},
		taskRepo,
	)

	result, err := uc.Execute(context.Background(), AnalyzeDocumentIntelligenceInput{
		Mode:           entity.DocumentModeMitigationReportMapper,
		DocumentText:   "Checklist laporan sudah dipakai.",
		Filename:       "laporan.xlsx",
		Period:         "2026-H1",
		OrganizationID: &orgID,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Mode != entity.DocumentModeMitigationReportMapper {
		t.Fatalf("expected mitigation mode, got %q", result.Mode)
	}
	if aiRepo.lastOrgContext != "Konteks organisasi" {
		t.Fatalf("expected org context to be passed, got %q", aiRepo.lastOrgContext)
	}
	if got := len(taskRepo.lastOrgIDs); got != 1 || taskRepo.lastOrgIDs[0] != orgID {
		t.Fatalf("expected task repo to receive orgID, got %v", taskRepo.lastOrgIDs)
	}
	if got := len(aiRepo.lastReq.OpenTasksJSON); got == 0 {
		t.Fatal("expected open task context to be passed to AI")
	}

	var tasks []map[string]any
	if err := json.Unmarshal([]byte(aiRepo.lastReq.OpenTasksJSON), &tasks); err != nil {
		t.Fatalf("unmarshal open tasks json: %v", err)
	}
	if len(tasks) != 1 {
		t.Fatalf("expected only open task in AI context, got %d", len(tasks))
	}
	if tasks[0]["riskCode"] != "R-001" {
		t.Fatalf("expected pending task only, got %v", tasks[0]["riskCode"])
	}

	match := result.Mitigation.TaskMatches[0]
	if match.ClientKey == "" {
		t.Fatal("expected client key to be normalized")
	}
	if match.Confidence != 100 {
		t.Fatalf("expected confidence clamped to 100, got %d", match.Confidence)
	}
	if match.ProgressPct != 100 {
		t.Fatalf("expected progress clamped to 100, got %d", match.ProgressPct)
	}
	if match.SuggestedStatus != "pending" {
		t.Fatalf("expected status normalized to pending, got %q", match.SuggestedStatus)
	}
	if len(match.SourceRefs) != 1 || match.SourceRefs[0].Quote != "checklist sudah dipakai" || match.SourceRefs[0].Location != "Halaman 3" {
		t.Fatalf("expected source refs trimmed and preserved, got %+v", match.SourceRefs)
	}
}

func TestAnalyzeDocumentIntelligenceStrategicModeIncludesROContext(t *testing.T) {
	orgID := uuid.New()
	aiRepo := &fakeDocumentAIRepo{result: &entity.DocumentIntelligenceResult{Strategic: &entity.StrategicObjectiveRiskResult{}}}
	objectiveRepo := &fakeDocumentObjectiveRepo{
		objectives: []*entity.RiskObjective{
			{
				ID:                    uuid.New(),
				OrganizationID:        orgID,
				Period:                "2027",
				Tujuan:                "Tujuan A",
				Sasaran:               "Sasaran A",
				IndikatorKinerjaUtama: "IKU A",
				Target:                "90%",
				Program:               "Program A",
				Kegiatan:              "Kegiatan A",
				ProcessBusiness:       "RO A",
				Status:                "draft",
			},
		},
	}

	uc := NewAnalyzeDocumentIntelligenceUseCase(
		aiRepo,
		&fakeDocumentOrgRepo{ctx: "Konteks organisasi"},
		&fakeDocumentRiskRepo{},
		objectiveRepo,
		&fakeDocumentTaskRepo{},
	)

	_, err := uc.Execute(context.Background(), AnalyzeDocumentIntelligenceInput{
		Mode:           entity.DocumentModeStrategicObjectiveRisk,
		DocumentText:   "Sasaran A dengan IKU A dan RO A",
		Period:         "2027",
		OrganizationID: &orgID,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	var objectives []map[string]any
	if err := json.Unmarshal([]byte(aiRepo.lastReq.ObjectivesJSON), &objectives); err != nil {
		t.Fatalf("unmarshal objectives json: %v", err)
	}
	if len(objectives) != 1 {
		t.Fatalf("expected one objective context, got %d", len(objectives))
	}
	if objectives[0]["roTitle"] != "RO A" {
		t.Fatalf("expected roTitle to be included, got %v", objectives[0]["roTitle"])
	}
	if objectives[0]["processBusiness"] != "RO A" {
		t.Fatalf("expected processBusiness compatibility to stay, got %v", objectives[0]["processBusiness"])
	}
}

func TestNormalizeDocumentRiskSuggestionMapsEnumsAndClampsScores(t *testing.T) {
	got := normalizeDocumentRiskSuggestion(entity.DocumentRiskSuggestion{
		Title:           " Risiko Strategis ",
		Category:        "strategis",
		RiskSource:      "external",
		TreatmentOption: "mitigasi",
		Probability:     9,
		Impact:          0,
		Confidence:      120,
		SourceRefs: []entity.DocumentSourceRef{
			{Quote: "  kutipan  ", Location: " Halaman 1 "},
			{Quote: " ", Location: "  "},
		},
	})

	if got.Category != entity.RiskCategoryKebijakan {
		t.Fatalf("expected strategic category to map to kebijakan, got %q", got.Category)
	}
	if got.RiskSource != "eksternal" {
		t.Fatalf("expected external to map to eksternal, got %q", got.RiskSource)
	}
	if got.TreatmentOption != "mitigate" {
		t.Fatalf("expected treatment option mitigate, got %q", got.TreatmentOption)
	}
	if got.Probability != 5 {
		t.Fatalf("expected probability clamped to 5, got %d", got.Probability)
	}
	if got.Impact != 1 {
		t.Fatalf("expected impact clamped to 1, got %d", got.Impact)
	}
	if got.Confidence != 100 {
		t.Fatalf("expected confidence clamped to 100, got %d", got.Confidence)
	}
	if got.ClientKey == "" {
		t.Fatal("expected client key to be generated from title")
	}
	if len(got.SourceRefs) != 1 || got.SourceRefs[0].Quote != "kutipan" {
		t.Fatalf("expected source refs to be trimmed and filtered, got %+v", got.SourceRefs)
	}
}
