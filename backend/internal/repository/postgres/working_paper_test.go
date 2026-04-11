package postgres

import (
	"context"
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
