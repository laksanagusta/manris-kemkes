import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import type { Risk } from "../types/risk";
import type { WorkingPaper } from "../types/working-paper";
import { collectRiskExportItems, toRiskProfileExportRow } from "./risk-profile-export";
import { createRiskProfileWorkbookBuffer, createWorkingPaperWorkbookBuffer } from "./working-paper-export";

const risk = {
  id: "r1", code: "R-001", title: "Risiko distribusi", category: "operasional", status: "final",
  orgName: "Unit A", probability: 4, impact: 4, weight: 1, nilai: 16.4,
  inherentScore: 25, riskPriority: 2, existingControl: "Kontrol rutin",
  nextReviewDate: "2026-12-01T00:00:00Z", mitigations: [{ action: "Evaluasi", owner: "Tim A" }],
  targetProbability: 2, targetImpact: 3, targetWeight: 1, targetNilai: 6.4,
} as Risk;

test("export includes all pages in server order, respecting the returned page size", async () => {
  const pages: number[] = [];
  const values = await collectRiskExportItems(async (page) => {
    pages.push(page);
    return { data: page === 1 ? ["a", "b"] : ["c"], total: 3, page, limit: 2 };
  });
  assert.deepEqual(values, ["a", "b", "c"]);
  assert.deepEqual(pages, [1, 2]);
  await assert.rejects(() => collectRiskExportItems(async (page) => ({
    data: page === 1 ? ["a"] : [], total: 2, page, limit: 1,
  })), /Data risiko berubah/);
  await assert.rejects(() => collectRiskExportItems(async (page) => ({
    data: ["a"], total: page === 1 ? 2 : 3, page, limit: 1,
  })), /Data risiko berubah/);
});

test("profile mapping preserves canonical scores, control, schedule and mitigation owners", () => {
  const row = toRiskProfileExportRow(risk);
  assert.equal(row.nilai, 16.4);
  assert.equal(row.target_nilai, 6.4);
  assert.equal(row.existing_control, "Kontrol rutin");
  assert.equal(row.jadwal_pelaksanaan, "2026-12-01");
  assert.equal(row.penanggung_jawab, "Tim A");
  assert.equal(row.tingkat_risiko_display, "Tinggi");
  assert.equal(toRiskProfileExportRow({ ...risk, nilai: 0, targetNilai: 0 }).nilai, 0);
});

test("standalone export matches working paper profile table values, styles and widths across 18 columns", async () => {
  const row = toRiskProfileExportRow(risk);
  const paper: WorkingPaper = {
    id: "wp1", title: "Kertas Kerja", org_id: "unit1", status: "draft",
    assessment_cycle: "2026-H2", current_signatory_sequence: 0, tte_skipped: true,
    created_by: "u1", created_at: "2026-10-05", updated_at: "2026-10-05", signatories: [],
    risks: [{ id: "link1", working_paper_id: "wp1", risk_id: risk.id, sort_order: 0,
      source_mode: "latest_approved", created_at: "2026-10-05", risk: row }],
  };
  const standalone = new ExcelJS.Workbook();
  const reference = new ExcelJS.Workbook();
  await standalone.xlsx.load(await createRiskProfileWorkbookBuffer([row]));
  await reference.xlsx.load(await createWorkingPaperWorkbookBuffer(paper));
  assert.deepEqual(standalone.worksheets.map((sheet) => sheet.name), ["Profil Risiko"]);
  const sheet = standalone.getWorksheet("Profil Risiko")!;
  const source = reference.getWorksheet("Profil Risiko")!;
  assert.equal(sheet.rowCount, 4);
  assert.equal(sheet.getCell("O1").value, "TARGET PENURUNAN RISIKO");
  assert.equal(sheet.getCell("S3").value, 18);
  assert.equal(sheet.getCell("I4").value, 16);
  assert.equal(sheet.getCell("R4").value, 6);
  assert.equal(sheet.getCell("S4").border.right?.style, "thin");
  assert.equal(sheet.views[0].ySplit, 3);
  for (let col = 2; col <= 19; col += 1) {
    assert.equal(sheet.getColumn(col).width, source.getColumn(col).width);
    for (let r = 1; r <= 4; r += 1) {
      assert.deepEqual(sheet.getCell(r, col).value, source.getCell(r + 12, col).value);
      assert.deepEqual(sheet.getCell(r, col).style, source.getCell(r + 12, col).style);
    }
  }
});
