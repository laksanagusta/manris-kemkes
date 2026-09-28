package report

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type quarterlyRepoStub struct {
	cycles        []string
	orgIDs        [][]uuid.UUID
	starts        []time.Time
	organizations []entity.QuarterlyReportOrganization
	period        *entity.QuarterlyReportPeriodData
}

func (r *quarterlyRepoStub) ReadSnapshot(ctx context.Context, current, previous repository.QuarterlyReportPeriod, orgIDs []uuid.UUID) (*entity.QuarterlyReportSnapshot, error) {
	a, _ := r.LoadPeriod(ctx, current.Cycle, current.Start, current.End, orgIDs)
	b, _ := r.LoadPeriod(ctx, previous.Cycle, previous.Start, previous.End, orgIDs)
	return &entity.QuarterlyReportSnapshot{Organizations: r.organizations, Current: a, Previous: b}, nil
}

func (r *quarterlyRepoStub) ListOrganizations(context.Context, []uuid.UUID) ([]entity.QuarterlyReportOrganization, error) {
	return r.organizations, nil
}

func (r *quarterlyRepoStub) LoadPeriod(_ context.Context, cycle string, start, _ time.Time, orgIDs []uuid.UUID) (*entity.QuarterlyReportPeriodData, error) {
	r.cycles = append(r.cycles, cycle)
	r.starts = append(r.starts, start)
	r.orgIDs = append(r.orgIDs, orgIDs)
	return r.period, nil
}

func TestQuarterlyReportDefaultPeriodAndJakartaBoundary(t *testing.T) {
	emptyOrg := uuid.New()
	repo := &quarterlyRepoStub{organizations: []entity.QuarterlyReportOrganization{{ID: emptyOrg, Name: "Unit tanpa data"}}, period: &entity.QuarterlyReportPeriodData{Risks: []*entity.QuarterlyReportRisk{}, Tasks: []*entity.QuarterlyReportTask{}, Events: []*entity.RiskEvent{}}}
	uc := NewQuarterlyReportUseCase(repo)
	// The UTC date is Dec 31; the application calendar is already January Q1.
	uc.now = func() time.Time { return time.Date(2026, 12, 31, 19, 0, 0, 0, time.UTC) }
	result, err := uc.Execute(context.Background(), QuarterlyReportInput{OrgIDs: []uuid.UUID{emptyOrg}})
	if err != nil {
		t.Fatal(err)
	}
	if result.Cycle != "2026-Q4" || result.ComparisonCycle != "2026-Q3" {
		t.Fatalf("last completed quarter and comparator: %+v", result)
	}
	if len(result.Organizations) != 1 || result.DataUpdatedAt != nil || len(result.Risks) != 0 {
		t.Fatalf("empty unit must remain explicit with null freshness: %+v", result)
	}
	if !repo.starts[0].Equal(time.Date(2026, 9, 30, 17, 0, 0, 0, time.UTC)) || repo.orgIDs[0][0] != emptyOrg || repo.orgIDs[1][0] != emptyOrg {
		t.Fatalf("scope and quarter boundary must agree across periods: %+v", repo)
	}
}

func TestQuarterlyReportRejectsMalformedPeriodsBeforeReading(t *testing.T) {
	for _, input := range []QuarterlyReportInput{
		{Cycle: "2026-H1"}, {Cycle: "2026-Q5"}, {Cycle: "2026-Q1;DROP TABLE risks"},
		{Cycle: "2026-Q1", ComparisonCycle: "Q4"}, {Cycle: "0000-Q1"},
	} {
		repo := &quarterlyRepoStub{}
		uc := NewQuarterlyReportUseCase(repo)
		_, err := uc.Execute(context.Background(), input)
		if !errors.Is(err, domainerrors.ErrInvalidInput) || len(repo.cycles) > 0 {
			t.Fatalf("invalid period read source data: %+v, %v", input, err)
		}
	}
}

func TestQuarterlySnapshotHashTracksContentAndReportingDate(t *testing.T) {
	repo := &quarterlyRepoStub{organizations: []entity.QuarterlyReportOrganization{{ID: uuid.New(), Name: "Unit A"}}, period: &entity.QuarterlyReportPeriodData{Risks: []*entity.QuarterlyReportRisk{}, Tasks: []*entity.QuarterlyReportTask{}, Events: []*entity.RiskEvent{}}}
	uc := NewQuarterlyReportUseCase(repo)
	clock := time.Date(2026, 9, 28, 1, 0, 0, 0, time.UTC)
	uc.now = func() time.Time { return clock }
	input := QuarterlyReportInput{Cycle: "2026-Q2"}
	a, err := uc.Execute(context.Background(), input)
	if err != nil {
		t.Fatal(err)
	}
	clock = clock.Add(time.Hour)
	b, err := uc.Execute(context.Background(), input)
	if err != nil {
		t.Fatal(err)
	}
	if a.SnapshotHash == "" || a.SnapshotHash != b.SnapshotHash {
		t.Fatal("retrieval times on the same reporting date must have a stable content hash")
	}
	repo.organizations = append(repo.organizations, entity.QuarterlyReportOrganization{ID: uuid.New(), Name: "Empty unit B"})
	c, err := uc.Execute(context.Background(), input)
	if err != nil {
		t.Fatal(err)
	}
	if c.SnapshotHash == b.SnapshotHash {
		t.Fatal("empty unit addition must change the content hash")
	}
	clock = clock.AddDate(0, 0, 1)
	d, err := uc.Execute(context.Background(), input)
	if err != nil {
		t.Fatal(err)
	}
	if d.SnapshotHash == c.SnapshotHash {
		t.Fatal("reporting-date changes must invalidate deadline state even when no updated_at changes")
	}
}
