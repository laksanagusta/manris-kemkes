package risk

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type CreateRiskReassessmentUseCase struct {
	riskRepo repository.RiskRepository
}

type periodicReassessmentReservation interface {
	GetOrCreatePeriodicReassessmentInTx(ctx context.Context, sourceRisk *entity.Risk, cycle string) (*entity.Risk, bool, error)
}

func NewCreateRiskReassessmentUseCase(riskRepo repository.RiskRepository) *CreateRiskReassessmentUseCase {
	return &CreateRiskReassessmentUseCase{riskRepo: riskRepo}
}

type CreateRiskReassessmentInput struct {
	RiskID uuid.UUID
	Cycle  string
	OrgIDs []uuid.UUID
}

type CreateRiskReassessmentOutput struct {
	ID             uuid.UUID `json:"id"`
	VersionGroupID uuid.UUID `json:"versionGroupId"`
	Status         string    `json:"status"`
	Message        string    `json:"message"`
}

func (uc *CreateRiskReassessmentUseCase) Execute(ctx context.Context, input CreateRiskReassessmentInput) (*CreateRiskReassessmentOutput, error) {
	if input.RiskID == uuid.Nil || input.Cycle == "" {
		return nil, errors.ErrInvalidInput
	}
	if !IsValidCycleFormat(input.Cycle) {
		return nil, errors.Wrap(errors.ErrInvalidInput, "assessment_cycle must be in YYYY-HN format (e.g. 2026-H1)")
	}

	sourceRisk, err := uc.riskRepo.GetByID(ctx, input.RiskID, input.OrgIDs)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}
	if !sourceRisk.CanBeReassessed() {
		return nil, errors.Wrap(errors.ErrInvalidStatus, "only current approved risks can be reassessed")
	}
	if manager, ok := uc.riskRepo.(periodicReassessmentReservation); ok {
		reservedRisk, created, err := manager.GetOrCreatePeriodicReassessmentInTx(ctx, sourceRisk, input.Cycle)
		if err != nil {
			return nil, errors.Wrap(err, "failed to reserve reassessment draft")
		}
		if !created {
			return &CreateRiskReassessmentOutput{
				ID:             reservedRisk.ID,
				VersionGroupID: reservedRisk.VersionGroupID,
				Status:         reservedRisk.Status,
				Message:        "an in-progress reassessment already exists for this cycle, returning existing draft",
			}, nil
		}
		return &CreateRiskReassessmentOutput{
			ID:             reservedRisk.ID,
			VersionGroupID: reservedRisk.VersionGroupID,
			Status:         reservedRisk.Status,
			Message:        "risk reassessment draft created",
		}, nil
	}

	versions, err := uc.riskRepo.ListVersions(ctx, sourceRisk.VersionGroupID)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load risk versions")
	}
	if existing := FindInProgressReassessmentForCycle(versions, input.Cycle); existing != nil {
		return &CreateRiskReassessmentOutput{
			ID:             existing.ID,
			VersionGroupID: existing.VersionGroupID,
			Status:         existing.Status,
			Message:        "an in-progress reassessment already exists for this cycle, returning existing draft",
		}, nil
	}

	now := time.Now().UTC()
	reassessment := BuildPeriodicReassessmentDraft(sourceRisk, input.Cycle, now)

	if err := uc.riskRepo.Create(ctx, reassessment); err != nil {
		return nil, errors.Wrap(err, "failed to create reassessment draft")
	}

	return &CreateRiskReassessmentOutput{
		ID:             reassessment.ID,
		VersionGroupID: reassessment.VersionGroupID,
		Status:         reassessment.Status,
		Message:        "risk reassessment draft created",
	}, nil
}

func FindInProgressReassessmentForCycle(versions []*entity.Risk, cycle string) *entity.Risk {
	for _, version := range versions {
		if version.AssessmentCycle == cycle && (version.Status == entity.RiskStatusDraft || version.Status == "reviewed") {
			return version
		}
	}
	return nil
}

func BuildPeriodicReassessmentDraft(source *entity.Risk, cycle string, startedAt time.Time) *entity.Risk {
	clone := *source
	clone.ID = uuid.Nil
	clone.PreviousRiskID = &source.ID
	clone.IsCurrent = false
	clone.IsCycleCurrent = false
	clone.Status = entity.RiskStatusDraft
	clone.ArchivedAt = nil
	clone.ArchivedReason = ""
	clone.AssessmentCycle = cycle
	clone.ReviewType = "periodic"
	clone.ReviewStartedAt = &startedAt
	clone.ReviewSubmittedAt = nil
	clone.ReviewApprovedAt = nil
	clone.Cause = append([]string(nil), source.Cause...)
	clone.ImpactDesc = append([]string(nil), source.ImpactDesc...)
	clone.Mitigations = make([]entity.Mitigation, len(source.Mitigations))
	for i, mitigation := range source.Mitigations {
		copied := mitigation
		copied.ID = uuid.Nil
		copied.RiskID = uuid.Nil
		copied.CreatedAt = time.Time{}
		clone.Mitigations[i] = copied
	}
	clone.VersionNumber = source.VersionNumber + 1
	return &clone
}

type ListRiskVersionsUseCase struct {
	riskRepo repository.RiskRepository
}

func NewListRiskVersionsUseCase(riskRepo repository.RiskRepository) *ListRiskVersionsUseCase {
	return &ListRiskVersionsUseCase{riskRepo: riskRepo}
}

func (uc *ListRiskVersionsUseCase) Execute(ctx context.Context, riskID uuid.UUID, orgIDs []uuid.UUID) ([]*entity.Risk, error) {
	risk, err := uc.riskRepo.GetByID(ctx, riskID, orgIDs)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}
	versions, err := uc.riskRepo.ListVersions(ctx, risk.VersionGroupID)
	if err != nil {
		return nil, errors.Wrap(err, "failed to list risk versions")
	}
	return versions, nil
}
