package meeting_minute

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type scopeListMMRepo struct {
	capturedOrgIDs []uuid.UUID
	capturedOptions repository.ListMeetingMinutesOptions
	items          []entity.MeetingMinute
}

func (r *scopeListMMRepo) Create(context.Context, entity.CreateMeetingMinuteInput) (*entity.MeetingMinute, error) {
	return nil, nil
}

func (r *scopeListMMRepo) GetByID(_ context.Context, _ uuid.UUID, _ []uuid.UUID) (*entity.MeetingMinuteWithRisks, error) {
	return nil, nil
}

func (r *scopeListMMRepo) List(_ context.Context, opts repository.ListMeetingMinutesOptions) ([]entity.MeetingMinute, int, error) {
	r.capturedOrgIDs = opts.OrgIDs
	r.capturedOptions = opts
	var result []entity.MeetingMinute
	for _, m := range r.items {
		if len(opts.OrgIDs) > 0 && m.OrganizationID != nil {
			found := false
			for _, oid := range opts.OrgIDs {
				if *m.OrganizationID == oid {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}
		result = append(result, m)
	}
	return result, len(result), nil
}

func TestMeetingMinuteListPreservesServerFiltersAndPagination(t *testing.T) {
	repo := &scopeListMMRepo{}
	author := uuid.New()
	_, err := NewListMeetingMinutesUseCase(repo).Execute(context.Background(), ListInput{
		CreatedBy: &author, Date: "2026-11-15", Query: "peserta",
		SortBy: "participants", SortOrder: "asc", Limit: 10, Offset: 20,
	})
	if err != nil {
		t.Fatal(err)
	}
	got := repo.capturedOptions
	if got.CreatedBy == nil || *got.CreatedBy != author || got.Date != "2026-11-15" ||
		got.Query != "peserta" || got.SortBy != "participants" || got.SortOrder != "asc" ||
		got.Limit != 10 || got.Offset != 20 {
		t.Fatalf("server list options were lost: %+v", got)
	}
}

func (r *scopeListMMRepo) Delete(context.Context, uuid.UUID) error { return nil }

func (r *scopeListMMRepo) ListAuthors(context.Context, []uuid.UUID) ([]repository.MeetingMinuteAuthor, error) {
	return nil, nil
}

func (r *scopeListMMRepo) ListByRiskID(context.Context, uuid.UUID) ([]entity.MeetingMinutesRisk, error) {
	return nil, nil
}

func (r *scopeListMMRepo) LinkRisks(context.Context, uuid.UUID, []uuid.UUID, uuid.UUID) error {
	return nil
}

func (r *scopeListMMRepo) UnlinkRisks(context.Context, uuid.UUID, []uuid.UUID) error {
	return nil
}

func TestMeetingMinuteListPassesScopedOrgIDs(t *testing.T) {
	orgA := uuid.New()
	orgB := uuid.New()

	repo := &scopeListMMRepo{
		items: []entity.MeetingMinute{
			{ID: uuid.New(), Title: "MM-A", OrganizationID: &orgA},
			{ID: uuid.New(), Title: "MM-B", OrganizationID: &orgB},
		},
	}

	uc := NewListMeetingMinutesUseCase(repo)

	result, err := uc.Execute(context.Background(), ListInput{
		OrgIDs: []uuid.UUID{orgA},
		Limit:  10,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(repo.capturedOrgIDs) == 0 {
		t.Fatal("expected OrgIDs to be passed to repo, got nil/empty")
	}
	if repo.capturedOrgIDs[0] != orgA {
		t.Fatalf("expected OrgIDs[0]=%s, got %s", orgA, repo.capturedOrgIDs[0])
	}

	if result.Total != 1 {
		t.Fatalf("expected 1 result scoped to orgA, got %d", result.Total)
	}
	if result.Items[0].Title != "MM-A" {
		t.Fatalf("expected MM-A, got %s", result.Items[0].Title)
	}
}

func TestMeetingMinuteListScopesToAccessibleOrgsOnly(t *testing.T) {
	orgA := uuid.New()
	orgB := uuid.New()

	repo := &scopeListMMRepo{
		items: []entity.MeetingMinute{
			{ID: uuid.New(), Title: "MM-A", OrganizationID: &orgA},
			{ID: uuid.New(), Title: "MM-B", OrganizationID: &orgB},
		},
	}

	uc := NewListMeetingMinutesUseCase(repo)

	result, err := uc.Execute(context.Background(), ListInput{
		OrgIDs: []uuid.UUID{orgA},
		Limit:  10,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	for _, item := range result.Items {
		if item.OrganizationID != nil && *item.OrganizationID == orgB {
			t.Fatalf("sibling org meeting minute should not appear in scoped list")
		}
	}
}
