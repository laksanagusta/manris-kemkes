import assert from "node:assert/strict";
import test from "node:test";

import type { RiskCycleDetailedComparisonReport } from "@/types/risk";
// @ts-ignore -- Node test runner needs explicit .ts specifiers for direct execution.
import { classifyRiskCycleDetailMovement, createRiskCycleDetailWorkbookBuffer } from "./risk-cycle-detail-export.ts";

const sampleReport: RiskCycleDetailedComparisonReport = {
  summary: {
    fromCycle: "2025-H2",
    toCycle: "2026-H1",
    totalFrom: 1,
    totalTo: 1,
    addedCount: 0,
    removedCount: 0,
    changedCount: 1,
    stableCount: 0,
  },
  items: [
    {
      changeCategory: "changed",
      versionGroupId: "group-1",
      code: "R-001",
      title: "Distribusi vaksin terlambat",
      orgName: "Dit. Surveilans",
      fromCycle: "2025-H2",
      toCycle: "2026-H1",
      fromRiskId: "from-1",
      toRiskId: "to-1",
      fromSnapshot: {
        description: "Versi awal",
        category: "operasional",
        cause: ["Vendor tunggal"],
        existingControl: "Kontrol awal",
        probability: 4,
        impact: 4,
        inherentScore: 16,
        status: "approved",
        riskPriority: 1,
        treatmentOption: "mitigate",
        targetProbability: 3,
        targetImpact: 4,
        targetScore: 12,
        nextReviewDate: "2026-06-30",
        mitigations: ["1. Koordinasi vendor A | PIC: Tim Logistik | Frek: rutin"],
      } as any,
      toSnapshot: {
        description: "Versi revisi",
        category: "strategis",
        cause: ["Vendor tunggal", "Cuaca buruk"],
        existingControl: "Kontrol revisi",
        probability: 3,
        impact: 4,
        inherentScore: 12,
        status: "approved",
        riskPriority: 1,
        treatmentOption: "mitigate",
        targetProbability: 2,
        targetImpact: 3,
        targetScore: 6,
        nextReviewDate: "2026-12-31",
        mitigations: ["1. Koordinasi vendor A dan B | PIC: Tim Logistik | Frek: rutin"],
      } as any,
      fieldDiffs: [],
      mitigationDiffs: [],
      changeReason: "Semester baru",
      reviewSummary: "Risk improved",
    },
  ],
};

test("classifyRiskCycleDetailMovement uses base score semantics", () => {
  const item = sampleReport.items[0];
  assert.equal(classifyRiskCycleDetailMovement(item), "down");
});

test("classifyRiskCycleDetailMovement keeps non-finalized drafts on inherent semantics", () => {
  const item: RiskCycleDetailedComparisonReport["items"][number] = {
    ...sampleReport.items[0],
    fromSnapshot: {
      ...sampleReport.items[0].fromSnapshot,
      status: "approved",
      inherentScore: 20,
    } as any,
    toSnapshot: {
      ...sampleReport.items[0].toSnapshot,
      status: "in_approval",
      probability: 5,
      impact: 4,
      inherentScore: 20,
    } as any,
  };

  assert.equal(classifyRiskCycleDetailMovement(item), "stable");
});

test("createRiskCycleDetailWorkbookBuffer persists top-bottom comparison trend, legend, freeze panes, autofilter, and styles", async () => {
  const ExcelJSImport = await import("exceljs");
  const Workbook = ExcelJSImport.Workbook || ExcelJSImport.default?.Workbook;
  assert.ok(Workbook, "expected Workbook constructor from exceljs");
  const buffer = (await createRiskCycleDetailWorkbookBuffer(sampleReport)) as unknown as Buffer;
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer as any);

  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ["Summary", "Perbandingan", "Risks", "Field Changes", "Mitigation Changes"]);

  const comparisonSheet = workbook.getWorksheet("Perbandingan");
  assert.ok(comparisonSheet, "expected Perbandingan sheet");

  const headerIndex = new Map<string, number>();
  comparisonSheet.getRow(1).eachCell((cell, colNumber) => {
    headerIndex.set(String(cell.value), colNumber);
  });

  assert.equal(comparisonSheet.getRow(2).getCell("A").value, "worsened");
  assert.equal(comparisonSheet.getRow(2).getCell(headerIndex.get("version") || 0).value, "Before");
  assert.equal(comparisonSheet.getRow(2).getCell(headerIndex.get("description") || 0).value, "Versi awal");
  assert.equal(comparisonSheet.getRow(2).getCell(headerIndex.get("category") || 0).value, "Operasional");
  assert.equal(comparisonSheet.getRow(2).getCell(headerIndex.get("probability") || 0).value, "4");
  assert.equal(comparisonSheet.getRow(2).getCell(headerIndex.get("inherentScore") || 0).value, "16");
  assert.equal(comparisonSheet.getRow(2).getCell(headerIndex.get("targetScore") || 0).value, "12");
  assert.equal(comparisonSheet.getRow(3).getCell(headerIndex.get("version") || 0).value, "After");
  assert.equal(comparisonSheet.getRow(3).getCell(headerIndex.get("category") || 0).value, "Strategis");
  assert.equal(comparisonSheet.getRow(3).getCell(headerIndex.get("probability") || 0).value, "3");
  assert.equal(comparisonSheet.getRow(3).getCell(headerIndex.get("inherentScore") || 0).value, "12");
  assert.equal(comparisonSheet.getRow(3).getCell(headerIndex.get("targetScore") || 0).value, "6");
  assert.equal(comparisonSheet.views[0]?.state, "frozen");
  assert.equal(comparisonSheet.views[0]?.ySplit, 1);
  assert.ok(comparisonSheet.autoFilter);
  const legendColumn = headerIndex.get("mitigations") ? (headerIndex.get("mitigations") || 0) + 2 : 0;
  assert.ok(comparisonSheet.getCell(1, legendColumn).value);
  assert.equal(comparisonSheet.getCell(2, legendColumn).value, "improved");

  const trendFill = comparisonSheet.getCell("A2").fill;
  assert.equal(trendFill && "fgColor" in trendFill ? trendFill.fgColor?.argb : undefined, "FFFDECEC");

  const summarySheet = workbook.getWorksheet("Summary");
  assert.ok(summarySheet?.autoFilter);
  assert.equal(summarySheet?.views[0]?.state, "frozen");
});
