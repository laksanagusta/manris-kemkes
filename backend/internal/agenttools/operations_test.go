package agenttools

import (
	"context"
	"encoding/json"
	"errors"
	"net/url"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/agent"
	"github.com/manris/backend/internal/domain/entity"
)

func TestScopeFailsClosedAndSeparatesReadsFromWrites(t *testing.T) {
	t.Parallel()
	own, child, foreign := uuid.New(), uuid.New(), uuid.New()
	scope := &entity.AccessScope{OrganizationID: &own, AccessibleOrgIDs: []uuid.UUID{own, child}, Role: entity.RoleUnit}
	ids, err := readScope(scope, "")
	if err != nil || len(ids) != 1 || ids[0] != own {
		t.Fatalf("default scope: %v %v", ids, err)
	}
	if _, err = readScope(scope, child.String()); err != nil {
		t.Fatal("descendant read rejected", err)
	}
	for _, id := range []uuid.UUID{child, foreign} {
		if _, err = writeOrg(scope, id.String()); !errors.Is(err, agent.ErrForbidden) {
			t.Fatalf("cross-org write allowed: %v", err)
		}
	}
	if _, err = readScope(&entity.AccessScope{}, ""); !errors.Is(err, agent.ErrForbidden) {
		t.Fatal("empty scope became global")
	}
	if _, err = readScope(nil, ""); !errors.Is(err, agent.ErrForbidden) {
		t.Fatal("nil scope became global")
	}
	if _, err = readScope(&entity.AccessScope{IsGlobal: true}, ""); err != nil {
		t.Fatal(err)
	}
}

func TestOperationPayloadRejectsUnknownFieldsAndUnsupportedWrites(t *testing.T) {
	t.Parallel()
	stamp := time.Now().UTC().Format(time.RFC3339Nano)
	tests := []struct {
		name string
		op   agent.Operation
	}{
		{"unknown operation", agent.Operation{Kind: "delete_risk", Title: "Delete", After: map[string]any{"title": "x"}}},
		{"immutable event update", agent.Operation{Kind: "patch_risk_event", Title: "Edit", After: map[string]any{"description": "x"}}},
		{"status escalation", agent.Operation{Kind: "create_risk", Title: "Create", After: map[string]any{"status": "final"}}},
		{"owner injection", agent.Operation{Kind: "create_risk", Title: "Create", After: map[string]any{"createdBy": uuid.NewString()}}},
		{"derived score", agent.Operation{Kind: "patch_risk", Title: "Patch", TargetID: uuid.NewString(), ExpectedUpdatedAt: stamp, After: map[string]any{"nilai": 99}}},
		{"missing version", agent.Operation{Kind: "patch_risk", Title: "Patch", TargetID: uuid.NewString(), After: map[string]any{"title": "Valid"}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := validateOperationShape(tt.op); err == nil {
				t.Fatal("unsafe operation accepted")
			}
		})
	}
}

func TestDraftPatchPreservesUnmentionedFieldsAndMitigationIDs(t *testing.T) {
	t.Parallel()
	org, mid := uuid.New(), uuid.New()
	r := &entity.Risk{ID: uuid.New(), Title: "Original", Category: "operasional", Status: "draft", OrganizationID: &org, Probability: 3, Impact: 4, Description: "Keep description", ReviewSummary: "Keep review", AssessmentCycle: "2026-Q4", Mitigations: []entity.Mitigation{{ID: mid, Action: "Existing action", Owner: "PIC"}}}
	input, err := draftUpdatePayload(r, agent.Operation{Kind: "patch_risk", After: map[string]any{"title": "Changed"}})
	if err != nil {
		t.Fatal(err)
	}
	if input.Title != "Changed" || input.Description != r.Description || input.Probability != 3 || input.ReviewSummary != r.ReviewSummary || input.Mitigations[0].ID != mid {
		t.Fatalf("patch lost data: %+v", input)
	}
	input, err = draftUpdatePayload(r, agent.Operation{Kind: "patch_mitigation", After: map[string]any{"mitigationId": mid.String(), "action": "Changed action"}})
	if err != nil {
		t.Fatal(err)
	}
	if input.Mitigations[0].ID != mid || input.Mitigations[0].Owner != "PIC" || input.Mitigations[0].Action != "Changed action" {
		t.Fatalf("mitigation identity changed: %+v", input.Mitigations)
	}
	if r.Mitigations[0].Action != "Existing action" {
		t.Fatal("proposal mutated original")
	}
}

func TestFinalProfileAndStaleVersionRejected(t *testing.T) {
	t.Parallel()
	if err := editableDraft(&entity.Risk{Status: "final"}); err == nil {
		t.Fatal("final profile editable")
	}
	if err := editableDraft(&entity.Risk{Status: "draft", ArchivedAt: new(time.Time)}); err == nil {
		t.Fatal("archived draft editable")
	}
	now := time.Now().UTC().Truncate(time.Microsecond)
	if err := checkExpected(now.Add(-time.Second).Format(time.RFC3339Nano), now); !errors.Is(err, agent.ErrStale) {
		t.Fatalf("stale version: %v", err)
	}
	if err := checkExpected(now.Format(time.RFC3339Nano), now); err != nil {
		t.Fatal(err)
	}
}

func TestCreatePayloadDoesNotAllowNestedMitigationOwnership(t *testing.T) {
	t.Parallel()
	_, err := createRiskPayload(map[string]any{"title": "Valid", "probability": 3, "impact": 3, "mitigations": []any{map[string]any{"action": "Do work", "owner": "PIC", "riskId": uuid.NewString()}}}, uuid.New(), uuid.New())
	if err == nil {
		t.Fatal("nested foreign risk ID accepted")
	}
}

func TestDefinitionsExposeTypedOperationsAndActualCharts(t *testing.T) {
	t.Parallel()
	toolkit := New(nil, nil)
	definitions := toolkit.Definitions([]string{"risks", "mitigations", "incidents", "reports"})
	found := map[string]bool{}
	for _, def := range definitions {
		if !json.Valid(def.Parameters) {
			t.Fatalf("invalid schema for %s", def.Name)
		}
		found[def.Name] = true
	}
	for _, name := range []string{"list_high_risks", "list_mitigation_tasks", "list_risk_events", "quarterly_report", "propose_operations"} {
		if !found[name] {
			t.Fatalf("missing tool %s", name)
		}
	}
	var dst struct {
		Title string `json:"title"`
	}
	if strictDecode([]byte(`{"title":"x","unknown":true}`), &dst) == nil {
		t.Fatal("unknown JSON fields ignored")
	}
}

func TestSourceLinksPreserveReportScopeAndMonitoringTarget(t *testing.T) {
	org, riskID, monitoringID := uuid.New(), uuid.New(), uuid.New()
	for _, ids := range [][]uuid.UUID{{org}, {}} {
		parsed, err := url.Parse(quarterlyReportHref("2026-Q4", "2026-Q2", ids))
		if err != nil || parsed.Path != "/reports" {
			t.Fatal("invalid report source", parsed, err)
		}
		q := parsed.Query()
		if q.Get("cycle") != "2026-Q4" || q.Get("compare_cycle") != "2026-Q2" || !q.Has("org_id") {
			t.Fatal("source lost report filters", q)
		}
		if len(ids) > 0 && q.Get("org_id") != org.String() {
			t.Fatal("source lost selected organization", q)
		}
	}
	task := &entity.MitigationTask{RiskID: riskID, MonitoringID: &monitoringID}
	if taskHref(task) != "/risk/monitoring/"+monitoringID.String() {
		t.Fatal("linked task must open its monitoring transaction")
	}
}

func TestReviewedPayloadEnforcesDeclaredNumericAndScheduleBounds(t *testing.T) {
	r := &entity.Risk{ID: uuid.New(), Title: "Valid", Category: "operasional", Probability: 3, Impact: 3}
	if _, err := draftUpdatePayload(r, agent.Operation{Kind: "patch_risk", After: map[string]any{"targetProbability": 99}}); !errors.Is(err, agent.ErrInvalid) {
		t.Fatal("invalid target score accepted", err)
	}
	day, date, interval := -1, 32, "yearly"
	for _, mitigation := range []entity.Mitigation{{Action: "Valid", Owner: "PIC", ReportDay: &day}, {Action: "Valid", Owner: "PIC", ReportDate: &date}, {Action: "Valid", Owner: "PIC", RecurringInterval: &interval}} {
		if err := New(nil, nil).validateMitigationOwners(context.Background(), nil, []entity.Mitigation{mitigation}, uuid.New(), false); !errors.Is(err, agent.ErrInvalid) {
			t.Fatal("invalid schedule accepted", mitigation, err)
		}
	}
}

func TestMitigationReportMatchesPenangananFields(t *testing.T) {
	base := agent.Operation{Kind: "report_mitigation_task", Title: "Laporkan mitigasi", TargetID: uuid.NewString(), ExpectedUpdatedAt: time.Now().UTC().Format(time.RFC3339Nano)}
	for _, after := range []map[string]any{
		{"notes": "Penyuluhan telah dilaksanakan", "evidenceUrl": "https://example.org/bukti"},
		{"notes": "Penyuluhan telah dilaksanakan", "evidenceUrl": ""},
	} {
		base.After = after
		if err := validateOperationShape(base); err != nil {
			t.Fatal("valid Penanganan report rejected", err)
		}
		input, err := mitigationReportInput(after)
		if err != nil || input.Status != "done" || input.Notes != after["notes"] || input.EvidenceURL != after["evidenceUrl"] {
			t.Fatalf("report must use Penanganan's automatic done transition: %+v, %v", input, err)
		}
	}
	for _, field := range []string{"reportOutput", "reportObstacle", "status"} {
		base.After = map[string]any{"notes": "Penyuluhan telah dilaksanakan", field: "legacy"}
		if err := validateOperationShape(base); err == nil {
			t.Errorf("unsupported reporting field %s accepted", field)
		}
		if _, ok := reportFields()[field]; ok {
			t.Errorf("model is still offered unsupported field %s", field)
		}
	}
	for _, after := range []map[string]any{
		{"evidenceUrl": "https://example.org"}, {"notes": "pendek"},
		{"notes": "Penyuluhan telah dilaksanakan", "evidenceUrl": "bukan-link"},
		{"notes": "Penyuluhan telah dilaksanakan", "evidenceUrl": "https://example.org/a\nhttps://example.org/b"},
	} {
		base.After = after
		if err := validateOperationShape(base); err == nil {
			t.Errorf("invalid Penanganan report accepted: %v", after)
		}
	}
}
