package risk

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
)

type profileRevisionRepository interface {
	StartProfileRevision(context.Context, *entity.Risk) (*entity.Risk, bool, error)
}

type StartProfileRevisionOutput struct {
	RiskID        uuid.UUID `json:"riskId"`
	RedirectURL   string    `json:"redirectUrl"`
	ExistingDraft bool      `json:"existingDraft"`
}

func (uc *StartMonitoringUseCase) StartRevision(ctx context.Context, input StartMonitoringInput) (*StartProfileRevisionOutput, error) {
	if len(strings.TrimSpace(input.ChangeReason)) < 10 || len(input.ChangeReason) > 1000 {
		return nil, errors.ErrChangeReasonRequired
	}
	source, err := uc.riskRepo.GetByID(ctx, input.SourceRiskID, input.OrgIDs)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}
	if source.Status != entity.RiskStatusFinal || !source.IsCurrent || source.ArchivedAt != nil {
		return nil, errors.ErrSourceRiskNoLongerActive
	}
	repo, ok := uc.riskRepo.(profileRevisionRepository)
	if !ok {
		return nil, errors.ErrInvalidInput
	}
	draft := BuildProfileRevisionDraft(source, strings.TrimSpace(input.ChangeReason), input.StartedBy, uc.now())
	saved, existing, err := repo.StartProfileRevision(ctx, draft)
	if err != nil {
		return nil, err
	}
	return &StartProfileRevisionOutput{RiskID: saved.ID, RedirectURL: "/risk/register/new?id=" + saved.ID.String(), ExistingDraft: existing}, nil
}

// BuildProfileRevisionDraft copies the profile into the same draft model used by
// risk creation. The active profile and its assessment history remain immutable.
func BuildProfileRevisionDraft(source *entity.Risk, reason string, actor uuid.UUID, now time.Time) *entity.Risk {
	draft := BuildPeriodicReassessmentDraft(source, assessmentCycleAt(now), now, actor)
	draft.ReviewType = "revision"
	draft.ChangeReason = reason
	draft.ReviewSummary = ""
	draft.FinalizedAt = nil
	draft.FinalizedBy = nil
	draft.FinalizeRequested = false
	draft.EffectiveFrom = nil
	draft.CurrentAssessment = nil
	// Retain source plan IDs here so insertion can carry their stable identities.
	draft.Mitigations = append([]entity.Mitigation(nil), source.Mitigations...)
	if source.CurrentAssessment != nil {
		draft.Probability = source.CurrentAssessment.Probability
		draft.Impact = source.CurrentAssessment.Impact
	}
	draft.CalculateAll()
	return draft
}
