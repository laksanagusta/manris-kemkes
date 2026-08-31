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

func TestWorkingPaperRiskQueryUsesSourceRiskNextReviewDateForSchedule(t *testing.T) {
	source, err := os.ReadFile("working_paper.go")
	if err != nil {
		t.Fatalf("read working_paper.go: %v", err)
	}
	querySource := string(source)

	for _, snippet := range []string{
		"LEFT JOIN risks source_risk ON source_risk.id = COALESCE(wpr.source_risk_id, wpr.risk_id)",
		"COALESCE(source_risk.next_review_date::text, '')",
	} {
		if !strings.Contains(querySource, snippet) {
			t.Fatalf("working paper query missing %q", snippet)
		}
	}
	if strings.Contains(querySource, "COALESCE(risk.review_schedule_text, '')") {
		t.Fatal("working paper export schedule must not use review_schedule_text")
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
		Title: "Kertas Kerja A1",

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
		Title: "Kertas Kerja A2",

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
		Title: "Kertas Kerja B1",

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

func TestPreviousApprovedWorkingPaperRiskExprPrefersPreviousQuarterBeforeFallbackVersion(t *testing.T) {
	expr := previousApprovedWorkingPaperRiskExpr()

	expectedSnippets := []string{
		"prev.version_number < risk.version_number",
		"COALESCE(prev.assessment_cycle, '') = CASE",
		"RIGHT(risk.assessment_cycle, 2) = 'Q1'",
		"THEN ((LEFT(risk.assessment_cycle, 4))::int - 1)::text",
		"THEN '4'",
		"ELSE ((RIGHT(risk.assessment_cycle, 1))::int - 1)::text",
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

func TestWorkingPaperMonitoringExprPrefersFinalizedInSameQuarter(t *testing.T) {
	expr := workingPaperMonitoringExpr()

	expectedSnippets := []string{
		"LEFT JOIN LATERAL (",
		"JOIN risks monitoring_source ON monitoring_source.id = rm.source_risk_id",
		"monitoring_source.version_group_id = risk.version_group_id",
		"rm.assessment_cycle = wp.assessment_cycle",
		"rm.status IN ('draft', 'final')",
		"CASE rm.status WHEN 'final' THEN 0 ELSE 1 END",
		"rm.updated_at DESC",
		"LIMIT 1",
	}

	for _, snippet := range expectedSnippets {
		if !strings.Contains(expr, snippet) {
			t.Fatalf("expected monitoring expression to contain %q, got:\n%s", snippet, expr)
		}
	}

}

func TestWorkingPaperRosterCreationDoesNotCreateMonitoring(t *testing.T) {
	source, err := os.ReadFile("working_paper_roster.go")
	if err != nil {
		t.Fatalf("read working_paper_roster.go: %v", err)
	}
	contents := string(source)

	if !strings.Contains(contents, "entry.MonitoringID") {
		t.Fatal("roster creation must persist the existing monitoring reference when present")
	}
	if strings.Contains(contents, "NewRiskMonitoringDraft(") || strings.Contains(contents, "insertRiskMonitoring(ctx, tx") {
		t.Fatal("roster creation must not create monitoring rows")
	}
}

func TestWorkingPaperRepositoryHydratesMonitoringSelection(t *testing.T) {
	pool := setupWorkingPaperPool(t)
	repo := NewWorkingPaperRepository(pool)
	riskRepo := NewRiskRepository(pool)
	monitoringRepo := NewRiskMonitoringRepository(pool)
	ctx := context.Background()

	orgID := insertWorkingPaperTestOrganization(t, pool, "Working Paper Monitoring Org")
	userID := insertWorkingPaperTestUser(t, pool, orgID, "working-paper-monitoring-user")

	versionGroupID := uuid.New()
	sourceRisk := &entity.Risk{
		Code:            "R-WP-MON-001",
		Title:           "Monitoring source risk",
		Description:     "Base risk for monitoring selection",
		Category:        entity.RiskCategoryOperasional,
		Status:          entity.RiskStatusApproved,
		VersionGroupID:  versionGroupID,
		IsCurrent:       true,
		IsCycleCurrent:  true,
		VersionNumber:   3,
		OrganizationID:  &orgID,
		CreatedBy:       &userID,
		AssessmentCycle: "2025-H2",
		Probability:     3,
		Impact:          4,
		RiskSource:      "internal",
		Controllability: "C",
		TreatmentOption: "mitigasi",
	}
	if err := riskRepo.Create(ctx, sourceRisk); err != nil {
		t.Fatalf("Create source risk: %v", err)
	}
	t.Cleanup(func() { _, _ = pool.Exec(context.Background(), `DELETE FROM risks WHERE id = $1`, sourceRisk.ID) })

	draftSource := &entity.Risk{
		Code:            "R-WP-MON-002",
		Title:           "Draft monitoring source risk",
		Description:     "Competing draft monitoring source",
		Category:        entity.RiskCategoryOperasional,
		Status:          entity.RiskStatusApproved,
		VersionGroupID:  versionGroupID,
		IsCurrent:       false,
		IsCycleCurrent:  true,
		VersionNumber:   4,
		OrganizationID:  &orgID,
		CreatedBy:       &userID,
		AssessmentCycle: "2025-H2",
		Probability:     2,
		Impact:          5,
		RiskSource:      "internal",
		Controllability: "C",
		TreatmentOption: "mitigasi",
	}
	if err := riskRepo.Create(ctx, draftSource); err != nil {
		t.Fatalf("Create draft source risk: %v", err)
	}
	t.Cleanup(func() { _, _ = pool.Exec(context.Background(), `DELETE FROM risks WHERE id = $1`, draftSource.ID) })

	finalMonitoring := entity.NewRiskMonitoringDraft(sourceRisk, "2026-H1", userID)
	finalMonitoring.Status = entity.RiskMonitoringStatusFinalized
	finalMonitoring.ObservedProbability = 2
	finalMonitoring.ObservedImpact = 3
	finalMonitoring.CalculateObservedScore()
	finalMonitoring.MitigationProgressSummary = "Tiga aksi selesai"
	finalMonitoring.MitigationCompletionPercent = 75
	if err := monitoringRepo.Create(ctx, finalMonitoring); err != nil {
		t.Fatalf("Create finalized monitoring: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM risk_monitorings WHERE id = $1`, finalMonitoring.ID)
	})

	draftMonitoring := entity.NewRiskMonitoringDraft(draftSource, "2026-H1", userID)
	draftMonitoring.ObservedProbability = 4
	draftMonitoring.ObservedImpact = 4
	draftMonitoring.CalculateObservedScore()
	draftMonitoring.MitigationProgressSummary = "Dua aksi berjalan"
	draftMonitoring.MitigationCompletionPercent = 50
	if err := monitoringRepo.Create(ctx, draftMonitoring); err != nil {
		t.Fatalf("Create draft monitoring: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM risk_monitorings WHERE id = $1`, draftMonitoring.ID)
	})

	wp := &entity.WorkingPaper{
		Title:                    "Kertas Kerja 2026-H1",
		OrgID:                    orgID,
		Status:                   entity.WorkingPaperStatusDraft,
		AssessmentCycle:          "2026-H1",
		DocumentHash:             "hash-monitoring",
		CurrentSignatorySequence: 0,
		CreatedBy:                userID,
		Risks: []entity.WorkingPaperRiskLink{
			{RiskID: sourceRisk.ID, SourceMode: "review_periodic"},
		},
		Signatories: []entity.WorkingPaperSignatory{
			{
				UserID:        userID,
				SequenceNo:    1,
				SignerName:    "Tester",
				SignerJabatan: "Tester",
				SignerPangkat: "Tester",
				Status:        "pending",
			},
		},
	}
	if err := repo.Create(ctx, wp); err != nil {
		t.Fatalf("Create working paper: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM working_paper_signatories WHERE working_paper_id = $1`, wp.ID)
		_, _ = pool.Exec(context.Background(), `DELETE FROM working_paper_risks WHERE working_paper_id = $1`, wp.ID)
		_, _ = pool.Exec(context.Background(), `DELETE FROM working_papers WHERE id = $1`, wp.ID)
	})

	got, err := repo.GetByID(ctx, wp.ID)
	if err != nil {
		t.Fatalf("GetByID returned error: %v", err)
	}
	if len(got.Risks) != 1 {
		t.Fatalf("expected 1 linked risk, got %d", len(got.Risks))
	}
	monitoring := got.Risks[0].Risk.Monitoring
	if monitoring == nil {
		t.Fatal("expected monitoring snapshot to be hydrated")
	}
	if monitoring.ID != finalMonitoring.ID {
		t.Fatalf("expected finalized monitoring %s, got %s", finalMonitoring.ID, monitoring.ID)
	}
	if monitoring.Status != entity.RiskMonitoringStatusFinalized {
		t.Fatalf("expected finalized status, got %q", monitoring.Status)
	}
	if monitoring.AssessmentCycle != "2026-H1" {
		t.Fatalf("expected target quarter 2026-H1, got %q", monitoring.AssessmentCycle)
	}
	if monitoring.MitigationCompletionPercent != 75 {
		t.Fatalf("expected completion 75, got %d", monitoring.MitigationCompletionPercent)
	}
	if got.Risks[0].Risk.MonitoringP != 2 || got.Risks[0].Risk.MonitoringD != 3 {
		t.Fatalf("expected observed P/D 2/3, got %d/%d", got.Risks[0].Risk.MonitoringP, got.Risks[0].Risk.MonitoringD)
	}
}

func TestWorkingPaperRepositoryReturnsNilMonitoringWhenNoMatchingTransactionExists(t *testing.T) {
	pool := setupWorkingPaperPool(t)
	repo := NewWorkingPaperRepository(pool)
	riskRepo := NewRiskRepository(pool)
	ctx := context.Background()

	orgID := insertWorkingPaperTestOrganization(t, pool, "Working Paper No Monitoring Org")
	userID := insertWorkingPaperTestUser(t, pool, orgID, "working-paper-no-monitoring-user")

	versionGroupID := uuid.New()
	sourceRisk := &entity.Risk{
		Code:            "R-WP-MON-004",
		Title:           "Risk without monitoring",
		Description:     "No matching monitoring exists",
		Category:        entity.RiskCategoryOperasional,
		Status:          entity.RiskStatusApproved,
		VersionGroupID:  versionGroupID,
		IsCurrent:       true,
		IsCycleCurrent:  true,
		VersionNumber:   1,
		OrganizationID:  &orgID,
		CreatedBy:       &userID,
		AssessmentCycle: "2025-H2",
		Probability:     2,
		Impact:          2,
		RiskSource:      "internal",
		Controllability: "C",
		TreatmentOption: "mitigasi",
	}
	if err := riskRepo.Create(ctx, sourceRisk); err != nil {
		t.Fatalf("Create source risk: %v", err)
	}
	t.Cleanup(func() { _, _ = pool.Exec(context.Background(), `DELETE FROM risks WHERE id = $1`, sourceRisk.ID) })

	wp := &entity.WorkingPaper{
		Title:                    "Kertas Kerja 2026-H1",
		OrgID:                    orgID,
		Status:                   entity.WorkingPaperStatusDraft,
		AssessmentCycle:          "2026-H1",
		DocumentHash:             "hash-no-monitoring",
		CurrentSignatorySequence: 0,
		CreatedBy:                userID,
		Risks: []entity.WorkingPaperRiskLink{
			{RiskID: sourceRisk.ID, SourceMode: "review_periodic"},
		},
		Signatories: []entity.WorkingPaperSignatory{
			{
				UserID:        userID,
				SequenceNo:    1,
				SignerName:    "Tester",
				SignerJabatan: "Tester",
				SignerPangkat: "Tester",
				Status:        "pending",
			},
		},
	}
	if err := repo.Create(ctx, wp); err != nil {
		t.Fatalf("Create working paper: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM working_paper_signatories WHERE working_paper_id = $1`, wp.ID)
		_, _ = pool.Exec(context.Background(), `DELETE FROM working_paper_risks WHERE working_paper_id = $1`, wp.ID)
		_, _ = pool.Exec(context.Background(), `DELETE FROM working_papers WHERE id = $1`, wp.ID)
	})

	got, err := repo.GetByID(ctx, wp.ID)
	if err != nil {
		t.Fatalf("GetByID returned error: %v", err)
	}
	if len(got.Risks) != 1 {
		t.Fatalf("expected 1 linked risk, got %d", len(got.Risks))
	}
	if got.Risks[0].Risk.Monitoring != nil {
		t.Fatalf("expected no monitoring snapshot, got %#v", got.Risks[0].Risk.Monitoring)
	}
	if got.Risks[0].Risk.MonitoringP != 0 || got.Risks[0].Risk.MonitoringNilai != 0 {
		t.Fatalf("expected empty flat monitoring fields, got %+v", got.Risks[0].Risk)
	}
}
