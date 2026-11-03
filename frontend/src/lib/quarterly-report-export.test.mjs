import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import ts from "typescript";
// Compile production modules for Node without changing browser import conventions.
const require = createRequire(import.meta.url);
const modules = new Map();
async function compileModule(name) {
  if (modules.has(name)) return modules.get(name);
  let compiled = ts.transpileModule(await readFile(new URL(name, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  for (const match of [...compiled.matchAll(/(["'])(\.\/[^"']+)\1/g)]) {
    compiled = compiled.replaceAll(match[0], JSON.stringify(await compileModule(`${match[2]}.ts`)));
  }
  compiled = compiled.replaceAll('"exceljs"', JSON.stringify(pathToFileURL(require.resolve("exceljs")).href));
  const url = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
  modules.set(name, url);
  return url;
}
const { createQuarterlyReportWorkbook } = await import(await compileModule("./quarterly-report-export.ts"));
const { createWorkingPaperWorkbookBuffer } = await import(await compileModule("./working-paper-export.ts"));

test("XLSX keeps all five scoped sheets, empty-unit blanks and plain-text formulas", async () => {
  const report = {
    cycle: "2026-Q1",
    comparisonCycle: "2025-Q4",
    generatedAt: "2026-04-02T00:00:00Z",
    warnings: ["Riwayat belum lengkap"],
    organizations: [
      { id: "u1", name: "=SUM(A1:A2)" },
      { id: "u2", name: "Tanpa data" },
    ],
    risks: [{ id: "r1", title: "=1+1", organizationId: "u1", nilai: 12 }],
    previousRisks: [],
    tasks: [],
    events: [],
  };
  const workbook = await createQuarterlyReportWorkbook(report);
  assert.deepEqual(
    workbook.worksheets.map((sheet) => sheet.name),
    ["Ringkasan", "Perbandingan unit", "Risiko", "Tugas mitigasi", "Kejadian"],
  );
  const buffer = await workbook.xlsx.writeBuffer();
  const { default: ExcelJS } = await import("exceljs");
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(buffer);
  assert.equal(loaded.getWorksheet("Risiko").getCell("C5").value, "=1+1");
  assert.equal(
    loaded.getWorksheet("Perbandingan unit").getCell("C3").value,
    null,
  );
  assert.equal(loaded.getWorksheet("Risiko").getCell("L5").value, "");
  assert.equal(loaded.getWorksheet("Ringkasan").getCell("B2").value, "2026-Q1");
});


test("Risiko matches the working-paper 25-column assessment table and preserves profile scores", async () => {
  const risk = { id: "r1", code: "R-001", title: "Risiko logistik", organizationId: "u1", probability: 4, impact: 4, weight: 1, nilai: 16.4, riskPriority: 2,
    cause: ["Sebab A", "Sebab B"], impactDesc: ["Dampak"], riskSource: "internal", controllability: "C", existingControl: "Kontrol rutin", controlEffectiveness: "efektif",
    treatmentOption: "mitigasi", mitigations: [{ action: "Evaluasi", owner: "Tim A", dueDate: "2026-12-01" }],
    targetProbability: 2, targetImpact: 3, targetWeight: 1, targetNilai: 6.4, monitoringStatus: "final", monitoringObservedNilai: 1 };
  const report = { cycle: "2026-Q4", comparisonCycle: "2026-Q3", generatedAt: "2026-11-01", warnings: [], organizations: [{ id: "u1", name: "Unit A" }], risks: [risk], previousRisks: [], tasks: [], events: [] };
  const row = { ...risk, bobot: 1, tingkat_risiko: "tinggi", tingkat_risiko_display: "Tinggi", prioritas_risiko: 2,
    cause: risk.cause, risk_source: "internal", impact_desc: risk.impactDesc, existing_control: risk.existingControl, control_effectiveness: "efektif",
    treatment_option_display: "Mitigasi", mitigation_details: ["Evaluasi\nPIC: Tim A"], mitigation_due_dates: ["2026-12-01"],
    target_probability: 2, target_impact: 3, target_bobot: 1, target_nilai: 6.4, target_tingkat_risiko: "rendah", target_tingkat_risiko_display: "Rendah" };
  const { default: ExcelJS } = await import("exceljs");
  const reference = new ExcelJS.Workbook();
  await reference.xlsx.load(await createWorkingPaperWorkbookBuffer({ id: "wp1", title: "Kertas Kerja", org_id: "u1", assessment_cycle: "2026-Q4", created_at: "2026-11-01", updated_at: "2026-11-01", signatories: [], risks: [{ sort_order: 0, risk: row }] }));
  const output = await createQuarterlyReportWorkbook(report);
  const restored = new ExcelJS.Workbook();
  await restored.xlsx.load(await output.xlsx.writeBuffer());
  const sheet = restored.getWorksheet("Risiko"), source = reference.getWorksheet("KK Penilaian Risiko");
  assert.equal(sheet.rowCount, 5);
  assert.equal(sheet.getCell("O5").value, 16);
  assert.equal(sheet.getCell("Y5").value, 6);
  assert.equal(sheet.getCell("Z4").value, 25);
  assert.equal(sheet.views[0].ySplit, 4);
  for (let col = 1; col <= 26; col++) {
    assert.equal(sheet.getColumn(col).width, source.getColumn(col).width);
    for (let r = 1; r <= 5; r++) {
      const actual = sheet.getCell(r, col), expected = source.getCell(r + 12, col);
      assert.deepEqual(actual.value, expected.value, `${actual.address} value`);
      assert.deepEqual(actual.style, expected.style, `${actual.address} style`);
      assert.equal(actual.isMerged, expected.isMerged, `${actual.address} merge`);
    }
  }
});


test("data export matches the supplied flat 27-column layout while assessment remains the default", async () => {
  const report = { cycle: "2026-Q3", comparisonCycle: "2026-Q2", generatedAt: "2026-11-01", warnings: [],
    organizations: [{ id: "u1", name: "Unit A" }], previousRisks: [], tasks: [], events: [],
    risks: [{ id: "r1", versionGroupId: "family1", title: "=1+1", code: "R-001", orgName: "Unit A", organizationId: "u1", assessmentCycle: "2026-Q3",
      nilai: 18.56, monitoringObservedNilai: 19, monitoringStatus: "final", monitoringAssessmentCycle: "2026-Q3", targetNilai: 3.51, targetProbability: 3, targetImpact: 1, targetWeight: 1.17, probability: 4, impact: 4, weight: 1.16 }],
  };
  const output = await createQuarterlyReportWorkbook(report, "data");
  const normal = await createQuarterlyReportWorkbook(report);
  const { default: ExcelJS } = await import("exceljs");
  const restored = new ExcelJS.Workbook();
  await restored.xlsx.load(await output.xlsx.writeBuffer());
  assert.deepEqual(restored.worksheets.map(sheet => sheet.name), ["Ringkasan", "Perbandingan unit", "Risiko", "Tugas mitigasi", "Kejadian"]);
  const sheet = restored.getWorksheet("Risiko");
  assert.deepEqual(sheet.getRow(1).values.slice(1), ["Risiko", "Kode", "Unit", "Periode profil", "Nilai profil", "Profil pembanding", "Perubahan", "Di atas selera", "Pemantauan final", "Nilai observasi", "Nilai target", "Pencapaian target", "Perhatian", "Diarsipkan dalam periode", "Deskripsi", "Kategori", "Sebab", "Dampak", "P", "D", "Bobot", "Target P", "Target D", "Target bobot", "Jadwal pelaksanaan", "ID", "Kelompok versi"]);
  assert.equal(sheet.columnCount, 27);
  assert.equal(sheet.getCell("A2").value, "=1+1");
  assert.equal(sheet.getCell("C2").value, "Unit A");
  assert.equal(sheet.getCell("E2").value, 18.56);
  assert.equal(sheet.getCell("J2").value, 19);
  assert.equal(sheet.getCell("K2").value, 3.51);
  assert.equal(sheet.getCell("AA2").value, "family1");
  assert.equal(sheet.getColumn(1).width, 30);
  assert.equal(sheet.getColumn(27).width, 24);
  assert.equal(sheet.getCell("A1").font.name, "Arial");
  assert.equal(sheet.getCell("A1").fill.fgColor.argb, "FFF2F2F2");
  assert.equal(sheet.views[0].ySplit, 1);
  assert.equal(normal.getWorksheet("Risiko").getCell("Z4").value, 25);
  assert.equal(normal.getWorksheet("Risiko").getCell("O5").value, 19);
  for (const name of ["Perbandingan unit", "Tugas mitigasi", "Kejadian"]) {
    assert.deepEqual(output.getWorksheet(name).getSheetValues(), normal.getWorksheet(name).getSheetValues());
  }
});
