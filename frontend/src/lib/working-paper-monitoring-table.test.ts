import assert from "node:assert/strict";
import test from "node:test";

const tableLib = await import(
  new URL("./working-paper-monitoring-table.ts", import.meta.url).href,
);

const {
  WORKING_PAPER_MONITORING_COLUMNS,
  buildWorkingPaperMonitoringRow,
} = tableLib as typeof import("./working-paper-monitoring-table");

type WorkingPaperRiskData =
  import("@/types/working-paper").WorkingPaperRiskData;

function makeRisk(
  overrides: Partial<WorkingPaperRiskData> = {},
): WorkingPaperRiskData {
  return {
    id: "risk-1",
    code: "R-001",
    title: "Gangguan layanan",
    category: "operasional",
    status: "approved",
    probability: 4,
    impact: 4,
    bobot: 1,
    nilai: 16,
    inherentScore: 16,
    tingkat_risiko: "tinggi",
    prioritas_risiko: 1,
    ...overrides,
  };
}

test("working paper monitoring table keeps the compact monitoring column order", () => {
  assert.deepEqual(
    WORKING_PAPER_MONITORING_COLUMNS.map((column) => column.key),
    [
      "code",
      "version",
      "risk",
      "score",
      "status",
      "action",
    ],
  );
});

test("buildWorkingPaperMonitoringRow maps a final monitoring evaluation", () => {
  const row = buildWorkingPaperMonitoringRow(
    makeRisk({
      previousRiskId: "risk-prev",
      monitoring: {
        id: "monitoring-1",
        status: "final",
        assessmentCycle: "2026-H1",
        sourceProbability: 4,
        sourceImpact: 4,
        sourceWeight: 1,
        sourceNilai: 16,
        sourceLevel: "tinggi",
        observedProbability: 3,
        observedImpact: 4,
        observedWeight: 1,
        observedNilai: 12,
        observedLevel: "tinggi",
        mitigationCompletionPercent: 75,
        mitigationProgressSummary: "Tiga aksi selesai",
        startedAt: "2026-06-01T08:00:00Z",
        updatedAt: "2026-06-10T08:00:00Z",
      },
    }),
  );

  assert.equal(row.sourceScore, 16);
  assert.equal(row.observedScore, 12);
  assert.equal(row.observedLevelLabel, "Tinggi");
  assert.equal(row.statusLabel, "Selesai");
  assert.deepEqual(
    row.actionItems.map((item) => item.label),
    ["Detail Risiko Awal", "Lihat Hasil Pemantauan"],
  );
  assert.deepEqual(
    row.actionItems.map((item) => item.href),
    ["/risk/register/risk-prev", "/risk/monitoring/monitoring-1"],
  );
});

test("buildWorkingPaperMonitoringRowFromLink uses persisted source and monitoring ids", () => {
  const row = tableLib.buildWorkingPaperMonitoringRowFromLink({
    id: "link-1",
    working_paper_id: "wp-1",
    risk_id: "risk-fallback",
    sort_order: 1,
    source_mode: "roster",
    created_at: "2026-07-01T00:00:00Z",
    source_risk_id: "risk-source",
    monitoring_id: "monitoring-1",
    result_risk_id: "risk-result",
    roster_status: "finalized",
    risk: makeRisk({
      monitoring: {
        id: "monitoring-1",
        status: "final",
        assessmentCycle: "2026-H1",
        sourceProbability: 4,
        sourceImpact: 4,
        sourceWeight: 1,
        sourceNilai: 16,
        sourceLevel: "tinggi",
        observedProbability: 3,
        observedImpact: 4,
        observedWeight: 1,
        observedNilai: 12,
        observedLevel: "tinggi",
        startedAt: "2026-06-01T08:00:00Z",
        updatedAt: "2026-06-10T08:00:00Z",
      },
    }),
  });

  assert.deepEqual(
    row.actionItems.map((item) => item.href),
    ["/risk/register/risk-source", "/risk/monitoring/monitoring-1"],
  );
});

test("buildWorkingPaperMonitoringRow hides progress for draft monitoring", () => {
  const row = buildWorkingPaperMonitoringRow(
    makeRisk({
      monitoring: {
        id: "monitoring-1",
        status: "draft",
        assessmentCycle: "2026-H1",
        sourceProbability: 4,
        sourceImpact: 4,
        sourceWeight: 1,
        sourceNilai: 16,
        sourceLevel: "tinggi",
        observedProbability: 3,
        observedImpact: 4,
        observedWeight: 1,
        observedNilai: 12,
        observedLevel: "tinggi",
        mitigationCompletionPercent: 75,
        mitigationProgressSummary: "Tiga aksi selesai",
        startedAt: "2026-06-01T08:00:00Z",
        updatedAt: "2026-06-10T08:00:00Z",
      },
    }),
  );

  assert.equal(row.statusLabel, "Sedang Berjalan");
  assert.equal(row.actionItems[0]?.href, "/risk/register/risk-1");
  assert.equal(row.actionItems[1]?.label, "Lanjutkan Pemantauan");
  assert.equal(row.actionItems[1]?.href, "/risk/monitoring/monitoring-1");
});

test("buildWorkingPaperMonitoringRow falls back for unmonitored risks", () => {
  const row = buildWorkingPaperMonitoringRow(makeRisk());

  assert.equal(row.sourceScore, 16);
  assert.equal(row.observedScore, null);
  assert.equal(row.statusLabel, "Belum Dimulai");
  assert.deepEqual(
    row.actionItems.map((item) => item.label),
    ["Detail Risiko Awal", "Mulai Pemantauan"],
  );
  assert.equal(row.actionItems[0]?.href, "/risk/register/risk-1");
  assert.equal(row.actionItems[1]?.href, null);
});

test("buildWorkingPaperMonitoringRow keeps score and status when monitoring is final", () => {
  const row = buildWorkingPaperMonitoringRow(
    makeRisk({
      monitoring: {
        id: "monitoring-2",
        status: "final",
        assessmentCycle: "2026-H1",
        sourceProbability: 4,
        sourceImpact: 4,
        sourceWeight: 1,
        sourceNilai: 16,
        sourceLevel: "tinggi",
        observedProbability: 4,
        observedImpact: 4,
        observedWeight: 1,
        observedNilai: 16,
        observedLevel: "tinggi",
        mitigationCompletionPercent: 100,
        mitigationProgressSummary: "",
        startedAt: "2026-06-01T08:00:00Z",
        updatedAt: "2026-06-30T08:00:00Z",
        finalizedAt: "2026-06-30T08:00:00Z",
      },
    }),
  );

  assert.equal(row.statusLabel, "Selesai");
});
