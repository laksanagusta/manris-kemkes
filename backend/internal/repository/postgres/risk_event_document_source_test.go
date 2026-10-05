package postgres_test

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/repository/postgres"
	"os"
	"strings"
	"testing"
	"time"
)

func TestRiskEventDocumentSourceRoundTripAndDuplicateProtection(t *testing.T) {
	parent := setupPool(t)
	ctx := context.Background()
	schema := "event_source_test_" + uuid.New().String()[:8]
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
	if _, err = pool.Exec(ctx, `CREATE TABLE organizations (id uuid PRIMARY KEY, name text); CREATE TABLE users (id uuid PRIMARY KEY, name text); CREATE TABLE risks (id uuid PRIMARY KEY, code text, title text);`); err != nil {
		t.Fatal(err)
	}
	for _, path := range []string{"000066_risk_event_ledger.up.sql", "000070_risk_event_document_source.up.sql"} {
		migration, err := os.ReadFile("../../../db/migrations/" + path)
		if err != nil {
			t.Fatal(err)
		}
		if _, err = pool.Exec(ctx, string(migration)); err != nil {
			t.Fatalf("%s: %v", path, err)
		}
	}
	orgID, actorID := uuid.New(), uuid.New()
	if _, err = pool.Exec(ctx, `INSERT INTO organizations VALUES ($1,'Unit contoh')`, orgID); err != nil {
		t.Fatal(err)
	}
	if _, err = pool.Exec(ctx, `INSERT INTO users VALUES ($1,'Petugas contoh')`, actorID); err != nil {
		t.Fatal(err)
	}
	repo := postgres.NewRiskEventRepository(pool)
	event := &entity.RiskEvent{Description: "Layanan berhenti", OccurredAt: time.Now(), Severity: "high", ImpactTypes: []string{"service"}, PostResponseCondition: "unknown", OrganizationID: orgID, CreatedBy: actorID, SourceDocumentName: "laporan.pdf", SourceRefs: []entity.DocumentSourceRef{{Quote: "Layanan berhenti", Location: "Halaman 2"}}, ExtractionKey: strings.Repeat("a", 64)}
	if err = repo.Create(ctx, event, nil); err != nil {
		t.Fatal(err)
	}
	stored, err := repo.GetByID(ctx, event.ID, []uuid.UUID{orgID})
	if err != nil {
		t.Fatal(err)
	}
	if stored.SourceDocumentName != event.SourceDocumentName || len(stored.SourceRefs) != 1 || stored.SourceRefs[0] != event.SourceRefs[0] || stored.ExtractionKey != event.ExtractionKey {
		t.Fatalf("lost source metadata: %+v", stored)
	}
	items, err := repo.List(ctx, []uuid.UUID{orgID}, nil)
	if err != nil || len(items) != 1 || len(items[0].SourceRefs) != 1 {
		t.Fatalf("List=%+v, %v", items, err)
	}
	if _, err = repo.GetByID(ctx, event.ID, []uuid.UUID{uuid.New()}); !errors.Is(err, domainerrors.ErrNotFound) {
		t.Fatalf("foreign scope read=%v", err)
	}
	if err = repo.Create(ctx, event, nil); !errors.Is(err, domainerrors.ErrInvalidInput) {
		t.Fatalf("duplicate save=%v", err)
	}
	manual := *event
	manual.SourceDocumentName = ""
	manual.SourceRefs = []entity.DocumentSourceRef{}
	manual.ExtractionKey = ""
	if err = repo.Create(ctx, &manual, nil); err != nil {
		t.Fatalf("manual save=%v", err)
	}
	if _, err = repo.GetByID(ctx, manual.ID, []uuid.UUID{orgID}); err != nil {
		t.Fatal(err)
	}
}
