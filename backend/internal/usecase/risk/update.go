package risk

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	mtuc "github.com/manris/backend/internal/usecase/mitigation_task"
)

type WorkingPaperLockChecker interface {
	HasBlockingDocumentLink(ctx context.Context, riskID uuid.UUID) (bool, error)
}

type UpdateRiskUseCase struct {
	riskRepo repository.RiskRepository
	userRepo repository.UserRepository
	orgRepo  repository.OrganizationRepository
	wpRepo   WorkingPaperLockChecker
	taskRepo repository.MitigationTaskRepository
}

func NewUpdateRiskUseCase(
	riskRepo repository.RiskRepository,
	userRepo repository.UserRepository,
	orgRepo repository.OrganizationRepository,
	wpRepo WorkingPaperLockChecker,
	taskRepo repository.MitigationTaskRepository,
) *UpdateRiskUseCase {
	return &UpdateRiskUseCase{
		riskRepo: riskRepo,
		userRepo: userRepo,
		orgRepo:  orgRepo,
		wpRepo:   wpRepo,
		taskRepo: taskRepo,
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
	Nilai                int     `json:"nilai"`
	InherentScore        int     `json:"inherentScore"`

	// Section 3: Risk Evaluation
	RiskPriority    int    `json:"riskPriority"`
	RiskAppetite    string `json:"riskAppetite"`
	TreatmentOption string `json:"treatmentOption"`

	// Section 4: Mitigations
	Mitigations []entity.Mitigation `json:"mitigations"`

	// Section 5: Target Risk
	TargetProbability  int                         `json:"targetProbability"`
	TargetImpact       int                         `json:"targetImpact"`
	TargetWeight       float64                     `json:"targetWeight"`
	TargetNilai        int                         `json:"targetNilai"`
	TargetScore        int                         `json:"targetScore"`
	NextReviewDate     *string                     `json:"nextReviewDate"`
	ReviewScheduleText string                      `json:"reviewScheduleText"`
	AssessmentCycle    string                      `json:"assessmentCycle"`
	ReviewType         string                      `json:"reviewType"`
	ChangeReason       string                      `json:"changeReason"`
	ReviewSummary      string                      `json:"reviewSummary"`
	DraftApprovalLine  []entity.ApprovalLineMember `json:"draftApprovalLine"`
	ObjectiveID        *uuid.UUID                  `json:"objectiveId"`
}

type UpdateRiskOutput struct {
	ID        uuid.UUID    `json:"id"`
	Code      string       `json:"code"`
	Message   string       `json:"message"`
	UpdatedAt fmt.Stringer `json:"updatedAt"` // time.Time implements Stringer
}

func (uc *UpdateRiskUseCase) Execute(ctx context.Context, input UpdateRiskInput, orgIDs []uuid.UUID) (*UpdateRiskOutput, error) {
	// 1. Get existing risk
	existingRisk, err := uc.riskRepo.GetByID(ctx, input.ID, orgIDs)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}
	wasApproved := existingRisk.Status == entity.RiskStatusApproved

	// 2. Block updates when risk is locked by a signing/completed working paper
	if uc.wpRepo != nil {
		blocked, bErr := uc.wpRepo.HasBlockingDocumentLink(ctx, existingRisk.ID)
		if bErr != nil {
			return nil, errors.Wrap(bErr, "failed to check working paper lock")
		}
		if blocked {
			return nil, errors.Wrap(errors.ErrInvalidStatus, "risk version is locked by a signing or completed working paper")
		}
	}

	// 3. Validate status transitions
	if existingRisk.Status == entity.RiskStatusApproved && input.Status != entity.RiskStatusApproved && input.Status != entity.RiskStatusDraft {
		return nil, errors.Wrap(errors.ErrInvalidStatus, "cannot change status from approved except to draft")
	}
	// 4. Validate organization if changed
	if input.OrganizationID != nil && *input.OrganizationID != *existingRisk.OrganizationID {
		_, err := uc.orgRepo.GetByID(ctx, *input.OrganizationID)
		if err != nil {
			return nil, errors.Wrap(err, "organization not found")
		}
	}

	// 5. Validate mitigations
	input.Mitigations = pruneEmptyMitigations(input.Mitigations)
	for i, m := range input.Mitigations {
		if err := m.Validate(); err != nil {
			return nil, errors.Wrap(err, "mitigation validation failed")
		}
		input.Mitigations[i] = m
		input.Mitigations[i].RiskID = input.ID
	}

	input.Category = strings.TrimSpace(input.Category)
	if input.Category == "" || !entity.IsValidRiskCategory(input.Category) {
		return nil, errors.ErrInvalidRiskCategory
	}

	// 6. Update risk entity
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

	if input.Nilai != 0 {
		existingRisk.Nilai = float64(input.Nilai)
	}
	if input.InherentScore != 0 {
		existingRisk.InherentScore = input.InherentScore
	}

	// Section 3
	existingRisk.RiskPriority = input.RiskPriority
	existingRisk.RiskAppetite = input.RiskAppetite
	existingRisk.TreatmentOption = input.TreatmentOption

	// Section 4
	existingRisk.Mitigations = input.Mitigations
	existingRisk.CalculateAll()
	if input.Status != entity.RiskStatusDraft {
		if err := validateRiskMitigationRequirements(existingRisk); err != nil {
			return nil, err
		}
	}

	// Section 5
	existingRisk.TargetProbability = input.TargetProbability
	existingRisk.TargetImpact = input.TargetImpact
	existingRisk.TargetWeight = input.TargetWeight
	if input.TargetNilai != 0 {
		existingRisk.TargetNilai = float64(input.TargetNilai)
	}
	if input.TargetScore != 0 {
		existingRisk.TargetScore = input.TargetScore
	}
	existingRisk.NextReviewDate = input.NextReviewDate
	existingRisk.ReviewScheduleText = input.ReviewScheduleText
	existingRisk.AssessmentCycle = input.AssessmentCycle
	existingRisk.ReviewType = input.ReviewType
	existingRisk.ChangeReason = input.ChangeReason
	existingRisk.ReviewSummary = input.ReviewSummary
	existingRisk.DraftApprovalLine = input.DraftApprovalLine
	existingRisk.ObjectiveID = input.ObjectiveID

	// 7. Validate risk entity
	if err := existingRisk.Validate(); err != nil {
		return nil, err
	}

	// 8. Save to database
	if err := uc.riskRepo.Update(ctx, existingRisk); err != nil {
		return nil, errors.Wrap(err, "failed to update risk")
	}
	if input.Status == entity.RiskStatusApproved && existingRisk.PreviousRiskID != nil && !wasApproved {
		if err := uc.riskRepo.ActivateApprovedVersion(ctx, existingRisk.ID); err != nil {
			return nil, errors.Wrap(err, "failed to activate approved risk version")
		}
	}
	if input.Status == entity.RiskStatusApproved && !wasApproved && uc.taskRepo != nil {
		if _, err := mtuc.NewEnsureTasksForApprovedRiskUseCase(uc.taskRepo, uc.riskRepo).Execute(ctx, existingRisk.ID, orgIDs); err != nil {
			return nil, errors.Wrap(err, "failed to create mitigation tasks")
		}
	}

	// 9. Return result
	return &UpdateRiskOutput{
		ID:        existingRisk.ID,
		Code:      existingRisk.Code,
		Message:   "Risk updated successfully",
		UpdatedAt: existingRisk.UpdatedAt,
	}, nil
}
