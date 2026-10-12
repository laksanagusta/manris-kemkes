//go:build integration

package postgres

import (
	"context"
	"testing"

	"github.com/google/uuid"
)

func TestRosterArchiveLifecycle(t *testing.T) {
	pool := setupWorkingPaperPool(t)
	cases := []struct {
		name, cycle, archivedAt, reason string
		restored                        bool
		want                            int
	}{
		{name: "Q2 history before July archive", cycle: "2025-Q2", archivedAt: "2025-07-01 07:05:32+07", reason: "system", want: 1},
		{name: "Q3 excludes July archive", cycle: "2025-Q3", archivedAt: "2025-07-01 07:05:32+07", reason: "system"},
		{name: "Q4 excludes July archive", cycle: "2025-Q4", archivedAt: "2025-07-01 07:05:32+07", reason: "system"},
		{name: "unarchived risk", cycle: "2025-Q3", want: 1},
		{name: "archive exactly after Q2", cycle: "2025-Q2", archivedAt: "2025-07-01 00:00:00+07", reason: "system", want: 1},
		{name: "archive before Q2 end", cycle: "2025-Q2", archivedAt: "2025-06-30 23:59:59+07", reason: "system"},
		{name: "version supersession preserves history", cycle: "2025-Q2", archivedAt: "2025-06-01 00:00:00+07", reason: "superseded by periodic reassessment", want: 1},
		{name: "Q4 restore preserves Q3 archive", cycle: "2025-Q3", restored: true},
		{name: "Q4 restore includes Q4", cycle: "2025-Q4", restored: true, want: 1},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			ctx := context.Background()
			tx, err := pool.Begin(ctx)
			if err != nil {
				t.Fatal(err)
			}
			defer tx.Rollback(ctx)
			// Shadow production tables on this connection; all fixture data is
			// temporary and rolled back, including when an assertion fails.
			_, err = tx.Exec(ctx, `
				CREATE TEMP TABLE risks (id uuid, version_group_id uuid, organization_id uuid,
				 code text, title text, status text, superseded_by_risk_id uuid,
				 assessment_cycle text, version_number int, created_at timestamptz,
				 archived_at timestamptz, archived_reason text) ON COMMIT DROP;
				CREATE TEMP TABLE audit_logs (id uuid, entity_id uuid, entity_type text,
				 action text, created_at timestamptz) ON COMMIT DROP;
				CREATE TEMP TABLE risk_monitorings (id uuid, version_group_id uuid,
				 assessment_cycle text, status text, source_risk_id uuid, result_risk_id uuid) ON COMMIT DROP;
			`)
			if err != nil {
				t.Fatal(err)
			}
			orgID, groupID, sourceID := uuid.New(), uuid.New(), uuid.New()
			var archive any
			if tc.archivedAt != "" {
				archive = tc.archivedAt
			}
			_, err = tx.Exec(ctx, `INSERT INTO risks VALUES
				($1,$2,$3,'RPL-06-q5jzk','Pemeriksaan tidak menyeluruh','final',NULL,
				 '2025-Q2',1,'2025-05-07', $4::timestamptz,$5),
				($6,$2,$3,'RPL-06-q5jzk','Pemeriksaan tidak menyeluruh','final',NULL,
				 '2025-Q3',2,'2025-10-10', $4::timestamptz,$5),
				($7,$2,$3,'RPL-06-q5jzk','Pemeriksaan tidak menyeluruh','final',NULL,
				 '2025-Q4',3,'2025-10-10', $4::timestamptz,$5)`,
				sourceID, groupID, orgID, archive, tc.reason, uuid.New(), uuid.New())
			if err != nil {
				t.Fatal(err)
			}
			if tc.restored {
				_, err = tx.Exec(ctx, `INSERT INTO audit_logs VALUES
					($1,$2,'risk','archive','2025-07-01 07:05:32+07'),
					($3,$2,'risk','restore','2025-10-02 12:00:00+07')`, uuid.New(), sourceID, uuid.New())
				if err != nil {
					t.Fatal(err)
				}
			}
			entries, summary, err := scanRosterPreview(ctx, tx, orgID, rosterPeriod{MonitoringCycle: tc.cycle})
			if err != nil {
				t.Fatal(err)
			}
			if len(entries) != tc.want || summary.EligibleCount != tc.want {
				t.Fatalf("got %d entries and eligible count %d, want %d", len(entries), summary.EligibleCount, tc.want)
			}
		})
	}
}
