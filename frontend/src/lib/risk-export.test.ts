import assert from "node:assert/strict";
import test from "node:test";

import {
  BULK_RISK_EXPORT_COLUMNS,
  buildRiskBulkExportRows,
  createRiskBulkExportWorkbookBuffer,
} from "./risk-export.mjs";

const sampleRisks = [
  {
    id: "risk-1",
    title: "Gangguan distribusi vaksin",
    description: "Distribusi terlambat ke daerah.",
    code: "R-001",
    category: "operasional",
    cause: ["Vendor tunggal", "Cuaca ekstrem"],
    riskSource: "Vendor",
    controllability: "C",
    impactDesc: ["Layanan terlambat"],
    existingControl: "Monitoring mingguan",
    controlEffectiveness: "efektif",
    probability: 3,
    impact: 4,
    weight: 1,
    riskPriority: 1,
    riskAppetite: "sedang",
    treatmentOption: "mitigate",
    targetProbability: 2,
    targetImpact: 3,
    targetWeight: 1,
    orgName: "Dit. Surveilans",
    mitigations: [
      {
        action: "Tambah vendor cadangan",
        owner: "Tim Logistik",
        executionScheduleText: "Setiap bulan",
      },
      {
        action: "Review SLA distribusi",
        owner: "Bagian Pengadaan",
        executionScheduleText: "2026-07-31",
      },
    ],
  },
  {
    id: "risk-2",
    title: "Keterlambatan pelaporan",
    description: "Pelaporan tidak masuk tepat waktu.",
    code: "R-002",
    category: "kepatuhan",
    cause: ["Beban kerja tinggi"],
    riskSource: "Internal",
    controllability: "UC",
    impactDesc: ["Dashboard terlambat update"],
    existingControl: "Reminder email",
    controlEffectiveness: "tidak_efektif",
    probability: 4,
    impact: 3,
    weight: 1.2,
    riskPriority: 2,
    riskAppetite: "rendah",
    treatmentOption: "accept",
    targetProbability: 3,
    targetImpact: 2,
    targetWeight: 1,
    orgName: "Sekretariat",
    mitigations: [],
  },
];

test("buildRiskBulkExportRows uses bulk template columns and expands mitigations", () => {
  const rows = buildRiskBulkExportRows(sampleRisks);

  assert.equal(rows.length, 2);
  assert.deepEqual(Object.keys(rows[0]), BULK_RISK_EXPORT_COLUMNS);

  assert.equal(rows[0]["Risiko"], "Gangguan distribusi vaksin");
  assert.equal(rows[0]["Kategori Risiko"], "Operasional");
  assert.equal(rows[0]["Sebab"], "Vendor tunggal\r\nCuaca ekstrem");
  assert.equal(rows[0]["RPR Uraian"], "Tambah vendor cadangan\r\nReview SLA distribusi");
  assert.equal(rows[0]["PIC RPR"], "Tim Logistik\r\nBagian Pengadaan");
  assert.equal(rows[0]["Jadwal Pelaksanaan"], "Setiap bulan\r\n2026-07-31");
  assert.equal(rows[1]["Risiko"], "Keterlambatan pelaporan");
  assert.equal(rows[1]["Kategori Risiko"], "Kepatuhan");
  assert.equal(rows[1]["RPR Uraian"], "");
});

test("createRiskBulkExportWorkbookBuffer creates worksheet with template headers", async () => {
  const ExcelJSImport = await import("exceljs");
  const Workbook = ExcelJSImport.Workbook || ExcelJSImport.default?.Workbook;
  assert.ok(Workbook, "expected Workbook constructor from exceljs");

  const buffer = await createRiskBulkExportWorkbookBuffer(sampleRisks, "2026-H1");
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.getWorksheet("Risk Export");
  assert.ok(sheet, "expected Risk Export worksheet");
  const headerValues = (sheet.getRow(1).values as unknown[]).slice(1);
  assert.deepEqual(
    headerValues,
    BULK_RISK_EXPORT_COLUMNS,
  );
  assert.equal(sheet.getRow(2).getCell(1).value, "Gangguan distribusi vaksin");
  assert.equal(sheet.getRow(2).getCell(2).value, "Distribusi terlambat ke daerah.");
  assert.equal(sheet.getRow(2).getCell(3).value, "R-001");
  assert.equal(sheet.getRow(2).getCell(4).value, "Operasional");
  assert.equal(sheet.getRow(2).getCell(5).value, "Vendor tunggal\nCuaca ekstrem");
  assert.equal(sheet.getRow(2).getCell(17).value, "Tambah vendor cadangan\nReview SLA distribusi");
  assert.equal(sheet.getRow(2).getCell(1).alignment?.horizontal, "left");
  assert.equal(sheet.getRow(2).getCell(12).alignment?.horizontal, "right");
  assert.equal(sheet.getRow(2).getCell(12).alignment?.vertical, "top");
  assert.equal(sheet.getColumn(17).alignment?.wrapText, true);
});
