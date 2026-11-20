package postgres_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/repository/postgres"
)

func TestAnnualProfileListIncludesReadableDescendantsWithoutGrantingWrites(t *testing.T) {
	pool := setupPool(t)
	ctx := context.Background()
	parent := insertTestOrganization(t, pool, "Annual profile parent")
	child := insertTestOrganization(t, pool, "Annual profile child")
	outside := insertTestOrganization(t, pool, "Annual profile outside")
	actor := uuid.New()
	ids := []uuid.UUID{uuid.New(), uuid.New(), uuid.New()}
	for index, org := range []uuid.UUID{parent, child, outside} {
		id := ids[index]
		if _, err := pool.Exec(ctx, `INSERT INTO annual_risk_profile_versions
			(id, organization_id, year, version, created_by) VALUES ($1, $2, 2026, 1, $3)`, id, org, actor); err != nil {
			t.Fatalf("create profile: %v", err)
		}
		t.Cleanup(func() {
			if _, err := pool.Exec(ctx, "DELETE FROM annual_risk_profile_versions WHERE id=$1", id); err != nil {
				t.Errorf("clean up profile: %v", err)
			}
		})
	}
	scope := &entity.AccessScope{OrganizationID: &parent, AccessibleOrgIDs: []uuid.UUID{parent, child}}
	workflow := postgres.NewUPRWorkflow(pool)
	own, err := workflow.AnnualProfileList(ctx, scope, parent, false)
	if err != nil || len(own) != 1 || own[0].ID != ids[0] {
		t.Fatalf("list for own-unit pickers: %+v, %v", own, err)
	}
	visible, err := workflow.AnnualProfileList(ctx, scope, parent, true)
	if err != nil || len(visible) != 2 || visible[0].ID != ids[1] || visible[1].ID != ids[0] {
		t.Fatalf("list for parent: %+v, %v", visible, err)
	}
	profile, err := workflow.AnnualProfileForScope(ctx, scope, parent, 2026, ids[1])
	if err != nil || profile.Selected == nil || profile.Selected.ID != ids[1] ||
		profile.OrganizationID != child || profile.OrganizationName != "Annual profile child" {
		t.Fatalf("read descendant profile: %+v, %v", profile, err)
	}
	if _, err := workflow.AnnualProfileForScope(ctx, scope, parent, 2026, ids[2]); !errors.Is(err, postgres.ErrUPRNotFound) {
		t.Fatalf("read outside scope: %v", err)
	}
	if err := workflow.DeleteAnnualDraft(ctx, parent, ids[1]); !errors.Is(err, postgres.ErrUPRNotFound) {
		t.Fatalf("parent delete: %v", err)
	}
	if err := workflow.FinalizeAnnualProfile(ctx, parent, actor, ids[1]); !errors.Is(err, postgres.ErrUPRNotFound) {
		t.Fatalf("parent finalize: %v", err)
	}
}
