package postgres

import (
	"os"
	"strings"
	"testing"
)

func TestWorkingPaperRiskQueryReturnsPersistedRosterLinkIDs(t *testing.T) {
	body, err := os.ReadFile("working_paper.go")
	if err != nil {
		t.Fatalf("read working_paper.go: %v", err)
	}
	source := string(body)

	for _, snippet := range []string{
		"COALESCE(wpr.version_group_id, risk.version_group_id)",
		"COALESCE(wpr.source_risk_id, wpr.risk_id)",
		"wpr.monitoring_id",
		"wpr.result_risk_id",
		"&link.VersionGroupID",
		"&link.SourceRiskID",
		"&link.MonitoringID",
		"&link.ResultRiskID",
	} {
		if !strings.Contains(source, snippet) {
			t.Fatalf("working paper risk query missing %q", snippet)
		}
	}
}
