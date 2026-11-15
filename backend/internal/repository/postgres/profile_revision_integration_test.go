//go:build integration

package postgres

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

func TestProfileRevisionUsesRiskDraftAndRecordsOnlyChangedScores(t *testing.T) {
	for _, tc := range []struct {
		name              string
		probability       int
		latestProbability int
		wantTransactions  int
	}{
		{"substance only", 3, 0, 0}, {"score changed", 4, 0, 1}, {"latest observation unchanged", 2, 2, 0}, {"latest observation changed", 3, 2, 1},
	} {
		t.Run(tc.name, func(t *testing.T) {
			pool := configuredTestPool(t)
			ctx := context.Background()
			tx, err := pool.Begin(ctx)
			if err != nil {
				t.Fatal(err)
			}
			defer tx.Rollback(ctx)
			f := seedConfiguredFixture(t, ctx, tx)
			var plan, identity uuid.UUID
			if err := tx.QueryRow(ctx, `INSERT INTO mitigations(risk_id,action,owner,execution_schedule_text) VALUES($1,'Check stock','Unit','Setiap bulan') RETURNING id,plan_identity_id`, f.risk.ID).Scan(&plan, &identity); err != nil {
				t.Fatal(err)
			}
			if tc.latestProbability > 0 {
				m := fixtureMonitoring(f)
				m.DraftPayload.ObservedScoreConfirmed = true
				m.ObservedProbability = tc.latestProbability
				m.CalculateObservedScore()
				repo := &riskMonitoringRepository{pool: tx}
				if err := repo.Create(ctx, m); err != nil {
					t.Fatal(err)
				}
				if _, err := tx.Exec(ctx, `UPDATE mitigation_tasks SET notes='Sudah ditinjau sesuai jadwal',reported_at=now(),reported_by=$2 WHERE monitoring_id=$1`, m.ID, f.actor); err != nil {
					t.Fatal(err)
				}
				if _, err := repo.Finalize(ctx, m.ID, nil, f.actor, repository.MonitoringFinalizeReview{}); err != nil {
					t.Fatal(err)
				}
			}
			risks := &riskRepository{pool: tx}
			start := riskuc.NewStartMonitoringUseCase(risks, nil, nil, nil, nil)
			input := riskuc.StartMonitoringInput{SourceRiskID: f.risk.ID, StartedBy: f.actor, OrgIDs: []uuid.UUID{f.org}, ChangeReason: "Koreksi pengendalian risiko"}
			out, err := start.StartRevision(ctx, input)
			if err != nil {
				t.Fatal(err)
			}
			again, err := start.StartRevision(ctx, input)
			if err != nil || !again.ExistingDraft || again.RiskID != out.RiskID {
				t.Fatalf("retry: %+v %v", again, err)
			}
			draft, err := risks.GetByID(ctx, out.RiskID, input.OrgIDs)
			if err != nil {
				t.Fatal(err)
			}
			if draft.Status != "draft" || draft.IsCurrent || draft.ReviewType != "revision" || draft.VersionNumber != 2 {
				t.Fatalf("draft: %+v", draft)
			}
			if tc.latestProbability > 0 && draft.Probability != tc.latestProbability {
				t.Fatal("did not prefill latest observed score")
			}
			draft.Title = "Koreksi judul profil"
			draft.Probability = tc.probability
			next := "2026-08-31"
			draft.NextReviewDate = &next
			if err := risks.Update(ctx, draft); err != nil {
				t.Fatal(err)
			}
			if err := risks.Update(ctx, draft); err != nil {
				t.Fatal(err)
			}
			var count int
			if err := tx.QueryRow(ctx, `SELECT count(*) FROM risk_monitorings WHERE transaction_kind='revision' AND version_group_id=$1`, draft.VersionGroupID).Scan(&count); err != nil || count != 0 {
				t.Fatalf("draft created monitoring: %d %v", count, err)
			}
			var gotIdentity uuid.UUID
			var schedule string
			if err := tx.QueryRow(ctx, `SELECT plan_identity_id,execution_schedule_text FROM mitigations WHERE risk_id=$1`, draft.ID).Scan(&gotIdentity, &schedule); err != nil || gotIdentity != identity || schedule != "Setiap bulan" {
				t.Fatalf("plan identity/schedule changed: %v %s %v", gotIdentity, schedule, err)
			}
			now := time.Now()
			effective := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
			draft.Status = "final"
			draft.FinalizeRequested = true
			draft.FinalizedAt = &now
			draft.FinalizedBy = &f.actor
			draft.EffectiveFrom = &effective
			if err := risks.Update(ctx, draft); err != nil {
				t.Fatal(err)
			}
			if err := risks.Update(ctx, draft); err != nil {
				t.Fatal(err)
			}
			if err := tx.QueryRow(ctx, `SELECT count(*) FROM risk_monitorings WHERE transaction_kind='revision' AND version_group_id=$1`, draft.VersionGroupID).Scan(&count); err != nil || count != tc.wantTransactions {
				t.Fatalf("transactions=%d want=%d err=%v", count, tc.wantTransactions, err)
			}
			var current bool
			var nextDate string
			if err := tx.QueryRow(ctx, `SELECT is_current,next_review_date::text FROM risks WHERE id=$1`, draft.ID).Scan(&current, &nextDate); err != nil || !current || nextDate != next {
				t.Fatalf("activation/schedule: %t %s %v", current, nextDate, err)
			}
			if err := tx.QueryRow(ctx, `SELECT is_current FROM risks WHERE id=$1`, f.risk.ID).Scan(&current); err != nil || current {
				t.Fatal("source still active", err)
			}
			if _, err := start.StartRevision(ctx, input); err == nil {
				t.Fatal("stale source allowed revision")
			}
			if tc.wantTransactions > 0 {
				var kind, status string
				var profile, period *uuid.UUID
				if err := tx.QueryRow(ctx, `SELECT transaction_kind,status,profile_version_id,monitoring_period_id FROM risk_monitorings WHERE result_risk_id=$1`, draft.ID).Scan(&kind, &status, &profile, &period); err != nil || kind != "revision" || status != "final" || profile != nil || period != nil {
					t.Fatalf("invalid revision transaction %s %s %v", kind, status, err)
				}
			}
		})
	}
}

func TestProfileRevisionApprovalActivatesAndRecordsScoreAtomically(t *testing.T) {
	pool := configuredTestPool(t)
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	f := seedConfiguredFixture(t, ctx, tx)
	risks := &riskRepository{pool: tx}
	start := riskuc.NewStartMonitoringUseCase(risks, nil, nil, nil, nil)
	input := riskuc.StartMonitoringInput{SourceRiskID: f.risk.ID, StartedBy: f.actor, OrgIDs: []uuid.UUID{f.org}, ChangeReason: "Revisi setelah tinjauan pengendalian"}
	wrong := input
	wrong.OrgIDs = []uuid.UUID{uuid.New()}
	if _, err := start.StartRevision(ctx, wrong); err == nil {
		t.Fatal("revision crossed organization scope")
	}
	out, err := start.StartRevision(ctx, input)
	if err != nil {
		t.Fatal(err)
	}
	draft, err := risks.GetByID(ctx, out.RiskID, input.OrgIDs)
	if err != nil {
		t.Fatal(err)
	}
	draft.Probability = 4
	if err := risks.Update(ctx, draft); err != nil {
		t.Fatal(err)
	}
	if err := risks.ActivateApprovedVersion(ctx, draft.ID); err != nil {
		t.Fatal(err)
	}
	if err := risks.ActivateApprovedVersion(ctx, draft.ID); err != nil {
		t.Fatal(err)
	}
	var records int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM risk_monitorings WHERE result_risk_id=$1 AND transaction_kind='revision' AND status='final'`, draft.ID).Scan(&records); err != nil || records != 1 {
		t.Fatalf("approval records=%d err=%v", records, err)
	}
}

func TestProfileRevisionResumesLegacyDraftWithoutLosingEdits(t *testing.T) {
	pool := configuredTestPool(t)
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	f := seedConfiguredFixture(t, ctx, tx)
	risks := &riskRepository{pool: tx}
	legacy := entity.NewRiskMonitoringDraft(f.risk, "2026-Q3", f.actor)
	legacy.TransactionKind = "revision"
	legacy.Mode = entity.RiskMonitoringModeWithProfileRevision
	legacy.ObservedAt = "2026-07-01"
	legacy.ChangeReason = "Koreksi profil dari draf lama"
	legacy.DraftPayload.Title = "Judul revisi yang sudah diketik"
	legacy.ObservedProbability = 4
	legacy.CalculateObservedScore()
	if err := (&riskMonitoringRepository{pool: tx}).Create(ctx, legacy); err != nil {
		t.Fatal(err)
	}
	out, err := riskuc.NewStartMonitoringUseCase(risks, nil, nil, nil, nil).StartRevision(ctx, riskuc.StartMonitoringInput{SourceRiskID: f.risk.ID, StartedBy: f.actor, OrgIDs: []uuid.UUID{f.org}, ChangeReason: legacy.ChangeReason})
	if err != nil {
		t.Fatal(err)
	}
	draft, err := risks.GetByID(ctx, out.RiskID, nil)
	if err != nil {
		t.Fatal(err)
	}
	if draft.Title != "Judul revisi yang sudah diketik" || draft.Probability != 4 || draft.ChangeReason != legacy.ChangeReason {
		t.Fatalf("legacy edits lost: %+v", draft)
	}
	var result uuid.UUID
	var status string
	if err := tx.QueryRow(ctx, `SELECT status,result_risk_id FROM risk_monitorings WHERE id=$1`, legacy.ID).Scan(&status, &result); err != nil || status != "superseded" || result != draft.ID {
		t.Fatalf("legacy redirect: %s %v %v", status, result, err)
	}
}

func TestProfileRevisionAndMonitoringCannotStartTogether(t *testing.T) {
	for _, first := range []string{"monitoring", "revision"} {
		t.Run(first+" first", func(t *testing.T) {
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
			input := riskuc.StartMonitoringInput{SourceRiskID: f.risk.ID, StartedBy: f.actor, OrgIDs: []uuid.UUID{f.org}, ChangeReason: "Perubahan pengendalian distribusi"}
			if first == "monitoring" {
				m := fixtureMonitoring(f)
				if err := monitorings.Create(ctx, m); err != nil {
					t.Fatal(err)
				}
				if _, err := start.StartRevision(ctx, input); !errors.Is(err, domainerrors.ErrRiskMonitoringInProgress) {
					t.Fatalf("expected monitoring conflict, got %v", err)
				}
				risk, err := risks.GetByID(ctx, f.risk.ID, input.OrgIDs)
				if err != nil {
					t.Fatal(err)
				}
				if risk.OpenDrafts == nil || risk.OpenDrafts.MonitoringID == nil || *risk.OpenDrafts.MonitoringID != m.ID {
					t.Fatal("monitoring resume target missing")
				}
				if err := monitorings.DeleteDraft(ctx, m.ID, input.OrgIDs); err != nil {
					t.Fatal(err)
				}
				if _, err := start.StartRevision(ctx, input); err != nil {
					t.Fatal("revision should unlock after monitoring cancellation", err)
				}
			} else {
				draft, err := start.StartRevision(ctx, input)
				if err != nil {
					t.Fatal(err)
				}
				if err := monitorings.Create(ctx, fixtureMonitoring(f)); !errors.Is(err, domainerrors.ErrRiskRevisionInProgress) {
					t.Fatalf("expected revision conflict, got %v", err)
				}
				again, err := start.StartRevision(ctx, input)
				if err != nil || !again.ExistingDraft || again.RiskID != draft.RiskID {
					t.Fatalf("could not resume revision: %+v %v", again, err)
				}
				risk, err := risks.GetByID(ctx, f.risk.ID, input.OrgIDs)
				if err != nil {
					t.Fatal(err)
				}
				if risk.OpenDrafts == nil || risk.OpenDrafts.RevisionRiskID == nil || *risk.OpenDrafts.RevisionRiskID != draft.RiskID {
					t.Fatal("revision resume target missing")
				}
				if err := risks.Delete(ctx, draft.RiskID); err != nil {
					t.Fatal(err)
				}
				if err := monitorings.Create(ctx, fixtureMonitoring(f)); err != nil {
					t.Fatal("monitoring should unlock after revision cancellation", err)
				}
			}
		})
	}
}

// Committed fixtures are confined to the isolated integration database; the
// independent connections must observe each other's committed draft creations.
func TestProfileRevisionConcurrentMonitoringStart(t *testing.T) {
	pool := configuredTestPool(t)
	cfg := pool.Config()
	cfg.AfterConnect = func(ctx context.Context, conn *pgx.Conn) error {
		_, err := conn.Exec(ctx, `SELECT set_config('manris.simulated_now','2026-07-01T00:00:00+07',false)`)
		return err
	}
	concurrentPool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer concurrentPool.Close()
	for attempt := 0; attempt < 4; attempt++ {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		tx, err := concurrentPool.Begin(ctx)
		if err != nil {
			cancel()
			t.Fatal(err)
		}
		defer tx.Rollback(context.Background())
		f := configuredFixture{org: uuid.New(), actor: uuid.New()}
		if _, err := tx.Exec(ctx, `INSERT INTO organizations(id,name) VALUES($1,'Workflow concurrency fixture')`, f.org); err != nil {
			t.Fatal(err)
		}
		if _, err := tx.Exec(ctx, `INSERT INTO users(id,name,username,email,password_hash,role,organization_id) VALUES($1,'Workflow actor',$2,$3,'test','unit',$4)`, f.actor, "workflow-"+f.actor.String(), f.actor.String()+"@example.test", f.org); err != nil {
			t.Fatal(err)
		}
		effective := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
		f.risk = &entity.Risk{Code: "WORK-" + uuid.NewString(), Title: "Concurrent workflow", Category: entity.RiskCategoryOperasional, Status: "final", VersionGroupID: uuid.New(), OrganizationID: &f.org, CreatedBy: &f.actor, IsCurrent: true, IsCycleCurrent: true, VersionNumber: 1, AssessmentCycle: "2026-Q1", Probability: 3, Impact: 3, TargetProbability: 1, TargetImpact: 1, EffectiveFrom: &effective}
		if err := (&riskRepository{pool: tx}).Create(ctx, f.risk); err != nil {
			t.Fatal(err)
		}
		if err := tx.Commit(ctx); err != nil {
			cancel()
			t.Fatal(err)
		}
		risks := &riskRepository{pool: concurrentPool}
		monitors := &riskMonitoringRepository{pool: concurrentPool}
		start := riskuc.NewStartMonitoringUseCase(risks, monitors, nil, nil, nil)
		ready := make(chan struct{})
		results := make(chan error, 2)
		go func() {
			<-ready
			_, err := start.StartRevision(ctx, riskuc.StartMonitoringInput{SourceRiskID: f.risk.ID, StartedBy: f.actor, OrgIDs: []uuid.UUID{f.org}, ChangeReason: "Koreksi profil bersamaan pemantauan"})
			results <- err
		}()
		go func() {
			<-ready
			m := entity.NewRiskMonitoringDraft(f.risk, "2026-Q2", f.actor)
			m.ObservedAt = "2026-06-30"
			results <- monitors.Create(ctx, m)
		}()
		close(ready)
		success, conflicts := 0, 0
		for range 2 {
			err := <-results
			if err == nil {
				success++
			} else if errors.Is(err, domainerrors.ErrRiskMonitoringInProgress) || errors.Is(err, domainerrors.ErrRiskRevisionInProgress) {
				conflicts++
			} else {
				cancel()
				t.Fatalf("unexpected concurrent error: %v", err)
			}
		}
		cancel()
		if success != 1 || conflicts != 1 {
			t.Fatalf("successes=%d conflicts=%d", success, conflicts)
		}
	}
}
