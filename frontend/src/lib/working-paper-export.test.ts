import assert from "node:assert/strict";
import test from "node:test";

import type { WorkingPaper } from "@/types/working-paper";

const { createWorkingPaperWorkbookBuffer } = await import(
  new URL("./working-paper-export", import.meta.url).href
);

function makeWorkingPaper(): WorkingPaper {
  return {
    id: "wp-1",
    title: "Kertas Kerja Semester I",
    sequence_no: 1,
    code: "KK-2026-06-30-1",
    org_id: "org-1",
    status: "draft",
    assessment_cycle: "2026-H1",
    observation_cutoff: "2026-06-30",
    tte_skipped: false,
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

test("the first three working paper sheets keep the header labels and leave their input cells blank", async () => {
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

  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), expectedSheets);

  for (const sheetName of expectedSheets) {
    const sheet = workbook.getWorksheet(sheetName);
    assert.ok(sheet, `expected worksheet ${sheetName}`);
    assert.equal(
      sheet.getCell("H2").value,
      "PROFIL RISIKO TINGKAT UPR T-II KEMENTERIAN KESEHATAN",
    );
    assert.equal(sheet.getCell("B4").value, "Tujuan  * :");
    assert.equal(sheet.getCell("B5").value, "Sasaran * :");
    assert.equal(sheet.getCell("B6").value, "Indikator Kinerja Utama * :");
    assert.equal(sheet.getCell("B7").value, "Target * :");
    assert.equal(sheet.getCell("B8").value, "Program * :");
    assert.equal(sheet.getCell("B9").value, "Kegiatan * :");
    assert.equal(sheet.getCell("I4").value, "Unit Pemilik Risiko  * :");
    assert.equal(sheet.getCell("I5").value, "Nama Pemilik Risiko * :");
    assert.equal(sheet.getCell("I6").value, "Nama Tim Pengelola Risiko * :");
    assert.equal(sheet.getCell("I7").value, "Tgl Penilaian Risiko * :");
    assert.equal(sheet.getCell("I8").value, "Periode Risiko * :");
    assert.equal(sheet.getCell("I9").value, "Tgl Update Risiko * :");
    assert.ok(
      sheet.getCell("B4").isMerged,
      "expected B4 to be merged with the adjacent label cell",
    );
    assert.ok(
      sheet.getCell("I4").isMerged,
      "expected I4 to be merged with the adjacent label cell",
    );
    for (const row of [4, 5, 6, 7, 8, 9]) {
      assert.equal(sheet.getRow(row).height, undefined);
      for (const column of ["D", "K"]) {
        const address = `${column}${row}`;
        const cell = sheet.getCell(address);
        assert.equal(cell.value, null, `${sheetName}!${address} should be empty`);
        assert.ok(cell.isMerged, `${sheetName}!${address} should stay merged`);
      }
    }
  }

  const profileSchedule = workbook.getWorksheet("Profil Risiko")?.getCell("M14");
  assert.equal(profileSchedule?.value, "2026-07-01");
  assert.equal(profileSchedule?.numFmt, "@");

  const monitoringSchedule = workbook
    .getWorksheet("KK Pemantauan Reviu")
    ?.getCell("L14");
  assert.equal(monitoringSchedule?.value, "2026-07-01");
  assert.equal(monitoringSchedule?.numFmt, "@");
});

test("working paper sheets preserve source scores and highlight only the risk levels", async () => {
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
  workingPaper.risks[0].risk.monitoring_nilai = 4.6;
  workingPaper.risks[0].risk.monitoring_tingkat_risiko_display = "Sangat Rendah";
  workingPaper.risks.push({
    ...workingPaper.risks[0],
    id: "link-2",
    risk_id: "risk-2",
    sort_order: 1,
    risk: {
      ...workingPaper.risks[0].risk,
      code: "R-236",
      title: "Baris pertama\nBaris kedua\nBaris ketiga",
      monitoring: undefined,
      previous: undefined,
      tingkat_risiko_display: "Sangat Tinggi",
      target_tingkat_risiko_display: "Tinggi",
    },
  });

  const buffer = await createWorkingPaperWorkbookBuffer(workingPaper);
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer);

  assert.equal(workbook.getWorksheet("Profil Risiko")?.getCell("I14").value, 7);
  assert.equal(workbook.getWorksheet("Profil Risiko")?.getCell("J14").value, "Rendah");
  assert.equal(workbook.getWorksheet("Profil Risiko")?.getCell("R14").value, 10);
  assert.equal(workbook.getWorksheet("KK Penilaian Risiko")?.getCell("O15").value, 7);
  assert.equal(workbook.getWorksheet("KK Penilaian Risiko")?.getCell("P15").value, "Rendah");
  assert.equal(workbook.getWorksheet("KK Penilaian Risiko")?.getCell("Y15").value, 10);
  assert.equal(workbook.getWorksheet("KK Pemantauan Reviu")?.getCell("E14").value, 2);
  assert.equal(workbook.getWorksheet("KK Pemantauan Reviu")?.getCell("G14").value, 0.875);
  assert.equal(workbook.getWorksheet("KK Pemantauan Reviu")?.getCell("H14").value, 7);
  assert.equal(workbook.getWorksheet("KK Pemantauan Reviu")?.getCell("I14").value, "Rendah");
  assert.equal(workbook.getWorksheet("KK Pemantauan Reviu")?.getCell("P14").value, 5);
  assert.equal(workbook.getWorksheet("KK Pemantauan Reviu")?.getCell("Q14").value, "Sangat Rendah");

  const levelStyles = [
    { sheet: "Profil Risiko", score: "I14", level: "J14", color: "FF8EC5FF" },
    { sheet: "Profil Risiko", score: "R14", level: "S14", color: "FFFFDF20" },
    { sheet: "KK Penilaian Risiko", score: "O15", level: "P15", color: "FF8EC5FF" },
    { sheet: "KK Penilaian Risiko", score: "Y15", level: "Z15", color: "FFFFDF20" },
    { sheet: "KK Pemantauan Reviu", score: "H14", level: "I14", color: "FF8EC5FF" },
    { sheet: "KK Pemantauan Reviu", score: "P14", level: "Q14", color: "FF5EE9B5" },
    { sheet: "Profil Risiko", score: "I15", level: "J15", color: "FFFFA2A2" },
    { sheet: "Profil Risiko", score: "R15", level: "S15", color: "FFFFB86A" },
  ];

  for (const { sheet, score, level, color } of levelStyles) {
    const worksheet = workbook.getWorksheet(sheet);
    assert.ok(worksheet);
    assert.deepEqual(worksheet.getCell(score).fill, { type: "pattern", pattern: "none" }, `${sheet}!${score}`);
    assert.ok(!worksheet.getCell(score).font.bold);
    const levelCell = worksheet.getCell(level);
    assert.deepEqual(levelCell.fill, { type: "pattern", pattern: "solid", fgColor: { argb: color } }, `${sheet}!${level}`);
    assert.deepEqual(levelCell.font.color, { argb: "FF000000" });
  }

  for (const [sheetName, numberRow, titleColumn, columnCount] of [
    ["Profil Risiko", 13, "D", 18],
    ["KK Penilaian Risiko", 14, "C", 25],
    ["KK Pemantauan Reviu", 13, "C", 18],
  ] as const) {
    const sheet = workbook.getWorksheet(sheetName);
    assert.ok(sheet);
    const view = sheet.views[0];
    assert.ok(view.state === "frozen");
    assert.equal(view.ySplit, numberRow);
    for (let column = 1; column <= columnCount; column++) {
      const cell = sheet.getRow(numberRow).getCell(column + 1);
      assert.equal(cell.value, column);
      assert.ok(!cell.font.bold, `${sheetName}!${cell.address}`);
    }
    for (const row of [numberRow, numberRow + 1, numberRow + 2]) {
      assert.equal(sheet.getRow(row).height, undefined);
    }
    const longTitle = sheet.getCell(`${titleColumn}${numberRow + 2}`);
    assert.equal(longTitle.value, "Baris pertama\nBaris kedua\nBaris ketiga");
    assert.equal(longTitle.alignment.wrapText, true);
  }
});

test("the owner column shows names and the RPR description shows only actions", async () => {
  const { default: ExcelJS } = await import("exceljs");
  const workingPaper = makeWorkingPaper();
  const firstLink = workingPaper.risks[0];
  firstLink.risk.penanggung_jawab = "Dewi (Tim A) (unit), Budi (reviewer), Rina (pimpinan), Ari (superadmin)";
  firstLink.risk.mitigations = ["Perbarui SOP", "Lakukan simulasi\nbersama tim"];
  firstLink.risk.mitigation_details = ["Aksi: Perbarui SOP · Jenis: Preventif"];
  workingPaper.risks.push({
    ...firstLink,
    id: "link-2",
    sort_order: 1,
    risk: {
      ...firstLink.risk,
      previous: { mitigation_details: ["Aksi: Cek dokumen · Jenis: Detektif"] },
    },
  });

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await createWorkingPaperWorkbookBuffer(workingPaper));

  const profile = workbook.getWorksheet("Profil Risiko");
  const assessment = workbook.getWorksheet("KK Penilaian Risiko");
  assert.equal(profile?.getCell("N14").value, "Dewi (Tim A), Budi, Rina, Ari");
  assert.equal(assessment?.getCell("T15").value, "Perbarui SOP\nLakukan simulasi\nbersama tim");
  assert.equal(assessment?.getCell("T16").value, "Cek dokumen");
});

test("each risk sheet starts signer blocks at the left and centers their text and QR codes", async () => {
  const { default: ExcelJS } = await import("exceljs");
  const workingPaper = makeWorkingPaper();
  const qr = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZT0AAAAASUVORK5CYII=";
  workingPaper.signatories = [2, 1].map((sequence) => ({
    id: `signer-${sequence}`,
    working_paper_id: workingPaper.id,
    user_id: `user-${sequence}`,
    sequence_no: sequence,
    signer_name: `Nama ${sequence}`,
    signer_nip: `00${sequence}`,
    signer_jabatan: `Jabatan ${sequence}`,
    signer_pangkat: "",
    status: sequence === 1 ? "signed" : "pending",
    qr_code_png: qr,
    created_at: workingPaper.created_at,
  }));

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await createWorkingPaperWorkbookBuffer(workingPaper));

  for (const [sheetName, roleRow] of [
    ["Profil Risiko", 17],
    ["KK Penilaian Risiko", 18],
    ["KK Pemantauan Reviu", 17],
  ] as const) {
    const sheet = workbook.getWorksheet(sheetName);
    assert.ok(sheet);
    for (const [column, sequence] of [["B", 1], ["D", 2]] as const) {
      for (const [offset, value] of [
        [0, `Jabatan ${sequence}`],
        [4, `Nama ${sequence}`],
        [5, `NIP. 00${sequence}`],
      ] as const) {
        const cell = sheet.getCell(`${column}${roleRow + offset}`);
        assert.equal(cell.value, value);
        assert.equal(cell.alignment.horizontal, "center");
      }
    }
    const [image] = sheet.getImages();
    assert.equal(sheet.getImages().length, 1);
    const { nativeCol, nativeColOff, nativeRow } = image.range.tl;
    assert.equal(nativeCol, 2); // C, inside the first B:C block.
    assert.equal(nativeRow, roleRow + 1);
    const leftColumnWidth = sheet.getColumn("B").width;
    const rightColumnWidth = sheet.getColumn("C").width;
    assert.ok(leftColumnWidth && rightColumnWidth);
    const leftColumnWidthPx = leftColumnWidth * 8;
    const blockWidthPx = leftColumnWidthPx + rightColumnWidth * 8;
    const imageCenterPx = leftColumnWidthPx + nativeColOff / 9525 + 75 / 2;
    assert.ok(Math.abs(imageCenterPx - blockWidthPx / 2) < 0.01);
  }
});
