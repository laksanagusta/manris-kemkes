package postgres

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestFinalizedScoreExprUsesApprovedReviewedBundleWithFallback(t *testing.T) {
	expr := finalizedScoreExpr("r")
	for _, want := range []string{
		"r.status = 'approved'",
		"r.reviewed_probability IS NOT NULL",
		"r.reviewed_impact IS NOT NULL",
		"r.reviewed_weight IS NOT NULL",
		"r.reviewed_nilai IS NOT NULL",
		"r.reviewed_score IS NOT NULL",
		"THEN r.reviewed_score",
		`COALESCE(
			r.inherent_score`,
		"ROUND(COALESCE(r.nilai, r.probability * r.impact * COALESCE(r.weight, 1.0)))::int",
	} {
		if !strings.Contains(expr, want) {
			t.Fatalf("expected finalized score expr to contain %q, got:\n%s", want, expr)
		}
	}
}

func TestFinalizedProbabilityAndImpactExprUseReviewedBundleOnlyForApprovedRows(t *testing.T) {
	cases := []struct {
		name         string
		expr         string
		wantReviewed string
		wantFallback string
	}{
		{"probability", finalizedProbabilityExpr("r"), "THEN r.reviewed_probability", "ELSE r.probability"},
		{"impact", finalizedImpactExpr("r"), "THEN r.reviewed_impact", "ELSE r.impact"},
	}

	for _, tt := range cases {
		if !strings.Contains(tt.expr, "r.status = 'approved'") {
			t.Fatalf("%s expr should gate on approved status, got:\n%s", tt.name, tt.expr)
		}
		if !strings.Contains(tt.expr, tt.wantReviewed) {
			t.Fatalf("%s expr should use reviewed field when complete, got:\n%s", tt.name, tt.expr)
		}
		if !strings.Contains(tt.expr, tt.wantFallback) {
			t.Fatalf("%s expr should fall back to preliminary field, got:\n%s", tt.name, tt.expr)
		}
	}
}

func TestQueueExpressionsPreservePreviewCandidateSemantics(t *testing.T) {
	baseScore := finalizedScoreExpr("base")
	candidateScore := finalizedScoreExpr("candidate")
	if !strings.Contains(baseScore, "base.status = 'approved'") {
		t.Fatalf("expected base score to use approved gating, got:\n%s", baseScore)
	}
	if !strings.Contains(candidateScore, "candidate.status = 'approved'") {
		t.Fatalf("expected candidate score to use approved gating, got:\n%s", candidateScore)
	}
	if !strings.Contains(candidateScore, `COALESCE(
			candidate.inherent_score`) {
		t.Fatalf("expected candidate score to preserve preview fallback, got:\n%s", candidateScore)
	}
}

func TestHeatmapVelocityQueryUsesFinalizedPlacementAndMovementSemantics(t *testing.T) {
	query := heatmapVelocityQuery()

	for _, want := range []string{
		finalizedProbabilityExpr("curr") + " AS probability,",
		finalizedImpactExpr("curr") + " AS impact,",
		"WHEN (" + finalizedScoreExpr("prev") + ") IS NULL THEN 'new'",
		"WHEN (" + finalizedScoreExpr("curr") + ") > (" + finalizedScoreExpr("prev") + ") THEN 'up'",
		"WHEN (" + finalizedScoreExpr("curr") + ") < (" + finalizedScoreExpr("prev") + ") THEN 'down'",
	} {
		if !strings.Contains(query, want) {
			t.Fatalf("expected heatmap velocity query to contain %q, got:\n%s", want, query)
		}
	}
}

func TestHeatmapVelocityQueryKeepsApprovedBundleFallbackCoherent(t *testing.T) {
	query := heatmapVelocityQuery()

	for _, want := range []string{
		"curr.reviewed_probability IS NOT NULL",
		"curr.reviewed_impact IS NOT NULL",
		"curr.reviewed_weight IS NOT NULL",
		"curr.reviewed_nilai IS NOT NULL",
		"curr.reviewed_score IS NOT NULL",
		"prev.reviewed_probability IS NOT NULL",
		"prev.reviewed_impact IS NOT NULL",
		"prev.reviewed_weight IS NOT NULL",
		"prev.reviewed_nilai IS NOT NULL",
		"prev.reviewed_score IS NOT NULL",
		"ELSE curr.probability",
		"ELSE curr.impact",
		"prev.inherent_score",
		"curr.inherent_score",
	} {
		if !strings.Contains(query, want) {
			t.Fatalf("expected coherent fallback evidence %q in heatmap velocity query, got:\n%s", want, query)
		}
	}
}

func TestCompareCyclesUsesFinalizedScoreExpr(t *testing.T) {
	source, err := os.ReadFile(filepath.Join("risk.go"))
	if err != nil {
		t.Fatalf("read risk.go: %v", err)
	}

	contents := string(source)
	start := strings.Index(contents, "func (r *riskRepository) CompareCycles")
	if start == -1 {
		t.Fatal("CompareCycles function not found")
	}
	end := strings.Index(contents[start:], "func previousCycle")
	if end == -1 {
		t.Fatal("CompareCycles block terminator not found")
	}
	block := contents[start : start+end]

	// CompareCycles must use centralized finalizedScoreExpr helpers, not raw inherent_score
	for _, want := range []string{
		`finalizedScoreExpr("prev")`,
		`finalizedScoreExpr("curr")`,
		"(curr_score - prev_score) AS score_delta",
		"WHEN curr_score > prev_score THEN 'up'",
	} {
		if !strings.Contains(block, want) {
			t.Fatalf("expected CompareCycles to use finalized score expressions %q, got:\n%s", want, block)
		}
	}

	// Must NOT contain raw inherent_score references (bypassing centralized helpers)
	for _, forbidden := range []string{
		"prev.inherent_score",
		"curr.inherent_score",
	} {
		if strings.Contains(block, forbidden) {
			t.Fatalf("CompareCycles must not use raw %q — should use finalizedScoreExpr instead", forbidden)
		}
	}
}

func TestCurrentRiskQueriesUseFinalizedScoreSemanticsForRankingAndCounting(t *testing.T) {
	source, err := os.ReadFile(filepath.Join("risk.go"))
	if err != nil {
		t.Fatalf("read risk.go: %v", err)
	}

	contents := string(source)
	for _, want := range []string{
		"scoreExpr := finalizedScoreExpr(\"r\")",
		"currentScoreExpr := finalizedScoreExpr(\"base\")",
		"candidateScoreExpr := finalizedScoreExpr(\"candidate\")",
		"finalizedProbabilityExpr(\"r\")",
		"finalizedImpactExpr(\"r\")",
		"finalizedScoreExpr(\"r\")",
	} {
		if !strings.Contains(contents, want) {
			t.Fatalf("expected current risk queries to retain finalized score semantics %q, got:\n%s", want, contents)
		}
	}
}

func TestCurrentRiskQueriesKeepRankingAndBandCountsOnSameFinalizedScoreExpr(t *testing.T) {
	source, err := os.ReadFile(filepath.Join("risk.go"))
	if err != nil {
		t.Fatalf("read risk.go: %v", err)
	}

	contents := string(source)
	for _, want := range []string{
		"SELECT COUNT(*) FROM risks r WHERE r.status != 'draft' AND r.is_cycle_current = TRUE AND r.assessment_cycle = $1 AND (%s) >= 15",
		"COUNT(*) FILTER (WHERE (%[1]s) < 5) as sangat_rendah",
		"COUNT(*) FILTER (WHERE (%[1]s) >= 5 AND (%[1]s) < 10) as rendah",
		"COUNT(*) FILTER (WHERE (%[1]s) >= 10 AND (%[1]s) < 15) as sedang",
		"COUNT(*) FILTER (WHERE (%[1]s) >= 15 AND (%[1]s) < 20) as tinggi",
		"COUNT(*) FILTER (WHERE (%[1]s) >= 20) as ekstrem",
		"ORDER BY (%s) DESC, r.created_at DESC",
	} {
		if !strings.Contains(contents, want) {
			t.Fatalf("expected ranking/count parity marker %q, got:\n%s", want, contents)
		}
	}
}

func TestTopRisksQueryReturnsReviewedBundleForDisplayParity(t *testing.T) {
	source, err := os.ReadFile(filepath.Join("risk.go"))
	if err != nil {
		t.Fatalf("read risk.go: %v", err)
	}

	contents := string(source)
	start := strings.Index(contents, "func (r *riskRepository) TopRisks")
	if start == -1 {
		t.Fatal("TopRisks function not found")
	}
	end := strings.Index(contents[start:], "func (r *riskRepository) ListVersions")
	if end == -1 {
		t.Fatal("TopRisks block terminator not found")
	}
	block := contents[start : start+end]

	for _, want := range []string{
		"r.nilai",
		"r.reviewed_probability",
		"r.reviewed_impact",
		"r.reviewed_weight",
		"r.reviewed_nilai",
		"r.reviewed_score",
		"&risk.Nilai",
		"&risk.ReviewedProbability",
		"&risk.ReviewedImpact",
		"&risk.ReviewedWeight",
		"&risk.ReviewedNilai",
		"&risk.ReviewedScore",
	} {
		if !strings.Contains(block, want) {
			t.Fatalf("expected TopRisks payload parity marker %q, got:\n%s", want, block)
		}
	}
}
