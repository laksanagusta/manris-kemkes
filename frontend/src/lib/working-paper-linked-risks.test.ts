import assert from "node:assert/strict";
import test from "node:test";

const { getWorkingPaperRiskRows } = await import(
  new URL("./working-paper-linked-risks", import.meta.url).href
);

test("getWorkingPaperRiskRows returns nested linked risk payloads in sort order", () => {
  const result = getWorkingPaperRiskRows({
    id: "wp-1",
    title: "KK Semester I",
    org_id: "org-1",
    status: "assessment_draft",
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

  assert.deepEqual(result.map((item: any) => item.code), ["R-001", "R-002"]);
});
