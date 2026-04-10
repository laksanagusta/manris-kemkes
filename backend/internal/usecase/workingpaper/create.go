package workingpaper

import (
	"context"
	"fmt"
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
	Title           string
	Description     string
	AssessmentCycle string
	OrgID           uuid.UUID
	CreatedByUserID uuid.UUID
	RiskIDs         []uuid.UUID
	Signatories     []CreateSignatoryInput
}

// Create builds a working paper with risk snapshots from approved risks and persists it.
func (uc *UseCase) Create(ctx context.Context, input CreateWorkingPaperInput) (*entity.WorkingPaper, error) {
	if input.Title == "" {
		return nil, domainerrors.ErrInvalidTitle
	}
	if len(input.RiskIDs) == 0 {
		return nil, &domainerrors.AppError{Code: "INVALID_INPUT", Message: "at least one risk ID is required"}
	}
	if len(input.Signatories) == 0 {
		return nil, &domainerrors.AppError{Code: "INVALID_INPUT", Message: "at least one signatory is required"}
	}

	snapshots := make([]entity.RiskSnapshot, 0, len(input.RiskIDs))
	for _, riskID := range input.RiskIDs {
		risk, err := uc.riskRepo.GetByID(ctx, riskID, []uuid.UUID{input.OrgID})
		if err != nil {
			return nil, &domainerrors.AppError{
				Code:    "RISK_NOT_FOUND",
				Message: fmt.Sprintf("risk %s not found", riskID),
			}
		}
		if risk.Status != entity.RiskStatusApproved {
			return nil, &domainerrors.AppError{
				Code:    "INVALID_STATUS",
				Message: fmt.Sprintf("risk %s is not approved (status: %s)", riskID, risk.Status),
			}
		}

		snapshots = append(snapshots, buildRiskSnapshot(risk))
	}

	now := time.Now()
	wp := entity.WorkingPaper{
		ID:                       uuid.New(),
		Title:                    input.Title,
		Description:              input.Description,
		OrgID:                    input.OrgID,
		Status:                   entity.WorkingPaperStatusDraft,
		AssessmentCycle:          input.AssessmentCycle,
		RiskSnapshots:            snapshots,
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

	return &wp, nil
}

func buildRiskSnapshot(risk *entity.Risk) entity.RiskSnapshot {
	return entity.RiskSnapshot{
		OriginalRiskID:              risk.ID,
		Code:                        risk.Code,
		Title:                       risk.Title,
		Description:                 risk.Description,
		Category:                    risk.Category,
		OrgName:                     risk.OrgName,
		Probability:                 risk.Probability,
		Impact:                      risk.Impact,
		Bobot:                       risk.Weight,
		Nilai:                       risk.Nilai,
		TingkatRisiko:               riskLevelFromScore(risk.Probability, risk.Impact),
		PrioritasRisiko:             risk.RiskPriority,
		Sebab:                       risk.Cause,
		SumberRisiko:                risk.RiskSource,
		ControlUncontrol:            risk.Controllability,
		Dampak:                      risk.ImpactDesc,
		PengendalianUraian:          risk.ExistingControl,
		PengendalianEfektif:         risk.ControlEffectiveness,
		PengendalianAdaTidakEfektif: "",
		SeleraRisiko:                risk.RiskAppetite,
		PenangananRisiko:            risk.TreatmentOption,
		RPRUraian:                   "",
		RPRJadwal:                   "",
		RPRPenanggungJawab:          "",
		TargetP:                     risk.TargetProbability,
		TargetD:                     risk.TargetImpact,
		TargetBobot:                 risk.TargetWeight,
		TargetNilai:                 risk.TargetNilai,
		TargetTingkatRisiko:         riskLevelFromScore(risk.TargetProbability, risk.TargetImpact),
	}
}

func riskLevelFromScore(probability, impact int) string {
	score := probability * impact
	switch {
	case score <= 4:
		return entity.RiskLevelSangatRendah
	case score <= 8:
		return entity.RiskLevelRendah
	case score <= 12:
		return entity.RiskLevelSedang
	case score <= 16:
		return entity.RiskLevelTinggi
	default:
		return entity.RiskLevelSangatTinggi
	}
}
