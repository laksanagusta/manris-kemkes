package risk

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	mtuc "github.com/manris/backend/internal/usecase/mitigation_task"
)

type CreateRiskReassessmentUseCase struct {
	riskRepo      reassessmentRiskRepository
	ensureTasksUC *mtuc.EnsureTasksForRiskVersionUseCase
}

func NewCreateRiskReassessmentUseCase(riskRepo reassessmentRiskRepository, ensureTasksUC *mtuc.EnsureTasksForRiskVersionUseCase) *CreateRiskReassessmentUseCase {
	return &CreateRiskReassessmentUseCase{riskRepo: riskRepo, ensureTasksUC: ensureTasksUC}
}

type periodicReassessmentReservation interface {
	GetOrCreatePeriodicReassessmentInTx(ctx context.Context, sourceRisk *entity.Risk, cycle string, createdBy uuid.UUID) (*entity.Risk, bool, error)
}

type reassessmentRiskRepository interface {
	GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.Risk, error)
	ListVersions(ctx context.Context, versionGroupID uuid.UUID) ([]*entity.Risk, error)
	Create(ctx context.Context, risk *entity.Risk) error
}

type CreateRiskReassessmentInput struct {
	RiskID    uuid.UUID
	Cycle     string
	OrgIDs    []uuid.UUID
	CreatedBy uuid.UUID
}

type CreateRiskReassessmentOutput struct {
	ID             uuid.UUID `json:"id"`
	VersionGroupID uuid.UUID `json:"versionGroupId"`
	Status         string    `json:"status"`
	Message        string    `json:"message"`
	RedirectURL    string    `json:"redirectUrl"`
	ExistingDraft  bool      `json:"existingDraft"`
}

func (uc *CreateRiskReassessmentUseCase) Execute(ctx context.Context, input CreateRiskReassessmentInput) (*CreateRiskReassessmentOutput, error) {
	if input.RiskID == uuid.Nil || input.Cycle == "" {
		return nil, errors.ErrInvalidInput
	}
	if !IsValidSemesterFormat(input.Cycle) {
		return nil, errors.Wrap(errors.ErrInvalidInput, "assessment_cycle must be in YYYY-HN format (e.g. 2026-H1)")
	}

	sourceRisk, err := uc.riskRepo.GetByID(ctx, input.RiskID, input.OrgIDs)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}
	if !sourceRisk.CanBeReassessed() {
		return nil, errors.Wrap(errors.ErrInvalidStatus, "only current approved risks can be reassessed")
	}
	if err := validateNoNewerCycle(ctx, uc.riskRepo, sourceRisk.VersionGroupID, input.Cycle); err != nil {
		return nil, err
	}
	if manager, ok := uc.riskRepo.(periodicReassessmentReservation); ok {
		reservedRisk, created, err := manager.GetOrCreatePeriodicReassessmentInTx(ctx, sourceRisk, input.Cycle, input.CreatedBy)
		if err != nil {
			return nil, errors.Wrap(err, "failed to reserve reassessment draft")
		}
		if !created {
			return &CreateRiskReassessmentOutput{
				ID:             reservedRisk.ID,
				VersionGroupID: reservedRisk.VersionGroupID,
				Status:         reservedRisk.Status,
				Message:        "an in-progress reassessment already exists for this cycle, returning existing draft",
				RedirectURL:    "/risk/assessment/" + reservedRisk.ID.String(),
				ExistingDraft:  true,
			}, nil
		}
		return &CreateRiskReassessmentOutput{
			ID:             reservedRisk.ID,
			VersionGroupID: reservedRisk.VersionGroupID,
			Status:         reservedRisk.Status,
			Message:        "risk reassessment draft created",
			RedirectURL:    "/risk/assessment/" + reservedRisk.ID.String(),
			ExistingDraft:  false,
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
			RedirectURL:    "/risk/assessment/" + existing.ID.String(),
			ExistingDraft:  true,
		}, nil
	}

	now := time.Now().UTC()
	reassessment := BuildPeriodicReassessmentDraft(sourceRisk, input.Cycle, now, input.CreatedBy)

	if err := uc.riskRepo.Create(ctx, reassessment); err != nil {
		return nil, errors.Wrap(err, "failed to create reassessment draft")
	}

	if uc.ensureTasksUC != nil {
		if _, err := uc.ensureTasksUC.Execute(ctx, sourceRisk.ID, input.Cycle, input.OrgIDs); err != nil {
			log.Printf("[WARN] ensure mitigation tasks on reassessment: %v", err)
		}
	}

	return &CreateRiskReassessmentOutput{
		ID:             reassessment.ID,
		VersionGroupID: reassessment.VersionGroupID,
		Status:         reassessment.Status,
		Message:        "risk reassessment draft created",
		RedirectURL:    "/risk/assessment/" + reassessment.ID.String(),
		ExistingDraft:  false,
	}, nil
}

func FindInProgressReassessmentForCycle(versions []*entity.Risk, cycle string) *entity.Risk {
	for _, version := range versions {
		if version.AssessmentCycle == cycle && (version.Status == entity.RiskStatusDraft || version.Status == entity.RiskStatusInReview) {
			return version
		}
	}
	return nil
}

func validateNoNewerCycle(ctx context.Context, riskRepo reassessmentRiskRepository, versionGroupID uuid.UUID, requestedCycle string) error {
	versions, err := riskRepo.ListVersions(ctx, versionGroupID)
	if err != nil {
		return errors.Wrap(err, "failed to load risk versions")
	}

	var blockingCycles []string
	for _, version := range versions {
		if version == nil || version.AssessmentCycle == "" {
			continue
		}
		cmp, err := CompareCycles(version.AssessmentCycle, requestedCycle)
		if err != nil {
			return err
		}
		if cmp > 0 {
			blockingCycles = append(blockingCycles, version.AssessmentCycle)
		}
	}

	if len(blockingCycles) == 0 {
		return nil
	}

	earliest := blockingCycles[0]
	for _, cycle := range blockingCycles[1:] {
		cmp, err := CompareCycles(cycle, earliest)
		if err != nil {
			return err
		}
		if cmp < 0 {
			earliest = cycle
		}
	}

	return errors.Wrap(
		errors.ErrInvalidInput,
		fmt.Sprintf("Tidak bisa membuat reassessment untuk %s karena risiko ini sudah memiliki penilaian pada periode lebih baru: %s.", requestedCycle, earliest),
	)
}

func BuildPeriodicReassessmentDraft(source *entity.Risk, cycle string, startedAt time.Time, createdBy uuid.UUID) *entity.Risk {
	clone := *source
	clone.ID = uuid.Nil
	clone.PreviousRiskID = &source.ID
	if createdBy != uuid.Nil {
		clone.CreatedBy = &createdBy
	}
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
