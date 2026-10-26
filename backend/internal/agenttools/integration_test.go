//go:build integration

package agenttools

import (
	"context"
	"errors"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/agent"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/service"
	"github.com/manris/backend/internal/repository/postgres"
)

type domainFixture struct {
	pool                       *pgxpool.Pool
	kit                        *Toolkit
	actor, org, child, foreign uuid.UUID
	risk                       *entity.Risk
	task                       *entity.MitigationTask
}

func newDomainFixture(t *testing.T) *domainFixture {
	t.Helper()
	dsn := os.Getenv("AGENT_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("AGENT_TEST_DATABASE_URL is not set")
	}
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(cfg.ConnConfig.Database, "agent_test") {
		t.Fatal("integration tests require an isolated agent_test database")
	}
	cfg.MaxConns = 3
	pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	f := &domainFixture{pool: pool, actor: uuid.New(), org: uuid.New(), child: uuid.New(), foreign: uuid.New()}
	ctx := context.Background()
	if _, err = pool.Exec(ctx, `INSERT INTO auth_applications(id,name) VALUES('manris','Manris') ON CONFLICT(id) DO NOTHING`); err != nil {
		t.Fatal(err)
	}
	for _, id := range []uuid.UUID{f.org, f.child, f.foreign} {
		var parent *uuid.UUID
		if id == f.child {
			parent = &f.org
		}
		if _, err = pool.Exec(ctx, `INSERT INTO organizations(id,name,parent_id) VALUES($1,$2,$3)`, id, "Agent tools test "+id.String(), parent); err != nil {
			t.Fatal(err)
		}
	}
	if _, err = pool.Exec(ctx, `INSERT INTO users(id,name,username,email,password_hash,role,organization_id,status,must_change_password) VALUES($1,'Agent test user',$2,$3,'test-only-unused','unit',$4,'active',false)`, f.actor, "agt-"+f.actor.String(), f.actor.String()+"@example.invalid", f.org); err != nil {
		t.Fatal(err)
	}
	f.kit = New(pool, service.NewOrganizationHierarchy(postgres.NewOrganizationRepository(pool)))
	f.risk = &entity.Risk{Code: "R-AGENT-" + uuid.NewString(), Title: "Agent original draft", Description: "Retain description", Category: "operasional", Status: "draft", OrganizationID: &f.org, CreatedBy: &f.actor, VersionGroupID: uuid.New(), IsCurrent: true, IsCycleCurrent: true, VersionNumber: 1, AssessmentCycle: "2026-Q4", Probability: 4, Impact: 4, TargetProbability: 2, TargetImpact: 2, Mitigations: []entity.Mitigation{{Action: "Existing mitigation", Owner: "Agent test user", OwnerUserID: &f.actor, Frequency: "insidental"}}}
	repo := postgres.NewRiskRepository(pool)
	if err = repo.Create(ctx, f.risk); err != nil {
		t.Fatal(err)
	}
	f.risk, err = repo.GetByID(ctx, f.risk.ID, []uuid.UUID{f.org})
	if err != nil {
		t.Fatal(err)
	}
	f.task = &entity.MitigationTask{MitigationID: f.risk.Mitigations[0].ID, RiskID: f.risk.ID, PeriodLabel: "2026-Q4", PeriodStart: "2026-10-01", PeriodEnd: "2026-12-31", DueDate: "2026-10-01", Status: "pending", GeneratedBy: "manual"}
	if err = postgres.NewMitigationTaskRepository(pool).Create(ctx, f.task); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		for _, q := range []string{`DELETE FROM audit_logs WHERE actor_user_id=$1`, `DELETE FROM incidents WHERE created_by=$1`, `DELETE FROM mitigation_tasks WHERE risk_id IN (SELECT id FROM risks WHERE created_by=$1)`, `DELETE FROM risk_monitorings WHERE source_risk_id IN (SELECT id FROM risks WHERE created_by=$1)`, `DELETE FROM risk_monitoring_periods WHERE version_group_id IN (SELECT version_group_id FROM risks WHERE created_by=$1)`, `DELETE FROM risks WHERE created_by=$1`, `DELETE FROM users WHERE id=$1`} {
			if _, e := pool.Exec(ctx, q, f.actor); e != nil {
				t.Errorf("fixture cleanup: %v", e)
			}
		}
		if _, e := pool.Exec(ctx, `DELETE FROM organizations WHERE id=ANY($1::uuid[])`, []uuid.UUID{f.org, f.child, f.foreign}); e != nil {
			t.Errorf("fixture organization cleanup: %v", e)
		}
	})
	return f
}

func (f *domainFixture) patch(kind string, after map[string]any) agent.Operation {
	return agent.Operation{ID: uuid.NewString(), Kind: kind, Title: "Reviewed change", TargetID: f.risk.ID.String(), OrganizationID: f.org.String(), Included: true, After: after, ExpectedUpdatedAt: f.risk.UpdatedAt.UTC().Format(time.RFC3339Nano)}
}

func TestIntegrationDraftPatchPreservesMitigationAndTaskHistory(t *testing.T) {
	f := newDomainFixture(t)
	ctx := context.Background()
	mid := f.risk.Mitigations[0].ID
	ops := []agent.Operation{f.patch("patch_risk", map[string]any{"title": "Agent changed draft"}), f.patch("patch_mitigation", map[string]any{"mitigationId": mid.String(), "action": "Updated mitigation"})}
	validated, err := f.kit.ValidateOperations(ctx, f.actor, ops)
	if err != nil {
		t.Fatal(err)
	}
	before, err := postgres.NewRiskRepository(f.pool).GetByID(ctx, f.risk.ID, []uuid.UUID{f.org})
	if err != nil {
		t.Fatal(err)
	}
	if before.Title != "Agent original draft" {
		t.Fatal("proposal wrote business data")
	}
	tx, err := f.pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	receipts, err := f.kit.Apply(ctx, tx, f.actor, validated)
	if err != nil {
		t.Fatal(err)
	}
	if len(receipts) != 2 {
		t.Fatalf("receipts: %v", receipts)
	}
	// Writes must remain invisible outside the supplied outer transaction.
	var outsideTitle string
	if err = f.pool.QueryRow(ctx, `SELECT title FROM risks WHERE id=$1`, f.risk.ID).Scan(&outsideTitle); err != nil {
		t.Fatal(err)
	}
	if outsideTitle != "Agent original draft" {
		t.Fatal("domain repo independently committed")
	}
	if err = tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	after, err := postgres.NewRiskRepository(f.pool).GetByID(ctx, f.risk.ID, []uuid.UUID{f.org})
	if err != nil {
		t.Fatal(err)
	}
	if after.Title != "Agent changed draft" || after.Description != "Retain description" || after.Mitigations[0].ID != mid || after.Mitigations[0].Action != "Updated mitigation" {
		t.Fatalf("patch lost values or identity: %+v", after)
	}
	if _, err = postgres.NewMitigationTaskRepository(f.pool).GetByID(ctx, f.task.ID, []uuid.UUID{f.org}); err != nil {
		t.Fatal("task history lost", err)
	}
}

func TestIntegrationAllWritesRollbackAfterLaterDomainFailure(t *testing.T) {
	f := newDomainFixture(t)
	ctx := context.Background()
	key := strings.ReplaceAll(uuid.NewString(), "-", "") + strings.ReplaceAll(uuid.NewString(), "-", "")
	riskOp := agent.Operation{ID: uuid.NewString(), Kind: "create_risk", Title: "Create draft", OrganizationID: f.org.String(), Included: true, After: map[string]any{"title": "Must rollback " + key, "category": "operasional", "probability": 3, "impact": 3}}
	eventAfter := map[string]any{"description": "Extracted test event", "occurredAt": "2026-10-20T10:00:00+07:00", "impactTypes": []any{"operational"}, "severity": "medium", "sourceDocumentName": "test.pdf", "sourceRefs": []any{map[string]any{"quote": "Extracted test event", "location": "Page 1"}}, "extractionKey": key}
	event1 := agent.Operation{ID: uuid.NewString(), Kind: "create_risk_event", Title: "First event", OrganizationID: f.org.String(), Included: true, After: eventAfter}
	event2 := event1
	event2.ID = uuid.NewString()
	event2.Title = "Duplicate event"
	ops, err := f.kit.ValidateOperations(ctx, f.actor, []agent.Operation{riskOp, event1, event2})
	if err != nil {
		t.Fatal(err)
	}
	tx, err := f.pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.kit.Apply(ctx, tx, f.actor, ops); err == nil {
		tx.Rollback(ctx)
		t.Fatal("duplicate extraction should fail")
	}
	if err = tx.Rollback(ctx); err != nil {
		t.Fatal(err)
	}
	var count int
	if err = f.pool.QueryRow(ctx, `SELECT COUNT(*) FROM risks WHERE title=$1`, "Must rollback "+key).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatal("partial risk insert persisted")
	}
	if err = f.pool.QueryRow(ctx, `SELECT COUNT(*) FROM incidents WHERE extraction_key=$1`, key).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatal("partial event insert persisted")
	}
	if err = f.pool.QueryRow(ctx, `SELECT COUNT(*) FROM audit_logs WHERE actor_user_id=$1 AND source='agent'`, f.actor).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatal("partial audit persisted")
	}
}

func TestIntegrationScopesStaleAndLiveMembership(t *testing.T) {
	f := newDomainFixture(t)
	ctx := context.Background()
	if err := f.kit.Authorize(ctx, f.actor, []uuid.UUID{f.child}); err != nil {
		t.Fatal("descendant read", err)
	}
	if err := f.kit.Authorize(ctx, f.actor, []uuid.UUID{f.foreign}); !errors.Is(err, agent.ErrForbidden) {
		t.Fatal("foreign scope allowed", err)
	}
	op := f.patch("patch_risk", map[string]any{"title": "Forbidden patch"})
	op.OrganizationID = f.child.String()
	if _, err := f.kit.ValidateOperations(ctx, f.actor, []agent.Operation{op}); !errors.Is(err, agent.ErrForbidden) {
		t.Fatal("inherited write allowed", err)
	}
	op = f.patch("patch_risk", map[string]any{"title": "Stale patch"})
	op.ExpectedUpdatedAt = time.Now().Add(-time.Hour).Format(time.RFC3339Nano)
	if _, err := f.kit.ValidateOperations(ctx, f.actor, []agent.Operation{op}); !errors.Is(err, agent.ErrStale) {
		t.Fatal("stale patch allowed", err)
	}
	op = f.patch("patch_risk", map[string]any{"title": "Revoked patch"})
	ops, err := f.kit.ValidateOperations(ctx, f.actor, []agent.Operation{op})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.pool.Exec(ctx, `UPDATE users SET status='inactive' WHERE id=$1`, f.actor); err != nil {
		t.Fatal(err)
	}
	tx, err := f.pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	if _, err = f.kit.Apply(ctx, tx, f.actor, ops); !errors.Is(err, agent.ErrForbidden) {
		t.Fatal("revoked actor applied proposal", err)
	}
}

func TestIntegrationInTxValidationWorksWithSingleConnection(t *testing.T) {
	f := newDomainFixture(t)
	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
	defer cancel()
	// A separate pool with one connection detects accidental pooled reads from
	// toolkit callbacks while the store owns the only connection.
	cfg := f.pool.Config()
	cfg.MaxConns = 1
	single, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer single.Close()
	kit := New(single, service.NewOrganizationHierarchy(postgres.NewOrganizationRepository(single)))
	tx, err := single.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	if err = kit.AuthorizeInTx(ctx, tx, f.actor, []uuid.UUID{f.org}); err != nil {
		t.Fatal(err)
	}
	if _, err = kit.ValidateOperationsInTx(ctx, tx, f.actor, []agent.Operation{f.patch("patch_risk", map[string]any{"title": "Validated inside transaction"})}); err != nil {
		t.Fatal(err)
	}
}

func TestIntegrationReadWidgetsUseCanonicalReportAndBoundedScope(t *testing.T) {
	f := newDomainFixture(t)
	ctx := context.Background()
	for _, tt := range []struct{ name, args string }{{"list_risks", `{"status":"draft","limit":5}`}, {"list_high_risks", `{"cycle":"2026-Q4","limit":5}`}, {"list_mitigation_tasks", `{"overdueOnly":true,"limit":5}`}, {"list_risk_events", `{"limit":5}`}, {"quarterly_report", `{"cycle":"2026-Q4","comparisonCycle":"2026-Q3"}`}, {"lookup_pic", `{"limit":5}`}} {
		t.Run(tt.name, func(t *testing.T) {
			res, err := f.kit.Execute(ctx, f.actor, tt.name, []byte(tt.args))
			if err != nil {
				t.Fatal(err)
			}
			if len(res.Widgets) == 0 {
				t.Fatal("missing widgets")
			}
			if len(res.OrganizationIDs) != 1 || res.OrganizationIDs[0] != f.org {
				t.Fatalf("scope: %v", res.OrganizationIDs)
			}
			for _, w := range res.Widgets {
				if w.SnapshotAt.IsZero() {
					t.Fatal("missing snapshot")
				}
				if strings.Contains(res.Content, "password_hash") || strings.Contains(res.Content, "@example.invalid") {
					t.Fatal("identity fields leaked")
				}
				for _, source := range w.SourceIDs {
					if !strings.HasPrefix(source, "/") || strings.HasPrefix(source, "//") || strings.Contains(source, "\\") {
						t.Fatal("source must be a usable application link", source)
					}
				}
			}
		})
	}
}

func TestIntegrationTaskReportEventLinksAndReassessment(t *testing.T) {
	f := newDomainFixture(t)
	ctx := context.Background()
	// A final fixture represents a profile finalized by the ordinary application.
	if _, err := f.pool.Exec(ctx, `UPDATE risks SET status='final', finalized_at=now(), effective_from='2026-10-01', updated_at=now() WHERE id=$1`, f.risk.ID); err != nil {
		t.Fatal(err)
	}
	var err error
	f.risk, err = postgres.NewRiskRepository(f.pool).GetByID(ctx, f.risk.ID, []uuid.UUID{f.org})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.kit.ValidateOperations(ctx, f.actor, []agent.Operation{f.patch("patch_risk", map[string]any{"title": "Illegal final edit"})}); err == nil {
		t.Fatal("final profile patch allowed")
	}
	report := agent.Operation{ID: uuid.NewString(), Kind: "report_mitigation_task", Title: "Report mitigation", TargetID: f.task.ID.String(), OrganizationID: f.org.String(), Included: true, ExpectedUpdatedAt: f.task.UpdatedAt.UTC().Format(time.RFC3339Nano), After: map[string]any{"notes": "Verified mitigation result", "evidenceUrl": "https://example.org/bukti"}}
	event := agent.Operation{ID: uuid.NewString(), Kind: "create_risk_event", Title: "Record linked event", OrganizationID: f.org.String(), Included: true, After: map[string]any{"description": "Related actual event", "occurredAt": "2026-10-20T10:00:00+07:00", "impactTypes": []any{"operational"}, "severity": "high", "riskIds": []any{f.risk.ID.String()}}}
	reassess := f.patch("reassess_risk", map[string]any{"cycle": "2027-Q1"})
	ops, err := f.kit.ValidateOperations(ctx, f.actor, []agent.Operation{report, event, reassess})
	if err != nil {
		t.Fatal(err)
	}
	tx, err := f.pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	receipts, err := f.kit.Apply(ctx, tx, f.actor, ops)
	if err != nil {
		t.Fatal(err)
	}
	if len(receipts) != 3 {
		t.Fatalf("receipts: %v", receipts)
	}
	if err = tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	stored, err := postgres.NewMitigationTaskRepository(f.pool).GetByID(ctx, f.task.ID, []uuid.UUID{f.org})
	if err != nil {
		t.Fatal(err)
	}
	if stored.Status != "done" || stored.ReportedBy == nil || *stored.ReportedBy != f.actor || stored.EvidenceURL != "https://example.org/bukti" {
		t.Fatalf("incorrect task report: %+v", stored)
	}
	var links, drafts, monitorings, linkedTasks int
	if err = f.pool.QueryRow(ctx, `SELECT COUNT(*) FROM incident_risk_links l JOIN incidents i ON i.id=l.incident_id WHERE i.created_by=$1 AND l.risk_id=$2`, f.actor, f.risk.ID).Scan(&links); err != nil {
		t.Fatal(err)
	}
	if links != 1 {
		t.Fatalf("event risk links: %d", links)
	}
	if err = f.pool.QueryRow(ctx, `SELECT COUNT(*) FROM risks WHERE previous_risk_id=$1 AND status='draft' AND assessment_cycle='2027-Q1'`, f.risk.ID).Scan(&drafts); err != nil {
		t.Fatal(err)
	}
	if drafts != 0 {
		t.Fatalf("reassessment drafts: %d", drafts)
	}
	if err = f.pool.QueryRow(ctx, `SELECT COUNT(*) FROM risk_monitorings WHERE source_risk_id=$1 AND status='draft' AND assessment_cycle='2027-Q1'`, f.risk.ID).Scan(&monitorings); err != nil {
		t.Fatal(err)
	}
	if err = f.pool.QueryRow(ctx, `SELECT COUNT(*) FROM mitigation_tasks t JOIN risk_monitorings m ON m.id=t.monitoring_id WHERE m.source_risk_id=$1 AND m.assessment_cycle='2027-Q1'`, f.risk.ID).Scan(&linkedTasks); err != nil {
		t.Fatal(err)
	}
	if monitorings != 1 || linkedTasks != 1 || !strings.HasPrefix(receipts[2].Href, "/risk/monitoring/") {
		t.Fatalf("canonical monitoring missing: monitorings=%d linkedTasks=%d receipt=%+v", monitorings, linkedTasks, receipts[2])
	}
	unchanged, err := postgres.NewRiskRepository(f.pool).GetByID(ctx, f.risk.ID, []uuid.UUID{f.org})
	if err != nil {
		t.Fatal(err)
	}
	if unchanged.Status != "final" || unchanged.Title != "Agent original draft" || !unchanged.IsCurrent {
		t.Fatal("reassessment changed final source")
	}
}

func (f *domainFixture) finalize(t *testing.T) {
	t.Helper()
	ctx := context.Background()
	if _, err := f.pool.Exec(ctx, `UPDATE risks SET status='final', finalized_at=now(), effective_from='2026-10-01', updated_at=now() WHERE id=$1`, f.risk.ID); err != nil {
		t.Fatal(err)
	}
	var err error
	f.risk, err = postgres.NewRiskRepository(f.pool).GetByID(ctx, f.risk.ID, []uuid.UUID{f.org})
	if err != nil {
		t.Fatal(err)
	}
}

func TestIntegrationMonitoringPolicyAndProposalIsolation(t *testing.T) {
	f := newDomainFixture(t)
	ctx := context.Background()
	if _, err := f.kit.ValidateOperations(ctx, f.actor, []agent.Operation{f.patch("reassess_risk", map[string]any{"cycle": "2026-Q4"})}); err == nil {
		t.Fatal("draft risk may not start monitoring")
	}
	f.finalize(t)
	op := f.patch("reassess_risk", map[string]any{"cycle": "2026-Q4"})
	ops, err := f.kit.ValidateOperations(ctx, f.actor, []agent.Operation{op})
	if err != nil {
		t.Fatal(err)
	}
	var periods, monitoringCount int
	if err = f.pool.QueryRow(ctx, `SELECT COUNT(*) FROM risk_monitoring_periods WHERE version_group_id=$1`, f.risk.VersionGroupID).Scan(&periods); err != nil {
		t.Fatal(err)
	}
	if err = f.pool.QueryRow(ctx, `SELECT COUNT(*) FROM risk_monitorings WHERE version_group_id=$1`, f.risk.VersionGroupID).Scan(&monitoringCount); err != nil {
		t.Fatal(err)
	}
	if periods != 0 || monitoringCount != 0 {
		t.Fatal("proposal preparation wrote monitoring business data")
	}
	if _, err = f.pool.Exec(ctx, `UPDATE risks SET archived_at=now() WHERE id=$1`, f.risk.ID); err != nil {
		t.Fatal(err)
	}
	if _, err = f.kit.ValidateOperations(ctx, f.actor, []agent.Operation{op}); err == nil {
		t.Fatal("archived final risk may not start monitoring")
	}
	if _, err = f.pool.Exec(ctx, `UPDATE risks SET archived_at=NULL,is_current=false WHERE id=$1`, f.risk.ID); err != nil {
		t.Fatal(err)
	}
	if _, err = f.kit.ValidateOperations(ctx, f.actor, []agent.Operation{op}); err == nil {
		t.Fatal("historical final risk may not start monitoring")
	}
	if _, err = f.pool.Exec(ctx, `UPDATE risks SET is_current=true WHERE id=$1`, f.risk.ID); err != nil {
		t.Fatal(err)
	}
	monitoring := entity.NewRiskMonitoringDraft(f.risk, "2026-Q4", f.actor)
	if err = postgres.NewRiskMonitoringRepository(f.pool).Create(ctx, monitoring); err != nil {
		t.Fatal(err)
	}
	tx, err := f.pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.kit.Apply(ctx, tx, f.actor, ops); !errors.Is(err, agent.ErrStale) {
		tx.Rollback(ctx)
		t.Fatalf("new monitoring must invalidate old confirmation: %v", err)
	}
	tx.Rollback(ctx)
	if _, err = f.kit.ValidateOperations(ctx, f.actor, []agent.Operation{f.patch("reassess_risk", map[string]any{"cycle": "2027-Q1"})}); err == nil {
		t.Fatal("unfinished previous monitoring must block next quarter")
	}
	ops, err = f.kit.ValidateOperations(ctx, f.actor, []agent.Operation{op})
	if err != nil {
		t.Fatal(err)
	}
	tx, err = f.pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	receipts, err := f.kit.Apply(ctx, tx, f.actor, ops)
	if err != nil {
		tx.Rollback(ctx)
		t.Fatal(err)
	}
	if len(receipts) != 1 || receipts[0].Href != "/risk/monitoring/"+monitoring.ID.String() {
		t.Fatal("existing monitoring must be reused", receipts)
	}
	if err = tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = f.pool.Exec(ctx, `UPDATE risk_monitorings SET status='final',finalized_at=now(),updated_at=now() WHERE id=$1`, monitoring.ID); err != nil {
		t.Fatal(err)
	}
	if _, err = f.kit.ValidateOperations(ctx, f.actor, []agent.Operation{op}); err == nil {
		t.Fatal("finalized monitoring must not be reopened")
	}
}

func TestIntegrationCanonicalMonitoringSideEffectsRollbackWithPackage(t *testing.T) {
	f := newDomainFixture(t)
	f.finalize(t)
	ctx := context.Background()
	key := strings.ReplaceAll(uuid.NewString(), "-", "") + strings.ReplaceAll(uuid.NewString(), "-", "")
	event := agent.Operation{ID: uuid.NewString(), Kind: "create_risk_event", Title: "Duplicate triggers rollback", OrganizationID: f.org.String(), Included: true, After: map[string]any{"description": "Rollback actual monitoring side effects", "occurredAt": "2026-10-20T10:00:00+07:00", "impactTypes": []any{"operational"}, "severity": "medium", "sourceDocumentName": "test.pdf", "sourceRefs": []any{map[string]any{"quote": "Monitoring rollback", "location": "Page 1"}}, "extractionKey": key}}
	duplicate := event
	duplicate.ID = uuid.NewString()
	ops, err := f.kit.ValidateOperations(ctx, f.actor, []agent.Operation{f.patch("reassess_risk", map[string]any{"cycle": "2027-Q1"}), event, duplicate})
	if err != nil {
		t.Fatal(err)
	}
	tx, err := f.pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.kit.Apply(ctx, tx, f.actor, ops); err == nil {
		tx.Rollback(ctx)
		t.Fatal("duplicate event must fail whole package")
	}
	if err = tx.Rollback(ctx); err != nil {
		t.Fatal(err)
	}
	for _, query := range []string{`SELECT COUNT(*) FROM risk_monitorings WHERE version_group_id=$1`, `SELECT COUNT(*) FROM risk_monitoring_periods WHERE version_group_id=$1`, `SELECT COUNT(*) FROM mitigation_tasks t JOIN risks r ON r.id=t.risk_id WHERE r.version_group_id=$1 AND t.period_label='2027-Q1'`} {
		var count int
		if err = f.pool.QueryRow(ctx, query, f.risk.VersionGroupID).Scan(&count); err != nil {
			t.Fatal(err)
		}
		if count != 0 {
			t.Fatal("partial monitoring side effect persisted", query)
		}
	}
}

func TestIntegrationExcludedFinalizedTargetDoesNotBlockOtherChanges(t *testing.T) {
	f := newDomainFixture(t)
	ctx := context.Background()
	ops, err := f.kit.ValidateOperations(ctx, f.actor, []agent.Operation{f.patch("patch_risk", map[string]any{"title": "Must not edit final"})})
	if err != nil {
		t.Fatal(err)
	}
	f.finalize(t)
	ops[0].Included = false
	ops = append(ops, agent.Operation{ID: uuid.NewString(), Kind: "create_risk", Title: "Keep selected change", OrganizationID: f.org.String(), Included: true, After: map[string]any{"title": "Selected new draft", "category": "operasional", "probability": 2, "impact": 2}})
	ops, err = f.kit.ValidateOperations(ctx, f.actor, ops)
	if err != nil {
		t.Fatal("excluded finalized target blocked proposal edit", err)
	}
	tx, err := f.pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	receipts, err := f.kit.Apply(ctx, tx, f.actor, ops)
	if err != nil || len(receipts) != 1 {
		t.Fatal("selected operation failed", receipts, err)
	}
	if err = tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
}

func TestIntegrationTaskReportsBindParentAndRespectFinalMonitoring(t *testing.T) {
	f := newDomainFixture(t)
	f.finalize(t)
	ctx := context.Background()
	monitoring := entity.NewRiskMonitoringDraft(f.risk, "2026-Q4", f.actor)
	if err := postgres.NewRiskMonitoringRepository(f.pool).Create(ctx, monitoring); err != nil {
		t.Fatal(err)
	}
	if _, err := f.pool.Exec(ctx, `UPDATE mitigation_tasks SET monitoring_id=$2,status='done',notes='Valid completed mitigation report',reported_by=$3,reported_at=now() WHERE id=$1`, f.task.ID, monitoring.ID, f.actor); err != nil {
		t.Fatal(err)
	}
	var err error
	f.task, err = postgres.NewMitigationTaskRepository(f.pool).GetByID(ctx, f.task.ID, []uuid.UUID{f.org})
	if err != nil {
		t.Fatal(err)
	}
	op := agent.Operation{ID: uuid.NewString(), Kind: "report_mitigation_task", Title: "Update reviewed report", TargetID: f.task.ID.String(), OrganizationID: f.org.String(), Included: true, ExpectedUpdatedAt: f.task.UpdatedAt.UTC().Format(time.RFC3339Nano), After: map[string]any{"notes": "Corrected mitigation report content"}}
	ops, err := f.kit.ValidateOperations(ctx, f.actor, []agent.Operation{op})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.pool.Exec(ctx, `UPDATE risks SET updated_at=clock_timestamp() WHERE id=$1`, f.risk.ID); err != nil {
		t.Fatal(err)
	}
	tx, err := f.pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.kit.Apply(ctx, tx, f.actor, ops); !errors.Is(err, agent.ErrStale) {
		tx.Rollback(ctx)
		t.Fatal("parent profile change must invalidate task confirmation", err)
	}
	tx.Rollback(ctx)
	if _, err = f.pool.Exec(ctx, `UPDATE risk_monitorings SET status='final',finalized_at=now(),updated_at=now() WHERE id=$1`, monitoring.ID); err != nil {
		t.Fatal(err)
	}
	if _, err = f.kit.ValidateOperations(ctx, f.actor, []agent.Operation{op}); err == nil {
		t.Fatal("completed report under final monitoring must be read-only")
	}
}

func TestIntegrationPackagesLockIndirectEventTargetsInStableOrder(t *testing.T) {
	f := newDomainFixture(t)
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	second := *f.risk
	second.ID, second.VersionGroupID = uuid.Nil, uuid.New()
	second.Code = "R-AGENT-" + uuid.NewString()
	second.Mitigations = nil
	if err := postgres.NewRiskRepository(f.pool).Create(ctx, &second); err != nil {
		t.Fatal(err)
	}
	event := func(riskID uuid.UUID) agent.Operation {
		return agent.Operation{ID: uuid.NewString(), Kind: "create_risk_event", Title: "Record cross-target event", OrganizationID: f.org.String(), Included: true, After: map[string]any{"description": "Concurrent linked event", "occurredAt": "2026-10-20T10:00:00+07:00", "impactTypes": []any{"operational"}, "severity": "medium", "riskIds": []any{riskID.String()}}}
	}
	patchSecond := f.patch("patch_risk", map[string]any{"title": "Concurrent second risk"})
	patchSecond.TargetID, patchSecond.ExpectedUpdatedAt = second.ID.String(), second.UpdatedAt.UTC().Format(time.RFC3339Nano)
	packages := [][]agent.Operation{{event(f.risk.ID), patchSecond}, {event(second.ID), f.patch("patch_risk", map[string]any{"title": "Concurrent first risk"})}}
	for i := range packages {
		var err error
		packages[i], err = f.kit.ValidateOperations(ctx, f.actor, packages[i])
		if err != nil {
			t.Fatal(err)
		}
	}
	start, results := make(chan struct{}), make(chan error, 2)
	for _, ops := range packages {
		go func(ops []agent.Operation) {
			tx, err := f.pool.Begin(ctx)
			if err != nil {
				results <- err
				return
			}
			defer tx.Rollback(context.Background())
			<-start
			if _, err = f.kit.Apply(ctx, tx, f.actor, ops); err == nil {
				err = tx.Commit(ctx)
			}
			results <- err
		}(ops)
	}
	close(start)
	for range packages {
		if err := <-results; err != nil {
			t.Fatal("concurrent package lock order failed", err)
		}
	}
}

func TestIntegrationAgentUsesCanonicalMonitoringBeforeRiskLockOrder(t *testing.T) {
	f := newDomainFixture(t)
	f.finalize(t)
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	monitoring := entity.NewRiskMonitoringDraft(f.risk, "2026-Q4", f.actor)
	if err := postgres.NewRiskMonitoringRepository(f.pool).Create(ctx, monitoring); err != nil {
		t.Fatal(err)
	}
	ops, err := f.kit.ValidateOperations(ctx, f.actor, []agent.Operation{f.patch("reassess_risk", map[string]any{"cycle": "2026-Q4"})})
	if err != nil {
		t.Fatal(err)
	}
	canonicalTx, err := f.pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer canonicalTx.Rollback(context.Background())
	if _, err = canonicalTx.Exec(ctx, `SELECT id FROM risk_monitorings WHERE id=$1 FOR UPDATE`, monitoring.ID); err != nil {
		t.Fatal(err)
	}
	agentTx, err := f.pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer agentTx.Rollback(context.Background())
	var pid int
	if err = agentTx.QueryRow(ctx, `SELECT pg_backend_pid()`).Scan(&pid); err != nil {
		t.Fatal(err)
	}
	done := make(chan error, 1)
	go func() {
		_, err := f.kit.Apply(ctx, agentTx, f.actor, ops)
		done <- err
	}()
	ticker := time.NewTicker(5 * time.Millisecond)
	defer ticker.Stop()
	for {
		var waiting bool
		if err = f.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE pid=$1 AND wait_event_type='Lock')`, pid).Scan(&waiting); err != nil {
			t.Fatal(err)
		}
		if waiting {
			break
		}
		select {
		case <-ticker.C:
		case <-ctx.Done():
			t.Fatal("agent never reached monitoring lock", ctx.Err())
		}
	}
	// Canonical finalization already holds the monitoring, then updates risk.
	// An Agent that holds risk while waiting for monitoring would deadlock here.
	if _, err = canonicalTx.Exec(ctx, `UPDATE risks SET updated_at=clock_timestamp() WHERE id=$1`, f.risk.ID); err != nil {
		t.Fatal("canonical operation deadlocked against Agent", err)
	}
	if err = canonicalTx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	if err = <-done; !errors.Is(err, agent.ErrStale) {
		t.Fatal("agent did not observe changed source after waiting", err)
	}
}
