package workingpaper

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	riskusecase "github.com/manris/backend/internal/usecase/risk"
)

const (
	riskSourceModeLatestApproved = "latest_approved"
	riskSourceModeReviewPeriodic = "review_periodic"
)

type resolvedWorkingPaperRisk struct {
	link entity.WorkingPaperRiskLink
	risk *entity.Risk
}

type periodicReassessmentReservation interface {
	GetOrCreatePeriodicReassessmentInTx(ctx context.Context, sourceRisk *entity.Risk, cycle string) (*entity.Risk, bool, error)
}

func normalizeRiskSourceMode(sourceMode string) string {
	if sourceMode == "" {
		return riskSourceModeLatestApproved
	}
	return sourceMode
}

func resolveLinkedRisk(ctx context.Context, repo repository.RiskRepository, riskID uuid.UUID, cycle string, sourceMode string, orgIDs []uuid.UUID) (*resolvedWorkingPaperRisk, error) {
	sourceRisk, err := repo.GetByID(ctx, riskID, orgIDs)
	if err != nil {
		return nil, &domainerrors.AppError{
			Code:    "RISK_NOT_FOUND",
			Message: fmt.Sprintf("risk %s not found", riskID),
		}
	}

	sourceMode = normalizeRiskSourceMode(sourceMode)
	switch sourceMode {
	case riskSourceModeLatestApproved:
		if !sourceRisk.IsApprovedCurrent() {
			return nil, &domainerrors.AppError{
				Code:    "INVALID_STATUS",
				Message: fmt.Sprintf("risk %s is not the current approved version", riskID),
			}
		}
		return &resolvedWorkingPaperRisk{
			link: buildWorkingPaperRiskLink(sourceRisk, sourceMode),
			risk: sourceRisk,
		}, nil
	case riskSourceModeReviewPeriodic:
		if !sourceRisk.CanBeReassessed() {
			return nil, &domainerrors.AppError{
				Code:    "INVALID_STATUS",
				Message: fmt.Sprintf("risk %s cannot start periodic review", riskID),
			}
		}

		draftRisk, err := resolveOrCreateReassessmentDraft(ctx, repo, sourceRisk, cycle)
		if err != nil {
			return nil, err
		}

		return &resolvedWorkingPaperRisk{
			link: buildWorkingPaperRiskLink(draftRisk, sourceMode),
			risk: draftRisk,
		}, nil
	default:
		return nil, &domainerrors.AppError{
			Code:    "INVALID_INPUT",
			Message: fmt.Sprintf("unsupported risk_source_mode %q", sourceMode),
		}
	}
}

func resolveOrCreateReassessmentDraft(ctx context.Context, repo repository.RiskRepository, sourceRisk *entity.Risk, cycle string) (*entity.Risk, error) {
	if cycle == "" {
		return nil, &domainerrors.AppError{Code: "INVALID_INPUT", Message: "assessment_cycle is required for review_periodic risk source mode"}
	}
	if !riskusecase.IsValidCycleFormat(cycle) {
		return nil, &domainerrors.AppError{Code: "INVALID_INPUT", Message: "assessment_cycle must be in YYYY-HN format (e.g. 2026-H1)"}
	}
	if manager, ok := repo.(periodicReassessmentReservation); ok {
		reservedRisk, created, err := manager.GetOrCreatePeriodicReassessmentInTx(ctx, sourceRisk, cycle)
		if err != nil {
			return nil, domainerrors.Wrap(err, "failed to reserve reassessment draft")
		}
		if !created {
			if reservedRisk != nil && reservedRisk.Status == entity.RiskStatusDraft {
				return reservedRisk, nil
			}
			return nil, domainerrors.Wrap(domainerrors.ErrInvalidStatus, "an in-progress reassessment already exists for this cycle")
		}
		return reservedRisk, nil
	}

	versions, err := repo.ListVersions(ctx, sourceRisk.VersionGroupID)
	if err != nil {
		return nil, domainerrors.Wrap(err, "failed to load risk versions")
	}

	if existing := riskusecase.FindInProgressReassessmentForCycle(versions, cycle); existing != nil {
		if existing.Status == entity.RiskStatusDraft {
			return existing, nil
		}
		return nil, domainerrors.Wrap(domainerrors.ErrInvalidStatus, "an in-progress reassessment already exists for this cycle")
	}

	draft := riskusecase.BuildPeriodicReassessmentDraft(sourceRisk, cycle, time.Now().UTC())
	if err := repo.Create(ctx, draft); err != nil {
		return nil, domainerrors.Wrap(err, "failed to create reassessment draft")
	}
	return draft, nil
}

func buildWorkingPaperRiskLink(risk *entity.Risk, sourceMode string) entity.WorkingPaperRiskLink {
	return entity.WorkingPaperRiskLink{
		RiskID:     risk.ID,
		SourceMode: sourceMode,
		CreatedAt:  time.Now().UTC(),
		Risk:       buildWorkingPaperRiskData(risk),
	}
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
		Bobot:                effectiveWorkingPaperWeight(risk),
		Nilai:                risk.EffectiveNilai(),
		Cause:                append([]string(nil), risk.Cause...),
		RiskSource:           risk.RiskSource,
		Controllability:      risk.Controllability,
		ImpactDesc:           append([]string(nil), risk.ImpactDesc...),
		ExistingControl:      risk.ExistingControl,
		ControlEffectiveness: risk.ControlEffectiveness,
		RiskAppetite:         risk.RiskAppetite,
		TreatmentOption:      risk.TreatmentOption,
		TargetProbability:    risk.TargetProbability,
		TargetImpact:         risk.TargetImpact,
		TargetBobot:          risk.TargetWeight,
		TargetNilai:          risk.TargetNilai,
		AssessmentCycle:      risk.AssessmentCycle,
	}
	data.NormalizeDerivedScores()
	return data
}

func effectiveWorkingPaperWeight(risk *entity.Risk) float64 {
	return risk.Weight
}
