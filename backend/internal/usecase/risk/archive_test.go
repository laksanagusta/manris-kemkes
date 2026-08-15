package risk

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

type archiveRiskRepo struct {
	byID      *entity.Risk
	updated   *entity.Risk
	updateErr error
}

func (r *archiveRiskRepo) GetByID(_ context.Context, _ uuid.UUID, _ []uuid.UUID) (*entity.Risk, error) {
	if r.byID == nil {
		return nil, errors.New("not found")
	}
	copy := *r.byID
	return &copy, nil
}

func (r *archiveRiskRepo) Update(_ context.Context, risk *entity.Risk) error {
	if r.updateErr != nil {
		return r.updateErr
	}
	copy := *risk
	r.updated = &copy
	r.byID = &copy
	return nil
}

type archiveLockChecker struct {
	blocked bool
}

func (r *archiveLockChecker) HasBlockingDocumentLink(_ context.Context, _ uuid.UUID) (bool, error) {
	return r.blocked, nil
}

func TestArchiveRiskUseCase_ExecuteArchivesApprovedCurrentRisk(t *testing.T) {
	orgID := uuid.New()
	repo := &archiveRiskRepo{
		byID: &entity.Risk{
			ID:             uuid.New(),
			Code:           "R-001",
			Title:          "Server outage",
			Status:         entity.RiskStatusApproved,
			IsCurrent:      true,
			OrganizationID: &orgID,
			VersionGroupID: uuid.New(),
			Probability:    3,
			Impact:         4,
		},
	}
	scope := &entity.AccessScope{
		Role:           entity.RoleUnit,
		OrganizationID: &orgID,
	}

	uc := NewArchiveRiskUseCase(repo, &archiveLockChecker{})
	result, err := uc.Execute(context.Background(), ArchiveRiskInput{
		ID:     repo.byID.ID,
		Reason: "Risiko sudah tidak relevan",
	}, nil, scope)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result == nil || result.ArchivedAt == nil {
		t.Fatal("expected archived result with archivedAt")
	}
	if repo.updated == nil {
		t.Fatal("expected risk to be updated")
	}
	if repo.updated.ArchivedAt == nil {
		t.Fatal("expected archived_at to be set")
	}
	if repo.updated.ArchivedReason != "Risiko sudah tidak relevan" {
		t.Fatalf("expected archived reason to persist, got %q", repo.updated.ArchivedReason)
	}
}

func TestArchiveRiskUseCase_ExecuteRejectsDraftRisk(t *testing.T) {
	orgID := uuid.New()
	repo := &archiveRiskRepo{
		byID: &entity.Risk{
			ID:             uuid.New(),
			Status:         entity.RiskStatusDraft,
			IsCurrent:      true,
			OrganizationID: &orgID,
			VersionGroupID: uuid.New(),
			Probability:    3,
			Impact:         4,
		},
	}
	scope := &entity.AccessScope{
		Role:           entity.RoleUnit,
		OrganizationID: &orgID,
	}

	uc := NewArchiveRiskUseCase(repo, &archiveLockChecker{})
	_, err := uc.Execute(context.Background(), ArchiveRiskInput{
		ID:     repo.byID.ID,
		Reason: "Tidak relevan",
	}, nil, scope)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !errors.Is(err, domainerrors.ErrOnlyApprovedCurrentArchived) {
		t.Fatalf("expected ErrOnlyApprovedCurrentArchived, got %v", err)
	}
}

func TestArchiveRiskUseCase_ExecuteRejectsBlockedWorkingPaperRisk(t *testing.T) {
	orgID := uuid.New()
	repo := &archiveRiskRepo{
		byID: &entity.Risk{
			ID:             uuid.New(),
			Status:         entity.RiskStatusApproved,
			IsCurrent:      true,
			OrganizationID: &orgID,
			VersionGroupID: uuid.New(),
			Probability:    3,
			Impact:         4,
		},
	}
	scope := &entity.AccessScope{
		Role:           entity.RoleUnit,
		OrganizationID: &orgID,
	}

	uc := NewArchiveRiskUseCase(repo, &archiveLockChecker{blocked: true})
	_, err := uc.Execute(context.Background(), ArchiveRiskInput{
		ID:     repo.byID.ID,
		Reason: "Tidak relevan",
	}, nil, scope)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !errors.Is(err, domainerrors.ErrWorkingPaperLocked) {
		t.Fatalf("expected ErrWorkingPaperLocked, got %v", err)
	}
}

func TestRestoreRiskUseCase_ExecuteRestoresArchivedRisk(t *testing.T) {
	orgID := uuid.New()
	now := time.Now().UTC()
	repo := &archiveRiskRepo{
		byID: &entity.Risk{
			ID:             uuid.New(),
			Status:         entity.RiskStatusApproved,
			IsCurrent:      true,
			ArchivedAt:     &now,
			ArchivedReason: "obsolete",
			OrganizationID: &orgID,
			VersionGroupID: uuid.New(),
			Probability:    3,
			Impact:         4,
		},
	}
	scope := &entity.AccessScope{
		Role:           entity.RoleUnit,
		OrganizationID: &orgID,
	}

	uc := NewRestoreRiskUseCase(repo)
	result, err := uc.Execute(context.Background(), RestoreRiskInput{
		ID: repo.byID.ID,
	}, nil, scope)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result == nil {
		t.Fatal("expected result")
	}
	if repo.updated == nil {
		t.Fatal("expected risk update")
	}
	if repo.updated.ArchivedAt != nil {
		t.Fatal("expected archivedAt to be cleared")
	}
	if repo.updated.ArchivedReason != "" {
		t.Fatalf("expected archivedReason cleared, got %q", repo.updated.ArchivedReason)
	}
}
