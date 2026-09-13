import assert from "node:assert/strict";
import test from "node:test";

import type { WorkingPaper } from "./working-paper";

const { createWorkingPaperWorkbookBuffer } = await import(
  new URL("./working-paper-export", import.meta.url).href
);

function makeWorkingPaper(): WorkingPaper {
  return {
    id: "wp-1",
    title: "Kertas Kerja Semester I",
    description: "Dokumen kerja semester pertama",
    org_id: "org-1",
    status: "draft",
    assessment_cycle: "2026-H1",
    current_signatory_sequence: 0,
    created_by: "user-1",
    created_at: "2026-03-04T08:00:00.000Z",
    updated_at: "2026-03-04T08:00:00.000Z",
    signatories: [],
    risks: [
      {
        id: "link-1",
        working_paper_id: "wp-1",
        risk_id: "risk-1",
        sort_order: 0,
        source_mode: "latest_approved",
        created_at: "2026-03-04T08:00:00.000Z",
        risk: {
          id: "risk-1",
          code: "R-001",
          title: "Risiko keterlambatan deteksi",
          description: "Deteksi penyakit terlambat",
          category: "operasional",
          status: "approved",
          org_name: "Loka Kekarantinaan Kesehatan Entikong",
          probability: 4,
          impact: 4,
          bobot: 1,
          nilai: 16,
          tingkat_risiko: "tinggi",
          tingkat_risiko_display: "Tinggi",
          prioritas_risiko: 1,
          existing_control: "Surveilans rutin",
          target_probability: 3,
          target_impact: 3,
          target_bobot: 1,
          target_nilai: 9,
          target_tingkat_risiko: "sedang",
          target_tingkat_risiko_display: "Sedang",
          assessment_cycle: "2026-H1",
          jadwal_pelaksanaan: "2026-07-01",
          penanggung_jawab: "Tim SKI",
        },
      },
    ],
  };
}

test("createWorkingPaperWorkbookBuffer adds attachment-style metadata to the first three sheets", async () => {
  const ExcelJSImport = await import("exceljs");
  const Workbook = ExcelJSImport.Workbook || ExcelJSImport.default?.Workbook;
  assert.ok(Workbook, "expected Workbook constructor from exceljs");

  const buffer = await createWorkingPaperWorkbookBuffer(makeWorkingPaper());
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer);

  const expectedSheets = [
    "Profil Risiko",
    "KK Penilaian Risiko",
    "KK Pemantauan Reviu",
  ];

  for (const sheetName of expectedSheets) {
    const sheet = workbook.getWorksheet(sheetName);
    assert.ok(sheet, `expected worksheet ${sheetName}`);
    assert.equal(
      sheet.getCell("H2").value,
      "PROFIL RISIKO TINGKAT UPR T-II KEMENTERIAN KESEHATAN",
    );
    assert.equal(sheet.getCell("B4").value, "Tujuan  * :");
    assert.equal(sheet.getCell("B5").value, "Sasaran * :");
    assert.equal(sheet.getCell("B7").value, "Indikator Kinerja Utama * :");
    assert.equal(sheet.getCell("B9").value, "Target * :");
    assert.equal(sheet.getCell("B10").value, "Program * :");
    assert.equal(sheet.getCell("B11").value, "Kegiatan * :");
    assert.equal(sheet.getCell("I4").value, "Unit Pemilik Risiko  * :");
    assert.equal(sheet.getCell("I5").value, "Nama Pemilik Risiko * :");
    assert.equal(sheet.getCell("I7").value, "Nama Tim Pengelola Risiko * :");
    assert.equal(sheet.getCell("I9").value, "Tgl Penilaian Risiko * :");
    assert.equal(sheet.getCell("I10").value, "Periode Risiko * :");
    assert.equal(sheet.getCell("I11").value, "Tgl Update Risiko * :");
    assert.ok(
      sheet.getCell("B4").isMerged,
      "expected B4 to be merged with the adjacent label cell",
    );
    assert.ok(
      sheet.getCell("I4").isMerged,
      "expected I4 to be merged with the adjacent label cell",
    );
    assert.equal(sheet.getCell("K4").value, "");
    assert.equal(sheet.getCell("K5").value, "Kepala Loka Kekarantinaan Kesehatan Entikong * :");
    assert.equal(sheet.getCell("K9").value, "4 Maret 2026 * :");
    assert.equal(sheet.getCell("K10").value, "Maret s/d Juni 2026 * :");
    assert.equal(sheet.getCell("K11").value, "- * :");
  }

  const profileSchedule = workbook.getWorksheet("Profil Risiko")?.getCell("M16");
  assert.equal(profileSchedule?.value, "2026-07-01");
  assert.equal(profileSchedule?.numFmt, "@");

  const monitoringSchedule = workbook
    .getWorksheet("KK Pemantauan Reviu")
    ?.getCell("L16");
  assert.equal(monitoringSchedule?.value, "2026-07-01");
  assert.equal(monitoringSchedule?.numFmt, "@");
});

test("working paper profile and monitoring sheets use the monitoring source score", async () => {
  const ExcelJSImport = await import("exceljs");
  const Workbook = ExcelJSImport.Workbook || ExcelJSImport.default?.Workbook;
  assert.ok(Workbook, "expected Workbook constructor from exceljs");

  const workingPaper = makeWorkingPaper();
  workingPaper.risks[0].risk.code = "R-235";
  workingPaper.risks[0].risk.previous = {
    probability: 3,
    impact: 4,
    bobot: 1,
    nilai: 12.4,
    tingkat_risiko: "sedang",
    prioritas_risiko: 3,
  };
  workingPaper.risks[0].risk.monitoring = {
    id: "monitoring-1",
    status: "final",
    assessmentCycle: "2026-H1",
    sourceProbability: 2,
    sourceImpact: 4,
    sourceWeight: 0.875,
    sourceNilai: 7.2,
    sourceLevel: "rendah",
    observedProbability: 1,
    observedImpact: 4,
    observedWeight: 0.75,
    observedNilai: 4.6,
    observedLevel: "sangat_rendah",
    mitigationCompletionPercent: 100,
    mitigationProgressSummary: "Selesai",
    startedAt: "2026-06-01T08:00:00.000Z",
    updatedAt: "2026-06-30T08:00:00.000Z",
    finalizedAt: "2026-06-30T08:00:00.000Z",
  };
  workingPaper.risks[0].risk.target_nilai = 9.6;

  const buffer = await createWorkingPaperWorkbookBuffer(workingPaper);
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer);

  assert.equal(workbook.getWorksheet("Profil Risiko")?.getCell("I16").value, 7);
  assert.equal(workbook.getWorksheet("Profil Risiko")?.getCell("J16").value, "Rendah");
  assert.equal(workbook.getWorksheet("Profil Risiko")?.getCell("R16").value, 10);
  assert.equal(workbook.getWorksheet("KK Penilaian Risiko")?.getCell("O17").value, 7);
  assert.equal(workbook.getWorksheet("KK Penilaian Risiko")?.getCell("P17").value, "Rendah");
  assert.equal(workbook.getWorksheet("KK Penilaian Risiko")?.getCell("Y17").value, 10);
  assert.equal(workbook.getWorksheet("KK Pemantauan Reviu")?.getCell("E16").value, 2);
  assert.equal(workbook.getWorksheet("KK Pemantauan Reviu")?.getCell("G16").value, 0.875);
  assert.equal(workbook.getWorksheet("KK Pemantauan Reviu")?.getCell("H16").value, 7);
  assert.equal(workbook.getWorksheet("KK Pemantauan Reviu")?.getCell("I16").value, "Rendah");
});
