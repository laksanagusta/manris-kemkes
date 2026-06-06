# Organization Groups Report Scope Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add owner-scoped organization groups that can be managed from Admin > Organizations and used as members-only report filters.

**Architecture:** Implement organization groups as first-class backend domain objects with their own tables, repository, usecases, and HTTP handler. Report endpoints keep their existing `org_id` behavior while a shared resolver translates `organization_group_id` into member organization IDs. Frontend adds a group-management tab and a reusable report scope picker that can send either organization or group query parameters.

**Tech Stack:** Go 1.25, Fiber, pgx, PostgreSQL migrations, Next.js 16, React 19, TypeScript, TailwindCSS/shadcn UI, Node test runner.

---

## Scope Check

The approved spec covers one cohesive feature with three coupled surfaces: persistence/API, report filter resolution, and UI. The plan keeps those surfaces as separate tasks so each task is testable and commit-sized, but they remain one implementation plan because report filtering depends on the group domain model.

## File Map

Backend files to create:

- `backend/db/migrations/000071_organization_groups.up.sql`: create `organization_groups`, `organization_group_members`, indexes, and trigger maintenance.
- `backend/db/migrations/000071_organization_groups.down.sql`: drop organization group schema.
- `backend/internal/domain/entity/organization_group.go`: group entity, member summary, validation, input/output structs shared by usecases.
- `backend/internal/domain/repository/organization_group.go`: repository interface and list filter.
- `backend/internal/repository/postgres/organization_group.go`: pgx implementation with transactional create/update.
- `backend/internal/repository/postgres/organization_group_test.go`: repository behavior tests.
- `backend/internal/usecase/organizationgroup/create.go`: create usecase.
- `backend/internal/usecase/organizationgroup/update.go`: update usecase.
- `backend/internal/usecase/organizationgroup/list.go`: list usecase.
- `backend/internal/usecase/organizationgroup/get.go`: get usecase.
- `backend/internal/usecase/organizationgroup/delete.go`: delete usecase.
- `backend/internal/usecase/organizationgroup/resolve.go`: report-scope resolver usecase.
- `backend/internal/usecase/organizationgroup/usecases_test.go`: authorization and validation tests.
- `backend/internal/handler/http/organization_group.go`: HTTP handler.
- `backend/internal/handler/http/organization_group_test.go`: handler tests.

Backend files to modify:

- `backend/internal/domain/errors/errors.go`: add conflict detection helper or sentinel.
- `backend/internal/bootstrap/bootstrap.go`: wire repository and usecases.
- `backend/cmd/server/main.go`: register handler and routes.
- `backend/internal/handler/http/access_surface_scope.go`: add report scope resolver that accepts `organization_group_id`.
- `backend/internal/handler/http/access_surface_scope_test.go`: resolver tests.
- `backend/internal/handler/http/report.go`: use shared resolver for PDF report.
- `backend/internal/handler/http/risk.go`: use shared resolver for report/dashboard risk endpoints.
- `backend/internal/handler/http/performance_risk.go`: use shared resolver.
- `backend/internal/handler/http/formal_report.go`: accept `organization_group_id`.
- `backend/internal/handler/http/tmpmr.go`: accept `organization_group_id` for list where organization filter already exists.
- `backend/internal/handler/http/evaluation.go`: accept `organization_group_id` for list where organization filter already exists.

Frontend files to create:

- `frontend/src/lib/api/organization-groups.ts`: API client and types.
- `frontend/src/lib/report-scope-query.ts`: helper for building mutually exclusive report query params.
- `frontend/src/lib/report-scope-query.test.ts`: query helper tests.
- `frontend/src/components/report/report-scope-picker.tsx`: organization/group mode picker.
- `frontend/src/components/organization/organization-group-form-dialog.tsx`: create/edit dialog.
- `frontend/src/components/organization/organization-group-delete-dialog.tsx`: delete dialog.
- `frontend/src/components/organization/organization-groups-tab.tsx`: group management tab.

Frontend files to modify:

- `frontend/src/app/(app)/admin/organizations/page.tsx`: add tabs and move existing content into structure tab section.
- `frontend/src/app/(app)/reports/page.tsx`: use report scope picker and query helper.
- `frontend/src/app/(app)/reports/compliance-monitoring/page.tsx`: use report scope picker and query helper.
- `frontend/src/app/(app)/reports/performance-risk/page.tsx`: track report scope state.
- `frontend/src/app/(app)/reports/performance-risk/_components/filter-bar.tsx`: replace organization-only picker with report scope picker.
- `frontend/src/app/(app)/reports/risk-cycle-detail-report.tsx`: use report scope picker and query helper.
- `frontend/src/app/(app)/evaluations/page.tsx`: use report scope picker and query helper for list filters where organization filter exists.
- `frontend/src/app/(app)/reports/formal/page.tsx` and `frontend/src/app/(app)/reports/_components/formal-report-list.tsx`: use group-aware listing where the page exposes organization filtering.
- `frontend/src/types/formal-report.ts`: add `organizationGroupId` to list params.

## Task 1: Database Migration And Domain Contracts

**Files:**

- Create: `backend/db/migrations/000071_organization_groups.up.sql`
- Create: `backend/db/migrations/000071_organization_groups.down.sql`
- Create: `backend/internal/domain/entity/organization_group.go`
- Create: `backend/internal/domain/repository/organization_group.go`
- Modify: `backend/internal/domain/errors/errors.go`

- [ ] **Step 1: Add migration up file**

Create `backend/db/migrations/000071_organization_groups.up.sql`:

```sql
CREATE TABLE IF NOT EXISTS organization_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_organization_id UUID NOT NULL REFERENCES organizations(id),
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_groups_owner_name_unique
    ON organization_groups (owner_organization_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_organization_groups_owner
    ON organization_groups (owner_organization_id);

CREATE TABLE IF NOT EXISTS organization_group_members (
    group_id UUID NOT NULL REFERENCES organization_groups(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_group_members_organization
    ON organization_group_members (organization_id);

CREATE OR REPLACE FUNCTION touch_organization_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_organization_groups_updated_at ON organization_groups;
CREATE TRIGGER trg_organization_groups_updated_at
    BEFORE UPDATE ON organization_groups
    FOR EACH ROW
    EXECUTE FUNCTION touch_organization_groups_updated_at();
```

- [ ] **Step 2: Add migration down file**

Create `backend/db/migrations/000071_organization_groups.down.sql`:

```sql
DROP TRIGGER IF EXISTS trg_organization_groups_updated_at ON organization_groups;
DROP FUNCTION IF EXISTS touch_organization_groups_updated_at();
DROP TABLE IF EXISTS organization_group_members;
DROP INDEX IF EXISTS idx_organization_groups_owner;
DROP INDEX IF EXISTS idx_organization_groups_owner_name_unique;
DROP TABLE IF EXISTS organization_groups;
```

- [ ] **Step 3: Add organization group entity**

Create `backend/internal/domain/entity/organization_group.go`:

```go
package entity

import (
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
)

type OrganizationGroup struct {
	ID                    uuid.UUID                 `json:"id"`
	OwnerOrganizationID   uuid.UUID                 `json:"ownerOrganizationId"`
	OwnerOrganizationName string                    `json:"ownerOrganizationName,omitempty"`
	Name                  string                    `json:"name"`
	Description           string                    `json:"description"`
	CreatedBy             *uuid.UUID                `json:"createdBy,omitempty"`
	MemberCount           int                       `json:"memberCount"`
	Members               []OrganizationGroupMember `json:"members,omitempty"`
	CreatedAt             time.Time                 `json:"createdAt"`
	UpdatedAt             time.Time                 `json:"updatedAt"`
}

type OrganizationGroupMember struct {
	ID       uuid.UUID  `json:"id"`
	Name     string     `json:"name"`
	ParentID *uuid.UUID `json:"parentId,omitempty"`
	Location string     `json:"location,omitempty"`
}

func (g *OrganizationGroup) Normalize() {
	g.Name = strings.TrimSpace(g.Name)
	g.Description = strings.TrimSpace(g.Description)
}

func (g *OrganizationGroup) Validate() error {
	g.Normalize()
	if g.OwnerOrganizationID == uuid.Nil {
		return errors.Wrap(errors.ErrInvalidInput, "owner organization id is required")
	}
	if g.Name == "" {
		return errors.ErrInvalidName
	}
	return nil
}
```

- [ ] **Step 4: Add repository interface**

Create `backend/internal/domain/repository/organization_group.go`:

```go
package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type OrganizationGroupListFilter struct {
	OwnerOrganizationID *uuid.UUID
	Q                   string
	Page                int
	Limit               int
	IncludeMembers      bool
}

type OrganizationGroupRepository interface {
	Create(ctx context.Context, group *entity.OrganizationGroup, memberIDs []uuid.UUID) error
	Update(ctx context.Context, group *entity.OrganizationGroup, memberIDs []uuid.UUID) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.OrganizationGroup, error)
	List(ctx context.Context, filter OrganizationGroupListFilter) ([]*entity.OrganizationGroup, int, error)
	ListMemberIDs(ctx context.Context, id uuid.UUID) ([]uuid.UUID, error)
}
```

- [ ] **Step 5: Add conflict error support**

Modify `backend/internal/domain/errors/errors.go` by adding `ErrConflict` to the predefined domain errors:

```go
ErrConflict = &AppError{Code: "CONFLICT", Message: "resource conflict"}
```

Add helper:

```go
func IsConflict(err error) bool {
	return errors.Is(err, ErrConflict)
}
```

- [ ] **Step 6: Run backend compile check**

Run:

```bash
cd backend && go test ./internal/domain/...
```

Expected: PASS, or compile errors only for code added in this task. Fix compile errors before continuing.

- [ ] **Step 7: Commit**

```bash
git add backend/db/migrations/000071_organization_groups.up.sql backend/db/migrations/000071_organization_groups.down.sql backend/internal/domain/entity/organization_group.go backend/internal/domain/repository/organization_group.go backend/internal/domain/errors/errors.go
git commit -m "feat: add organization group domain schema"
```

## Task 2: PostgreSQL Organization Group Repository

**Files:**

- Create: `backend/internal/repository/postgres/organization_group.go`
- Create: `backend/internal/repository/postgres/organization_group_test.go`

- [ ] **Step 1: Write repository tests**

Create `backend/internal/repository/postgres/organization_group_test.go`:

```go
package postgres

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

func TestOrganizationGroupRepositoryMapsDuplicateNameToConflict(t *testing.T) {
	err := mapOrganizationGroupError(&pgconn.PgError{
		Code:           "23505",
		ConstraintName: "idx_organization_groups_owner_name_unique",
	})
	if !domainerrors.IsConflict(err) {
		t.Fatalf("expected conflict error, got %v", err)
	}
}

func TestOrganizationGroupRepositoryNormalizesNilMembers(t *testing.T) {
	ids := normalizeOrganizationGroupMemberIDs(nil)
	if ids == nil {
		t.Fatal("expected empty slice, got nil")
	}
	if len(ids) != 0 {
		t.Fatalf("expected empty slice, got %v", ids)
	}
}

func TestOrganizationGroupRepositoryDeduplicatesMembers(t *testing.T) {
	first := uuid.New()
	second := uuid.New()
	ids := normalizeOrganizationGroupMemberIDs([]uuid.UUID{first, second, first})
	if len(ids) != 2 {
		t.Fatalf("expected two IDs, got %v", ids)
	}
	if ids[0] != first || ids[1] != second {
		t.Fatalf("expected stable dedupe, got %v", ids)
	}
}

func TestOrganizationGroupRepositoryInterfaceShape(t *testing.T) {
	var _ = NewOrganizationGroupRepository
	var _ interface {
		Create(context.Context, *entity.OrganizationGroup, []uuid.UUID) error
		Update(context.Context, *entity.OrganizationGroup, []uuid.UUID) error
		Delete(context.Context, uuid.UUID) error
		GetByID(context.Context, uuid.UUID) (*entity.OrganizationGroup, error)
		ListMemberIDs(context.Context, uuid.UUID) ([]uuid.UUID, error)
	} = (*organizationGroupRepository)(nil)
}
```

- [ ] **Step 2: Run repository tests to verify failure**

Run:

```bash
cd backend && go test ./internal/repository/postgres -run 'TestOrganizationGroupRepository' -count=1
```

Expected: FAIL because `NewOrganizationGroupRepository`, `organizationGroupRepository`, and helper functions do not exist.

- [ ] **Step 3: Implement repository**

Create `backend/internal/repository/postgres/organization_group.go`:

```go
package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type organizationGroupRepository struct {
	pool *pgxpool.Pool
}

func NewOrganizationGroupRepository(pool *pgxpool.Pool) repository.OrganizationGroupRepository {
	return &organizationGroupRepository{pool: pool}
}

func normalizeOrganizationGroupMemberIDs(memberIDs []uuid.UUID) []uuid.UUID {
	if len(memberIDs) == 0 {
		return []uuid.UUID{}
	}
	seen := make(map[uuid.UUID]struct{}, len(memberIDs))
	result := make([]uuid.UUID, 0, len(memberIDs))
	for _, id := range memberIDs {
		if id == uuid.Nil {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		result = append(result, id)
	}
	return result
}

func mapOrganizationGroupError(err error) error {
	if err == nil {
		return nil
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" && pgErr.ConstraintName == "idx_organization_groups_owner_name_unique" {
		return domainerrors.Wrap(domainerrors.ErrConflict, "organization group name already exists for this owner")
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return domainerrors.ErrNotFound
	}
	return err
}

func (r *organizationGroupRepository) Create(ctx context.Context, group *entity.OrganizationGroup, memberIDs []uuid.UUID) error {
	memberIDs = normalizeOrganizationGroupMemberIDs(memberIDs)
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin organization group create: %w", err)
	}
	defer tx.Rollback(ctx)

	err = tx.QueryRow(ctx, `
		INSERT INTO organization_groups (owner_organization_id, name, description, created_by)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, updated_at
	`, group.OwnerOrganizationID, group.Name, group.Description, group.CreatedBy).Scan(&group.ID, &group.CreatedAt, &group.UpdatedAt)
	if err != nil {
		return mapOrganizationGroupError(err)
	}

	if err := insertOrganizationGroupMembers(ctx, tx, group.ID, memberIDs); err != nil {
		return err
	}
	group.MemberCount = len(memberIDs)
	return tx.Commit(ctx)
}

func (r *organizationGroupRepository) Update(ctx context.Context, group *entity.OrganizationGroup, memberIDs []uuid.UUID) error {
	memberIDs = normalizeOrganizationGroupMemberIDs(memberIDs)
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin organization group update: %w", err)
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		UPDATE organization_groups
		SET owner_organization_id = $2, name = $3, description = $4
		WHERE id = $1
	`, group.ID, group.OwnerOrganizationID, group.Name, group.Description)
	if err != nil {
		return mapOrganizationGroupError(err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}

	if _, err := tx.Exec(ctx, `DELETE FROM organization_group_members WHERE group_id = $1`, group.ID); err != nil {
		return fmt.Errorf("delete organization group members: %w", err)
	}
	if err := insertOrganizationGroupMembers(ctx, tx, group.ID, memberIDs); err != nil {
		return err
	}
	group.MemberCount = len(memberIDs)
	return tx.Commit(ctx)
}

func insertOrganizationGroupMembers(ctx context.Context, tx pgx.Tx, groupID uuid.UUID, memberIDs []uuid.UUID) error {
	for _, memberID := range memberIDs {
		if _, err := tx.Exec(ctx, `
			INSERT INTO organization_group_members (group_id, organization_id)
			VALUES ($1, $2)
			ON CONFLICT DO NOTHING
		`, groupID, memberID); err != nil {
			return fmt.Errorf("insert organization group member: %w", err)
		}
	}
	return nil
}

func (r *organizationGroupRepository) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM organization_groups WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete organization group: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

func (r *organizationGroupRepository) GetByID(ctx context.Context, id uuid.UUID) (*entity.OrganizationGroup, error) {
	group := &entity.OrganizationGroup{}
	err := r.pool.QueryRow(ctx, `
		SELECT g.id, g.owner_organization_id, COALESCE(owner.name, ''), g.name, g.description,
		       g.created_by, g.created_at, g.updated_at, COUNT(m.organization_id)
		FROM organization_groups g
		LEFT JOIN organizations owner ON owner.id = g.owner_organization_id
		LEFT JOIN organization_group_members m ON m.group_id = g.id
		WHERE g.id = $1
		GROUP BY g.id, owner.name
	`, id).Scan(&group.ID, &group.OwnerOrganizationID, &group.OwnerOrganizationName, &group.Name, &group.Description, &group.CreatedBy, &group.CreatedAt, &group.UpdatedAt, &group.MemberCount)
	if err != nil {
		return nil, mapOrganizationGroupError(err)
	}
	members, err := r.listMembers(ctx, id)
	if err != nil {
		return nil, err
	}
	group.Members = members
	return group, nil
}

func (r *organizationGroupRepository) List(ctx context.Context, filter repository.OrganizationGroupListFilter) ([]*entity.OrganizationGroup, int, error) {
	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 || limit > 100 {
		limit = 10
	}

	where, args := organizationGroupWhere(filter)
	countQuery := `SELECT COUNT(*) FROM organization_groups g ` + where
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count organization groups: %w", err)
	}

	offset := (page - 1) * limit
	args = append(args, limit, offset)
	dataQuery := `
		SELECT g.id, g.owner_organization_id, COALESCE(owner.name, ''), g.name, g.description,
		       g.created_by, g.created_at, g.updated_at, COUNT(m.organization_id)
		FROM organization_groups g
		LEFT JOIN organizations owner ON owner.id = g.owner_organization_id
		LEFT JOIN organization_group_members m ON m.group_id = g.id
	` + where + `
		GROUP BY g.id, owner.name
		ORDER BY g.name ASC
		LIMIT $` + fmt.Sprint(len(args)-1) + ` OFFSET $` + fmt.Sprint(len(args))

	rows, err := r.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list organization groups: %w", err)
	}
	defer rows.Close()

	groups := []*entity.OrganizationGroup{}
	for rows.Next() {
		group := &entity.OrganizationGroup{}
		if err := rows.Scan(&group.ID, &group.OwnerOrganizationID, &group.OwnerOrganizationName, &group.Name, &group.Description, &group.CreatedBy, &group.CreatedAt, &group.UpdatedAt, &group.MemberCount); err != nil {
			return nil, 0, fmt.Errorf("scan organization group: %w", err)
		}
		if filter.IncludeMembers {
			members, err := r.listMembers(ctx, group.ID)
			if err != nil {
				return nil, 0, err
			}
			group.Members = members
		}
		groups = append(groups, group)
	}
	return groups, total, nil
}

func organizationGroupWhere(filter repository.OrganizationGroupListFilter) (string, []interface{}) {
	clauses := []string{"WHERE 1=1"}
	args := []interface{}{}
	if filter.OwnerOrganizationID != nil {
		args = append(args, *filter.OwnerOrganizationID)
		clauses = append(clauses, fmt.Sprintf("AND g.owner_organization_id = $%d", len(args)))
	}
	if strings.TrimSpace(filter.Q) != "" {
		args = append(args, "%"+strings.TrimSpace(filter.Q)+"%")
		clauses = append(clauses, fmt.Sprintf("AND g.name ILIKE $%d", len(args)))
	}
	return strings.Join(clauses, " "), args
}

func (r *organizationGroupRepository) listMembers(ctx context.Context, groupID uuid.UUID) ([]entity.OrganizationGroupMember, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT o.id, o.name, o.parent_id, COALESCE(o.location, '')
		FROM organization_group_members m
		JOIN organizations o ON o.id = m.organization_id
		WHERE m.group_id = $1
		ORDER BY o.name ASC
	`, groupID)
	if err != nil {
		return nil, fmt.Errorf("list organization group members: %w", err)
	}
	defer rows.Close()

	members := []entity.OrganizationGroupMember{}
	for rows.Next() {
		var member entity.OrganizationGroupMember
		if err := rows.Scan(&member.ID, &member.Name, &member.ParentID, &member.Location); err != nil {
			return nil, fmt.Errorf("scan organization group member: %w", err)
		}
		members = append(members, member)
	}
	return members, nil
}

func (r *organizationGroupRepository) ListMemberIDs(ctx context.Context, id uuid.UUID) ([]uuid.UUID, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT organization_id
		FROM organization_group_members
		WHERE group_id = $1
		ORDER BY organization_id
	`, id)
	if err != nil {
		return nil, fmt.Errorf("list organization group member ids: %w", err)
	}
	defer rows.Close()

	ids := []uuid.UUID{}
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan organization group member id: %w", err)
		}
		ids = append(ids, id)
	}
	return ids, nil
}
```

- [ ] **Step 4: Run repository tests**

Run:

```bash
cd backend && go test ./internal/repository/postgres -run 'TestOrganizationGroupRepository' -count=1
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/repository/postgres/organization_group.go backend/internal/repository/postgres/organization_group_test.go
git commit -m "feat: add organization group repository"
```

## Task 3: Organization Group Usecases

**Files:**

- Create: `backend/internal/usecase/organizationgroup/create.go`
- Create: `backend/internal/usecase/organizationgroup/update.go`
- Create: `backend/internal/usecase/organizationgroup/list.go`
- Create: `backend/internal/usecase/organizationgroup/get.go`
- Create: `backend/internal/usecase/organizationgroup/delete.go`
- Create: `backend/internal/usecase/organizationgroup/resolve.go`
- Create: `backend/internal/usecase/organizationgroup/usecases_test.go`

- [ ] **Step 1: Write usecase tests**

Create `backend/internal/usecase/organizationgroup/usecases_test.go` with these test names and assertions:

```go
package organizationgroup

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type fakeGroupRepo struct {
	group     *entity.OrganizationGroup
	members   []uuid.UUID
	listTotal int
}

func (r *fakeGroupRepo) Create(_ context.Context, group *entity.OrganizationGroup, memberIDs []uuid.UUID) error {
	group.ID = uuid.New()
	r.group = group
	r.members = memberIDs
	return nil
}
func (r *fakeGroupRepo) Update(_ context.Context, group *entity.OrganizationGroup, memberIDs []uuid.UUID) error {
	r.group = group
	r.members = memberIDs
	return nil
}
func (r *fakeGroupRepo) Delete(context.Context, uuid.UUID) error { return nil }
func (r *fakeGroupRepo) GetByID(context.Context, uuid.UUID) (*entity.OrganizationGroup, error) {
	if r.group == nil {
		return nil, domainerrors.ErrNotFound
	}
	return r.group, nil
}
func (r *fakeGroupRepo) List(context.Context, repository.OrganizationGroupListFilter) ([]*entity.OrganizationGroup, int, error) {
	if r.group == nil {
		return []*entity.OrganizationGroup{}, 0, nil
	}
	return []*entity.OrganizationGroup{r.group}, r.listTotal, nil
}
func (r *fakeGroupRepo) ListMemberIDs(context.Context, uuid.UUID) ([]uuid.UUID, error) {
	if r.members == nil {
		return []uuid.UUID{}, nil
	}
	return r.members, nil
}

type fakeOrgRepo struct {
	descendants []uuid.UUID
}

func (r *fakeOrgRepo) Create(context.Context, *entity.Organization) error { return nil }
func (r *fakeOrgRepo) GetByID(_ context.Context, id uuid.UUID) (*entity.Organization, error) {
	return &entity.Organization{ID: id, Name: "Org"}, nil
}
func (r *fakeOrgRepo) Update(context.Context, *entity.Organization) error { return nil }
func (r *fakeOrgRepo) Delete(context.Context, uuid.UUID) error            { return nil }
func (r *fakeOrgRepo) List(context.Context) ([]*entity.Organization, error) {
	return nil, nil
}
func (r *fakeOrgRepo) ListWithFilter(context.Context, repository.OrganizationListFilter) ([]*entity.Organization, int, error) {
	return nil, 0, nil
}
func (r *fakeOrgRepo) GetContext(context.Context, uuid.UUID) (string, error) { return "", nil }
func (r *fakeOrgRepo) GetDescendants(context.Context, uuid.UUID) ([]uuid.UUID, error) {
	return r.descendants, nil
}

func TestCreateRejectsBlankName(t *testing.T) {
	owner := uuid.New()
	uc := NewCreateUseCase(&fakeGroupRepo{}, &fakeOrgRepo{descendants: []uuid.UUID{owner}})
	_, err := uc.Execute(context.Background(), CreateInput{
		OwnerOrganizationID: owner,
		Name:                " ",
		Scope:               unitScope(owner, owner),
	})
	if !errors.Is(err, domainerrors.ErrInvalidName) {
		t.Fatalf("expected invalid name, got %v", err)
	}
}

func TestCreateRejectsMemberOutsideDescendants(t *testing.T) {
	owner := uuid.New()
	inside := uuid.New()
	outside := uuid.New()
	uc := NewCreateUseCase(&fakeGroupRepo{}, &fakeOrgRepo{descendants: []uuid.UUID{owner, inside}})
	_, err := uc.Execute(context.Background(), CreateInput{
		OwnerOrganizationID:    owner,
		Name:                   "Jawa Timur",
		MemberOrganizationIDs:  []uuid.UUID{outside},
		Scope:                  unitScope(owner, owner, inside, outside),
	})
	if !errors.Is(err, domainerrors.ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestCreateAllowsOverlappingMemberSemantics(t *testing.T) {
	owner := uuid.New()
	member := uuid.New()
	repo := &fakeGroupRepo{}
	uc := NewCreateUseCase(repo, &fakeOrgRepo{descendants: []uuid.UUID{owner, member}})
	_, err := uc.Execute(context.Background(), CreateInput{
		OwnerOrganizationID:   owner,
		Name:                  "Jawa Timur",
		MemberOrganizationIDs: []uuid.UUID{member},
		Scope:                 unitScope(owner, owner, member),
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(repo.members) != 1 || repo.members[0] != member {
		t.Fatalf("expected member %s, got %v", member, repo.members)
	}
}

func TestCreateRejectsOwnerAsMember(t *testing.T) {
	owner := uuid.New()
	uc := NewCreateUseCase(&fakeGroupRepo{}, &fakeOrgRepo{descendants: []uuid.UUID{owner}})
	_, err := uc.Execute(context.Background(), CreateInput{
		OwnerOrganizationID:   owner,
		Name:                  "Owner Included",
		MemberOrganizationIDs: []uuid.UUID{owner},
		Scope:                 unitScope(owner, owner),
	})
	if !errors.Is(err, domainerrors.ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestNonGlobalCannotManageAnotherOwnerGroup(t *testing.T) {
	owner := uuid.New()
	other := uuid.New()
	uc := NewCreateUseCase(&fakeGroupRepo{}, &fakeOrgRepo{descendants: []uuid.UUID{other}})
	_, err := uc.Execute(context.Background(), CreateInput{
		OwnerOrganizationID: owner,
		Name:                "Jawa Timur",
		Scope:               unitScope(other, other),
	})
	if !errors.Is(err, domainerrors.ErrForbidden) {
		t.Fatalf("expected forbidden, got %v", err)
	}
}

func TestResolveMembersOnly(t *testing.T) {
	owner := uuid.New()
	member := uuid.New()
	groupID := uuid.New()
	repo := &fakeGroupRepo{
		group:   &entity.OrganizationGroup{ID: groupID, OwnerOrganizationID: owner, Name: "Jawa Timur"},
		members: []uuid.UUID{member},
	}
	uc := NewResolveUseCase(repo)
	got, err := uc.Execute(context.Background(), ResolveInput{
		GroupID: groupID,
		Scope:   unitScope(owner, owner, member),
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(got) != 1 || got[0] != member {
		t.Fatalf("expected members only [%s], got %v", member, got)
	}
}

func TestResolveEmptyGroupReturnsEmptySlice(t *testing.T) {
	owner := uuid.New()
	groupID := uuid.New()
	repo := &fakeGroupRepo{group: &entity.OrganizationGroup{ID: groupID, OwnerOrganizationID: owner, Name: "Kosong"}, members: []uuid.UUID{}}
	uc := NewResolveUseCase(repo)
	got, err := uc.Execute(context.Background(), ResolveInput{GroupID: groupID, Scope: unitScope(owner, owner)})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if got == nil || len(got) != 0 {
		t.Fatalf("expected empty non-nil slice, got %v", got)
	}
}

func unitScope(owner uuid.UUID, accessible ...uuid.UUID) *entity.AccessScope {
	return &entity.AccessScope{
		Role:             entity.RoleUnit,
		OrganizationID:   &owner,
		AccessibleOrgIDs: accessible,
	}
}
```

- [ ] **Step 2: Run usecase tests to verify failure**

Run:

```bash
cd backend && go test ./internal/usecase/organizationgroup -count=1
```

Expected: FAIL because the package/usecases do not exist.

- [ ] **Step 3: Implement shared input and validation in create usecase**

Create `backend/internal/usecase/organizationgroup/create.go`:

```go
package organizationgroup

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type CreateUseCase struct {
	groupRepo repository.OrganizationGroupRepository
	orgRepo   repository.OrganizationRepository
}

func NewCreateUseCase(groupRepo repository.OrganizationGroupRepository, orgRepo repository.OrganizationRepository) *CreateUseCase {
	return &CreateUseCase{groupRepo: groupRepo, orgRepo: orgRepo}
}

type CreateInput struct {
	OwnerOrganizationID   uuid.UUID   `json:"ownerOrganizationId"`
	Name                  string      `json:"name"`
	Description           string      `json:"description"`
	MemberOrganizationIDs []uuid.UUID `json:"memberOrganizationIds"`
	Scope                 *entity.AccessScope
}

func (uc *CreateUseCase) Execute(ctx context.Context, input CreateInput) (*entity.OrganizationGroup, error) {
	group := &entity.OrganizationGroup{
		OwnerOrganizationID: input.OwnerOrganizationID,
		Name:                input.Name,
		Description:         input.Description,
	}
	if input.Scope != nil {
		group.CreatedBy = &input.Scope.UserID
	}
	if err := group.Validate(); err != nil {
		return nil, err
	}
	if err := authorizeOwner(input.Scope, group.OwnerOrganizationID); err != nil {
		return nil, err
	}
	if err := validateMembers(ctx, uc.orgRepo, input.Scope, group.OwnerOrganizationID, input.MemberOrganizationIDs); err != nil {
		return nil, err
	}
	if err := uc.groupRepo.Create(ctx, group, input.MemberOrganizationIDs); err != nil {
		return nil, err
	}
	return group, nil
}

func authorizeOwner(scope *entity.AccessScope, ownerID uuid.UUID) error {
	if scope == nil || scope.IsGlobal {
		return nil
	}
	if scope.OrganizationID == nil || *scope.OrganizationID != ownerID {
		return domainerrors.ErrForbidden
	}
	return nil
}

func validateMembers(ctx context.Context, orgRepo repository.OrganizationRepository, scope *entity.AccessScope, ownerID uuid.UUID, memberIDs []uuid.UUID) error {
	descendants, err := orgRepo.GetDescendants(ctx, ownerID)
	if err != nil {
		return domainerrors.Wrap(err, "failed to load owner descendants")
	}
	descendantSet := make(map[uuid.UUID]struct{}, len(descendants))
	for _, id := range descendants {
		descendantSet[id] = struct{}{}
	}
	for _, id := range memberIDs {
		if id == uuid.Nil {
			return domainerrors.Wrap(domainerrors.ErrInvalidInput, "member organization id is required")
		}
		if id == ownerID {
			return domainerrors.Wrap(domainerrors.ErrInvalidInput, "owner organization cannot be a group member")
		}
		if _, ok := descendantSet[id]; !ok {
			return domainerrors.Wrap(domainerrors.ErrInvalidInput, "member organization must be owner descendant")
		}
		if scope != nil && !scope.CanRead(id) {
			return domainerrors.ErrForbidden
		}
	}
	return nil
}
```

- [ ] **Step 4: Implement update usecase**

Create `backend/internal/usecase/organizationgroup/update.go`:

```go
package organizationgroup

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type UpdateUseCase struct {
	groupRepo repository.OrganizationGroupRepository
	orgRepo   repository.OrganizationRepository
}

func NewUpdateUseCase(groupRepo repository.OrganizationGroupRepository, orgRepo repository.OrganizationRepository) *UpdateUseCase {
	return &UpdateUseCase{groupRepo: groupRepo, orgRepo: orgRepo}
}

type UpdateInput struct {
	ID                    uuid.UUID   `json:"-"`
	OwnerOrganizationID   uuid.UUID   `json:"ownerOrganizationId"`
	Name                  string      `json:"name"`
	Description           string      `json:"description"`
	MemberOrganizationIDs []uuid.UUID `json:"memberOrganizationIds"`
	Scope                 *entity.AccessScope
}

func (uc *UpdateUseCase) Execute(ctx context.Context, input UpdateInput) (*entity.OrganizationGroup, error) {
	existing, err := uc.groupRepo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, err
	}
	if err := authorizeOwner(input.Scope, existing.OwnerOrganizationID); err != nil {
		return nil, err
	}
	group := &entity.OrganizationGroup{
		ID:                  input.ID,
		OwnerOrganizationID: input.OwnerOrganizationID,
		Name:                input.Name,
		Description:         input.Description,
	}
	if err := group.Validate(); err != nil {
		return nil, err
	}
	if err := authorizeOwner(input.Scope, group.OwnerOrganizationID); err != nil {
		return nil, err
	}
	if err := validateMembers(ctx, uc.orgRepo, input.Scope, group.OwnerOrganizationID, input.MemberOrganizationIDs); err != nil {
		return nil, err
	}
	if err := uc.groupRepo.Update(ctx, group, input.MemberOrganizationIDs); err != nil {
		return nil, err
	}
	return uc.groupRepo.GetByID(ctx, group.ID)
}
```

- [ ] **Step 5: Implement list/get/delete/resolve usecases**

Create `backend/internal/usecase/organizationgroup/list.go`:

```go
package organizationgroup

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type ListUseCase struct {
	groupRepo repository.OrganizationGroupRepository
}

func NewListUseCase(groupRepo repository.OrganizationGroupRepository) *ListUseCase {
	return &ListUseCase{groupRepo: groupRepo}
}

type ListInput struct {
	OwnerOrganizationID *uuid.UUID
	Q                   string
	Page                int
	Limit               int
	IncludeMembers      bool
	Scope               *entity.AccessScope
}

type ListOutput struct {
	Data  []*entity.OrganizationGroup `json:"data"`
	Total int                         `json:"total"`
	Page  int                         `json:"page"`
	Limit int                         `json:"limit"`
}

func (uc *ListUseCase) Execute(ctx context.Context, input ListInput) (*ListOutput, error) {
	if input.Page < 1 {
		input.Page = 1
	}
	if input.Limit < 1 || input.Limit > 100 {
		input.Limit = 10
	}
	ownerID := input.OwnerOrganizationID
	if input.Scope != nil && !input.Scope.IsGlobal {
		if input.Scope.OrganizationID == nil {
			return nil, domainForbidden()
		}
		if ownerID != nil && *ownerID != *input.Scope.OrganizationID {
			return nil, domainForbidden()
		}
		ownerID = input.Scope.OrganizationID
	}
	groups, total, err := uc.groupRepo.List(ctx, repository.OrganizationGroupListFilter{
		OwnerOrganizationID: ownerID,
		Q:                   input.Q,
		Page:                input.Page,
		Limit:               input.Limit,
		IncludeMembers:      input.IncludeMembers,
	})
	if err != nil {
		return nil, err
	}
	if groups == nil {
		groups = []*entity.OrganizationGroup{}
	}
	return &ListOutput{Data: groups, Total: total, Page: input.Page, Limit: input.Limit}, nil
}
```

Create `backend/internal/usecase/organizationgroup/get.go`:

```go
package organizationgroup

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type GetUseCase struct {
	groupRepo repository.OrganizationGroupRepository
}

func NewGetUseCase(groupRepo repository.OrganizationGroupRepository) *GetUseCase {
	return &GetUseCase{groupRepo: groupRepo}
}

type GetInput struct {
	ID    uuid.UUID
	Scope *entity.AccessScope
}

func (uc *GetUseCase) Execute(ctx context.Context, input GetInput) (*entity.OrganizationGroup, error) {
	group, err := uc.groupRepo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, err
	}
	if err := authorizeOwner(input.Scope, group.OwnerOrganizationID); err != nil {
		return nil, err
	}
	return group, nil
}
```

Create `backend/internal/usecase/organizationgroup/delete.go`:

```go
package organizationgroup

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type DeleteUseCase struct {
	groupRepo repository.OrganizationGroupRepository
}

func NewDeleteUseCase(groupRepo repository.OrganizationGroupRepository) *DeleteUseCase {
	return &DeleteUseCase{groupRepo: groupRepo}
}

type DeleteInput struct {
	ID    uuid.UUID
	Scope *entity.AccessScope
}

type DeleteOutput struct {
	Message string `json:"message"`
}

func (uc *DeleteUseCase) Execute(ctx context.Context, input DeleteInput) (*DeleteOutput, error) {
	group, err := uc.groupRepo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, err
	}
	if err := authorizeOwner(input.Scope, group.OwnerOrganizationID); err != nil {
		return nil, err
	}
	if err := uc.groupRepo.Delete(ctx, input.ID); err != nil {
		return nil, err
	}
	return &DeleteOutput{Message: "Organization group deleted successfully"}, nil
}
```

Create `backend/internal/usecase/organizationgroup/resolve.go`:

```go
package organizationgroup

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type ResolveUseCase struct {
	groupRepo repository.OrganizationGroupRepository
}

func NewResolveUseCase(groupRepo repository.OrganizationGroupRepository) *ResolveUseCase {
	return &ResolveUseCase{groupRepo: groupRepo}
}

type ResolveInput struct {
	GroupID uuid.UUID
	Scope   *entity.AccessScope
}

func (uc *ResolveUseCase) Execute(ctx context.Context, input ResolveInput) ([]uuid.UUID, error) {
	group, err := uc.groupRepo.GetByID(ctx, input.GroupID)
	if err != nil {
		return nil, err
	}
	if err := authorizeOwner(input.Scope, group.OwnerOrganizationID); err != nil {
		return nil, err
	}
	memberIDs, err := uc.groupRepo.ListMemberIDs(ctx, input.GroupID)
	if err != nil {
		return nil, err
	}
	if memberIDs == nil {
		memberIDs = []uuid.UUID{}
	}
	for _, id := range memberIDs {
		if input.Scope != nil && !input.Scope.CanRead(id) {
			return nil, domainerrors.ErrForbidden
		}
	}
	return memberIDs, nil
}

func domainForbidden() error {
	return domainerrors.ErrForbidden
}
```

- [ ] **Step 6: Run usecase tests**

Run:

```bash
cd backend && go test ./internal/usecase/organizationgroup -count=1
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/internal/usecase/organizationgroup
git commit -m "feat: add organization group usecases"
```

## Task 4: HTTP Handler, Bootstrap, And Routes

**Files:**

- Create: `backend/internal/handler/http/organization_group.go`
- Create: `backend/internal/handler/http/organization_group_test.go`
- Modify: `backend/internal/bootstrap/bootstrap.go`
- Modify: `backend/cmd/server/main.go`

- [ ] **Step 1: Add handler tests**

Create `backend/internal/handler/http/organization_group_test.go` with table tests for:

```go
func TestOrganizationGroupHandlerCreateRejectsInvalidBody(t *testing.T)
func TestOrganizationGroupHandlerListParsesOwnerAndPagination(t *testing.T)
func TestOrganizationGroupHandlerMapsConflictTo409(t *testing.T)
func TestOrganizationGroupHandlerDeleteParsesID(t *testing.T)
```

Use Fiber `httptest` as in existing handler tests. The conflict test should configure a fake create usecase returning `domainerrors.ErrConflict` and assert `response.StatusCode == fiber.StatusConflict`.

- [ ] **Step 2: Run handler tests to verify failure**

Run:

```bash
cd backend && go test ./internal/handler/http -run 'TestOrganizationGroupHandler' -count=1
```

Expected: FAIL because handler does not exist.

- [ ] **Step 3: Implement handler**

Create `backend/internal/handler/http/organization_group.go`:

```go
package http

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/middleware"
	organizationgroupuc "github.com/manris/backend/internal/usecase/organizationgroup"
)

type OrganizationGroupHandler struct {
	createUC *organizationgroupuc.CreateUseCase
	updateUC *organizationgroupuc.UpdateUseCase
	listUC   *organizationgroupuc.ListUseCase
	getUC    *organizationgroupuc.GetUseCase
	deleteUC *organizationgroupuc.DeleteUseCase
}

func NewOrganizationGroupHandler(
	createUC *organizationgroupuc.CreateUseCase,
	updateUC *organizationgroupuc.UpdateUseCase,
	listUC *organizationgroupuc.ListUseCase,
	getUC *organizationgroupuc.GetUseCase,
	deleteUC *organizationgroupuc.DeleteUseCase,
) *OrganizationGroupHandler {
	return &OrganizationGroupHandler{createUC: createUC, updateUC: updateUC, listUC: listUC, getUC: getUC, deleteUC: deleteUC}
}

func (h *OrganizationGroupHandler) List(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	var ownerID *uuid.UUID
	if raw := c.Query("owner_organization_id"); raw != "" {
		parsed, err := uuid.Parse(raw)
		if err != nil {
			return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid owner organization ID")
		}
		ownerID = &parsed
	}
	result, err := h.listUC.Execute(c.Context(), organizationgroupuc.ListInput{
		OwnerOrganizationID: ownerID,
		Q:                   c.Query("q"),
		Page:                page,
		Limit:               limit,
		IncludeMembers:      c.Query("include_members") == "true",
		Scope:               middleware.GetAccessScope(c),
	})
	if err != nil {
		return handleOrganizationGroupError(c, err)
	}
	return c.JSON(result)
}

func (h *OrganizationGroupHandler) Create(c *fiber.Ctx) error {
	var input organizationgroupuc.CreateInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}
	input.Scope = middleware.GetAccessScope(c)
	result, err := h.createUC.Execute(c.Context(), input)
	if err != nil {
		return handleOrganizationGroupError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": result})
}

func (h *OrganizationGroupHandler) Get(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization group ID")
	}
	result, err := h.getUC.Execute(c.Context(), organizationgroupuc.GetInput{ID: id, Scope: middleware.GetAccessScope(c)})
	if err != nil {
		return handleOrganizationGroupError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}

func (h *OrganizationGroupHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization group ID")
	}
	var input organizationgroupuc.UpdateInput
	if err := c.BodyParser(&input); err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}
	input.ID = id
	input.Scope = middleware.GetAccessScope(c)
	result, err := h.updateUC.Execute(c.Context(), input)
	if err != nil {
		return handleOrganizationGroupError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}

func (h *OrganizationGroupHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return sendProblemDetails(c, 400, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization group ID")
	}
	result, err := h.deleteUC.Execute(c.Context(), organizationgroupuc.DeleteInput{ID: id, Scope: middleware.GetAccessScope(c)})
	if err != nil {
		return handleOrganizationGroupError(c, err)
	}
	return c.JSON(fiber.Map{"data": result})
}

func handleOrganizationGroupError(c *fiber.Ctx, err error) error {
	switch {
	case domainerrors.IsNotFound(err):
		return sendProblemDetails(c, fiber.StatusNotFound, "Not Found", "https://api.manris.com/errors/not-found", err.Error())
	case domainerrors.IsConflict(err):
		return sendProblemDetails(c, fiber.StatusConflict, "Conflict", "https://api.manris.com/errors/conflict", err.Error())
	case domainerrors.IsValidation(err):
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/validation", err.Error())
	case domainerrors.IsForbidden(err):
		return sendProblemDetails(c, fiber.StatusForbidden, "Forbidden", "https://api.manris.com/errors/forbidden", err.Error())
	default:
		return sendProblemDetails(c, fiber.StatusInternalServerError, "Server Error", "https://api.manris.com/errors/server-error", err.Error())
	}
}
```

- [ ] **Step 4: Wire bootstrap**

Modify `backend/internal/bootstrap/bootstrap.go`:

Add import:

```go
organizationgroupuc "github.com/manris/backend/internal/usecase/organizationgroup"
```

Add container fields:

```go
OrgGroupRepository domainrepo.OrganizationGroupRepository
OrgGroupCreateUC   *organizationgroupuc.CreateUseCase
OrgGroupUpdateUC   *organizationgroupuc.UpdateUseCase
OrgGroupListUC     *organizationgroupuc.ListUseCase
OrgGroupGetUC      *organizationgroupuc.GetUseCase
OrgGroupDeleteUC   *organizationgroupuc.DeleteUseCase
OrgGroupResolveUC  *organizationgroupuc.ResolveUseCase
```

Initialize repository near organization repository:

```go
c.OrgGroupRepository = postgresrepo.NewOrganizationGroupRepository(pool)
```

Initialize usecases after organization usecases:

```go
c.OrgGroupCreateUC = organizationgroupuc.NewCreateUseCase(c.OrgGroupRepository, c.OrgRepository)
c.OrgGroupUpdateUC = organizationgroupuc.NewUpdateUseCase(c.OrgGroupRepository, c.OrgRepository)
c.OrgGroupListUC = organizationgroupuc.NewListUseCase(c.OrgGroupRepository)
c.OrgGroupGetUC = organizationgroupuc.NewGetUseCase(c.OrgGroupRepository)
c.OrgGroupDeleteUC = organizationgroupuc.NewDeleteUseCase(c.OrgGroupRepository)
c.OrgGroupResolveUC = organizationgroupuc.NewResolveUseCase(c.OrgGroupRepository)
```

- [ ] **Step 5: Register routes**

Modify `backend/cmd/server/main.go`:

Create handler after organization handler:

```go
orgGroupHandler := httpHandler.NewOrganizationGroupHandler(
	container.OrgGroupCreateUC,
	container.OrgGroupUpdateUC,
	container.OrgGroupListUC,
	container.OrgGroupGetUC,
	container.OrgGroupDeleteUC,
)
```

Register protected routes near organizations:

```go
protected.Get("/organization-groups", orgGroupHandler.List)
protected.Post("/organization-groups", orgGroupHandler.Create)
protected.Get("/organization-groups/:id", orgGroupHandler.Get)
protected.Put("/organization-groups/:id", orgGroupHandler.Update)
protected.Delete("/organization-groups/:id", orgGroupHandler.Delete)
```

- [ ] **Step 6: Run handler and bootstrap compile tests**

Run:

```bash
cd backend && go test ./internal/handler/http ./internal/bootstrap
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/internal/handler/http/organization_group.go backend/internal/handler/http/organization_group_test.go backend/internal/bootstrap/bootstrap.go backend/cmd/server/main.go
git commit -m "feat: expose organization group API"
```

## Task 5: Backend Report Scope Resolver

**Files:**

- Modify: `backend/internal/handler/http/access_surface_scope.go`
- Modify: `backend/internal/handler/http/access_surface_scope_test.go`
- Modify: report handlers listed in File Map.

- [ ] **Step 1: Add resolver tests**

Append tests to `backend/internal/handler/http/access_surface_scope_test.go`:

```go
func TestResolveReportScopeOrgIDsRejectsOrgAndGroupTogether(t *testing.T) {
	_, err := resolveReportScopeOrgIDs(context.Background(), nil, nil, uuid.New().String(), uuid.New().String())
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestResolveReportScopeOrgIDsUsesGroupMembers(t *testing.T) {
	owner := uuid.New()
	member := uuid.New()
	groupID := uuid.New()
	resolver := fakeReportGroupResolver{ids: []uuid.UUID{member}}
	scope := &entity.AccessScope{OrganizationID: &owner, AccessibleOrgIDs: []uuid.UUID{owner, member}}
	got, err := resolveReportScopeOrgIDs(context.Background(), scope, resolver, "", groupID.String())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(got) != 1 || got[0] != member {
		t.Fatalf("expected group member %s, got %v", member, got)
	}
}

func TestResolveReportScopeOrgIDsEmptyGroupStaysEmpty(t *testing.T) {
	owner := uuid.New()
	groupID := uuid.New()
	resolver := fakeReportGroupResolver{ids: []uuid.UUID{}}
	scope := &entity.AccessScope{OrganizationID: &owner, AccessibleOrgIDs: []uuid.UUID{owner}}
	got, err := resolveReportScopeOrgIDs(context.Background(), scope, resolver, "", groupID.String())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if got == nil || len(got) != 0 {
		t.Fatalf("expected empty non-nil slice, got %v", got)
	}
}

type fakeReportGroupResolver struct {
	ids []uuid.UUID
	err error
}

func (r fakeReportGroupResolver) ResolveReportGroup(ctx context.Context, groupID uuid.UUID, scope *entity.AccessScope) ([]uuid.UUID, error) {
	return r.ids, r.err
}
```

Add imports:

```go
import "context"
```

- [ ] **Step 2: Run resolver tests to verify failure**

Run:

```bash
cd backend && go test ./internal/handler/http -run 'TestResolveReportScopeOrgIDs' -count=1
```

Expected: FAIL because `resolveReportScopeOrgIDs` and interface do not exist.

- [ ] **Step 3: Implement shared resolver**

Modify `backend/internal/handler/http/access_surface_scope.go`:

```go
import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

type ReportGroupResolver interface {
	ResolveReportGroup(ctx context.Context, groupID uuid.UUID, scope *entity.AccessScope) ([]uuid.UUID, error)
}

func resolveReportScopeOrgIDs(ctx context.Context, scope *entity.AccessScope, groupResolver ReportGroupResolver, rawOrgID string, rawGroupID string) ([]uuid.UUID, error) {
	if rawOrgID != "" && rawGroupID != "" {
		return nil, domainerrors.Wrap(domainerrors.ErrInvalidInput, "org_id and organization_group_id are mutually exclusive")
	}
	if rawGroupID == "" {
		return resolveReportOrgIDs(scope, rawOrgID)
	}
	if groupResolver == nil {
		return nil, domainerrors.Wrap(domainerrors.ErrInvalidInput, "organization group resolver is not configured")
	}
	groupID, err := uuid.Parse(rawGroupID)
	if err != nil {
		return nil, err
	}
	orgIDs, err := groupResolver.ResolveReportGroup(ctx, groupID, scope)
	if err != nil {
		return nil, err
	}
	if orgIDs == nil {
		return []uuid.UUID{}, nil
	}
	return orgIDs, nil
}
```

Add adapter method to `backend/internal/usecase/organizationgroup/resolve.go`:

```go
func (uc *ResolveUseCase) ResolveReportGroup(ctx context.Context, groupID uuid.UUID, scope *entity.AccessScope) ([]uuid.UUID, error) {
	return uc.Execute(ctx, ResolveInput{GroupID: groupID, Scope: scope})
}
```

- [ ] **Step 4: Run resolver tests**

Run:

```bash
cd backend && go test ./internal/handler/http -run 'TestResolveReportScopeOrgIDs|TestResolveReportOrgIDs' -count=1
```

Expected: PASS.

- [ ] **Step 5: Update report handlers**

For each handler currently calling `resolveReportOrgIDs(scope, c.Query("org_id"))`, replace with:

```go
orgIDs, err := resolveReportScopeOrgIDs(c.Context(), scope, h.orgGroupResolver, c.Query("org_id"), c.Query("organization_group_id"))
```

For handlers using `organization_id`, use:

```go
orgIDs, err := resolveReportScopeOrgIDs(c.Context(), scope, h.orgGroupResolver, c.Query("organization_id"), c.Query("organization_group_id"))
```

Add `orgGroupResolver ReportGroupResolver` field and constructor parameter to:

- `ReportHandler`
- `RiskHandler`
- `PerformanceRiskHandler`
- `FormalReportHandler`
- `TMPMRHandler`
- `EvaluationHandler`

Update `backend/cmd/server/main.go` constructors to pass `container.OrgGroupResolveUC`.

- [ ] **Step 6: Run report handler tests**

Run:

```bash
cd backend && go test ./internal/handler/http -run 'Report|Risk|TMPMR|Evaluation|Formal|Performance' -count=1
```

Expected: PASS after updating constructor calls in tests to provide nil or fake resolver. Tests that do not exercise group filtering may pass `nil` because resolver is only required when `organization_group_id` is present.

- [ ] **Step 7: Commit**

```bash
git add backend/internal/handler/http/access_surface_scope.go backend/internal/handler/http/access_surface_scope_test.go backend/internal/handler/http/report.go backend/internal/handler/http/risk.go backend/internal/handler/http/performance_risk.go backend/internal/handler/http/formal_report.go backend/internal/handler/http/tmpmr.go backend/internal/handler/http/evaluation.go backend/internal/usecase/organizationgroup/resolve.go backend/cmd/server/main.go
git commit -m "feat: support organization group report scope"
```

## Task 6: Frontend API And Query Helpers

**Files:**

- Create: `frontend/src/lib/api/organization-groups.ts`
- Create: `frontend/src/lib/report-scope-query.ts`
- Create: `frontend/src/lib/report-scope-query.test.ts`
- Modify: `frontend/src/types/formal-report.ts`

- [ ] **Step 1: Add query helper tests**

Create `frontend/src/lib/report-scope-query.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildReportScopeQuery,
  getReportScopeOrgId,
  type ReportScopeSelection,
} from "./report-scope-query";

test("buildReportScopeQuery returns empty string for global all organizations", () => {
  const selection: ReportScopeSelection = { mode: "organization", organizationId: "" };
  assert.equal(buildReportScopeQuery(selection), "");
});

test("buildReportScopeQuery sends org_id in organization mode", () => {
  const selection: ReportScopeSelection = { mode: "organization", organizationId: "org-1" };
  assert.equal(buildReportScopeQuery(selection), "org_id=org-1");
});

test("buildReportScopeQuery sends organization_group_id in group mode", () => {
  const selection: ReportScopeSelection = { mode: "group", organizationGroupId: "group-1" };
  assert.equal(buildReportScopeQuery(selection), "organization_group_id=group-1");
});

test("getReportScopeOrgId returns id only in organization mode", () => {
  assert.equal(getReportScopeOrgId({ mode: "organization", organizationId: "org-1" }), "org-1");
  assert.equal(getReportScopeOrgId({ mode: "group", organizationGroupId: "group-1" }), "");
});
```

- [ ] **Step 2: Run query helper tests to verify failure**

Run:

```bash
cd frontend && node --test src/lib/report-scope-query.test.ts
```

Expected: FAIL because helper does not exist.

- [ ] **Step 3: Implement organization group API client**

Create `frontend/src/lib/api/organization-groups.ts`:

```ts
import { api } from "@/lib/api";

export interface OrganizationGroupMember {
  id: string;
  name: string;
  parentId?: string;
  location?: string;
}

export interface OrganizationGroup {
  id: string;
  ownerOrganizationId: string;
  ownerOrganizationName?: string;
  name: string;
  description: string;
  memberCount: number;
  members?: OrganizationGroupMember[];
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationGroupPayload {
  ownerOrganizationId: string;
  name: string;
  description?: string;
  memberOrganizationIds: string[];
}

export interface ListOrganizationGroupsParams {
  ownerOrganizationId?: string;
  q?: string;
  page?: number;
  limit?: number;
  includeMembers?: boolean;
}

export interface PaginatedOrganizationGroupsResponse {
  data: OrganizationGroup[];
  total: number;
  page: number;
  limit: number;
}

function buildQuery(params?: ListOrganizationGroupsParams) {
  const searchParams = new URLSearchParams();
  if (params?.ownerOrganizationId) searchParams.set("owner_organization_id", params.ownerOrganizationId);
  if (params?.q) searchParams.set("q", params.q);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.includeMembers) searchParams.set("include_members", "true");
  return searchParams.toString();
}

export async function listOrganizationGroups(token: string, params?: ListOrganizationGroupsParams) {
  const qs = buildQuery(params);
  return api.get<PaginatedOrganizationGroupsResponse>(`/organization-groups${qs ? `?${qs}` : ""}`, token);
}

export async function createOrganizationGroup(token: string, payload: OrganizationGroupPayload) {
  return api.post<OrganizationGroup>("/organization-groups", payload, token);
}

export async function updateOrganizationGroup(token: string, id: string, payload: OrganizationGroupPayload) {
  return api.put<OrganizationGroup>(`/organization-groups/${id}`, payload, token);
}

export async function deleteOrganizationGroup(token: string, id: string) {
  return api.delete<{ message: string }>(`/organization-groups/${id}`, token);
}
```

- [ ] **Step 4: Implement report scope query helper**

Create `frontend/src/lib/report-scope-query.ts`:

```ts
export type ReportScopeSelection =
  | { mode: "organization"; organizationId: string }
  | { mode: "group"; organizationGroupId: string };

export function buildReportScopeQuery(selection: ReportScopeSelection) {
  const params = new URLSearchParams();
  if (selection.mode === "organization" && selection.organizationId) {
    params.set("org_id", selection.organizationId);
  }
  if (selection.mode === "group" && selection.organizationGroupId) {
    params.set("organization_group_id", selection.organizationGroupId);
  }
  return params.toString();
}

export function appendReportScopeQuery(basePath: string, selection: ReportScopeSelection) {
  const query = buildReportScopeQuery(selection);
  if (!query) return basePath;
  return `${basePath}${basePath.includes("?") ? "&" : "?"}${query}`;
}

export function getReportScopeOrgId(selection: ReportScopeSelection) {
  return selection.mode === "organization" ? selection.organizationId : "";
}

export function getReportScopeGroupId(selection: ReportScopeSelection) {
  return selection.mode === "group" ? selection.organizationGroupId : "";
}
```

- [ ] **Step 5: Extend formal report params**

Modify `frontend/src/types/formal-report.ts` list params:

```ts
export interface ListFormalReportsParams {
  organizationId?: string;
  organizationGroupId?: string;
  period?: string;
  reportType?: string;
  status?: string;
  page?: number;
  limit?: number;
}
```

Modify `frontend/src/lib/api/formal-reports.ts` query builder:

```ts
if (params?.organizationGroupId) {
  searchParams.set("organization_group_id", params.organizationGroupId);
}
```

- [ ] **Step 6: Run frontend helper tests**

Run:

```bash
cd frontend && node --test src/lib/report-scope-query.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/api/organization-groups.ts frontend/src/lib/report-scope-query.ts frontend/src/lib/report-scope-query.test.ts frontend/src/types/formal-report.ts frontend/src/lib/api/formal-reports.ts
git commit -m "feat: add organization group frontend API"
```

## Task 7: Admin Organization Groups UI

**Files:**

- Create: `frontend/src/components/organization/organization-group-form-dialog.tsx`
- Create: `frontend/src/components/organization/organization-group-delete-dialog.tsx`
- Create: `frontend/src/components/organization/organization-groups-tab.tsx`
- Modify: `frontend/src/app/(app)/admin/organizations/page.tsx`

- [ ] **Step 1: Create group form dialog**

Create `frontend/src/components/organization/organization-group-form-dialog.tsx` using existing `Dialog`, `Button`, `Input`, `Textarea` if present, `Badge`, and `ScrollArea` components. Props:

```ts
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token?: string;
  ownerOrganizationId: string;
  organizations: Organization[];
  initialGroup?: OrganizationGroup;
  onSuccess: () => void;
};
```

Core behavior:

- State: `name`, `description`, `memberIds`, `search`, `submitting`.
- Filter options to organizations whose `id !== ownerOrganizationId`.
- On submit call `createOrganizationGroup` or `updateOrganizationGroup`.
- Payload:

```ts
{
  ownerOrganizationId,
  name: name.trim(),
  description: description.trim(),
  memberOrganizationIds: memberIds,
}
```

- Show `toast.error("Nama group wajib diisi.")` when name is blank.
- Allow `memberIds` empty.

- [ ] **Step 2: Create delete dialog**

Create `frontend/src/components/organization/organization-group-delete-dialog.tsx` with props:

```ts
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token?: string;
  group?: OrganizationGroup;
  onSuccess: () => void;
};
```

On confirm:

```ts
await deleteOrganizationGroup(token, group.id);
toast.success("Organization group berhasil dihapus.");
onSuccess();
onOpenChange(false);
```

- [ ] **Step 3: Create groups tab**

Create `frontend/src/components/organization/organization-groups-tab.tsx` with props:

```ts
type Props = {
  token?: string;
  ownerOrganizationId: string;
  organizations: Organization[];
};
```

Behavior:

- Fetch `listOrganizationGroups(token, { ownerOrganizationId, page, limit, q: search, includeMembers: true })`.
- Table columns: `Nama Group`, `Jumlah Unit`, `Deskripsi`, `Dibuat`, `Aksi`.
- `Tambah Group` opens form dialog.
- Edit opens form dialog with `initialGroup`.
- Delete opens delete dialog.
- Empty state text: `Belum ada organization group`.

- [ ] **Step 4: Modify admin organization page to tabs**

Modify `frontend/src/app/(app)/admin/organizations/page.tsx`:

- Import `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`.
- Import `OrganizationGroupsTab`.
- Wrap existing content below header in:

```tsx
<Tabs defaultValue="structure" className="space-y-4">
  <TabsList>
    <TabsTrigger value="structure">Struktur Organisasi</TabsTrigger>
    <TabsTrigger value="groups">Organization Groups</TabsTrigger>
  </TabsList>
  <TabsContent value="structure" className="space-y-4">
    {/* existing KPI, search, table, dialogs */}
  </TabsContent>
  <TabsContent value="groups">
    <OrganizationGroupsTab
      token={token ?? undefined}
      ownerOrganizationId={user?.organizationId ?? ""}
      organizations={allOrganizations}
    />
  </TabsContent>
</Tabs>
```

If `user?.organizationId` is empty and user is not global, show:

```tsx
<p className="text-sm text-muted-foreground">
  Organization group membutuhkan organisasi pengguna.
</p>
```

- [ ] **Step 5: Run lint/build focused on frontend**

Run:

```bash
cd frontend && npm run lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/organization/organization-group-form-dialog.tsx frontend/src/components/organization/organization-group-delete-dialog.tsx frontend/src/components/organization/organization-groups-tab.tsx frontend/src/app/\(app\)/admin/organizations/page.tsx
git commit -m "feat: add organization group admin UI"
```

## Task 8: Reusable Report Scope Picker

**Files:**

- Create: `frontend/src/components/report/report-scope-picker.tsx`
- Modify report pages listed in File Map.

- [ ] **Step 1: Create report scope picker**

Create `frontend/src/components/report/report-scope-picker.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import { OrganizationPicker } from "@/components/report/organization-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OrganizationListItem } from "@/lib/api/organizations";
import type { OrganizationGroup } from "@/lib/api/organization-groups";
import type { ReportScopeSelection } from "@/lib/report-scope-query";

type Props = {
  value: ReportScopeSelection;
  organizations: OrganizationListItem[];
  organizationGroups: OrganizationGroup[];
  onChange: (value: ReportScopeSelection) => void;
  disabled?: boolean;
};

export function ReportScopePicker({ value, organizations, organizationGroups, onChange, disabled }: Props) {
  const [mode, setMode] = useState<ReportScopeSelection["mode"]>(value.mode);

  useEffect(() => {
    setMode(value.mode);
  }, [value.mode]);

  const groupOptions = useMemo(
    () => organizationGroups.map((group) => ({ id: group.id, name: `${group.name} (${group.memberCount} unit)` })),
    [organizationGroups],
  );

  return (
    <div className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)]">
      <Select
        value={mode}
        disabled={disabled}
        onValueChange={(nextMode) => {
          const typedMode = nextMode as ReportScopeSelection["mode"];
          setMode(typedMode);
          if (typedMode === "organization") {
            onChange({ mode: "organization", organizationId: "" });
          } else {
            onChange({ mode: "group", organizationGroupId: "" });
          }
        }}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="organization">Organisasi</SelectItem>
          <SelectItem value="group">Organization Group</SelectItem>
        </SelectContent>
      </Select>
      {mode === "organization" ? (
        <OrganizationPicker
          value={value.mode === "organization" ? value.organizationId : ""}
          organizations={organizations}
          onChange={(organizationId) => onChange({ mode: "organization", organizationId })}
        />
      ) : (
        <OrganizationPicker
          value={value.mode === "group" ? value.organizationGroupId : ""}
          organizations={groupOptions}
          onChange={(organizationGroupId) => onChange({ mode: "group", organizationGroupId })}
          searchPlaceholder="Cari group..."
          emptyMessage="Belum ada organization group."
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update Reports page state and fetching**

Modify `frontend/src/app/(app)/reports/page.tsx`:

- Add `organizationGroups` state.
- Add `reportScope` state:

```ts
const [reportScope, setReportScope] = useState<ReportScopeSelection>({
  mode: "organization",
  organizationId: "",
});
```

- Replace `reportOrgId` reads with `getReportScopeOrgId(reportScope)`.
- Replace `reportOrgQuery` with:

```ts
const reportScopeQuery = buildReportScopeQuery(reportScope);
const reportScopeSuffix = reportScopeQuery ? `&${reportScopeQuery}` : "";
```

- Fetch groups:

```ts
listOrganizationGroups(token, {
  ownerOrganizationId: user?.isGlobal ? undefined : user?.organizationId ?? undefined,
  limit: 100,
}).then((result) => setOrganizationGroups(result.data));
```

- Render:

```tsx
<ReportScopePicker
  value={reportScope}
  organizations={reportOrganizations}
  organizationGroups={organizationGroups}
  onChange={setReportScope}
/>
```

- Ensure `requiresReportOrgSelection` checks only organization mode:

```ts
const missingRequiredScope =
  requiresReportOrgSelection &&
  reportScope.mode === "organization" &&
  !reportScope.organizationId;
```

- [ ] **Step 3: Update compliance monitoring and risk cycle detail pages**

Apply the same state pattern:

```ts
const [reportScope, setReportScope] = useState<ReportScopeSelection>({ mode: "organization", organizationId: "" });
const reportScopeQuery = buildReportScopeQuery(reportScope);
const queryPrefix = reportScopeQuery ? `?${reportScopeQuery}` : "";
```

For URLs that already have query parameters, append `&${reportScopeQuery}`.

- [ ] **Step 4: Update performance risk filter bar**

Modify `frontend/src/app/(app)/reports/performance-risk/_components/filter-bar.tsx` props:

```ts
reportScope: ReportScopeSelection;
organizationGroups: OrganizationGroup[];
onReportScopeChange: (value: ReportScopeSelection) => void;
```

Replace `OrganizationPicker` with `ReportScopePicker`.

Modify `frontend/src/app/(app)/reports/performance-risk/page.tsx` to build API params:

```ts
const scopeQuery = buildReportScopeQuery(reportScope);
const scopeSuffix = scopeQuery ? `&${scopeQuery}` : "";
```

- [ ] **Step 5: Update evaluations and formal report listing**

Use `organizationGroupId: getReportScopeGroupId(reportScope)` when calling formal/evaluation list APIs. Keep `organizationId: getReportScopeOrgId(reportScope)` for organization mode.

- [ ] **Step 6: Run frontend checks**

Run:

```bash
cd frontend && node --test src/lib/report-scope-query.test.ts && npm run lint
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/report/report-scope-picker.tsx frontend/src/app/\(app\)/reports/page.tsx frontend/src/app/\(app\)/reports/compliance-monitoring/page.tsx frontend/src/app/\(app\)/reports/performance-risk/page.tsx frontend/src/app/\(app\)/reports/performance-risk/_components/filter-bar.tsx frontend/src/app/\(app\)/reports/risk-cycle-detail-report.tsx frontend/src/app/\(app\)/evaluations/page.tsx frontend/src/app/\(app\)/reports/formal/page.tsx frontend/src/app/\(app\)/reports/_components/formal-report-list.tsx
git commit -m "feat: add group-aware report filters"
```

## Task 9: Full Verification

**Files:**

- No planned source edits unless verification exposes defects.

- [ ] **Step 1: Run backend test suite**

Run:

```bash
cd backend && go test ./...
```

Expected: PASS.

- [ ] **Step 2: Run frontend lint and build**

Run:

```bash
cd frontend && npm run lint && npm run build
```

Expected: PASS.

- [ ] **Step 3: Run migration syntax smoke test**

Run against local database if available:

```bash
cd backend && migrate -path db/migrations -database "$DATABASE_URL" up 1
```

Expected: migration `000071` applies. If the local database is not at version `000070`, run the project-standard migration command for the current database state and record the exact output in the handoff.

- [ ] **Step 4: Manual API smoke test**

With backend running and a valid unit token:

```bash
curl -sS -X POST "$API_BASE/organization-groups" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ownerOrganizationId":"OWNER_UUID","name":"Jawa Timur","description":"Wilayah Jawa Timur","memberOrganizationIds":["MEMBER_UUID"]}'
```

Expected: `201` with `data.id` and `memberCount: 1`.

Then:

```bash
curl -sS "$API_BASE/dashboard/risk-categories?cycle=2026-H1&organization_group_id=GROUP_UUID" \
  -H "Authorization: Bearer $TOKEN"
```

Expected: `200` and report data scoped to group members.

- [ ] **Step 5: Commit verification fixes if any**

If verification required source fixes:

```bash
git add <fixed-files>
git commit -m "fix: stabilize organization group report scope"
```

If no fixes were needed, do not create an empty commit.

## Self-Review Checklist

- Spec coverage: group schema, owner-scoped CRUD, overlapping membership, members-only report filtering, admin tab UI, report filters, empty group behavior, and test coverage are represented in tasks.
- Red-flag scan: this plan contains no deferred implementation tasks.
- Type consistency: backend names use `OrganizationGroup`, `organization_group_id`, and `ownerOrganizationId`; frontend names use `OrganizationGroup`, `ReportScopeSelection`, `organizationGroupId`, and `organization_group_id` for query strings.
