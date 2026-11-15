package report

import (
	"context"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	"testing"
	"time"
)

func TestUnitProgressProfilePeriod(t *testing.T) {
	rule, id := uuid.New(), uuid.New()
	profile := entity.UnitProgressProfile{Year: 2026, RuleID: &rule, Frequency: "semester", Periods: []entity.MonitoringRulePeriod{{ID: id, Label: "Semester II", Ordinal: 2, OpensOn: "2027-01-01", ClosesOn: "2027-01-31"}}}
	for _, test := range []struct {
		name, id, day    string
		valid, available bool
	}{
		{"before window", id.String(), "2026-12-31", true, false},
		{"opening inclusive", id.String(), "2027-01-01", true, true},
		{"closed still viewable", id.String(), "2027-02-01", true, true},
		{"foreign period", uuid.NewString(), "2027-01-01", false, false},
		{"quarter is not a configured period", "2026-Q4", "2027-01-01", false, false},
	} {
		t.Run(test.name, func(t *testing.T) {
			now, err := time.Parse(time.RFC3339, test.day+"T12:00:00+07:00")
			if err != nil {
				t.Fatal(err)
			}
			period, available, err := unitProgressProfilePeriod(profile, test.id, now)
			if (err == nil) != test.valid {
				t.Fatalf("err=%v", err)
			}
			if !test.valid {
				return
			}
			if available != test.available || period.Start.Format(time.DateOnly) != "2026-07-01" || period.End.Format(time.DateOnly) != "2027-01-01" || period.MonitoringPeriodID == nil || *period.MonitoringPeriodID != id {
				t.Fatalf("period=%+v available=%v", period, available)
			}
		})
	}
	profile.RuleID = nil
	for _, id := range []string{"", "2025-Q4", "2026-H1"} {
		if _, _, err := unitProgressProfilePeriod(profile, id, time.Now()); err == nil {
			t.Fatalf("accepted %q", id)
		}
	}
	if _, _, err := unitProgressProfilePeriod(profile, "2026-Q4", time.Now()); err != nil {
		t.Fatal(err)
	}
}

type unitProgressProfileRepo struct{ reads int }

func (*unitProgressProfileRepo) ListUnitProgressProfiles(context.Context, []uuid.UUID) ([]entity.UnitProgressProfile, error) {
	return []entity.UnitProgressProfile{}, nil
}
func (r *unitProgressProfileRepo) ReadUnitProgress(context.Context, repository.QuarterlyReportPeriod, []uuid.UUID) (*entity.UnitProgressSnapshot, error) {
	r.reads++
	return &entity.UnitProgressSnapshot{}, nil
}
func TestUnitProgressRejectsProfileOutsideScope(t *testing.T) {
	repo := &unitProgressProfileRepo{}
	_, err := NewUnitProgressUseCase(repo).ExecuteProfile(context.Background(), uuid.NewString(), uuid.NewString(), []uuid.UUID{uuid.New()})
	if err == nil || repo.reads != 0 {
		t.Fatalf("err=%v reads=%d", err, repo.reads)
	}
}
