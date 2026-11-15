//go:build integration

package postgres

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

func TestMonitoringReportsAreRequiredWithoutCreatingProfileVersion(t *testing.T) {
	pool := configuredTestPool(t)
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	f := seedConfiguredFixture(t, ctx, tx)
	var plan uuid.UUID
	if err := tx.QueryRow(ctx, `INSERT INTO mitigations(risk_id,action,owner) VALUES($1,'Check stocks','Unit') RETURNING id`, f.risk.ID).Scan(&plan); err != nil {
		t.Fatal(err)
	}
	m := fixtureMonitoring(f)
	m.DraftPayload.ObservedScoreConfirmed = true
	repo := &riskMonitoringRepository{pool: tx}
	if err := repo.Create(ctx, m); err != nil {
		t.Fatal(err)
	}
	var reports int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM mitigation_tasks WHERE monitoring_id=$1`, m.ID).Scan(&reports); err != nil || reports != 1 {
		t.Fatalf("reports=%d err=%v", reports, err)
	}
	if _, err := repo.Finalize(ctx, m.ID, nil, f.actor, repository.MonitoringFinalizeReview{}); err == nil {
		t.Fatal("unreported mitigation allowed finalization")
	}
	if _, err := tx.Exec(ctx, `UPDATE mitigation_tasks SET status='skipped',notes='Not executed because stock delivery delayed',reported_at=now(),reported_by=$2 WHERE monitoring_id=$1`, m.ID, f.actor); err != nil {
		t.Fatal(err)
	}
	out, err := repo.Finalize(ctx, m.ID, nil, f.actor, repository.MonitoringFinalizeReview{})
	if err != nil {
		t.Fatal(err)
	}
	if out.MitigationCompletionPercent != 100 {
		t.Fatalf("complete report for unexecuted mitigation = %d%%", out.MitigationCompletionPercent)
	}
	if out.ResultRiskID == nil || *out.ResultRiskID != f.risk.ID {
		t.Fatal("monitoring changed substance version")
	}
	var versions int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM risks WHERE version_group_id=$1`, f.risk.VersionGroupID).Scan(&versions); err != nil || versions != 1 {
		t.Fatalf("versions=%d %v", versions, err)
	}
	expectConfiguredDBError(t, ctx, tx, `UPDATE mitigation_tasks SET notes='Overwrite final report' WHERE monitoring_id=$1`, m.ID)
}

func TestRevisionCreatesVersionWithoutConsumingMonitoringSlot(t *testing.T) {
	pool := configuredTestPool(t)
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	f := seedConfiguredFixture(t, ctx, tx)
	var planID, planIdentity uuid.UUID
	if err := tx.QueryRow(ctx, `INSERT INTO mitigations(risk_id,action,owner) VALUES($1,'Check stocks','Unit') RETURNING id,plan_identity_id`, f.risk.ID).Scan(&planID, &planIdentity); err != nil {
		t.Fatal(err)
	}
	risks := NewRiskRepositoryWithTx(tx)
	transactions := &riskMonitoringRepository{pool: tx}
	start := riskuc.NewStartMonitoringUseCase(risks, transactions, nil, nil, nil)
	reason := "Mitigation ownership needs updating"
	input := riskuc.StartMonitoringInput{SourceRiskID: f.risk.ID, StartedBy: f.actor, OrgIDs: []uuid.UUID{f.org}, TransactionKind: "revision", ChangeReason: reason, ObservedAt: "2026-07-01"}
	draft, err := start.Execute(ctx, input)
	if err != nil {
		t.Fatal(err)
	}
	again, err := start.Execute(ctx, input)
	if err != nil || !again.ExistingDraft || again.Monitoring.ID != draft.Monitoring.ID {
		t.Fatalf("revision draft reuse: %+v %v", again, err)
	}
	var initialCount int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM risk_monitorings WHERE source_risk_id=$1 AND transaction_kind='initial'`, f.risk.ID).Scan(&initialCount); err != nil || initialCount != 1 {
		t.Fatalf("initial=%d %v", initialCount, err)
	}
	finalize := riskuc.NewFinalizeMonitoringUseCase(risks, transactions, nil, nil)
	inputFinalize := riskuc.FinalizeMonitoringInput{MonitoringID: draft.Monitoring.ID, OrgIDs: input.OrgIDs, FinalizedBy: f.actor}
	if _, err := finalize.Execute(ctx, inputFinalize); err == nil {
		t.Fatal("revision without changes created a new version")
	}
	update := riskuc.NewUpdateMonitoringUseCase(risks, transactions)
	plan := draft.Monitoring.DraftPayloadSnapshot().Mitigations[0]
	plan.ExecutionScheduleText = "Setiap akhir bulan"
	_, err = update.Execute(ctx, riskuc.UpdateMonitoringInput{
		MonitoringID: draft.Monitoring.ID, OrgIDs: input.OrgIDs, ReplaceSubstance: true,
		Values: entity.RiskMonitoringDraftValues{
			Title: "Revised stock assessment", Category: f.risk.Category,
			TargetProbability: 1, TargetImpact: 2, Mitigations: []entity.Mitigation{plan},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	output, err := finalize.Execute(ctx, inputFinalize)
	if err != nil {
		t.Fatal(err)
	}
	m := output.Monitoring
	if m.ResultRiskID == nil || *m.ResultRiskID == f.risk.ID || m.MonitoringPeriodID != nil || m.TransactionKind != "revision" {
		t.Fatalf("unexpected revision: %+v", m)
	}
	var current bool
	var title, schedule string
	var target int
	var storedIdentity uuid.UUID
	if err := tx.QueryRow(ctx, `SELECT r.is_current,r.title,r.target_impact,m.plan_identity_id,m.execution_schedule_text FROM risks r JOIN mitigations m ON m.risk_id=r.id WHERE r.id=$1`, m.ResultRiskID).Scan(&current, &title, &target, &storedIdentity, &schedule); err != nil {
		t.Fatal(err)
	}
	if !current || title != "Revised stock assessment" || target != 2 || storedIdentity != planIdentity || schedule != plan.ExecutionScheduleText {
		t.Fatalf("revision state current=%v title=%s target=%d stable plan=%v schedule=%s", current, title, target, storedIdentity == planIdentity, schedule)
	}
	var reports int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM mitigation_tasks WHERE monitoring_id=$1`, m.ID).Scan(&reports); err != nil || reports != 0 {
		t.Fatalf("revision reports=%d %v", reports, err)
	}
	period := fixtureMonitoring(f)
	if err := transactions.Create(ctx, period); err != nil {
		t.Fatalf("revision consumed monitoring slot: %v", err)
	}
}
