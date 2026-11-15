package workingpaper

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

func (uc *UseCase) PreviewRoster(
	ctx context.Context,
	orgID uuid.UUID,
	assessmentCycle string,
	accessibleOrgIDs []uuid.UUID,
	isGlobal bool,
) (*entity.WorkingPaperRosterPreview, error) {
	if strings.TrimSpace(assessmentCycle) == "" {
		return nil, &domainerrors.AppError{Code: "INVALID_INPUT", Message: "assessment cycle is required"}
	}
	if !isValidQuarterFormat(assessmentCycle) {
		return nil, &domainerrors.AppError{Code: "INVALID_INPUT", Message: fmt.Sprintf("invalid assessment cycle %q, expected YYYY-Q1 through YYYY-Q4", assessmentCycle)}
	}

	if orgID == uuid.Nil {
		return nil, &domainerrors.AppError{Code: "INVALID_INPUT", Message: "organization is required"}
	}

	if !isGlobal && !containsOrgID(accessibleOrgIDs, orgID) {
		return nil, &domainerrors.AppError{Code: "INVALID_INPUT", Message: "organization is outside accessible scope"}
	}

	return uc.wpRepo.PreviewPeriodRoster(ctx, orgID, assessmentCycle)
}

func (uc *UseCase) PreviewProfileRoster(ctx context.Context, orgID, profileID uuid.UUID, cutoff string, accessibleOrgIDs []uuid.UUID, isGlobal bool) (*entity.WorkingPaperRosterPreview, error) {
	if orgID == uuid.Nil || profileID == uuid.Nil || (!isGlobal && !containsOrgID(accessibleOrgIDs, orgID)) {
		return nil, &domainerrors.AppError{Code: "INVALID_INPUT", Message: "Pilih profil final dari unit kerja yang dapat diakses."}
	}
	repo, ok := uc.wpRepo.(interface {
		PreviewProfileRoster(context.Context, uuid.UUID, uuid.UUID, string) (*entity.WorkingPaperRosterPreview, error)
	})
	if !ok {
		return nil, fmt.Errorf("working paper repository does not support annual profiles")
	}
	return repo.PreviewProfileRoster(ctx, orgID, profileID, cutoff)
}

func isValidQuarterFormat(cycle string) bool {
	if len(cycle) < 4 {
		return false
	}
	parts := strings.SplitN(cycle, "-", 2)
	if len(parts) != 2 || (parts[1] != "Q1" && parts[1] != "Q2" && parts[1] != "Q3" && parts[1] != "Q4") {
		return false
	}
	for _, c := range parts[0] {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}

func containsOrgID(orgIDs []uuid.UUID, target uuid.UUID) bool {
	for _, id := range orgIDs {
		if id == target {
			return true
		}
	}
	return false
}

func (uc *UseCase) PreviewConfiguredProfileRoster(ctx context.Context, org, profile, period uuid.UUID, cutoff string, accessible []uuid.UUID, global bool) (*entity.WorkingPaperRosterPreview, error) {
	if org == uuid.Nil || profile == uuid.Nil || period == uuid.Nil || (!global && !containsOrgID(accessible, org)) {
		return nil, domainerrors.ErrForbidden
	}
	repo, ok := uc.wpRepo.(interface {
		PreviewConfiguredProfileRoster(context.Context, uuid.UUID, uuid.UUID, uuid.UUID, string) (*entity.WorkingPaperRosterPreview, error)
	})
	if !ok {
		return nil, domainerrors.ErrInvalidInput
	}
	return repo.PreviewConfiguredProfileRoster(ctx, org, profile, period, cutoff)
}
