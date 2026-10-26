//go:build integration

package agenttools

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/agent"
	"github.com/manris/backend/internal/repository/postgres"
	eventuc "github.com/manris/backend/internal/usecase/risk_event"
)

func TestIntegrationMonitoringEditsStayDraftPreservePlansAndRejectStaleSource(t *testing.T) {
	f := newDomainFixture(t)
	f.finalize(t)
	ctx := t.Context()
	reassess, err := f.kit.ValidateOperations(ctx, f.actor, []agent.Operation{f.patch("reassess_risk", map[string]any{"cycle": "2027-Q1"})})
	if err != nil {
		t.Fatal(err)
	}
	tx, err := f.pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	if _, err = f.kit.Apply(ctx, tx, f.actor, reassess); err != nil {
		t.Fatal(err)
	}
	if err = tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	repo := postgres.NewRiskMonitoringRepository(f.pool)
	monitoring, err := repo.GetByVersionGroupAndCycle(ctx, f.risk.VersionGroupID, "2027-Q1")
	if err != nil {
		t.Fatal(err)
	}
	read, err := f.kit.Execute(ctx, f.actor, "get_risk_monitoring", json.RawMessage(content(map[string]any{"id": monitoring.ID.String()})))
	if err != nil || !strings.Contains(read.Content, monitoring.ID.String()) {
		t.Fatalf("read: %v %s", err, read.Content)
	}
	mid := monitoring.DraftPayloadSnapshot().Mitigations[0].ID
	op := agent.Operation{ID: uuid.NewString(), Kind: "patch_monitoring", Title: "Reviewed observation", TargetID: monitoring.ID.String(), OrganizationID: f.org.String(), ExpectedUpdatedAt: monitoring.UpdatedAt.UTC().Format(time.RFC3339Nano), Included: true, After: map[string]any{"observedProbability": 3, "observedImpact": 4, "conclusion": "Hasil uji", "values": map[string]any{"title": "Profil dalam draf", "mitigations": []any{map[string]any{"id": mid.String(), "action": "Rencana yang diperbarui"}}}}}
	op.After["mitigationCompletionPercent"] = 50
	if _, err = f.kit.ValidateOperations(ctx, f.actor, []agent.Operation{op}); err == nil {
		t.Fatal("accepted manual progress over task-derived progress")
	}
	delete(op.After, "mitigationCompletionPercent")
	validated, err := f.kit.ValidateOperations(ctx, f.actor, []agent.Operation{op})
	if err != nil {
		t.Fatal(err)
	}
	before, err := repo.GetByID(ctx, monitoring.ID, []uuid.UUID{f.org})
	if err != nil {
		t.Fatal(err)
	}
	if before.Conclusion == "Hasil uji" {
		t.Fatal("proposal persisted edits before approval")
	}
	tx, err = f.pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	if _, err = f.kit.Apply(ctx, tx, f.actor, validated); err != nil {
		t.Fatal(err)
	}
	if err = tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	after, err := repo.GetByID(ctx, monitoring.ID, []uuid.UUID{f.org})
	if err != nil {
		t.Fatal(err)
	}
	plans := after.DraftPayloadSnapshot().Mitigations
	if after.Status != "draft" || after.ObservedProbability != 3 || after.MitigationCompletionPercent != 0 || after.Conclusion != "Hasil uji" || len(plans) != 1 || plans[0].ID != mid || plans[0].Action != "Rencana yang diperbarui" {
		t.Fatalf("invalid saved draft: %+v", after)
	}
	source, err := postgres.NewRiskRepository(f.pool).GetByID(ctx, f.risk.ID, []uuid.UUID{f.org})
	if err != nil {
		t.Fatal(err)
	}
	if source.Title != f.risk.Title || source.Status != "final" {
		t.Fatal("final source changed")
	}
	// A new package becomes stale if its underlying source changes after review.
	op.ExpectedUpdatedAt = after.UpdatedAt.UTC().Format(time.RFC3339Nano)
	validated, err = f.kit.ValidateOperations(ctx, f.actor, []agent.Operation{op})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.pool.Exec(ctx, `UPDATE risks SET updated_at=updated_at+interval '1 second' WHERE id=$1`, f.risk.ID); err != nil {
		t.Fatal(err)
	}
	tx, err = f.pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	if _, err = f.kit.Apply(ctx, tx, f.actor, validated); err == nil {
		t.Fatal("stale source was accepted")
	}
}

func TestIntegrationIncidentLinkIsPreviewOnlyAndImmutable(t *testing.T) {
	f := newDomainFixture(t)
	ctx := t.Context()
	service := eventuc.NewService(postgres.NewRiskEventRepository(f.pool), postgres.NewRiskRepository(f.pool))
	input, err := eventPayload(map[string]any{"description": "Immutable test event", "occurredAt": "2026-10-20T10:00:00+07:00", "impactTypes": []any{"operational"}, "severity": "high"}, f.org, f.actor)
	if err != nil {
		t.Fatal(err)
	}
	event, err := service.Create(ctx, input)
	if err != nil {
		t.Fatal(err)
	}
	op := agent.Operation{ID: uuid.NewString(), Kind: "link_risk_event", Title: "Reviewed event link", TargetID: event.ID.String(), OrganizationID: f.org.String(), ExpectedUpdatedAt: event.UpdatedAt.UTC().Format(time.RFC3339Nano), Included: true, After: map[string]any{"riskIds": []any{f.risk.ID.String()}}}
	validated, err := f.kit.ValidateOperations(ctx, f.actor, []agent.Operation{op})
	if err != nil {
		t.Fatal(err)
	}
	before, err := postgres.NewRiskEventRepository(f.pool).GetByID(ctx, event.ID, []uuid.UUID{f.org})
	if err != nil {
		t.Fatal(err)
	}
	if len(before.LinkedRisks) != 0 {
		t.Fatal("proposal added links")
	}
	tx, err := f.pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	if _, err = f.kit.Apply(ctx, tx, f.actor, validated); err != nil {
		t.Fatal(err)
	}
	if err = tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	after, err := postgres.NewRiskEventRepository(f.pool).GetByID(ctx, event.ID, []uuid.UUID{f.org})
	if err != nil {
		t.Fatal(err)
	}
	if len(after.LinkedRisks) != 1 || after.LinkedRisks[0].ID != f.risk.ID || after.Description != event.Description || after.Severity != event.Severity || !after.UpdatedAt.After(event.UpdatedAt) {
		t.Fatalf("invalid linked event: %+v", after)
	}
}

func TestIntegrationAdHocReportUsesAuthorizedCompletePopulation(t *testing.T) {
	f := newDomainFixture(t)
	f.finalize(t)
	for _, name := range []string{"analyze_report", "list_report_units"} {
		raw := json.RawMessage(`{"query":"Agent tools test"}`)
		if name == "analyze_report" {
			raw = json.RawMessage(`{"cycle":"2026-Q4","comparisonCycle":"2026-Q3","metric":"risks","groupBy":"organization"}`)
		}
		result, err := f.kit.Execute(t.Context(), f.actor, name, raw)
		if err != nil {
			t.Fatal(name, err)
		}
		if len(result.Widgets) == 0 || len(result.OrganizationIDs) == 0 {
			t.Fatal("missing scoped snapshot", name)
		}
		if name == "analyze_report" && !strings.Contains(result.Content, `"population":1`) {
			t.Fatal("missing canonical profile", result.Content)
		}
	}
	// A forged scope never reaches an unscoped report query.
	_, err := f.kit.Execute(t.Context(), f.actor, "analyze_report", json.RawMessage(content(map[string]any{"organizationIds": []string{f.foreign.String()}})))
	if err == nil {
		t.Fatal("foreign analysis permitted")
	}
}

func TestIntegrationRiskCodesIgnoreImportLabelsAndUseNumericOrdering(t *testing.T) {
	f := newDomainFixture(t)
	other := newDomainFixture(t)
	ctx := t.Context()
	if _, err := f.pool.Exec(ctx, `UPDATE risks SET code='R-999' WHERE id=$1`, other.risk.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := f.pool.Exec(ctx, `UPDATE risks SET code='R-1000' WHERE id=$1`, f.risk.ID); err != nil {
		t.Fatal(err)
	}
	code, err := postgres.NewRiskRepository(f.pool).NextRiskCode(ctx)
	if err != nil || code != "R-1001" {
		t.Fatalf("numeric allocation: %q %v", code, err)
	}
	// A lexically larger imported label must not reset allocation to R-001.
	if _, err = f.pool.Exec(ctx, `UPDATE risks SET code='R-ZZ-imported-risk' WHERE id=$1`, f.risk.ID); err != nil {
		t.Fatal(err)
	}
	code, err = postgres.NewRiskRepository(f.pool).NextRiskCode(ctx)
	if err != nil || code != "R-1000" {
		t.Fatalf("import label reset existing numeric codes: %q %v", code, err)
	}
}
