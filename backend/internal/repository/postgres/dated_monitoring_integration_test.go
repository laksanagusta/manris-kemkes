package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

// The opt-in URL must point to an isolated database migrated through 85.
// All fixtures and failure-injection DDL are rolled back with the outer tx.
func TestDatedMonitoringTransactions(t *testing.T) {
	dsn := os.Getenv("DATED_MONITORING_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("requires isolated DATED_MONITORING_TEST_DATABASE_URL migrated through85")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	org, actor, group := uuid.New(), uuid.New(), uuid.New()
	if _, err := tx.Exec(ctx, `INSERT INTO organizations(id,name) VALUES($1,'Dated monitoring test')`, org); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(ctx, `INSERT INTO users(id,name,username,email,password_hash,role,organization_id) VALUES($1,'Dated tester',$2,$3,'test','unit',$4)`, actor, "dated-"+actor.String(), actor.String()+"@example.test", org); err != nil {
		t.Fatal(err)
	}
	effective := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	source := &entity.Risk{Code: "DATED-" + group.String(), Title: "Dated risk", Description: "Dated observation test", Category: entity.RiskCategoryOperasional, Status: "final", VersionGroupID: group, OrganizationID: &org, CreatedBy: &actor, IsCurrent: true, IsCycleCurrent: true, VersionNumber: 1, AssessmentCycle: "2026-Q1", Probability: 3, Impact: 3, TargetProbability: 1, TargetImpact: 1, EffectiveFrom: &effective, Mitigations: []entity.Mitigation{{Action: "Review procedure", Owner: "PIC"}}}
	riskRepo := &riskRepository{pool: tx}
	monitorings := &riskMonitoringRepository{pool: tx}
	if err := riskRepo.Create(ctx, source); err != nil {
		t.Fatal(err)
	}
	var inputTaskID uuid.UUID
	if err := tx.QueryRow(ctx, `INSERT INTO mitigation_tasks(mitigation_id,risk_id,period_label,period_start,period_end,due_date,status,generated_by) SELECT id,risk_id,'2026-Q1','2026-01-01','2026-03-31','2026-03-31','pending','manual' FROM mitigations WHERE risk_id=$1 RETURNING id`, source.ID).Scan(&inputTaskID); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(ctx, `UPDATE mitigation_tasks SET created_at='2026-01-10' WHERE id=$1`, inputTaskID); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(ctx, `INSERT INTO mitigation_tasks(mitigation_id,risk_id,period_label,period_start,period_end,due_date,status,generated_by,created_at,reported_at,reported_by,notes,evidence_url)
 SELECT id,risk_id,'2026-Q1','2026-01-02','2026-03-31','2026-03-31','done','manual','2026-01-10','2026-03-20',$2,'Future report must be hidden','https://example.test/future' FROM mitigations WHERE risk_id=$1`, source.ID, actor); err != nil {
		t.Fatal(err)
	}
	events := &riskEventRepository{pool: tx}
	for _, date := range []string{"2026-02-01", "2026-03-01"} {
		occurred, _ := time.Parse("2006-01-02", date)
		event := &entity.RiskEvent{Description: "Dated event " + date, OccurredAt: occurred, Severity: "low", OrganizationID: org, CreatedBy: actor, ImpactTypes: []string{"operational"}, SourceRefs: []entity.DocumentSourceRef{}}
		if err := events.Create(ctx, event, []uuid.UUID{source.ID}); err != nil {
			t.Fatal(err)
		}
	}
	finalize := func(src *entity.Risk, date string, expectFailure bool) (*entity.RiskMonitoring, *entity.Risk) {
		t.Helper()
		observed, err := time.Parse("2006-01-02", date)
		if err != nil {
			t.Fatal(err)
		}
		cycle := fmt.Sprintf("%d-Q%d", observed.Year(), (int(observed.Month())-1)/3+1)
		m := entity.NewRiskMonitoringDraft(src, cycle, actor)
		m.ObservedAt = date
		m.Conclusion = "Observed conditions reviewed"
		if err := monitorings.Create(ctx, m); err != nil {
			t.Fatal(err)
		}
		result := *src
		result.ID = uuid.Nil
		result.AssessmentCycle = cycle
		result.Mitigations = append([]entity.Mitigation(nil), src.Mitigations...)
		if expectFailure {
			if _, err := tx.Exec(ctx, `CREATE FUNCTION pg_temp.reject_dated_task() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.generated_by_monitoring_id::text=TG_ARGV[0] THEN RAISE EXCEPTION 'test task insertion failure'; END IF; RETURN NEW; END $$`); err != nil {
				t.Fatal(err)
			}
			trigger := "dated_fail_" + actor.String()[:8]
			if _, err := tx.Exec(ctx, fmt.Sprintf(`CREATE TRIGGER %s BEFORE INSERT ON mitigation_tasks FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_dated_task('%s')`, trigger, m.ID.String())); err != nil {
				t.Fatal(err)
			}
			if _, err := monitorings.Finalize(ctx, m.ID, &result, actor, repository.MonitoringFinalizeReview{}); err == nil {
				t.Fatal("expected task insertion failure")
			}
			var status string
			var results int
			if err := tx.QueryRow(ctx, `SELECT status FROM risk_monitorings WHERE id=$1`, m.ID).Scan(&status); err != nil {
				t.Fatal(err)
			}
			if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM risks WHERE id=$1`, result.ID).Scan(&results); err != nil {
				t.Fatal(err)
			}
			if status != "draft" || results != 0 {
				t.Fatalf("partial commit: status=%s result=%d", status, results)
			}
			if _, err := tx.Exec(ctx, `DELETE FROM risk_monitorings WHERE id=$1`, m.ID); err != nil {
				t.Fatal(err)
			}
			return m, nil
		}
		final, err := monitorings.Finalize(ctx, m.ID, &result, actor, repository.MonitoringFinalizeReview{})
		if err != nil {
			t.Fatal(err)
		}
		var count int
		if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM mitigation_tasks WHERE generated_by_monitoring_id=$1`, m.ID).Scan(&count); err != nil {
			t.Fatal(err)
		}
		if count != 1 {
			t.Fatalf("expected one follow-up task, got %d", count)
		}
		if _, err := monitorings.Finalize(ctx, m.ID, &result, actor, repository.MonitoringFinalizeReview{}); err != nil {
			t.Fatalf("idempotent retry: %v", err)
		}
		if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM mitigation_tasks WHERE generated_by_monitoring_id=$1`, m.ID).Scan(&count); err != nil || count != 1 {
			t.Fatalf("retry task count=%d err=%v", count, err)
		}
		return final, &result
	}
	first, r1 := finalize(source, "2026-02-05", false)
	var febSnapshot []byte
	if err := tx.QueryRow(ctx, `SELECT evidence_snapshot FROM risk_monitorings WHERE id=$1`, first.ID).Scan(&febSnapshot); err != nil {
		t.Fatal(err)
	}
	var febEvidence entity.RiskMonitoringEvidence
	if err := json.Unmarshal(febSnapshot, &febEvidence); err != nil {
		t.Fatal(err)
	}
	if len(febEvidence.Reports) != 2 || len(febEvidence.Events) != 1 {
		t.Fatalf("observation evidence reports=%d events=%d", len(febEvidence.Reports), len(febEvidence.Events))
	}
	for _, report := range febEvidence.Reports {
		if report.Status != "pending" || report.ReportedAt != nil || report.Notes != "" || report.EvidenceURL != "" {
			t.Fatalf("future report leaked into Feb observation: %#v", report)
		}
	}
	if first.MitigationCompletionPercent != 0 {
		t.Fatalf("future report inflated Feb completion: %d", first.MitigationCompletionPercent)
	}
	_, r2 := finalize(r1, "2026-04-08", false)
	resolved, err := riskRepo.ResolveMonitoringSource(ctx, group, "2026-03-08", []uuid.UUID{org})
	if err != nil {
		t.Fatal(err)
	}
	if resolved.ID != r1.ID {
		t.Fatalf("historical source=%s want Feb profile %s", resolved.ID, r1.ID)
	}
	_, historical := finalize(resolved, "2026-03-08", false)
	if historical.IsCurrent || historical.IsCycleCurrent {
		t.Fatal("historical observation became active")
	}
	var active uuid.UUID
	if err := tx.QueryRow(ctx, `SELECT id FROM risks WHERE version_group_id=$1 AND is_current`, group).Scan(&active); err != nil || active != r2.ID {
		t.Fatalf("active risk regressed: %s err=%v", active, err)
	}
	var status string
	if err := tx.QueryRow(ctx, `SELECT status FROM mitigation_tasks WHERE id=$1`, inputTaskID).Scan(&status); err != nil || status != "pending" {
		t.Fatalf("old task changed: %s err=%v", status, err)
	}
	var evidenceBefore, evidenceAfter []byte
	if err := tx.QueryRow(ctx, `SELECT evidence_snapshot FROM risk_monitorings WHERE id=$1`, first.ID).Scan(&evidenceBefore); err != nil {
		t.Fatal(err)
	}
	taskRepo := &mitigationTaskRepository{pool: tx}
	task, err := taskRepo.GetByID(ctx, inputTaskID, []uuid.UUID{org})
	if err != nil {
		t.Fatal(err)
	}
	task.Status = "done"
	task.Notes = "Completed after the first observation"
	now := time.Now()
	task.ReportedAt = &now
	task.ReportedBy = &actor
	if err := taskRepo.Update(ctx, task); err != nil {
		t.Fatalf("old pending task cannot be reported: %v", err)
	}
	if err := tx.QueryRow(ctx, `SELECT evidence_snapshot FROM risk_monitorings WHERE id=$1`, first.ID).Scan(&evidenceAfter); err != nil {
		t.Fatal(err)
	}
	frozen, err := monitorings.GetByID(ctx, first.ID, []uuid.UUID{org})
	if err != nil {
		t.Fatal(err)
	}
	if frozen.MitigationCompletionPercent != 0 {
		t.Fatalf("later task update changed final completion: %d", frozen.MitigationCompletionPercent)
	}
	if string(evidenceBefore) != string(evidenceAfter) {
		t.Fatal("later task report mutated final evidence")
	}
	finalize(r2, "2026-05-01", true)
	if err := tx.QueryRow(ctx, `SELECT id FROM risks WHERE version_group_id=$1 AND is_current`, group).Scan(&active); err != nil || active != r2.ID {
		t.Fatalf("failed finalization changed current profile: %s %v", active, err)
	}
}
