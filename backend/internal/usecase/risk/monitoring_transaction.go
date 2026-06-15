package risk

import (
	"context"
	"fmt"
	"log"
	"math"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	domainrepo "github.com/manris/backend/internal/domain/repository"
	mtuc "github.com/manris/backend/internal/usecase/mitigation_task"
)

type monitoringRiskRepository interface {
	GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.Risk, error)
	Create(ctx context.Context, risk *entity.Risk) error
}

type monitoringTransactionRepository interface {
	GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.RiskMonitoring, error)
	GetDraftBySourceAndCycle(ctx context.Context, sourceRiskID uuid.UUID, cycle string) (*entity.RiskMonitoring, error)
	HasFinalizedForSourceAndCycle(ctx context.Context, sourceRiskID uuid.UUID, cycle string) (bool, error)
	GetByVersionGroupAndCycle(ctx context.Context, versionGroupID uuid.UUID, cycle string) (*entity.RiskMonitoring, error)
	Create(ctx context.Context, monitoring *entity.RiskMonitoring) error
	UpdateDraft(ctx context.Context, monitoring *entity.RiskMonitoring) error
	Finalize(ctx context.Context, monitoringID uuid.UUID, resultRisk *entity.Risk, finalizedBy uuid.UUID) (*entity.RiskMonitoring, error)
	UpdateTaskMonitoringIDs(ctx context.Context, monitoringID uuid.UUID, riskID uuid.UUID, cycle string) error
}

type StartMonitoringUseCase struct {
	riskRepo           monitoringRiskRepository
	monitoringRepo     monitoringTransactionRepository
	fullRiskRepo       domainrepo.RiskRepository
	mitigationTaskRepo domainrepo.MitigationTaskRepository
}

type GetMonitoringUseCase struct {
	monitoringRepo monitoringTransactionRepository
}

type UpdateMonitoringUseCase struct {
	riskRepo       monitoringRiskRepository
	monitoringRepo monitoringTransactionRepository
}

type FinalizeMonitoringUseCase struct {
	riskRepo       monitoringRiskRepository
	monitoringRepo monitoringTransactionRepository
	taskRepo       domainrepo.MitigationTaskRepository
	fullRiskRepo   domainrepo.RiskRepository
}

type StartMonitoringInput struct {
	SourceRiskID uuid.UUID
	Cycle        string
	OrgIDs       []uuid.UUID
	StartedBy    uuid.UUID
}

type StartMonitoringOutput struct {
	Monitoring    *entity.RiskMonitoring `json:"monitoring"`
	Message       string                 `json:"message"`
	RedirectURL   string                 `json:"redirectUrl"`
	ExistingDraft bool                   `json:"existingDraft"`
}

type UpdateMonitoringInput struct {
	MonitoringID uuid.UUID
	OrgIDs       []uuid.UUID

	ObservedProbability     int
	ObservedImpact          int
	ConditionSummary        string
	EventSummary            string
	Trend                   string
	EffectivenessConclusion string
	FollowUpNote            string
	Conclusion              string

	MitigationProgressSummary   string
	MitigationCompletionPercent int
	MitigationObstacles         string
	MitigationFollowUp          string

	Values entity.RiskMonitoringDraftValues
}

type UpdateMonitoringOutput struct {
	Monitoring  *entity.RiskMonitoring `json:"monitoring"`
	Message     string                 `json:"message"`
	UpdatedMode string                 `json:"updatedMode"`
}

type FinalizeMonitoringInput struct {
	MonitoringID uuid.UUID
	OrgIDs       []uuid.UUID
	FinalizedBy  uuid.UUID
}

type FinalizeMonitoringOutput struct {
	Monitoring *entity.RiskMonitoring `json:"monitoring"`
	Message    string                 `json:"message"`
}

func NewStartMonitoringUseCase(riskRepo monitoringRiskRepository, monitoringRepo monitoringTransactionRepository, fullRiskRepo domainrepo.RiskRepository, mitigationTaskRepo domainrepo.MitigationTaskRepository) *StartMonitoringUseCase {
	return &StartMonitoringUseCase{riskRepo: riskRepo, monitoringRepo: monitoringRepo, fullRiskRepo: fullRiskRepo, mitigationTaskRepo: mitigationTaskRepo}
}

func NewGetMonitoringUseCase(monitoringRepo monitoringTransactionRepository) *GetMonitoringUseCase {
	return &GetMonitoringUseCase{monitoringRepo: monitoringRepo}
}

func NewUpdateMonitoringUseCase(riskRepo monitoringRiskRepository, monitoringRepo monitoringTransactionRepository) *UpdateMonitoringUseCase {
	return &UpdateMonitoringUseCase{riskRepo: riskRepo, monitoringRepo: monitoringRepo}
}

func NewFinalizeMonitoringUseCase(riskRepo monitoringRiskRepository, monitoringRepo monitoringTransactionRepository, taskRepo domainrepo.MitigationTaskRepository, fullRiskRepo domainrepo.RiskRepository) *FinalizeMonitoringUseCase {
	return &FinalizeMonitoringUseCase{riskRepo: riskRepo, monitoringRepo: monitoringRepo, taskRepo: taskRepo, fullRiskRepo: fullRiskRepo}
}

func (uc *StartMonitoringUseCase) Execute(ctx context.Context, input StartMonitoringInput) (*StartMonitoringOutput, error) {
	if input.SourceRiskID == uuid.Nil || strings.TrimSpace(input.Cycle) == "" {
		return nil, errors.ErrInvalidInput
	}
	if !IsValidCycleFormat(input.Cycle) {
		return nil, errors.Wrap(errors.ErrInvalidInput, "assessment_cycle must be in YYYY-QN format (e.g. 2026-Q1)")
	}

	sourceRisk, err := uc.riskRepo.GetByID(ctx, input.SourceRiskID, input.OrgIDs)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}
	if !sourceRisk.CanBeReassessed() {
		return nil, errors.Wrap(errors.ErrInvalidStatus, "only current approved risks can be monitored")
	}

	if existing, err := uc.monitoringRepo.GetByVersionGroupAndCycle(ctx, sourceRisk.VersionGroupID, input.Cycle); err != nil {
		return nil, errors.Wrap(err, "failed to check existing monitoring for this risk")
	} else if existing != nil {
		if existing.Status == entity.RiskMonitoringStatusFinalized {
			return nil, errors.Wrap(errors.ErrInvalidStatus, "a finalized monitoring already exists for this cycle")
		}
		return &StartMonitoringOutput{
			Monitoring:    existing,
			Message:       "an in-progress monitoring transaction already exists for this cycle, returning existing draft",
			RedirectURL:   "/risk/monitoring/" + existing.ID.String(),
			ExistingDraft: true,
		}, nil
	}

	monitoring := entity.NewRiskMonitoringDraft(sourceRisk, input.Cycle, input.StartedBy)
	if err := uc.monitoringRepo.Create(ctx, monitoring); err != nil {
		return nil, errors.Wrap(err, "failed to create monitoring transaction")
	}

	if uc.mitigationTaskRepo != nil && uc.fullRiskRepo != nil {
		ensureUC := mtuc.NewEnsureTasksForRiskVersionUseCase(uc.mitigationTaskRepo, uc.fullRiskRepo)
		if _, err := ensureUC.Execute(ctx, sourceRisk.ID, input.Cycle, input.OrgIDs); err != nil {
			log.Printf("[WARN] ensure mitigation tasks on monitoring start: %v", err)
		}
		if err := uc.monitoringRepo.UpdateTaskMonitoringIDs(ctx, monitoring.ID, sourceRisk.ID, input.Cycle); err != nil {
			log.Printf("[WARN] link tasks to monitoring: %v", err)
		}
	}

	monitoring.SourceRisk = sourceRisk

	return &StartMonitoringOutput{
		Monitoring:    monitoring,
		Message:       "monitoring transaction created",
		RedirectURL:   "/risk/monitoring/" + monitoring.ID.String(),
		ExistingDraft: false,
	}, nil
}

func (uc *GetMonitoringUseCase) Execute(ctx context.Context, monitoringID uuid.UUID, orgIDs []uuid.UUID) (*entity.RiskMonitoring, error) {
	if monitoringID == uuid.Nil {
		return nil, errors.ErrInvalidInput
	}
	monitoring, err := uc.monitoringRepo.GetByID(ctx, monitoringID, orgIDs)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}
	return monitoring, nil
}

func (uc *UpdateMonitoringUseCase) Execute(ctx context.Context, input UpdateMonitoringInput) (*UpdateMonitoringOutput, error) {
	if input.MonitoringID == uuid.Nil {
		return nil, errors.ErrInvalidInput
	}

	monitoring, err := uc.monitoringRepo.GetByID(ctx, input.MonitoringID, input.OrgIDs)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}
	if monitoring.Status != entity.RiskMonitoringStatusDraft {
		return nil, errors.Wrap(errors.ErrInvalidStatus, "only draft monitoring transactions can be updated")
	}

	sourceRisk, err := uc.riskRepo.GetByID(ctx, monitoring.SourceRiskID, input.OrgIDs)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}
	if !sourceRisk.CanBeReassessed() {
		return nil, errors.Wrap(errors.ErrInvalidStatus, "source risk is no longer active")
	}

	mode, changedFields := entity.DetectRiskMonitoringMode(sourceRisk, &input.Values)

	if input.ObservedProbability < 1 || input.ObservedProbability > 5 {
		return nil, errors.ErrInvalidProbability
	}
	if input.ObservedImpact < 1 || input.ObservedImpact > 5 {
		return nil, errors.ErrInvalidImpact
	}

	monitoring.Mode = mode
	monitoring.ProfileChangeSummary = changedFields
	monitoring.ChangeReason = strings.TrimSpace(input.Values.ChangeReason)
	monitoring.SetDraftPayload(entity.NewRiskMonitoringDraftPayloadFromValues(input.Values))
	monitoring.ObservedProbability = input.ObservedProbability
	monitoring.ObservedImpact = input.ObservedImpact
	monitoring.ConditionSummary = input.ConditionSummary
	monitoring.EventSummary = input.EventSummary
	monitoring.Trend = input.Trend
	monitoring.EffectivenessConclusion = input.EffectivenessConclusion
	monitoring.FollowUpNote = input.FollowUpNote
	monitoring.Conclusion = input.Conclusion
	monitoring.MitigationProgressSummary = input.MitigationProgressSummary
	monitoring.MitigationCompletionPercent = input.MitigationCompletionPercent
	monitoring.MitigationObstacles = input.MitigationObstacles
	monitoring.MitigationFollowUp = input.MitigationFollowUp
	monitoring.CalculateObservedScore()
	monitoring.NormalizeNilaiForStorage()

	if err := monitoring.Validate(); err != nil {
		return nil, err
	}
	if err := uc.monitoringRepo.UpdateDraft(ctx, monitoring); err != nil {
		return nil, errors.Wrap(err, "failed to update monitoring draft")
	}

	message := "monitoring draft updated"
	if mode == entity.RiskMonitoringModeWithProfileRevision {
		message = "monitoring draft updated with profile revision"
	}

	return &UpdateMonitoringOutput{
		Monitoring:  monitoring,
		Message:     message,
		UpdatedMode: mode,
	}, nil
}

func (uc *FinalizeMonitoringUseCase) Execute(ctx context.Context, input FinalizeMonitoringInput) (*FinalizeMonitoringOutput, error) {
	if input.MonitoringID == uuid.Nil {
		return nil, errors.ErrInvalidInput
	}

	monitoring, err := uc.monitoringRepo.GetByID(ctx, input.MonitoringID, input.OrgIDs)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}
	if monitoring.Status != entity.RiskMonitoringStatusDraft {
		return nil, errors.Wrap(errors.ErrInvalidStatus, "only draft monitoring transactions can be finalized")
	}

	if uc.taskRepo != nil {
		counts, err := uc.taskRepo.CountByMonitoringAndStatus(ctx, monitoring.ID, input.OrgIDs)
		if err != nil {
			return nil, errors.Wrap(err, "failed to validate mitigation tasks")
		}
		if counts.Pending > 0 {
			return nil, fmt.Errorf(
				"cannot finalize: %d of %d mitigation tasks are still pending (not reported)",
				counts.Pending, counts.Total,
			)
		}
	}

	sourceRisk, err := uc.riskRepo.GetByID(ctx, monitoring.SourceRiskID, input.OrgIDs)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}
	if !sourceRisk.IsApprovedCurrent() {
		return nil, errors.Wrap(errors.ErrInvalidStatus, "source risk is no longer active")
	}

	resultRisk, err := buildRiskVersionFromMonitoring(sourceRisk, monitoring, input.FinalizedBy)
	if err != nil {
		return nil, err
	}
	if err := resultRisk.Validate(); err != nil {
		return nil, err
	}

	finalizedMonitoring, err := uc.monitoringRepo.Finalize(ctx, monitoring.ID, resultRisk, input.FinalizedBy)
	if err != nil {
		return nil, errors.Wrap(err, "failed to finalize monitoring transaction")
	}

	if uc.fullRiskRepo != nil && uc.taskRepo != nil {
		ensureUC := mtuc.NewEnsureTasksForRiskVersionUseCase(uc.taskRepo, uc.fullRiskRepo)
		nextCycle := nextQuarterCycle(monitoring.AssessmentCycle)
		if _, err := ensureUC.Execute(ctx, resultRisk.ID, nextCycle, input.OrgIDs); err != nil {
			log.Printf("[WARN] ensure mitigation tasks after finalize for next cycle %s: %v", nextCycle, err)
		}
	}

	return &FinalizeMonitoringOutput{
		Monitoring: finalizedMonitoring,
		Message:    "monitoring transaction finalized",
	}, nil
}

func nextQuarterCycle(cycle string) string {
	year, quarter, err := mtuc.ParseQuarterCycle(cycle)
	if err != nil {
		return cycle
	}
	quarter++
	if quarter > 4 {
		quarter = 1
		year++
	}
	return fmt.Sprintf("%d-Q%d", year, quarter)
}

func buildRiskVersionFromMonitoring(source *entity.Risk, monitoring *entity.RiskMonitoring, finalizedBy uuid.UUID) (*entity.Risk, error) {
	clone := *source
	clone.ID = uuid.Nil
	clone.PreviousRiskID = &source.ID
	clone.VersionNumber = source.VersionNumber + 1
	clone.IsCurrent = true
	clone.IsCycleCurrent = true
	clone.Status = entity.RiskStatusApproved
	assessmentCycle, err := QuarterToAssessmentSemester(monitoring.AssessmentCycle)
	if err != nil {
		return nil, err
	}
	clone.AssessmentCycle = assessmentCycle
	clone.ReviewType = "periodic"
	clone.ReviewSummary = monitoring.Conclusion
	clone.ReviewStartedAt = timePtr(monitoring.StartedAt.UTC().Round(time.Second))
	now := time.Now().UTC()
	clone.ReviewSubmittedAt = &now
	clone.ReviewApprovedAt = &now
	if finalizedBy != uuid.Nil {
		clone.CreatedBy = &finalizedBy
	}

	clone.Probability = monitoring.ObservedProbability
	clone.Impact = monitoring.ObservedImpact
	clone.CalculateBobot()
	clone.CalculateNilai()
	clone.CalculateInherentScore()

	clone.Cause = append([]string(nil), source.Cause...)
	clone.ImpactDesc = append([]string(nil), source.ImpactDesc...)
	clone.Mitigations = cloneMitigations(source.Mitigations)

	if monitoring.Mode == entity.RiskMonitoringModeWithProfileRevision {
		draft := monitoring.DraftPayloadSnapshot()
		clone.Title = draft.Title
		clone.Category = draft.Category
		clone.Cause = append([]string(nil), draft.Cause...)
		clone.RiskSource = draft.RiskSource
		clone.Controllability = draft.Controllability
		clone.ImpactDesc = append([]string(nil), draft.ImpactDesc...)
		clone.ExistingControl = draft.ExistingControl
		clone.ControlEffectiveness = draft.ControlEffectiveness
		clone.TreatmentOption = draft.TreatmentOption
		clone.Mitigations = cloneMitigations(draft.Mitigations)
		clone.ChangeReason = monitoring.ChangeReason
		clone.ReviewSummary = monitoring.Conclusion
	}

	return &clone, nil
}

func cloneMitigations(src []entity.Mitigation) []entity.Mitigation {
	if len(src) == 0 {
		return nil
	}
	out := make([]entity.Mitigation, len(src))
	copy(out, src)
	for i := range out {
		out[i].ID = uuid.Nil
		out[i].RiskID = uuid.Nil
	}
	return out
}

func timePtr(v time.Time) *time.Time {
	return &v
}

func scoreFromMonitoring(probability, impact int) int {
	return int(math.Round(float64(probability) * float64(impact) * entity.GetBobot(probability, impact)))
}
