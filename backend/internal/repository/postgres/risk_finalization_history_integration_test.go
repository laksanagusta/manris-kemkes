//go:build integration

package postgres

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

func TestInitialAssessmentUsesFinalizationMetadata(t *testing.T) {
	pool := configuredTestPool(t)
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	f := seedConfiguredFixture(t, ctx, tx)
	risks := &riskRepository{pool: tx}
	draft := *f.risk
	draft.ID = uuid.Nil
	draft.Code = "INITIAL-" + uuid.NewString()
	draft.VersionGroupID = uuid.New()
	draft.Status = entity.RiskStatusDraft
	draft.EffectiveFrom = nil
	if err := risks.Create(ctx, &draft); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(ctx, `UPDATE risks SET created_at='2026-01-15' WHERE id=$1`, draft.ID); err != nil {
		t.Fatal(err)
	}
	var count int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM risk_monitorings WHERE source_risk_id=$1`, draft.ID).Scan(&count); err != nil || count != 0 {
		t.Fatalf("draft assessments=%d err=%v", count, err)
	}
	finalized := time.Date(2026, 7, 1, 8, 30, 0, 0, time.UTC)
	effective := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
	draft.Status = entity.RiskStatusFinal
	draft.FinalizeRequested = true
	draft.FinalizedBy = &f.actor
	draft.FinalizedAt = &finalized
	draft.EffectiveFrom = &effective
	if err := risks.Update(ctx, &draft); err != nil {
		t.Fatal(err)
	}
	// A retry must not duplicate the immutable initial assessment.
	if err := risks.Update(ctx, &draft); err != nil {
		t.Fatal(err)
	}
	var date, cycle string
	var actor uuid.UUID
	var recorded time.Time
	if err := tx.QueryRow(ctx, `SELECT observed_at::text,assessment_cycle,finalized_by,finalized_at FROM risk_monitorings WHERE source_risk_id=$1 AND transaction_kind='initial'`, draft.ID).Scan(&date, &cycle, &actor, &recorded); err != nil {
		t.Fatal(err)
	}
	if date != "2026-07-01" || cycle != "2026-Q3" || actor != f.actor || !recorded.Equal(finalized) {
		t.Fatalf("initial metadata: date=%s cycle=%s actor=%s finalized=%s", date, cycle, actor, recorded)
	}
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM risk_monitorings WHERE source_risk_id=$1 AND transaction_kind='initial'`, draft.ID).Scan(&count); err != nil || count != 1 {
		t.Fatalf("initial assessments=%d err=%v", count, err)
	}
}

func TestRetrospectiveMonitoringAfterProfileSupersession(t *testing.T) {
	for _, archiveFamily := range []bool{false, true} {
		name := "active family"
		if archiveFamily {
			name = "archived family"
		}
		t.Run(name, func(t *testing.T) {
			pool := configuredTestPool(t)
			ctx := context.Background()
			tx, err := pool.Begin(ctx)
			if err != nil {
				t.Fatal(err)
			}
			defer tx.Rollback(ctx)
			f := seedConfiguredFixture(t, ctx, tx)
			risks := &riskRepository{pool: tx}
			monitorings := &riskMonitoringRepository{pool: tx}
			start := riskuc.NewStartMonitoringUseCase(risks, monitorings, nil, nil, nil)
			revision, err := start.StartRevision(ctx, riskuc.StartMonitoringInput{SourceRiskID: f.risk.ID, StartedBy: f.actor, OrgIDs: []uuid.UUID{f.org}, ChangeReason: "Koreksi pengendalian risiko"})
			if err != nil {
				t.Fatal(err)
			}
			draft, err := risks.GetByID(ctx, revision.RiskID, nil)
			if err != nil {
				t.Fatal(err)
			}
			effective := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
			draft.Title = "Revised profile"
			draft.Status = entity.RiskStatusFinal
			draft.FinalizeRequested = true
			draft.FinalizedBy = &f.actor
			draft.FinalizedAt = &effective
			draft.EffectiveFrom = &effective
			if err := risks.Update(ctx, draft); err != nil {
				t.Fatal(err)
			}
			resolved, err := risks.ResolveMonitoringSource(ctx, f.risk.VersionGroupID, "2026-06-30", []uuid.UUID{f.org})
			if err != nil || resolved.ID != f.risk.ID {
				t.Fatalf("historical source=%+v err=%v", resolved, err)
			}
			latest, err := risks.ResolveMonitoringSource(ctx, f.risk.VersionGroupID, "2026-07-01", []uuid.UUID{f.org})
			if err != nil || latest.ID != draft.ID {
				t.Fatalf("latest source=%+v err=%v", latest, err)
			}
			input := riskuc.StartMonitoringInput{SourceRiskID: draft.ID, StartedBy: f.actor, OrgIDs: []uuid.UUID{f.org}, ObservedAt: "2026-06-30", ProfileVersionID: &f.profile, MonitoringPeriodID: &f.period}
			out, err := start.Execute(ctx, input)
			if err != nil {
				t.Fatal(err)
			}
			if out.Monitoring.SourceRiskID != f.risk.ID {
				t.Fatal("wrong historical monitoring source")
			}
			if archiveFamily {
				if _, err := tx.Exec(ctx, `UPDATE risks SET archived_at=now(),archived_reason='No longer relevant' WHERE id=$1`, draft.ID); err != nil {
					t.Fatal(err)
				}
				if _, err := risks.ResolveMonitoringSource(ctx, f.risk.VersionGroupID, "2026-06-30", nil); err == nil {
					t.Fatal("resolved archived risk family")
				}
			}
			confirmed := true
			_, err = riskuc.NewUpdateMonitoringUseCase(risks, monitorings).Execute(ctx, riskuc.UpdateMonitoringInput{MonitoringID: out.Monitoring.ID, OrgIDs: input.OrgIDs, ObservedScoreConfirmed: &confirmed})
			if archiveFamily {
				if err == nil {
					t.Fatal("updated archived risk family")
				}
			} else if err != nil {
				t.Fatal(err)
			}
			result, err := riskuc.NewFinalizeMonitoringUseCase(risks, monitorings, nil, nil).Execute(ctx, riskuc.FinalizeMonitoringInput{MonitoringID: out.Monitoring.ID, OrgIDs: input.OrgIDs, FinalizedBy: f.actor})
			if archiveFamily {
				if err == nil {
					t.Fatal("finalized archived risk family")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if result.Monitoring.ResultRiskID == nil || *result.Monitoring.ResultRiskID != f.risk.ID {
				t.Fatal("retrospective monitoring changed profile")
			}
		})
	}
}
