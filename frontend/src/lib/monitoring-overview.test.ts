import assert from "node:assert/strict";
import test from "node:test";

const overview = await import(new URL("./monitoring-overview.ts", import.meta.url).href);

const organizations = [
  { id: "parent", name: "Parent", createdAt: "" },
  { id: "child-a", name: "Child A", parentId: "parent", createdAt: "" },
  { id: "child-b", name: "Child B", parentId: "parent", createdAt: "" },
];

function makeLink(
  id: string,
  organizationRiskId: string,
  score: number,
  monitoring?: { id: string; status: "draft" | "final"; observedNilai: number; observedLevel: string },
) {
  return {
    id,
    working_paper_id: `wp-${organizationRiskId}`,
    risk_id: organizationRiskId,
    sort_order: 1,
    source_mode: "latest_approved" as const,
    created_at: "",
    version_group_id: `group-${organizationRiskId}`,
    source_risk_id: organizationRiskId,
    risk: {
      id: organizationRiskId,
      code: `R-${organizationRiskId}`,
      title: `Risk ${organizationRiskId}`,
      category: "operasional",
      status: "final",
      probability: 1,
      impact: 1,
      bobot: score,
      nilai: score,
      inherentScore: score,
      tingkat_risiko: "tinggi",
      tingkat_risiko_display: "Tinggi",
      prioritas_risiko: 1,
      monitoring,
    },
    ...(monitoring ? { monitoring_id: monitoring.id } : {}),
  };
}

function makeWorkingPaper(
  organizationId: string,
  risks: ReturnType<typeof makeLink>[],
) {
  return {
    id: `wp-${organizationId}`,
    sequence_no: 1,
    code: `KK-${organizationId}`,
    title: "Snapshot",
    org_id: organizationId,
    status: "completed" as const,
    assessment_cycle: "2026-Q3",
    risks,
    current_signatory_sequence: 0,
    created_by: "user",
    created_at: "",
    updated_at: "",
    tte_skipped: false,
    signatories: [],
  };
}

test("buildMonitoringRosterRows preserves not started, in progress, and finalized states", () => {
  const rows = overview.buildMonitoringRosterRows(
    [
      makeWorkingPaper("child-a", [
        makeLink("link-1", "risk-1", 25),
        makeLink("link-2", "risk-2", 16, {
          id: "monitoring-2",
          status: "draft",
          observedNilai: 9,
          observedLevel: "Sedang",
        }),
      ]),
      makeWorkingPaper("child-b", [
        makeLink("link-3", "risk-3", 20, {
          id: "monitoring-3",
          status: "final",
          observedNilai: 4,
          observedLevel: "Rendah",
        }),
      ]),
    ],
    organizations,
  );

  assert.deepEqual(
    rows.map((row) => row.status),
    ["not_started", "in_progress", "finalized"],
  );
  assert.equal(rows[1].observedScore, 9);
  assert.equal(rows[2].finalizedAt, null);
});

test("filter and organization summaries include descendants for a parent scope", () => {
  const rows = overview.buildMonitoringRosterRows(
    [
      makeWorkingPaper("child-a", [makeLink("link-1", "risk-1", 25)]),
      makeWorkingPaper("child-b", [
        makeLink("link-2", "risk-2", 20, {
          id: "monitoring-2",
          status: "final",
          observedNilai: 4,
          observedLevel: "Rendah",
        }),
      ]),
    ],
    organizations,
  );

  const filtered = overview.filterMonitoringRows(
    rows,
    "parent",
    organizations,
    "",
    "all",
  );
  const summaries = overview.buildMonitoringOrganizationSummaries(
    rows,
    organizations,
    "parent",
  );
  const parentSummary = summaries.find((summary) => summary.id === "parent");

  assert.equal(filtered.length, 2);
  assert.deepEqual(
    filtered.map((row) => row.organizationId),
    ["child-a", "child-b"],
  );
  assert.deepEqual(
    parentSummary && {
      total: parentSummary.total,
      notStarted: parentSummary.notStarted,
      finalized: parentSummary.finalized,
    },
    { total: 2, notStarted: 1, finalized: 1 },
  );
});
