# Working Paper Risk Linking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `working_papers.risk_snapshots` with many-to-many links to exact `risks.id` versions, keep reassessment available during working paper creation, and lock linked risk versions once the document enters signing.

**Architecture:** Introduce a new `working_paper_risks` pivot table and backfill it from existing `risk_snapshots.original_risk_id`. Refactor backend working paper reads to hydrate linked risk data from joined `risks` rows, then update the create flow to resolve either approved-current risk IDs or reassessment draft risk IDs based on a request-level source mode. Enforce lock semantics through repository queries against active `working_papers` statuses (`signing`, `completed`) instead of adding explicit lock columns.

**Tech Stack:** PostgreSQL migrations, Go 1.25, Fiber, Next.js 16, React 19, TypeScript, Node `node:test`

---

### Task 1: Add Relation Table and Backfill Existing Working Papers

**Files:**
- Create: `backend/db/migrations/000032_working_paper_risk_links.up.sql`
- Create: `backend/db/migrations/000032_working_paper_risk_links.down.sql`
- Reference: `backend/db/migrations/000031_working_papers.up.sql`

- [ ] **Step 1: Write the migration to create `working_paper_risks` and backfill from existing snapshots**

Create `backend/db/migrations/000032_working_paper_risk_links.up.sql` with:

```sql
CREATE TABLE IF NOT EXISTS working_paper_risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    working_paper_id UUID NOT NULL REFERENCES working_papers(id) ON DELETE CASCADE,
    risk_id UUID NOT NULL REFERENCES risks(id),
    sort_order INT NOT NULL DEFAULT 0,
    source_mode VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (working_paper_id, risk_id)
);

CREATE INDEX IF NOT EXISTS idx_working_paper_risks_working_paper_id
    ON working_paper_risks(working_paper_id);

CREATE INDEX IF NOT EXISTS idx_working_paper_risks_risk_id
    ON working_paper_risks(risk_id);

INSERT INTO working_paper_risks (working_paper_id, risk_id, sort_order, source_mode)
SELECT
    wp.id,
    (snapshot ->> 'original_risk_id')::uuid,
    snapshot.ordinality - 1,
    'latest_approved'
FROM working_papers wp
CROSS JOIN LATERAL jsonb_array_elements(wp.risk_snapshots) WITH ORDINALITY AS snapshot(snapshot, ordinality)
WHERE snapshot ? 'original_risk_id'
  AND EXISTS (
      SELECT 1
      FROM risks r
      WHERE r.id = (snapshot ->> 'original_risk_id')::uuid
  );
```

- [ ] **Step 2: Write the down migration that removes only the new relation layer**

Create `backend/db/migrations/000032_working_paper_risk_links.down.sql` with:

```sql
DROP INDEX IF EXISTS idx_working_paper_risks_risk_id;
DROP INDEX IF EXISTS idx_working_paper_risks_working_paper_id;
DROP TABLE IF EXISTS working_paper_risks;
```

- [ ] **Step 3: Run the migration locally and verify the new table exists**

Run:

```bash
make migrate-up
```

Then run:

```bash
psql "$DATABASE_URL" -c "\d working_paper_risks"
```

Expected: the table shows `working_paper_id`, `risk_id`, `sort_order`, `source_mode`, and the unique constraint.

- [ ] **Step 4: Verify backfill created relation rows for historical working papers**

Run:

```bash
psql "$DATABASE_URL" -c "SELECT working_paper_id, risk_id, sort_order, source_mode FROM working_paper_risks ORDER BY created_at DESC LIMIT 10;"
```

Expected: existing working papers with `risk_snapshots.original_risk_id` now have relation rows with `source_mode = 'latest_approved'`.

- [ ] **Step 5: Commit the schema work**

```bash
git add backend/db/migrations/000032_working_paper_risk_links.up.sql backend/db/migrations/000032_working_paper_risk_links.down.sql
git commit -m "feat: add working paper risk link table"
```

### Task 2: Refactor Backend Working Paper Entities and Repository Reads

**Files:**
- Modify: `backend/internal/domain/entity/working_paper.go`
- Modify: `backend/internal/domain/repository/working_paper.go`
- Modify: `backend/internal/repository/postgres/working_paper.go`
- Create: `backend/internal/usecase/workingpaper/get_test.go`

- [ ] **Step 1: Write the failing unit test for relation-based working paper reads**

Create `backend/internal/usecase/workingpaper/get_test.go` with:

```go
package workingpaper

import (
    "context"
    "testing"
    "time"

    "github.com/google/uuid"
    "github.com/manris/backend/internal/domain/entity"
)

type stubGetWorkingPaperRepo struct {
    wp *entity.WorkingPaper
}

func (r *stubGetWorkingPaperRepo) Create(context.Context, *entity.WorkingPaper) error { return nil }
func (r *stubGetWorkingPaperRepo) GetByID(context.Context, uuid.UUID) (*entity.WorkingPaper, error) { return r.wp, nil }
func (r *stubGetWorkingPaperRepo) List(context.Context, []uuid.UUID, string, int, int) ([]*entity.WorkingPaper, int, error) { return nil, 0, nil }
func (r *stubGetWorkingPaperRepo) Update(context.Context, *entity.WorkingPaper) error { return nil }
func (r *stubGetWorkingPaperRepo) Delete(context.Context, uuid.UUID) error { return nil }
func (r *stubGetWorkingPaperRepo) GetByIDForUpdate(context.Context, uuid.UUID) (*entity.WorkingPaper, error) { return nil, nil }
func (r *stubGetWorkingPaperRepo) GetSignatoriesByWorkingPaperID(context.Context, uuid.UUID) ([]*entity.WorkingPaperSignatory, error) { return nil, nil }
func (r *stubGetWorkingPaperRepo) UpdateSignatory(context.Context, *entity.WorkingPaperSignatory) error { return nil }
func (r *stubGetWorkingPaperRepo) GetPendingSigningByUserID(context.Context, uuid.UUID, []uuid.UUID) ([]*entity.WorkingPaper, error) { return nil, nil }
func (r *stubGetWorkingPaperRepo) CountPendingSigningByUserID(context.Context, uuid.UUID) (int, error) { return 0, nil }
func (r *stubGetWorkingPaperRepo) HasBlockingDocumentLink(context.Context, uuid.UUID) (bool, error) { return false, nil }

func TestGetReturnsLinkedRisksInsteadOfSnapshots(t *testing.T) {
    orgID := uuid.New()
    wpID := uuid.New()
    riskID := uuid.New()

    uc := NewWorkingPaperUseCase(&stubGetWorkingPaperRepo{wp: &entity.WorkingPaper{
        ID:              wpID,
        OrgID:           orgID,
        Title:           "KK Semester I",
        Status:          entity.WorkingPaperStatusDraft,
        AssessmentCycle: "2026-H1",
        Risks: []entity.WorkingPaperRiskLink{{
            ID:             uuid.New(),
            WorkingPaperID: wpID,
            RiskID:         riskID,
            SortOrder:      0,
            SourceMode:     "latest_approved",
            Risk: entity.WorkingPaperRiskData{
                ID:             riskID,
                Code:           "R-001",
                Title:          "Gangguan server utama",
                Probability:    4,
                Impact:         5,
                Nilai:          20,
                TingkatRisiko:  entity.RiskLevelSangatTinggi,
                AssessmentCycle:"2026-H1",
            },
            CreatedAt: time.Now(),
        }},
    }}, nil)

    got, err := uc.Get(context.Background(), wpID, []uuid.UUID{orgID})
    if err != nil {
        t.Fatalf("Get returned error: %v", err)
    }
    if len(got.Risks) != 1 {
        t.Fatalf("expected 1 linked risk, got %d", len(got.Risks))
    }
    if got.Risks[0].Risk.Code != "R-001" {
        t.Fatalf("expected linked risk code R-001, got %q", got.Risks[0].Risk.Code)
    }
}
```

- [ ] **Step 2: Run the unit test and verify it fails because `WorkingPaper` does not expose linked risks yet**

Run:

```bash
go test ./internal/usecase/workingpaper -run TestGetReturnsLinkedRisksInsteadOfSnapshots
```

Expected: FAIL with unknown field errors for `Risks`, `WorkingPaperRiskLink`, or `WorkingPaperRiskData`.

- [ ] **Step 3: Refactor entity and repository contracts to use linked risks**

Update `backend/internal/domain/entity/working_paper.go` so the core shape becomes:

```go
type WorkingPaper struct {
    ID                       uuid.UUID                `json:"id"`
    Title                    string                   `json:"title"`
    Description              string                   `json:"description"`
    OrgID                    uuid.UUID                `json:"org_id"`
    Status                   string                   `json:"status"`
    AssessmentCycle          string                   `json:"assessment_cycle"`
    Risks                    []WorkingPaperRiskLink   `json:"risks"`
    DocumentHash             string                   `json:"document_hash"`
    CurrentSignatorySequence int                      `json:"current_signatory_sequence"`
    CreatedBy                uuid.UUID                `json:"created_by"`
    CreatedAt                time.Time                `json:"created_at"`
    UpdatedAt                time.Time                `json:"updated_at"`
    CompletedAt              *time.Time               `json:"completed_at,omitempty"`
    CancelledAt              *time.Time               `json:"cancelled_at,omitempty"`
    Signatories              []WorkingPaperSignatory  `json:"signatories"`
}

type WorkingPaperRiskLink struct {
    ID             uuid.UUID           `json:"id"`
    WorkingPaperID uuid.UUID           `json:"working_paper_id"`
    RiskID         uuid.UUID           `json:"risk_id"`
    SortOrder      int                 `json:"sort_order"`
    SourceMode     string              `json:"source_mode"`
    CreatedAt      time.Time           `json:"created_at"`
    Risk           WorkingPaperRiskData `json:"risk"`
}
```

Then update `backend/internal/domain/repository/working_paper.go` with:

```go
HasBlockingDocumentLink(ctx context.Context, riskID uuid.UUID) (bool, error)
```

In `backend/internal/repository/postgres/working_paper.go`, replace `risk_snapshots` reads with a helper that joins `working_paper_risks` to `risks` and builds `[]entity.WorkingPaperRiskLink`.

- [ ] **Step 4: Re-run the unit test and the working paper package tests**

Run:

```bash
go test ./internal/usecase/workingpaper
```

Expected: PASS for `TestGetReturnsLinkedRisksInsteadOfSnapshots`.

- [ ] **Step 5: Commit the entity and repository refactor**

```bash
git add backend/internal/domain/entity/working_paper.go backend/internal/domain/repository/working_paper.go backend/internal/repository/postgres/working_paper.go backend/internal/usecase/workingpaper/get_test.go
git commit -m "refactor: load working paper risks from relations"
```

### Task 3: Resolve Risk Source Mode During Working Paper Creation

**Files:**
- Modify: `backend/internal/handler/http/working_paper.go`
- Modify: `backend/internal/usecase/workingpaper/create.go`
- Create: `backend/internal/usecase/workingpaper/risk_resolution.go`
- Modify: `backend/internal/usecase/risk/reassess.go`
- Modify: `backend/internal/usecase/risk/reassess_test.go`
- Create: `backend/internal/usecase/workingpaper/create_test.go`

- [ ] **Step 1: Write failing tests for `latest_approved` and `review_periodic` create behavior**

Create `backend/internal/usecase/workingpaper/create_test.go` with:

```go
package workingpaper

import (
    "context"
    "testing"

    "github.com/google/uuid"
    "github.com/manris/backend/internal/domain/entity"
)

type fakeCreateRiskRepo struct {
    risksByID   map[uuid.UUID]*entity.Risk
    versions    []*entity.Risk
    createdRisk *entity.Risk
}

func (r *fakeCreateRiskRepo) Create(_ context.Context, risk *entity.Risk) error { r.createdRisk = risk; return nil }
func (r *fakeCreateRiskRepo) GetByID(_ context.Context, id uuid.UUID, _ []uuid.UUID) (*entity.Risk, error) { return r.risksByID[id], nil }
func (r *fakeCreateRiskRepo) Update(context.Context, *entity.Risk) error { return nil }
func (r *fakeCreateRiskRepo) Delete(context.Context, uuid.UUID) error { return nil }
func (r *fakeCreateRiskRepo) List(context.Context, []uuid.UUID, string, string) ([]*entity.Risk, error) { return nil, nil }
func (r *fakeCreateRiskRepo) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) { return nil, nil }
func (r *fakeCreateRiskRepo) NextRiskCode(context.Context) (string, error) { return "", nil }
func (r *fakeCreateRiskRepo) ListApprovedRisks(context.Context, []uuid.UUID) ([]*entity.Risk, error) { return nil, nil }
func (r *fakeCreateRiskRepo) DashboardSummary(context.Context, string, []uuid.UUID) (*entity.DashboardSummary, error) { return nil, nil }
func (r *fakeCreateRiskRepo) DashboardCategoryCounts(context.Context, string, []uuid.UUID) ([]*entity.DashboardCategoryCount, error) { return nil, nil }
func (r *fakeCreateRiskRepo) HeatmapData(context.Context, string, []uuid.UUID) ([]*entity.HeatmapCell, error) { return nil, nil }
func (r *fakeCreateRiskRepo) TopRisks(context.Context, string, int, []uuid.UUID) ([]*entity.Risk, error) { return nil, nil }
func (r *fakeCreateRiskRepo) ListVersions(context.Context, uuid.UUID) ([]*entity.Risk, error) { return r.versions, nil }
func (r *fakeCreateRiskRepo) ListCycleSnapshot(context.Context, string, []uuid.UUID) ([]*entity.Risk, error) { return nil, nil }
func (r *fakeCreateRiskRepo) ActivateApprovedVersion(context.Context, uuid.UUID) error { return nil }
func (r *fakeCreateRiskRepo) ListReviewQueue(context.Context, string, []uuid.UUID, string) ([]*entity.RiskReviewQueueItem, error) { return nil, nil }
func (r *fakeCreateRiskRepo) CompareCycles(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) { return nil, nil }
func (r *fakeCreateRiskRepo) RiskReviewSummary(context.Context, string, []uuid.UUID) (*entity.RiskReviewSummary, error) { return nil, nil }
func (r *fakeCreateRiskRepo) GetHeatmapVelocity(context.Context, string, string, []uuid.UUID) ([]entity.HeatmapVelocityCell, error) { return nil, nil }
func (r *fakeCreateRiskRepo) GetOverdueMitigationTimeline(context.Context, []uuid.UUID) ([]entity.OverdueMitigationTimelineItem, error) { return nil, nil }
func (r *fakeCreateRiskRepo) GetKRIBreachSummary(context.Context, []uuid.UUID) ([]entity.KRIBreachItem, error) { return nil, nil }
func (r *fakeCreateRiskRepo) GetUnitResponseTime(context.Context, []uuid.UUID) ([]entity.UnitResponseTime, error) { return nil, nil }

type fakeCreateWorkingPaperRepo struct { created *entity.WorkingPaper }
func (r *fakeCreateWorkingPaperRepo) Create(_ context.Context, wp *entity.WorkingPaper) error { r.created = wp; return nil }
func (r *fakeCreateWorkingPaperRepo) GetByID(context.Context, uuid.UUID) (*entity.WorkingPaper, error) { return nil, nil }
func (r *fakeCreateWorkingPaperRepo) List(context.Context, []uuid.UUID, string, int, int) ([]*entity.WorkingPaper, int, error) { return nil, 0, nil }
func (r *fakeCreateWorkingPaperRepo) Update(context.Context, *entity.WorkingPaper) error { return nil }
func (r *fakeCreateWorkingPaperRepo) Delete(context.Context, uuid.UUID) error { return nil }
func (r *fakeCreateWorkingPaperRepo) GetByIDForUpdate(context.Context, uuid.UUID) (*entity.WorkingPaper, error) { return nil, nil }
func (r *fakeCreateWorkingPaperRepo) GetSignatoriesByWorkingPaperID(context.Context, uuid.UUID) ([]*entity.WorkingPaperSignatory, error) { return nil, nil }
func (r *fakeCreateWorkingPaperRepo) UpdateSignatory(context.Context, *entity.WorkingPaperSignatory) error { return nil }
func (r *fakeCreateWorkingPaperRepo) GetPendingSigningByUserID(context.Context, uuid.UUID, []uuid.UUID) ([]*entity.WorkingPaper, error) { return nil, nil }
func (r *fakeCreateWorkingPaperRepo) CountPendingSigningByUserID(context.Context, uuid.UUID) (int, error) { return 0, nil }
func (r *fakeCreateWorkingPaperRepo) HasBlockingDocumentLink(context.Context, uuid.UUID) (bool, error) { return false, nil }

func TestCreateLatestApprovedLinksTheExactApprovedRiskID(t *testing.T) {
    orgID := uuid.New()
    approvedID := uuid.New()
    versionGroupID := uuid.New()

    riskRepo := &fakeCreateRiskRepo{risksByID: map[uuid.UUID]*entity.Risk{
        approvedID: {ID: approvedID, VersionGroupID: versionGroupID, Status: entity.RiskStatusApproved, IsCurrent: true, AssessmentCycle: "2026-H1", Code: "R-001", Title: "Gangguan server", Category: entity.RiskCategoryOperasional},
    }}
    wpRepo := &fakeCreateWorkingPaperRepo{}
    uc := NewWorkingPaperUseCase(wpRepo, riskRepo)

    _, err := uc.Create(context.Background(), CreateWorkingPaperInput{
        Title: "KK Semester I", OrgID: orgID, CreatedByUserID: uuid.New(), AssessmentCycle: "2026-H1", RiskSourceMode: "latest_approved", RiskIDs: []uuid.UUID{approvedID}, Signatories: []CreateSignatoryInput{{UserID: uuid.New(), SequenceNo: 1, SignerName: "Rina", SignerTitle: "Kabid", SignerRoleLabel: "Pemeriksa"}},
    })
    if err != nil { t.Fatalf("Create returned error: %v", err) }
    if wpRepo.created.Risks[0].RiskID != approvedID { t.Fatalf("expected linked approved risk %s, got %s", approvedID, wpRepo.created.Risks[0].RiskID) }
    if wpRepo.created.Risks[0].SourceMode != "latest_approved" { t.Fatalf("expected latest_approved source mode, got %q", wpRepo.created.Risks[0].SourceMode) }
}

func TestCreateReviewPeriodicCreatesOrReusesDraftRiskVersion(t *testing.T) {
    orgID := uuid.New()
    approvedID := uuid.New()
    versionGroupID := uuid.New()
    existingDraftID := uuid.New()

    riskRepo := &fakeCreateRiskRepo{
        risksByID: map[uuid.UUID]*entity.Risk{approvedID: {ID: approvedID, VersionGroupID: versionGroupID, Status: entity.RiskStatusApproved, IsCurrent: true, AssessmentCycle: "2026-H1", Code: "R-010", Title: "Keterlambatan distribusi", Category: entity.RiskCategoryOperasional}},
        versions: []*entity.Risk{{ID: existingDraftID, VersionGroupID: versionGroupID, Status: entity.RiskStatusDraft, AssessmentCycle: "2026-H1"}},
    }
    wpRepo := &fakeCreateWorkingPaperRepo{}
    uc := NewWorkingPaperUseCase(wpRepo, riskRepo)

    _, err := uc.Create(context.Background(), CreateWorkingPaperInput{
        Title: "KK Semester I", OrgID: orgID, CreatedByUserID: uuid.New(), AssessmentCycle: "2026-H1", RiskSourceMode: "review_periodic", RiskIDs: []uuid.UUID{approvedID}, Signatories: []CreateSignatoryInput{{UserID: uuid.New(), SequenceNo: 1, SignerName: "Rina", SignerTitle: "Kabid", SignerRoleLabel: "Pemeriksa"}},
    })
    if err != nil { t.Fatalf("Create returned error: %v", err) }
    if wpRepo.created.Risks[0].RiskID != existingDraftID { t.Fatalf("expected linked draft risk %s, got %s", existingDraftID, wpRepo.created.Risks[0].RiskID) }
}
```

- [ ] **Step 2: Run the create tests and verify they fail because the request has no source mode and the create path still builds snapshots**

Run:

```bash
go test ./internal/usecase/workingpaper -run 'TestCreateLatestApprovedLinksTheExactApprovedRiskID|TestCreateReviewPeriodicCreatesOrReusesDraftRiskVersion'
```

Expected: FAIL with unknown field `RiskSourceMode`, or assertions failing because `wpRepo.created.Risks` is empty and snapshots are still used.

- [ ] **Step 3: Implement server-side risk resolution for both source modes**

Update `backend/internal/handler/http/working_paper.go` request/input mapping:

```go
type createWorkingPaperRequest struct {
    Title          string                   `json:"title"`
    Description    string                   `json:"description"`
    AssessmentCycle string                  `json:"assessment_cycle"`
    RiskSourceMode string                   `json:"risk_source_mode"`
    RiskIDs        []uuid.UUID              `json:"risk_ids"`
    Signatories    []createSignatoryRequest `json:"signatories"`
}
```

Add `RiskSourceMode string` to `CreateWorkingPaperInput`, then create `backend/internal/usecase/workingpaper/risk_resolution.go` with helpers shaped like:

```go
func resolveLinkedRisk(ctx context.Context, repo repository.RiskRepository, riskID uuid.UUID, cycle string, sourceMode string, orgID uuid.UUID) (*entity.WorkingPaperRiskLink, error) {
    sourceRisk, err := repo.GetByID(ctx, riskID, []uuid.UUID{orgID})
    if err != nil {
        return nil, domainerrors.ErrRiskNotFound
    }

    if sourceMode == "latest_approved" {
        return buildLatestApprovedLink(sourceRisk), nil
    }

    draft, err := resolveOrCreateReassessmentDraft(ctx, repo, sourceRisk, cycle)
    if err != nil {
        return nil, err
    }

    return buildDraftLink(draft), nil
}
```

In `backend/internal/usecase/risk/reassess.go`, extract the clone helper into a reusable form that `workingpaper/create.go` can call without copying the reassessment logic.

- [ ] **Step 4: Re-run the create tests and the package tests**

Run:

```bash
go test ./internal/usecase/workingpaper ./internal/usecase/risk
```

Expected: PASS for both create-mode tests, the earlier get test, and the existing reassessment tests.

- [ ] **Step 5: Commit the create-flow source mode logic**

```bash
git add backend/internal/handler/http/working_paper.go backend/internal/usecase/workingpaper/create.go backend/internal/usecase/workingpaper/risk_resolution.go backend/internal/usecase/risk/reassess.go backend/internal/usecase/risk/reassess_test.go backend/internal/usecase/workingpaper/create_test.go
git commit -m "feat: resolve working paper risks by source mode"
```

### Task 4: Compute Document Hash from Linked Risks at Signing Time

**Files:**
- Modify: `backend/internal/domain/entity/working_paper.go`
- Modify: `backend/internal/usecase/workingpaper/sign.go`
- Create: `backend/internal/usecase/workingpaper/sign_test.go`

- [ ] **Step 1: Write the failing test for signing with relation-based hash computation**

Create `backend/internal/usecase/workingpaper/sign_test.go` with:

```go
package workingpaper

import (
    "context"
    "testing"
    "time"

    "github.com/google/uuid"
    "github.com/manris/backend/internal/domain/entity"
)

type stubSignWorkingPaperRepo struct {
    wp             *entity.WorkingPaper
    updated        *entity.WorkingPaper
    updatedSigID   uuid.UUID
}

func (r *stubSignWorkingPaperRepo) Create(context.Context, *entity.WorkingPaper) error { return nil }
func (r *stubSignWorkingPaperRepo) GetByID(context.Context, uuid.UUID) (*entity.WorkingPaper, error) { return nil, nil }
func (r *stubSignWorkingPaperRepo) List(context.Context, []uuid.UUID, string, int, int) ([]*entity.WorkingPaper, int, error) { return nil, 0, nil }
func (r *stubSignWorkingPaperRepo) Update(_ context.Context, wp *entity.WorkingPaper) error { r.updated = wp; return nil }
func (r *stubSignWorkingPaperRepo) Delete(context.Context, uuid.UUID) error { return nil }
func (r *stubSignWorkingPaperRepo) GetByIDForUpdate(context.Context, uuid.UUID) (*entity.WorkingPaper, error) { return r.wp, nil }
func (r *stubSignWorkingPaperRepo) GetSignatoriesByWorkingPaperID(context.Context, uuid.UUID) ([]*entity.WorkingPaperSignatory, error) { return nil, nil }
func (r *stubSignWorkingPaperRepo) UpdateSignatory(_ context.Context, sig *entity.WorkingPaperSignatory) error { r.updatedSigID = sig.ID; return nil }
func (r *stubSignWorkingPaperRepo) GetPendingSigningByUserID(context.Context, uuid.UUID, []uuid.UUID) ([]*entity.WorkingPaper, error) { return nil, nil }
func (r *stubSignWorkingPaperRepo) CountPendingSigningByUserID(context.Context, uuid.UUID) (int, error) { return 0, nil }
func (r *stubSignWorkingPaperRepo) HasBlockingDocumentLink(context.Context, uuid.UUID) (bool, error) { return false, nil }

func TestSignComputesDocumentHashFromLinkedRisksBeforeFirstSignature(t *testing.T) {
    signerID := uuid.New()
    sigID := uuid.New()
    wpID := uuid.New()
    repo := &stubSignWorkingPaperRepo{wp: &entity.WorkingPaper{
        ID:              wpID,
        Title:           "KK Semester I",
        Status:          entity.WorkingPaperStatusDraft,
        AssessmentCycle: "2026-H1",
        Risks: []entity.WorkingPaperRiskLink{{
            RiskID: uuid.New(),
            Risk: entity.WorkingPaperRiskData{Code: "R-001", Title: "Gangguan server", Probability: 4, Impact: 5, Nilai: 20, TingkatRisiko: entity.RiskLevelSangatTinggi, AssessmentCycle: "2026-H1"},
            CreatedAt: time.Now(),
        }},
        Signatories: []entity.WorkingPaperSignatory{{ID: sigID, UserID: signerID, SequenceNo: 1, SignerName: "Rina", SignerTitle: "Kabid", SignerRoleLabel: "Pemeriksa", Status: "pending"}},
    }}

    uc := NewWorkingPaperUseCase(repo, nil)
    got, err := uc.Sign(context.Background(), wpID, signerID)
    if err != nil { t.Fatalf("Sign returned error: %v", err) }
    if got.DocumentHash == "" { t.Fatal("expected document hash to be computed before signing") }
    if repo.updated == nil || repo.updated.DocumentHash == "" { t.Fatal("expected updated working paper to persist document hash") }
}
```

- [ ] **Step 2: Run the sign test and verify it fails because hash computation still depends on removed snapshots**

Run:

```bash
go test ./internal/usecase/workingpaper -run TestSignComputesDocumentHashFromLinkedRisksBeforeFirstSignature
```

Expected: FAIL because `ComputeHash` still marshals `RiskSnapshots`, or because the hash remains empty.

- [ ] **Step 3: Recompute the document hash from linked risk payloads right before signing**

Update `backend/internal/domain/entity/working_paper.go` so `ComputeHash()` serializes the linked risk view instead of `RiskSnapshots`:

```go
func (wp *WorkingPaper) ComputeHash() string {
    payload := struct {
        Title           string                `json:"title"`
        AssessmentCycle string                `json:"assessment_cycle"`
        Risks           []WorkingPaperRiskLink `json:"risks"`
    }{
        Title:           wp.Title,
        AssessmentCycle: wp.AssessmentCycle,
        Risks:           wp.Risks,
    }

    data, err := json.Marshal(payload)
    if err != nil {
        return ""
    }

    hash := sha256.Sum256(data)
    return hex.EncodeToString(hash[:])
}
```

Then update `backend/internal/usecase/workingpaper/sign.go`:

```go
if wp.DocumentHash == "" {
    wp.DocumentHash = wp.ComputeHash()
}
```

Place that block before QR payload generation so the QR code always contains the locked document hash.

- [ ] **Step 4: Re-run the sign test and the working paper package tests**

Run:

```bash
go test ./internal/usecase/workingpaper
```

Expected: PASS with a non-empty `DocumentHash` persisted during signing.

- [ ] **Step 5: Commit the hash/signing refactor**

```bash
git add backend/internal/domain/entity/working_paper.go backend/internal/usecase/workingpaper/sign.go backend/internal/usecase/workingpaper/sign_test.go
git commit -m "fix: hash linked risks during signing"
```

### Task 5: Block Risk Updates When a Signing or Completed Working Paper Links the Risk Version

**Files:**
- Modify: `backend/internal/domain/repository/working_paper.go`
- Modify: `backend/internal/repository/postgres/working_paper.go`
- Modify: `backend/internal/usecase/risk/update.go`
- Modify: `backend/internal/usecase/risk/category_persistence_test.go`
- Modify: `backend/cmd/server/main.go`

- [ ] **Step 1: Add a failing test for the lock rule in the risk update use case**

Append to `backend/internal/usecase/risk/category_persistence_test.go`:

```go
type lockAwareWorkingPaperRepo struct{ blocked bool }

func (r *lockAwareWorkingPaperRepo) HasBlockingDocumentLink(context.Context, uuid.UUID) (bool, error) {
    return r.blocked, nil
}

func TestUpdateRiskUseCase_ExecuteRejectsRiskLinkedToSigningWorkingPaper(t *testing.T) {
    riskID := uuid.New()
    orgID := uuid.New()
    riskRepo := &categoryRiskRepo{
        existing: &entity.Risk{
            ID: riskID,
            OrganizationID: &orgID,
            Status: entity.RiskStatusDraft,
            Category: entity.RiskCategoryOperasional,
            Title: "Gangguan server",
            Description: "Deskripsi",
        },
    }

    uc := NewUpdateRiskUseCase(riskRepo, &categoryUserRepo{}, &categoryOrgRepo{}, &lockAwareWorkingPaperRepo{blocked: true})
    _, err := uc.Execute(context.Background(), UpdateRiskInput{ID: riskID, Title: "Baru", Description: "Baru", Category: entity.RiskCategoryOperasional, Status: entity.RiskStatusDraft}, []uuid.UUID{orgID})
    if err == nil {
        t.Fatal("expected error when risk is linked to a signing/completed working paper")
    }
}
```

- [ ] **Step 2: Run the targeted risk tests and verify they fail because the constructor and guard do not exist**

Run:

```bash
go test ./internal/usecase/risk -run TestUpdateRiskUseCase_ExecuteRejectsRiskLinkedToSigningWorkingPaper
```

Expected: FAIL with a constructor mismatch for `NewUpdateRiskUseCase` or a missing lock check.

- [ ] **Step 3: Implement the derived lock query and inject it into `UpdateRiskUseCase`**

Add to `backend/internal/repository/postgres/working_paper.go`:

```go
func (r *workingPaperRepository) HasBlockingDocumentLink(ctx context.Context, riskID uuid.UUID) (bool, error) {
    var exists bool
    err := r.pool.QueryRow(ctx, `
        SELECT EXISTS (
            SELECT 1
            FROM working_paper_risks wpr
            JOIN working_papers wp ON wp.id = wpr.working_paper_id
            WHERE wpr.risk_id = $1
              AND wp.status IN ('signing', 'completed')
        )
    `, riskID).Scan(&exists)
    if err != nil {
        return false, fmt.Errorf("check blocking working paper link: %w", err)
    }
    return exists, nil
}
```

Then update `backend/internal/usecase/risk/update.go`:

```go
type UpdateRiskUseCase struct {
    riskRepo repository.RiskRepository
    userRepo repository.UserRepository
    orgRepo  repository.OrganizationRepository
    wpRepo   repository.WorkingPaperRepository
}

blocked, err := uc.wpRepo.HasBlockingDocumentLink(ctx, existingRisk.ID)
if err != nil {
    return nil, errors.Wrap(err, "failed to check working paper lock")
}
if blocked {
    return nil, errors.Wrap(errors.ErrInvalidStatus, "risk version is locked by a signing or completed working paper")
}
```

Finally update `backend/cmd/server/main.go` to pass `wpRepo` into `NewUpdateRiskUseCase(...)`.

- [ ] **Step 4: Re-run the risk tests and the working paper/risk packages together**

Run:

```bash
go test ./internal/usecase/risk ./internal/usecase/workingpaper
```

Expected: PASS, including the new lock regression.

- [ ] **Step 5: Commit the lock enforcement**

```bash
git add backend/internal/domain/repository/working_paper.go backend/internal/repository/postgres/working_paper.go backend/internal/usecase/risk/update.go backend/internal/usecase/risk/category_persistence_test.go backend/cmd/server/main.go
git commit -m "fix: block edits to linked signing risks"
```

### Task 6: Update Frontend Types, Pages, and Export to Use Linked Risks

**Files:**
- Modify: `frontend/src/types/working-paper.ts`
- Modify: `frontend/src/lib/api/working-papers.ts`
- Create: `frontend/src/lib/working-paper-linked-risks.ts`
- Modify: `frontend/src/app/(app)/risk/working-papers/new/page.tsx`
- Modify: `frontend/src/app/(app)/risk/working-papers/page.tsx`
- Modify: `frontend/src/app/(app)/risk/working-papers/[id]/page.tsx`
- Modify: `frontend/src/lib/working-paper-export.ts`
- Modify: `frontend/src/lib/working-paper-detail-view-model.test.ts`
- Create: `frontend/src/lib/working-paper-linked-risks.test.ts`

- [ ] **Step 1: Write the failing frontend tests for the new relation-based response shape**

Create `frontend/src/lib/working-paper-linked-risks.test.ts` with:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { getWorkingPaperRiskRows } from "./working-paper-linked-risks";

test("getWorkingPaperRiskRows returns nested linked risk payloads in sort order", () => {
  const result = getWorkingPaperRiskRows({
    id: "wp-1",
    title: "KK Semester I",
    org_id: "org-1",
    status: "draft",
    current_signatory_sequence: 0,
    created_by: "creator-1",
    created_at: "2026-04-01T08:00:00.000Z",
    updated_at: "2026-04-01T08:00:00.000Z",
    signatories: [],
    risks: [
      {
        id: "link-2",
        working_paper_id: "wp-1",
        risk_id: "risk-2",
        sort_order: 1,
        source_mode: "reassessment_draft",
        created_at: "2026-04-01T08:00:00.000Z",
        risk: { id: "risk-2", code: "R-002", title: "Risiko 2", category: "operasional", probability: 3, impact: 4, nilai: 12, tingkat_risiko: "Tinggi", assessment_cycle: "2026-H1" },
      },
      {
        id: "link-1",
        working_paper_id: "wp-1",
        risk_id: "risk-1",
        sort_order: 0,
        source_mode: "latest_approved",
        created_at: "2026-04-01T08:00:00.000Z",
        risk: { id: "risk-1", code: "R-001", title: "Risiko 1", category: "strategis", probability: 4, impact: 5, nilai: 20, tingkat_risiko: "Sangat Tinggi", assessment_cycle: "2026-H1" },
      },
    ],
  } as any);

  assert.deepEqual(result.map((item) => item.code), ["R-001", "R-002"]);
});
```

Then update `frontend/src/lib/working-paper-detail-view-model.test.ts` to replace `risk_snapshots: []` with `risks: []` in the factory object.

- [ ] **Step 2: Run the frontend tests and verify they fail because `risk_snapshots` is still the public contract**

Run:

```bash
node --test --experimental-strip-types src/lib/working-paper-detail-view-model.test.ts src/lib/working-paper-linked-risks.test.ts
```

Expected: FAIL because `getWorkingPaperRiskRows` does not exist and the `WorkingPaper` type still requires `risk_snapshots`.

- [ ] **Step 3: Refactor frontend types and pages to consume `risks` instead of `risk_snapshots`**

Update `frontend/src/types/working-paper.ts` to replace snapshots with:

```ts
export type WorkingPaperRiskSourceMode = "latest_approved" | "reassessment_draft";

export interface WorkingPaperRiskData {
  id: string;
  code: string;
  title: string;
  category: string;
  probability: number;
  impact: number;
  nilai: number;
  tingkat_risiko: string;
  assessment_cycle?: string;
}

export interface WorkingPaperRiskLink {
  id: string;
  working_paper_id: string;
  risk_id: string;
  sort_order: number;
  source_mode: WorkingPaperRiskSourceMode;
  created_at: string;
  risk: WorkingPaperRiskData;
}
```

Add `risk_source_mode` to `CreateWorkingPaperRequest`, then update `frontend/src/app/(app)/risk/working-papers/new/page.tsx` to add the mode selector and submit:

```ts
risk_source_mode: data.risk_source_mode,
```

Create `frontend/src/lib/working-paper-linked-risks.ts` with:

```ts
import type { WorkingPaper, WorkingPaperRiskData } from "@/types/working-paper";

export function getWorkingPaperRiskRows(workingPaper: WorkingPaper): WorkingPaperRiskData[] {
  return [...workingPaper.risks]
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((link) => link.risk);
}
```

Update the list/detail pages to count and render `data.risks` / `wp.risks`, and point `Buka risiko` to `risk.id` from the nested payload.

In `frontend/src/lib/working-paper-export.ts`, replace:

```ts
const risks = workingPaper.risk_snapshots;
```

with:

```ts
const risks = getWorkingPaperRiskRows(workingPaper);
```

- [ ] **Step 4: Re-run the targeted frontend tests and a production build**

Run:

```bash
node --test --experimental-strip-types src/lib/working-paper-detail-view-model.test.ts src/lib/working-paper-linked-risks.test.ts
npm run build
```

Expected: tests PASS and the Next.js build completes without type errors.

- [ ] **Step 5: Commit the frontend contract refactor**

```bash
git add frontend/src/types/working-paper.ts frontend/src/lib/api/working-papers.ts frontend/src/lib/working-paper-linked-risks.ts frontend/src/app/(app)/risk/working-papers/new/page.tsx frontend/src/app/(app)/risk/working-papers/page.tsx frontend/src/app/(app)/risk/working-papers/[id]/page.tsx frontend/src/lib/working-paper-export.ts frontend/src/lib/working-paper-detail-view-model.test.ts frontend/src/lib/working-paper-linked-risks.test.ts
git commit -m "refactor: render working papers from linked risks"
```

### Task 7: Final Verification and Remove Snapshot Dependencies

**Files:**
- Modify: `backend/internal/repository/postgres/working_paper.go`
- Modify: `backend/internal/domain/entity/working_paper.go`
- Modify: `frontend/src/types/working-paper.ts`
- Reference: `docs/superpowers/specs/2026-04-11-working-paper-risk-linking-design.md`

- [ ] **Step 1: Remove remaining `risk_snapshots` read/write paths now that relation-based reads pass**

Delete the old JSON marshal/unmarshal paths from `backend/internal/repository/postgres/working_paper.go` and remove any leftover `RiskSnapshot` types from `backend/internal/domain/entity/working_paper.go` and `frontend/src/types/working-paper.ts`.

The end state in `Create(...)` should look like:

```go
err = tx.QueryRow(ctx,
    `INSERT INTO working_papers (title, description, org_id, status, assessment_cycle,
            document_hash, current_signatory_sequence, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, created_at, updated_at`,
    wp.Title, wp.Description, wp.OrgID, wp.Status, wp.AssessmentCycle,
    wp.DocumentHash, wp.CurrentSignatorySequence, wp.CreatedBy,
).Scan(&wp.ID, &wp.CreatedAt, &wp.UpdatedAt)
```

- [ ] **Step 2: Run repository/usecase searches to confirm no snapshot references remain in the active implementation**

Run:

```bash
rg "risk_snapshots|RiskSnapshot|RiskSnapshots" backend/internal frontend/src
```

Expected: no matches except historical migration `000031_working_papers.up.sql` and any intentionally preserved compatibility comments.

- [ ] **Step 3: Run the full backend and frontend verification suite**

Run:

```bash
go test ./...
npm run build
```

Expected: both commands exit 0.

- [ ] **Step 4: Sanity-check the user-visible flow manually**

Run the app and verify:

```bash
npm run dev
```

Manual checklist:

```text
1. Create a working paper in "Gunakan data terakhir" mode and confirm the detail page shows linked approved risks.
2. Create a working paper in "Review berkala" mode and confirm it links to reassessment draft risk IDs.
3. Sign the document once and verify the linked reassessment draft can no longer be updated in the risk form.
4. Export the document and confirm rows match the linked risk versions, not the latest current version.
```

- [ ] **Step 5: Commit the cleanup and verification results**

```bash
git add backend/internal/repository/postgres/working_paper.go backend/internal/domain/entity/working_paper.go frontend/src/types/working-paper.ts
git commit -m "chore: remove working paper snapshot dependencies"
```

## Self-Review

### Spec coverage check
- Relation table and backfill: Task 1
- Many-to-many links to exact `risks.id`: Tasks 2 and 7
- `Review berkala` vs `Gunakan data terakhir`: Tasks 3 and 6
- Lock at `signing`: Tasks 4 and 5
- Prevent dynamic latest-version resolution: Tasks 2, 5, and 6
- Export/detail from linked risks: Task 6

### Placeholder scan
- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Every task names exact files and concrete commands.

### Type consistency check
- Backend consistently uses `WorkingPaperRiskLink` + nested `WorkingPaperRiskData`.
- Frontend consistently uses `risks` and `risk_source_mode`.
- Lock enforcement consistently uses `HasBlockingDocumentLink`.
