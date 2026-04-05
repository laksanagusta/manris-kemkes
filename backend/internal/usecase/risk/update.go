package risk

import (
	"context"
	"fmt"
	"strings"

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
	ID             uuid.UUID  `json:"-"`
	Title          string     `json:"title"`
	Description    string     `json:"description"`
	Category       string     `json:"category"`
	Status         string     `json:"status"`
	OrganizationID *uuid.UUID `json:"organizationId"`

	Cause           []string `json:"cause"`
	RiskSource      string   `json:"riskSource"`
	Controllability string   `json:"controllability"`
	ImpactDesc      []string `json:"impactDesc"`

	// Section 2: Risk Analysis
	ExistingControl      string  `json:"existingControl"`
	ControlEffectiveness string  `json:"controlEffectiveness"`
	Probability          int     `json:"probability"`
	Impact               int     `json:"impact"`
	Weight               float64 `json:"weight"`

	// Section 3: Risk Evaluation
	RiskPriority    int    `json:"riskPriority"`
	RiskAppetite    string `json:"riskAppetite"`
	TreatmentOption string `json:"treatmentOption"`

	// Section 4: Mitigations
	Mitigations []entity.Mitigation `json:"mitigations"`

	// Section 5: Target Risk
	TargetProbability int                         `json:"targetProbability"`
	TargetImpact      int                         `json:"targetImpact"`
	TargetWeight      float64                     `json:"targetWeight"`
	NextReviewDate    *string                     `json:"nextReviewDate"`
	AssessmentCycle   string                      `json:"assessmentCycle"`
	ReviewType        string                      `json:"reviewType"`
	ChangeReason      string                      `json:"changeReason"`
	ReviewSummary     string                      `json:"reviewSummary"`
	DraftApprovalLine []entity.ApprovalLineMember `json:"draftApprovalLine"`
}

type UpdateRiskOutput struct {
	ID        uuid.UUID    `json:"id"`
	Code      string       `json:"code"`
	Message   string       `json:"message"`
	UpdatedAt fmt.Stringer `json:"updatedAt"` // time.Time implements Stringer
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

	input.Category = strings.TrimSpace(input.Category)
	if input.Category == "" || !entity.IsValidRiskCategory(input.Category) {
		return nil, errors.ErrInvalidRiskCategory
	}

	// 5. Update risk entity
	existingRisk.Title = input.Title
	existingRisk.Description = input.Description
	existingRisk.Category = input.Category
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
