package postgres

import (
	"context"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/repository"
)

func TestGovernanceServerPagination(t *testing.T) {
	dsn := os.Getenv("PAGINATION_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("requires PAGINATION_TEST_DATABASE_URL")
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
	// All fixtures shadow public tables only for this rolled-back transaction.
	_, err = tx.Exec(ctx, `
 CREATE TEMP TABLE organizations (id uuid, name text) ON COMMIT DROP;
 CREATE TEMP TABLE users (id uuid, name text) ON COMMIT DROP;
 CREATE TEMP TABLE risks (id uuid, code text, title text) ON COMMIT DROP;
 CREATE TEMP TABLE tmpmr_assessments (
  id uuid, organization_id uuid, period text, assessor_id uuid, reviewer_id uuid,
  status text, score numeric(6,2), maturity_level text, review_note text,
  created_at timestamptz, updated_at timestamptz
 ) ON COMMIT DROP;
 CREATE TEMP TABLE risk_cascades (
  id uuid, source_risk_id uuid, target_risk_id uuid, source_org_id uuid, target_org_id uuid,
  cascade_type text, adoption_type text, status text, analysis_note text, decision_note text,
  proposed_by uuid, decided_by uuid, decided_at timestamptz, created_at timestamptz
 ) ON COMMIT DROP;
 CREATE TEMP TABLE planning (id uuid, organization_id uuid, period text, title text, status text, created_at timestamptz) ON COMMIT DROP;
 CREATE TEMP TABLE planning_goals (id uuid, planning_id uuid, title text, created_at timestamptz) ON COMMIT DROP;
 CREATE TEMP TABLE planning_objectives (id uuid, goal_id uuid, title text, sort_order integer) ON COMMIT DROP;
 CREATE TEMP TABLE planning_ikus (id uuid, objective_id uuid, title text, target text, sort_order integer) ON COMMIT DROP;
 CREATE TEMP TABLE planning_programs (id uuid, iku_id uuid, title text, sort_order integer) ON COMMIT DROP;
 CREATE TEMP TABLE planning_activities (id uuid, program_id uuid, title text, sort_order integer) ON COMMIT DROP;
 CREATE TEMP TABLE planning_ros (id uuid, activity_id uuid, title text) ON COMMIT DROP;
 `)
	if err != nil {
		t.Fatal(err)
	}
	org, outside, risk := uuid.New(), uuid.New(), uuid.New()
	_, err = tx.Exec(ctx, `INSERT INTO organizations VALUES ($1, 'Unit A'), ($2, 'Unit B');`, org, outside)
	if err != nil {
		t.Fatal(err)
	}
	_, err = tx.Exec(ctx, `INSERT INTO risks VALUES ($1, 'R-1', 'Risk one')`, risk)
	if err != nil {
		t.Fatal(err)
	}

	t.Run("TMPMR", func(t *testing.T) {
		for i, status := range []string{"draft", "submitted", "approved"} {
			_, err := tx.Exec(ctx, `INSERT INTO tmpmr_assessments VALUES ($1, $2, $3, NULL, NULL, $4, $5, 'Awal', '', '2026-01-01', '2026-01-01')`, uuid.New(), org, []string{"2024", "2025", "2026"}[i], status, i+1)
			if err != nil {
				t.Fatal(err)
			}
		}
		repo := &tmpmrRepository{pool: tx}
		filter := repository.TMPMRListFilter{OrganizationID: &org, Page: 1, Limit: 2, SortBy: "score", SortOrder: "asc"}
		first, total, err := repo.List(ctx, filter)
		if err != nil || total != 3 || len(first) != 2 || first[0].Score != 1 || first[0].OrganizationName != "Unit A" {
			t.Fatalf("first page %v %d %v", first, total, err)
		}
		filter.Page = 2
		second, total, err := repo.List(ctx, filter)
		if err != nil || total != 3 || len(second) != 1 || second[0].Score != 3 {
			t.Fatalf("second page %v %d %v", second, total, err)
		}
		filter.Page, filter.Query, filter.Status = 1, "Unit A", "submitted"
		filtered, total, err := repo.List(ctx, filter)
		if err != nil || total != 1 || len(filtered) != 1 || filtered[0].Status != "submitted" {
			t.Fatalf("search/status %v %d %v", filtered, total, err)
		}
		summary, err := repo.Summary(ctx, &org)
		if err != nil || summary.Total != 3 || summary.Draft != 1 || summary.Submitted != 1 || summary.Approved != 1 || len(summary.Periods) != 3 || summary.Periods[0] != "2026" {
			t.Fatalf("summary %+v %v", summary, err)
		}
		filter.OrganizationID, filter.Query, filter.Status = &outside, "", ""
		_, total, err = repo.List(ctx, filter)
		if err != nil || total != 0 {
			t.Fatalf("organization scope total %d %v", total, err)
		}
	})

	t.Run("Cascading", func(t *testing.T) {
		for _, status := range []string{"proposed", "accepted", "implemented"} {
			_, err := tx.Exec(ctx, `INSERT INTO risk_cascades VALUES ($1, $2, NULL, $3, $4, 'bottom_up_escalation', '', $5, '', '', NULL, NULL, NULL, '2026-01-01')`, uuid.New(), risk, org, outside, status)
			if err != nil {
				t.Fatal(err)
			}
		}
		repo := &riskCascadeRepository{pool: tx}
		filter := repository.RiskCascadeListFilter{OrgIDs: []uuid.UUID{org}, Page: 1, Limit: 2}
		first, total, err := repo.List(ctx, filter)
		if err != nil || total != 3 || len(first) != 2 {
			t.Fatalf("first page %v %d %v", first, total, err)
		}
		filter.Page = 2
		second, total, err := repo.List(ctx, filter)
		if err != nil || total != 3 || len(second) != 1 || second[0].ID == first[0].ID || second[0].ID == first[1].ID {
			t.Fatalf("second page %v %d %v", second, total, err)
		}
		filter.Page, filter.Query, filter.Status, filter.SortBy, filter.SortOrder = 1, "risk one", "accepted", "status", "asc"
		filtered, total, err := repo.List(ctx, filter)
		if err != nil || total != 1 || len(filtered) != 1 || filtered[0].Status != "accepted" {
			t.Fatalf("filtered page %v %d %v", filtered, total, err)
		}
		summary, err := repo.Summary(ctx, []uuid.UUID{org})
		if err != nil || summary.Total != 3 || summary.Pending != 1 || summary.Approved != 2 || summary.BottomUp != 3 {
			t.Fatalf("summary %+v %v", summary, err)
		}
		unreadable := uuid.New()
		filter.OrganizationID = &unreadable
		_, total, err = repo.List(ctx, filter)
		if err != nil || total != 0 {
			t.Fatalf("narrowed org total %d %v", total, err)
		}
	})

	t.Run("PlanningCompleteGroups", func(t *testing.T) {
		planA, planB, goal, objective, iku, program, activity := uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New()
		_, err := tx.Exec(ctx, `INSERT INTO planning VALUES ($1, $3, '2026', 'Agreement A', 'draft', '2026-01-01'), ($2, $3, '2025', 'Agreement B', 'draft', '2025-01-01')`, planA, planB, org)
		if err != nil {
			t.Fatal(err)
		}
		for _, fixture := range []struct {
			sql  string
			args []any
		}{
			{`INSERT INTO planning_goals VALUES ($1, $2, 'Goal A', '2026-01-01')`, []any{goal, planA}},
			{`INSERT INTO planning_objectives VALUES ($1, $2, 'Objective A', 1)`, []any{objective, goal}},
			{`INSERT INTO planning_ikus VALUES ($1, $2, 'IKU A', '100', 1)`, []any{iku, objective}},
			{`INSERT INTO planning_programs VALUES ($1, $2, 'Program A', 1)`, []any{program, iku}},
			{`INSERT INTO planning_activities VALUES ($1, $2, 'Activity A', 1)`, []any{activity, program}},
		} {
			if _, err := tx.Exec(ctx, fixture.sql, fixture.args...); err != nil {
				t.Fatal(err)
			}
		}
		for _, title := range []string{"RO A", "RO B", "RO C"} {
			if _, err := tx.Exec(ctx, `INSERT INTO planning_ros VALUES ($1, $2, $3)`, uuid.New(), activity, title); err != nil {
				t.Fatal(err)
			}
		}
		repo := &planningHierarchyRepository{pool: tx}
		filter := repository.PlanningCompatibilityFilter{OrganizationID: &org, Page: 1, Limit: 1}
		first, total, err := repo.ListObjectiveCompatibilityRows(ctx, filter)
		if err != nil || total != 2 || len(first) != 3 || first[0].PlanningID != planA || first[2].ProcessBusiness != "RO C" {
			t.Fatalf("complete first group %v %d %v", first, total, err)
		}
		filter.Page = 2
		second, total, err := repo.ListObjectiveCompatibilityRows(ctx, filter)
		if err != nil || total != 2 || len(second) != 1 || second[0].PlanningID != planB {
			t.Fatalf("second group %v %d %v", second, total, err)
		}
		filter.Page, filter.Q, filter.SortBy, filter.SortOrder = 1, "Unit A", "count", "asc"
		searched, total, err := repo.ListObjectiveCompatibilityRows(ctx, filter)
		if err != nil || total != 2 || len(searched) != 1 || searched[0].PlanningID != planB {
			t.Fatalf("search and sort %v %d %v", searched, total, err)
		}
		filter.Q, filter.Period = "RO B", "2026"
		filtered, total, err := repo.ListObjectiveCompatibilityRows(ctx, filter)
		if err != nil || total != 1 || len(filtered) != 1 || filtered[0].ProcessBusiness != "RO B" {
			t.Fatalf("filtered group %v %d %v", filtered, total, err)
		}
		periods, err := repo.ListCompatibilityPeriods(ctx, &org)
		if err != nil || len(periods) != 2 || periods[0] != "2026" {
			t.Fatalf("period metadata %v %v", periods, err)
		}
	})
}
