package workingpaper

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

type CreateSignatoryInput struct {
	UserID          uuid.UUID
	SequenceNo      int
	SignerName      string
	SignerNIP       string
	SignerTitle     string
	SignerRoleLabel string
}

type CreateWorkingPaperInput struct {
	Title            string
	Description      string
	AssessmentCycle  string
	RiskSourceMode   string
	AccessibleOrgIDs []uuid.UUID
	OrgID            uuid.UUID
	CreatedByUserID  uuid.UUID
	RiskIDs          []uuid.UUID
	Signatories      []CreateSignatoryInput
}

func (uc *UseCase) Create(ctx context.Context, input CreateWorkingPaperInput) (*entity.WorkingPaper, error) {
	input.RiskSourceMode = normalizeRiskSourceMode(input.RiskSourceMode)

	if input.Title == "" {
		return nil, domainerrors.ErrInvalidTitle
	}
	if len(input.RiskIDs) == 0 {
		return nil, &domainerrors.AppError{Code: "INVALID_INPUT", Message: "at least one risk ID is required"}
	}
	if len(input.Signatories) == 0 {
		return nil, &domainerrors.AppError{Code: "INVALID_INPUT", Message: "at least one signatory is required"}
	}

	lookupOrgIDs := append([]uuid.UUID(nil), input.AccessibleOrgIDs...)
	if len(lookupOrgIDs) == 0 && input.OrgID != uuid.Nil {
		lookupOrgIDs = []uuid.UUID{input.OrgID}
	}

	linkedRisks := make([]entity.WorkingPaperRiskLink, 0, len(input.RiskIDs))
	resolvedOrgID := input.OrgID
	for idx, riskID := range input.RiskIDs {
		resolvedRisk, err := resolveLinkedRisk(ctx, uc.riskRepo, riskID, input.AssessmentCycle, input.RiskSourceMode, lookupOrgIDs)
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
	}
	if resolvedOrgID == uuid.Nil {
		return nil, &domainerrors.AppError{Code: "INVALID_INPUT", Message: "unable to determine working paper organization"}
	}

	now := time.Now()
	wp := entity.WorkingPaper{
		ID:                       uuid.New(),
		Title:                    input.Title,
		Description:              input.Description,
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
			ID:              uuid.New(),
			WorkingPaperID:  wp.ID,
			UserID:          s.UserID,
			SequenceNo:      s.SequenceNo,
			SignerName:      s.SignerName,
			SignerNIP:       s.SignerNIP,
			SignerTitle:     s.SignerTitle,
			SignerRoleLabel: s.SignerRoleLabel,
			Status:          "pending",
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
