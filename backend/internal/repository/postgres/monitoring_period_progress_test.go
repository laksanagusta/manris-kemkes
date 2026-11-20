package postgres

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/manris/backend/internal/domain/entity"
)

type periodAccessDB struct {
	riskQueryer
	owner uuid.UUID
	err   error
	reads int
}

type periodAccessRow struct{ scan func(...any) error }

func (r periodAccessRow) Scan(dest ...any) error { return r.scan(dest...) }

func (db *periodAccessDB) QueryRow(_ context.Context, _ string, args ...any) pgx.Row {
	db.reads++
	return periodAccessRow{scan: func(dest ...any) error {
		if db.err != nil {
			return db.err
		}
		if db.reads == 1 {
			*dest[0].(*uuid.UUID) = db.owner
			return nil
		}
		if len(args) != 2 || args[1] != db.owner {
			return pgx.ErrNoRows
		}
		if db.reads == 3 {
			*dest[0].(*[]LinkedProfileDocument) = []LinkedProfileDocument{{
				ID: db.owner, Kind: "workingPaper", Complete: true, ObservationCutoff: "2026-11-13",
			}}
			return nil
		}
		*dest[0].(**uuid.UUID) = nil
		*dest[1].(*int) = 2027
		*dest[2].(*int) = 1
		return nil
	}}
}

func TestAnnualProfilePeriodProgressReadScope(t *testing.T) {
	own, child, outside := uuid.New(), uuid.New(), uuid.New()
	scope := &entity.AccessScope{OrganizationID: &own, AccessibleOrgIDs: []uuid.UUID{own, child}}
	for _, tt := range []struct {
		name           string
		owner          uuid.UUID
		scope          *entity.AccessScope
		dbErr, wantErr error
		reads          int
	}{
		{"own UPR", own, scope, nil, nil, 3},
		{"UPR-T1 reads UPR-T2", child, scope, nil, nil, 3},
		{"outside scope", outside, scope, nil, ErrUPRNotFound, 1},
		{"global reader", child, &entity.AccessScope{IsGlobal: true}, nil, nil, 3},
		{"missing scope", child, nil, nil, ErrUPRNotFound, 0},
		{"missing profile", child, scope, pgx.ErrNoRows, ErrUPRNotFound, 1},
		{"database failure", child, scope, context.DeadlineExceeded, context.DeadlineExceeded, 1},
	} {
		t.Run(tt.name, func(t *testing.T) {
			db := &periodAccessDB{owner: tt.owner, err: tt.dbErr}
			got, err := annualProfilePeriodProgressForScope(context.Background(), db, tt.scope, uuid.New())
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("error = %v, want %v", err, tt.wantErr)
			}
			if db.reads != tt.reads {
				t.Fatalf("database reads = %d, want %d", db.reads, tt.reads)
			}
			if err == nil && got.Periods == nil {
				t.Fatal("expected empty periods for an unconfigured profile")
			}
			if err == nil && (len(got.LinkedDocuments) != 1 || got.LinkedDocuments[0].Kind != "workingPaper" || !got.LinkedDocuments[0].Complete) {
				t.Fatalf("expected linked historical working paper, got %+v", got.LinkedDocuments)
			}
			if err == nil && (got.Year != 2027 || got.Version != 1) {
				t.Fatalf("unexpected annual profile identity: %+v", got)
			}
		})
	}
}
