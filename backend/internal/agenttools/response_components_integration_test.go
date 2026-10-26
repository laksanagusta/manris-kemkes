//go:build integration

package agenttools

import (
	"encoding/json"
	"errors"
	"testing"

	"github.com/manris/backend/internal/agent"
)

func TestIntegrationResponseComponentsReadAuthorizedSnapshotsWithoutWrites(t *testing.T) {
	f := newDomainFixture(t)
	f.finalize(t)
	if _, err := f.pool.Exec(t.Context(), `UPDATE risks SET nilai=20 WHERE id=$1`, f.risk.ID); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"get_risk", "list_priority_risks", "compare_periods"} {
		raw := json.RawMessage(`{"cycle":"2026-Q4"}`)
		if name == "get_risk" {
			raw = json.RawMessage(content(map[string]any{"id": f.risk.ID.String()}))
		}
		result, err := f.kit.Execute(t.Context(), f.actor, name, raw)
		if err != nil {
			t.Fatal(name, err)
		}
		if len(result.Widgets) != 1 || len(result.OrganizationIDs) != 1 || result.OrganizationIDs[0] != f.org {
			t.Fatalf("unexpected result scope: %s %+v", name, result)
		}
		w := result.Widgets[0]
		switch name {
		case "get_risk":
			if w.Type != "risk_detail" || w.Risk == nil || w.Risk.ID != f.risk.ID.String() || len(w.Risk.Mitigations) != 1 || len(w.Risk.Actions) != 3 {
				t.Fatal("missing risk card", result.Content)
			}
		case "list_priority_risks":
			if w.Priorities == nil || w.Priorities.Total != 1 || len(w.Priorities.Items) != 1 || w.Priorities.Items[0].OverdueCount != 1 {
				t.Fatal("missing active risk or overdue task", result.Content)
			}
		case "compare_periods":
			if w.Comparison == nil || *w.Comparison.Rows[0].Current != 1 || w.Comparison.ComparisonCycle != "2026-Q3" {
				t.Fatal("invalid canonical comparison", result.Content)
			}
		}
	}
	for _, name := range []string{"list_priority_risks", "compare_periods"} {
		_, err := f.kit.Execute(t.Context(), f.actor, name, json.RawMessage(content(map[string]any{"cycle": "2026-Q4", "organizationIds": []string{f.foreign.String()}})))
		if !errors.Is(err, agent.ErrForbidden) {
			t.Fatal("foreign scope accepted", name, err)
		}
	}
	var taskStatus string
	if err := f.pool.QueryRow(t.Context(), `SELECT status FROM mitigation_tasks WHERE id=$1`, f.task.ID).Scan(&taskStatus); err != nil || taskStatus != "pending" {
		t.Fatal("read modified business task", err)
	}
	// A saved action is no substitute for current authorization.
	if _, err := f.pool.Exec(t.Context(), `UPDATE users SET status='inactive' WHERE id=$1`, f.actor); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"list_priority_risks", "compare_periods"} {
		if _, err := f.kit.Execute(t.Context(), f.actor, name, json.RawMessage(`{"cycle":"2026-Q4"}`)); !errors.Is(err, agent.ErrForbidden) {
			t.Fatal("revoked actor still has access", name, err)
		}
	}
}
