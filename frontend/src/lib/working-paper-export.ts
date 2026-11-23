import ExcelJS from "exceljs";

import type {
  WorkingPaper,
  WorkingPaperRiskData,
  WorkingPaperSignatory,
} from "@/types/working-paper";
import { getWorkingPaperRiskRows } from "./working-paper-linked-risks";
import { buildWorkingPaperSignatureLayout } from "./working-paper-signature-layout";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExportableRiskRow = Record<string, any>;

/**
 * For sheets 1 & 2, use the monitoring source snapshot when available.
 * This is the immutable risk state immediately before the latest monitoring
 * result. Legacy links without monitoring keep the previous-profile fallback.
 */
function getProfileRow(risk: WorkingPaperRiskData): ExportableRiskRow {
  const prev = risk.previous;
  const monitoringSource = risk.monitoring;
  const src = monitoringSource ? risk : (prev ?? risk);
  const sourceActions = getMitigationActions(src.mitigations, src.mitigation_details);
  const profileRiskLevel = monitoringSource
    ? formatRiskLevelLabel(monitoringSource.sourceLevel)
    : src === prev
      ? (prev.tingkat_risiko_display ?? prev.tingkat_risiko)
      : (risk.tingkat_risiko_display ?? risk.tingkat_risiko);
  return {
    ...risk,
    // Inherent values — prefer the immutable monitoring source snapshot.
    probability: monitoringSource?.sourceProbability ?? src.probability ?? risk.probability,
    impact: monitoringSource?.sourceImpact ?? src.impact ?? risk.impact,
    bobot: monitoringSource?.sourceWeight ?? src.bobot ?? risk.bobot,
    nilai: monitoringSource?.sourceNilai ?? src.nilai ?? src.inherentScore ?? risk.nilai ?? risk.inherentScore,
    tingkat_risiko: profileRiskLevel,
    tingkat_risiko_display: profileRiskLevel,
    prioritas_risiko: src.prioritas_risiko ?? risk.prioritas_risiko,
    cause: src.cause ?? risk.cause,
    risk_source: src.risk_source ?? risk.risk_source,
    controllability: src.controllability ?? risk.controllability,
    impact_desc: src.impact_desc ?? risk.impact_desc,
    existing_control: src.existing_control ?? risk.existing_control,
    control_effectiveness: src.control_effectiveness ?? risk.control_effectiveness,
    control_effectiveness_display: src === prev ? (prev.control_effectiveness_display ?? prev.control_effectiveness) : (risk.control_effectiveness_display ?? risk.control_effectiveness),
    risk_appetite: src.risk_appetite ?? risk.risk_appetite,
    risk_appetite_display: src === prev ? (prev.risk_appetite_display ?? prev.risk_appetite) : (risk.risk_appetite_display ?? risk.risk_appetite),
    treatment_option: src.treatment_option ?? risk.treatment_option,
    treatment_option_display: src === prev ? (prev.treatment_option_display ?? prev.treatment_option) : (risk.treatment_option_display ?? risk.treatment_option),
    mitigations: sourceActions.length > 0 ? sourceActions : getMitigationActions(risk.mitigations, risk.mitigation_details),
    mitigation_due_dates: src.mitigation_due_dates ?? risk.mitigation_due_dates,
    // Target values — prefer previous snapshot and canonical target_nilai
    target_probability: src.target_probability ?? risk.target_probability,
    target_impact: src.target_impact ?? risk.target_impact,
    target_bobot: src.target_bobot ?? risk.target_bobot,
    target_nilai: src.target_nilai ?? src.target_score ?? risk.target_nilai ?? risk.target_score,
    target_tingkat_risiko: src === prev ? (prev.target_tingkat_risiko_display ?? prev.target_tingkat_risiko) : (risk.target_tingkat_risiko_display ?? risk.target_tingkat_risiko),
  };
}

const BASE_FONT_NAME = "Bookman Old Style";
const HEADER_LINE_HEIGHT = 16;

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

// Use sRGB versions of the 300 shades from the workbook's risk-level hues.
const RISK_LEVEL_FILLS: Record<string, string> = {
  sangat_tinggi: "FFFFA2A2",
  tinggi: "FFFFB86A",
  sedang: "FFFFDF20",
  rendah: "FF8EC5FF",
  sangat_rendah: "FF5EE9B5",
};

const RISK_LEVEL_FONT: Partial<ExcelJS.Font> = {
  ...DATA_FONT,
  color: { argb: "FF000000" },
};

const RISK_LEVEL_LABELS: Record<string, string> = {
  sangat_tinggi: "Sangat Tinggi",
  tinggi: "Tinggi",
  sedang: "Sedang",
  rendah: "Rendah",
  sangat_rendah: "Sangat Rendah",
};

function formatRiskLevelLabel(value: string | undefined | null): string {
  if (!value) return "";
  const key = value.trim().toLowerCase().replace(/\s+/g, "_");
  return RISK_LEVEL_LABELS[key] ?? value;
}

function applyRiskLevelStyle(cell: ExcelJS.Cell, tingkatRisiko: string | undefined | null): void {
  if (!tingkatRisiko) return;
  const key = tingkatRisiko.trim().toLowerCase().replace(/\s+/g, "_");
  cell.font = RISK_LEVEL_FONT;
  if (Object.hasOwn(RISK_LEVEL_FILLS, key)) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RISK_LEVEL_FILLS[key] } };
  }
}

function joinArray(values: string[] | undefined | null): string {
  if (!values || values.length === 0) return "";
  return values.filter(Boolean).join("\n");
}

function getMitigationActions(actions?: string[], legacyDetails?: string[]): string[] {
  const actionLines = actions?.filter(Boolean) ?? [];
  if (actionLines.length > 0) return actionLines;

  return (legacyDetails ?? []).map((detail) =>
    detail.replace(/^Aksi: /, "").replace(/ · Jenis: [^\r\n]*$/, ""),
  ).filter(Boolean);
}

function safeStr(value: string | undefined | null): string {
  return value ?? "";
}

function safeNum(value: number | undefined | null): number | string {
  return value ?? "";
}

function safeRoundedScore(value: number | string | undefined | null): number | string {
  if (value === undefined || value === null || value === "") return "";
  const numericValue = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(numericValue) ? Math.round(numericValue) : value;
}

function setTextCell(cell: ExcelJS.Cell, value: string | undefined | null) {
  cell.numFmt = "@";
  cell.value = safeStr(value);
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

function applyWorkingPaperMetadataBlock(
  ws: ExcelJS.Worksheet,
  firstCol: number,
  lastCol: number,
): void {
  const titleRow = 2;
  ws.mergeCells(titleRow, firstCol + 4, titleRow, Math.min(lastCol, firstCol + 15));
  const titleCell = ws.getCell(titleRow, firstCol + 4);
  titleCell.value = "PROFIL RISIKO TINGKAT UPR T-II KEMENTERIAN KESEHATAN";
  titleCell.font = { name: BASE_FONT_NAME, bold: true, size: 12 };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  const labelFont: Partial<ExcelJS.Font> = { name: BASE_FONT_NAME, size: 11 };
  const valueFont: Partial<ExcelJS.Font> = { name: BASE_FONT_NAME, size: 11 };
  const labelAlign: Partial<ExcelJS.Alignment> = { horizontal: "left", vertical: "middle", wrapText: true };
  const centerValueAlign: Partial<ExcelJS.Alignment> = { horizontal: "center", vertical: "middle", wrapText: true };
  const leftValueAlign: Partial<ExcelJS.Alignment> = { vertical: "top", wrapText: true };

  const leftLabelCol = firstCol;
  const leftLabelEndCol = Math.min(lastCol, firstCol + 1);
  const leftValueStartCol = firstCol + 2;
  const leftValueEndCol = Math.min(lastCol, firstCol + 6);
  const rightLabelCol = Math.min(lastCol, firstCol + 7);
  const rightLabelEndCol = Math.min(lastCol, firstCol + 8);
  const rightValueStartCol = Math.min(lastCol, firstCol + 9);
  const rightValueEndCol = lastCol;

  const rows: Array<{
    row: number;
    leftLabel: string;
    rightLabel: string;
  }> = [
    {
      row: 4,
      leftLabel: "Tujuan  * :",
      rightLabel: "Unit Pemilik Risiko  * :",
    },
    {
      row: 5,
      leftLabel: "Sasaran * :",
      rightLabel: "Nama Pemilik Risiko * :",
    },
    {
      row: 6,
      leftLabel: "Indikator Kinerja Utama * :",
      rightLabel: "Nama Tim Pengelola Risiko * :",
    },
    {
      row: 7,
      leftLabel: "Target * :",
      rightLabel: "Tgl Penilaian Risiko * :",
    },
    {
      row: 8,
      leftLabel: "Program * :",
      rightLabel: "Periode Risiko * :",
    },
    {
      row: 9,
      leftLabel: "Kegiatan * :",
      rightLabel: "Tgl Update Risiko * :",
    },
  ];

  rows.forEach(({ row, leftLabel, rightLabel }) => {
    ws.mergeCells(row, leftLabelCol, row, leftLabelEndCol);
    const leftLabelCell = ws.getCell(row, leftLabelCol);
    leftLabelCell.value = leftLabel;
    leftLabelCell.font = labelFont;
    leftLabelCell.alignment = labelAlign;

    ws.mergeCells(row, leftValueStartCol, row, leftValueEndCol);
    const leftValueCell = ws.getCell(row, leftValueStartCol);
    leftValueCell.font = valueFont;
    leftValueCell.alignment = leftValueAlign;

    ws.mergeCells(row, rightLabelCol, row, rightLabelEndCol);
    const rightLabelCell = ws.getCell(row, rightLabelCol);
    rightLabelCell.value = rightLabel;
    rightLabelCell.font = labelFont;
    rightLabelCell.alignment = labelAlign;

    ws.mergeCells(row, rightValueStartCol, row, rightValueEndCol);
    const rightValueCell = ws.getCell(row, rightValueStartCol);
    rightValueCell.font = valueFont;
    rightValueCell.alignment = centerValueAlign;
  });
}

/** Apply borders to data rows. startCol/endCol are 1-based column numbers. */
function applyDataBorders(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
): void {
  for (let r = startRow; r <= endRow; r++) {
    const row = worksheet.getRow(r);
    row.alignment = WRAP_ALIGNMENT;
    // Leave the height automatic so Excel can fit wrapped data to the actual font.
    for (let c = startCol; c <= endCol; c++) {
      const cell = row.getCell(c);
      cell.font ??= DATA_FONT;
      cell.border = THIN_BORDER;
    }
  }
}

// ── Column B offset constant ──
// All 3 data sheets start data at column B (col 2). Column A is an empty margin.
const DATA_START_COL = 2;
const WORKING_PAPER_HEADER_ROW = 11;

function buildProfilRisikoSheet(
  workbook: ExcelJS.Workbook,
  risks: ExportableRiskRow[],
  signatories: WorkingPaperSignatory[],
  includeWorkingPaperSections = false,
): void {
  const ws = workbook.addWorksheet("Profil Risiko");

  const COL_COUNT = 18;
  const FIRST_COL = DATA_START_COL; // B = col 2
  const LAST_COL = FIRST_COL + COL_COUNT - 1; // col 19 (S)

  // Column A is an empty margin; set explicit width for accurate pixel calculations
  ws.getColumn(1).width = 3;

  const columnWidths = [
    5,   // NO
    40,  // UNIT KERJA PEMILIK RISIKO (was 30)
    40,  // RISIKO (was 28)
    14,  // KODE RISIKO
    6,   // P
    6,   // D
    10,  // BOBOT
    10,  // NILAI
    18,  // TINGKAT RISIKO
    14,  // PRIORITAS RISIKO
    45,  // URAIAN PENGENDALIAN (was 35)
    18,  // JADWAL PELAKSANAAN
    22,  // PENANGGUNGJAWAB
    6,   // P (target)
    6,   // D (target)
    10,  // BOBOT (target)
    10,  // NILAI (target)
    18,  // TINGKAT RISIKO (target)
  ];

  columnWidths.forEach((width, index) => {
    ws.getColumn(FIRST_COL + index).width = width;
  });

  if (includeWorkingPaperSections) applyWorkingPaperMetadataBlock(ws, FIRST_COL, LAST_COL);

  const H_FILL: ExcelJS.FillPattern = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9D9D9" },
  };
  const H_FONT: Partial<ExcelJS.Font> = { name: BASE_FONT_NAME, bold: true, size: 11 };
  const H_ALIGN: Partial<ExcelJS.Alignment> = { vertical: "middle", horizontal: "center", wrapText: true };

  function hCell(cell: ExcelJS.Cell, value?: string | number): void {
    if (value !== undefined) cell.value = value;
    cell.fill = H_FILL;
    cell.font = H_FONT;
    cell.alignment = H_ALIGN;
    cell.border = THIN_BORDER;
  }

  // Standalone profiles start at row 1.
  const HEADER_ROW_1 = includeWorkingPaperSections ? WORKING_PAPER_HEADER_ROW : 1;
  const HEADER_ROW_2 = HEADER_ROW_1 + 1;
  const HEADER_ROW_3 = HEADER_ROW_1 + 2;
  const DATA_START_ROW = HEADER_ROW_1 + 3;

  // ── main headers ──
  const row1 = ws.getRow(HEADER_ROW_1);
  const mainHeaders: (string | null)[] = [
    "NO",
    "UNIT KERJA PEMILIK RISIKO",
    "RISIKO",
    "KODE RISIKO",
    "P", "D", "BOBOT", "NILAI",
    "TINGKAT RISIKO",
    "PRIORITAS RISIKO",
    "URAIAN PENGENDALIAN",
    "JADWAL PELAKSANAAN",
    "PENANGGUNGJAWAB",
    "TARGET PENURUNAN RISIKO",
    null, null, null, null,
  ];
  mainHeaders.forEach((header, index) => {
    hCell(row1.getCell(FIRST_COL + index), header ?? undefined);
  });
  row1.height = HEADER_LINE_HEIGHT;

  // ── sub-headers (only under TARGET PENURUNAN RISIKO) ──
  const row2 = ws.getRow(HEADER_ROW_2);
  for (let col = FIRST_COL; col <= FIRST_COL + 12; col++) {
    hCell(row2.getCell(col));
  }
  const subHeaders = ["P", "D", "BOBOT", "NILAI", "TINGKAT RISIKO"];
  subHeaders.forEach((header, index) => {
    hCell(row2.getCell(FIRST_COL + 13 + index), header);
  });
  row2.height = HEADER_LINE_HEIGHT;

  // ── column numbers ──
  const row3 = ws.getRow(HEADER_ROW_3);
  for (let col = 0; col < COL_COUNT; col++) {
    const cell = row3.getCell(FIRST_COL + col);
    hCell(cell, col + 1);
    cell.font = DATA_FONT;
  }

  // Merges: A–M (cols 2-14) merge the two header rows vertically
  for (let col = FIRST_COL; col <= FIRST_COL + 12; col++) {
    ws.mergeCells(HEADER_ROW_1, col, HEADER_ROW_2, col);
  }
  // TARGET PENURUNAN RISIKO horizontal merge (cols 15-19)
  ws.mergeCells(HEADER_ROW_1, FIRST_COL + 13, HEADER_ROW_1, LAST_COL);

  // ── Data rows ──
  risks.forEach((risk, index) => {
    const dataRow = ws.getRow(DATA_START_ROW + index);
    const c = FIRST_COL;
    const tingkatRisiko = risk.tingkat_risiko_display ?? risk.tingkat_risiko;
    const targetTR = risk.target_tingkat_risiko_display ?? risk.target_tingkat_risiko;
    dataRow.getCell(c).value = index + 1;
    dataRow.getCell(c + 1).value = safeStr(risk.org_name);
    dataRow.getCell(c + 2).value = safeStr(risk.title);
    dataRow.getCell(c + 3).value = safeStr(risk.code);
    const nilai = risk.nilai ?? risk.inherentScore;
    dataRow.getCell(c + 4).value = safeNum(risk.probability);
    dataRow.getCell(c + 5).value = safeNum(risk.impact);
    dataRow.getCell(c + 6).value = safeNum(risk.bobot);
    dataRow.getCell(c + 7).value = safeRoundedScore(nilai);
    dataRow.getCell(c + 8).value = safeStr(tingkatRisiko);
    dataRow.getCell(c + 9).value = safeNum(risk.prioritas_risiko);
    dataRow.getCell(c + 10).value = safeStr(risk.existing_control);
    setTextCell(dataRow.getCell(c + 11), risk.jadwal_pelaksanaan);
    // Stored papers may include each owner's account role after the name.
    dataRow.getCell(c + 12).value = safeStr(risk.penanggung_jawab)
      .replace(/ \((?:superadmin|unit|reviewer|pimpinan)\)(?=,|$)/g, "");
    dataRow.getCell(c + 13).value = safeNum(risk.target_probability);
    dataRow.getCell(c + 14).value = safeNum(risk.target_impact);
    const targetNilai = risk.target_nilai ?? risk.target_score;
    dataRow.getCell(c + 15).value = safeNum(risk.target_bobot);
    dataRow.getCell(c + 16).value = safeRoundedScore(targetNilai);
    dataRow.getCell(c + 17).value = safeStr(targetTR);

    applyRiskLevelStyle(dataRow.getCell(c + 8), tingkatRisiko);
    applyRiskLevelStyle(dataRow.getCell(c + 17), targetTR);
  });

  const lastDataRow = DATA_START_ROW + risks.length - 1;
  applyDataBorders(ws, DATA_START_ROW, lastDataRow, FIRST_COL, LAST_COL);
  if (includeWorkingPaperSections) {
    const lastSigRow = appendSignatureBlock(workbook, ws, signatories, FIRST_COL, LAST_COL, lastDataRow);
    appendPetunjukPengisian(ws, lastSigRow, FIRST_COL, LAST_COL);
  }
  ws.views = [{ state: "frozen", ySplit: HEADER_ROW_3 }];
}

function buildPenilaianRisikoSheet(
  workbook: ExcelJS.Workbook,
  risks: ExportableRiskRow[],
  signatories: WorkingPaperSignatory[],
  includeWorkingPaperSections = false,
  sheetName = "KK Penilaian Risiko",
): void {
  const ws = workbook.addWorksheet(sheetName);

  const COL_COUNT = 25;
  const FIRST_COL = DATA_START_COL; // col 2 (B)
  const LAST_COL = FIRST_COL + COL_COUNT - 1; // col 26 (Z)

  ws.getColumn(1).width = 3;

  const columnWidths = [
    5,   // NO
    40,  // RISIKO (was 30)
    14,  // KODE RISIKO
    32,  // SEBAB (was 24)
    16,  // SUMBER RISIKO
    8,   // C/UC
    32,  // DAMPAK (was 24)
    35,  // URAIAN (pengendalian) (was 28)
    14,  // EFEKTIF
    14,  // TIDAK EFEKTIF
    6,   // P
    6,   // D
    10,  // BOBOT
    10,  // NILAI
    18,  // TINGKAT RISIKO
    14,  // PRIORITAS RISIKO
    22,  // SELERA RISIKO
    20,  // PILIHAN PENANGANAN
    35,  // URAIAN (RPR) (was 28)
    18,  // JADWAL PELAKSANAAN
    6,   // P (target)
    6,   // D (target)
    10,  // BOBOT (target)
    10,  // NILAI (target)
    18,  // TINGKAT RISIKO (target)
  ];

  columnWidths.forEach((width, index) => {
    ws.getColumn(FIRST_COL + index).width = width;
  });

  if (includeWorkingPaperSections) applyWorkingPaperMetadataBlock(ws, FIRST_COL, LAST_COL);

  const H_FILL: ExcelJS.FillPattern = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9D9D9" },
  };
  const H_FONT: Partial<ExcelJS.Font> = { name: BASE_FONT_NAME, bold: true, size: 11 };
  const H_ALIGN: Partial<ExcelJS.Alignment> = { vertical: "middle", horizontal: "center", wrapText: true };

  function hCell(cell: ExcelJS.Cell, value?: string | number): void {
    if (value !== undefined) cell.value = value;
    cell.fill = H_FILL;
    cell.font = H_FONT;
    cell.alignment = H_ALIGN;
    cell.border = THIN_BORDER;
  }

  const HEADER_ROW_1 = includeWorkingPaperSections ? WORKING_PAPER_HEADER_ROW : 1;
  const HEADER_ROW_2 = HEADER_ROW_1 + 1;
  const HEADER_ROW_3 = HEADER_ROW_1 + 2;
  const HEADER_ROW_4 = HEADER_ROW_1 + 3;
  const DATA_START_ROW = HEADER_ROW_1 + 4;
  const C = FIRST_COL; // shorthand

  // ── top-level group headers ──
  const row1 = ws.getRow(HEADER_ROW_1);
  hCell(row1.getCell(C), "NO");
  hCell(row1.getCell(C + 1), "IDENTIFIKASI RISIKO");
  for (let i = 2; i <= 6; i++) hCell(row1.getCell(C + i));
  hCell(row1.getCell(C + 7), "ANALISIS RISIKO");
  for (let i = 8; i <= 14; i++) hCell(row1.getCell(C + i));
  hCell(row1.getCell(C + 15), "EVALUASI RISIKO");
  hCell(row1.getCell(C + 16));
  hCell(row1.getCell(C + 17), "RENCANA PENANGANAN RISIKO (RPR)");
  for (let i = 18; i <= 19; i++) hCell(row1.getCell(C + i));
  hCell(row1.getCell(C + 20), "TARGET PENURUNAN TINGKAT RISIKO");
  for (let i = 21; i <= 24; i++) hCell(row1.getCell(C + i));
  row1.height = HEADER_LINE_HEIGHT;

  ws.mergeCells(HEADER_ROW_1, C, HEADER_ROW_3, C);           // NO spans all header rows
  ws.mergeCells(HEADER_ROW_1, C + 1, HEADER_ROW_1, C + 6);   // IDENTIFIKASI RISIKO
  ws.mergeCells(HEADER_ROW_1, C + 7, HEADER_ROW_1, C + 14);  // ANALISIS RISIKO
  ws.mergeCells(HEADER_ROW_1, C + 15, HEADER_ROW_1, C + 16); // EVALUASI RISIKO
  ws.mergeCells(HEADER_ROW_1, C + 17, HEADER_ROW_1, C + 19); // RPR
  ws.mergeCells(HEADER_ROW_1, C + 20, HEADER_ROW_1, C + 24); // TARGET PENURUNAN

  // ── sub-headers ──
  const row2 = ws.getRow(HEADER_ROW_2);
  const subHeaders: [number, string][] = [
    [1, "RISIKO"], [2, "KODE RISIKO"], [3, "SEBAB"],
    [4, "SUMBER RISIKO"], [5, "C/UC"], [6, "DAMPAK"],
    [7, "PENGENDALIAN YANG ADA"],
    [10, "P"], [11, "D"], [12, "BOBOT"], [13, "NILAI"], [14, "TINGKAT RISIKO"],
    [15, "PRIORITAS RISIKO"], [16, "SELERA RISIKO"],
    [17, "PILIHAN PENANGANAN"], [18, "URAIAN"], [19, "JADWAL PELAKSANAAN"],
    [20, "P"], [21, "D"], [22, "BOBOT"], [23, "NILAI"], [24, "TINGKAT RISIKO"],
  ];
  for (let i = 0; i < COL_COUNT; i++) hCell(row2.getCell(C + i));
  subHeaders.forEach(([offset, label]) => { row2.getCell(C + offset).value = label; });
  row2.height = HEADER_LINE_HEIGHT;

  // Vertical merges for the second and third header rows (sub-headers except PENGENDALIAN YANG ADA)
  const verticalMergeOffsets = [1,2,3,4,5,6, 10,11,12,13,14, 15,16, 17,18,19, 20,21,22,23,24];
  verticalMergeOffsets.forEach((offset) => { ws.mergeCells(HEADER_ROW_2, C + offset, HEADER_ROW_3, C + offset); });
  ws.mergeCells(HEADER_ROW_2, C + 7, HEADER_ROW_2, C + 9); // PENGENDALIAN YANG ADA spans 3 cols

  // ── sub-sub-headers (only under PENGENDALIAN YANG ADA) ──
  const row3 = ws.getRow(HEADER_ROW_3);
  for (let i = 0; i < COL_COUNT; i++) hCell(row3.getCell(C + i));
  row3.getCell(C + 7).value = "URAIAN";
  row3.getCell(C + 8).value = "EFEKTIF";
  row3.getCell(C + 9).value = "TIDAK EFEKTIF";

  // ── column numbers ──
  const row4 = ws.getRow(HEADER_ROW_4);
  for (let i = 0; i < COL_COUNT; i++) {
    const cell = row4.getCell(C + i);
    hCell(cell, i + 1);
    cell.font = DATA_FONT;
  }

  // ── Data rows ──
  risks.forEach((risk, index) => {
    const dataRow = ws.getRow(DATA_START_ROW + index);
    const eff = safeStr(risk.control_effectiveness_display ?? risk.control_effectiveness).toLowerCase();
    const tingkatRisiko = risk.tingkat_risiko_display ?? risk.tingkat_risiko;
    const targetTR = risk.target_tingkat_risiko_display ?? risk.target_tingkat_risiko;
    const riskAppetite = risk.risk_appetite_display ?? risk.risk_appetite;
    const treatmentOption = risk.treatment_option_display ?? risk.treatment_option;

    dataRow.getCell(C).value = index + 1;
    dataRow.getCell(C + 1).value = safeStr(risk.title);
    dataRow.getCell(C + 2).value = safeStr(risk.code);
    dataRow.getCell(C + 3).value = joinArray(risk.cause);
    dataRow.getCell(C + 4).value = safeStr(risk.risk_source);
    dataRow.getCell(C + 5).value = safeStr(risk.controllability);
    dataRow.getCell(C + 6).value = joinArray(risk.impact_desc);
    dataRow.getCell(C + 7).value = safeStr(risk.existing_control);
    dataRow.getCell(C + 8).value = eff.includes("efektif") && !eff.includes("tidak") ? "EFEKTIF" : "";
    dataRow.getCell(C + 9).value = eff.includes("tidak") ? "TIDAK EFEKTIF" : "";
    const nilai = risk.nilai ?? risk.inherentScore;
    dataRow.getCell(C + 10).value = safeNum(risk.probability);
    dataRow.getCell(C + 11).value = safeNum(risk.impact);
    dataRow.getCell(C + 12).value = safeNum(risk.bobot);
    dataRow.getCell(C + 13).value = safeRoundedScore(nilai);
    dataRow.getCell(C + 14).value = safeStr(tingkatRisiko);
    dataRow.getCell(C + 15).value = safeNum(risk.prioritas_risiko);
    dataRow.getCell(C + 16).value = safeStr(riskAppetite);
    dataRow.getCell(C + 17).value = safeStr(treatmentOption);
    dataRow.getCell(C + 18).value = joinArray(risk.mitigations);
    dataRow.getCell(C + 19).value = (risk.mitigation_due_dates ?? []).filter(Boolean).map((d: string) => formatDate(d)).join(", ");
    dataRow.getCell(C + 20).value = safeNum(risk.target_probability);
    dataRow.getCell(C + 21).value = safeNum(risk.target_impact);
    const targetNilai = risk.target_nilai ?? risk.target_score;
    dataRow.getCell(C + 22).value = safeNum(risk.target_bobot);
    dataRow.getCell(C + 23).value = safeRoundedScore(targetNilai);
    dataRow.getCell(C + 24).value = safeStr(targetTR);

    applyRiskLevelStyle(dataRow.getCell(C + 14), tingkatRisiko);
    applyRiskLevelStyle(dataRow.getCell(C + 24), targetTR);
  });

  const lastDataRow = DATA_START_ROW + risks.length - 1;
  applyDataBorders(ws, DATA_START_ROW, lastDataRow, FIRST_COL, LAST_COL);
  if (includeWorkingPaperSections) {
    const lastSigRow = appendSignatureBlock(workbook, ws, signatories, FIRST_COL, LAST_COL, lastDataRow);
    appendPetunjukPengisian(ws, lastSigRow, FIRST_COL, LAST_COL);
  }
  ws.views = [{ state: "frozen", ySplit: HEADER_ROW_4 }];
}

/** Reuse the exact KK Penilaian Risiko table without paper identity or signatures. */
export function addRiskAssessmentWorksheet(
  workbook: ExcelJS.Workbook,
  risks: readonly Partial<WorkingPaperRiskData>[],
  sheetName = "Risiko",
): void {
  buildPenilaianRisikoSheet(workbook, [...risks], [], false, sheetName);
}

function buildPemantauanReviuSheet(
  workbook: ExcelJS.Workbook,
  risks: WorkingPaperRiskData[],
  signatories: WorkingPaperSignatory[],
): void {
  const ws = workbook.addWorksheet("KK Pemantauan Reviu");

  const COL_COUNT = 18;
  const FIRST_COL = DATA_START_COL; // col 2 (B)
  const LAST_COL = FIRST_COL + COL_COUNT - 1; // col 17
  const C = FIRST_COL;

  ws.getColumn(1).width = 3;

  const columnWidths = [
    5,   // 1 NO
    40,  // 2 RISIKO
    14,  // 3 KODE RISIKO
    6,   // 4 P (previous)
    6,   // 5 D (previous)
    10,  // 6 BOBOT (previous)
    10,  // 7 NILAI (previous)
    18,  // 8 TINGKAT RISIKO (previous)
    14,  // 9 PRIORITAS RISIKO (previous)
    45,  // 10 URAIAN PENGENDALIAN
    18,  // 11 JADWAL PELAKSANAAN
    6,   // 12 P (monitoring)
    6,   // 13 D (monitoring)
    10,  // 14 BOBOT (monitoring)
    10,  // 15 NILAI (monitoring)
    18,  // 16 TINGKAT RISIKO (monitoring)
    12,  // 17 SIMPULAN
  ];

  columnWidths.forEach((width, index) => {
    ws.getColumn(FIRST_COL + index).width = width;
  });

  applyWorkingPaperMetadataBlock(ws, FIRST_COL, LAST_COL);

  const H_FILL: ExcelJS.FillPattern = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9D9D9" },
  };
  const H_FONT: Partial<ExcelJS.Font> = { name: BASE_FONT_NAME, bold: true, size: 11 };
  const H_ALIGN: Partial<ExcelJS.Alignment> = { vertical: "middle", horizontal: "center", wrapText: true };

  function hCell(cell: ExcelJS.Cell, value?: string | number): void {
    if (value !== undefined) cell.value = value;
    cell.fill = H_FILL;
    cell.font = H_FONT;
    cell.alignment = H_ALIGN;
    cell.border = THIN_BORDER;
  }

  const HEADER_ROW_1 = WORKING_PAPER_HEADER_ROW;
  const HEADER_ROW_2 = HEADER_ROW_1 + 1;
  const HEADER_ROW_3 = HEADER_ROW_1 + 2;
  const DATA_START_ROW = HEADER_ROW_1 + 3;

  // ── main group headers ──
  const row1 = ws.getRow(HEADER_ROW_1);
  for (let i = 0; i < COL_COUNT; i++) hCell(row1.getCell(C + i));

  // Single column headers (cols 1-11 span both header rows)
  const singleHeaders = [
    [0, "NO"],
    [1, "RISIKO"],
    [2, "KODE RISIKO"],
    [3, "P"],
    [4, "D"],
    [5, "BOBOT"],
    [6, "NILAI"],
    [7, "TINGKAT RISIKO"],
    [8, "PRIORITAS RISIKO"],
    [9, "URAIAN PENGENDALIAN"],
    [10, "JADWAL PELAKSANAAN"],
  ];
  singleHeaders.forEach(([offset, label]) => {
    row1.getCell(C + (offset as number)).value = label;
  });

  // Group headers
  row1.getCell(C + 11).value = "HASIL PEMANTAUAN";
  row1.getCell(C + 16).value = "SIMPULAN";
  row1.height = HEADER_LINE_HEIGHT;

  // Merges for the first header row
  // NO through JADWAL PELAKSANAAN (cols 1-11) span both header rows
  for (let offset = 0; offset <= 10; offset++) {
    ws.mergeCells(HEADER_ROW_1, C + offset, HEADER_ROW_2, C + offset);
  }
  // HASIL PEMANTAUAN (cols 12-16)
  ws.mergeCells(HEADER_ROW_1, C + 11, HEADER_ROW_1, C + 15);
  // ── sub-headers ──
  const row2 = ws.getRow(HEADER_ROW_2);
  for (let i = 0; i < COL_COUNT; i++) hCell(row2.getCell(C + i));

  // Sub-headers under HASIL PEMANTAUAN
  const hasilPemantauanSubs = ["P", "D", "BOBOT", "NILAI", "TINGKAT RISIKO"];
  hasilPemantauanSubs.forEach((header, index) => {
    row2.getCell(C + 11 + index).value = header;
  });

  row2.height = HEADER_LINE_HEIGHT;

  // ── column numbers ──
  const row3 = ws.getRow(HEADER_ROW_3);
  for (let i = 0; i < COL_COUNT; i++) {
    const cell = row3.getCell(C + i);
    hCell(cell, i + 1);
    cell.font = DATA_FONT;
  }

  // ── Data rows ──
  risks.forEach((risk, index) => {
    const dataRow = ws.getRow(DATA_START_ROW + index);
    const prev = risk.previous;
    const monitoringSource = risk.monitoring;

    // Baseline risk immediately before this monitoring result (cols 1-11)
    const prevProbability = monitoringSource?.sourceProbability ?? prev?.probability ?? risk.probability;
    const prevImpact = monitoringSource?.sourceImpact ?? prev?.impact ?? risk.impact;
    const prevBobot = monitoringSource?.sourceWeight ?? prev?.bobot ?? risk.bobot;
    const prevNilai = monitoringSource?.sourceNilai ?? prev?.nilai ?? prev?.inherentScore ?? risk.nilai ?? risk.inherentScore;
    const prevLevel = monitoringSource
      ? formatRiskLevelLabel(monitoringSource.sourceLevel)
      : (prev?.tingkat_risiko_display ?? prev?.tingkat_risiko ?? risk.tingkat_risiko_display ?? risk.tingkat_risiko);
    dataRow.getCell(C).value = index + 1;
    dataRow.getCell(C + 1).value = safeStr(risk.title);
    dataRow.getCell(C + 2).value = safeStr(risk.code);
    dataRow.getCell(C + 3).value = safeNum(prevProbability);
    dataRow.getCell(C + 4).value = safeNum(prevImpact);
    dataRow.getCell(C + 5).value = safeNum(prevBobot);
    dataRow.getCell(C + 6).value = safeRoundedScore(prevNilai);
    dataRow.getCell(C + 7).value = safeStr(prevLevel);
    dataRow.getCell(C + 8).value = safeNum(prev?.prioritas_risiko ?? risk.prioritas_risiko);
    dataRow.getCell(C + 9).value = safeStr(prev?.existing_control ?? risk.existing_control);
    setTextCell(dataRow.getCell(C + 10), risk.jadwal_pelaksanaan);

    // Monitoring data (cols 12-16)
    const monNilai = risk.monitoring_inherent_score ?? risk.monitoring_nilai;
    const monLevel = risk.monitoring_tingkat_risiko_display ?? risk.monitoring_tingkat_risiko;
    dataRow.getCell(C + 11).value = safeNum(risk.monitoring_p);
    dataRow.getCell(C + 12).value = safeNum(risk.monitoring_d);
    dataRow.getCell(C + 13).value = safeNum(risk.monitoring_bobot);
    dataRow.getCell(C + 14).value = safeRoundedScore(monNilai);
    dataRow.getCell(C + 15).value = safeStr(monLevel);

    // Apply risk level colors
    applyRiskLevelStyle(dataRow.getCell(C + 7), prevLevel);
    applyRiskLevelStyle(dataRow.getCell(C + 15), monLevel);
  });

  const lastDataRow = DATA_START_ROW + risks.length - 1;
  applyDataBorders(ws, DATA_START_ROW, lastDataRow, FIRST_COL, LAST_COL);
  const lastSigRow = appendSignatureBlock(workbook, ws, signatories, FIRST_COL, LAST_COL, lastDataRow);
  appendPetunjukPengisian(ws, lastSigRow, FIRST_COL, LAST_COL);
  ws.views = [{ state: "frozen", ySplit: HEADER_ROW_3 }];
}

function stripBase64Prefix(base64: string): string {
  const prefix = "data:image/png;base64,";
  if (base64.startsWith(prefix)) {
    return base64.slice(prefix.length);
  }
  return base64;
}

const PETUNJUK_PENGISIAN_ITEMS: string[] = [
  "Kolom (1) diisi dengan nomor urut",
  "Kolom (2) diisi dengan pernyataan risiko",
  "Kolom (3) diisi dengan kode risiko",
  "Kolom (4) diisi dengan tingkat probabilitas (P) kuartal sebelumnya",
  "Kolom (5) diisi dengan tingkat dampak (D) kuartal sebelumnya",
  "Kolom (6) diisi dengan nilai bobot kuartal sebelumnya",
  "Kolom (7) diisi dengan nilai atau skor risiko kuartal sebelumnya",
  "Kolom (8) diisi dengan tingkat risiko kuartal sebelumnya",
  "Kolom (9) diisi dengan prioritas risiko kuartal sebelumnya",
  "Kolom (10) diisi dengan uraian pengendalian yang ada kuartal sebelumnya",
  "Kolom (11) diisi dengan jadwal pelaksanaan",
  "Kolom (12) diisi dengan tingkat probabilitas (P) hasil pemantauan",
  "Kolom (13) diisi dengan tingkat dampak (D) hasil pemantauan",
  "Kolom (14) diisi dengan nilai bobot hasil pemantauan",
  "Kolom (15) diisi dengan nilai atau skor risiko hasil pemantauan",
  "Kolom (16) diisi dengan tingkat risiko hasil pemantauan",
  "Kolom (17) diisi dengan simpulan tingkat risiko",
  "Kolom (18) diisi dengan efektifitas pengendalian",
];

/** Append petunjuk pengisian below the signature block. Columns are 1-based startCol..endCol. */
function appendPetunjukPengisian(
  ws: ExcelJS.Worksheet,
  afterRow: number,
  startCol: number,
  endCol: number,
): void {
  const titleRow = afterRow + 3;
  const petunjukFont: Partial<ExcelJS.Font> = { name: BASE_FONT_NAME, size: 11 };
  const petunjukBoldFont: Partial<ExcelJS.Font> = { ...petunjukFont, bold: true };

  if (endCol > startCol) {
    ws.mergeCells(titleRow, startCol, titleRow, endCol);
  }
  const titleCell = ws.getRow(titleRow).getCell(startCol);
  titleCell.value = "Petunjuk Pengisian :";
  titleCell.font = petunjukBoldFont;
  titleCell.alignment = { vertical: "top" };

  PETUNJUK_PENGISIAN_ITEMS.forEach((text, index) => {
    const rowNum = titleRow + 1 + index;
    if (endCol > startCol) {
      ws.mergeCells(rowNum, startCol, rowNum, endCol);
    }
    const cell = ws.getRow(rowNum).getCell(startCol);
    cell.value = `${index + 1}.\t${text}`;
    cell.font = petunjukFont;
    cell.alignment = { vertical: "top", wrapText: true };
  });
}

function centeredSignatureImageAnchor(
  startCol: number,
  row: number,
  columnWidths: readonly number[],
  imageSizePx: number,
): ExcelJS.IAnchor {
  const pixelsPerColumnWidthUnit = 8;
  const emusPerPixel = 9525;
  const widthsPx = columnWidths.map((width) => width * pixelsPerColumnWidthUnit);
  const blockWidthPx = widthsPx.reduce((total, width) => total + width, 0);
  let leftOffsetPx = Math.max(0, (blockWidthPx - imageSizePx) / 2);
  let column = 0;
  while (column < widthsPx.length - 1 && leftOffsetPx >= widthsPx[column]) {
    leftOffsetPx -= widthsPx[column];
    column++;
  }

  const nativeCol = startCol - 1 + column;
  const nativeRow = row - 1;
  // Excel's drawing anchor stores offsets in EMUs.
  return {
    col: nativeCol,
    row: nativeRow,
    nativeCol,
    nativeColOff: Math.round(leftOffsetPx * emusPerPixel),
    nativeRow,
    nativeRowOff: 0,
  };
}

/**
 * Append signature block below data.
 * startCol/endCol are 1-based column numbers defining the data range.
 */
function appendSignatureBlock(
  workbook: ExcelJS.Workbook,
  ws: ExcelJS.Worksheet,
  signatories: WorkingPaperSignatory[],
  startCol: number,
  endCol: number,
  afterRow: number,
): number {
  if (signatories.length === 0) return afterRow;

  const sorted = [...signatories].sort((a, b) => a.sequence_no - b.sequence_no);
  const sigFont: Partial<ExcelJS.Font> = { name: BASE_FONT_NAME, size: 11 };
  const sigAlignment: Partial<ExcelJS.Alignment> = {
    horizontal: "center",
    vertical: "middle",
    shrinkToFit: true,
  };
  const qrSizePx = 75;
  const rowsPerBand = 8;
  const firstSignatureRow = afterRow + 3;
  const columnWidths = Array.from(
    { length: endCol - startCol + 1 },
    (_, offset) => ws.getColumn(startCol + offset).width ?? ws.properties.defaultColWidth ?? 8.43,
  );
  const layouts = buildWorkingPaperSignatureLayout(startCol, columnWidths, sorted.length);

  for (const [index, sig] of sorted.entries()) {
    const { startCol: signerCol, endCol: signerEndCol, band } = layouts[index];
    const roleRow = firstSignatureRow + band * rowsPerBand;
    const qrRow = roleRow + 2;
    const nameRow = roleRow + 4;
    const nipRow = roleRow + 5;

    const details = [
      { row: roleRow, value: sig.signer_jabatan, font: sigFont },
      { row: nameRow, value: sig.signer_name, font: { ...sigFont, underline: true } },
      { row: nipRow, value: `NIP. ${sig.signer_nip ?? ""}`, font: sigFont },
    ];
    for (const { row, value, font } of details) {
      if (signerEndCol > signerCol) ws.mergeCells(row, signerCol, row, signerEndCol);
      const cell = ws.getCell(row, signerCol);
      cell.value = value;
      cell.font = font;
      cell.alignment = sigAlignment;
    }

    if (sig.status === "signed" && sig.qr_code_png) {
      const imageId = workbook.addImage({
        base64: stripBase64Prefix(sig.qr_code_png),
        extension: "png",
      });
      ws.addImage(imageId, {
        tl: centeredSignatureImageAnchor(
          signerCol,
          qrRow,
          columnWidths.slice(signerCol - startCol, signerEndCol - startCol + 1),
          qrSizePx,
        ),
        ext: { width: qrSizePx, height: qrSizePx },
        editAs: "oneCell",
      });
    }
  }

  const lastSignatureRow = firstSignatureRow + layouts[layouts.length - 1].band * rowsPerBand;
  for (let row = firstSignatureRow; row <= lastSignatureRow; row += rowsPerBand) {
    ws.getRow(row + 1).height = 8;
    ws.getRow(row + 2).height = qrSizePx * 72 / 96;
    ws.getRow(row + 3).height = 8;
  }
  return lastSignatureRow + 5;
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
  const buffer = await createWorkingPaperWorkbookBuffer(workingPaper);
  const filename = `Kertas_Kerja_${sanitizeFilename(workingPaper.title)}_${todayDateString()}.xlsx`;

  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}

export async function createWorkingPaperWorkbookBuffer(workingPaper: WorkingPaper): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const risks = getWorkingPaperRiskRows(workingPaper);
  const profileRows = risks.map(r => getProfileRow(r));
  const signatories = workingPaper.signatories;

  buildProfilRisikoSheet(workbook, profileRows, signatories, true);
  buildPenilaianRisikoSheet(workbook, profileRows, signatories, true);
  buildPemantauanReviuSheet(workbook, risks, signatories);

  return workbook.xlsx.writeBuffer();
}

/** The register uses the same profile table as working papers, without document metadata. */
export async function createRiskProfileWorkbookBuffer(
  risks: WorkingPaperRiskData[],
): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  buildProfilRisikoSheet(workbook, risks, []);
  return workbook.xlsx.writeBuffer();
}

export async function exportRiskProfile(risks: WorkingPaperRiskData[], cycle: string): Promise<void> {
  const buffer = await createRiskProfileWorkbookBuffer(risks);
  downloadBlob(new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }), `Profil_Risiko_${sanitizeFilename(cycle || "Semua_Periode")}_${todayDateString()}.xlsx`);
}
