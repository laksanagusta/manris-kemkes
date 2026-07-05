package riskcascade

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	mtuc "github.com/manris/backend/internal/usecase/mitigation_task"
)

type DecideUseCase struct {
	cascadeRepo        repository.RiskCascadeRepository
	riskRepo           repository.RiskRepository
	orgRepo            repository.OrganizationRepository
	userRepo           repository.UserRepository
	mitigationTaskRepo repository.MitigationTaskRepository
}

type DecideInput struct {
	ID            uuid.UUID `json:"-"`
	Decision      string    `json:"decision"`
	AdoptionType  string    `json:"adoptionType,omitempty"`
	DecisionNote  string    `json:"decisionNote"`
	CreatedBy     uuid.UUID `json:"-"`
	CreatedByName string    `json:"-"`
	OrgIDs        []uuid.UUID
}

type DecideOutput struct {
	Cascade *entity.RiskCascade `json:"cascade"`
	RiskID  *uuid.UUID          `json:"riskId,omitempty"`
}

func NewDecideUseCase(
	cascadeRepo repository.RiskCascadeRepository,
	riskRepo repository.RiskRepository,
	orgRepo repository.OrganizationRepository,
	userRepo repository.UserRepository,
	mitigationTaskRepo repository.MitigationTaskRepository,
) *DecideUseCase {
	return &DecideUseCase{
		cascadeRepo:        cascadeRepo,
		riskRepo:           riskRepo,
		orgRepo:            orgRepo,
		userRepo:           userRepo,
		mitigationTaskRepo: mitigationTaskRepo,
	}
}

func (uc *DecideUseCase) Execute(ctx context.Context, input DecideInput) (*DecideOutput, error) {
	if input.ID == uuid.Nil {
		return nil, errors.ErrInvalidInput
	}

	cascade, err := uc.cascadeRepo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrRiskCascadeNotFound
	}
	if !isOrgAccessible(cascade.TargetOrgID, input.OrgIDs) {
		return nil, errors.ErrForbidden
	}
	if cascade.Status != "proposed" && cascade.Status != "analyzed" {
		return nil, errors.ErrCascadeNotDecidable
	}

	now := time.Now().UTC()
	cascade.DecidedBy = &input.CreatedBy
	cascade.DecidedAt = &now
	cascade.DecisionNote = input.DecisionNote

	switch input.Decision {
	case "reject":
		cascade.Status = "rejected"
		cascade.AdoptionType = ""
		if err := cascade.Validate(); err != nil {
			return nil, errors.Wrap(errors.ErrInvalidInput, err.Error())
		}
		if err := uc.cascadeRepo.Update(ctx, cascade); err != nil {
			return nil, errors.Wrap(err, "failed to update risk cascade")
		}
		return &DecideOutput{Cascade: cascade}, nil
	case "accept":
	default:
		return nil, errors.ErrCascadeDecisionInvalid
	}

	if input.AdoptionType != "full" && input.AdoptionType != "partial" {
		return nil, errors.ErrAdoptionTypeInvalid
	}
	cascade.Status = "accepted"
	cascade.AdoptionType = input.AdoptionType
	if err := cascade.Validate(); err != nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, err.Error())
	}
	if err := uc.cascadeRepo.Update(ctx, cascade); err != nil {
		return nil, errors.Wrap(err, "failed to mark cascade accepted")
	}

	sourceRisk, err := uc.riskRepo.GetByID(ctx, cascade.SourceRiskID, nil)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}
	if sourceRisk.OrganizationID == nil {
		return nil, errors.ErrSourceRiskOrgRequired
	}
	if _, err := uc.orgRepo.GetByID(ctx, cascade.TargetOrgID); err != nil {
		return nil, errors.ErrTargetOrganizationNotFound
	}

	approverName := uc.resolveApproverName(ctx, input.CreatedBy, input.CreatedByName)
	newRisk, err := buildCascadeRiskApproved(sourceRisk, cascade.TargetOrgID, sourceRisk.Code, input.CreatedBy, approverName, input.AdoptionType)
	if err != nil {
		return nil, err
	}
	if err := uc.riskRepo.Create(ctx, newRisk); err != nil {
		return nil, errors.Wrap(err, "failed to create cascaded risk")
	}
	if err := uc.riskRepo.ActivateApprovedVersion(ctx, newRisk.ID); err != nil {
		return nil, errors.Wrap(err, "failed to activate cascaded risk")
	}
	if uc.mitigationTaskRepo != nil {
		if _, err := mtuc.NewEnsureTasksForRiskVersionUseCase(uc.mitigationTaskRepo, uc.riskRepo).Execute(ctx, newRisk.ID, newRisk.AssessmentCycle, []uuid.UUID{cascade.TargetOrgID}); err != nil {
			return nil, errors.Wrap(err, "failed to create mitigation tasks")
		}
	}

	cascade.TargetRiskID = &newRisk.ID
	cascade.Status = "implemented"
	if err := uc.cascadeRepo.Update(ctx, cascade); err != nil {
		return nil, errors.Wrap(err, "failed to finalize cascade")
	}

	return &DecideOutput{Cascade: cascade, RiskID: &newRisk.ID}, nil
}

func (uc *DecideUseCase) resolveApproverName(ctx context.Context, createdBy uuid.UUID, fallback string) string {
	if uc.userRepo != nil && createdBy != uuid.Nil {
		if user, err := uc.userRepo.GetByID(ctx, createdBy); err == nil && user != nil {
			if name := strings.TrimSpace(user.Name); name != "" {
				return name
			}
		}
	}
	if name := strings.TrimSpace(fallback); name != "" {
		return name
	}
	if createdBy != uuid.Nil {
		return createdBy.String()
	}
	return ""
}

func buildCascadeRiskApproved(source *entity.Risk, targetOrgID uuid.UUID, code string, createdBy uuid.UUID, createdByName string, adoptionType string) (*entity.Risk, error) {
	now := time.Now().UTC()
	clone := *source
	clone.ID = uuid.Nil
	clone.Code = code
	clone.VersionGroupID = source.VersionGroupID
	clone.PreviousRiskID = &source.ID
	clone.VersionNumber = source.VersionNumber + 1
	clone.IsCurrent = false
	clone.IsCycleCurrent = false
	clone.Status = entity.RiskStatusDraft
	clone.ArchivedAt = nil
	clone.ArchivedReason = ""
	clone.OrganizationID = &targetOrgID
	clone.AssessmentCycle = currentAssessmentCycle()
	clone.ReviewType = "cascade_" + adoptionType
	clone.ReviewStartedAt = &now
	clone.ReviewSubmittedAt = nil
	clone.ReviewApprovedAt = nil
	clone.ChangeReason = "Diadopsi dari cascaded risk " + source.Code
	clone.ReviewSummary = ""
	clone.Cause = append([]string(nil), source.Cause...)
	clone.ImpactDesc = append([]string(nil), source.ImpactDesc...)
	clone.Mitigations = make([]entity.Mitigation, len(source.Mitigations))
	for i, mitigation := range source.Mitigations {
		copied := mitigation
		copied.ID = uuid.Nil
		copied.RiskID = uuid.Nil
		copied.OwnerUserID = nil
		if createdBy != uuid.Nil {
			copied.OwnerUserID = &createdBy
			copied.Owner = strings.TrimSpace(createdByName)
			if copied.Owner == "" {
				copied.Owner = createdBy.String()
			}
		}
		clone.Mitigations[i] = copied
	}
	if createdBy != uuid.Nil {
		clone.CreatedBy = &createdBy
	}
	return &clone, nil
}
