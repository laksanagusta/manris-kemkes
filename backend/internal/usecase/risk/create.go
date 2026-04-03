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
	return &CreateRiskUseCase{
		riskRepo: riskRepo,
		userRepo: userRepo,
		orgRepo:  orgRepo,
	}
}

type CreateRiskInput struct {
	Title          string
	Description    string
	Category       string
	OrganizationID *uuid.UUID
	CreatedBy      *uuid.UUID

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

type CreateRiskOutput struct {
	ID        uuid.UUID
	Code      string
	Message   string
	CreatedAt time.Time
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
		return nil, errors.Wrap(err, "creator not found")
	}

	// 3. Validate organization if provided
	if input.OrganizationID != nil {
		_, err := uc.orgRepo.GetByID(ctx, *input.OrganizationID)
		if err != nil {
			return nil, errors.Wrap(err, "organization not found")
		}
	}

	// 4. Generate risk code
	nextCode, err := uc.riskRepo.NextRiskCode(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "failed to generate risk code")
	}

	// 5. Validate mitigations
	for i, m := range input.Mitigations {
		if err := m.Validate(); err != nil {
			return nil, errors.Wrap(err, "mitigation validation failed")
		}
		input.Mitigations[i].RiskID = uuid.Nil // Will be set after risk creation
	}

	if input.AssessmentCycle == "" {
		input.AssessmentCycle = currentAssessmentCycle()
	}

	// 6. Create risk entity
	risk := &entity.Risk{
		Code:           nextCode,
		Title:          input.Title,
		Description:    input.Description,
		Category:       input.Category,
		Status:         "draft",
		VersionGroupID: uuid.New(),
		IsCurrent:      true,
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
		TargetProbability: input.TargetProbability,
		TargetImpact:      input.TargetImpact,
		TargetWeight:      input.TargetWeight,
		NextReviewDate:    input.NextReviewDate,
		AssessmentCycle:   input.AssessmentCycle,
		ReviewType:        input.ReviewType,
		ChangeReason:      input.ChangeReason,
		ReviewSummary:     input.ReviewSummary,
		DraftApprovalLine: input.DraftApprovalLine,
	}

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
