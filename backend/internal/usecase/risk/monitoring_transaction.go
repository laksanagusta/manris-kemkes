package risk

import (
	"context"
	"math"
	"slices"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	domainrepo "github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/timeutil"
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
	ListByVersionGroup(ctx context.Context, versionGroupID uuid.UUID) ([]*entity.RiskMonitoring, error)
	Create(ctx context.Context, monitoring *entity.RiskMonitoring) error
	UpdateDraft(ctx context.Context, monitoring *entity.RiskMonitoring) error
	Finalize(ctx context.Context, monitoringID uuid.UUID, resultRisk *entity.Risk, finalizedBy uuid.UUID, review domainrepo.MonitoringFinalizeReview) (*entity.RiskMonitoring, error)
	UpdateTaskMonitoringIDs(ctx context.Context, monitoringID uuid.UUID, riskID uuid.UUID, cycle string) error
}

// MonitoringPeriodRepository owns the obligation ledger and the previous
// transaction check. It is injected into the start flow so every entry point
// uses the same monitoring policy.
type MonitoringPeriodRepository interface {
	EnsureMonitoringPeriods(ctx context.Context, versionGroupID uuid.UUID, effectiveFrom time.Time, year int) error
	AssertPreviousMonitoringTransactionCompleted(ctx context.Context, versionGroupID uuid.UUID, previousCycle string) error
}

type StartMonitoringUseCase struct {
	now                func() time.Time
	riskRepo           monitoringRiskRepository
	monitoringRepo     monitoringTransactionRepository
	fullRiskRepo       domainrepo.RiskRepository
	mitigationTaskRepo domainrepo.MitigationTaskRepository
	periodRepo         MonitoringPeriodRepository
}

type GetMonitoringUseCase struct {
	monitoringRepo monitoringTransactionRepository
}

type UpdateMonitoringUseCase struct {
	now            func() time.Time
	riskRepo       monitoringRiskRepository
	monitoringRepo monitoringTransactionRepository
}

type FinalizeMonitoringUseCase struct {
	now            func() time.Time
	riskRepo       monitoringRiskRepository
	monitoringRepo monitoringTransactionRepository
	taskRepo       domainrepo.MitigationTaskRepository
	fullRiskRepo   domainrepo.RiskRepository
}

type StartMonitoringInput struct {
	ProfileVersionID    *uuid.UUID
	MonitoringPeriodID  *uuid.UUID
	ObservedAt          string
	SourceRiskID        uuid.UUID
	Cycle               string
	OrgIDs              []uuid.UUID
	StartedBy           uuid.UUID
	ObservedProbability int
	ObservedImpact      int
}

type StartMonitoringOutput struct {
	Monitoring    *entity.RiskMonitoring `json:"monitoring"`
	Message       string                 `json:"message"`
	RedirectURL   string                 `json:"redirectUrl"`
	ExistingDraft bool                   `json:"existingDraft"`
}

type UpdateMonitoringInput struct {
	ObservedAt             string
	ExpectedUpdatedAt      *time.Time
	ObservedScoreConfirmed *bool
	MonitoringID           uuid.UUID
	OrgIDs                 []uuid.UUID

	ObservedProbability int
	ObservedImpact      int
	Conclusion          string

	MitigationProgressSummary   string
	MitigationCompletionPercent int

	Values entity.RiskMonitoringDraftValues
}

type UpdateMonitoringOutput struct {
	Monitoring  *entity.RiskMonitoring `json:"monitoring"`
	Message     string                 `json:"message"`
	UpdatedMode string                 `json:"updatedMode"`
}

type FinalizeMonitoringInput struct {
	ExpectedUpdatedAt *time.Time
	ReportRevision    *string
	MonitoringID      uuid.UUID
	OrgIDs            []uuid.UUID
	FinalizedBy       uuid.UUID
}

type FinalizeMonitoringOutput struct {
	Monitoring *entity.RiskMonitoring `json:"monitoring"`
	Message    string                 `json:"message"`
}

func NewStartMonitoringUseCase(riskRepo monitoringRiskRepository, monitoringRepo monitoringTransactionRepository, fullRiskRepo domainrepo.RiskRepository, mitigationTaskRepo domainrepo.MitigationTaskRepository, periodRepo MonitoringPeriodRepository) *StartMonitoringUseCase {
	return &StartMonitoringUseCase{now: timeutil.BusinessNow, riskRepo: riskRepo, monitoringRepo: monitoringRepo, fullRiskRepo: fullRiskRepo, mitigationTaskRepo: mitigationTaskRepo, periodRepo: periodRepo}
}

func NewGetMonitoringUseCase(monitoringRepo monitoringTransactionRepository) *GetMonitoringUseCase {
	return &GetMonitoringUseCase{monitoringRepo: monitoringRepo}
}

func NewUpdateMonitoringUseCase(riskRepo monitoringRiskRepository, monitoringRepo monitoringTransactionRepository) *UpdateMonitoringUseCase {
	return &UpdateMonitoringUseCase{now: timeutil.BusinessNow, riskRepo: riskRepo, monitoringRepo: monitoringRepo}
}

func NewFinalizeMonitoringUseCase(riskRepo monitoringRiskRepository, monitoringRepo monitoringTransactionRepository, taskRepo domainrepo.MitigationTaskRepository, fullRiskRepo domainrepo.RiskRepository) *FinalizeMonitoringUseCase {
	return &FinalizeMonitoringUseCase{now: timeutil.BusinessNow, riskRepo: riskRepo, monitoringRepo: monitoringRepo, taskRepo: taskRepo, fullRiskRepo: fullRiskRepo}
}

func (uc *StartMonitoringUseCase) Execute(ctx context.Context, input StartMonitoringInput) (*StartMonitoringOutput, error) {
	if input.SourceRiskID == uuid.Nil {
		return nil, errors.ErrInvalidInput
	}
	inferredDate := input.ObservedAt == "" && input.Cycle != ""
	observedAt, cycle, err := ResolveMonitoringObservation(input.ObservedAt, input.Cycle, uc.now())
	if err != nil {
		return nil, err
	}
	input.ObservedAt, input.Cycle = observedAt, cycle

	sourceRisk, err := uc.riskRepo.GetByID(ctx, input.SourceRiskID, input.OrgIDs)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}
	if sourceRisk.Status != entity.RiskStatusFinal {
		return nil, errors.ErrOnlyApprovedCurrentMonitored
	}
	if _, ok := uc.riskRepo.(monitoringSourceResolver); !ok && !sourceRisk.CanBeReassessed() {
		return nil, errors.ErrOnlyApprovedCurrentMonitored
	}
	if resolver, ok := uc.riskRepo.(monitoringSourceResolver); ok {
		sourceRisk, err = resolver.ResolveMonitoringSource(ctx, sourceRisk.VersionGroupID, input.ObservedAt, input.OrgIDs)
		if err != nil {
			return nil, errors.ErrMonitoringBeforeRiskEffective
		}
	}
	if err := validateObservationAfterSource(sourceRisk, input.ObservedAt); err != nil {
		return nil, err
	}
	if validator, ok := uc.monitoringRepo.(interface {
		ValidateMonitoringContext(context.Context, *entity.Risk, *uuid.UUID, *uuid.UUID, string) error
	}); ok {
		if err := validator.ValidateMonitoringContext(ctx, sourceRisk, input.ProfileVersionID, input.MonitoringPeriodID, input.ObservedAt); err != nil {
			return nil, err
		}
	}
	existing, err := findMonitoringForContext(ctx, uc.monitoringRepo, sourceRisk.VersionGroupID, input.ProfileVersionID, input.MonitoringPeriodID, input.Cycle)
	if err != nil {
		return nil, errors.Wrap(err, "failed to check monitoring period")
	}
	if existing != nil {
		if existing.Status == entity.RiskMonitoringStatusDraft {
			return monitoringDraftOutput(existing, true), nil
		}
		if input.ProfileVersionID != nil {
			return nil, &errors.AppError{Code: "INVALID_INPUT", Message: "Pemantauan profil dan periode ini sudah final."}
		}
	}

	monitoring := entity.NewRiskMonitoringDraft(sourceRisk, input.Cycle, input.StartedBy)
	monitoring.ProfileVersionID = input.ProfileVersionID
	monitoring.MonitoringPeriodID = input.MonitoringPeriodID
	monitoring.ObservedAt = input.ObservedAt
	monitoring.ObservedAtInferred = inferredDate
	if input.ObservedProbability != 0 || input.ObservedImpact != 0 {
		if input.ObservedProbability < 1 || input.ObservedProbability > 5 {
			return nil, errors.ErrInvalidProbability
		}
		if input.ObservedImpact < 1 || input.ObservedImpact > 5 {
			return nil, errors.ErrInvalidImpact
		}
		monitoring.ObservedProbability = input.ObservedProbability
		monitoring.ObservedImpact = input.ObservedImpact
		monitoring.CalculateObservedScore()
	}
	if err := uc.monitoringRepo.Create(ctx, monitoring); err != nil {
		if existing, lookupErr := findMonitoringForContext(ctx, uc.monitoringRepo, sourceRisk.VersionGroupID, input.ProfileVersionID, input.MonitoringPeriodID, input.Cycle); lookupErr == nil && existing != nil && existing.Status == entity.RiskMonitoringStatusDraft {
			return monitoringDraftOutput(existing, true), nil
		}
		return nil, errors.Wrap(err, "failed to create monitoring transaction")
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
		return nil, errors.ErrMonitoringNotDraft
	}

	if input.ExpectedUpdatedAt != nil && !monitoring.UpdatedAt.Equal(*input.ExpectedUpdatedAt) {
		return nil, errors.ErrMonitoringReviewChanged
	}

	sourceRisk, err := uc.riskRepo.GetByID(ctx, monitoring.SourceRiskID, input.OrgIDs)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}
	if sourceRisk.Status != entity.RiskStatusFinal || sourceRisk.ArchivedAt != nil {
		return nil, errors.ErrSourceRiskNoLongerActive
	}

	dateValue := monitoring.ObservedAt
	if input.ObservedAt != "" {
		dateValue = input.ObservedAt
		if input.ObservedAt != monitoring.ObservedAt {
			monitoring.ObservedAtInferred = false
		}
	}
	observedAt, cycle, err := monitoringObservationDate(dateValue, uc.now())
	if err != nil {
		return nil, err
	}
	if resolver, ok := uc.riskRepo.(monitoringSourceResolver); ok {
		resolved, err := resolver.ResolveMonitoringSource(ctx, sourceRisk.VersionGroupID, observedAt, input.OrgIDs)
		if err != nil {
			return nil, errors.ErrMonitoringBeforeRiskEffective
		}
		if resolved.ID != sourceRisk.ID {
			return nil, &errors.AppError{Code: "INVALID_INPUT", Message: "Tanggal ini memakai versi profil berbeda. Buat pemantauan baru untuk tanggal tersebut."}
		}
		sourceRisk = resolved
	}
	if err := validateObservationAfterSource(sourceRisk, observedAt); err != nil {
		return nil, err
	}
	monitoring.ObservedAt, monitoring.AssessmentCycle = observedAt, cycle

	// Integration callers may intentionally send only the
	// fields they changed. Score fields are required by the domain, so merge
	// omitted values from the monitoring draft before validating and saving.
	if input.ObservedProbability == 0 {
		input.ObservedProbability = monitoring.ObservedProbability
	}
	if input.ObservedImpact == 0 {
		input.ObservedImpact = monitoring.ObservedImpact
	}

	draftValues := mergeMonitoringDraftValues(monitoring.DraftPayloadSnapshot(), input.Values)
	if draftValues.ChangeReason == "" {
		draftValues.ChangeReason = monitoring.ChangeReason
	}
	draftValues.Probability = input.ObservedProbability
	draftValues.Impact = input.ObservedImpact
	if strings.TrimSpace(input.Conclusion) == "" {
		input.Conclusion = monitoring.Conclusion
	}
	if strings.TrimSpace(input.MitigationProgressSummary) == "" {
		input.MitigationProgressSummary = monitoring.MitigationProgressSummary
	}
	draftValues.Conclusion = input.Conclusion
	mode, changedFields := entity.DetectRiskMonitoringMode(sourceRisk, &draftValues)

	if input.ObservedProbability < 1 || input.ObservedProbability > 5 {
		return nil, errors.ErrInvalidProbability
	}
	if input.ObservedImpact < 1 || input.ObservedImpact > 5 {
		return nil, errors.ErrInvalidImpact
	}

	monitoring.Mode = mode
	monitoring.ProfileChangeSummary = changedFields
	monitoring.ChangeReason = strings.TrimSpace(draftValues.ChangeReason)
	payload := entity.NewRiskMonitoringDraftPayloadFromValues(draftValues)
	sameScore := input.ObservedProbability == monitoring.ObservedProbability &&
		input.ObservedImpact == monitoring.ObservedImpact
	payload.ObservedScoreConfirmed = sameScore && monitoring.ObservedScoreConfirmed
	if input.ObservedScoreConfirmed != nil {
		payload.ObservedScoreConfirmed = *input.ObservedScoreConfirmed
	}
	monitoring.SetDraftPayload(payload)
	monitoring.ObservedProbability = input.ObservedProbability
	monitoring.ObservedImpact = input.ObservedImpact
	monitoring.Conclusion = input.Conclusion
	monitoring.MitigationProgressSummary = input.MitigationProgressSummary
	monitoring.MitigationCompletionPercent = input.MitigationCompletionPercent
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

func mergeMonitoringDraftValues(current *entity.RiskMonitoringDraftPayload, input entity.RiskMonitoringDraftValues) entity.RiskMonitoringDraftValues {
	if current == nil {
		return input
	}
	merged := input
	if merged.Title == "" {
		merged.Title = current.Title
	}
	if merged.Description == "" {
		merged.Description = current.Description
	}
	if merged.Category == "" {
		merged.Category = current.Category
	}
	if merged.Cause == nil {
		merged.Cause = append([]string(nil), current.Cause...)
	}
	if merged.RiskSource == "" {
		merged.RiskSource = current.RiskSource
	}
	if merged.Controllability == "" {
		merged.Controllability = current.Controllability
	}
	if merged.ImpactDesc == nil {
		merged.ImpactDesc = append([]string(nil), current.ImpactDesc...)
	}
	if merged.ExistingControl == "" {
		merged.ExistingControl = current.ExistingControl
	}
	if merged.ControlEffectiveness == "" {
		merged.ControlEffectiveness = current.ControlEffectiveness
	}
	if merged.TreatmentOption == "" {
		merged.TreatmentOption = current.TreatmentOption
	}
	if merged.Mitigations == nil {
		merged.Mitigations = slices.Clone(current.Mitigations)
	}
	return merged
}

func (uc *FinalizeMonitoringUseCase) Execute(ctx context.Context, input FinalizeMonitoringInput) (*FinalizeMonitoringOutput, error) {
	if input.MonitoringID == uuid.Nil {
		return nil, errors.ErrInvalidInput
	}

	monitoring, err := uc.monitoringRepo.GetByID(ctx, input.MonitoringID, input.OrgIDs)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}
	if monitoring.Status == entity.RiskMonitoringStatusFinal {
		return &FinalizeMonitoringOutput{Monitoring: monitoring, Message: "Pemantauan sudah difinalisasi."}, nil
	}
	if monitoring.Status != entity.RiskMonitoringStatusDraft {
		return nil, errors.ErrMonitoringNotFinalizable
	}

	if input.ExpectedUpdatedAt != nil && !monitoring.UpdatedAt.Equal(*input.ExpectedUpdatedAt) {
		return nil, errors.ErrMonitoringReviewChanged
	}

	sourceRisk, err := uc.riskRepo.GetByID(ctx, monitoring.SourceRiskID, input.OrgIDs)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}
	if sourceRisk.Status != entity.RiskStatusFinal || sourceRisk.ArchivedAt != nil {
		return nil, errors.ErrSourceRiskNoLongerActive
	}
	if monitoring.ObservedProbability < 1 || monitoring.ObservedProbability > 5 {
		return nil, errors.ErrInvalidProbability
	}
	if monitoring.ObservedImpact < 1 || monitoring.ObservedImpact > 5 {
		return nil, errors.ErrInvalidImpact
	}

	if monitoring.MonitoringPeriodID != nil && !monitoring.ObservedScoreConfirmed {
		return nil, &errors.AppError{Code: "INVALID_INPUT", Message: "Tinjau dan konfirmasi penilaian risiko sebelum finalisasi pemantauan."}
	}

	// Every finalized monitoring creates an immutable risk snapshot. A
	// score-only monitoring still changes the official residual assessment;
	// keeping it as a log-only transaction makes the UI and the ledger disagree
	// about which score is authoritative.
	// An unreported task remains terminal for its period, but its mitigation
	// must remain in the profile until explicitly revised. Finalization must
	// never silently erase a planned control from the next quarter.
	resultRisk, err := buildRiskVersionFromMonitoring(sourceRisk, monitoring, input.FinalizedBy)
	if err != nil {
		return nil, err
	}
	if err := resultRisk.Validate(); err != nil {
		return nil, err
	}

	finalizedMonitoring, err := uc.monitoringRepo.Finalize(ctx, monitoring.ID, resultRisk, input.FinalizedBy, domainrepo.MonitoringFinalizeReview{
		DraftUpdatedAt: monitoring.UpdatedAt,
		ReportRevision: input.ReportRevision,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to finalize monitoring transaction")
	}

	return &FinalizeMonitoringOutput{
		Monitoring: finalizedMonitoring,
		Message:    "monitoring transaction finalized",
	}, nil
}

func buildRiskVersionFromMonitoring(source *entity.Risk, monitoring *entity.RiskMonitoring, finalizedBy uuid.UUID) (*entity.Risk, error) {
	clone := *source
	clone.ID = uuid.Nil
	clone.PreviousRiskID = &source.ID
	clone.VersionNumber = source.VersionNumber + 1
	clone.IsCurrent = true
	clone.IsCycleCurrent = true
	clone.Status = entity.RiskStatusFinal
	clone.AssessmentCycle = monitoring.AssessmentCycle
	if monitoring.ObservedAt != "" {
		observed, err := time.ParseInLocation("2006-01-02", monitoring.ObservedAt, timeutil.JakartaLocation())
		if err != nil {
			return nil, errors.ErrInvalidInput
		}
		clone.EffectiveFrom = &observed
	}
	clone.ReviewType = "periodic"
	clone.ReviewSummary = monitoring.Conclusion
	clone.ReviewStartedAt = timePtr(monitoring.StartedAt.UTC().Round(time.Second))
	now := time.Now().UTC()
	clone.ReviewSubmittedAt = &now
	clone.ReviewApprovedAt = &now
	clone.ChangeReason = monitoring.ChangeReason
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
		clone.Description = draft.Description
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
