# Hierarchical Organization Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users in parent organizations to read all data from their child organizations recursively, while limiting create/update/delete operations to their own organization.

**Architecture:** Implement recursive Organization tree traversal using PostgreSQL CTE, add OrganizationService layer for hierarchy resolution, and update repository filtering logic to use organization ID arrays instead of single IDs.

**Tech Stack:** Go with pgx/v5, PostgreSQL recursive CTE, Clean Architecture (Repository → UseCase → Handler)

---

## Context Switch: READ vs WRITE Operations

**READ Operations (affected):**
- List risks, incidents, KRIs, controls, lessons
- Dashboard summaries, heatmap data
- Review queue, cycle comparisons
- GET endpoints for all entities

**WRITE Operations (NOT affected):**
- Create/Update/Delete risks, incidents, KRIs, controls
- POST/PUT/DELETE endpoints remain restricted to user's own organization

---

## File Structure

### New Files Created
- `backend/internal/domain/service/organization_hierarchy.go` - Service for resolving organization hierarchy
- `backend/internal/domain/service/organization_hierarchy_test.go` - Tests for hierarchy service

### Modified Files
- `backend/internal/domain/repository/organization.go` - Add GetDescendants method
- `backend/internal/repository/postgres/organization.go` - Implement GetDescendants with recursive CTE
- `backend/internal/domain/repository/risk.go` - Update method signatures to use []uuid.UUID
- `backend/internal/repository/postgres/risk.go` - Update to use ANY() operator
- `backend/internal/domain/repository/incident.go` - Update method signatures
- `backend/internal/repository/postgres/incident.go` - Update implementation
- `backend/internal/domain/repository/kri.go` - Update method signatures
- `backend/internal/repository/postgres/kri.go` - Update implementation
- `backend/internal/domain/repository/control.go` - Update method signatures
- `backend/internal/repository/postgres/control.go` - Update implementation
- `backend/internal/domain/repository/lesson.go` - Update method signatures
- `backend/internal/repository/postgres/lesson.go` - Update implementation
- `backend/internal/usecase/risk/list.go` - Inject OrganizationHierarchy service
- `backend/internal/usecase/risk/review_queue.go` - Inject OrganizationHierarchy service
- `backend/internal/usecase/risk/compare_cycles.go` - Inject OrganizationHierarchy service
- `backend/internal/usecase/risk/review_summary.go` - Inject OrganizationHierarchy service
- `backend/internal/usecase/risk/compare_cycle_detail.go` - Inject OrganizationHierarchy service
- `backend/internal/usecase/incident/basic.go` - Inject OrganizationHierarchy service
- `backend/internal/usecase/kri/basic.go` - Inject OrganizationHierarchy service
- `backend/internal/usecase/control/basic.go` - Inject OrganizationHierarchy service
- `backend/internal/usecase/lesson/basic.go` - Inject OrganizationHierarchy service
- `backend/cmd/server/main.go` - Wire up OrganizationHierarchy service
- `backend/db/migrations/000002_add_organization_hierarchy_index.up.sql` - Performance index
- `backend/db/migrations/000002_add_organization_hierarchy_index.down.sql` - DropIndex

---

## Task 1: Add GetDescendants Method to Organization Repository Interface

**Files:**
- Modify: `backend/internal/domain/repository/organization.go`

- [ ] **Step 1: Add GetDescendants method signature**

Open `backend/internal/domain/repository/organization.go` and add this method signature after the `List` method (around line 17):

```go
// GetDescendants returns all descendant organization IDs for a given organization (including itself)
// This uses recursive CTE to traverse the organization hierarchy
GetDescendants(ctx context.Context, orgID uuid.UUID) ([]uuid.UUID, error)
```

---

## Task 2: Implement GetDescendants with Recursive CTE

**Files:**
- Modify: `backend/internal/repository/postgres/organization.go`

- [ ] **Step 1: Implement GetDescendants method**

Add the implementation to `backend/internal/repository/postgres/organization.go` after the `List` method (around line 93):

```go
// GetDescendants returns all descendant organization IDs using recursive CTE
func (r *organizationRepository) GetDescendants(ctx context.Context, orgID uuid.UUID) ([]uuid.UUID, error) {
	query := `
		WITH RECURSIVE org_tree AS (
			-- Base case: start with the given organization
			SELECT id FROM organizations WHERE id = $1
			
			UNION ALL
			
			-- Recursive case: find all children
			SELECT o.id 
			FROM organizations o
			INNER JOIN org_tree ot ON o.parent_id = ot.id
		)
		SELECT id FROM org_tree
	`
	
	rows, err := r.pool.Query(ctx, query, orgID)
	if err != nil {
		return nil, fmt.Errorf("get organization descendants: %w", err)
	}
	defer rows.Close()
	
	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan organization id: %w", err)
		}
		ids = append(ids, id)
	}
	
	if len(ids) == 0 {
		// If no results, return at least the org itself
		return []uuid.UUID{orgID}, nil
	}
	
	return ids, nil
}
```

- [ ] **Step 2: Verify the implementation compiles**

```bash
cd backend
go build ./...
```

---

## Task 3: Create Organization Hierarchy Service

**Files:**
- Create: `backend/internal/domain/service/organization_hierarchy.go`
- Create: `backend/internal/domain/service/organization_hierarchy_test.go`

- [ ] **Step 1: Create the service directory**

```bash
mkdir -p backend/internal/domain/service
```

- [ ] **Step 2: Create OrganizationHierarchy service**

Create `backend/internal/domain/service/organization_hierarchy.go`:

```go
package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/repository"
)

// OrganizationHierarchy provides organization hierarchy operations
type OrganizationHierarchy struct {
	orgRepo repository.OrganizationRepository
}

// NewOrganizationHierarchy creates a new organization hierarchy service
func NewOrganizationHierarchy(orgRepo repository.OrganizationRepository) *OrganizationHierarchy {
	return &OrganizationHierarchy{
		orgRepo: orgRepo,
	}
}

// GetAccessibleOrgs returns all organization IDs the user can access
// This includes the user's own organization and all its descendants
func (s *OrganizationHierarchy) GetAccessibleOrgs(ctx context.Context, userOrgID uuid.UUID) ([]uuid.UUID, error) {
	// Get all descendants including the org itself
	descendants, err := s.orgRepo.GetDescendants(ctx, userOrgID)
	if err != nil {
		return nil, err
	}
	
	// If no descendants found, return at least the user's org
	if len(descendants) == 0 {
		return []uuid.UUID{userOrgID}, nil
	}
	
	return descendants, nil
}

// IsDescendantOf checks if targetOrg is a descendant of parentOrg
func (s *OrganizationHierarchy) IsDescendantOf(ctx context.Context, targetOrg, parentOrg uuid.UUID) (bool, error) {
	accessible, err := s.GetAccessibleOrgs(ctx, parentOrg)
	if err != nil {
		return false, err
	}
	
	for _, id := range accessible {
		if id == targetOrg {
			return true, nil
		}
	}
	
	return false, nil
}
```

- [ ] **Step 3: Create unit tests**

Create `backend/internal/domain/service/organization_hierarchy_test.go`:

```go
package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

// MockOrganizationRepository for testing
type mockOrgRepo struct {
	descendants []uuid.UUID
	err         error
}

func (m *mockOrgRepo) Create(ctx context.Context, org *entity.Organization) error {
	return nil
}

func (m *mockOrgRepo) GetByID(ctx context.Context, id uuid.UUID) (*entity.Organization, error) {
	return nil, nil
}

func (m *mockOrgRepo) Update(ctx context.Context, org *entity.Organization) error {
	return nil
}

func (m *mockOrgRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return nil
}

func (m *mockOrgRepo) List(ctx context.Context) ([]*entity.Organization, error) {
	return nil, nil
}

func (m *mockOrgRepo) GetDescendants(ctx context.Context, orgID uuid.UUID) ([]uuid.UUID, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.descendants, nil
}

func TestOrganizationHierarchy_GetAccessibleOrgs(t *testing.T) {
	t.Run("returns descendants for user's organization", func(t *testing.T) {
		orgID := uuid.New()
		child1 := uuid.New()
		child2 := uuid.New()
		expectedIDs := []uuid.UUID{orgID, child1, child2}
		
		mockRepo := &mockOrgRepo{descendants: expectedIDs}
		svc := NewOrganizationHierarchy(mockRepo)
		
		ctx := context.Background()
		result, err := svc.GetAccessibleOrgs(ctx, orgID)
		
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if len(result) != 3 {
			t.Errorf("expected 3 orgs, got %d", len(result))
		}
	})
	
	t.Run("handles organization with no children", func(t *testing.T) {
		orgID := uuid.New()
		svc := NewOrganizationHierarchy(&mockOrgRepo{descendants: nil})
		
		ctx := context.Background()
		result, err := svc.GetAccessibleOrgs(ctx, orgID)
		
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if len(result) != 1 {
			t.Errorf("expected 1 org, got %d", len(result))
		}
		if result[0] != orgID {
			t.Errorf("expected orgID %v, got %v", orgID, result[0])
		}
	})
}

func TestOrganizationHierarchy_IsDescendantOf(t *testing.T) {
	t.Run("returns true for descendant", func(t *testing.T) {
		parent := uuid.New()
		child := uuid.New()
		
		svc := NewOrganizationHierarchy(&mockOrgRepo{descendants: []uuid.UUID{parent, child}})
		
		ctx := context.Background()
		isDescendant, err := svc.IsDescendantOf(ctx, child, parent)
		
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if !isDescendant {
			t.Error("expected true, got false")
		}
	})
	
	t.Run("returns false for non-descendant", func(t *testing.T) {
		parent := uuid.New()
		child := uuid.New()
		other := uuid.New()
		
		svc := NewOrganizationHierarchy(&mockOrgRepo{descendants: []uuid.UUID{parent, child}})
		
		ctx := context.Background()
		isDescendant, err := svc.IsDescendantOf(ctx, other, parent)
		
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if isDescendant {
			t.Error("expected false, got true")
		}
	})
}
```

- [ ] **Step 4: Run tests**

```bash
cd backend
go test ./internal/domain/service -v
```

---

## Task 4: Update Risk Repository Interface for Multiple Org IDs

**Files:**
- Modify: `backend/internal/domain/repository/risk.go`

- [ ] **Step 1: Update method signatures to use orgIDs slice**

Open `backend/internal/domain/repository/risk.go` and update the following method signatures (look for List, ListMitigations, ListCycleSnapshot, ListReviewQueue, CompareCycles, RiskReviewSummary):

Change `*uuid.UUID` to `[]uuid.UUID` for organization parameters:

```go
// Before: List(ctx context.Context, orgID *uuid.UUID, status string) ([]*entity.Risk, error)
List(ctx context.Context, orgIDs []uuid.UUID, status string) ([]*entity.Risk, error)

// Before: ListMitigations(ctx context.Context, orgID *uuid.UUID) ([]*entity.MitigationAssoc, error)
ListMitigations(ctx context.Context, orgIDs []uuid.UUID) ([]*entity.MitigationAssoc, error)

// Before: ListCycleSnapshot(ctx context.Context, cycle string, orgID *uuid.UUID) ([]*entity.Risk, error)
ListCycleSnapshot(ctx context.Context, cycle string, orgIDs []uuid.UUID) ([]*entity.Risk, error)

// Before: ListReviewQueue(ctx context.Context, cycle string, orgID *uuid.UUID, status string) ([]*entity.RiskReviewQueueItem, error)
ListReviewQueue(ctx context.Context, cycle string, orgIDs []uuid.UUID, status string) ([]*entity.RiskReviewQueueItem, error)

// Before: CompareCycles(ctx context.Context, fromCycle string, toCycle string, orgID *uuid.UUID) ([]*entity.RiskCycleComparisonItem, error)
CompareCycles(ctx context.Context, fromCycle string, toCycle string, orgIDs []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error)

// Before: RiskReviewSummary(ctx context.Context, cycle string, orgID *uuid.UUID) (*entity.RiskReviewSummary, error)
RiskReviewSummary(ctx context.Context, cycle string, orgIDs []uuid.UUID) (*entity.RiskReviewSummary, error)
```

---

## Task 5: Update Risk Repository Implementation for Multiple Org IDs

**Files:**
- Modify: `backend/internal/repository/postgres/risk.go`

- [ ] **Step 1: Update List method signature**

Find the `List` method (around line 159) and update the signature:

```go
func (r *riskRepository) List(ctx context.Context, orgIDs []uuid.UUID, status string) ([]*entity.Risk, error) {
```

- [ ] **Step 2: Update List method WHERE clause logic**

Replace the orgID filter logic (around lines 177-181):

```go
	// OLD CODE:
	// if orgID != nil {
	// 	query += fmt.Sprintf(" AND r.organization_id = $%d", argIdx)
	// 	args = append(args, orgID)
	// 	argIdx++
	// }
	
	// NEW CODE:
	if len(orgIDs) > 0 {
		query += fmt.Sprintf(" AND r.organization_id = ANY($%d)", argIdx)
		args = append(args, orgIDs)
		argIdx++
	}
```

- [ ] **Step 3: Update ListMitigations method**

Find the `ListMitigations` method (around line 216) and update:

```go
func (r *riskRepository) ListMitigations(ctx context.Context, orgIDs []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	query := `SELECT m.id, m.risk_id, m.action, m.owner, m.owner_user_id, m.due_date::text, m.frequency, m.recurring_interval, m.target_cost, m.sort_order, m.created_at,
	                 r.code as risk_code, r.title as risk_title, r.organization_id as risk_org_id, r.probability, r.impact
	          FROM mitigations m
	          JOIN risks r ON m.risk_id = r.id
	          WHERE r.status != 'draft' AND r.is_current = TRUE`
	var args []interface{}

	if len(orgIDs) > 0 {
		query += ` AND r.organization_id = ANY($1)`
		args = append(args, orgIDs)
	}

	query += ` ORDER BY m.due_date ASC`
	
	// ... rest stays the same
```

- [ ] **Step 4: Update ListCycleSnapshot method**

Find the method (around line 383) and update:

```go
func (r *riskRepository) ListCycleSnapshot(ctx context.Context, cycle string, orgIDs []uuid.UUID) ([]*entity.Risk, error) {
	query := `SELECT r.id, r.code, r.title, ... (keep existing SELECT)
		 FROM risks r
		 LEFT JOIN organizations o ON r.organization_id = o.id
		 LEFT JOIN users u ON r.created_by = u.id
		 WHERE r.assessment_cycle = $1
		   AND r.status = 'approved'`
	args := []interface{}{cycle}
	if len(orgIDs) > 0 {
		query += fmt.Sprintf(" AND r.organization_id = ANY($%d)", len(args)+1)
		args = append(args, orgIDs)
	}
	query += " ORDER BY COALESCE(o.name, ''), COALESCE(r.code, ''), r.title"
	
	// ... rest stays the same
```

- [ ] **Step 5: Update ListReviewQueue method**

Find the method (around line 523) and update the orgID filtering:

```go
func (r *riskRepository) ListReviewQueue(ctx context.Context, cycle string, orgIDs []uuid.UUID, status string) ([]*entity.RiskReviewQueueItem, error) {
	query := `SELECT ... (keep existing query)
	 WHERE base.is_current = TRUE AND base.status = 'approved'`

	args := []interface{}{cycle}
	if len(orgIDs) > 0 {
		query += fmt.Sprintf(" AND base.organization_id = ANY($%d)", len(args)+1)
		args = append(args, orgIDs)
	}
	// ... rest of method stays same
```

- [ ] **Step 6: Update CompareCycles method**

Find the method (around line 635) and update:

```go
func (r *riskRepository) CompareCycles(ctx context.Context, fromCycle string, toCycle string, orgIDs []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	query := `SELECT ... (keep existing query)
	  AND prev.status = 'approved'`
	args := []interface{}{fromCycle, toCycle}
	if len(orgIDs) > 0 {
		query += fmt.Sprintf(" AND curr.organization_id = ANY($%d)", len(args)+1)
		args = append(args, orgIDs)
	}
	// ... rest stays same
```

- [ ] **Step 7: Update RiskReviewSummary method**

Find the method (around line 724) and update the internal `loadHeatmap` function:

```go
func (r *riskRepository) RiskReviewSummary(ctx context.Context, cycle string, orgIDs []uuid.UUID) (*entity.RiskReviewSummary, error) {
	// ... existing code ...
	
	loadHeatmap := func(targetCycle string) ([]*entity.HeatmapCell, error) {
		query := `SELECT probability, impact, COUNT(*) as cnt FROM risks WHERE assessment_cycle = $1 AND status = 'approved'`
		args := []interface{}{targetCycle}
		if len(orgIDs) > 0 {
			query += fmt.Sprintf(" AND organization_id = ANY($%d)", len(args)+1)
			args = append(args, orgIDs)
		}
		query += " GROUP BY probability, impact"
		// ... rest stays same
	}
	
	// ... rest stays same
}
```

---

## Task 6: Update Other Repositories (Incident, KRI, Control, Lesson)

**Files:**
- Modify: `backend/internal/domain/repository/incident.go`
- Modify: `backend/internal/repository/postgres/incident.go`
- Modify: `backend/internal/domain/repository/kri.go`
- Modify: `backend/internal/repository/postgres/kri.go`
- Modify: `backend/internal/domain/repository/control.go`
- Modify: `backend/internal/repository/postgres/control.go`
- Modify: `backend/internal/domain/repository/lesson.go`
- Modify: `backend/internal/repository/postgres/lesson.go`

- [ ] **Step 1: Find and update Incident repository interface and implementation**

Search for `List(ctx context.Context, orgID` pattern and change to `orgIDs []uuid.UUID`:

In `backend/internal/domain/repository/incident.go`:
```go
List(ctx context.Context, orgIDs []uuid.UUID) ([]*entity.Incident, error)
```

In `backend/internal/repository/postgres/incident.go`, update the WHERE clause:
```go
func (r *incidentRepository) List(ctx context.Context, orgIDs []uuid.UUID) ([]*entity.Incident, error) {
	query := `SELECT id, code, title, what, who, "when", "where", why_how, severity, status, 
	                 corrective_action, preventive_action, linked_risk_id, reporter_id, organization_id, 
	                 created_at, updated_at
	          FROM incidents WHERE 1=1`
	var args []interface{}
	
	if len(orgIDs) > 0 {
		query += ` AND organization_id = ANY($1)`
		args = append(args, orgIDs)
	}
	
	query += ` ORDER BY created_at DESC`
	// ... rest of method
```

- [ ] **Step 2: Apply same pattern to KRI repository**

Update interface and implementation for `List` method.

- [ ] **Step 3: Apply same pattern to Control repository**

Update interface and implementation for `List` method.

- [ ] **Step 4: Apply same pattern to Lesson repository**

Update interface and implementation for `List` method.

---

## Task 7: Update UseCase Layer - Risk List

**Files:**
- Modify: `backend/internal/usecase/risk/list.go`

- [ ] **Step 1: Inject OrganizationHierarchy into ListRisksUseCase**

Update the file to import service package and add orgSvc:

```go
package risk

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
)

// ListRisksUseCase retrieves a list of risks with optional filters
type ListRisksUseCase struct {
	riskRepo repository.RiskRepository
	orgSvc   *service.OrganizationHierarchy
}

func NewListRisksUseCase(riskRepo repository.RiskRepository, orgSvc *service.OrganizationHierarchy) *ListRisksUseCase {
	return &ListRisksUseCase{
		riskRepo: riskRepo,
		orgSvc:   orgSvc,
	}
}

type ListRisksInput struct {
	OrgID  *uuid.UUID // User's organization ID
	Status string
}

func (uc *ListRisksUseCase) Execute(ctx context.Context, input ListRisksInput) ([]*entity.Risk, error) {
	var orgIDs []uuid.UUID
	var err error
	
	if input.OrgID != nil {
		// Get all accessible organizations (user's org + descendants)
		orgIDs, err = uc.orgSvc.GetAccessibleOrgs(ctx, *input.OrgID)
		if err != nil {
			return nil, err
		}
	}
	
	risks, err := uc.riskRepo.List(ctx, orgIDs, input.Status)
	if err != nil {
		return nil, err
	}

	return risks, nil
}
```

---

## Task 8: Update UseCase Layer - Other Risk Operations

**Files:**
- Modify: `backend/internal/usecase/risk/review_queue.go`
- Modify: `backend/internal/usecase/risk/compare_cycles.go`
- Modify: `backend/internal/usecase/risk/review_summary.go`
- Modify: `backend/internal/usecase/risk/compare_cycle_detail.go`

- [ ] **Step 1: Update ListRiskReviewQueueUseCase**

Add import and inject OrganizationHierarchy service:

```go
package risk

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/domain/service"
)

type ListRiskReviewQueueUseCase struct {
	riskRepo repository.RiskRepository
	orgSvc   *service.OrganizationHierarchy
}

func NewListRiskReviewQueueUseCase(riskRepo repository.RiskRepository, orgSvc *service.OrganizationHierarchy) *ListRiskReviewQueueUseCase {
	return &ListRiskReviewQueueUseCase{
		riskRepo: riskRepo,
		orgSvc:   orgSvc,
	}
}

type ListRiskReviewQueueInput struct {
	OrgID  *uuid.UUID
	Cycle  string
	Status string
}

func (uc *ListRiskReviewQueueUseCase) Execute(ctx context.Context, input ListRiskReviewQueueInput) ([]*entity.RiskReviewQueueItem, error) {
	var orgIDs []uuid.UUID
	var err error
	
	if input.OrgID != nil {
		orgIDs, err = uc.orgSvc.GetAccessibleOrgs(ctx, *input.OrgID)
		if err != nil {
			return nil, err
		}
	}
	
	return uc.riskRepo.ListReviewQueue(ctx, input.Cycle, orgIDs, input.Status)
}
```

- [ ] **Step 2: Update CompareRiskCyclesUseCase**

Apply same pattern - inject OrganizationHierarchy and resolve orgIDs.

- [ ] **Step 3: Update RiskReviewSummaryUseCase**

Apply same pattern.

- [ ] **Step 4: Update CompareRiskCycleDetailsUseCase**

Apply same pattern.

---

## Task 9: Update UseCase Layer - Other Entities

**Files:**
- Modify: `backend/internal/usecase/incident/basic.go`
- Modify: `backend/internal/usecase/kri/basic.go`
- Modify: `backend/internal/usecase/control/basic.go`
- Modify: `backend/internal/usecase/lesson/basic.go`

- [ ] **Step 1: Update Incident UseCase**

Find and update the List operation to inject OrganizationHierarchy:

```go
type ListIncidentsUseCase struct {
	incidentRepo repository.IncidentRepository
	orgSvc       *service.OrganizationHierarchy
}

func (uc *ListIncidentsUseCase) Execute(ctx context.Context, orgID *uuid.UUID) ([]*entity.Incident, error) {
	var orgIDs []uuid.UUID
	var err error
	
	if orgID != nil {
		orgIDs, err = uc.orgSvc.GetAccessibleOrgs(ctx, *orgID)
		if err != nil {
			return nil, err
		}
	}
	
	return uc.incidentRepo.List(ctx, orgIDs)
}
```

- [ ] **Step 2: Apply same pattern to KRI UseCase**

- [ ] **Step 3: Apply same pattern to Control UseCase**

- [ ] **Step 4: Apply same pattern to Lesson UseCase**

---

## Task 10: Wire Up Dependencies in main.go

**Files:**
- Modify: `backend/cmd/server/main.go`

- [ ] **Step 1: Import the service package**

Add import:
```go
import (
	// ... existing imports ...
	"github.com/manris/backend/internal/domain/service"
)
```

- [ ] **Step 2: Create OrganizationHierarchy service instance**

Find where repositories are instantiated and add (after orgRepo):

```go
// Organization Hierarchy Service
orgHierarchySvc := service.NewOrganizationHierarchy(orgRepo)
```

- [ ] **Step 3: Update UseCase constructors**

Find all UseCase instantiations and add orgHierarchySvc parameter:

```go
// Risk UseCases
listRisksUC := riskuc.NewListRisksUseCase(riskRepo, orgHierarchySvc)
listReviewQueueUC := riskuc.NewListRiskReviewQueueUseCase(riskRepo, orgHierarchySvc)
compareCyclesUC := riskuc.NewCompareRiskCyclesUseCase(riskRepo, orgHierarchySvc)
compareDetailUC := riskuc.NewCompareRiskCycleDetailsUseCase(riskRepo, orgHierarchySvc)
reviewSummaryUC := riskuc.NewRiskReviewSummaryUseCase(riskRepo, orgHierarchySvc)
```

- [ ] **Step 4: Update other UseCase instantiations**

Apply same pattern for Incident, KRI, Control, Lesson UseCases.

- [ ] **Step 5: Verify compilation**

```bash
cd backend
go build ./cmd/server
```

---

## Task 11: Create Database Migration for Index

**Files:**
- Create: `backend/db/migrations/000002_add_organization_hierarchy_index.up.sql`
- Create: `backend/db/migrations/000002_add_organization_hierarchy_index.down.sql`

- [ ] **Step 1: Check current migration number**

```bash
ls -la backend/db/migrations/
```

Check the latest migration number. It's likely `000001_initial_schema`. So next is `000002`.

- [ ] **Step 2: Create up migration**

Create `backend/db/migrations/000002_add_organization_hierarchy_index.up.sql`:

```sql
-- Add index for parent_id lookups (.Descendants recursive CTE)
CREATE INDEX IF NOT EXISTS idx_organizations_parent_id ON organizations(parent_id);
```

- [ ] **Step 3: Create down migration**

Create `backend/db/migrations/000002_add_organization_hierarchy_index.down.sql`:

```sql
DROP INDEX IF EXISTS idx_organizations_parent_id;
```

- [ ] **Step 4: Run migration**

```bash
cd backend
make migrate-up
```

---

## Task 12: Compilation Verification

- [ ] **Step 1: Build backend**

```bash
cd backend
go build ./...
```

- [ ] **Step 2: Run tests**

```bash
cd backend
go test ./... -v
```

- [ ] **Step 3: Check for compilation errors**

If there are errors, fix them. Common issues:
- Missing imports (add `"github.com/manris/backend/internal/domain/service"`)
- Method signature mismatches (ensure all implementations match interfaces)
- Nil pointer handling (check `orgIDs` can be empty slice)

---

## Task 13: Manual Testing

- [ ] **Step 1: Start the backend server**

```bash
cd backend
make run
```

- [ ] **Step 2: Test organization hierarchy**

Create test organizations in database:
```sql
-- Parent organization
INSERT INTO organizations (id, name) VALUES ('11111111-1111-1111-1111-111111111111', 'Parent Org');

-- Child organizations
INSERT INTO organizations (id, name, parent_id) VALUES 
  ('22222222-2222-2222-2222-222222222222', 'Child Org 1', '11111111-1111-1111-1111-111111111111'),
  ('33333333-3333-3333-3333-333333333333', 'Child Org 2', '11111111-1111-1111-1111-111111111111');

-- Grandchild
INSERT INTO organizations (id, name, parent_id) VALUES 
  ('44444444-4444-4444-4444-444444444444', 'Grandchild Org', '22222222-2222-2222-2222-222222222222');
```

- [ ] **Step 3: Test GetDescendants query**

```sql
WITH RECURSIVE org_tree AS (
	SELECT id FROM organizations WHERE id = '11111111-1111-1111-1111-111111111111'
	UNION ALL
	SELECT o.id FROM organizations o
	INNER JOIN org_tree ot ON o.parent_id = ot.id
)
SELECT id FROM org_tree;
```

Expected result: 4 rows (parent, 2 children, 1 grandchild)

- [ ] **Step 4: Test API endpoint**

```bash
# Login as user in parent org
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user_in_parent_org","password":"password"}'

# List risks with parent org ID
curl -X GET "http://localhost:8080/api/v1/risks?org_id=11111111-1111-1111-1111-111111111111" \
  -H "Authorization: Bearer <token>"
```

Should return risks from parent + all children + grandchild.

---

## Summary

This implementation enables hierarchical organization access control where:

1. **Parent organizations can READ all data from their descendants** - Using recursive CTE to find all descendant org IDs
2. **WRITE operations remain restricted to user's own organization** - No changes to create/update/delete
3. **All roles follow same hierarchical logic for READ** - Unit, Reviewer, Pimpinan, Super Admin all use hierarchy
4. **Performance optimized with index** - Added index on `parent_id` for fast recursive queries
5. **Clean Architecture maintained** - Service layer handles hierarchy resolution, repositories use array parameters

**Key Changes:**
- Added `GetDescendants()` with recursive CTE to Organization repository
- Created `OrganizationHierarchy` service for resolving accessible organizations
- Updated all repository `List` methods to use `[]uuid.UUID` instead of `*uuid.UUID`
- Updated all UseCases to inject and use `OrganizationHierarchy` service
- Added database index for performance