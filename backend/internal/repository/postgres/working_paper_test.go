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
	"github.com/manris/backend/internal/domain/entity"
)

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
