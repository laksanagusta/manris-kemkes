//go:build integration

package postgres

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

func finalizationHistoryFixture(t *testing.T) (context.Context, pgx.Tx, configuredFixture) {
	t.Helper()
	pool := configuredTestPool(t)
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = tx.Rollback(ctx) })
	// Keep existing local rules untouched outside this rolled-back transaction.
	if _, err := tx.Exec(ctx, `UPDATE monitoring_rules SET active=false WHERE year=2026 AND active`); err != nil {
		t.Fatal(err)
	}
	return ctx, tx, seedConfiguredFixture(t, ctx, tx)
}

func TestInitialAssessmentUsesAtomicFinalizationMetadata(t *testing.T) {
	ctx, tx, f := finalizationHistoryFixture(t)
	repo := NewRiskRepositoryWithTx(tx)
	draft := *f.risk
	draft.ID = uuid.Nil
	draft.VersionGroupID = uuid.New()
	draft.Code = "PR77-" + draft.VersionGroupID.String()
	draft.Status = "draft"
	draft.EffectiveFrom = nil
	if err := repo.Create(ctx, &draft); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(ctx, `UPDATE risks SET created_at='2026-01-10T00:00:00+07' WHERE id=$1`, draft.ID); err != nil {
		t.Fatal(err)
	}
	finalAt := time.Date(2026, 7, 1, 0, 30, 0, 0, time.FixedZone("WIB", 7*60*60))
	draft.Status = "final"
	draft.AssessmentCycle = "2026-Q3"
	draft.FinalizeRequested = true
	draft.FinalizedBy = &f.actor
	draft.FinalizedAt = &finalAt
	draft.EffectiveFrom = &finalAt
	if err := repo.Update(ctx, &draft); err != nil {
		t.Fatal(err)
	}
	var cycle, date string
	var actor *uuid.UUID
	var finalized time.Time
	if err := tx.QueryRow(ctx, `SELECT assessment_cycle,observed_at::text,finalized_by,finalized_at FROM risk_monitorings WHERE source_risk_id=$1 AND transaction_kind='initial'`, draft.ID).Scan(&cycle, &date, &actor, &finalized); err != nil {
		t.Fatal(err)
	}
	if cycle != "2026-Q3" || date != "2026-07-01" || actor == nil || *actor != f.actor || !finalized.Equal(finalAt) {
		t.Fatalf("initial audit used draft metadata: cycle=%s date=%s actor=%v finalized=%v", cycle, date, actor, finalized)
	}
	// Retrying a save must neither erase finalization metadata nor duplicate the audit.
	draft.FinalizeRequested = false
	draft.FinalizedBy = nil
	draft.FinalizedAt = nil
	draft.EffectiveFrom = nil
	if err := repo.Update(ctx, &draft); err != nil {
		t.Fatal(err)
	}
	var persistedActor *uuid.UUID
	var persistedDate string
	var persistedAt time.Time
	if err := tx.QueryRow(ctx, `SELECT finalized_by,effective_from::text,finalized_at FROM risks WHERE id=$1`, draft.ID).Scan(&persistedActor, &persistedDate, &persistedAt); err != nil {
		t.Fatal(err)
	}
	if persistedActor == nil || *persistedActor != f.actor || persistedDate != "2026-07-01" || !persistedAt.Equal(finalAt) {
		t.Fatal("ordinary save erased finalization metadata")
	}
	var count int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM risk_monitorings WHERE source_risk_id=$1 AND transaction_kind='initial' AND finalized_by=$2`, draft.ID, f.actor).Scan(&count); err != nil || count != 1 {
		t.Fatalf("audit not idempotent: %d %v", count, err)
	}
}

func TestHistoricalSupersededProfileCanBeMonitored(t *testing.T) {
	ctx, tx, f := finalizationHistoryFixture(t)
	repo := NewRiskRepositoryWithTx(tx)
	newer := *f.risk
	newer.ID = uuid.Nil
	newer.VersionNumber = 2
	newer.PreviousRiskID = &f.risk.ID
	newer.IsCurrent = false
	newer.IsCycleCurrent = false
	newer.AssessmentCycle = "2026-Q3"
	effective := time.Date(2026, 7, 1, 0, 0, 0, 0, time.FixedZone("WIB", 7*60*60))
	newer.EffectiveFrom = &effective
	if err := repo.Create(ctx, &newer); err != nil {
		t.Fatal(err)
	}
	if err := activateApprovedVersionWithQueryer(ctx, tx, newer.ID); err != nil {
		t.Fatal(err)
	}
	transactions := &riskMonitoringRepository{pool: tx}
	start := riskuc.NewStartMonitoringUseCase(repo, transactions, nil, nil, nil)
	input := riskuc.StartMonitoringInput{SourceRiskID: newer.ID, ProfileVersionID: &f.profile, MonitoringPeriodID: &f.period, ObservedAt: "2026-06-30", OrgIDs: []uuid.UUID{f.org}, StartedBy: f.actor}
	draft, err := start.Execute(ctx, input)
	if err != nil {
		t.Fatalf("historically effective source rejected: %v", err)
	}
	if draft.Monitoring.SourceRiskID != f.risk.ID {
		t.Fatal("selected replacement before its effective date")
	}
	update := riskuc.NewUpdateMonitoringUseCase(repo, transactions)
	confirmed := true
	if _, err := update.Execute(ctx, riskuc.UpdateMonitoringInput{MonitoringID: draft.Monitoring.ID, OrgIDs: input.OrgIDs, Conclusion: "Kondisi periode telah ditinjau", ObservedScoreConfirmed: &confirmed}); err != nil {
		t.Fatalf("historical update: %v", err)
	}
	finalize := riskuc.NewFinalizeMonitoringUseCase(repo, transactions, nil, nil)
	if _, err := finalize.Execute(ctx, riskuc.FinalizeMonitoringInput{MonitoringID: draft.Monitoring.ID, OrgIDs: input.OrgIDs, FinalizedBy: f.actor}); err != nil {
		t.Fatalf("historical finalization: %v", err)
	}
	var active uuid.UUID
	if err := tx.QueryRow(ctx, `SELECT id FROM risks WHERE version_group_id=$1 AND is_current`, f.risk.VersionGroupID).Scan(&active); err != nil || active != newer.ID {
		t.Fatalf("historical monitoring changed active profile: %s %v", active, err)
	}
	// A genuinely archived family must stay inaccessible even through old versions.
	if _, err := tx.Exec(ctx, `UPDATE risks SET archived_at=now(),archived_reason='manual archive' WHERE id=$1`, newer.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := start.Execute(ctx, input); !errors.Is(err, domainerrors.ErrMonitoringBeforeRiskEffective) {
		t.Fatalf("manually archived family allowed: %v", err)
	}
}
