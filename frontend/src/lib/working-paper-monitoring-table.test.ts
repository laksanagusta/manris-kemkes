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

test("working paper monitoring table keeps the approved 10-column order", () => {
  assert.deepEqual(
    WORKING_PAPER_MONITORING_COLUMNS.map((column) => column.key),
    [
      "code",
      "risk",
      "score",
      "trend",
      "effectiveness",
      "condition",
      "obstacles",
      "followUp",
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
        status: "finalized",
        assessmentCycle: "2026-Q2",
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
        trend: "down",
        mitigationCompletionPercent: 75,
        mitigationProgressSummary: "Tiga aksi selesai",
        effectivenessConclusion: "Cukup efektif",
        conditionSummary: "Kondisi membaik",
        eventSummary: "Satu insiden minor",
        mitigationObstacles: "Pengadaan terlambat",
        mitigationFollowUp: "Selesaikan pengadaan",
        followUpNote: "Pantau mingguan",
        startedAt: "2026-06-01T08:00:00Z",
        updatedAt: "2026-06-10T08:00:00Z",
      },
    }),
  );

  assert.equal(row.sourceScore, 16);
  assert.equal(row.observedScore, 12);
  assert.equal(row.observedLevelLabel, "Tinggi");
  assert.equal(row.trendLabel, "Menurun");
  assert.equal(row.condition, "Kondisi membaik\nSatu insiden minor");
  assert.equal(row.followUp, "Selesaikan pengadaan");
  assert.equal(row.statusLabel, "Final");
  assert.deepEqual(
    row.actionItems.map((item) => item.label),
    ["Detail Risiko Awal", "Hasil Pemantauan"],
  );
  assert.deepEqual(
    row.actionItems.map((item) => item.href),
    ["/risk/register/risk-prev", "/risk/assessment/monitoring-1"],
  );
});

test("buildWorkingPaperMonitoringRow hides progress for draft monitoring", () => {
  const row = buildWorkingPaperMonitoringRow(
    makeRisk({
      monitoring: {
        id: "monitoring-1",
        status: "draft",
        assessmentCycle: "2026-Q2",
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
        trend: "down",
        mitigationCompletionPercent: 75,
        mitigationProgressSummary: "Tiga aksi selesai",
        effectivenessConclusion: "Cukup efektif",
        conditionSummary: "Kondisi membaik",
        eventSummary: "Satu insiden minor",
        mitigationObstacles: "Pengadaan terlambat",
        mitigationFollowUp: "Selesaikan pengadaan",
        followUpNote: "Pantau mingguan",
        startedAt: "2026-06-01T08:00:00Z",
        updatedAt: "2026-06-10T08:00:00Z",
      },
    }),
  );

  assert.equal(row.statusLabel, "Draft");
  assert.equal(row.actionItems[0]?.href, "/risk/register/risk-1");
  assert.equal(row.actionItems[1]?.href, null);
});

test("buildWorkingPaperMonitoringRow falls back for unmonitored risks", () => {
  const row = buildWorkingPaperMonitoringRow(makeRisk());

  assert.equal(row.sourceScore, 16);
  assert.equal(row.observedScore, null);
  assert.equal(row.trendLabel, "-");
  assert.equal(row.condition, "-");
  assert.equal(row.obstacles, "-");
  assert.equal(row.followUp, "-");
  assert.equal(row.statusLabel, "Belum Dimonitor");
  assert.deepEqual(
    row.actionItems.map((item) => item.label),
    ["Detail Risiko Awal", "Hasil Pemantauan"],
  );
  assert.equal(row.actionItems[0]?.href, "/risk/register/risk-1");
  assert.equal(row.actionItems[1]?.href, null);
});

test("buildWorkingPaperMonitoringRow uses general follow-up as fallback", () => {
  const row = buildWorkingPaperMonitoringRow(
    makeRisk({
      monitoring: {
        id: "monitoring-2",
        status: "finalized",
        assessmentCycle: "2026-Q2",
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
        trend: "stable",
        mitigationCompletionPercent: 100,
        mitigationProgressSummary: "",
        effectivenessConclusion: "",
        conditionSummary: "",
        eventSummary: "",
        mitigationObstacles: "",
        mitigationFollowUp: "",
        followUpNote: "Pertahankan kontrol",
        startedAt: "2026-06-01T08:00:00Z",
        updatedAt: "2026-06-30T08:00:00Z",
        finalizedAt: "2026-06-30T08:00:00Z",
      },
    }),
  );

  assert.equal(row.trendLabel, "Tetap");
  assert.equal(row.followUp, "Pertahankan kontrol");
  assert.equal(row.statusLabel, "Final");
});
