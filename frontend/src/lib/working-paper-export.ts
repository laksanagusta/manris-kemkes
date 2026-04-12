import ExcelJS from "exceljs";

import type {
  WorkingPaper,
  WorkingPaperSignatory,
} from "@/types/working-paper";
import { getWorkingPaperRiskRows } from "./working-paper-linked-risks";

// Sheet builders accept any-shaped risk rows so legacy columns render as empty
// when the backend no longer provides snapshot-level detail.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExportableRiskRow = Record<string, any>;

const HEADER_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD9D9D9" },
};

const BASE_FONT_NAME = "Bookman Old Style";

const HEADER_FONT: Partial<ExcelJS.Font> = {
  name: BASE_FONT_NAME,
  bold: true,
  color: { argb: "FF000000" },
  size: 11,
};

const DATA_FONT: Partial<ExcelJS.Font> = {
  name: BASE_FONT_NAME,
  size: 11,
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

const WRAP_ALIGNMENT: Partial<ExcelJS.Alignment> = {
  vertical: "top",
  wrapText: true,
};

// ── Risk level color map (matches app labels in src/lib/risk.ts) ──
const RISK_LEVEL_COLORS: Record<
  string,
  { bg: string; font: string }
> = {
  sangat_tinggi: { bg: "FFEF4444", font: "FFFFFFFF" }, // red-500, white
  tinggi:        { bg: "FFF97316", font: "FFFFFFFF" }, // orange-500, white
  sedang:        { bg: "FFEAB308", font: "FF000000" }, // yellow-500, black
  rendah:        { bg: "FF3B82F6", font: "FFFFFFFF" }, // blue-500, white
  sangat_rendah: { bg: "FF10B981", font: "FFFFFFFF" }, // emerald-500, white
};

function applyRiskLevelStyle(cell: ExcelJS.Cell, tingkatRisiko: string | undefined | null): void {
  if (!tingkatRisiko) return;
  const key = tingkatRisiko.trim().toLowerCase().replace(/\s+/g, "_");
  const colors = RISK_LEVEL_COLORS[key];
  if (!colors) return;
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.bg } };
  cell.font = { ...DATA_FONT, color: { argb: colors.font } };
}

function applyNilaiStyle(cell: ExcelJS.Cell, nilai: number | string | undefined | null): void {
  if (nilai === undefined || nilai === null || nilai === "") return;
  const n = typeof nilai === "string" ? parseFloat(nilai) : nilai;
  if (isNaN(n)) return;
  let level: string;
  if (n >= 20) level = "sangat_tinggi";
  else if (n >= 15) level = "tinggi";
  else if (n >= 10) level = "sedang";
  else if (n >= 5) level = "rendah";
  else level = "sangat_rendah";
  applyRiskLevelStyle(cell, level);
}

function estimateRowHeight(worksheet: ExcelJS.Worksheet, rowNum: number, colCount: number): number {
  const row = worksheet.getRow(rowNum);
  let maxLines = 1;
  for (let c = 1; c <= colCount; c++) {
    const val = row.getCell(c).value;
    if (typeof val === "string") {
      const colWidth = worksheet.getColumn(c).width ?? 10;
      const charsPerLine = Math.max(colWidth * 1.2, 1);
      const lines = val.split("\n");
      let totalLines = 0;
      for (const line of lines) {
        totalLines += Math.max(1, Math.ceil(line.length / charsPerLine));
      }
      maxLines = Math.max(maxLines, totalLines);
    }
  }
  // ~15pt per line of text, minimum 50pt
  return Math.max(50, maxLines * 15);
}

function joinArray(values: string[] | undefined | null): string {
  if (!values || values.length === 0) return "";
  return values.filter(Boolean).join("\n");
}

function safeStr(value: string | undefined | null): string {
  return value ?? "";
}

function safeNum(value: number | undefined | null): number | string {
  return value ?? "";
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function sanitizeFilename(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 80) || "Kertas_Kerja";
}

function todayDateString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function applyHeaderRow(worksheet: ExcelJS.Worksheet, columnCount: number): void {
  const headerRow = worksheet.getRow(1);
  headerRow.font = HEADER_FONT;
  headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  for (let col = 1; col <= columnCount; col++) {
    const cell = headerRow.getCell(col);
    cell.fill = HEADER_FILL;
    cell.border = THIN_BORDER;
  }
  headerRow.height = 32;
}

function applyDataBorders(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  columnCount: number,
): void {
  for (let r = startRow; r <= endRow; r++) {
    const row = worksheet.getRow(r);
    row.alignment = WRAP_ALIGNMENT;
    row.font = DATA_FONT;
    row.height = estimateRowHeight(worksheet, r, columnCount);
    for (let c = 1; c <= columnCount; c++) {
      row.getCell(c).border = THIN_BORDER;
    }
  }
}

function buildProfilRisikoSheet(
  workbook: ExcelJS.Workbook,
  risks: ExportableRiskRow[],
  signatories: WorkingPaperSignatory[],
): void {
  const ws = workbook.addWorksheet("Profil Risiko");

  const COL_COUNT = 18;

  const columnWidths = [
    5,   // A: NO
    30,  // B: UNIT KERJA PEMILIK RISIKO
    28,  // C: RISIKO
    14,  // D: KODE RISIKO
    6,   // E: P
    6,   // F: D
    10,  // G: BOBOT
    10,  // H: NILAI
    18,  // I: TINGKAT RISIKO
    14,  // J: PRIORITAS RISIKO
    35,  // K: URAIAN PENGENDALIAN
    18,  // L: JADWAL PELAKSANAAN
    22,  // M: PENANGGUNGJAWAB
    6,   // N: P (target)
    6,   // O: D (target)
    10,  // P: BOBOT (target)
    10,  // Q: NILAI (target)
    18,  // R: TINGKAT RISIKO (target)
  ];

  columnWidths.forEach((width, index) => {
    ws.getColumn(index + 1).width = width;
  });

  const PROFIL_HEADER_FILL: ExcelJS.FillPattern = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9D9D9" },
  };

  const PROFIL_HEADER_FONT: Partial<ExcelJS.Font> = {
    name: BASE_FONT_NAME,
    bold: true,
    size: 11,
  };

  const PROFIL_HEADER_ALIGNMENT: Partial<ExcelJS.Alignment> = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };

  function applyProfilHeaderCell(cell: ExcelJS.Cell, value?: string | number): void {
    if (value !== undefined) cell.value = value;
    cell.fill = PROFIL_HEADER_FILL;
    cell.font = PROFIL_HEADER_FONT;
    cell.alignment = PROFIL_HEADER_ALIGNMENT;
    cell.border = THIN_BORDER;
  }

  const row1 = ws.getRow(1);
  const mainHeaders: (string | null)[] = [
    "NO",                           // A (1)
    "UNIT KERJA PEMILIK RISIKO",    // B (2)
    "RISIKO",                       // C (3)
    "KODE RISIKO",                  // D (4)
    "P",                            // E (5)
    "D",                            // F (6)
    "BOBOT",                        // G (7)
    "NILAI",                        // H (8)
    "TINGKAT RISIKO",               // I (9)
    "PRIORITAS RISIKO",             // J (10)
    "URAIAN PENGENDALIAN",          // K (11)
    "JADWAL PELAKSANAAN",           // L (12)
    "PENANGGUNGJAWAB",              // M (13)
    "TARGET PENURUNAN RISIKO",      // N (14) — spans N:R
    null, null, null, null,         // O-R (15-18) — part of merge
  ];
  mainHeaders.forEach((header, index) => {
    applyProfilHeaderCell(row1.getCell(index + 1), header ?? undefined);
  });
  row1.height = 32;

  const row2 = ws.getRow(2);
  for (let col = 1; col <= 13; col++) {
    applyProfilHeaderCell(row2.getCell(col));
  }
  const subHeaders = ["P", "D", "BOBOT", "NILAI", "TINGKAT RISIKO"];
  subHeaders.forEach((header, index) => {
    applyProfilHeaderCell(row2.getCell(14 + index), header);
  });
  row2.height = 24;

  const row3 = ws.getRow(3);
  for (let col = 1; col <= COL_COUNT; col++) {
    applyProfilHeaderCell(row3.getCell(col), col);
  }
  row3.height = 20;

  // A–M: merge rows 1–2 vertically
  for (let col = 1; col <= 13; col++) {
    ws.mergeCells(1, col, 2, col);
  }
  // N1:R1 horizontal merge for "TARGET PENURUNAN RISIKO"
  ws.mergeCells(1, 14, 1, 18);

  risks.forEach((risk, index) => {
    const dataRow = ws.getRow(4 + index);
    dataRow.getCell(1).value = index + 1;
    dataRow.getCell(2).value = safeStr(risk.org_name);
    dataRow.getCell(3).value = safeStr(risk.title);
    dataRow.getCell(4).value = safeStr(risk.code);
    dataRow.getCell(5).value = safeNum(risk.probability);
    dataRow.getCell(6).value = safeNum(risk.impact);
    dataRow.getCell(7).value = safeNum(risk.bobot);
    dataRow.getCell(8).value = safeNum(risk.nilai);
    dataRow.getCell(9).value = safeStr(risk.tingkat_risiko);
    dataRow.getCell(10).value = safeNum(risk.prioritas_risiko);
    dataRow.getCell(11).value = safeStr(risk.existing_control);
    dataRow.getCell(12).value = safeStr(risk.jadwal_pelaksanaan);
    dataRow.getCell(13).value = safeStr(risk.penanggung_jawab);
    dataRow.getCell(14).value = safeNum(risk.target_probability);
    dataRow.getCell(15).value = safeNum(risk.target_impact);
    dataRow.getCell(16).value = safeNum(risk.target_bobot);
    dataRow.getCell(17).value = safeNum(risk.target_nilai);
    dataRow.getCell(18).value = safeStr(risk.target_tingkat_risiko);

    applyNilaiStyle(dataRow.getCell(8), risk.nilai);
    applyRiskLevelStyle(dataRow.getCell(9), risk.tingkat_risiko);
    applyNilaiStyle(dataRow.getCell(17), risk.target_nilai);
    applyRiskLevelStyle(dataRow.getCell(18), risk.target_tingkat_risiko);
  });

  applyDataBorders(ws, 4, risks.length + 3, COL_COUNT);
  const lastSigRow = appendSignatureBlock(workbook, ws, signatories, COL_COUNT, risks.length + 3);
  appendPetunjukPengisian(ws, lastSigRow, COL_COUNT);
  ws.views = [{ state: "frozen", ySplit: 3 }];
}

function buildPenilaianRisikoSheet(
  workbook: ExcelJS.Workbook,
  risks: ExportableRiskRow[],
  signatories: WorkingPaperSignatory[],
): void {
  const ws = workbook.addWorksheet("KK Penilaian Risiko");

  const COL_COUNT = 25;

  const columnWidths = [
    5,   // A(1): NO
    30,  // B(2): RISIKO
    14,  // C(3): KODE RISIKO
    24,  // D(4): SEBAB
    16,  // E(5): SUMBER RISIKO
    8,   // F(6): C/UC
    24,  // G(7): DAMPAK
    28,  // H(8): URAIAN (pengendalian)
    14,  // I(9): EFEKTIF
    14,  // J(10): TIDAK EFEKTIF
    6,   // K(11): P
    6,   // L(12): D
    10,  // M(13): BOBOT
    10,  // N(14): NILAI
    18,  // O(15): TINGKAT RISIKO
    14,  // P(16): PRIORITAS RISIKO
    22,  // Q(17): SELERA RISIKO
    20,  // R(18): PILIHAN PENANGANAN
    28,  // S(19): URAIAN (RPR)
    18,  // T(20): JADWAL PELAKSANAAN
    6,   // U(21): P (target)
    6,   // V(22): D (target)
    10,  // W(23): BOBOT (target)
    10,  // X(24): NILAI (target)
    18,  // Y(25): TINGKAT RISIKO (target)
  ];

  columnWidths.forEach((width, index) => {
    ws.getColumn(index + 1).width = width;
  });

  const H_FILL: ExcelJS.FillPattern = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9D9D9" },
  };

  const H_FONT: Partial<ExcelJS.Font> = { name: BASE_FONT_NAME, bold: true, size: 11 };
  const H_ALIGN: Partial<ExcelJS.Alignment> = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };

  function hCell(cell: ExcelJS.Cell, value?: string | number): void {
    if (value !== undefined) cell.value = value;
    cell.fill = H_FILL;
    cell.font = H_FONT;
    cell.alignment = H_ALIGN;
    cell.border = THIN_BORDER;
  }

  // ── Row 1: top-level group headers ──
  const row1 = ws.getRow(1);
  hCell(row1.getCell(1), "NO");
  hCell(row1.getCell(2), "IDENTIFIKASI RISIKO");
  for (let c = 3; c <= 7; c++) hCell(row1.getCell(c));
  hCell(row1.getCell(8), "ANALISIS RISIKO");
  for (let c = 9; c <= 15; c++) hCell(row1.getCell(c));
  hCell(row1.getCell(16), "EVALUASI RISIKO");
  hCell(row1.getCell(17));
  hCell(row1.getCell(18), "RENCANA PENANGANAN RISIKO (RPR)");
  for (let c = 19; c <= 20; c++) hCell(row1.getCell(c));
  hCell(row1.getCell(21), "TARGET PENURUNAN TINGKAT RISIKO");
  for (let c = 22; c <= 25; c++) hCell(row1.getCell(c));
  row1.height = 28;

  ws.mergeCells(1, 1, 3, 1);   // NO spans rows 1-3
  ws.mergeCells(1, 2, 1, 7);   // IDENTIFIKASI RISIKO
  ws.mergeCells(1, 8, 1, 15);  // ANALISIS RISIKO
  ws.mergeCells(1, 16, 1, 17); // EVALUASI RISIKO
  ws.mergeCells(1, 18, 1, 20); // RENCANA PENANGANAN RISIKO (RPR)
  ws.mergeCells(1, 21, 1, 25); // TARGET PENURUNAN TINGKAT RISIKO

  // ── Row 2: sub-headers ──
  const row2 = ws.getRow(2);
  const subHeaders: [number, string][] = [
    [2, "RISIKO"], [3, "KODE RISIKO"], [4, "SEBAB"],
    [5, "SUMBER RISIKO"], [6, "C/UC"], [7, "DAMPAK"],
    [8, "PENGENDALIAN YANG ADA"],
    [11, "P"], [12, "D"], [13, "BOBOT"], [14, "NILAI"], [15, "TINGKAT RISIKO"],
    [16, "PRIORITAS RISIKO"], [17, "SELERA RISIKO"],
    [18, "PILIHAN PENANGANAN"], [19, "URAIAN"], [20, "JADWAL PELAKSANAAN"],
    [21, "P"], [22, "D"], [23, "BOBOT"], [24, "NILAI"], [25, "TINGKAT RISIKO"],
  ];
  for (let c = 1; c <= COL_COUNT; c++) hCell(row2.getCell(c));
  subHeaders.forEach(([col, label]) => { row2.getCell(col).value = label; });
  row2.height = 28;

  // Vertical merges for row 2-3 (all sub-headers except PENGENDALIAN YANG ADA)
  const verticalMergeCols = [2,3,4,5,6,7, 11,12,13,14,15, 16,17, 18,19,20, 21,22,23,24,25];
  verticalMergeCols.forEach((col) => { ws.mergeCells(2, col, 3, col); });
  ws.mergeCells(2, 8, 2, 10); // PENGENDALIAN YANG ADA spans H-J

  // ── Row 3: sub-sub-headers (only under PENGENDALIAN YANG ADA) ──
  const row3 = ws.getRow(3);
  for (let c = 1; c <= COL_COUNT; c++) hCell(row3.getCell(c));
  row3.getCell(8).value = "URAIAN";
  row3.getCell(9).value = "EFEKTIF";
  row3.getCell(10).value = "TIDAK EFEKTIF";
  row3.height = 24;

  // ── Row 4: column numbers ──
  const row4 = ws.getRow(4);
  for (let c = 1; c <= COL_COUNT; c++) {
    hCell(row4.getCell(c), c);
  }
  row4.height = 20;

  // ── Data rows ──
  risks.forEach((risk, index) => {
    const dataRow = ws.getRow(5 + index);
    const eff = safeStr(risk.control_effectiveness).toLowerCase();

    dataRow.getCell(1).value = index + 1;
    dataRow.getCell(2).value = safeStr(risk.title);
    dataRow.getCell(3).value = safeStr(risk.code);
    dataRow.getCell(4).value = joinArray(risk.cause);
    dataRow.getCell(5).value = safeStr(risk.risk_source);
    dataRow.getCell(6).value = safeStr(risk.controllability);
    dataRow.getCell(7).value = joinArray(risk.impact_desc);
    dataRow.getCell(8).value = safeStr(risk.existing_control);
    dataRow.getCell(9).value = eff.includes("efektif") && !eff.includes("tidak") ? "EFEKTIF" : "";
    dataRow.getCell(10).value = eff.includes("tidak") ? "TIDAK EFEKTIF" : "";
    dataRow.getCell(11).value = safeNum(risk.probability);
    dataRow.getCell(12).value = safeNum(risk.impact);
    dataRow.getCell(13).value = safeNum(risk.bobot);
    dataRow.getCell(14).value = safeNum(risk.nilai);
    dataRow.getCell(15).value = safeStr(risk.tingkat_risiko);
    dataRow.getCell(16).value = safeNum(risk.prioritas_risiko);
    dataRow.getCell(17).value = safeStr(risk.risk_appetite);
    dataRow.getCell(18).value = safeStr(risk.treatment_option);
    dataRow.getCell(19).value = (risk.mitigations ?? []).filter(Boolean).join(", ");
    dataRow.getCell(20).value = (risk.mitigation_due_dates ?? []).filter(Boolean).map((d: string) => formatDate(d)).join(", ");
    dataRow.getCell(21).value = safeNum(risk.target_probability);
    dataRow.getCell(22).value = safeNum(risk.target_impact);
    dataRow.getCell(23).value = safeNum(risk.target_bobot);
    dataRow.getCell(24).value = safeNum(risk.target_nilai);
    dataRow.getCell(25).value = safeStr(risk.target_tingkat_risiko);

    applyNilaiStyle(dataRow.getCell(14), risk.nilai);
    applyRiskLevelStyle(dataRow.getCell(15), risk.tingkat_risiko);
    applyNilaiStyle(dataRow.getCell(24), risk.target_nilai);
    applyRiskLevelStyle(dataRow.getCell(25), risk.target_tingkat_risiko);
  });

  applyDataBorders(ws, 5, risks.length + 4, COL_COUNT);
  appendSignatureBlock(workbook, ws, signatories, COL_COUNT, risks.length + 4);
  ws.views = [{ state: "frozen", ySplit: 4 }];
}

function buildPemantauanReviuSheet(
  workbook: ExcelJS.Workbook,
  risks: ExportableRiskRow[],
  signatories: WorkingPaperSignatory[],
): void {
  const ws = workbook.addWorksheet("KK Pemantauan Reviu");

  ws.columns = [
    { header: "No", key: "no", width: 5 },
    { header: "Kode Risiko", key: "kode_risiko", width: 14 },
    { header: "Uraian Risiko", key: "uraian_risiko", width: 32 },
    { header: "Target - P", key: "target_p", width: 10 },
    { header: "Target - D", key: "target_d", width: 10 },
    { header: "Target - Bobot", key: "target_bobot", width: 13 },
    { header: "Target - Nilai", key: "target_nilai", width: 13 },
    { header: "Target - Tingkat Risiko", key: "target_tingkat_risiko", width: 20 },
    { header: "Realisasi - P", key: "monitoring_p", width: 12 },
    { header: "Realisasi - D", key: "monitoring_d", width: 12 },
    { header: "Realisasi - Bobot", key: "monitoring_bobot", width: 15 },
    { header: "Realisasi - Nilai", key: "monitoring_nilai", width: 15 },
    { header: "Realisasi - Tingkat Risiko", key: "monitoring_tingkat_risiko", width: 22 },
    { header: "Simpulan Tingkat Risiko", key: "monitoring_simpulan", width: 22 },
    { header: "Efektivitas", key: "monitoring_efektivitas", width: 16 },
    { header: "Jadwal Pelaksanaan", key: "jadwal_pelaksanaan", width: 20 },
  ];

  const colCount = ws.columns.length;
  applyHeaderRow(ws, colCount);

  risks.forEach((risk, index) => {
    ws.addRow({
      no: index + 1,
      kode_risiko: risk.code,
      uraian_risiko: risk.title,
      target_p: risk.target_p,
      target_d: risk.target_d,
      target_bobot: risk.target_bobot,
      target_nilai: risk.target_nilai,
      target_tingkat_risiko: safeStr(risk.target_tingkat_risiko),
      monitoring_p: safeNum(risk.monitoring_p),
      monitoring_d: safeNum(risk.monitoring_d),
      monitoring_bobot: safeNum(risk.monitoring_bobot),
      monitoring_nilai: safeNum(risk.monitoring_nilai),
      monitoring_tingkat_risiko: safeStr(risk.monitoring_tingkat_risiko),
      monitoring_simpulan: safeStr(risk.monitoring_simpulan_tingkat_risiko),
      monitoring_efektivitas: safeStr(risk.monitoring_efektivitas),
      jadwal_pelaksanaan: safeStr(risk.jadwal_pelaksanaan),
    });

    const dataRow = ws.getRow(2 + index);
    applyNilaiStyle(dataRow.getCell(7), risk.target_nilai);
    applyRiskLevelStyle(dataRow.getCell(8), risk.target_tingkat_risiko);
    applyNilaiStyle(dataRow.getCell(12), risk.monitoring_nilai);
    applyRiskLevelStyle(dataRow.getCell(13), risk.monitoring_tingkat_risiko);
    applyRiskLevelStyle(dataRow.getCell(14), risk.monitoring_simpulan_tingkat_risiko);
  });

  applyDataBorders(ws, 2, risks.length + 1, colCount);
  appendSignatureBlock(workbook, ws, signatories, colCount, risks.length + 1);
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

function stripBase64Prefix(base64: string): string {
  const prefix = "data:image/png;base64,";
  if (base64.startsWith(prefix)) {
    return base64.slice(prefix.length);
  }
  return base64;
}

function buildTandaTanganSheet(
  workbook: ExcelJS.Workbook,
  workingPaper: WorkingPaper,
): void {
  const ws = workbook.addWorksheet("Tanda Tangan");
  const signatories = workingPaper.signatories;

  ws.mergeCells("A1:G1");
  const hashCell = ws.getCell("A1");
  hashCell.value = `Document Hash: ${workingPaper.document_hash ?? "-"}`;
  hashCell.font = { name: BASE_FONT_NAME, bold: true, size: 11 };
  hashCell.alignment = { vertical: "middle" };
  ws.getRow(1).height = 24;

  const headerColumns = [
    { header: "Urutan", width: 9 },
    { header: "Nama", width: 24 },
    { header: "NIP", width: 22 },
    { header: "Pangkat", width: 24 },
    { header: "Status", width: 14 },
    { header: "Tanggal Tanda Tangan", width: 24 },
    { header: "QR Code", width: 18 },
  ];

  headerColumns.forEach((col, index) => {
    ws.getColumn(index + 1).width = col.width;
  });

  // Row 3 = signatory table header (row 2 is a spacer)
  const headerRowNum = 3;
  const headerRow = ws.getRow(headerRowNum);
  headerColumns.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = col.header;
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.border = THIN_BORDER;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  headerRow.height = 28;

  const colCount = headerColumns.length;
  const qrImages: Array<{ imageId: number; row: number; col: number }> = [];

  signatories.forEach((sig: WorkingPaperSignatory, index: number) => {
    const dataRowNum = headerRowNum + 1 + index;
    const row = ws.getRow(dataRowNum);

    row.getCell(1).value = sig.sequence_no;
    row.getCell(2).value = sig.signer_name;
    row.getCell(3).value = safeStr(sig.signer_nip);
    row.getCell(4).value = sig.signer_pangkat;
    row.getCell(5).value = sig.status === "signed" ? "Ditandatangani" : "Menunggu";
    row.getCell(6).value = formatDate(sig.signed_at);
    row.getCell(7).value = "";

    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c);
      cell.border = THIN_BORDER;
      cell.alignment = WRAP_ALIGNMENT;
    }

    if (sig.status === "signed" && sig.qr_code_png) {
      row.height = 80;
      const imageId = workbook.addImage({
        base64: stripBase64Prefix(sig.qr_code_png),
        extension: "png",
      });
      // ExcelJS addImage uses 0-based col/row; dataRowNum is 1-based so subtract 1
      qrImages.push({ imageId, row: dataRowNum - 1, col: colCount - 1 });
    }
  });

  qrImages.forEach(({ imageId, row, col }) => {
    ws.addImage(imageId, {
      tl: { col, row },
      ext: { width: 100, height: 100 },
    });
  });

  const footerRowNum = headerRowNum + 1 + signatories.length + 1;
  ws.mergeCells(`A${footerRowNum}:G${footerRowNum}`);
  const footerCell = ws.getCell(`A${footerRowNum}`);
  footerCell.value = "Dokumen ini ditandatangani secara elektronik melalui Manris";
  footerCell.font = { name: BASE_FONT_NAME, italic: true, size: 10, color: { argb: "FF666666" } };
  footerCell.alignment = { horizontal: "center", vertical: "middle" };
}

const PETUNJUK_PENGISIAN_ITEMS: string[] = [
  "Kolom (1) diisi dengan nomor urut",
  "Kolom (2) diisi dengan unit kerja pemilik risiko",
  "Kolom (3) diisi dengan pernyataan risiko yang sama pada kertas kerja penilaian risiko",
  "Kolom (4) diisi dengan kode risiko yang sama dengan kode risiko pada kertas kerja penilaian risiko",
  "Kolom (5) diisi dengan tingkat probabilitas (P) yang sama pada kertas kerja penilaian risiko",
  "Kolom (6) diisi dengan tingkat dampak (D) yang sama pada kertas kerja penilaian risiko",
  "Kolom (7) diisi dengan nilai bobot yang sama pada kertas kerja penilaian risiko",
  "Kolom (8) diisi dengan nilai atau skor risiko yang sama pada kertas kerja penilaian risiko",
  "Kolom (9) diisi dengan tingkat risiko yang sama pada kertas kerja penilaian risiko",
  "Kolom (10) diisi dengan prioritas risiko yang sama pada kertas kerja penilaian risiko",
  "Kolom (11) diisi dengan rencana pengendalian yang sama pada kertas kerja penilaian risiko",
  "Kolom (12) diisi dengan jadwal pelaksanaan yang sama pada kertas kerja penilaian risiko",
  "Kolom (13) diisi dengan penanggungjawab terhadap pelaksanaan rencana penanganan risiko (RPR)",
  "Kolom (14) diisi dengan target tingkat probabilitas (P) yang sama pada kertas kerja penilaian risiko",
  "Kolom (15) diisi dengan target tingkat dampak (D) yang sama pada kertas kerja penilaian risiko",
  "Kolom (16) diisi dengan target nilai bobot yang sama pada kertas kerja penilaian risiko",
  "Kolom (17) diisi dengan target nilai atau skor risiko yang sama pada kertas kerja penilaian risiko",
  "Kolom (18) diisi dengan target tingkat risiko yang sama pada kertas kerja penilaian risiko",
];

function appendPetunjukPengisian(
  ws: ExcelJS.Worksheet,
  afterRow: number,
  totalColumns: number,
): void {
  const titleRow = afterRow + 3;
  const petunjukFont: Partial<ExcelJS.Font> = { name: BASE_FONT_NAME, size: 11 };
  const petunjukBoldFont: Partial<ExcelJS.Font> = { ...petunjukFont, bold: true };

  if (totalColumns > 1) {
    ws.mergeCells(titleRow, 1, titleRow, totalColumns);
  }
  const titleCell = ws.getRow(titleRow).getCell(1);
  titleCell.value = "Petunjuk Pengisian :";
  titleCell.font = petunjukBoldFont;
  titleCell.alignment = { vertical: "top" };

  PETUNJUK_PENGISIAN_ITEMS.forEach((text, index) => {
    const rowNum = titleRow + 1 + index;
    if (totalColumns > 1) {
      ws.mergeCells(rowNum, 1, rowNum, totalColumns);
    }
    const cell = ws.getRow(rowNum).getCell(1);
    cell.value = `${index + 1}.\t${text}`;
    cell.font = petunjukFont;
    cell.alignment = { vertical: "top", wrapText: true };
  });
}

function appendSignatureBlock(
  workbook: ExcelJS.Workbook,
  ws: ExcelJS.Worksheet,
  signatories: WorkingPaperSignatory[],
  totalColumns: number,
  afterRow: number,
): number {
  if (signatories.length === 0) return afterRow;

  const sorted = [...signatories].sort((a, b) => a.sequence_no - b.sequence_no);
  const n = sorted.length;
  const colsPerSig = Math.floor(totalColumns / n);
  const sigFont: Partial<ExcelJS.Font> = { name: BASE_FONT_NAME, size: 11 };
  const centerAlign: Partial<ExcelJS.Alignment> = { horizontal: "center", vertical: "middle", wrapText: true };

  const jabatanRow = afterRow + 3;
  const namaRow = jabatanRow + 4;
  const nipRow = namaRow + 1;

  const QR_SIZE = 75;
  const GAP_ROW_HEIGHT = 28;
  const GAP_ROW_COUNT = 3;
  const PT_TO_PX = 1.333;
  const gapHeightPx = GAP_ROW_COUNT * GAP_ROW_HEIGHT * PT_TO_PX;

  for (let r = jabatanRow + 1; r <= jabatanRow + GAP_ROW_COUNT; r++) {
    ws.getRow(r).height = GAP_ROW_HEIGHT;
  }

  sorted.forEach((sig, index) => {
    const startCol = index * colsPerSig + 1;
    const endCol = index === n - 1 ? totalColumns : (index + 1) * colsPerSig;

    if (endCol > startCol) {
      ws.mergeCells(jabatanRow, startCol, jabatanRow, endCol);
      ws.mergeCells(namaRow, startCol, namaRow, endCol);
      ws.mergeCells(nipRow, startCol, nipRow, endCol);
    }

    const jabatanCell = ws.getRow(jabatanRow).getCell(startCol);
    jabatanCell.value = sig.signer_jabatan;
    jabatanCell.font = sigFont;
    jabatanCell.alignment = centerAlign;

    const namaCell = ws.getRow(namaRow).getCell(startCol);
    namaCell.value = sig.signer_name;
    namaCell.font = { ...sigFont, underline: true };
    namaCell.alignment = centerAlign;

    const nipCell = ws.getRow(nipRow).getCell(startCol);
    nipCell.value = `NIP. ${sig.signer_nip ?? ""}`;
    nipCell.font = sigFont;
    nipCell.alignment = centerAlign;

    if (sig.status === "signed" && sig.qr_code_png) {
      const imageId = workbook.addImage({
        base64: stripBase64Prefix(sig.qr_code_png),
        extension: "png",
      });

      // Horizontal center: convert pixel midpoint to fractional 0-based column
      const PX_PER_CHAR = 7.5;
      let pxBefore = 0;
      for (let c = 1; c < startCol; c++) {
        pxBefore += (ws.getColumn(c).width ?? 10) * PX_PER_CHAR;
      }
      let rangePx = 0;
      for (let c = startCol; c <= endCol; c++) {
        rangePx += (ws.getColumn(c).width ?? 10) * PX_PER_CHAR;
      }
      const centerXPx = pxBefore + rangePx / 2;
      const qrLeftPx = centerXPx - QR_SIZE / 2;

      // Pixel X → fractional 0-based column
      let accPx = 0;
      let fracCol = 0;
      for (let c = 1; c <= totalColumns; c++) {
        const colWidthPx = (ws.getColumn(c).width ?? 10) * PX_PER_CHAR;
        if (accPx + colWidthPx > qrLeftPx) {
          fracCol = (c - 1) + (qrLeftPx - accPx) / colWidthPx;
          break;
        }
        accPx += colWidthPx;
      }

      // Vertical center: fractional 0-based row in gap between jabatan and nama
      const gapStartRow0 = jabatanRow;
      const verticalOffsetPx = (gapHeightPx - QR_SIZE) / 2;
      const pxPerRow = GAP_ROW_HEIGHT * PT_TO_PX;
      const fracRow = gapStartRow0 + verticalOffsetPx / pxPerRow;

      ws.addImage(imageId, {
        tl: { col: fracCol, row: fracRow },
        ext: { width: QR_SIZE, height: QR_SIZE },
      });
    }
  });

  ws.getRow(namaRow).height = 20;
  ws.getRow(nipRow).height = 20;

  return nipRow;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function exportWorkingPaper(workingPaper: WorkingPaper): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const risks = getWorkingPaperRiskRows(workingPaper);
  const signatories = workingPaper.signatories;

  buildProfilRisikoSheet(workbook, risks, signatories);
  buildPenilaianRisikoSheet(workbook, risks, signatories);
  buildPemantauanReviuSheet(workbook, risks, signatories);
  buildTandaTanganSheet(workbook, workingPaper);

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `Kertas_Kerja_${sanitizeFilename(workingPaper.title)}_${todayDateString()}.xlsx`;

  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}
