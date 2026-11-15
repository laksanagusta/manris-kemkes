//go:build integration

package postgres

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

func managementRule(year int, active bool) entity.MonitoringRule {
	return entity.MonitoringRule{Name: "Management test", Year: year, Frequency: "semester", Active: active, Periods: []entity.MonitoringRulePeriod{
		{Label: "Semester I", Ordinal: 1, OpensOn: fmt.Sprintf("%d-01-01", year), ClosesOn: fmt.Sprintf("%d-06-30", year)},
		{Label: "Semester II", Ordinal: 2, OpensOn: fmt.Sprintf("%d-07-01", year), ClosesOn: fmt.Sprintf("%d-12-31", year)},
	}}
}

func requireActiveRuleConflict(t *testing.T, err error) {
	t.Helper()
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) || pgErr.Code != "23505" || pgErr.ConstraintName != "monitoring_rules_one_active_per_year" {
		t.Fatalf("want active-year conflict, got %v", err)
	}
}

func TestMonitoringRuleManagement(t *testing.T) {
	pool := configuredTestPool(t)
	ctx := context.Background()
	actor, org := uuid.New(), uuid.New()
	if _, err := pool.Exec(ctx, `INSERT INTO organizations(id,name) VALUES($1,'Rule management test')`, org); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `INSERT INTO users(id,name,username,email,password_hash,role,organization_id) VALUES($1,'Rule test',$2,$3,'test','superadmin',$4)`, actor, actor.String(), actor.String()+"@example.test", org); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		// The test owns this actor, organization, and all records selected below.
		_, err := pool.Exec(ctx, `DELETE FROM annual_risk_profile_versions WHERE created_by=$1`, actor)
		if err != nil {
			t.Error(err)
			return
		}
		if _, err = pool.Exec(ctx, `DELETE FROM monitoring_rules WHERE created_by=$1`, actor); err != nil {
			t.Error(err)
			return
		}
		if _, err = pool.Exec(ctx, `DELETE FROM users WHERE id=$1`, actor); err != nil {
			t.Error(err)
			return
		}
		if _, err = pool.Exec(ctx, `DELETE FROM organizations WHERE id=$1`, org); err != nil {
			t.Error(err)
		}
	})
	workflow := NewUPRWorkflow(pool)
	// Distinct years keep this independent of the configured-workflow fixtures.
	first, err := workflow.CreateMonitoringRule(ctx, actor, managementRule(3190, true))
	if err != nil {
		t.Fatal(err)
	}
	_, err = workflow.CreateMonitoringRule(ctx, actor, managementRule(3190, true))
	requireActiveRuleConflict(t, err)
	other, err := workflow.CreateMonitoringRule(ctx, actor, managementRule(3190, false))
	if err != nil {
		t.Fatal(err)
	}
	other.Active = true
	_, err = workflow.UpdateMonitoringRule(ctx, other.ID, *other)
	requireActiveRuleConflict(t, err)
	other.Active = false
	other.Name = "Edited schedule"
	other.Periods[0].ClosesOn = "3190-05-31"
	other, err = workflow.UpdateMonitoringRule(ctx, other.ID, *other)
	if err != nil {
		t.Fatal(err)
	}
	if other.Name != "Edited schedule" || other.Periods[0].ClosesOn != "3190-05-31" {
		t.Fatalf("update lost fields: %+v", other)
	}
	if err = workflow.DeleteMonitoringRule(ctx, other.ID); err != nil {
		t.Fatal(err)
	}
	if err = workflow.DeleteMonitoringRule(ctx, other.ID); !errors.Is(err, domainerrors.ErrNotFound) {
		t.Fatalf("delete missing: %v", err)
	}
	if _, err = workflow.UpdateMonitoringRule(ctx, uuid.New(), managementRule(3190, false)); !errors.Is(err, domainerrors.ErrNotFound) {
		t.Fatalf("update missing: %v", err)
	}

	if _, err = pool.Exec(ctx, `INSERT INTO annual_risk_profile_versions(organization_id,year,version,created_by,monitoring_rule_id) VALUES($1,3190,1,$2,$3)`, org, actor, first.ID); err != nil {
		t.Fatal(err)
	}
	originalPeriodID := first.Periods[0].ID
	first.Active = false
	first, err = workflow.UpdateMonitoringRule(ctx, first.ID, *first)
	if err != nil {
		t.Fatal(err)
	}
	if !first.InUse || first.Active || first.Periods[0].ID != originalPeriodID {
		t.Fatal("used status update changed period identity or usage")
	}
	first.Name = "Forbidden rename"
	if _, err = workflow.UpdateMonitoringRule(ctx, first.ID, *first); err == nil {
		t.Fatal("used schedule edited")
	}
	if err = workflow.DeleteMonitoringRule(ctx, first.ID); err == nil {
		t.Fatal("used rule deleted")
	}
	list, err := workflow.MonitoringRules(ctx, true)
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, r := range list {
		if r.ID == first.ID {
			found = r.InUse
		}
	}
	if !found {
		t.Fatal("list omitted usage metadata")
	}
	// A replacement may become active without changing the old profile's rule.
	if _, err = workflow.CreateMonitoringRule(ctx, actor, managementRule(3190, true)); err != nil {
		t.Fatal(err)
	}

	first.Name = "Management test"
	first.Active = true
	_, err = workflow.UpdateMonitoringRule(ctx, first.ID, *first)
	requireActiveRuleConflict(t, err)
	moving, err := workflow.CreateMonitoringRule(ctx, actor, managementRule(3192, true))
	if err != nil {
		t.Fatal(err)
	}
	moved := managementRule(3190, true)
	_, err = workflow.UpdateMonitoringRule(ctx, moving.ID, moved)
	requireActiveRuleConflict(t, err)

	t.Run("concurrent creates", func(t *testing.T) {
		var wg sync.WaitGroup
		results := make(chan error, 2)
		for range 2 {
			wg.Add(1)
			go func() {
				defer wg.Done()
				_, err := workflow.CreateMonitoringRule(ctx, actor, managementRule(3191, true))
				results <- err
			}()
		}
		wg.Wait()
		close(results)
		success, conflict := 0, 0
		for err := range results {
			if err == nil {
				success++
			} else {
				requireActiveRuleConflict(t, err)
				conflict++
			}
		}
		if success != 1 || conflict != 1 {
			t.Fatalf("success=%d conflicts=%d", success, conflict)
		}
	})
}

// Exercise an upgrade containing multiple active rules, including a used rule.
func TestMonitoringRuleManagementUpgrade(t *testing.T) {
	pool := configuredTestPool(t)
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, `DROP INDEX monitoring_rules_one_active_per_year`); err != nil {
		t.Fatal(err)
	}
	f := seedConfiguredFixture(t, ctx, tx)
	if _, err = tx.Exec(ctx, `SET CONSTRAINTS ALL DEFERRED`); err != nil {
		t.Fatal(err)
	}
	duplicate := uuid.New()
	if _, err = tx.Exec(ctx, `INSERT INTO monitoring_rules(id,name,year,frequency,created_at) VALUES($1,'Older but unused',2026,'semester','2000-01-01')`, duplicate); err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(ctx, `INSERT INTO monitoring_rule_periods(rule_id,label,ordinal,opens_on,closes_on) SELECT $1,label,ordinal,opens_on,closes_on FROM monitoring_rule_periods WHERE rule_id=$2`, duplicate, f.rule); err != nil {
		t.Fatal(err)
	}
	// Model already-committed legacy rules, then use normal deferred validation.
	if _, err = tx.Exec(ctx, `SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED`); err != nil {
		t.Fatal(err)
	}
	_, file, _, _ := runtime.Caller(0)
	migration, err := os.ReadFile(filepath.Join(filepath.Dir(file), "../../../db/migrations/000090_monitoring_rule_management.up.sql"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(ctx, string(migration)); err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(ctx, `SET CONSTRAINTS ALL IMMEDIATE`); err != nil {
		t.Fatal(err)
	}
	var active, otherActive, linked bool
	if err = tx.QueryRow(ctx, `SELECT (SELECT active FROM monitoring_rules WHERE id=$1),(SELECT active FROM monitoring_rules WHERE id=$2),(SELECT monitoring_rule_id=$1 FROM annual_risk_profile_versions WHERE id=$3)`, f.rule, duplicate, f.profile).Scan(&active, &otherActive, &linked); err != nil {
		t.Fatal(err)
	}
	if !active || otherActive || !linked {
		t.Fatalf("active=%v duplicate=%v profile retained=%v", active, otherActive, linked)
	}
}
