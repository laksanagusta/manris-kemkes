package workingpaper

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

type fakeRosterWPRepo struct {
	preview  *entity.WorkingPaperRosterPreview
	err      error
	gotOrg   uuid.UUID
	gotCycle string
}

func (r *fakeRosterWPRepo) PreviewPeriodRoster(_ context.Context, orgID uuid.UUID, cycle string) (*entity.WorkingPaperRosterPreview, error) {
	r.gotOrg = orgID
	r.gotCycle = cycle
	return r.preview, r.err
}

func (r *fakeRosterWPRepo) Create(context.Context, *entity.WorkingPaper) error { return nil }
func (r *fakeRosterWPRepo) GetByID(context.Context, uuid.UUID) (*entity.WorkingPaper, error) {
	return nil, nil
}
func (r *fakeRosterWPRepo) List(context.Context, []uuid.UUID, string, string, string, string, int, int) ([]*entity.WorkingPaper, int, error) {
	return nil, 0, nil
}
func (r *fakeRosterWPRepo) Update(context.Context, *entity.WorkingPaper) error { return nil }
func (r *fakeRosterWPRepo) Delete(context.Context, uuid.UUID) error            { return nil }
func (r *fakeRosterWPRepo) MutateByIDForUpdate(context.Context, uuid.UUID, func(*entity.WorkingPaper) error) (*entity.WorkingPaper, error) {
	return nil, nil
}
func (r *fakeRosterWPRepo) GetSignatoriesByWorkingPaperID(context.Context, uuid.UUID) ([]*entity.WorkingPaperSignatory, error) {
	return nil, nil
}
func (r *fakeRosterWPRepo) UpdateSignatory(context.Context, *entity.WorkingPaperSignatory) error {
	return nil
}
func (r *fakeRosterWPRepo) GetPendingSigningByUserID(context.Context, uuid.UUID, []uuid.UUID) ([]*entity.WorkingPaper, error) {
	return nil, nil
}
func (r *fakeRosterWPRepo) CountPendingSigningByUserID(context.Context, uuid.UUID) (int, error) {
	return 0, nil
}
func (r *fakeRosterWPRepo) HasBlockingDocumentLink(context.Context, uuid.UUID) (bool, error) {
	return false, nil
}
func (r *fakeRosterWPRepo) CountByOrgAndCycle(context.Context, uuid.UUID, string) (int, error) {
	return 0, nil
}
func (r *fakeRosterWPRepo) CreateWithPeriodRoster(context.Context, *entity.WorkingPaper, string, []entity.WorkingPaperRosterDecision) error {
	return nil
}
func (r *fakeRosterWPRepo) ListSigningBlockers(context.Context, uuid.UUID) ([]entity.WorkingPaperSigningBlocker, error) {
	return nil, nil
}

func TestPreviewRosterRejectsEmptyCycle(t *testing.T) {
	uc := &UseCase{wpRepo: &fakeRosterWPRepo{}}
	_, err := uc.PreviewRoster(context.Background(), uuid.New(), "", nil, false)
	if err == nil {
		t.Fatal("expected error for empty cycle")
	}
}

func TestPreviewRosterRejectsInvalidCycle(t *testing.T) {
	uc := &UseCase{wpRepo: &fakeRosterWPRepo{}}
	_, err := uc.PreviewRoster(context.Background(), uuid.New(), "2026-S1", nil, false)
	if err == nil {
		t.Fatal("expected error for invalid cycle")
	}
}

func TestPreviewRosterRejectsNilOrg(t *testing.T) {
	uc := &UseCase{wpRepo: &fakeRosterWPRepo{}}
	_, err := uc.PreviewRoster(context.Background(), uuid.Nil, "2026-Q1", nil, false)
	if err == nil {
		t.Fatal("expected error for nil org")
	}
}

func TestPreviewRosterRejectsOrgOutsideScope(t *testing.T) {
	uc := &UseCase{wpRepo: &fakeRosterWPRepo{}}
	orgID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	accessible := []uuid.UUID{uuid.MustParse("22222222-2222-2222-2222-222222222222")}
	_, err := uc.PreviewRoster(context.Background(), orgID, "2026-Q1", accessible, false)
	if err == nil {
		t.Fatal("expected error for org outside scope")
	}
}

func TestPreviewRosterAllowsOrgInScope(t *testing.T) {
	orgID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	accessible := []uuid.UUID{orgID, uuid.MustParse("22222222-2222-2222-2222-222222222222")}
	expected := &entity.WorkingPaperRosterPreview{
		OrganizationID:  orgID,
		AssessmentCycle: "2026-Q1",
		MonitoringCycle: "2026-Q1",
		Revision:        "abc123",
	}
	repo := &fakeRosterWPRepo{preview: expected}
	uc := &UseCase{wpRepo: repo}

	preview, err := uc.PreviewRoster(context.Background(), orgID, "2026-Q1", accessible, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if preview.OrganizationID != orgID {
		t.Fatalf("expected org %s, got %s", orgID, preview.OrganizationID)
	}
	if repo.gotOrg != orgID {
		t.Fatalf("expected org %s passed to repo, got %s", orgID, repo.gotOrg)
	}
}

func TestPreviewRosterAllowsGlobalUserAccess(t *testing.T) {
	orgID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	expected := &entity.WorkingPaperRosterPreview{OrganizationID: orgID}
	repo := &fakeRosterWPRepo{preview: expected}
	uc := &UseCase{wpRepo: repo}

	preview, err := uc.PreviewRoster(context.Background(), orgID, "2026-Q2", nil, true)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if preview.OrganizationID != orgID {
		t.Fatalf("expected org %s, got %s", orgID, preview.OrganizationID)
	}
}

func TestPreviewRosterValidatesQ1Quarter(t *testing.T) {
	uc := &UseCase{wpRepo: &fakeRosterWPRepo{preview: &entity.WorkingPaperRosterPreview{}}}
	_, err := uc.PreviewRoster(context.Background(), uuid.New(), "2026-Q1", nil, true)
	if err != nil {
		t.Fatalf("unexpected error for valid Q1: %v", err)
	}
}

func TestPreviewRosterValidatesQ2Quarter(t *testing.T) {
	expected := &entity.WorkingPaperRosterPreview{OrganizationID: uuid.Nil}
	repo := &fakeRosterWPRepo{preview: expected}
	uc := &UseCase{wpRepo: repo}
	_, err := uc.PreviewRoster(context.Background(), uuid.New(), "2026-Q2", nil, true)
	if err != nil {
		t.Fatalf("unexpected error for valid Q2: %v", err)
	}
}

func (r *fakeRosterWPRepo) stubNoop() {}

var _ = domainerrors.ErrRiskNotFound
