package risk

import (
	"context"
	"fmt"
	"reflect"
	"strings"
	"time"

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
	uc := &UpdateRiskUseCase{
		riskRepo: riskRepo,
		userRepo: userRepo,
		orgRepo:  orgRepo,
		wpRepo:   wpRepo,
		taskRepo: taskRepo,
	}
	return uc
}

type UpdateRiskInput struct {
	ID             uuid.UUID  `json:"-"`
	FinalizedBy    uuid.UUID  `json:"-"`
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
	ROID               *uuid.UUID                  `json:"roId"`
}

type UpdateRiskOutput struct {
	ID        uuid.UUID    `json:"id"`
	Code      string       `json:"code"`
	Message   string       `json:"message"`
	UpdatedAt fmt.Stringer `json:"updatedAt"` // time.Time implements Stringer
	Warnings  []string     `json:"warnings,omitempty"`
}

func (uc *UpdateRiskUseCase) Execute(ctx context.Context, input UpdateRiskInput, orgIDs []uuid.UUID) (*UpdateRiskOutput, error) {
	// 1. Get existing risk
	existingRisk, err := uc.riskRepo.GetByID(ctx, input.ID, orgIDs)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}
	input.Status = canonicalRiskStatus(input.Status)
	wasFinal := existingRisk.Status == entity.RiskStatusFinal
	originalRisk := *existingRisk

	// 2. Block updates when risk is locked by a signing/completed working paper
	if uc.wpRepo != nil {
		blocked, bErr := uc.wpRepo.HasBlockingDocumentLink(ctx, existingRisk.ID)
		if bErr != nil {
			return nil, errors.Wrap(bErr, "failed to check working paper lock")
		}
		if blocked {
			return nil, errors.ErrWorkingPaperLocked
		}
	}
	// 3. Validate status transitions
	if wasFinal && input.Status != entity.RiskStatusFinal {
		return nil, errors.ErrCannotChangeStatusFromApproved
	}
	// 4. Validate organization if changed
	if !uuidPtrEqual(input.OrganizationID, existingRisk.OrganizationID) && input.OrganizationID != nil {
		_, err := uc.orgRepo.GetByID(ctx, *input.OrganizationID)
		if err != nil {
			return nil, errors.ErrOrganizationNotFound
		}
	}

	// 5. Validate mitigations
	input.Mitigations = pruneEmptyMitigations(input.Mitigations)
	for i, m := range input.Mitigations {
		if err := m.Validate(); err != nil {
			return nil, errors.ErrMitigationValidationFailed
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
	if !IsValidQuarterFormat(input.AssessmentCycle) {
		return nil, errors.ErrSemesterFormat
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

	var warnings []string
	if existingRisk.PreviousRiskID != nil {
		previousVersion, err := uc.riskRepo.GetByID(ctx, *existingRisk.PreviousRiskID, orgIDs)
		if err != nil {
			return nil, errors.Wrap(err, "failed to load previous risk version")
		}
		if previousVersion == nil {
			return nil, errors.ErrPreviousRiskVersionNotFound
		}

		substanceChanges := DetectSubstanceChanges(previousVersion, existingRisk)
		if len(substanceChanges) > 0 && strings.TrimSpace(input.ChangeReason) == "" {
			return nil, errors.ErrChangeReasonRequired
		}
		warnings = BuildSubstanceChangeWarnings(previousVersion, existingRisk)
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
	existingRisk.ROID = input.ROID

	// 7. Validate risk entity
	if err := existingRisk.Validate(); err != nil {
		return nil, err
	}
	if wasFinal {
		if finalRiskFieldsChanged(&originalRisk, existingRisk) {
			return nil, errors.ErrFinalRiskReadOnly
		}
	}
	if input.Status == entity.RiskStatusFinal && !wasFinal {
		now := time.Now().UTC()
		existingRisk.ReviewSubmittedAt = &now
		existingRisk.ReviewApprovedAt = &now
		existingRisk.FinalizeRequested = true
		existingRisk.FinalizedAt = &now
		if input.FinalizedBy != uuid.Nil {
			existingRisk.FinalizedBy = &input.FinalizedBy
		}
		effectiveFrom, cycleErr := CycleStartDate(existingRisk.AssessmentCycle)
		if cycleErr != nil {
			return nil, cycleErr
		}
		existingRisk.EffectiveFrom = &effectiveFrom
	}

	// 8. Save to database
	if err := uc.riskRepo.Update(ctx, existingRisk); err != nil {
		return nil, errors.Wrap(err, "failed to update risk")
	}
	if input.Status == entity.RiskStatusFinal && !wasFinal && uc.taskRepo != nil {
		if _, err := mtuc.NewEnsureTasksForRiskVersionUseCase(uc.taskRepo, uc.riskRepo).Execute(ctx, existingRisk.ID, existingRisk.AssessmentCycle, orgIDs); err != nil {
			// Risk finalization is already committed atomically with version
			// activation. Task generation is a post-commit side effect and is
			// surfaced as a warning so callers do not retry finalization and hit
			// a false failure.
			warnings = append(warnings, fmt.Sprintf("mitigation tasks could not be generated: %v", err))
		}
	}
	// 9. Return result
	return &UpdateRiskOutput{
		ID:        existingRisk.ID,
		Code:      existingRisk.Code,
		Message:   "Risk updated successfully",
		UpdatedAt: existingRisk.UpdatedAt,
		Warnings:  warnings,
	}, nil
}

// finalRiskFieldsChanged is intentionally broader than DetectSubstanceChanges.
// A final risk is an immutable business record: score, profile, ownership,
// assessment metadata, and review metadata can only change through a new
// monitoring transaction/version. A no-op PUT remains harmlessly allowed for
// clients that resend the complete final payload.
func finalRiskFieldsChanged(previous, candidate *entity.Risk) bool {
	if previous == nil || candidate == nil {
		return false
	}
	if len(DetectSubstanceChanges(previous, candidate)) > 0 {
		return true
	}
	if !uuidPtrEqual(previous.OrganizationID, candidate.OrganizationID) ||
		!uuidPtrEqual(previous.ObjectiveID, candidate.ObjectiveID) ||
		!uuidPtrEqual(previous.ROID, candidate.ROID) {
		return true
	}
	if previous.Probability != candidate.Probability ||
		previous.Impact != candidate.Impact ||
		previous.TargetProbability != candidate.TargetProbability ||
		previous.TargetImpact != candidate.TargetImpact ||
		previous.RiskPriority != candidate.RiskPriority ||
		trim(previous.RiskAppetite) != trim(candidate.RiskAppetite) ||
		!stringPtrEqual(previous.NextReviewDate, candidate.NextReviewDate) ||
		trim(previous.ReviewScheduleText) != trim(candidate.ReviewScheduleText) ||
		trim(previous.AssessmentCycle) != trim(candidate.AssessmentCycle) ||
		trim(previous.ReviewType) != trim(candidate.ReviewType) ||
		trim(previous.ChangeReason) != trim(candidate.ChangeReason) ||
		trim(previous.ReviewSummary) != trim(candidate.ReviewSummary) ||
		!reflect.DeepEqual(previous.DraftApprovalLine, candidate.DraftApprovalLine) {
		return true
	}
	return false
}

func stringPtrEqual(a, b *string) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	return trim(*a) == trim(*b)
}

func canonicalRiskStatus(status string) string {
	switch strings.TrimSpace(status) {
	case "approved", "reviewed":
		return entity.RiskStatusFinal
	case "assessment_draft", "assessment_in_review", "in_review", "in_approval":
		return entity.RiskStatusDraft
	default:
		return status
	}
}
