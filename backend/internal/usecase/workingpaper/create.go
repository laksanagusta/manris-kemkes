package workingpaper

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	riskusecase "github.com/manris/backend/internal/usecase/risk"
)

type CreateSignatoryInput struct {
	UserID        uuid.UUID
	SequenceNo    int
	SignerName    string
	SignerNIP     string
	SignerJabatan string
	SignerPangkat string
}

type RiskInput struct {
	RiskID     uuid.UUID
	SourceMode string
}

type CreateWorkingPaperInput struct {
	AssessmentCycle  string
	AccessibleOrgIDs []uuid.UUID
	OrgID            uuid.UUID
	CreatedByUserID  uuid.UUID
	Risks            []RiskInput
	Signatories      []CreateSignatoryInput
}

func (uc *UseCase) Create(ctx context.Context, input CreateWorkingPaperInput) (*entity.WorkingPaper, error) {
	if len(input.Risks) == 0 {
		return nil, &domainerrors.AppError{Code: "INVALID_INPUT", Message: "at least one risk is required"}
	}
	if len(input.Signatories) == 0 {
		return nil, &domainerrors.AppError{Code: "INVALID_INPUT", Message: "at least one signatory is required"}
	}
	if !riskusecase.IsValidSemesterFormat(input.AssessmentCycle) {
		return nil, domainerrors.Wrap(domainerrors.ErrInvalidInput, "assessment_cycle must be in YYYY-HN format (e.g. 2026-H1)")
	}

	lookupOrgIDs := append([]uuid.UUID(nil), input.AccessibleOrgIDs...)
	if len(lookupOrgIDs) == 0 && input.OrgID != uuid.Nil {
		lookupOrgIDs = []uuid.UUID{input.OrgID}
	}

	linkedRisks := make([]entity.WorkingPaperRiskLink, 0, len(input.Risks))
	var reviewPeriodicResolved []resolvedWorkingPaperRisk
	resolvedOrgID := input.OrgID
	for idx, ri := range input.Risks {
		sourceMode := normalizeRiskSourceMode(ri.SourceMode)
		resolvedRisk, err := resolveLinkedRisk(ctx, uc.riskRepo, ri.RiskID, input.AssessmentCycle, sourceMode, lookupOrgIDs, input.CreatedByUserID)
		if err != nil {
			return nil, err
		}
		if resolvedRisk.risk.OrganizationID == nil {
			if resolvedOrgID == uuid.Nil {
				return nil, &domainerrors.AppError{Code: "INVALID_RISK", Message: "resolved risk is missing organization_id"}
			}
		} else if resolvedOrgID == uuid.Nil {
			resolvedOrgID = *resolvedRisk.risk.OrganizationID
		} else if resolvedOrgID != *resolvedRisk.risk.OrganizationID {
			return nil, &domainerrors.AppError{Code: "INVALID_INPUT", Message: "all selected risks must belong to the same organization"}
		}
		if resolvedRisk.risk.OrganizationID == nil && resolvedOrgID == uuid.Nil {
			return nil, &domainerrors.AppError{Code: "INVALID_RISK", Message: "resolved risk is missing organization_id"}
		}

		resolvedRisk.link.SortOrder = idx
		linkedRisks = append(linkedRisks, resolvedRisk.link)

		if sourceMode == riskSourceModeReviewPeriodic {
			reviewPeriodicResolved = append(reviewPeriodicResolved, *resolvedRisk)
		}
	}
	if resolvedOrgID == uuid.Nil {
		return nil, &domainerrors.AppError{Code: "INVALID_INPUT", Message: "unable to determine working paper organization"}
	}

	existingCount, err := uc.wpRepo.CountByOrgAndCycle(ctx, resolvedOrgID, input.AssessmentCycle)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to check existing working papers for this semester")
	}
	if existingCount > 0 {
		return nil, &domainerrors.AppError{
			Code:    "SEMESTER_CONFLICT",
			Message: fmt.Sprintf("a working paper already exists for organization in %s", input.AssessmentCycle),
		}
	}

	targetQuarter, err := riskusecase.SemesterToTargetQuarter(input.AssessmentCycle)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to determine target quarter from semester")
	}

	for _, resolved := range reviewPeriodicResolved {
		if resolved.sourceRisk == nil {
			continue
		}

		existing, err := uc.monitoringRepo.GetByVersionGroupAndCycle(ctx, resolved.sourceRisk.VersionGroupID, targetQuarter)
		if err != nil {
			return nil, domainerrors.Wrap(err, "failed to check existing monitoring for target quarter")
		}
		if existing != nil {
			return nil, &domainerrors.AppError{
				Code:    "MONITORING_CONFLICT",
				Message: fmt.Sprintf("a risk monitoring transaction already exists for risk %s in %s", resolved.sourceRisk.ID, targetQuarter),
			}
		}

		monitoring := entity.NewRiskMonitoringDraft(resolved.sourceRisk, targetQuarter, input.CreatedByUserID)
		if err := uc.monitoringRepo.Create(ctx, monitoring); err != nil {
			return nil, domainerrors.Wrap(err, "failed to create quarterly monitoring transaction")
		}
	}

	now := time.Now()
	wp := entity.WorkingPaper{
		ID:                       uuid.New(),
		Title:                    fmt.Sprintf("Kertas Kerja %s", input.AssessmentCycle),
		OrgID:                    resolvedOrgID,
		Status:                   entity.WorkingPaperStatusDraft,
		AssessmentCycle:          input.AssessmentCycle,
		Risks:                    linkedRisks,
		CurrentSignatorySequence: 0,
		CreatedBy:                input.CreatedByUserID,
		CreatedAt:                now,
		UpdatedAt:                now,
	}

	wp.DocumentHash = wp.ComputeHash()

	signatories := make([]entity.WorkingPaperSignatory, 0, len(input.Signatories))
	for _, s := range input.Signatories {
		signatories = append(signatories, entity.WorkingPaperSignatory{
			ID:             uuid.New(),
			WorkingPaperID: wp.ID,
			UserID:         s.UserID,
			SequenceNo:     s.SequenceNo,
			SignerName:     s.SignerName,
			SignerNIP:      s.SignerNIP,
			SignerJabatan:  s.SignerJabatan,
			SignerPangkat:  s.SignerPangkat,
			Status:         "pending",
		})
	}
	wp.Signatories = signatories

	if err := wp.Validate(); err != nil {
		return nil, err
	}

	if err := uc.wpRepo.Create(ctx, &wp); err != nil {
		return nil, domainerrors.Wrap(err, "failed to create working paper")
	}
	for i := range wp.Risks {
		wp.Risks[i].WorkingPaperID = wp.ID
	}

	return &wp, nil
}
