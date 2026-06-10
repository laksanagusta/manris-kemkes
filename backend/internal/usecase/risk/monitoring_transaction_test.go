package risk

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

type fakeMonitoringTransactionRepo struct {
	byID       map[uuid.UUID]*entity.RiskMonitoring
	drafts     map[string]*entity.RiskMonitoring
	finalized  map[string]bool
	created    []*entity.RiskMonitoring
	updated    []*entity.RiskMonitoring
	finalizedR []*entity.Risk
}

func newFakeMonitoringTransactionRepo() *fakeMonitoringTransactionRepo {
	return &fakeMonitoringTransactionRepo{
		byID:      make(map[uuid.UUID]*entity.RiskMonitoring),
		drafts:    make(map[string]*entity.RiskMonitoring),
		finalized: make(map[string]bool),
	}
}

func (f *fakeMonitoringTransactionRepo) GetByID(_ context.Context, id uuid.UUID, _ []uuid.UUID) (*entity.RiskMonitoring, error) {
	m, ok := f.byID[id]
	if !ok {
		return nil, domainerrors.ErrRiskNotFound
	}
	return cloneRiskMonitoringForTest(m), nil
}

func (f *fakeMonitoringTransactionRepo) GetDraftBySourceAndCycle(_ context.Context, sourceRiskID uuid.UUID, cycle string) (*entity.RiskMonitoring, error) {
	if m, ok := f.drafts[sourceRiskID.String()+"|"+cycle]; ok {
		return cloneRiskMonitoringForTest(m), nil
	}
	return nil, nil
}

func (f *fakeMonitoringTransactionRepo) HasFinalizedForSourceAndCycle(_ context.Context, sourceRiskID uuid.UUID, cycle string) (bool, error) {
	return f.finalized[sourceRiskID.String()+"|"+cycle], nil
}

func (f *fakeMonitoringTransactionRepo) Create(_ context.Context, monitoring *entity.RiskMonitoring) error {
	if monitoring.ID == uuid.Nil {
		monitoring.ID = uuid.New()
	}
	clone := cloneRiskMonitoringForTest(monitoring)
	f.byID[monitoring.ID] = clone
	f.drafts[monitoring.SourceRiskID.String()+"|"+monitoring.AssessmentCycle] = clone
	f.created = append(f.created, clone)
	return nil
}

func (f *fakeMonitoringTransactionRepo) UpdateDraft(_ context.Context, monitoring *entity.RiskMonitoring) error {
	clone := cloneRiskMonitoringForTest(monitoring)
	f.byID[monitoring.ID] = clone
	f.drafts[monitoring.SourceRiskID.String()+"|"+monitoring.AssessmentCycle] = clone
	f.updated = append(f.updated, clone)
	return nil
}

func (f *fakeMonitoringTransactionRepo) Finalize(_ context.Context, monitoringID uuid.UUID, resultRisk *entity.Risk, finalizedBy uuid.UUID) (*entity.RiskMonitoring, error) {
	m, ok := f.byID[monitoringID]
	if !ok {
		return nil, domainerrors.ErrRiskNotFound
	}
	res := cloneRiskMonitoringForTest(m)
	res.Status = entity.RiskMonitoringStatusFinalized
	res.FinalizedBy = &finalizedBy
	now := time.Now().UTC()
	res.FinalizedAt = &now
	resultClone := *resultRisk
	f.finalizedR = append(f.finalizedR, &resultClone)
	res.ResultRiskID = &resultClone.ID
	res.ResultRisk = &resultClone
	f.byID[monitoringID] = res
	delete(f.drafts, res.SourceRiskID.String()+"|"+res.AssessmentCycle)
	f.finalized[res.SourceRiskID.String()+"|"+res.AssessmentCycle] = true
	return cloneRiskMonitoringForTest(res), nil
}

func cloneRiskMonitoringForTest(src *entity.RiskMonitoring) *entity.RiskMonitoring {
	if src == nil {
		return nil
	}
	clone := *src
	if src.DraftPayload != nil {
		clone.DraftPayload = src.DraftPayload.Clone()
	}
	clone.DraftCause = append([]string(nil), src.DraftCause...)
	clone.DraftImpactDesc = append([]string(nil), src.DraftImpactDesc...)
	clone.ProfileChangeSummary = append([]string(nil), src.ProfileChangeSummary...)
	clone.DraftMitigations = append([]entity.Mitigation(nil), src.DraftMitigations...)
	if src.SourceRisk != nil {
		source := *src.SourceRisk
		clone.SourceRisk = &source
	}
	if src.ResultRisk != nil {
		result := *src.ResultRisk
		clone.ResultRisk = &result
	}
	return &clone
}

type fakeMonitoringRiskRepoForUsecase struct {
	risks map[uuid.UUID]*entity.Risk
}

func (f *fakeMonitoringRiskRepoForUsecase) GetByID(_ context.Context, id uuid.UUID, _ []uuid.UUID) (*entity.Risk, error) {
	r, ok := f.risks[id]
	if !ok {
		return nil, domainerrors.ErrRiskNotFound
	}
	clone := *r
	clone.Cause = append([]string(nil), r.Cause...)
	clone.ImpactDesc = append([]string(nil), r.ImpactDesc...)
	clone.Mitigations = append([]entity.Mitigation(nil), r.Mitigations...)
	return &clone, nil
}

func (f *fakeMonitoringRiskRepoForUsecase) Create(context.Context, *entity.Risk) error { return nil }

func TestStartMonitoringUseCase_CreatesDraft(t *testing.T) {
	orgID := uuid.New()
	sourceID := uuid.New()
	source := &entity.Risk{
		ID:             sourceID,
		Code:           "R-001",
		Title:          "Source risk",
		Category:       entity.RiskCategoryOperasional,
		Status:         entity.RiskStatusApproved,
		VersionGroupID: uuid.New(),
		IsCurrent:      true,
		IsCycleCurrent: true,
		OrganizationID: &orgID,
		Probability:    4,
		Impact:         3,
		Weight:         entity.GetBobot(4, 3),
		Mitigations:    []entity.Mitigation{{Action: "Act", Owner: "Unit"}},
	}

	riskRepo := &fakeMonitoringRiskRepoForUsecase{risks: map[uuid.UUID]*entity.Risk{sourceID: source}}
	monitoringRepo := newFakeMonitoringTransactionRepo()
	uc := NewStartMonitoringUseCase(riskRepo, monitoringRepo)

	out, err := uc.Execute(context.Background(), StartMonitoringInput{
		SourceRiskID: sourceID,
		Cycle:        "2026-H1",
		OrgIDs:       []uuid.UUID{orgID},
		StartedBy:    uuid.New(),
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if out.ExistingDraft {
		t.Fatalf("expected new draft")
	}
	if out.Monitoring == nil || out.Monitoring.Status != entity.RiskMonitoringStatusDraft {
		t.Fatalf("expected draft monitoring, got %#v", out.Monitoring)
	}
	if out.Monitoring.SourceRiskID != sourceID {
		t.Fatalf("expected source risk id %s, got %s", sourceID, out.Monitoring.SourceRiskID)
	}
	if out.RedirectURL != "/risk/monitoring/"+out.Monitoring.ID.String() {
		t.Fatalf("unexpected redirect url %q", out.RedirectURL)
	}
}

func TestUpdateMonitoringUseCase_DetectsProfileRevision(t *testing.T) {
	orgID := uuid.New()
	sourceID := uuid.New()
	monitoringID := uuid.New()
	source := &entity.Risk{
		ID:             sourceID,
		Code:           "R-001",
		Title:          "Source risk",
		Category:       entity.RiskCategoryOperasional,
		Status:         entity.RiskStatusApproved,
		VersionGroupID: uuid.New(),
		IsCurrent:      true,
		IsCycleCurrent: true,
		OrganizationID: &orgID,
		Probability:    4,
		Impact:         3,
		Weight:         entity.GetBobot(4, 3),
	}
	monitoring := entity.NewRiskMonitoringDraft(source, "2026-H1", uuid.New())
	monitoring.ID = monitoringID
	monitoringRepo := newFakeMonitoringTransactionRepo()
	monitoringRepo.byID[monitoringID] = monitoring
	monitoringRepo.drafts[sourceID.String()+"|2026-H1"] = monitoring

	riskRepo := &fakeMonitoringRiskRepoForUsecase{risks: map[uuid.UUID]*entity.Risk{sourceID: source}}
	uc := NewUpdateMonitoringUseCase(riskRepo, monitoringRepo)

	out, err := uc.Execute(context.Background(), UpdateMonitoringInput{
		MonitoringID:                monitoringID,
		OrgIDs:                      []uuid.UUID{orgID},
		ObservedProbability:         3,
		ObservedImpact:              4,
		ConditionSummary:            "Changed",
		EventSummary:                "Event",
		Trend:                       "meningkat",
		EffectivenessConclusion:     "Tidak efektif",
		FollowUpNote:                "Follow up",
		Conclusion:                  "Perlu revisi",
		MitigationProgressSummary:   "60%",
		MitigationCompletionPercent: 60,
		MitigationObstacles:         "Barrier",
		MitigationFollowUp:          "Next step",
		Values: entity.RiskMonitoringDraftValues{
			Title:                "Updated source risk",
			Category:             entity.RiskCategoryOperasional,
			Cause:                []string{"cause"},
			RiskSource:           "Source",
			Controllability:      "Controlled",
			ImpactDesc:           []string{"impact"},
			ExistingControl:      "existing",
			ControlEffectiveness: "efektif",
			TreatmentOption:      "accept",
			Mitigations:          []entity.Mitigation{{Action: "New action", Owner: "Unit"}},
			ChangeReason:         "because it changed",
		},
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if out.UpdatedMode != entity.RiskMonitoringModeWithProfileRevision {
		t.Fatalf("expected profile revision mode, got %q", out.UpdatedMode)
	}
	if len(out.Monitoring.ProfileChangeSummary) == 0 {
		t.Fatalf("expected changed fields to be recorded")
	}
	expectedWeight := entity.GetBobot(3, 4)
	if out.Monitoring.ObservedWeight != expectedWeight {
		t.Fatalf("expected observed weight %f, got %f", expectedWeight, out.Monitoring.ObservedWeight)
	}
}

func TestFinalizeMonitoringUseCase_BuildsRiskVersion(t *testing.T) {
	orgID := uuid.New()
	sourceID := uuid.New()
	monitoringID := uuid.New()
	source := &entity.Risk{
		ID:             sourceID,
		Code:           "R-001",
		Title:          "Source risk",
		Category:       entity.RiskCategoryOperasional,
		Status:         entity.RiskStatusApproved,
		VersionGroupID: uuid.New(),
		IsCurrent:      true,
		IsCycleCurrent: true,
		VersionNumber:  2,
		OrganizationID: &orgID,
		Probability:    4,
		Impact:         3,
		Weight:         entity.GetBobot(4, 3),
		Mitigations:    []entity.Mitigation{{Action: "Original", Owner: "Unit"}},
	}
	monitoring := entity.NewRiskMonitoringDraft(source, "2026-H1", uuid.New())
	monitoring.ID = monitoringID
	monitoring.Mode = entity.RiskMonitoringModeWithProfileRevision
	monitoring.SetDraftPayload(&entity.RiskMonitoringDraftPayload{
		Title:                "Updated risk",
		Category:             entity.RiskCategoryOperasional,
		Cause:                []string{"new cause"},
		RiskSource:           "Updated source",
		Controllability:      "controlled",
		ImpactDesc:           []string{"impact"},
		ExistingControl:      "existing",
		ControlEffectiveness: "efektif",
		TreatmentOption:      "treat",
		Mitigations:          []entity.Mitigation{{Action: "New action", Owner: "Unit"}},
	})
	monitoring.ObservedProbability = 3
	monitoring.ObservedImpact = 4
	monitoring.CalculateObservedScore()
	monitoring.Conclusion = "Monitoring summary"

	monitoringRepo := newFakeMonitoringTransactionRepo()
	monitoringRepo.byID[monitoringID] = monitoring
	monitoringRepo.drafts[sourceID.String()+"|2026-H1"] = monitoring
	riskRepo := &fakeMonitoringRiskRepoForUsecase{risks: map[uuid.UUID]*entity.Risk{sourceID: source}}
	uc := NewFinalizeMonitoringUseCase(riskRepo, monitoringRepo)

	out, err := uc.Execute(context.Background(), FinalizeMonitoringInput{
		MonitoringID: monitoringID,
		OrgIDs:       []uuid.UUID{orgID},
		FinalizedBy:  uuid.New(),
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if out.Monitoring.Status != entity.RiskMonitoringStatusFinalized {
		t.Fatalf("expected finalized monitoring, got %q", out.Monitoring.Status)
	}
	if len(monitoringRepo.finalizedR) != 1 {
		t.Fatalf("expected one finalized result risk, got %d", len(monitoringRepo.finalizedR))
	}
	resultRisk := monitoringRepo.finalizedR[0]
	if resultRisk.VersionNumber != 3 {
		t.Fatalf("expected version number 3, got %d", resultRisk.VersionNumber)
	}
	if resultRisk.Title != "Updated risk" {
		t.Fatalf("expected updated title, got %q", resultRisk.Title)
	}
	if resultRisk.PreviousRiskID == nil || *resultRisk.PreviousRiskID != sourceID {
		t.Fatalf("expected previous risk id %s, got %#v", sourceID, resultRisk.PreviousRiskID)
	}
	if resultRisk.Probability != 3 || resultRisk.Impact != 4 {
		t.Fatalf("expected observed scoring on result risk, got %d/%d", resultRisk.Probability, resultRisk.Impact)
	}
	if resultRisk.Weight != entity.GetBobot(3, 4) {
		t.Fatalf("expected updated weight, got %f", resultRisk.Weight)
	}
	if resultRisk.ReviewStartedAt == nil {
		t.Fatalf("expected review started at to be set")
	}
}
