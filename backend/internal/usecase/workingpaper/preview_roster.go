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
	if !isValidSemesterFormat(assessmentCycle) {
		return nil, &domainerrors.AppError{Code: "INVALID_INPUT", Message: fmt.Sprintf("invalid assessment cycle %q, expected YYYY-H1 or YYYY-H2", assessmentCycle)}
	}

	if orgID == uuid.Nil {
		return nil, &domainerrors.AppError{Code: "INVALID_INPUT", Message: "organization is required"}
	}

	if !isGlobal && !containsOrgID(accessibleOrgIDs, orgID) {
		return nil, &domainerrors.AppError{Code: "INVALID_INPUT", Message: "organization is outside accessible scope"}
	}

	return uc.wpRepo.PreviewPeriodRoster(ctx, orgID, assessmentCycle)
}

func isValidSemesterFormat(cycle string) bool {
	if len(cycle) < 4 {
		return false
	}
	parts := strings.SplitN(cycle, "-", 2)
	if len(parts) != 2 || (parts[1] != "H1" && parts[1] != "H2") {
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
