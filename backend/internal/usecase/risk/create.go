package risk

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

// CreateRiskUseCase handles risk creation business logic
type CreateRiskUseCase struct {
	riskRepo repository.RiskRepository
	userRepo repository.UserRepository
	orgRepo  repository.OrganizationRepository
}

func NewCreateRiskUseCase(
	riskRepo repository.RiskRepository,
	userRepo repository.UserRepository,
	orgRepo repository.OrganizationRepository,
) *CreateRiskUseCase {
	uc := &CreateRiskUseCase{
		riskRepo: riskRepo,
		userRepo: userRepo,
		orgRepo:  orgRepo,
	}
	return uc
}

type CreateRiskInput struct {
	Title          string     `json:"title"`
	Description    string     `json:"description"`
	Category       string     `json:"category"`
	OrganizationID *uuid.UUID `json:"organizationId"`
	CreatedBy      *uuid.UUID `json:"-"`

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
	TargetProbability  int                         `json:"targetProbability"`
	TargetImpact       int                         `json:"targetImpact"`
	TargetWeight       float64                     `json:"targetWeight"`
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

type CreateRiskOutput struct {
	ID        uuid.UUID `json:"id"`
	Code      string    `json:"code"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"createdAt"`
}

func (uc *CreateRiskUseCase) Execute(ctx context.Context, input CreateRiskInput) (*CreateRiskOutput, error) {
	// 1. Validate input
	if input.Title == "" {
		return nil, errors.ErrInvalidTitle
	}
	if input.CreatedBy == nil {
		return nil, errors.ErrInvalidInput
	}
	input.Category = strings.TrimSpace(input.Category)
	if input.Category == "" || !entity.IsValidRiskCategory(input.Category) {
		return nil, errors.ErrInvalidRiskCategory
	}
	// 2. Validate user exists
	_, err := uc.userRepo.GetByID(ctx, *input.CreatedBy)
	if err != nil {
		return nil, errors.ErrCreatorNotFound
	}

	// 3. Validate organization if provided
	if input.OrganizationID != nil {
		_, err := uc.orgRepo.GetByID(ctx, *input.OrganizationID)
		if err != nil {
			return nil, errors.ErrOrganizationNotFound
		}
	}

	// 4. Generate risk code
	nextCode, err := uc.riskRepo.NextRiskCode(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "failed to generate risk code")
	}

	// 5. Validate mitigations
	input.Mitigations = pruneEmptyMitigations(input.Mitigations)
	for i, m := range input.Mitigations {
		if err := m.Validate(); err != nil {
			return nil, errors.ErrMitigationValidationFailed
		}
		input.Mitigations[i] = m
		input.Mitigations[i].RiskID = uuid.Nil // Will be set after risk creation
	}

	if input.AssessmentCycle == "" {
		input.AssessmentCycle = currentAssessmentCycle()
	}
	if !IsValidSemesterFormat(input.AssessmentCycle) {
		return nil, errors.ErrSemesterFormat
	}

	// 6. Create risk entity
	risk := &entity.Risk{
		Code:           nextCode,
		Title:          input.Title,
		Description:    input.Description,
		Category:       input.Category,
		Status:         entity.RiskStatusDraft,
		VersionGroupID: uuid.New(),
		IsCurrent:      true,
		IsCycleCurrent: true,
		VersionNumber:  1,
		OrganizationID: input.OrganizationID,
		CreatedBy:      input.CreatedBy,

		// Section 1
		Cause:           input.Cause,
		RiskSource:      input.RiskSource,
		Controllability: input.Controllability,
		ImpactDesc:      input.ImpactDesc,

		// Section 2
		ExistingControl:      input.ExistingControl,
		ControlEffectiveness: input.ControlEffectiveness,
		Probability:          input.Probability,
		Impact:               input.Impact,
		Weight:               input.Weight,

		// Section 3
		RiskPriority:    input.RiskPriority,
		RiskAppetite:    input.RiskAppetite,
		TreatmentOption: input.TreatmentOption,

		// Section 4
		Mitigations: input.Mitigations,

		// Section 5
		TargetProbability:  input.TargetProbability,
		TargetImpact:       input.TargetImpact,
		TargetWeight:       input.TargetWeight,
		NextReviewDate:     input.NextReviewDate,
		ReviewScheduleText: input.ReviewScheduleText,
		AssessmentCycle:    input.AssessmentCycle,
		ReviewType:         input.ReviewType,
		ChangeReason:       input.ChangeReason,
		ReviewSummary:      input.ReviewSummary,
		DraftApprovalLine:  input.DraftApprovalLine,
		ObjectiveID:        input.ObjectiveID,
		ROID:               input.ROID,
	}
	risk.CalculateAll()

	// 7. Validate risk entity
	if err := risk.Validate(); err != nil {
		return nil, err
	}

	// 8. Save to database
	if err := uc.riskRepo.Create(ctx, risk); err != nil {
		return nil, errors.Wrap(err, "failed to create risk")
	}

	// 9. Return result
	return &CreateRiskOutput{
		ID:        risk.ID,
		Code:      risk.Code,
		Message:   "Risk created successfully",
		CreatedAt: risk.CreatedAt,
	}, nil
}
