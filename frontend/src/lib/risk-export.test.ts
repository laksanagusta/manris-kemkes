import assert from "node:assert/strict";
import test from "node:test";

import type { RiskExportItem } from "./risk-export";
import {
  BULK_RISK_EXPORT_COLUMNS,
  buildRiskBulkExportRows,
  createRiskBulkExportWorkbookBuffer,
} from "./risk-export.mjs";

const sampleRisks: RiskExportItem[] = [
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
    riskAppetite: "dalam_batas",
    treatmentOption: "mitigate",
    targetProbability: 2,
    targetImpact: 3,
    targetWeight: 1,
    nextReviewDate: "2026-07-31",
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
    riskAppetite: "di_atas_batas",
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
  assert.equal(rows[0]["Selera Risiko"], "Dalam batas selera risiko");
  assert.equal(rows[0]["RPR Uraian"], "Tambah vendor cadangan\r\nReview SLA distribusi");
  assert.equal(rows[0]["PIC RPR"], "Tim Logistik\r\nBagian Pengadaan");
  assert.equal(rows[0]["Jadwal Pelaksanaan"], "Setiap bulan\r\n2026-07-31");
  assert.equal(rows[1]["Risiko"], "Keterlambatan pelaporan");
  assert.equal(rows[1]["Kategori Risiko"], "Kepatuhan");
  assert.equal(rows[1]["Selera Risiko"], "Di atas batas selera risiko");
  assert.equal(rows[1]["RPR Uraian"], "");
});

test("createRiskBulkExportWorkbookBuffer creates worksheet with template headers", async () => {
  const ExcelJSImport = await import("exceljs");
  const Workbook = ExcelJSImport.Workbook || ExcelJSImport.default?.Workbook;
  assert.ok(Workbook, "expected Workbook constructor from exceljs");

  const buffer = await createRiskBulkExportWorkbookBuffer(sampleRisks, "2026-H1");
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer);

  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ["Profil Risiko"]);

  const sheet = workbook.getWorksheet("Profil Risiko");
  assert.ok(sheet, "expected Profil Risiko worksheet");

  assert.equal(sheet.getRow(1).getCell(1).value, "NO");
  assert.equal(sheet.getRow(1).getCell(2).value, "IDENTIFIKASI RISIKO");
  assert.equal(sheet.getRow(1).getCell(8).value, "ANALISIS RISIKO");
  assert.equal(sheet.getRow(1).getCell(16).value, "EVALUASI RISIKO");
  assert.equal(sheet.getRow(1).getCell(18).value, "RENCANA PENANGANAN RISIKO (RPR)");
  assert.equal(sheet.getRow(1).getCell(21).value, "TARGET PENURUNAN TINGKAT RISIKO");

  assert.equal(sheet.getRow(2).getCell(2).value, "RISIKO");
  assert.equal(sheet.getRow(2).getCell(8).value, "PENGENDALIAN YANG ADA");
  assert.equal(sheet.getRow(2).getCell(13).value, "BOBOT");
  assert.equal(sheet.getRow(2).getCell(14).value, "NILAI");
  assert.equal(sheet.getRow(2).getCell(15).value, "TINGKAT RISIKO");
  assert.equal(sheet.getRow(2).getCell(18).value, "PILIHAN PENANGANAN");
  assert.equal(sheet.getRow(2).getCell(19).value, "URAIAN");
  assert.equal(sheet.getRow(3).getCell(8).value, "URAIAN");
  assert.equal(sheet.getRow(3).getCell(9).value, "EFEKTIF");
  assert.equal(sheet.getRow(3).getCell(10).value, "TIDAK EFEKTIF");
  assert.equal(sheet.getRow(4).getCell(1).value, 1);
  assert.equal(sheet.getRow(4).getCell(25).value, 25);

  assert.equal(sheet.getRow(5).getCell(1).value, 1);
  assert.equal(sheet.getRow(5).getCell(2).value, "Gangguan distribusi vaksin");
  assert.equal(sheet.getRow(5).getCell(3).value, "R-001");
  assert.equal(sheet.getRow(5).getCell(4).value, "Vendor tunggal\nCuaca ekstrem");
  assert.equal(sheet.getRow(5).getCell(9).value, "EFEKTIF");
  assert.equal(sheet.getRow(5).getCell(10).value, "");
  assert.equal(sheet.getRow(5).getCell(11).value, 3);
  assert.equal(sheet.getRow(5).getCell(12).value, 4);
  assert.equal(sheet.getRow(5).getCell(13).value, 1);
  assert.equal(sheet.getRow(5).getCell(14).value, 12);
  assert.equal(sheet.getRow(5).getCell(15).value, "Sedang");
  assert.equal(sheet.getRow(5).getCell(17).value, "Dalam batas selera risiko");
  assert.equal(sheet.getRow(5).getCell(18).value, "Penanganan");
  assert.ok(String(sheet.getRow(5).getCell(19).value).includes("Tambah vendor cadangan"));
  assert.equal(sheet.getRow(5).getCell(19).alignment?.wrapText, true);
  assert.equal(sheet.getRow(5).getCell(20).value, "31 Juli 2026");
  assert.equal(sheet.getRow(5).getCell(21).value, 2);
  assert.equal(sheet.getRow(5).getCell(22).value, 3);
  assert.equal(sheet.getRow(5).getCell(23).value, 1);
  assert.equal(sheet.getRow(5).getCell(24).value, 6);
  assert.equal(sheet.getRow(5).getCell(25).value, "Rendah");
  assert.equal(sheet.getRow(5).getCell(24).alignment?.horizontal, "right");
  assert.equal(sheet.getRow(5).getCell(24).alignment?.vertical, "top");
  assert.equal(sheet.getRow(5).getCell(24).numFmt, "0");
  assert.equal(sheet.getRow(5).getCell(11).numFmt, "0");
  assert.equal(sheet.getRow(5).getCell(12).numFmt, "0");
  assert.equal(sheet.getRow(5).getCell(14).numFmt, "0");
  assert.equal(sheet.getRow(1).getCell(1).fill?.type, "pattern");
  assert.equal(sheet.getRow(1).getCell(1).font?.name, "Bookman Old Style");
  assert.equal(sheet.getRow(1).getCell(1).font?.bold, true);
  assert.equal(sheet.getRow(1).getCell(1).border?.top?.style, "thin");
  assert.equal(sheet.views?.[0]?.state, "frozen");
  assert.equal(sheet.views?.[0]?.ySplit, 4);
});
