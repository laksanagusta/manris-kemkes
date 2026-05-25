# Analisis Kinerja & Risiko Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the **Analisis Kinerja & Risiko** dashboard that maps planning RO to approved risks and mitigation pressure using `inherent_score`.

**Architecture:** Add a modular backend reporting slice with dedicated domain DTOs, repository contract, PostgreSQL repository, small usecases, and HTTP handler endpoints under `/api/v1/reports/performance-risk`. Add a focused Next.js page under `/reports/performance-risk` that loads summary and ranking first, then lazy-loads RO detail on row selection.

**Tech Stack:** Go 1.25, Fiber, pgx, PostgreSQL, Next.js 16 App Router, React 19, TypeScript, TailwindCSS v4, shadcn/ui, Recharts, lucide-react.

---

## Scope Notes

This plan implements the MVP from [2026-05-24-performance-risk-analysis-design.md](/Users/dikalaksana/Engineering/manris-v2/docs/superpowers/specs/2026-05-24-performance-risk-analysis-design.md).

MVP includes:

- Summary cards.
- RO ranking table.
- RO detail view.
- Inherent 5x5 heatmap.
- Linked risk list.
- Pending and overdue mitigation list.
- Unlinked approved-risk data quality panel.

MVP excludes:

- Export.
- AI insight.
- Formal report generation.
- KRI and incident correlation.
- Residual, target, monitoring, or effective-score analysis.

## File Structure

Backend files:

- Create `backend/internal/domain/entity/performance_risk.go`: response DTOs for summary, nodes, detail, heatmap, risk rows, mitigation rows, and unlinked risks.
- Create `backend/internal/domain/repository/performance_risk.go`: repository interface and filter structs for this reporting slice.
- Create `backend/internal/repository/postgres/performance_risk.go`: PostgreSQL queries for RO nodes, detail, and unlinked risks.
- Create `backend/internal/usecase/performancerisk/metrics.go`: pure metric builder using `inherent_score`.
- Create `backend/internal/usecase/performancerisk/metrics_test.go`: pure metric tests.
- Create `backend/internal/usecase/performancerisk/usecases.go`: summary, node list, detail, and unlinked usecases.
- Create `backend/internal/usecase/performancerisk/usecases_test.go`: usecase tests with fake repository.
- Create `backend/internal/handler/http/performance_risk.go`: Fiber handler methods and request parsing.
- Create `backend/internal/handler/http/performance_risk_test.go`: handler route and access-scope tests.
- Modify `backend/internal/bootstrap/bootstrap.go`: wire repository and usecases.
- Modify `backend/cmd/server/main.go`: construct handler and register routes.
- Modify `backend/internal/repository/postgres/risk.go`: include `ro_id` in `ListCycleSnapshot` scan so existing snapshot consumers keep the linked RO.

Frontend files:

- Create `frontend/src/types/performance-risk.ts`: API response types.
- Create `frontend/src/lib/api/performance-risk.ts`: typed API client.
- Create `frontend/src/lib/performance-risk.ts`: sorting, status label, and empty-state utilities.
- Create `frontend/src/lib/performance-risk.test.ts`: utility tests.
- Create `frontend/src/app/(app)/reports/performance-risk/page.tsx`: page container.
- Create `frontend/src/app/(app)/reports/performance-risk/_components/filter-bar.tsx`.
- Create `frontend/src/app/(app)/reports/performance-risk/_components/summary-cards.tsx`.
- Create `frontend/src/app/(app)/reports/performance-risk/_components/node-ranking-table.tsx`.
- Create `frontend/src/app/(app)/reports/performance-risk/_components/detail-panel.tsx`.
- Create `frontend/src/app/(app)/reports/performance-risk/_components/inherent-heatmap.tsx`.
- Modify `frontend/src/lib/app-navigation.ts`: breadcrumb entry.
- Modify `frontend/src/app/(app)/reports/page.tsx`: add a link card to the new dashboard.

---

### Task 1: Backend Domain DTOs And Metric Builder

**Files:**

- Create: `backend/internal/domain/entity/performance_risk.go`
- Create: `backend/internal/usecase/performancerisk/metrics.go`
- Create: `backend/internal/usecase/performancerisk/metrics_test.go`

- [ ] **Step 1: Write failing metric tests**

Create `backend/internal/usecase/performancerisk/metrics_test.go`:

```go
package performancerisk

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func strptr(value string) *string { return &value }

func TestBuildNodeMetricsUsesInherentScoreOnly(t *testing.T) {
	roID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	risks := []*entity.PerformanceRiskRiskRow{
		{
			ID:                uuid.MustParse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
			ROID:              &roID,
			Code:              "R-001",
			Title:             "Risiko inherent tinggi",
			OrganizationName:  "Unit A",
			Probability:       5,
			Impact:            4,
			InherentScore:      20,
			MitigationDueDates: []string{"2026-01-01"},
		},
		{
			ID:                uuid.MustParse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
			ROID:              &roID,
			Code:              "R-002",
			Title:             "Risiko inherent sedang",
			OrganizationName:  "Unit A",
			Probability:       2,
			Impact:            5,
			InherentScore:      10,
			MitigationDueDates: []string{"2026-12-31"},
		},
	}

	got := BuildNodeMetrics(risks, time.Date(2026, time.May, 24, 0, 0, 0, 0, time.UTC))

	if got.RiskCount != 2 {
		t.Fatalf("RiskCount = %d, want 2", got.RiskCount)
	}
	if got.TotalExposure != 30 {
		t.Fatalf("TotalExposure = %d, want 30", got.TotalExposure)
	}
	if got.AvgExposure != 15 {
		t.Fatalf("AvgExposure = %.2f, want 15", got.AvgExposure)
	}
	if got.HighestInherentScore != 20 {
		t.Fatalf("HighestInherentScore = %d, want 20", got.HighestInherentScore)
	}
	if got.HighestLevel != entity.RiskLevelSangatTinggi {
		t.Fatalf("HighestLevel = %q, want %q", got.HighestLevel, entity.RiskLevelSangatTinggi)
	}
	if got.HighExtremeCount != 1 {
		t.Fatalf("HighExtremeCount = %d, want 1", got.HighExtremeCount)
	}
	if got.Heatmap[4][3] != 1 {
		t.Fatalf("Heatmap[4][3] = %d, want 1", got.Heatmap[4][3])
	}
	if got.Heatmap[1][4] != 1 {
		t.Fatalf("Heatmap[1][4] = %d, want 1", got.Heatmap[1][4])
	}
	if got.AttentionStatus != entity.PerformanceRiskAttentionCritical {
		t.Fatalf("AttentionStatus = %q, want critical", got.AttentionStatus)
	}
}

func TestBuildNodeMetricsClassifiesNoRiskAndWatch(t *testing.T) {
	empty := BuildNodeMetrics(nil, time.Date(2026, time.May, 24, 0, 0, 0, 0, time.UTC))
	if empty.AttentionStatus != entity.PerformanceRiskAttentionNoRisk {
		t.Fatalf("empty AttentionStatus = %q, want no_risk", empty.AttentionStatus)
	}

	roID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	watch := BuildNodeMetrics([]*entity.PerformanceRiskRiskRow{
		{
			ID:                uuid.MustParse("cccccccc-cccc-cccc-cccc-cccccccccccc"),
			ROID:              &roID,
			Code:              "R-003",
			Title:             "Risiko overdue",
			OrganizationName:  "Unit B",
			Probability:       3,
			Impact:            3,
			InherentScore:      9,
			MitigationDueDates: []string{"2026-01-01"},
		},
	}, time.Date(2026, time.May, 24, 0, 0, 0, 0, time.UTC))

	if watch.AttentionStatus != entity.PerformanceRiskAttentionWatch {
		t.Fatalf("watch AttentionStatus = %q, want watch", watch.AttentionStatus)
	}
	if watch.MitigationOverdue != 1 {
		t.Fatalf("MitigationOverdue = %d, want 1", watch.MitigationOverdue)
	}
}

func TestBuildNodeMetricsCountsPendingMitigations(t *testing.T) {
	roID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	got := BuildNodeMetrics([]*entity.PerformanceRiskRiskRow{
		{
			ID:                uuid.MustParse("dddddddd-dddd-dddd-dddd-dddddddddddd"),
			ROID:              &roID,
			Code:              "R-004",
			Title:             "Risiko pending",
			OrganizationName:  "Unit C",
			Probability:       1,
			Impact:            2,
			InherentScore:      2,
			MitigationDueDates: []string{"2026-06-01", ""},
		},
	}, time.Date(2026, time.May, 24, 0, 0, 0, 0, time.UTC))

	if got.MitigationTotal != 1 {
		t.Fatalf("MitigationTotal = %d, want 1", got.MitigationTotal)
	}
	if got.MitigationPending != 1 {
		t.Fatalf("MitigationPending = %d, want 1", got.MitigationPending)
	}
	if got.MitigationOverdue != 0 {
		t.Fatalf("MitigationOverdue = %d, want 0", got.MitigationOverdue)
	}
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd backend
go test ./internal/usecase/performancerisk
```

Expected: FAIL because `backend/internal/domain/entity/performance_risk.go` and `BuildNodeMetrics` do not exist.

- [ ] **Step 3: Add domain DTOs**

Create `backend/internal/domain/entity/performance_risk.go`:

```go
package entity

import (
	"time"

	"github.com/google/uuid"
)

type PerformanceRiskAttentionStatus string

const (
	PerformanceRiskAttentionCritical PerformanceRiskAttentionStatus = "critical"
	PerformanceRiskAttentionWatch    PerformanceRiskAttentionStatus = "watch"
	PerformanceRiskAttentionStable   PerformanceRiskAttentionStatus = "stable"
	PerformanceRiskAttentionNoRisk   PerformanceRiskAttentionStatus = "no_risk"
)

type PerformanceRiskFilter struct {
	Period string
	OrgIDs []uuid.UUID
}

type PerformanceRiskPlanningNode struct {
	ROID          uuid.UUID `json:"roId"`
	ROTitle       string    `json:"roTitle"`
	KegiatanTitle string    `json:"kegiatanTitle"`
	ProgramTitle  string    `json:"programTitle"`
	IKUTitle      string    `json:"ikuTitle"`
	SasaranTitle  string    `json:"sasaranTitle"`
	TujuanTitle   string    `json:"tujuanTitle"`
	Period        string    `json:"period"`
}

type PerformanceRiskMetrics struct {
	RiskCount            int                            `json:"riskCount"`
	HighestInherentScore int                           `json:"highestInherentScore"`
	HighestLevel         string                        `json:"highestLevel"`
	TotalExposure        int                           `json:"totalExposure"`
	AvgExposure          float64                       `json:"avgExposure"`
	HighExtremeCount     int                           `json:"highExtremeCount"`
	Heatmap              [5][5]int                     `json:"heatmap"`
	MitigationTotal      int                           `json:"mitigationTotal"`
	MitigationPending    int                           `json:"mitigationPending"`
	MitigationOverdue    int                           `json:"mitigationOverdue"`
	AttentionStatus      PerformanceRiskAttentionStatus `json:"attentionStatus"`
}

type PerformanceRiskNode struct {
	PerformanceRiskPlanningNode
	PerformanceRiskMetrics
}

type PerformanceRiskSummary struct {
	Period              string `json:"period"`
	TotalRO             int    `json:"totalRO"`
	LinkedRO            int    `json:"linkedRO"`
	UnlinkedRO          int    `json:"unlinkedRO"`
	HighOrExtremeRO     int    `json:"highOrExtremeRO"`
	TotalRisks          int    `json:"totalRisks"`
	UnlinkedRisks       int    `json:"unlinkedRisks"`
	TotalMitigations    int    `json:"totalMitigations"`
	OverdueMitigations  int    `json:"overdueMitigations"`
}

type PerformanceRiskRiskRow struct {
	ID                uuid.UUID  `json:"id"`
	ROID              *uuid.UUID `json:"roId,omitempty"`
	Code              string     `json:"code"`
	Title             string     `json:"title"`
	OrganizationID    *uuid.UUID `json:"organizationId,omitempty"`
	OrganizationName  string     `json:"organizationName"`
	Probability       int        `json:"probability"`
	Impact            int        `json:"impact"`
	InherentScore      int        `json:"inherentScore"`
	Category          string     `json:"category"`
	Status            string     `json:"status"`
	AssessmentCycle   string     `json:"assessmentCycle"`
	MitigationDueDates []string   `json:"-"`
}

type PerformanceRiskMitigationRow struct {
	ID               uuid.UUID  `json:"id"`
	RiskID           uuid.UUID  `json:"riskId"`
	RiskCode         string     `json:"riskCode"`
	RiskTitle        string     `json:"riskTitle"`
	Action           string     `json:"action"`
	Owner            string     `json:"owner"`
	DueDate          *string    `json:"dueDate,omitempty"`
	Status           string     `json:"status"`
	OrganizationName string     `json:"organizationName"`
}

type PerformanceRiskUnitBreakdown struct {
	OrganizationID   *uuid.UUID `json:"organizationId,omitempty"`
	OrganizationName string     `json:"organizationName"`
	RiskCount        int        `json:"riskCount"`
	TotalExposure    int        `json:"totalExposure"`
	HighExtremeCount int        `json:"highExtremeCount"`
}

type PerformanceRiskDetail struct {
	Node        PerformanceRiskNode            `json:"node"`
	Risks       []*PerformanceRiskRiskRow       `json:"risks"`
	Mitigations []*PerformanceRiskMitigationRow `json:"mitigations"`
	Units       []PerformanceRiskUnitBreakdown  `json:"units"`
	GeneratedAt time.Time                       `json:"generatedAt"`
}
```

- [ ] **Step 4: Add metric builder**

Create `backend/internal/usecase/performancerisk/metrics.go`:

```go
package performancerisk

import (
	"math"
	"time"

	"github.com/manris/backend/internal/domain/entity"
)

func BuildNodeMetrics(risks []*entity.PerformanceRiskRiskRow, now time.Time) entity.PerformanceRiskMetrics {
	var out entity.PerformanceRiskMetrics
	if now.IsZero() {
		now = time.Now()
	}
	if len(risks) == 0 {
		out.AttentionStatus = entity.PerformanceRiskAttentionNoRisk
		return out
	}

	totalExposure := 0
	for _, risk := range risks {
		if risk == nil {
			continue
		}
		out.RiskCount++
		totalExposure += risk.InherentScore
		if risk.InherentScore > out.HighestInherentScore {
			out.HighestInherentScore = risk.InherentScore
		}
		level := entity.GetRiskLevelFromNilai(float64(risk.InherentScore))
		if level == entity.RiskLevelTinggi || level == entity.RiskLevelSangatTinggi {
			out.HighExtremeCount++
		}
		if risk.Probability >= 1 && risk.Probability <= 5 && risk.Impact >= 1 && risk.Impact <= 5 {
			out.Heatmap[risk.Probability-1][risk.Impact-1]++
		}
		for _, dueDate := range risk.MitigationDueDates {
			if dueDate == "" {
				continue
			}
			out.MitigationTotal++
			parsed, err := time.Parse("2006-01-02", dueDate)
			if err == nil && parsed.Before(truncateDate(now)) {
				out.MitigationOverdue++
			} else {
				out.MitigationPending++
			}
		}
	}

	out.TotalExposure = totalExposure
	if out.RiskCount > 0 {
		out.AvgExposure = math.Round((float64(totalExposure)/float64(out.RiskCount))*100) / 100
	}
	out.HighestLevel = entity.GetRiskLevelFromNilai(float64(out.HighestInherentScore))
	out.AttentionStatus = resolveAttentionStatus(out)
	return out
}

func resolveAttentionStatus(metrics entity.PerformanceRiskMetrics) entity.PerformanceRiskAttentionStatus {
	if metrics.RiskCount == 0 {
		return entity.PerformanceRiskAttentionNoRisk
	}
	if metrics.HighestLevel == entity.RiskLevelSangatTinggi {
		return entity.PerformanceRiskAttentionCritical
	}
	if metrics.HighestLevel == entity.RiskLevelTinggi && metrics.MitigationOverdue > 0 {
		return entity.PerformanceRiskAttentionCritical
	}
	if metrics.HighestLevel == entity.RiskLevelTinggi || metrics.MitigationOverdue > 0 {
		return entity.PerformanceRiskAttentionWatch
	}
	return entity.PerformanceRiskAttentionStable
}

func truncateDate(value time.Time) time.Time {
	y, m, d := value.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, value.Location())
}
```

- [ ] **Step 5: Run metric tests**

Run:

```bash
cd backend
go test ./internal/usecase/performancerisk
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add backend/internal/domain/entity/performance_risk.go backend/internal/usecase/performancerisk/metrics.go backend/internal/usecase/performancerisk/metrics_test.go
git commit -m "feat: add performance risk metrics"
```

---

### Task 2: Backend Repository Contract And PostgreSQL Queries

**Files:**

- Create: `backend/internal/domain/repository/performance_risk.go`
- Create: `backend/internal/repository/postgres/performance_risk.go`
- Modify: `backend/internal/repository/postgres/risk.go`
- Test: `backend/internal/usecase/performancerisk/usecases_test.go` in Task 3 covers repository contract through fake implementations.

- [ ] **Step 1: Add repository contract**

Create `backend/internal/domain/repository/performance_risk.go`:

```go
package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type PerformanceRiskRepository interface {
	ListPlanningNodes(ctx context.Context, filter entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskPlanningNode, error)
	ListRiskRows(ctx context.Context, filter entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskRiskRow, error)
	ListMitigationRowsByROID(ctx context.Context, roID uuid.UUID, filter entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskMitigationRow, error)
	ListUnlinkedRiskRows(ctx context.Context, filter entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskRiskRow, error)
}
```

- [ ] **Step 2: Add PostgreSQL repository implementation**

Create `backend/internal/repository/postgres/performance_risk.go`:

```go
package postgres

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type performanceRiskRepository struct {
	pool *pgxpool.Pool
}

func NewPerformanceRiskRepository(pool *pgxpool.Pool) repository.PerformanceRiskRepository {
	return &performanceRiskRepository{pool: pool}
}

func (r *performanceRiskRepository) ListPlanningNodes(ctx context.Context, filter entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskPlanningNode, error) {
	query := `
		SELECT ro.id, ro.title, act.title, prog.title, iku.title, obj.title, goal.title, ro.period
		FROM planning_ros ro
		JOIN planning_activities act ON act.id = ro.activity_id
		JOIN planning_programs prog ON prog.id = act.program_id
		JOIN planning_ikus iku ON iku.id = prog.iku_id
		JOIN planning_objectives obj ON obj.id = iku.objective_id
		JOIN planning_goals goal ON goal.id = obj.goal_id
		WHERE ro.period = $1
		  AND ro.freeze_status IN ('active', 'frozen')
	`
	args := []any{strings.TrimSpace(filter.Period)}
	if len(filter.OrgIDs) > 0 {
		query += `
		  AND (
		    ro.scope_mode = 'all_satker'
		    OR EXISTS (
		      SELECT 1
		      FROM planning_ro_scopes scope
		      LEFT JOIN organizations scoped_org ON scoped_org.id = ANY($2)
		      WHERE scope.ro_id = ro.id
		        AND (
		          scope.organization_id = ANY($2)
		          OR (scope.organization_category <> '' AND scope.organization_category = COALESCE(scoped_org.upr_level, ''))
		        )
		    )
		  )`
		args = append(args, uuidArrayToStrings(filter.OrgIDs))
	}
	query += ` ORDER BY goal.updated_at DESC, obj.sort_order, iku.sort_order, prog.sort_order, act.sort_order, ro.title`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list performance risk planning nodes: %w", err)
	}
	defer rows.Close()

	items := make([]*entity.PerformanceRiskPlanningNode, 0)
	for rows.Next() {
		item := &entity.PerformanceRiskPlanningNode{}
		if err := rows.Scan(&item.ROID, &item.ROTitle, &item.KegiatanTitle, &item.ProgramTitle, &item.IKUTitle, &item.SasaranTitle, &item.TujuanTitle, &item.Period); err != nil {
			return nil, fmt.Errorf("scan performance risk planning node: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate performance risk planning nodes: %w", err)
	}
	return items, nil
}

func (r *performanceRiskRepository) ListRiskRows(ctx context.Context, filter entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskRiskRow, error) {
	query := `
		SELECT r.id, r.ro_id, r.code, r.title, r.organization_id, COALESCE(o.name, ''),
		       r.probability, r.impact, r.inherent_score,
		       COALESCE(r.category, ''), r.status, COALESCE(r.assessment_cycle, ''),
		       COALESCE(array_remove(array_agg(mt.due_date::text ORDER BY mt.due_date), NULL), '{}') AS mitigation_due_dates
		FROM risks r
		LEFT JOIN organizations o ON o.id = r.organization_id
		LEFT JOIN mitigation_tasks mt ON mt.risk_id = r.id AND mt.status IN ('pending', 'overdue')
		WHERE r.assessment_cycle = $1
		  AND r.status = 'approved'
		  AND r.archived_at IS NULL
		  AND r.ro_id IS NOT NULL
	`
	args := []any{strings.TrimSpace(filter.Period)}
	if len(filter.OrgIDs) > 0 {
		query += fmt.Sprintf(" AND r.organization_id = ANY($%d)", len(args)+1)
		args = append(args, uuidArrayToStrings(filter.OrgIDs))
	}
	query += `
		GROUP BY r.id, r.ro_id, r.code, r.title, r.organization_id, o.name,
		         r.probability, r.impact, r.inherent_score, r.category, r.status, r.assessment_cycle
		ORDER BY COALESCE(o.name, ''), r.code, r.title`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list performance risk rows: %w", err)
	}
	defer rows.Close()

	items := make([]*entity.PerformanceRiskRiskRow, 0)
	for rows.Next() {
		item := &entity.PerformanceRiskRiskRow{}
		if err := rows.Scan(&item.ID, &item.ROID, &item.Code, &item.Title, &item.OrganizationID, &item.OrganizationName, &item.Probability, &item.Impact, &item.InherentScore, &item.Category, &item.Status, &item.AssessmentCycle, &item.MitigationDueDates); err != nil {
			return nil, fmt.Errorf("scan performance risk row: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate performance risk rows: %w", err)
	}
	return items, nil
}

func (r *performanceRiskRepository) ListMitigationRowsByROID(ctx context.Context, roID uuid.UUID, filter entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskMitigationRow, error) {
	query := `
		SELECT mt.id, mt.risk_id, r.code, r.title, COALESCE(m.action, ''), COALESCE(m.owner, ''),
		       mt.due_date::text, mt.status,
		       COALESCE(o.name, '')
		FROM mitigation_tasks mt
		JOIN risks r ON r.id = mt.risk_id
		LEFT JOIN mitigations m ON m.id = mt.mitigation_id
		LEFT JOIN organizations o ON o.id = r.organization_id
		WHERE r.ro_id = $1
		  AND r.assessment_cycle = $2
		  AND r.status = 'approved'
		  AND r.archived_at IS NULL
		  AND mt.status IN ('pending', 'overdue')
	`
	args := []any{roID, strings.TrimSpace(filter.Period)}
	if len(filter.OrgIDs) > 0 {
		query += fmt.Sprintf(" AND r.organization_id = ANY($%d)", len(args)+1)
		args = append(args, uuidArrayToStrings(filter.OrgIDs))
	}
	query += ` ORDER BY mt.due_date, r.code, m.action`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list performance risk mitigations: %w", err)
	}
	defer rows.Close()

	items := make([]*entity.PerformanceRiskMitigationRow, 0)
	for rows.Next() {
		item := &entity.PerformanceRiskMitigationRow{}
		if err := rows.Scan(&item.ID, &item.RiskID, &item.RiskCode, &item.RiskTitle, &item.Action, &item.Owner, &item.DueDate, &item.Status, &item.OrganizationName); err != nil {
			return nil, fmt.Errorf("scan performance risk mitigation: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate performance risk mitigations: %w", err)
	}
	return items, nil
}

func (r *performanceRiskRepository) ListUnlinkedRiskRows(ctx context.Context, filter entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskRiskRow, error) {
	query := `
		SELECT r.id, r.ro_id, r.code, r.title, r.organization_id, COALESCE(o.name, ''),
		       r.probability, r.impact, r.inherent_score,
		       COALESCE(r.category, ''), r.status, COALESCE(r.assessment_cycle, ''),
		       '{}'::text[] AS mitigation_due_dates
		FROM risks r
		LEFT JOIN organizations o ON o.id = r.organization_id
		WHERE r.assessment_cycle = $1
		  AND r.status = 'approved'
		  AND r.archived_at IS NULL
		  AND r.ro_id IS NULL
	`
	args := []any{strings.TrimSpace(filter.Period)}
	if len(filter.OrgIDs) > 0 {
		query += fmt.Sprintf(" AND r.organization_id = ANY($%d)", len(args)+1)
		args = append(args, uuidArrayToStrings(filter.OrgIDs))
	}
	query += ` ORDER BY COALESCE(o.name, ''), r.code, r.title`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list performance risk unlinked risks: %w", err)
	}
	defer rows.Close()

	items := make([]*entity.PerformanceRiskRiskRow, 0)
	for rows.Next() {
		item := &entity.PerformanceRiskRiskRow{}
		if err := rows.Scan(&item.ID, &item.ROID, &item.Code, &item.Title, &item.OrganizationID, &item.OrganizationName, &item.Probability, &item.Impact, &item.InherentScore, &item.Category, &item.Status, &item.AssessmentCycle, &item.MitigationDueDates); err != nil {
			return nil, fmt.Errorf("scan performance risk unlinked risk: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate performance risk unlinked risks: %w", err)
	}
	return items, nil
}
```

- [ ] **Step 3: Preserve `ro_id` in cycle snapshot query**

Modify `backend/internal/repository/postgres/risk.go` inside `ListCycleSnapshot`.

In the `SELECT` list, change:

```sql
r.organization_id, r.created_by, r.objective_id, r.likelihood_assessment_id
```

to:

```sql
r.organization_id, r.created_by, r.objective_id, r.ro_id, r.likelihood_assessment_id
```

In the `rows.Scan` call, change:

```go
&risk.OrganizationID, &risk.CreatedBy, &risk.ObjectiveID, &risk.LikelihoodAssessmentID
```

to:

```go
&risk.OrganizationID, &risk.CreatedBy, &risk.ObjectiveID, &risk.ROID, &risk.LikelihoodAssessmentID
```

- [ ] **Step 4: Run backend package tests that compile repository contracts**

Run:

```bash
cd backend
go test ./internal/domain/... ./internal/repository/postgres/...
```

Expected: PASS. If the local database is required for repository tests and unavailable, record the database connection failure and still run `go test ./internal/domain/...`.

- [ ] **Step 5: Commit**

Run:

```bash
git add backend/internal/domain/repository/performance_risk.go backend/internal/repository/postgres/performance_risk.go backend/internal/repository/postgres/risk.go
git commit -m "feat: add performance risk repository"
```

---

### Task 3: Backend Usecases

**Files:**

- Create: `backend/internal/usecase/performancerisk/usecases.go`
- Create: `backend/internal/usecase/performancerisk/usecases_test.go`

- [ ] **Step 1: Write failing usecase tests**

Create `backend/internal/usecase/performancerisk/usecases_test.go`:

```go
package performancerisk

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type fakePerformanceRiskRepo struct {
	nodes       []*entity.PerformanceRiskPlanningNode
	risks       []*entity.PerformanceRiskRiskRow
	mitigations []*entity.PerformanceRiskMitigationRow
	unlinked    []*entity.PerformanceRiskRiskRow
}

func (f fakePerformanceRiskRepo) ListPlanningNodes(context.Context, entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskPlanningNode, error) {
	return f.nodes, nil
}

func (f fakePerformanceRiskRepo) ListRiskRows(context.Context, entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskRiskRow, error) {
	return f.risks, nil
}

func (f fakePerformanceRiskRepo) ListMitigationRowsByROID(context.Context, uuid.UUID, entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskMitigationRow, error) {
	return f.mitigations, nil
}

func (f fakePerformanceRiskRepo) ListUnlinkedRiskRows(context.Context, entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskRiskRow, error) {
	return f.unlinked, nil
}

func TestListNodesIncludesROWithoutRiskAndSortsExposure(t *testing.T) {
	roA := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	roB := uuid.MustParse("22222222-2222-2222-2222-222222222222")
	repo := fakePerformanceRiskRepo{
		nodes: []*entity.PerformanceRiskPlanningNode{
			{ROID: roA, ROTitle: "RO A", Period: "2026-H1"},
			{ROID: roB, ROTitle: "RO B", Period: "2026-H1"},
		},
		risks: []*entity.PerformanceRiskRiskRow{
			{ID: uuid.New(), ROID: &roB, Code: "R-2", Title: "Risk B", Probability: 5, Impact: 4, InherentScore: 20},
			{ID: uuid.New(), ROID: &roA, Code: "R-1", Title: "Risk A", Probability: 3, Impact: 3, InherentScore: 9},
		},
	}

	uc := NewPlanningMapUseCase(repo)
	got, err := uc.Execute(context.Background(), Input{Period: "2026-H1"})
	if err != nil {
		t.Fatalf("Execute error = %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("len(got) = %d, want 2", len(got))
	}
	if got[0].ROID != roB {
		t.Fatalf("first RO = %s, want %s", got[0].ROID, roB)
	}
	if got[1].RiskCount != 1 {
		t.Fatalf("RO A RiskCount = %d, want 1", got[1].RiskCount)
	}
}

func TestSummaryCountsLinkedUnlinkedAndOverdue(t *testing.T) {
	roA := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	roB := uuid.MustParse("22222222-2222-2222-2222-222222222222")
	repo := fakePerformanceRiskRepo{
		nodes: []*entity.PerformanceRiskPlanningNode{
			{ROID: roA, ROTitle: "RO A", Period: "2026-H1"},
			{ROID: roB, ROTitle: "RO B", Period: "2026-H1"},
		},
		risks: []*entity.PerformanceRiskRiskRow{
			{ID: uuid.New(), ROID: &roA, Code: "R-1", Title: "Risk A", Probability: 5, Impact: 4, InherentScore: 20, MitigationDueDates: []string{"2026-01-01"}},
		},
		unlinked: []*entity.PerformanceRiskRiskRow{
			{ID: uuid.New(), Code: "R-X", Title: "Risk tanpa RO", Probability: 3, Impact: 3, InherentScore: 9},
		},
	}

	uc := NewSummaryUseCase(repo)
	got, err := uc.Execute(context.Background(), Input{Period: "2026-H1"})
	if err != nil {
		t.Fatalf("Execute error = %v", err)
	}
	if got.TotalRO != 2 || got.LinkedRO != 1 || got.UnlinkedRO != 1 {
		t.Fatalf("RO counts = total %d linked %d unlinked %d, want 2/1/1", got.TotalRO, got.LinkedRO, got.UnlinkedRO)
	}
	if got.TotalRisks != 2 {
		t.Fatalf("TotalRisks = %d, want 2", got.TotalRisks)
	}
	if got.UnlinkedRisks != 1 {
		t.Fatalf("UnlinkedRisks = %d, want 1", got.UnlinkedRisks)
	}
	if got.OverdueMitigations != 1 {
		t.Fatalf("OverdueMitigations = %d, want 1", got.OverdueMitigations)
	}
}

func TestDetailReturnsOnlySelectedRORisksAndUnitBreakdown(t *testing.T) {
	roA := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	roB := uuid.MustParse("22222222-2222-2222-2222-222222222222")
	orgA := uuid.MustParse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
	repo := fakePerformanceRiskRepo{
		nodes: []*entity.PerformanceRiskPlanningNode{
			{ROID: roA, ROTitle: "RO A", Period: "2026-H1"},
		},
		risks: []*entity.PerformanceRiskRiskRow{
			{ID: uuid.New(), ROID: &roA, Code: "R-1", Title: "Risk A", OrganizationID: &orgA, OrganizationName: "Unit A", Probability: 5, Impact: 4, InherentScore: 20},
			{ID: uuid.New(), ROID: &roB, Code: "R-2", Title: "Risk B", OrganizationName: "Unit B", Probability: 3, Impact: 3, InherentScore: 9},
		},
		mitigations: []*entity.PerformanceRiskMitigationRow{
			{ID: uuid.New(), RiskCode: "R-1", Action: "Mitigasi", Status: "pending", OrganizationName: "Unit A"},
		},
	}

	uc := NewDetailUseCase(repo)
	got, err := uc.Execute(context.Background(), DetailInput{Input: Input{Period: "2026-H1"}, ROID: roA})
	if err != nil {
		t.Fatalf("Execute error = %v", err)
	}
	if got.Node.ROID != roA {
		t.Fatalf("Node ROID = %s, want %s", got.Node.ROID, roA)
	}
	if len(got.Risks) != 1 || got.Risks[0].Code != "R-1" {
		t.Fatalf("Risks = %#v, want only R-1", got.Risks)
	}
	if len(got.Mitigations) != 1 {
		t.Fatalf("Mitigations len = %d, want 1", len(got.Mitigations))
	}
	if len(got.Units) != 1 || got.Units[0].OrganizationName != "Unit A" {
		t.Fatalf("Units = %#v, want Unit A", got.Units)
	}
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd backend
go test ./internal/usecase/performancerisk
```

Expected: FAIL because usecase constructors and input types do not exist.

- [ ] **Step 3: Implement usecases**

Create `backend/internal/usecase/performancerisk/usecases.go`:

```go
package performancerisk

import (
	"context"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type Input struct {
	Period string
	OrgIDs []uuid.UUID
}

type DetailInput struct {
	Input
	ROID uuid.UUID
}

type SummaryUseCase struct {
	repo repository.PerformanceRiskRepository
	now  func() time.Time
}

type PlanningMapUseCase struct {
	repo repository.PerformanceRiskRepository
	now  func() time.Time
}

type DetailUseCase struct {
	repo repository.PerformanceRiskRepository
	now  func() time.Time
}

type UnlinkedUseCase struct {
	repo repository.PerformanceRiskRepository
}

func NewSummaryUseCase(repo repository.PerformanceRiskRepository) *SummaryUseCase {
	return &SummaryUseCase{repo: repo, now: time.Now}
}

func NewPlanningMapUseCase(repo repository.PerformanceRiskRepository) *PlanningMapUseCase {
	return &PlanningMapUseCase{repo: repo, now: time.Now}
}

func NewDetailUseCase(repo repository.PerformanceRiskRepository) *DetailUseCase {
	return &DetailUseCase{repo: repo, now: time.Now}
}

func NewUnlinkedUseCase(repo repository.PerformanceRiskRepository) *UnlinkedUseCase {
	return &UnlinkedUseCase{repo: repo}
}

func (uc *SummaryUseCase) Execute(ctx context.Context, input Input) (*entity.PerformanceRiskSummary, error) {
	filter, err := buildFilter(input)
	if err != nil {
		return nil, err
	}
	nodes, err := uc.repo.ListPlanningNodes(ctx, filter)
	if err != nil {
		return nil, errors.Wrap(err, "failed to list performance risk planning nodes")
	}
	risks, err := uc.repo.ListRiskRows(ctx, filter)
	if err != nil {
		return nil, errors.Wrap(err, "failed to list performance risk rows")
	}
	unlinked, err := uc.repo.ListUnlinkedRiskRows(ctx, filter)
	if err != nil {
		return nil, errors.Wrap(err, "failed to list unlinked performance risks")
	}

	byRO := groupRisksByRO(risks)
	out := &entity.PerformanceRiskSummary{
		Period:        filter.Period,
		TotalRO:       len(nodes),
		TotalRisks:    len(risks) + len(unlinked),
		UnlinkedRisks: len(unlinked),
	}
	for _, node := range nodes {
		if node == nil {
			continue
		}
		metrics := BuildNodeMetrics(byRO[node.ROID], uc.now())
		if metrics.RiskCount > 0 {
			out.LinkedRO++
		} else {
			out.UnlinkedRO++
		}
		if metrics.HighExtremeCount > 0 {
			out.HighOrExtremeRO++
		}
		out.TotalMitigations += metrics.MitigationTotal
		out.OverdueMitigations += metrics.MitigationOverdue
	}
	return out, nil
}

func (uc *PlanningMapUseCase) Execute(ctx context.Context, input Input) ([]*entity.PerformanceRiskNode, error) {
	filter, err := buildFilter(input)
	if err != nil {
		return nil, err
	}
	nodes, err := uc.repo.ListPlanningNodes(ctx, filter)
	if err != nil {
		return nil, errors.Wrap(err, "failed to list performance risk planning nodes")
	}
	risks, err := uc.repo.ListRiskRows(ctx, filter)
	if err != nil {
		return nil, errors.Wrap(err, "failed to list performance risk rows")
	}
	byRO := groupRisksByRO(risks)

	out := make([]*entity.PerformanceRiskNode, 0, len(nodes))
	for _, node := range nodes {
		if node == nil {
			continue
		}
		out = append(out, &entity.PerformanceRiskNode{
			PerformanceRiskPlanningNode: *node,
			PerformanceRiskMetrics:      BuildNodeMetrics(byRO[node.ROID], uc.now()),
		})
	}
	sort.Slice(out, func(i, j int) bool {
		left := out[i]
		right := out[j]
		if left.TotalExposure != right.TotalExposure {
			return left.TotalExposure > right.TotalExposure
		}
		if left.HighExtremeCount != right.HighExtremeCount {
			return left.HighExtremeCount > right.HighExtremeCount
		}
		if left.MitigationOverdue != right.MitigationOverdue {
			return left.MitigationOverdue > right.MitigationOverdue
		}
		return left.ROTitle < right.ROTitle
	})
	return out, nil
}

func (uc *DetailUseCase) Execute(ctx context.Context, input DetailInput) (*entity.PerformanceRiskDetail, error) {
	if input.ROID == uuid.Nil {
		return nil, errors.ErrInvalidInput
	}
	filter, err := buildFilter(input.Input)
	if err != nil {
		return nil, err
	}
	nodes, err := uc.repo.ListPlanningNodes(ctx, filter)
	if err != nil {
		return nil, errors.Wrap(err, "failed to list performance risk planning nodes")
	}
	var selected *entity.PerformanceRiskPlanningNode
	for _, node := range nodes {
		if node != nil && node.ROID == input.ROID {
			selected = node
			break
		}
	}
	if selected == nil {
		return nil, errors.ErrNotFound
	}

	allRisks, err := uc.repo.ListRiskRows(ctx, filter)
	if err != nil {
		return nil, errors.Wrap(err, "failed to list performance risk rows")
	}
	risks := filterRisksByRO(allRisks, input.ROID)
	mitigations, err := uc.repo.ListMitigationRowsByROID(ctx, input.ROID, filter)
	if err != nil {
		return nil, errors.Wrap(err, "failed to list performance risk mitigations")
	}

	return &entity.PerformanceRiskDetail{
		Node: entity.PerformanceRiskNode{
			PerformanceRiskPlanningNode: *selected,
			PerformanceRiskMetrics:      BuildNodeMetrics(risks, uc.now()),
		},
		Risks:       risks,
		Mitigations: mitigations,
		Units:       buildUnitBreakdown(risks),
		GeneratedAt: uc.now(),
	}, nil
}

func (uc *UnlinkedUseCase) Execute(ctx context.Context, input Input) ([]*entity.PerformanceRiskRiskRow, error) {
	filter, err := buildFilter(input)
	if err != nil {
		return nil, err
	}
	items, err := uc.repo.ListUnlinkedRiskRows(ctx, filter)
	if err != nil {
		return nil, errors.Wrap(err, "failed to list unlinked performance risks")
	}
	return items, nil
}

func buildFilter(input Input) (entity.PerformanceRiskFilter, error) {
	period := strings.TrimSpace(input.Period)
	if period == "" {
		return entity.PerformanceRiskFilter{}, errors.ErrInvalidInput
	}
	return entity.PerformanceRiskFilter{Period: period, OrgIDs: input.OrgIDs}, nil
}

func groupRisksByRO(risks []*entity.PerformanceRiskRiskRow) map[uuid.UUID][]*entity.PerformanceRiskRiskRow {
	out := make(map[uuid.UUID][]*entity.PerformanceRiskRiskRow)
	for _, risk := range risks {
		if risk == nil || risk.ROID == nil {
			continue
		}
		out[*risk.ROID] = append(out[*risk.ROID], risk)
	}
	return out
}

func filterRisksByRO(risks []*entity.PerformanceRiskRiskRow, roID uuid.UUID) []*entity.PerformanceRiskRiskRow {
	out := make([]*entity.PerformanceRiskRiskRow, 0)
	for _, risk := range risks {
		if risk != nil && risk.ROID != nil && *risk.ROID == roID {
			out = append(out, risk)
		}
	}
	return out
}

func buildUnitBreakdown(risks []*entity.PerformanceRiskRiskRow) []entity.PerformanceRiskUnitBreakdown {
	byOrg := make(map[string]*entity.PerformanceRiskUnitBreakdown)
	for _, risk := range risks {
		if risk == nil {
			continue
		}
		key := risk.OrganizationName
		if risk.OrganizationID != nil {
			key = risk.OrganizationID.String()
		}
		row := byOrg[key]
		if row == nil {
			row = &entity.PerformanceRiskUnitBreakdown{
				OrganizationID:   risk.OrganizationID,
				OrganizationName: risk.OrganizationName,
			}
			byOrg[key] = row
		}
		row.RiskCount++
		row.TotalExposure += risk.InherentScore
		level := entity.GetRiskLevelFromNilai(float64(risk.InherentScore))
		if level == entity.RiskLevelTinggi || level == entity.RiskLevelSangatTinggi {
			row.HighExtremeCount++
		}
	}
	out := make([]entity.PerformanceRiskUnitBreakdown, 0, len(byOrg))
	for _, row := range byOrg {
		out = append(out, *row)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].TotalExposure != out[j].TotalExposure {
			return out[i].TotalExposure > out[j].TotalExposure
		}
		return out[i].OrganizationName < out[j].OrganizationName
	})
	return out
}
```

- [ ] **Step 4: Run usecase tests**

Run:

```bash
cd backend
go test ./internal/usecase/performancerisk
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add backend/internal/usecase/performancerisk/usecases.go backend/internal/usecase/performancerisk/usecases_test.go
git commit -m "feat: add performance risk usecases"
```

---

### Task 4: Backend HTTP Handler, Bootstrap, And Routes

**Files:**

- Create: `backend/internal/handler/http/performance_risk.go`
- Create: `backend/internal/handler/http/performance_risk_test.go`
- Modify: `backend/internal/bootstrap/bootstrap.go`
- Modify: `backend/cmd/server/main.go`

- [ ] **Step 1: Write failing handler test**

Create `backend/internal/handler/http/performance_risk_test.go`:

```go
package http

import (
	"context"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	performanceriskuc "github.com/manris/backend/internal/usecase/performancerisk"
)

func TestPerformanceRiskHandlerRejectsMissingPeriod(t *testing.T) {
	handler := NewPerformanceRiskHandler(
		performanceriskuc.NewSummaryUseCase(fakePerformanceRiskRepo{}),
		performanceriskuc.NewPlanningMapUseCase(fakePerformanceRiskRepo{}),
		performanceriskuc.NewDetailUseCase(fakePerformanceRiskRepo{}),
		performanceriskuc.NewUnlinkedUseCase(fakePerformanceRiskRepo{}),
	)

	app := fiber.New()
	app.Get("/summary", handler.Summary)

	resp, err := app.Test(httptest.NewRequest("GET", "/summary", nil))
	if err != nil {
		t.Fatalf("app.Test error = %v", err)
	}
	if resp.StatusCode != 400 {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}

type fakePerformanceRiskRepo struct{}

func (fakePerformanceRiskRepo) ListPlanningNodes(ctx context.Context, filter entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskPlanningNode, error) {
	roID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	return []*entity.PerformanceRiskPlanningNode{{ROID: roID, ROTitle: "RO A", Period: filter.Period}}, nil
}

func (fakePerformanceRiskRepo) ListRiskRows(context.Context, entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskRiskRow, error) {
	return nil, nil
}

func (fakePerformanceRiskRepo) ListMitigationRowsByROID(context.Context, uuid.UUID, entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskMitigationRow, error) {
	return nil, nil
}

func (fakePerformanceRiskRepo) ListUnlinkedRiskRows(context.Context, entity.PerformanceRiskFilter) ([]*entity.PerformanceRiskRiskRow, error) {
	return nil, nil
}
```

- [ ] **Step 2: Run handler test to verify it fails**

Run:

```bash
cd backend
go test ./internal/handler/http -run TestPerformanceRiskHandlerRejectsMissingPeriod
```

Expected: FAIL because `NewPerformanceRiskHandler` does not exist.

- [ ] **Step 3: Implement handler**

Create `backend/internal/handler/http/performance_risk.go`:

```go
package http

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/middleware"
	performanceriskuc "github.com/manris/backend/internal/usecase/performancerisk"
)

type PerformanceRiskHandler struct {
	summaryUC  *performanceriskuc.SummaryUseCase
	nodesUC    *performanceriskuc.PlanningMapUseCase
	detailUC   *performanceriskuc.DetailUseCase
	unlinkedUC *performanceriskuc.UnlinkedUseCase
}

func NewPerformanceRiskHandler(
	summaryUC *performanceriskuc.SummaryUseCase,
	nodesUC *performanceriskuc.PlanningMapUseCase,
	detailUC *performanceriskuc.DetailUseCase,
	unlinkedUC *performanceriskuc.UnlinkedUseCase,
) *PerformanceRiskHandler {
	return &PerformanceRiskHandler{
		summaryUC:  summaryUC,
		nodesUC:    nodesUC,
		detailUC:   detailUC,
		unlinkedUC: unlinkedUC,
	}
}

func (h *PerformanceRiskHandler) Summary(c *fiber.Ctx) error {
	input, ok := h.parseInput(c)
	if !ok {
		return nil
	}
	result, err := h.summaryUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}

func (h *PerformanceRiskHandler) Nodes(c *fiber.Ctx) error {
	input, ok := h.parseInput(c)
	if !ok {
		return nil
	}
	result, err := h.nodesUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}

func (h *PerformanceRiskHandler) Detail(c *fiber.Ctx) error {
	input, ok := h.parseInput(c)
	if !ok {
		return nil
	}
	roID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid RO ID")
	}
	result, err := h.detailUC.Execute(c.Context(), performanceriskuc.DetailInput{Input: input, ROID: roID})
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}

func (h *PerformanceRiskHandler) UnlinkedRisks(c *fiber.Ctx) error {
	input, ok := h.parseInput(c)
	if !ok {
		return nil
	}
	result, err := h.unlinkedUC.Execute(c.Context(), input)
	if err != nil {
		return handleError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}

func (h *PerformanceRiskHandler) parseInput(c *fiber.Ctx) (performanceriskuc.Input, bool) {
	period := c.Query("period")
	if period == "" {
		_ = sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "period query parameter is required")
		return performanceriskuc.Input{}, false
	}
	scope := middleware.GetAccessScope(c)
	orgIDs, err := resolveReportOrgIDs(scope, c.Query("org_id"))
	if err != nil {
		if errors.Is(err, domainerrors.ErrForbidden) {
			_ = sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "organization not accessible")
			return performanceriskuc.Input{}, false
		}
		_ = sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
		return performanceriskuc.Input{}, false
	}
	return performanceriskuc.Input{Period: period, OrgIDs: orgIDs}, true
}
```

- [ ] **Step 4: Fix handler test import block**

Ensure `backend/internal/handler/http/performance_risk_test.go` has this import block:

```go
import (
	"context"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	performanceriskuc "github.com/manris/backend/internal/usecase/performancerisk"
)
```

- [ ] **Step 5: Wire bootstrap**

Modify `backend/internal/bootstrap/bootstrap.go`.

Add import:

```go
performanceriskuc "github.com/manris/backend/internal/usecase/performancerisk"
```

Add repository field:

```go
PerformanceRiskRepository domainrepo.PerformanceRiskRepository
```

Add usecase fields near report usecases:

```go
PerformanceRiskSummaryUC  *performanceriskuc.SummaryUseCase
PerformanceRiskNodesUC    *performanceriskuc.PlanningMapUseCase
PerformanceRiskDetailUC   *performanceriskuc.DetailUseCase
PerformanceRiskUnlinkedUC *performanceriskuc.UnlinkedUseCase
```

Initialize repository in `Build`:

```go
c.PerformanceRiskRepository = postgresrepo.NewPerformanceRiskRepository(pool)
```

Initialize usecases near report usecases:

```go
c.PerformanceRiskSummaryUC = performanceriskuc.NewSummaryUseCase(c.PerformanceRiskRepository)
c.PerformanceRiskNodesUC = performanceriskuc.NewPlanningMapUseCase(c.PerformanceRiskRepository)
c.PerformanceRiskDetailUC = performanceriskuc.NewDetailUseCase(c.PerformanceRiskRepository)
c.PerformanceRiskUnlinkedUC = performanceriskuc.NewUnlinkedUseCase(c.PerformanceRiskRepository)
```

- [ ] **Step 6: Wire routes**

Modify `backend/cmd/server/main.go`.

Create handler after `cleanReportHandler`:

```go
performanceRiskHandler := httpHandler.NewPerformanceRiskHandler(
	container.PerformanceRiskSummaryUC,
	container.PerformanceRiskNodesUC,
	container.PerformanceRiskDetailUC,
	container.PerformanceRiskUnlinkedUC,
)
```

Register routes under the Reports section:

```go
protected.Get("/reports/performance-risk/summary", performanceRiskHandler.Summary)
protected.Get("/reports/performance-risk/nodes", performanceRiskHandler.Nodes)
protected.Get("/reports/performance-risk/nodes/:id", performanceRiskHandler.Detail)
protected.Get("/reports/performance-risk/unlinked-risks", performanceRiskHandler.UnlinkedRisks)
```

- [ ] **Step 7: Run backend tests**

Run:

```bash
cd backend
go test ./internal/usecase/performancerisk ./internal/handler/http
```

Expected: PASS.

- [ ] **Step 8: Compile server**

Run:

```bash
cd backend
go test ./...
```

Expected: PASS. If a pre-existing unrelated test fails, capture the exact failing package and rerun the performance-risk packages from Step 7 to confirm this feature's packages pass.

- [ ] **Step 9: Commit**

Run:

```bash
git add backend/internal/handler/http/performance_risk.go backend/internal/handler/http/performance_risk_test.go backend/internal/bootstrap/bootstrap.go backend/cmd/server/main.go
git commit -m "feat: expose performance risk endpoints"
```

---

### Task 5: Frontend Types, API Client, And Utilities

**Files:**

- Create: `frontend/src/types/performance-risk.ts`
- Create: `frontend/src/lib/api/performance-risk.ts`
- Create: `frontend/src/lib/performance-risk.ts`
- Create: `frontend/src/lib/performance-risk.test.ts`

- [ ] **Step 1: Write failing utility tests**

Create `frontend/src/lib/performance-risk.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyPerformanceRiskEmptyState,
  sortPerformanceRiskNodes,
  statusLabelForPerformanceRisk,
} from "./performance-risk.ts";
import type { PerformanceRiskNode } from "../types/performance-risk";

function node(overrides: Partial<PerformanceRiskNode>): PerformanceRiskNode {
  return {
    roId: "ro-default",
    roTitle: "RO Default",
    kegiatanTitle: "",
    programTitle: "",
    ikuTitle: "",
    sasaranTitle: "",
    tujuanTitle: "",
    period: "2026-H1",
    riskCount: 0,
    highestInherentScore: 0,
    highestLevel: "",
    totalExposure: 0,
    avgExposure: 0,
    highExtremeCount: 0,
    heatmap: [],
    mitigationTotal: 0,
    mitigationPending: 0,
    mitigationOverdue: 0,
    attentionStatus: "no_risk",
    ...overrides,
  };
}

test("sortPerformanceRiskNodes sorts by exposure, high/extreme count, overdue, title", () => {
  const sorted = sortPerformanceRiskNodes([
    node({ roId: "a", roTitle: "A", totalExposure: 10, highExtremeCount: 0, mitigationOverdue: 0 }),
    node({ roId: "b", roTitle: "B", totalExposure: 20, highExtremeCount: 1, mitigationOverdue: 0 }),
    node({ roId: "c", roTitle: "C", totalExposure: 20, highExtremeCount: 0, mitigationOverdue: 5 }),
  ]);

  assert.deepEqual(sorted.map((item) => item.roId), ["b", "c", "a"]);
});

test("statusLabelForPerformanceRisk maps attention statuses", () => {
  assert.equal(statusLabelForPerformanceRisk("critical"), "Kritis");
  assert.equal(statusLabelForPerformanceRisk("watch"), "Perlu Pantauan");
  assert.equal(statusLabelForPerformanceRisk("stable"), "Stabil");
  assert.equal(statusLabelForPerformanceRisk("no_risk"), "Belum Ada Risiko");
});

test("classifyPerformanceRiskEmptyState separates no planning and no linked risk", () => {
  assert.equal(classifyPerformanceRiskEmptyState({ totalRO: 0, totalRisks: 0, unlinkedRisks: 0 }), "no_planning");
  assert.equal(classifyPerformanceRiskEmptyState({ totalRO: 2, totalRisks: 0, unlinkedRisks: 0 }), "no_linked_risk");
  assert.equal(classifyPerformanceRiskEmptyState({ totalRO: 2, totalRisks: 1, unlinkedRisks: 1 }), "has_unlinked_risk");
  assert.equal(classifyPerformanceRiskEmptyState({ totalRO: 2, totalRisks: 2, unlinkedRisks: 0 }), "ready");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd frontend
node --test --import tsx src/lib/performance-risk.test.ts
```

Expected: FAIL because types and utilities do not exist.

- [ ] **Step 3: Add frontend types**

Create `frontend/src/types/performance-risk.ts`:

```ts
export type PerformanceRiskAttentionStatus = "critical" | "watch" | "stable" | "no_risk";

export interface PerformanceRiskSummary {
  period: string;
  totalRO: number;
  linkedRO: number;
  unlinkedRO: number;
  highOrExtremeRO: number;
  totalRisks: number;
  unlinkedRisks: number;
  totalMitigations: number;
  overdueMitigations: number;
}

export interface PerformanceRiskNode {
  roId: string;
  roTitle: string;
  kegiatanTitle: string;
  programTitle: string;
  ikuTitle: string;
  sasaranTitle: string;
  tujuanTitle: string;
  period: string;
  riskCount: number;
  highestInherentScore: number;
  highestLevel: string;
  totalExposure: number;
  avgExposure: number;
  highExtremeCount: number;
  heatmap: number[][];
  mitigationTotal: number;
  mitigationPending: number;
  mitigationOverdue: number;
  attentionStatus: PerformanceRiskAttentionStatus;
}

export interface PerformanceRiskRiskRow {
  id: string;
  roId?: string;
  code: string;
  title: string;
  organizationId?: string;
  organizationName: string;
  probability: number;
  impact: number;
  inherentScore: number;
  category: string;
  status: string;
  assessmentCycle: string;
}

export interface PerformanceRiskMitigationRow {
  id: string;
  riskId: string;
  riskCode: string;
  riskTitle: string;
  action: string;
  owner: string;
  dueDate?: string;
  status: "pending" | "overdue" | string;
  organizationName: string;
}

export interface PerformanceRiskUnitBreakdown {
  organizationId?: string;
  organizationName: string;
  riskCount: number;
  totalExposure: number;
  highExtremeCount: number;
}

export interface PerformanceRiskDetail {
  node: PerformanceRiskNode;
  risks: PerformanceRiskRiskRow[];
  mitigations: PerformanceRiskMitigationRow[];
  units: PerformanceRiskUnitBreakdown[];
  generatedAt: string;
}

export interface PerformanceRiskQuery {
  period: string;
  orgId?: string;
}
```

- [ ] **Step 4: Add API client**

Create `frontend/src/lib/api/performance-risk.ts`:

```ts
import { api } from "@/lib/api";
import type {
  PerformanceRiskDetail,
  PerformanceRiskNode,
  PerformanceRiskQuery,
  PerformanceRiskRiskRow,
  PerformanceRiskSummary,
} from "@/types/performance-risk";

function buildPerformanceRiskQuery(params: PerformanceRiskQuery) {
  const searchParams = new URLSearchParams();
  searchParams.set("period", params.period);
  if (params.orgId) {
    searchParams.set("org_id", params.orgId);
  }
  return searchParams.toString();
}

export async function getPerformanceRiskSummary(
  token: string,
  params: PerformanceRiskQuery,
): Promise<PerformanceRiskSummary> {
  const qs = buildPerformanceRiskQuery(params);
  return api.get<PerformanceRiskSummary>(`/reports/performance-risk/summary?${qs}`, token);
}

export async function listPerformanceRiskNodes(
  token: string,
  params: PerformanceRiskQuery,
): Promise<PerformanceRiskNode[]> {
  const qs = buildPerformanceRiskQuery(params);
  return api.get<PerformanceRiskNode[]>(`/reports/performance-risk/nodes?${qs}`, token);
}

export async function getPerformanceRiskDetail(
  token: string,
  roId: string,
  params: PerformanceRiskQuery,
): Promise<PerformanceRiskDetail> {
  const qs = buildPerformanceRiskQuery(params);
  return api.get<PerformanceRiskDetail>(`/reports/performance-risk/nodes/${roId}?${qs}`, token);
}

export async function listPerformanceRiskUnlinkedRisks(
  token: string,
  params: PerformanceRiskQuery,
): Promise<PerformanceRiskRiskRow[]> {
  const qs = buildPerformanceRiskQuery(params);
  return api.get<PerformanceRiskRiskRow[]>(`/reports/performance-risk/unlinked-risks?${qs}`, token);
}

export { buildPerformanceRiskQuery };
```

- [ ] **Step 5: Add utilities**

Create `frontend/src/lib/performance-risk.ts`:

```ts
import type {
  PerformanceRiskAttentionStatus,
  PerformanceRiskNode,
} from "@/types/performance-risk";

export type PerformanceRiskEmptyState =
  | "no_planning"
  | "no_linked_risk"
  | "has_unlinked_risk"
  | "ready";

export function sortPerformanceRiskNodes(nodes: PerformanceRiskNode[]) {
  return [...nodes].sort(
    (left, right) =>
      right.totalExposure - left.totalExposure ||
      right.highExtremeCount - left.highExtremeCount ||
      right.mitigationOverdue - left.mitigationOverdue ||
      left.roTitle.localeCompare(right.roTitle),
  );
}

export function statusLabelForPerformanceRisk(status: PerformanceRiskAttentionStatus) {
  switch (status) {
    case "critical":
      return "Kritis";
    case "watch":
      return "Perlu Pantauan";
    case "stable":
      return "Stabil";
    case "no_risk":
      return "Belum Ada Risiko";
  }
}

export function statusToneForPerformanceRisk(status: PerformanceRiskAttentionStatus) {
  switch (status) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-700";
    case "watch":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "stable":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "no_risk":
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

export function classifyPerformanceRiskEmptyState(summary: Pick<
  { totalRO: number; totalRisks: number; unlinkedRisks: number },
  "totalRO" | "totalRisks" | "unlinkedRisks"
>): PerformanceRiskEmptyState {
  if (summary.totalRO === 0) return "no_planning";
  if (summary.totalRisks === 0) return "no_linked_risk";
  if (summary.unlinkedRisks > 0) return "has_unlinked_risk";
  return "ready";
}
```

- [ ] **Step 6: Run frontend utility tests**

Run:

```bash
cd frontend
node --test --import tsx src/lib/performance-risk.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add frontend/src/types/performance-risk.ts frontend/src/lib/api/performance-risk.ts frontend/src/lib/performance-risk.ts frontend/src/lib/performance-risk.test.ts
git commit -m "feat: add performance risk frontend client"
```

---

### Task 6: Frontend Dashboard Page And Components

**Files:**

- Create: `frontend/src/app/(app)/reports/performance-risk/page.tsx`
- Create: `frontend/src/app/(app)/reports/performance-risk/_components/filter-bar.tsx`
- Create: `frontend/src/app/(app)/reports/performance-risk/_components/summary-cards.tsx`
- Create: `frontend/src/app/(app)/reports/performance-risk/_components/node-ranking-table.tsx`
- Create: `frontend/src/app/(app)/reports/performance-risk/_components/detail-panel.tsx`
- Create: `frontend/src/app/(app)/reports/performance-risk/_components/inherent-heatmap.tsx`

- [ ] **Step 1: Create heatmap component**

Create `frontend/src/app/(app)/reports/performance-risk/_components/inherent-heatmap.tsx`:

```tsx
import { cn } from "@/lib/utils";

type Props = {
  heatmap: number[][];
};

function intensityClass(value: number) {
  if (value >= 5) return "bg-red-600 text-white";
  if (value >= 3) return "bg-orange-500 text-white";
  if (value >= 1) return "bg-amber-200 text-amber-950";
  return "bg-muted text-muted-foreground";
}

export function InherentHeatmap({ heatmap }: Props) {
  return (
    <div className="grid grid-cols-5 gap-1" aria-label="Heatmap inherent probability impact">
      {Array.from({ length: 5 }).flatMap((_, probabilityIndex) =>
        Array.from({ length: 5 }).map((__, impactIndex) => {
          const value = heatmap?.[probabilityIndex]?.[impactIndex] ?? 0;
          return (
            <div
              key={`${probabilityIndex}-${impactIndex}`}
              className={cn(
                "flex aspect-square items-center justify-center rounded-sm text-xs font-semibold",
                intensityClass(value),
              )}
              title={`Probabilitas ${probabilityIndex + 1}, Dampak ${impactIndex + 1}: ${value} risiko`}
            >
              {value}
            </div>
          );
        }),
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create filter bar**

Create `frontend/src/app/(app)/reports/performance-risk/_components/filter-bar.tsx`:

```tsx
"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrganizationPicker } from "@/components/report/organization-picker";
import type { OrganizationListItem } from "@/lib/api/organizations";

type Props = {
  period: string;
  onPeriodChange: (value: string) => void;
  organizationId: string;
  organizations: OrganizationListItem[];
  onOrganizationChange: (value: string) => void;
  showNoRisk: boolean;
  onShowNoRiskChange: (value: boolean) => void;
};

export function PerformanceRiskFilterBar({
  period,
  onPeriodChange,
  organizationId,
  organizations,
  onOrganizationChange,
  showNoRisk,
  onShowNoRiskChange,
}: Props) {
  return (
    <div className="grid gap-4 rounded-md border border-border/70 bg-card p-4 lg:grid-cols-[180px_minmax(260px,1fr)_auto] lg:items-end">
      <div className="space-y-2">
        <Label htmlFor="performance-risk-period">Periode</Label>
        <Input
          id="performance-risk-period"
          value={period}
          onChange={(event) => onPeriodChange(event.target.value)}
          placeholder="2026-H1"
        />
      </div>
      <div className="space-y-2">
        <Label>Unit</Label>
        <OrganizationPicker
          value={organizationId}
          organizations={organizations}
          onChange={onOrganizationChange}
          placeholder="Semua unit yang dapat diakses"
          searchPlaceholder="Cari unit..."
          emptyMessage="Tidak ada unit ditemukan."
        />
      </div>
      <label className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm">
        <input
          type="checkbox"
          checked={showNoRisk}
          onChange={(event) => onShowNoRiskChange(event.target.checked)}
          className="size-4"
        />
        <Search className="size-4 text-muted-foreground" />
        Tampilkan RO tanpa risiko
      </label>
    </div>
  );
}
```

- [ ] **Step 3: Create summary cards**

Create `frontend/src/app/(app)/reports/performance-risk/_components/summary-cards.tsx`:

```tsx
import { AlertTriangle, ClipboardList, Link2, Target } from "lucide-react";

import { KpiCard } from "@/components/ui/kpi-card";
import type { PerformanceRiskSummary } from "@/types/performance-risk";

type Props = {
  summary: PerformanceRiskSummary | null;
};

export function PerformanceRiskSummaryCards({ summary }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="RO Terpetakan" value={summary?.totalRO ?? 0} icon={<Target className="size-5 text-zinc-500" />} />
      <KpiCard label="RO Dengan Risiko" value={summary?.linkedRO ?? 0} icon={<Link2 className="size-5 text-zinc-500" />} />
      <KpiCard label="RO Risiko Tinggi+" value={summary?.highOrExtremeRO ?? 0} icon={<AlertTriangle className="size-5 text-zinc-500" />} />
      <KpiCard label="Mitigasi Overdue" value={summary?.overdueMitigations ?? 0} icon={<ClipboardList className="size-5 text-zinc-500" />} />
    </div>
  );
}
```

- [ ] **Step 4: Create ranking table**

Create `frontend/src/app/(app)/reports/performance-risk/_components/node-ranking-table.tsx`:

```tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  statusLabelForPerformanceRisk,
  statusToneForPerformanceRisk,
} from "@/lib/performance-risk";
import { cn } from "@/lib/utils";
import type { PerformanceRiskNode } from "@/types/performance-risk";

type Props = {
  nodes: PerformanceRiskNode[];
  selectedROId?: string;
  onSelect: (node: PerformanceRiskNode) => void;
};

export function PerformanceRiskNodeRankingTable({ nodes, selectedROId, onSelect }: Props) {
  return (
    <div className="overflow-hidden rounded-md border border-border/70">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">RO</th>
            <th className="px-4 py-3">Konteks</th>
            <th className="px-4 py-3 text-right">Risiko</th>
            <th className="px-4 py-3 text-right">Exposure</th>
            <th className="px-4 py-3 text-right">Overdue</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {nodes.map((node) => (
            <tr key={node.roId} className={cn(selectedROId === node.roId && "bg-muted/50")}>
              <td className="max-w-xs px-4 py-3 font-medium">{node.roTitle}</td>
              <td className="px-4 py-3 text-muted-foreground">
                <div className="line-clamp-1">{node.programTitle}</div>
                <div className="line-clamp-1 text-xs">{node.kegiatanTitle}</div>
              </td>
              <td className="px-4 py-3 text-right">{node.riskCount}</td>
              <td className="px-4 py-3 text-right font-semibold">{node.totalExposure}</td>
              <td className="px-4 py-3 text-right">{node.mitigationOverdue}</td>
              <td className="px-4 py-3">
                <Badge variant="outline" className={statusToneForPerformanceRisk(node.attentionStatus)}>
                  {statusLabelForPerformanceRisk(node.attentionStatus)}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <Button type="button" variant="outline" size="sm" onClick={() => onSelect(node)}>
                  Detail
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 5: Create detail panel**

Create `frontend/src/app/(app)/reports/performance-risk/_components/detail-panel.tsx`:

```tsx
import { Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InherentHeatmap } from "./inherent-heatmap";
import type { PerformanceRiskDetail } from "@/types/performance-risk";

type Props = {
  detail: PerformanceRiskDetail | null;
  loading: boolean;
};

export function PerformanceRiskDetailPanel({ detail, loading }: Props) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex min-h-48 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!detail) {
    return (
      <Card>
        <CardContent className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
          Pilih RO untuk melihat detail risiko dan mitigasi.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Heatmap Inherent</CardTitle>
        </CardHeader>
        <CardContent>
          <InherentHeatmap heatmap={detail.node.heatmap} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{detail.node.roTitle}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {detail.node.tujuanTitle} / {detail.node.sasaranTitle} / {detail.node.ikuTitle}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Risiko Terkait</h3>
            <div className="space-y-2">
              {detail.risks.map((risk) => (
                <div key={risk.id} className="rounded-md border border-border/70 p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{risk.code} - {risk.title}</p>
                      <p className="text-xs text-muted-foreground">{risk.organizationName}</p>
                    </div>
                    <span className="text-sm font-semibold">{risk.inherentScore}</span>
                  </div>
                </div>
              ))}
              {detail.risks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada risiko approved yang terhubung ke RO ini.</p>
              ) : null}
            </div>
          </section>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Mitigasi Pending / Overdue</h3>
            <div className="space-y-2">
              {detail.mitigations.map((mitigation) => (
                <div key={mitigation.id} className="rounded-md border border-border/70 p-3">
                  <p className="font-medium">{mitigation.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {mitigation.riskCode} / {mitigation.owner || "Tanpa PIC"} / {mitigation.dueDate || "Tanpa due date"}
                  </p>
                </div>
              ))}
              {detail.mitigations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada mitigasi pending atau overdue untuk RO ini.</p>
              ) : null}
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 6: Create page container**

Create `frontend/src/app/(app)/reports/performance-risk/page.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import { listAllOrganizations, type OrganizationListItem } from "@/lib/api/organizations";
import {
  getPerformanceRiskDetail,
  getPerformanceRiskSummary,
  listPerformanceRiskNodes,
  listPerformanceRiskUnlinkedRisks,
} from "@/lib/api/performance-risk";
import {
  classifyPerformanceRiskEmptyState,
  sortPerformanceRiskNodes,
} from "@/lib/performance-risk";
import {
  buildSelectableReportOrganizations,
  needsExplicitReportOrgSelection,
  resolveDefaultReportOrgId,
} from "@/lib/report-scope";
import type {
  PerformanceRiskDetail,
  PerformanceRiskNode,
  PerformanceRiskRiskRow,
  PerformanceRiskSummary,
} from "@/types/performance-risk";
import { PerformanceRiskDetailPanel } from "./_components/detail-panel";
import { PerformanceRiskFilterBar } from "./_components/filter-bar";
import { PerformanceRiskNodeRankingTable } from "./_components/node-ranking-table";
import { PerformanceRiskSummaryCards } from "./_components/summary-cards";

function currentGlobalCycle() {
  const now = new Date();
  const year = now.getFullYear();
  const half = now.getMonth() < 6 ? "H1" : "H2";
  return `${year}-${half}`;
}

export default function PerformanceRiskPage() {
  const { token, user } = useAuth();
  const [period, setPeriod] = useState(currentGlobalCycle());
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [summary, setSummary] = useState<PerformanceRiskSummary | null>(null);
  const [nodes, setNodes] = useState<PerformanceRiskNode[]>([]);
  const [unlinkedRisks, setUnlinkedRisks] = useState<PerformanceRiskRiskRow[]>([]);
  const [selectedNode, setSelectedNode] = useState<PerformanceRiskNode | null>(null);
  const [detail, setDetail] = useState<PerformanceRiskDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showNoRisk, setShowNoRisk] = useState(false);
  const [loading, setLoading] = useState(true);
  const requiresOrganizationSelection = needsExplicitReportOrgSelection(user);

  useEffect(() => {
    if (!token) return;
    listAllOrganizations(token)
      .then((items) => setOrganizations(buildSelectableReportOrganizations(user, items)))
      .catch((error) => {
        console.error(error);
        toast.error("Gagal memuat daftar unit.");
      });
  }, [token, user]);

  useEffect(() => {
    if (organizations.length === 0) return;
    if (user?.isGlobal) {
      setOrganizationId("");
      return;
    }
    const defaultOrgId = resolveDefaultReportOrgId(user);
    if (defaultOrgId) {
      setOrganizationId((current) => current || defaultOrgId);
      return;
    }
    if (requiresOrganizationSelection) {
      setOrganizationId("");
      return;
    }
    setOrganizationId((current) => current || organizations[0]?.id || "");
  }, [organizations, requiresOrganizationSelection, user]);

  useEffect(() => {
    if (!token || !period || (requiresOrganizationSelection && !organizationId)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setSelectedNode(null);
    setDetail(null);
    const query = { period, orgId: organizationId || undefined };
    Promise.all([
      getPerformanceRiskSummary(token, query),
      listPerformanceRiskNodes(token, query),
      listPerformanceRiskUnlinkedRisks(token, query),
    ])
      .then(([summaryResponse, nodesResponse, unlinkedResponse]) => {
        setSummary(summaryResponse);
        setNodes(sortPerformanceRiskNodes(nodesResponse));
        setUnlinkedRisks(unlinkedResponse);
      })
      .catch((error) => {
        console.error(error);
        toast.error("Gagal memuat Analisis Kinerja & Risiko.");
      })
      .finally(() => setLoading(false));
  }, [token, period, organizationId, requiresOrganizationSelection]);

  const visibleNodes = useMemo(
    () => nodes.filter((node) => showNoRisk || node.riskCount > 0),
    [nodes, showNoRisk],
  );

  const emptyState = summary
    ? classifyPerformanceRiskEmptyState(summary)
    : "ready";

  const handleSelectNode = async (node: PerformanceRiskNode) => {
    if (!token) return;
    setSelectedNode(node);
    setDetailLoading(true);
    try {
      const response = await getPerformanceRiskDetail(token, node.roId, {
        period,
        orgId: organizationId || undefined,
      });
      setDetail(response);
    } catch (error) {
      console.error(error);
      toast.error("Gagal memuat detail RO.");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="max-w-3xl space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Analisis Kinerja & Risiko</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Memetakan paparan risiko inherent terhadap sasaran, IKU, program, kegiatan, dan RO.
        </p>
      </section>

      <PerformanceRiskFilterBar
        period={period}
        onPeriodChange={setPeriod}
        organizationId={organizationId}
        organizations={organizations}
        onOrganizationChange={setOrganizationId}
        showNoRisk={showNoRisk}
        onShowNoRiskChange={setShowNoRisk}
      />

      <PerformanceRiskSummaryCards summary={summary} />

      {emptyState === "no_planning" ? (
        <div className="rounded-md border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">
          Struktur RO belum tersedia untuk periode ini.
        </div>
      ) : null}

      {emptyState === "has_unlinked_risk" ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {unlinkedRisks.length} risiko approved pada periode ini belum terhubung ke RO.
        </div>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Ranking RO</h2>
          <p className="text-sm text-muted-foreground">
            Urutan berdasarkan total inherent exposure, jumlah risiko tinggi, dan mitigasi overdue.
          </p>
        </div>
        {loading ? (
          <div className="rounded-md border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">
            Memuat analisis...
          </div>
        ) : (
          <PerformanceRiskNodeRankingTable
            nodes={visibleNodes}
            selectedROId={selectedNode?.roId}
            onSelect={handleSelectNode}
          />
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Detail RO</h2>
        <PerformanceRiskDetailPanel detail={detail} loading={detailLoading} />
      </section>
    </div>
  );
}
```

- [ ] **Step 7: Run frontend tests and build**

Run:

```bash
cd frontend
node --test --import tsx src/lib/performance-risk.test.ts
npm run lint
npm run build
```

Expected: all commands PASS.

- [ ] **Step 8: Commit**

Run:

```bash
git add 'frontend/src/app/(app)/reports/performance-risk' frontend/src/lib/performance-risk.test.ts frontend/src/lib/performance-risk.ts frontend/src/lib/api/performance-risk.ts frontend/src/types/performance-risk.ts
git commit -m "feat: add performance risk dashboard"
```

---

### Task 7: Navigation And Reports Landing Integration

**Files:**

- Modify: `frontend/src/lib/app-navigation.ts`
- Modify: `frontend/src/app/(app)/reports/page.tsx`

- [ ] **Step 1: Add breadcrumb**

Modify `frontend/src/lib/app-navigation.ts` and add:

```ts
"/reports/performance-risk": "Analisis Kinerja & Risiko",
```

Place it next to the existing `/reports` breadcrumb entries.

- [ ] **Step 2: Add reports landing link**

Modify `frontend/src/app/(app)/reports/page.tsx`.

Add `ActivitySquare` to the lucide import:

```ts
ActivitySquare,
```

Add a link card near the existing report feature links:

```tsx
<Link
  href="/reports/performance-risk"
  className="group rounded-2xl border border-border/60 bg-card/70 p-5 transition-colors hover:border-primary/30 hover:bg-primary/5"
>
  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
    <ActivitySquare className="size-4 text-primary" />
    Analisis Kinerja & Risiko
  </p>
  <p className="mt-1 text-xs text-muted-foreground">
    Lihat hubungan RO, exposure risiko inherent, dan mitigasi yang perlu diprioritaskan.
  </p>
  <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
    Buka halaman
    <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
  </span>
</Link>
```

Use the same surrounding section pattern already used for `/reports/compliance-monitoring` and `/reports/cycle-detail`.

- [ ] **Step 3: Run frontend verification**

Run:

```bash
cd frontend
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

Run:

```bash
git add frontend/src/lib/app-navigation.ts 'frontend/src/app/(app)/reports/page.tsx'
git commit -m "feat: link performance risk report"
```

---

### Task 8: End-To-End Verification

**Files:**

- No new files.
- Verify backend and frontend together.

- [ ] **Step 1: Run backend tests**

Run:

```bash
cd backend
go test ./...
```

Expected: PASS.

- [ ] **Step 2: Run frontend verification**

Run:

```bash
cd frontend
node --test --import tsx src/lib/performance-risk.test.ts
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 3: Start backend**

Run:

```bash
cd backend
go run ./cmd/server
```

Expected: backend listens on configured port, normally `:8080`.

- [ ] **Step 4: Start frontend**

Run:

```bash
cd frontend
npm run dev
```

Expected: frontend serves on `http://localhost:3000` or the next available port.

- [ ] **Step 5: Browser smoke test**

Open the app and visit:

```text
http://localhost:3000/reports/performance-risk
```

Verify:

- Page title is `Analisis Kinerja & Risiko`.
- Period filter is visible.
- Unit picker is visible.
- Summary cards render.
- Ranking section renders.
- Clicking a ranking row loads detail.
- Heatmap cells are visible.
- Unlinked-risk warning appears when backend returns unlinked risks.

- [ ] **Step 6: Commit any smoke-test fixes**

If smoke testing required code changes, run:

```bash
git add backend frontend
git commit -m "fix: polish performance risk dashboard"
```

If smoke testing did not require code changes, do not create an empty commit.

---

## Final Verification Checklist

- [ ] Backend endpoint `/api/v1/reports/performance-risk/summary?period=2026-H1` returns `{ data: ... }`.
- [ ] Backend endpoint `/api/v1/reports/performance-risk/nodes?period=2026-H1` returns `{ data: [...] }`.
- [ ] Backend endpoint `/api/v1/reports/performance-risk/nodes/:id?period=2026-H1` returns detail for one RO.
- [ ] Backend endpoint `/api/v1/reports/performance-risk/unlinked-risks?period=2026-H1` returns approved risks with `ro_id IS NULL`.
- [ ] Exposure metrics use `inherent_score`.
- [ ] Heatmap uses original `probability` and `impact`.
- [ ] Target, residual, monitoring, and effective score are not used for ranking.
- [ ] RO without risk can be shown by toggle.
- [ ] No export UI exists.
- [ ] `go test ./...` passes in `backend`.
- [ ] `npm run lint` passes in `frontend`.
- [ ] `npm run build` passes in `frontend`.
