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

func NewCreateRiskReassessmentUseCase(riskRepo repository.RiskRepository) *CreateRiskReassessmentUseCase {
	return &CreateRiskReassessmentUseCase{riskRepo: riskRepo}
}

type CreateRiskReassessmentInput struct {
	RiskID uuid.UUID
	Cycle  string
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

	sourceRisk, err := uc.riskRepo.GetByID(ctx, input.RiskID)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}
	if !sourceRisk.CanBeReassessed() {
		return nil, errors.Wrap(errors.ErrInvalidStatus, "only current approved risks can be reassessed")
	}

	versions, err := uc.riskRepo.ListVersions(ctx, sourceRisk.VersionGroupID)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load risk versions")
	}
	for _, version := range versions {
		if version.AssessmentCycle == input.Cycle && (version.Status == "draft" || version.Status == "final") {
			return nil, errors.Wrap(errors.ErrInvalidStatus, "an in-progress reassessment already exists for this cycle")
		}
	}

	now := time.Now().UTC()
	reassessment := cloneRiskForReassessment(sourceRisk)
	reassessment.PreviousRiskID = &sourceRisk.ID
	reassessment.IsCurrent = false
	reassessment.IsCycleCurrent = false
	reassessment.Status = "draft"
	reassessment.ArchivedAt = nil
	reassessment.ArchivedReason = ""
	reassessment.AssessmentCycle = input.Cycle
	reassessment.ReviewType = "periodic"
	reassessment.ReviewStartedAt = &now
	reassessment.ReviewSubmittedAt = nil
	reassessment.ReviewApprovedAt = nil

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

func cloneRiskForReassessment(source *entity.Risk) *entity.Risk {
	clone := *source
	clone.ID = uuid.Nil
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
	return &clone
}

type ListRiskVersionsUseCase struct {
	riskRepo repository.RiskRepository
}

func NewListRiskVersionsUseCase(riskRepo repository.RiskRepository) *ListRiskVersionsUseCase {
	return &ListRiskVersionsUseCase{riskRepo: riskRepo}
}

func (uc *ListRiskVersionsUseCase) Execute(ctx context.Context, riskID uuid.UUID) ([]*entity.Risk, error) {
	risk, err := uc.riskRepo.GetByID(ctx, riskID)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}
	versions, err := uc.riskRepo.ListVersions(ctx, risk.VersionGroupID)
	if err != nil {
		return nil, errors.Wrap(err, "failed to list risk versions")
	}
	return versions, nil
}
