package riskcharter

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type WorkflowUseCase struct {
	repo repository.RiskCharterRepository
}

func NewWorkflowUseCase(repo repository.RiskCharterRepository) *WorkflowUseCase {
	return &WorkflowUseCase{repo: repo}
}

type CharterActionInput struct {
	ID    uuid.UUID
	Actor uuid.UUID
	Scope *entity.AccessScope
}

type CreateRevisionInput struct {
	CharterActionInput
	Reason string
}

type CreateRevisionOutput struct {
	Charter  *entity.RiskCharter `json:"data"`
	Existing bool                `json:"existing"`
}

func (uc *WorkflowUseCase) Finalize(ctx context.Context, input CharterActionInput) (*entity.RiskCharter, error) {
	charter, err := uc.getWritable(ctx, input)
	if err != nil {
		return nil, err
	}
	if charter.Status != entity.RiskCharterStatusDraft {
		return nil, errors.Wrap(errors.ErrInvalidInput, "hanya piagam draf yang dapat difinalisasi")
	}
	if err := charter.ValidateForFinalization(); err != nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, err.Error())
	}
	now := time.Now().UTC()
	actor := input.Actor
	charter.FinalizedBy = &actor
	charter.FinalizedAt = &now
	if err := uc.repo.Finalize(ctx, charter); err != nil {
		return nil, errors.Wrap(err, "failed to finalize risk charter")
	}
	return charter, nil
}

func (uc *WorkflowUseCase) CreateRevision(ctx context.Context, input CreateRevisionInput) (*CreateRevisionOutput, error) {
	source, err := uc.getWritable(ctx, input.CharterActionInput)
	if err != nil {
		return nil, err
	}
	if source.Status != entity.RiskCharterStatusActive || !source.IsCurrent {
		return nil, errors.Wrap(errors.ErrInvalidInput, "hanya piagam aktif current yang dapat direvisi")
	}
	reason := strings.TrimSpace(input.Reason)
	if len([]rune(reason)) < 10 {
		return nil, errors.Wrap(errors.ErrInvalidInput, "alasan revisi minimal 10 karakter")
	}

	existing, err := uc.repo.FindExistingByOrgPeriodLevel(ctx, source.OrganizationID, source.Period, source.UPRLevel)
	if err != nil {
		return nil, errors.Wrap(err, "failed to find existing revision")
	}
	if existing != nil && existing.Status == entity.RiskCharterStatusDraft && existing.VersionGroupID == source.VersionGroupID {
		return &CreateRevisionOutput{Charter: existing, Existing: true}, nil
	}

	actor := input.Actor
	sourceID := source.ID
	revision := *source
	revision.ID = uuid.Nil
	revision.Status = entity.RiskCharterStatusDraft
	revision.PreviousVersionID = &sourceID
	revision.VersionNumber = source.VersionNumber + 1
	revision.IsCurrent = false
	revision.RevisionReason = reason
	revision.CreatedBy = &actor
	revision.FinalizedBy = nil
	revision.FinalizedAt = nil
	revision.ApprovedBy = nil
	revision.ApprovedAt = nil
	revision.CreatedAt = time.Time{}
	revision.UpdatedAt = time.Time{}
	if err := uc.repo.CreateRevision(ctx, source, &revision); err != nil {
		return nil, errors.Wrap(err, "failed to create risk charter revision")
	}
	return &CreateRevisionOutput{Charter: &revision}, nil
}

func (uc *WorkflowUseCase) ListVersions(ctx context.Context, input CharterActionInput) ([]*entity.RiskCharter, error) {
	charter, err := uc.repo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrNotFound
	}
	if !canAccessRiskCharter(input.Scope, charter.OrganizationID) {
		return nil, errors.ErrForbidden
	}
	versions, err := uc.repo.ListVersions(ctx, charter.VersionGroupID)
	if err != nil {
		return nil, errors.Wrap(err, "failed to list risk charter versions")
	}
	if versions == nil {
		versions = []*entity.RiskCharter{}
	}
	return versions, nil
}

func (uc *WorkflowUseCase) Archive(ctx context.Context, input CharterActionInput) (*entity.RiskCharter, error) {
	charter, err := uc.getWritable(ctx, input)
	if err != nil {
		return nil, err
	}
	if charter.Status != entity.RiskCharterStatusActive || !charter.IsCurrent {
		return nil, errors.Wrap(errors.ErrInvalidInput, "hanya piagam aktif current yang dapat diarsipkan")
	}
	if err := uc.repo.Archive(ctx, charter.ID); err != nil {
		return nil, errors.Wrap(err, "failed to archive risk charter")
	}
	charter.Status = entity.RiskCharterStatusArchived
	return charter, nil
}

func (uc *WorkflowUseCase) Restore(ctx context.Context, input CharterActionInput) (*entity.RiskCharter, error) {
	charter, err := uc.getWritable(ctx, input)
	if err != nil {
		return nil, err
	}
	if charter.Status != entity.RiskCharterStatusArchived {
		return nil, errors.Wrap(errors.ErrInvalidInput, "hanya piagam arsip yang dapat dipulihkan")
	}
	existing, err := uc.repo.FindExistingByOrgPeriodLevel(ctx, charter.OrganizationID, charter.Period, charter.UPRLevel)
	if err != nil {
		return nil, errors.Wrap(err, "failed to validate risk charter restoration")
	}
	if existing != nil && existing.ID != charter.ID && existing.IsCurrent {
		return nil, errors.Wrap(errors.ErrInvalidInput, "piagam current untuk tahun yang sama sudah ada")
	}
	if err := uc.repo.Restore(ctx, charter); err != nil {
		return nil, errors.Wrap(err, "failed to restore risk charter")
	}
	return charter, nil
}

func (uc *WorkflowUseCase) DeleteDraft(ctx context.Context, input CharterActionInput) error {
	charter, err := uc.getWritable(ctx, input)
	if err != nil {
		return err
	}
	if charter.Status != entity.RiskCharterStatusDraft {
		return errors.Wrap(errors.ErrInvalidInput, "hanya piagam draf yang dapat dihapus")
	}
	isCreator := charter.CreatedBy != nil && *charter.CreatedBy == input.Actor
	isSuperadmin := input.Scope != nil && input.Scope.Role == entity.RoleSuperAdmin
	if !isCreator && !isSuperadmin {
		return errors.ErrForbidden
	}
	if err := uc.repo.DeleteDraft(ctx, charter.ID); err != nil {
		return errors.Wrap(err, "failed to delete risk charter draft")
	}
	return nil
}

func (uc *WorkflowUseCase) getWritable(ctx context.Context, input CharterActionInput) (*entity.RiskCharter, error) {
	charter, err := uc.repo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, errors.ErrNotFound
	}
	if !canAccessRiskCharter(input.Scope, charter.OrganizationID) {
		return nil, errors.ErrForbidden
	}
	return charter, nil
}
