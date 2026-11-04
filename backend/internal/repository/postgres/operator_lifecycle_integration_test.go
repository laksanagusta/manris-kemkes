package postgres

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	workuc "github.com/manris/backend/internal/usecase/operator_work"
	eventuc "github.com/manris/backend/internal/usecase/risk_event"
	"os"
	"strings"
	"testing"
	"time"
)

func TestOperatorLifecycleIntegration(t *testing.T) {
	dsn := os.Getenv("OPERATOR_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("requires isolated OPERATOR_TEST_DATABASE_URL")
	}
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(cfg.ConnConfig.Database, "manris_operator_test_") {
		t.Fatal("requires disposable operator test database")
	}
	ctx := context.Background()
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	org, otherOrg, actor := uuid.New(), uuid.New(), uuid.New()
	if _, err := pool.Exec(ctx, `INSERT INTO organizations(id,name) VALUES($1,'Operator test unit'),($2,'Other test unit')`, org, otherOrg); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `INSERT INTO users(id,name,username,email,password_hash,role,organization_id,status) VALUES($1,'Test operator',$2,$3,'test','unit',$4,'active')`, actor, actor.String(), actor.String()+"@example.test", org); err != nil {
		t.Fatal(err)
	}
	riskRepo := NewRiskRepository(pool)
	risk := &entity.Risk{Code: "TEST-" + uuid.NewString()[:8], Title: "Test distribution risk", Description: "Integration fixture", Category: entity.RiskCategoryOperasional, Status: "final", VersionGroupID: uuid.New(), OrganizationID: &org, CreatedBy: &actor, IsCurrent: true, IsCycleCurrent: true, VersionNumber: 1, AssessmentCycle: "2026-Q3", Probability: 3, Impact: 3, RiskSource: "internal", Controllability: "C", TreatmentOption: "mitigasi"}
	if err := riskRepo.Create(ctx, risk); err != nil {
		t.Fatal(err)
	}
	candidates, err := NewOperatorWorkRepository(pool).ListCandidates(ctx, org, time.Date(2026, 10, 26, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatal(err)
	}
	items := workuc.BuildItems(candidates, actor, time.Date(2026, 10, 26, 0, 0, 0, 0, time.UTC))
	found := false
	for _, item := range items {
		if item.Kind == "monitoring_start" && item.RiskID == risk.ID.String() && item.Period == "2026-Q3" {
			found = true
		}
	}
	if !found {
		t.Fatal("risk without a transaction missing from queue")
	}
	if candidates, err := NewOperatorWorkRepository(pool).ListCandidates(ctx, otherOrg, time.Now()); err != nil || len(candidates) != 0 {
		t.Fatalf("cross-unit candidates: %v %v", candidates, err)
	}
	events := NewRiskEventRepository(pool)
	event := &entity.RiskEvent{Description: "Test event", OccurredAt: time.Date(2026, 9, 12, 0, 0, 0, 0, time.UTC), ImpactTypes: []string{"operational"}, Severity: "low", PostResponseCondition: "unknown", OrganizationID: org, CreatedBy: actor}
	event.SourceRefs = []entity.DocumentSourceRef{}
	if err := events.Create(ctx, event, []uuid.UUID{risk.ID}); err != nil {
		t.Fatal(err)
	}
	notes := eventuc.NewNoteService(NewRiskEventNoteRepository(pool), events)
	scope := &entity.AccessScope{UserID: actor, Role: "unit", OrganizationID: &org, AccessibleOrgIDs: []uuid.UUID{org}}
	requestID := uuid.New()
	first, err := notes.Add(ctx, scope, event.ID, "Initial correction", requestID)
	if err != nil {
		t.Fatal(err)
	}
	repeat, err := notes.Add(ctx, scope, event.ID, "Initial correction", requestID)
	if err != nil || repeat.ID != first.ID {
		t.Fatalf("retry not idempotent: %v", err)
	}
	if _, err := notes.Add(ctx, scope, event.ID, "Different correction", requestID); !errors.Is(err, domainerrors.ErrConflict) {
		t.Fatalf("expected conflict, got %v", err)
	}
	monitoring := entity.NewRiskMonitoringDraft(risk, "2026-Q3", actor)
	mr := NewRiskMonitoringRepository(pool)
	if err := mr.Create(ctx, monitoring); err != nil {
		t.Fatal(err)
	}
	evidenceRepo := NewRiskMonitoringEvidenceRepository(pool)
	draft, err := evidenceRepo.Get(ctx, monitoring.ID, []uuid.UUID{org})
	if err != nil {
		t.Fatal(err)
	}
	if draft.Final || len(draft.Evidence.Events) != 1 || len(draft.Evidence.Events[0].Notes) != 1 {
		t.Fatalf("unexpected draft evidence %#v", draft)
	}
	for _, scope := range []struct {
		name   string
		orgIDs []uuid.UUID
	}{
		{name: "nil global scope"},
		{name: "empty global scope", orgIDs: []uuid.UUID{}},
	} {
		t.Run(scope.name, func(t *testing.T) {
			global, err := evidenceRepo.Get(ctx, monitoring.ID, scope.orgIDs)
			if err != nil {
				t.Fatal(err)
			}
			if global.Final || global.Evidence == nil || len(global.Evidence.Events) != 1 {
				t.Fatalf("global user cannot read draft evidence: %#v", global)
			}
		})
	}
	if _, err := mr.Finalize(ctx, monitoring.ID, nil, actor); err != nil {
		t.Fatal(err)
	}
	if _, err := notes.Add(ctx, scope, event.ID, "New information after finalization", uuid.New()); err != nil {
		t.Fatal(err)
	}
	final, err := evidenceRepo.Get(ctx, monitoring.ID, []uuid.UUID{org})
	if err != nil {
		t.Fatal(err)
	}
	if !final.Final || len(final.Evidence.Events[0].Notes) != 1 {
		t.Fatal("final evidence changed after adding a later note")
	}
	globalFinal, err := evidenceRepo.Get(ctx, monitoring.ID, nil)
	if err != nil {
		t.Fatal(err)
	}
	if !globalFinal.Final || globalFinal.Evidence == nil || len(globalFinal.Evidence.Events[0].Notes) != 1 {
		t.Fatal("global user cannot read finalized evidence snapshot")
	}
	if _, err := evidenceRepo.Get(ctx, monitoring.ID, []uuid.UUID{otherOrg}); err == nil {
		t.Fatal("evidence exposed to another unit")
	}
	if _, err := pool.Exec(ctx, `UPDATE risks SET assessment_cycle='2026-Q2' WHERE id=$1`, risk.ID); err != nil {
		t.Fatal(err)
	}
	oldDraft := entity.NewRiskMonitoringDraft(risk, "2026-Q2", actor)
	if err := mr.Create(ctx, oldDraft); err != nil {
		t.Fatal(err)
	}
	candidates, err = NewOperatorWorkRepository(pool).ListCandidates(ctx, org, time.Date(2026, 10, 26, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatal(err)
	}
	oldFound := false
	for _, item := range workuc.BuildItems(candidates, actor, time.Date(2026, 10, 26, 0, 0, 0, 0, time.UTC)) {
		if item.TargetID == oldDraft.ID.String() {
			oldFound = true
		}
	}
	if !oldFound {
		t.Fatal("unfinished monitoring older than previous quarter disappeared")
	}
}
