package risk

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// UpdateRiskUseCase handles risk update business logic
type UpdateRiskUseCase struct {
	riskRepo repository.RiskRepository
	userRepo repository.UserRepository
	orgRepo  repository.OrganizationRepository
}

func NewUpdateRiskUseCase(
	riskRepo repository.RiskRepository,
	userRepo repository.UserRepository,
	orgRepo repository.OrganizationRepository,
) *UpdateRiskUseCase {
	return &UpdateRiskUseCase{
		riskRepo: riskRepo,
		userRepo: userRepo,
		orgRepo:  orgRepo,
	}
}

type UpdateRiskInput struct {
	ID             uuid.UUID
	Title          string
	Description    string
	Status         string
	OrganizationID *uuid.UUID

	Cause           []string
	RiskSource      string
	Controllability string
	ImpactDesc      []string

	// Section 2: Risk Analysis
	ExistingControl      string
	ControlEffectiveness string
	Probability          int
	Impact               int
	Weight               float64

	// Section 3: Risk Evaluation
	RiskPriority    int
	RiskAppetite    string
	TreatmentOption string

	// Section 4: Mitigations
	Mitigations []entity.Mitigation

	// Section 5: Target Risk
	TargetProbability int
	TargetImpact      int
	TargetWeight      float64
	NextReviewDate    *string
	AssessmentCycle   string
	ReviewType        string
	ChangeReason      string
	ReviewSummary     string
	DraftApprovalLine []entity.ApprovalLineMember
}

type UpdateRiskOutput struct {
	ID        uuid.UUID
	Code      string
	Message   string
	UpdatedAt fmt.Stringer // time.Time implements Stringer
}

func (uc *UpdateRiskUseCase) Execute(ctx context.Context, input UpdateRiskInput) (*UpdateRiskOutput, error) {
	// 1. Get existing risk
	existingRisk, err := uc.riskRepo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}

	// 2. Validate status transitions
	if existingRisk.Status == "approved" && input.Status != "approved" && input.Status != "draft" {
		return nil, errors.Wrap(errors.ErrInvalidStatus, "cannot change status from approved except to draft")
	}
	if existingRisk.Status == "rejected" && input.Status != "rejected" && input.Status != "draft" {
		return nil, errors.Wrap(errors.ErrInvalidStatus, "rejected risk can only be moved to draft")
	}

	// 3. Validate organization if changed
	if input.OrganizationID != nil && *input.OrganizationID != *existingRisk.OrganizationID {
		_, err := uc.orgRepo.GetByID(ctx, *input.OrganizationID)
		if err != nil {
			return nil, errors.Wrap(err, "organization not found")
		}
	}

	// 4. Validate mitigations
	for i, m := range input.Mitigations {
		if err := m.Validate(); err != nil {
			return nil, errors.Wrap(err, "mitigation validation failed")
		}
		input.Mitigations[i].RiskID = input.ID
	}

	// 5. Update risk entity
	existingRisk.Title = input.Title
	existingRisk.Description = input.Description
	existingRisk.Status = input.Status
	existingRisk.OrganizationID = input.OrganizationID
	if input.AssessmentCycle == "" {
		input.AssessmentCycle = existingRisk.AssessmentCycle
		if input.AssessmentCycle == "" {
			input.AssessmentCycle = currentAssessmentCycle()
		}
	}

	// Section 1
	existingRisk.Cause = input.Cause
	existingRisk.RiskSource = input.RiskSource
	existingRisk.Controllability = input.Controllability
	existingRisk.ImpactDesc = input.ImpactDesc

	// Section 2
	existingRisk.ExistingControl = input.ExistingControl
	existingRisk.ControlEffectiveness = input.ControlEffectiveness
	existingRisk.Probability = input.Probability
	existingRisk.Impact = input.Impact
	existingRisk.Weight = input.Weight

	// Section 3
	existingRisk.RiskPriority = input.RiskPriority
	existingRisk.RiskAppetite = input.RiskAppetite
	existingRisk.TreatmentOption = input.TreatmentOption

	// Section 4
	existingRisk.Mitigations = input.Mitigations

	// Section 5
	existingRisk.TargetProbability = input.TargetProbability
	existingRisk.TargetImpact = input.TargetImpact
	existingRisk.TargetWeight = input.TargetWeight
	existingRisk.NextReviewDate = input.NextReviewDate
	existingRisk.AssessmentCycle = input.AssessmentCycle
	existingRisk.ReviewType = input.ReviewType
	existingRisk.ChangeReason = input.ChangeReason
	existingRisk.ReviewSummary = input.ReviewSummary
	existingRisk.DraftApprovalLine = input.DraftApprovalLine

	// 6. Validate risk entity
	if err := existingRisk.Validate(); err != nil {
		return nil, err
	}

	// 7. Save to database
	if err := uc.riskRepo.Update(ctx, existingRisk); err != nil {
		return nil, errors.Wrap(err, "failed to update risk")
	}

	// 8. Return result
	return &UpdateRiskOutput{
		ID:        existingRisk.ID,
		Code:      existingRisk.Code,
		Message:   "Risk updated successfully",
		UpdatedAt: existingRisk.UpdatedAt,
	}, nil
}
