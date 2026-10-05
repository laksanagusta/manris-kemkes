package postgres_test

import (
	"context"
	"errors"
	"os"
	"sync"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/repository/postgres"
	keyuc "github.com/manris/backend/internal/usecase/organization_api_key"
)

func TestOrganizationAPIKeyPostgresSharedQuotaAndRotation(t *testing.T) {
	parent := setupPool(t)
	ctx := context.Background()
	schema := "api_key_test_" + uuid.New().String()[:8]
	if _, err := parent.Exec(ctx, `CREATE SCHEMA `+schema); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = parent.Exec(context.Background(), `DROP SCHEMA `+schema+` CASCADE`) })
	cfg := parent.Config().Copy()
	cfg.ConnConfig.RuntimeParams["search_path"] = schema
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	second, err := pgxpool.NewWithConfig(ctx, cfg.Copy())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(second.Close)
	_, err = pool.Exec(ctx, `CREATE TABLE organizations (id uuid PRIMARY KEY); CREATE TABLE users (id uuid PRIMARY KEY);`)
	if err != nil {
		t.Fatal(err)
	}
	migration, err := os.ReadFile("../../../db/migrations/000069_organization_api_keys.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = pool.Exec(ctx, string(migration)); err != nil {
		t.Fatal(err)
	}
	orgID, otherOrg, actorID := uuid.New(), uuid.New(), uuid.New()
	if _, err = pool.Exec(ctx, `INSERT INTO organizations VALUES ($1), ($2)`, orgID, otherOrg); err != nil {
		t.Fatal(err)
	}
	if _, err = pool.Exec(ctx, `INSERT INTO users VALUES ($1)`, actorID); err != nil {
		t.Fatal(err)
	}
	repo := postgres.NewOrganizationAPIKeyRepository(pool)
	service := keyuc.NewService(repo, nil)
	otherService := keyuc.NewService(postgres.NewOrganizationAPIKeyRepository(second), nil)
	generated, err := service.Generate(ctx, orgID, actorID, nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = otherService.Generate(ctx, orgID, actorID, nil); !errors.Is(err, domainerrors.ErrConflict) {
		t.Fatalf("duplicate generation=%v", err)
	}
	metadata, err := repo.Get(ctx, orgID)
	if err != nil {
		t.Fatal(err)
	}
	if metadata.Hash != "" || metadata.LastUsedAt != nil {
		t.Fatal("metadata leaks hash or unexpected usage")
	}

	// Independent pools model separate server processes sharing one quota.
	results := make(chan *entity.APIKeyAdmission, 100)
	errs := make(chan error, 100)
	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			s := service
			if i%2 == 1 {
				s = otherService
			}
			result, err := s.Authenticate(ctx, generated.Secret)
			if err != nil {
				errs <- err
				return
			}
			results <- result
		}(i)
	}
	wg.Wait()
	close(results)
	close(errs)
	for err := range errs {
		t.Fatal(err)
	}
	admitted := 0
	for result := range results {
		if result.OrganizationID != orgID {
			t.Fatal("wrong organization")
		}
		if result.Allowed {
			admitted++
		} else if result.RetryAfter < 1 || result.RetryAfter > 60 {
			t.Fatalf("retry=%d", result.RetryAfter)
		}
	}
	if admitted != 60 {
		t.Fatalf("admitted=%d, want exactly 60", admitted)
	}
	oldID := generated.Key.ID
	rotated, err := otherService.Generate(ctx, orgID, actorID, &oldID)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = service.Authenticate(ctx, generated.Secret); !errors.Is(err, domainerrors.ErrUnauthorized) {
		t.Fatalf("old key valid=%v", err)
	}
	admission, err := service.Authenticate(ctx, rotated.Secret)
	if err != nil {
		t.Fatal(err)
	}
	if admission.Allowed {
		t.Fatal("rotation reset quota")
	}
	if _, err = service.Generate(ctx, orgID, actorID, &oldID); !errors.Is(err, domainerrors.ErrConflict) {
		t.Fatalf("stale rotation=%v", err)
	}
	other, err := service.Generate(ctx, otherOrg, actorID, nil)
	if err != nil {
		t.Fatal(err)
	}
	admission, err = service.Authenticate(ctx, other.Secret)
	if err != nil || !admission.Allowed {
		t.Fatalf("other organization quota affected: %v", err)
	}
	if _, err = pool.Exec(ctx, `UPDATE organization_api_keys SET window_started_at=NOW()-interval '61 seconds' WHERE organization_id=$1`, orgID); err != nil {
		t.Fatal(err)
	}
	admission, err = otherService.Authenticate(ctx, rotated.Secret)
	if err != nil || !admission.Allowed {
		t.Fatalf("window did not reset: %v", err)
	}
	metadata, err = repo.Get(ctx, orgID)
	if err != nil || metadata.LastUsedAt == nil {
		t.Fatalf("usage not recorded: %v", err)
	}
	var events int
	if err = pool.QueryRow(ctx, `SELECT COUNT(*) FROM organization_api_key_events WHERE organization_id=$1`, orgID).Scan(&events); err != nil || events != 2 {
		t.Fatalf("audit events=%d, err=%v", events, err)
	}
	down, err := os.ReadFile("../../../db/migrations/000069_organization_api_keys.down.sql")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = pool.Exec(ctx, string(down)); err != nil {
		t.Fatal(err)
	}
}
