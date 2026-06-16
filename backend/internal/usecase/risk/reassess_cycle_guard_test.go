package risk

import (
	"context"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type fakeReassessmentRiskRepo struct {
	source   *entity.Risk
	versions []*entity.Risk
	created  *entity.Risk
}

func (f *fakeReassessmentRiskRepo) GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.Risk, error) {
	return f.source, nil
}

func (f *fakeReassessmentRiskRepo) ListVersions(ctx context.Context, versionGroupID uuid.UUID) ([]*entity.Risk, error) {
	if f.versions != nil {
		return f.versions, nil
	}
	if f.source == nil {
		return nil, nil
	}
	return []*entity.Risk{f.source}, nil
}

func (f *fakeReassessmentRiskRepo) Create(ctx context.Context, risk *entity.Risk) error {
	f.created = risk
	return nil
}

func TestCreateRiskReassessmentUseCase_AllowsLatePreviousCycleWhenNoNewerCycleExists(t *testing.T) {
	groupID := uuid.New()
	sourceID := uuid.New()
	creatorID := uuid.New()
	repo := &fakeReassessmentRiskRepo{
		source: &entity.Risk{
			ID:              sourceID,
			VersionGroupID:  groupID,
			Status:          entity.RiskStatusApproved,
			IsCurrent:       true,
			AssessmentCycle: "2026-H1",
		},
	}

	uc := NewCreateRiskReassessmentUseCase(repo, nil)
	out, err := uc.Execute(context.Background(), CreateRiskReassessmentInput{
		RiskID:    sourceID,
		Cycle:     "2026-H1",
		CreatedBy: creatorID,
	})

	if err != nil {
		t.Fatalf("Execute() unexpected error = %v", err)
	}
	if out.ExistingDraft {
		t.Fatalf("Execute() ExistingDraft = true, want false")
	}
	if repo.created == nil {
		t.Fatalf("expected reassessment draft to be created")
	}
	if repo.created.AssessmentCycle != "2026-H1" {
		t.Fatalf("created cycle = %q, want 2026-H1", repo.created.AssessmentCycle)
	}
}

func TestCreateRiskReassessmentUseCase_BlocksOlderCycleWhenNewerCycleExists(t *testing.T) {
	groupID := uuid.New()
	sourceID := uuid.New()
	repo := &fakeReassessmentRiskRepo{
		source: &entity.Risk{
			ID:              sourceID,
			VersionGroupID:  groupID,
			Status:          entity.RiskStatusApproved,
			IsCurrent:       true,
			AssessmentCycle: "2026-H2",
		},
		versions: []*entity.Risk{
			{
				ID:              sourceID,
				VersionGroupID:  groupID,
				Status:          entity.RiskStatusApproved,
				IsCurrent:       true,
				AssessmentCycle: "2026-H2",
			},
		},
	}

	uc := NewCreateRiskReassessmentUseCase(repo, nil)
	_, err := uc.Execute(context.Background(), CreateRiskReassessmentInput{
		RiskID: sourceID,
		Cycle:  "2026-H1",
	})

	if err == nil {
		t.Fatalf("Execute() expected error")
	}
	if !strings.Contains(err.Error(), "periode lebih baru: 2026-H2") {
		t.Fatalf("error = %q, want newer cycle message", err.Error())
	}
	if repo.created != nil {
		t.Fatalf("draft should not be created when newer cycle exists")
	}
}
