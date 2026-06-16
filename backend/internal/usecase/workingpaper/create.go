package workingpaper

import (
	"context"
	"fmt"
	"strings"
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

type CreateWorkingPaperInput struct {
	AssessmentCycle  string
	OrganizationID   uuid.UUID
	RosterRevision   string
	AccessibleOrgIDs []uuid.UUID
	IsGlobal         bool
	CreatedByUserID  uuid.UUID
	Decisions        []entity.WorkingPaperRosterDecision
	Signatories      []CreateSignatoryInput
}

func (uc *UseCase) Create(ctx context.Context, input CreateWorkingPaperInput) (*entity.WorkingPaper, error) {
	if len(input.Signatories) == 0 {
		return nil, &domainerrors.AppError{Code: "INVALID_INPUT", Message: "at least one signatory is required"}
	}
	if !riskusecase.IsValidSemesterFormat(input.AssessmentCycle) {
		return nil, domainerrors.ErrSemesterFormat
	}
	if len(input.Decisions) == 0 {
		return nil, &domainerrors.AppError{Code: "INVALID_INPUT", Message: "roster decisions are required"}
	}

	included := 0
	for _, decision := range input.Decisions {
		if decision.Included {
			included++
			continue
		}
		if strings.TrimSpace(decision.ExclusionReason) == "" {
			return nil, &domainerrors.AppError{Code: "INVALID_INPUT", Message: "exclusion reason is required"}
		}
	}
	if included == 0 {
		return nil, &domainerrors.AppError{Code: "INVALID_INPUT", Message: "at least one roster risk must be included"}
	}

	title := fmt.Sprintf("Kertas Kerja %s", input.AssessmentCycle)

	now := time.Now()
	wp := entity.WorkingPaper{
		ID:                       uuid.New(),
		Title:                    title,
		OrgID:                    input.OrganizationID,
		Status:                   entity.WorkingPaperStatusDraft,
		AssessmentCycle:          input.AssessmentCycle,
		CurrentSignatorySequence: 0,
		CreatedBy:                input.CreatedByUserID,
		CreatedAt:                now,
		UpdatedAt:                now,
	}

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

	if err := uc.wpRepo.CreateWithPeriodRoster(
		ctx,
		&wp,
		input.RosterRevision,
		input.Decisions,
	); err != nil {
		return nil, err
	}

	return &wp, nil
}

func buildWorkingPaperRiskData(risk *entity.Risk) entity.WorkingPaperRiskData {
	data := entity.WorkingPaperRiskData{
		ID:                   risk.ID,
		Code:                 risk.Code,
		Title:                risk.Title,
		Description:          risk.Description,
		Category:             risk.Category,
		Status:               risk.Status,
		OrgName:              risk.OrgName,
		Probability:          risk.EffectiveProbability(),
		Impact:               risk.EffectiveImpact(),
		Bobot:                risk.Weight,
		Nilai:                risk.EffectiveNilai(),
		InherentScore:        risk.GetEffectiveScore(),
		Cause:                append([]string(nil), risk.Cause...),
		RiskSource:           risk.RiskSource,
		Controllability:      risk.Controllability,
		ImpactDesc:           append([]string(nil), risk.ImpactDesc...),
		ExistingControl:      risk.ExistingControl,
		ControlEffectiveness: risk.ControlEffectiveness,
		RiskAppetite:         risk.RiskAppetite,
		TreatmentOption:      risk.TreatmentOption,
		TargetProbability:    risk.TargetProbability,
		TargetImpact:          risk.TargetImpact,
		TargetBobot:          risk.TargetWeight,
		TargetNilai:          risk.TargetNilai,
		AssessmentCycle:      risk.AssessmentCycle,
		VersionNumber:        risk.VersionNumber,
		JadwalPelaksanaan:    risk.ReviewScheduleText,
	}
	data.NormalizeDerivedScores()
	return data
}
