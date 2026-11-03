package postgres

import (
	"context"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	domainrepo "github.com/manris/backend/internal/domain/repository"
	workuc "github.com/manris/backend/internal/usecase/operator_work"
	"os"
	"testing"
	"time"
)

// Optional read-only smoke test of the production projection against a configured database.
func TestOperatorWorkReadIntegration(t *testing.T) {
	dsn := os.Getenv("OPERATOR_WORK_READ_DATABASE_URL")
	if dsn == "" {
		t.Skip("requires OPERATOR_WORK_READ_DATABASE_URL")
	}
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}
	cfg.ConnConfig.RuntimeParams["default_transaction_read_only"] = "on"
	ctx := context.Background()
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	rows, err := pool.Query(ctx, "SELECT DISTINCT organization_id FROM users WHERE organization_id IS NOT NULL LIMIT 10")
	if err != nil {
		t.Fatal(err)
	}
	orgs := []uuid.UUID{}
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			t.Fatal(err)
		}
		orgs = append(orgs, id)
	}
	if err := rows.Err(); err != nil {
		t.Fatal(err)
	}
	rows.Close()
	if len(orgs) == 0 {
		t.Skip("no organizations available")
	}
	repo := NewOperatorWorkRepository(pool)
	for _, org := range orgs {
		totals := map[string]int{}
		for _, status := range []string{"all", "monitored", "not_monitored"} {
			items, total, err := NewRiskRepository(pool).ListRegister(ctx, domainrepo.RiskRegisterFilter{OrgIDs: []uuid.UUID{org}, Status: "final", AssessmentCycle: "2026-Q3", MonitoringStatus: status, Page: 1, Limit: 100})
			if err != nil {
				t.Fatal(err)
			}
			totals[status] = total
			for _, item := range items {
				var finalized bool
				if err := pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM risk_monitorings WHERE version_group_id=$1 AND assessment_cycle='2026-Q3' AND status='final')", item.VersionGroupID).Scan(&finalized); err != nil {
					t.Fatal(err)
				}
				if (status == "monitored" && !finalized) || (status == "not_monitored" && finalized) {
					t.Fatalf("wrong generic filter %s", status)
				}
			}
		}
		if totals["all"] != totals["monitored"]+totals["not_monitored"] {
			t.Fatalf("selected-period universe changed: %#v", totals)
		}

		candidates, err := repo.ListCandidates(ctx, org, time.Now())
		if err != nil {
			t.Fatal(err)
		}
		sections := workuc.BuildSections(workuc.BuildItems(candidates, uuid.New(), time.Now()))
		if len(sections) != 3 {
			t.Fatal("missing sections")
		}
		for _, section := range sections {
			if len(section.Items) > 5 || section.Total < len(section.Items) {
				t.Fatal("invalid section preview")
			}
		}
	}
}
