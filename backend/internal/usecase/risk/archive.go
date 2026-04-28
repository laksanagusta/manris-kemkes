package risk

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
)

type riskArchiveRepository interface {
	GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.Risk, error)
	Update(ctx context.Context, risk *entity.Risk) error
}

type ArchiveRiskUseCase struct {
	riskRepo riskArchiveRepository
	wpRepo   WorkingPaperLockChecker
}

func NewArchiveRiskUseCase(riskRepo riskArchiveRepository, wpRepo WorkingPaperLockChecker) *ArchiveRiskUseCase {
	return &ArchiveRiskUseCase{riskRepo: riskRepo, wpRepo: wpRepo}
}

type ArchiveRiskInput struct {
	ID     uuid.UUID `json:"id"`
	Reason string    `json:"reason"`
	Note   string    `json:"note"`
}

type ArchiveRiskOutput struct {
	Message        string     `json:"message"`
	ArchivedAt     *time.Time `json:"archivedAt,omitempty"`
	ArchivedReason string     `json:"archivedReason"`
}

func (uc *ArchiveRiskUseCase) Execute(ctx context.Context, input ArchiveRiskInput, orgIDs []uuid.UUID, scope *entity.AccessScope) (*ArchiveRiskOutput, error) {
	risk, err := uc.riskRepo.GetByID(ctx, input.ID, orgIDs)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}

	if err := ensureRiskArchiveWriteAllowed(risk, scope); err != nil {
		return nil, err
	}

	if risk.Status != entity.RiskStatusApproved || !risk.IsCurrent {
		return nil, errors.Wrap(errors.ErrInvalidStatus, "only current approved risks can be archived")
	}
	if risk.ArchivedAt != nil {
		return nil, errors.Wrap(errors.ErrInvalidStatus, "risk is already archived")
	}

	if uc.wpRepo != nil {
		blocked, err := uc.wpRepo.HasBlockingDocumentLink(ctx, risk.ID)
		if err != nil {
			return nil, errors.Wrap(err, "failed to check working paper lock")
		}
		if blocked {
			return nil, errors.Wrap(errors.ErrInvalidStatus, "risk version is locked by a signing or completed working paper")
		}
	}

	reason := strings.TrimSpace(input.Reason)
	note := strings.TrimSpace(input.Note)
	if reason == "" {
		return nil, errors.Wrap(errors.ErrInvalidInput, "archive reason is required")
	}
	if note != "" {
		reason = reason + ": " + note
	}

	now := time.Now().UTC()
	risk.ArchivedAt = &now
	risk.ArchivedReason = reason

	if err := uc.riskRepo.Update(ctx, risk); err != nil {
		return nil, errors.Wrap(err, "failed to archive risk")
	}

	return &ArchiveRiskOutput{
		Message:        "Risk archived successfully",
		ArchivedAt:     risk.ArchivedAt,
		ArchivedReason: risk.ArchivedReason,
	}, nil
}

type RestoreRiskUseCase struct {
	riskRepo riskArchiveRepository
}

func NewRestoreRiskUseCase(riskRepo riskArchiveRepository) *RestoreRiskUseCase {
	return &RestoreRiskUseCase{riskRepo: riskRepo}
}

type RestoreRiskInput struct {
	ID uuid.UUID `json:"id"`
}

type RestoreRiskOutput struct {
	Message string `json:"message"`
}

func (uc *RestoreRiskUseCase) Execute(ctx context.Context, input RestoreRiskInput, orgIDs []uuid.UUID, scope *entity.AccessScope) (*RestoreRiskOutput, error) {
	risk, err := uc.riskRepo.GetByID(ctx, input.ID, orgIDs)
	if err != nil {
		return nil, errors.ErrRiskNotFound
	}

	if err := ensureRiskArchiveWriteAllowed(risk, scope); err != nil {
		return nil, err
	}
	if risk.ArchivedAt == nil {
		return nil, errors.Wrap(errors.ErrInvalidStatus, "risk is not archived")
	}

	risk.ArchivedAt = nil
	risk.ArchivedReason = ""

	if err := uc.riskRepo.Update(ctx, risk); err != nil {
		return nil, errors.Wrap(err, "failed to restore risk")
	}

	return &RestoreRiskOutput{Message: "Risk restored successfully"}, nil
}

func ensureRiskArchiveWriteAllowed(risk *entity.Risk, scope *entity.AccessScope) error {
	if scope == nil {
		return errors.ErrForbidden
	}
	role := entity.NormalizeRole(scope.Role)
	if role != entity.RoleSuperAdmin && role != entity.RoleUnit {
		return errors.ErrForbidden
	}
	if risk.OrganizationID != nil && !scope.CanWrite(*risk.OrganizationID) {
		return errors.ErrForbidden
	}
	return nil
}
