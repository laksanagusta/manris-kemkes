package postgres_test

import (
	"context"
	"math"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/service"
	"github.com/manris/backend/internal/repository/postgres"
)

func TestQuarterlyReportHistoricalArchiveAndTaskRetention(t *testing.T) {
	pool := setupPool(t)
	ctx := context.Background()
	orgID := insertTestOrganization(t, pool, "Quarterly report integration "+uuid.NewString())
	riskRepo := postgres.NewRiskRepository(pool)
	risk := &entity.Risk{Code: "QR-" + uuid.NewString()[:8], Title: "Quarterly report fixture", Category: entity.RiskCategoryOperasional, Status: "final", OrganizationID: &orgID, VersionGroupID: uuid.New(), IsCurrent: true, IsCycleCurrent: true, VersionNumber: 1, AssessmentCycle: "2026-Q1", Probability: 3, Impact: 4, TargetProbability: 2, TargetImpact: 2, Mitigations: []entity.Mitigation{{Action: "Retain historical evidence", Owner: "PIC", Frequency: "rutin"}}}
	if err := riskRepo.Create(ctx, risk); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, "DELETE FROM audit_logs WHERE entity_type = 'risk' AND entity_id = $1", risk.ID)
		_ = riskRepo.Delete(ctx, risk.ID)
	})
	var mitigationID uuid.UUID
	if err := pool.QueryRow(ctx, "SELECT id FROM mitigations WHERE risk_id = $1", risk.ID).Scan(&mitigationID); err != nil {
		t.Fatal(err)
	}
	var taskID uuid.UUID
	if err := pool.QueryRow(ctx, `INSERT INTO mitigation_tasks (mitigation_id, risk_id, period_label, period_start, period_end, due_date, status, notes, reported_at) VALUES ($1,$2,'2026-Q1','2026-01-01','2026-03-31','2026-03-31','done','Laporan progres valid','2026-08-01') RETURNING id`, mitigationID, risk.ID).Scan(&taskID); err != nil {
		t.Fatal(err)
	}
	reports := postgres.NewQuarterlyReportRepository(pool)
	archive := postgres.NewRiskArchiveRepository(pool)
	archived := time.Date(2026, 5, 15, 9, 0, 0, 0, time.UTC)
	risk.ArchivedAt, risk.ArchivedReason = &archived, "No longer applicable"
	if err := archive.UpdateArchiveMetadata(ctx, risk, uuid.Nil); err != nil {
		t.Fatal(err)
	}
	// The fixture's audited event is backdated to its archive timestamp.
	if _, err := pool.Exec(ctx, "UPDATE audit_logs SET created_at = $2 WHERE entity_id = $1", risk.ID, archived); err != nil {
		t.Fatal(err)
	}
	for _, test := range []struct {
		cycle  string
		count  int
		marker bool
	}{
		{"2026-Q1", 1, false}, {"2026-Q2", 1, true}, {"2026-Q3", 0, false},
	} {
		start, end := service.QuarterlyPeriodBounds(test.cycle)
		period, err := reports.LoadPeriod(ctx, test.cycle, start, end, []uuid.UUID{orgID})
		if err != nil {
			t.Fatalf("%s: %v", test.cycle, err)
		}
		if len(period.Risks) != test.count || (test.count > 0 && period.Risks[0].ArchivedInPeriod != test.marker) {
			t.Fatalf("%s lifecycle mismatch: %+v", test.cycle, period.Risks)
		}
		if test.cycle == "2026-Q1" && (len(period.Tasks) != 1 || period.Tasks[0].ID != taskID || period.Tasks[0].ReportedAt == nil) {
			t.Fatal("late Q1 report must remain Q1, including archive-retained task evidence")
		}
	}
	// Restoring must retain the same task and plan IDs, and the archival interval
	// must remain reconstructible from the transactionally recorded audit trail.
	risk.ArchivedAt, risk.ArchivedReason = nil, ""
	if err := archive.UpdateArchiveMetadata(ctx, risk, uuid.Nil); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, "UPDATE audit_logs SET created_at = '2026-08-15' WHERE entity_id = $1 AND action = 'restore'", risk.ID); err != nil {
		t.Fatal(err)
	}
	start, end := service.QuarterlyPeriodBounds("2026-Q3")
	period, err := reports.LoadPeriod(ctx, "2026-Q3", start, end, []uuid.UUID{orgID})
	if err != nil || len(period.Risks) != 1 {
		t.Fatalf("restored during quarter must be included: %+v %v", period, err)
	}
	var count int
	if err := pool.QueryRow(ctx, "SELECT count(*) FROM mitigation_tasks WHERE id = $1 AND mitigation_id = $2", taskID, mitigationID).Scan(&count); err != nil || count != 1 {
		t.Fatalf("archive/restore lost original mitigation evidence: %d %v", count, err)
	}
}

func TestQuarterlyReportSeparatesProfileObservationAndTaskPeriods(t *testing.T) {
	pool := setupPool(t)
	ctx := context.Background()
	orgID := insertTestOrganization(t, pool, "Quarterly profile fixture "+uuid.NewString())
	emptyOrg := insertTestOrganization(t, pool, "Empty quarterly fixture "+uuid.NewString())
	repo := postgres.NewRiskRepository(pool)
	source := &entity.Risk{Code: "QR-PROFILE-" + uuid.NewString()[:8], Title: "Q1 profile", Category: entity.RiskCategoryOperasional, Status: "final", OrganizationID: &orgID, VersionGroupID: uuid.New(), IsCycleCurrent: true, VersionNumber: 1, AssessmentCycle: "2026-Q1", Probability: 4, Impact: 4, TargetProbability: 2, TargetImpact: 2, Mitigations: []entity.Mitigation{{Action: "Period attribution", Owner: "PIC", Frequency: "rutin"}}}
	if err := repo.Create(ctx, source); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = repo.Delete(ctx, source.ID) })
	result := *source
	result.ID = uuid.Nil
	result.VersionNumber = 2
	result.AssessmentCycle = "2026-Q2"
	result.Probability, result.Impact = 2, 2
	result.TargetProbability, result.TargetImpact = 1, 1
	result.PreviousRiskID = &source.ID
	result.IsCurrent = true
	result.Mitigations = nil
	if err := repo.Create(ctx, &result); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = repo.Delete(ctx, result.ID) })
	if _, err := pool.Exec(ctx, `UPDATE risks SET archived_at='2026-04-01',archived_reason='superseded by periodic reassessment' WHERE id=$1`, source.ID); err != nil {
		t.Fatal(err)
	}
	var monitoringID uuid.UUID
	if err := pool.QueryRow(ctx, `INSERT INTO risk_monitorings(source_risk_id,version_group_id,result_risk_id,assessment_cycle,status,mode,source_probability,source_impact,source_weight,source_nilai,observed_probability,observed_impact,observed_weight,observed_nilai,finalized_at) VALUES($1,$2,$3,'2026-Q1','final','score_only',4,4,1.16,19,2,2,1.8,7,'2026-08-10') RETURNING id`, source.ID, source.VersionGroupID, result.ID).Scan(&monitoringID); err != nil {
		t.Fatal(err)
	}
	var mitigationID uuid.UUID
	if err := pool.QueryRow(ctx, "SELECT id FROM mitigations WHERE risk_id=$1", source.ID).Scan(&mitigationID); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `INSERT INTO mitigation_tasks(mitigation_id,risk_id,monitoring_id,period_label,period_start,period_end,due_date,status,notes,reported_at) VALUES($1,$2,$3,'2026-Q1','2026-04-01','2026-06-30','2026-03-31','done','Valid Q1 late report','2026-08-01')`, mitigationID, source.ID, monitoringID); err != nil {
		t.Fatal(err)
	}
	reports := postgres.NewQuarterlyReportRepository(pool)
	for _, cycle := range []string{"2026-Q1", "2026-Q2"} {
		start, end := service.QuarterlyPeriodBounds(cycle)
		period, err := reports.LoadPeriod(ctx, cycle, start, end, []uuid.UUID{orgID})
		if err != nil {
			t.Fatal(err)
		}
		if len(period.Risks) != 1 || period.Risks[0].ArchivedInPeriod {
			t.Fatalf("supersession is not manual archival: %+v", period.Risks)
		}
		risk := period.Risks[0]
		if cycle == "2026-Q1" {
			if risk.ID != source.ID || math.Round(risk.Nilai) != math.Round(source.Nilai) || risk.MonitoringStatus == nil || *risk.MonitoringStatus != "final" || risk.MonitoringObservedNilai == nil || *risk.MonitoringObservedNilai != 7 || len(period.Tasks) != 1 {
				t.Fatalf("Q1 profile and late final observation must remain separate: risk=%+v, source=%s, tasks=%d", risk.Risk, source.ID,len(period.Tasks))
			}
		} else if risk.ID != result.ID || risk.TargetNilai != 1 || risk.MonitoringObservedNilai != nil || len(period.Tasks) != 0 {
			t.Fatalf("Q1 observation/tasks must not spill into Q2: %+v", period)
		}
	}
	orgs, err := reports.ListOrganizations(ctx, []uuid.UUID{orgID, emptyOrg})
	if err != nil || len(orgs) != 2 {
		t.Fatalf("scoped empty organization lost: %+v %v", orgs, err)
	}
}
