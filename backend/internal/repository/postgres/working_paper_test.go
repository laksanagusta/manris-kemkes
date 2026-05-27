package postgres

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
)

func setupWorkingPaperPool(t *testing.T) *pgxpool.Pool {
	t.Helper()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL is not set")
	}

	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatalf("ParseConfig: %v", err)
	}

	pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		t.Fatalf("NewWithConfig: %v", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		pool.Close()
		t.Skipf("database unavailable: %v", err)
	}

	t.Cleanup(func() { pool.Close() })
	return pool
}

func insertWorkingPaperTestOrganization(t *testing.T, pool *pgxpool.Pool, name string) uuid.UUID {
	t.Helper()

	orgID := uuid.New()
	if _, err := pool.Exec(context.Background(), `INSERT INTO organizations (id, name) VALUES ($1, $2)`, orgID, name); err != nil {
		t.Fatalf("insert organization: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM organizations WHERE id = $1`, orgID)
	})
	return orgID
}

func insertWorkingPaperTestUser(t *testing.T, pool *pgxpool.Pool, orgID uuid.UUID, username string) uuid.UUID {
	t.Helper()

	userID := uuid.New()
	if _, err := pool.Exec(context.Background(), `
		INSERT INTO users (id, name, username, email, password_hash, role, organization_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, userID, "Test User", username, username+"@example.com", "hash", "unit", orgID); err != nil {
		t.Fatalf("insert user: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM users WHERE id = $1`, userID)
	})
	return userID
}

type workingPaperExecCall struct {
	query string
	args  []interface{}
}

type fakeWorkingPaperExecer struct {
	calls []workingPaperExecCall
}

func (f *fakeWorkingPaperExecer) Exec(_ context.Context, query string, args ...interface{}) (pgconn.CommandTag, error) {
	f.calls = append(f.calls, workingPaperExecCall{query: query, args: args})
	return pgconn.CommandTag{}, nil
}

func TestInsertWorkingPaperRiskLinksPersistsEachResolvedLink(t *testing.T) {
	wpID := uuid.New()
	firstRiskID := uuid.New()
	secondRiskID := uuid.New()
	execer := &fakeWorkingPaperExecer{}
	wp := &entity.WorkingPaper{
		ID: wpID,
		Risks: []entity.WorkingPaperRiskLink{
			{RiskID: firstRiskID, SortOrder: 0, SourceMode: "latest_approved", CreatedAt: time.Now().UTC()},
			{RiskID: secondRiskID, SortOrder: 1, SourceMode: "review_periodic", CreatedAt: time.Now().UTC()},
		},
	}

	if err := insertWorkingPaperRiskLinks(context.Background(), execer, wp); err != nil {
		t.Fatalf("insertWorkingPaperRiskLinks returned error: %v", err)
	}
	if len(execer.calls) != 2 {
		t.Fatalf("expected 2 working_paper_risks inserts, got %d", len(execer.calls))
	}
	if execer.calls[0].args[0] != wpID || execer.calls[0].args[1] != firstRiskID {
		t.Fatalf("expected first insert to persist working paper %s and risk %s, got %+v", wpID, firstRiskID, execer.calls[0].args)
	}
	if execer.calls[1].args[0] != wpID || execer.calls[1].args[1] != secondRiskID {
		t.Fatalf("expected second insert to persist working paper %s and risk %s, got %+v", wpID, secondRiskID, execer.calls[1].args)
	}
}

func TestWorkingPaperRiskQueryCastsMitigationDueDatesToTextArray(t *testing.T) {
	contents, err := os.ReadFile(filepath.Join("working_paper.go"))
	if err != nil {
		t.Fatalf("read working_paper.go: %v", err)
	}

	source := string(contents)
	if !strings.Contains(source, "array_agg(m.due_date::text") {
		t.Fatalf("expected working paper risk query to cast mitigation due dates to text before aggregation")
	}
	if !strings.Contains(source, "ARRAY[]::text[]") {
		t.Fatalf("expected mitigation due date fallback to use text[] cast")
	}
	if strings.Contains(source, "array_agg(m.due_date ORDER BY m.sort_order)") {
		t.Fatalf("unexpected raw date aggregation for mitigation due dates")
	}
}

func TestWorkingPaperRepositoryCreateAssignsSequenceCodePerOrganization(t *testing.T) {
	pool := setupWorkingPaperPool(t)
	repo := NewWorkingPaperRepository(pool)
	ctx := context.Background()

	orgA := insertWorkingPaperTestOrganization(t, pool, "Working Paper Org A")
	orgB := insertWorkingPaperTestOrganization(t, pool, "Working Paper Org B")
	userA := insertWorkingPaperTestUser(t, pool, orgA, "wp-user-a")
	userB := insertWorkingPaperTestUser(t, pool, orgB, "wp-user-b")

	firstA := &entity.WorkingPaper{
		Title:                    "Kertas Kerja A1",
		Description:              "Test",
		OrgID:                    orgA,
		Status:                   entity.WorkingPaperStatusDraft,
		AssessmentCycle:          "2026-H1",
		DocumentHash:             "hash-a1",
		CurrentSignatorySequence: 0,
		CreatedBy:                userA,
		CreatedAt:                time.Now().UTC(),
		UpdatedAt:                time.Now().UTC(),
	}
	if err := repo.Create(ctx, firstA); err != nil {
		t.Fatalf("Create firstA: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM working_papers WHERE id = $1`, firstA.ID)
	})

	secondA := &entity.WorkingPaper{
		Title:                    "Kertas Kerja A2",
		Description:              "Test",
		OrgID:                    orgA,
		Status:                   entity.WorkingPaperStatusDraft,
		AssessmentCycle:          "2026-H2",
		DocumentHash:             "hash-a2",
		CurrentSignatorySequence: 0,
		CreatedBy:                userA,
		CreatedAt:                time.Now().UTC(),
		UpdatedAt:                time.Now().UTC(),
	}
	if err := repo.Create(ctx, secondA); err != nil {
		t.Fatalf("Create secondA: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM working_papers WHERE id = $1`, secondA.ID)
	})

	firstB := &entity.WorkingPaper{
		Title:                    "Kertas Kerja B1",
		Description:              "Test",
		OrgID:                    orgB,
		Status:                   entity.WorkingPaperStatusDraft,
		AssessmentCycle:          "2026-H1",
		DocumentHash:             "hash-b1",
		CurrentSignatorySequence: 0,
		CreatedBy:                userB,
		CreatedAt:                time.Now().UTC(),
		UpdatedAt:                time.Now().UTC(),
	}
	if err := repo.Create(ctx, firstB); err != nil {
		t.Fatalf("Create firstB: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM working_papers WHERE id = $1`, firstB.ID)
	})

	gotA, err := repo.GetByID(ctx, firstA.ID)
	if err != nil {
		t.Fatalf("GetByID firstA: %v", err)
	}
	if gotA.SequenceNo != 1 || gotA.Code != "WP-0001" {
		t.Fatalf("gotA sequence/code = %d/%q, want 1/WP-0001", gotA.SequenceNo, gotA.Code)
	}

	if firstA.SequenceNo != 1 || firstA.Code != "WP-0001" {
		t.Fatalf("firstA sequence/code = %d/%q, want 1/WP-0001", firstA.SequenceNo, firstA.Code)
	}
	if secondA.SequenceNo != 2 || secondA.Code != "WP-0002" {
		t.Fatalf("secondA sequence/code = %d/%q, want 2/WP-0002", secondA.SequenceNo, secondA.Code)
	}
	if firstB.SequenceNo != 1 || firstB.Code != "WP-0001" {
		t.Fatalf("firstB sequence/code = %d/%q, want 1/WP-0001", firstB.SequenceNo, firstB.Code)
	}
}

func TestPreviousApprovedWorkingPaperRiskExprPrefersPreviousSemesterBeforeFallbackVersion(t *testing.T) {
	expr := previousApprovedWorkingPaperRiskExpr()

	expectedSnippets := []string{
		"prev.version_number < risk.version_number",
		"COALESCE(prev.assessment_cycle, '') = CASE",
		"RIGHT(risk.assessment_cycle, 2) = 'H1'",
		"THEN ((LEFT(risk.assessment_cycle, 4))::int - 1)::text",
		"THEN 'H2'",
		"ELSE 'H1'",
		"prev.version_number DESC",
	}

	for _, snippet := range expectedSnippets {
		if !strings.Contains(expr, snippet) {
			t.Fatalf("expected previous risk expression to contain %q, got:\n%s", snippet, expr)
		}
	}

	if strings.Contains(expr, "prev.version_number = risk.version_number - 1") {
		t.Fatalf("expected previous risk expression to avoid direct version_number - 1 matching, got:\n%s", expr)
	}

	if strings.Contains(expr, "prev.archived_at IS NULL") {
		t.Fatalf("expected previous risk expression to allow archived historical versions, got:\n%s", expr)
	}
}
