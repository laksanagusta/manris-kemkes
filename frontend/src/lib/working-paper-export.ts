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
 * For sheets 1 & 2, use previous semester data if available.
 * Falls back to current risk data otherwise.
 * Also remaps display labels for human-readable values.
 */
function getProfileRow(risk: WorkingPaperRiskData): ExportableRiskRow {
  const prev = risk.previous;
  const src = prev ?? risk;
  return {
    ...risk,
    // Inherent scores — prefer previous snapshot
    probability: src.probability ?? risk.probability,
    impact: src.impact ?? risk.impact,
    bobot: src.bobot ?? risk.bobot,
    nilai: src.inherentScore ?? src.nilai ?? risk.inherentScore ?? risk.nilai,
    tingkat_risiko: src === prev ? (prev.tingkat_risiko_display ?? prev.tingkat_risiko) : (risk.tingkat_risiko_display ?? risk.tingkat_risiko),
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
    mitigations: src.mitigations ?? risk.mitigations,
    mitigation_due_dates: src.mitigation_due_dates ?? risk.mitigation_due_dates,
    mitigation_details: src.mitigation_details ?? risk.mitigation_details,
    // Target scores — prefer previous snapshot
    target_probability: src.target_probability ?? risk.target_probability,
    target_impact: src.target_impact ?? risk.target_impact,
    target_bobot: src.target_bobot ?? risk.target_bobot,
    target_nilai: src.target_score ?? src.target_nilai ?? risk.target_score ?? risk.target_nilai,
    target_tingkat_risiko: src === prev ? (prev.target_tingkat_risiko_display ?? prev.target_tingkat_risiko) : (risk.target_tingkat_risiko_display ?? risk.target_tingkat_risiko),
  };
}

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

type WorkingPaperSheetMetadata = {
  objective: string;
  target: string;
  keyIndicator: string;
  targetValue: string;
  program: string;
  activity: string;
  riskOwnerUnit: string;
  riskOwnerName: string;
  riskManagementTeam: string;
  assessmentDate: string;
  riskPeriod: string;
  riskUpdateDate: string;
};

const DEFAULT_WORKING_PAPER_METADATA = {
  objective:
    "Terwujudnya Alat Angkut, Orang, Barang, dan Lingkungan yang bebas dari Penyakit Menular dan Faktor Risiko Kesehatan",
  target:
    "(1) Meningkatnya Pelayanan Kekarantinaan di Pintu Masuk Negara dan Wilayah\n\n(2) Meningkatnya Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya pada Program Penanggulangan Penyakit",
  keyIndicator:
    "(1) Pintu Masuk yang melaksanakan deteksi penyakit dan faktor risiko kesehatan berpotensi KLB/Wabah dengan Target 76%\n(2) Nilai Maturitas Manajemen Risiko dengan Target Nilai 4",
  targetValue: "76% untuk indikator 1 dan Nilai 4 indikator 2",
  program:
    "Persentase Faktor Risiko Penyakit di Pintu Masuk Negara yang dikendalikan\nNilai Maturitas Sistem Pengendalian Intern Pemerintah Terintegrasi (SPIPT)",
  activity:
    "Pelaksanaan surveilans dan deteksi dini penyakit dan faktor risiko kesehatan berpotensi KLB/Wabah di pintu masuk sesuai standar",
  riskManagementTeam:
    "Para Ketua Tim Kerja 1,2,3,4, Bendahara Penerimaan, Bendahara Pengeluaran, dan TIM SKI",
  riskUpdateDate: "-",
} as const;

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

function estimateRowHeight(worksheet: ExcelJS.Worksheet, rowNum: number, startCol: number, endCol: number): number {
  const row = worksheet.getRow(rowNum);
  let maxLines = 1;
  for (let c = startCol; c <= endCol; c++) {
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

function formatMitigationNarrative(risk: ExportableRiskRow): string {
  const detailBlocks = (risk.mitigation_details as string[] | undefined)?.filter(Boolean) ?? [];
  if (detailBlocks.length > 0) {
    return detailBlocks.join("\n\n");
  }
  return joinArray(risk.mitigations as string[] | undefined);
}

function safeStr(value: string | undefined | null): string {
  return value ?? "";
}

function safeNum(value: number | undefined | null): number | string {
  return value ?? "";
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

function formatLongDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(date);
  } catch {
    return dateStr;
  }
}

function getRiskPeriodLabel(assessmentCycle: string | undefined | null, createdAt: string | undefined | null): string {
  const createdDate = createdAt ? new Date(createdAt) : null;
  const createdValid = createdDate && !Number.isNaN(createdDate.getTime()) ? createdDate : null;
  const match = (assessmentCycle ?? "").trim().match(/^(\d{4})-H([12])$/i);
  if (!match) return "-";

  const year = Number(match[1]);
  const half = match[2];
  const fallbackStartMonth = half === "1" ? 0 : 6;
  const endMonth = half === "1" ? 5 : 11;
  const startMonth = createdValid && createdValid.getUTCFullYear() === year
    ? Math.min(Math.max(createdValid.getUTCMonth(), fallbackStartMonth), endMonth)
    : fallbackStartMonth;

  const startLabel = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, startMonth, 1)));
  const endLabel = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, endMonth, 1)));

  return `${startLabel} s/d ${endLabel} ${year}`;
}

function buildSheetMetadata(workingPaper: WorkingPaper, risks: WorkingPaperRiskData[]): WorkingPaperSheetMetadata {
  const primaryOrgName = risks.find((risk) => safeStr(risk.org_name).trim().length > 0)?.org_name
    ?? "";
  const riskOwnerName = primaryOrgName.toLowerCase().startsWith("kepala ")
    ? primaryOrgName
    : primaryOrgName
      ? `Kepala ${primaryOrgName}`
      : "Kepala";

  return {
    ...DEFAULT_WORKING_PAPER_METADATA,
    riskOwnerUnit: primaryOrgName,
    riskOwnerName,
    assessmentDate: formatLongDate(workingPaper.created_at),
    riskPeriod: getRiskPeriodLabel(workingPaper.assessment_cycle, workingPaper.created_at),
  };
}

function applyWorkingPaperMetadataBlock(
  ws: ExcelJS.Worksheet,
  firstCol: number,
  lastCol: number,
  metadata: WorkingPaperSheetMetadata,
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
    leftLabel?: string;
    leftValue?: string;
    rightLabel?: string;
    rightValue?: string;
    leftHeight?: number;
    rightAlign?: Partial<ExcelJS.Alignment>;
  }> = [
    {
      row: 4,
      leftLabel: "Tujuan  * :",
      leftValue: metadata.objective,
      rightLabel: "Unit Pemilik Risiko  * :",
      rightValue: `${metadata.riskOwnerUnit} * :`,
      leftHeight: 54,
      rightAlign: centerValueAlign,
    },
    {
      row: 5,
      leftLabel: "Sasaran * :",
      leftValue: metadata.target,
      rightLabel: "Nama Pemilik Risiko * :",
      rightValue: `${metadata.riskOwnerName} * :`,
      leftHeight: 60,
      rightAlign: centerValueAlign,
    },
    {
      row: 7,
      leftLabel: "Indikator Kinerja Utama * :",
      leftValue: metadata.keyIndicator,
      rightLabel: "Nama Tim Pengelola Risiko * :",
      rightValue: `${metadata.riskManagementTeam} * :`,
      leftHeight: 60,
      rightAlign: centerValueAlign,
    },
    {
      row: 9,
      leftLabel: "Target * :",
      leftValue: metadata.targetValue,
      rightLabel: "Tgl Penilaian Risiko * :",
      rightValue: `${metadata.assessmentDate} * :`,
      rightAlign: centerValueAlign,
    },
    {
      row: 10,
      leftLabel: "Program * :",
      leftValue: metadata.program,
      rightLabel: "Periode Risiko * :",
      rightValue: `${metadata.riskPeriod} * :`,
      leftHeight: 48,
      rightAlign: centerValueAlign,
    },
    {
      row: 11,
      leftLabel: "Kegiatan * :",
      leftValue: metadata.activity,
      rightLabel: "Tgl Update Risiko * :",
      rightValue: `${metadata.riskUpdateDate} * :`,
      leftHeight: 42,
      rightAlign: centerValueAlign,
    },
  ];

  rows.forEach(({ row, leftLabel, leftValue, rightLabel, rightValue, leftHeight, rightAlign }) => {
    const rowRef = ws.getRow(row);
    if (leftHeight) rowRef.height = leftHeight;

    ws.mergeCells(row, leftLabelCol, row, leftLabelEndCol);
    const leftLabelCell = ws.getCell(row, leftLabelCol);
    leftLabelCell.value = leftLabel;
    leftLabelCell.font = labelFont;
    leftLabelCell.alignment = labelAlign;

    ws.mergeCells(row, leftValueStartCol, row, leftValueEndCol);
    const leftValueCell = ws.getCell(row, leftValueStartCol);
    leftValueCell.value = leftValue;
    leftValueCell.font = valueFont;
    leftValueCell.alignment = leftValueAlign;

    ws.mergeCells(row, rightLabelCol, row, rightLabelEndCol);
    const rightLabelCell = ws.getCell(row, rightLabelCol);
    rightLabelCell.value = rightLabel;
    rightLabelCell.font = labelFont;
    rightLabelCell.alignment = labelAlign;

    ws.mergeCells(row, rightValueStartCol, row, rightValueEndCol);
    const rightValueCell = ws.getCell(row, rightValueStartCol);
    rightValueCell.value = rightValue;
    rightValueCell.font = valueFont;
    rightValueCell.alignment = rightAlign ?? leftValueAlign;
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
    row.font = DATA_FONT;
    row.height = estimateRowHeight(worksheet, r, startCol, endCol);
    for (let c = startCol; c <= endCol; c++) {
      row.getCell(c).border = THIN_BORDER;
    }
  }
}

// ── Column B offset constant ──
// All 3 data sheets start data at column B (col 2). Column A is an empty margin.
const DATA_START_COL = 2;

function buildProfilRisikoSheet(
  workbook: ExcelJS.Workbook,
  risks: ExportableRiskRow[],
  signatories: WorkingPaperSignatory[],
  metadata: WorkingPaperSheetMetadata,
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

  applyWorkingPaperMetadataBlock(ws, FIRST_COL, LAST_COL, metadata);

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

  // Rows 1-12 reserved. Headers start at row 13.
  const HEADER_ROW_1 = 13;
  const HEADER_ROW_2 = 14;
  const HEADER_ROW_3 = 15;
  const DATA_START_ROW = 16;

  // ── Row 13: main headers ──
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
  row1.height = 32;

  // ── Row 14: sub-headers (only under TARGET PENURUNAN RISIKO) ──
  const row2 = ws.getRow(HEADER_ROW_2);
  for (let col = FIRST_COL; col <= FIRST_COL + 12; col++) {
    hCell(row2.getCell(col));
  }
  const subHeaders = ["P", "D", "BOBOT", "NILAI", "TINGKAT RISIKO"];
  subHeaders.forEach((header, index) => {
    hCell(row2.getCell(FIRST_COL + 13 + index), header);
  });
  row2.height = 24;

  // ── Row 15: column numbers ──
  const row3 = ws.getRow(HEADER_ROW_3);
  for (let col = 0; col < COL_COUNT; col++) {
    hCell(row3.getCell(FIRST_COL + col), col + 1);
  }
  row3.height = 20;

  // Merges: A–M (cols 2-14) merge rows 13-14 vertically
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
    const nilai = risk.inherentScore ?? risk.nilai;
    dataRow.getCell(c + 4).value = safeNum(risk.probability);
    dataRow.getCell(c + 5).value = safeNum(risk.impact);
    dataRow.getCell(c + 6).value = safeNum(risk.bobot);
    dataRow.getCell(c + 7).value = safeNum(nilai);
    dataRow.getCell(c + 8).value = safeStr(tingkatRisiko);
    dataRow.getCell(c + 9).value = safeNum(risk.prioritas_risiko);
    dataRow.getCell(c + 10).value = safeStr(risk.existing_control);
    setTextCell(dataRow.getCell(c + 11), risk.jadwal_pelaksanaan);
    dataRow.getCell(c + 12).value = safeStr(risk.penanggung_jawab);
    dataRow.getCell(c + 13).value = safeNum(risk.target_probability);
    dataRow.getCell(c + 14).value = safeNum(risk.target_impact);
    const targetNilai = risk.target_score ?? risk.target_nilai;
    dataRow.getCell(c + 15).value = safeNum(risk.target_bobot);
    dataRow.getCell(c + 16).value = safeNum(targetNilai);
    dataRow.getCell(c + 17).value = safeStr(targetTR);

    applyNilaiStyle(dataRow.getCell(c + 16), targetNilai);
    applyRiskLevelStyle(dataRow.getCell(c + 17), risk.target_tingkat_risiko);
  });

  const lastDataRow = DATA_START_ROW + risks.length - 1;
  applyDataBorders(ws, DATA_START_ROW, lastDataRow, FIRST_COL, LAST_COL);
  const lastSigRow = appendSignatureBlock(workbook, ws, signatories, FIRST_COL, LAST_COL, lastDataRow);
  appendPetunjukPengisian(ws, lastSigRow, FIRST_COL, LAST_COL);
  ws.views = [{ state: "frozen", ySplit: HEADER_ROW_3 }];
}

function buildPenilaianRisikoSheet(
  workbook: ExcelJS.Workbook,
  risks: ExportableRiskRow[],
  signatories: WorkingPaperSignatory[],
  metadata: WorkingPaperSheetMetadata,
): void {
  const ws = workbook.addWorksheet("KK Penilaian Risiko");

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

  applyWorkingPaperMetadataBlock(ws, FIRST_COL, LAST_COL, metadata);

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

  const HEADER_ROW_1 = 13;
  const HEADER_ROW_2 = 14;
  const HEADER_ROW_3 = 15;
  const HEADER_ROW_4 = 16;
  const DATA_START_ROW = 17;
  const C = FIRST_COL; // shorthand

  // ── Row 13: top-level group headers ──
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
  row1.height = 28;

  ws.mergeCells(HEADER_ROW_1, C, HEADER_ROW_3, C);           // NO spans rows 13-15
  ws.mergeCells(HEADER_ROW_1, C + 1, HEADER_ROW_1, C + 6);   // IDENTIFIKASI RISIKO
  ws.mergeCells(HEADER_ROW_1, C + 7, HEADER_ROW_1, C + 14);  // ANALISIS RISIKO
  ws.mergeCells(HEADER_ROW_1, C + 15, HEADER_ROW_1, C + 16); // EVALUASI RISIKO
  ws.mergeCells(HEADER_ROW_1, C + 17, HEADER_ROW_1, C + 19); // RPR
  ws.mergeCells(HEADER_ROW_1, C + 20, HEADER_ROW_1, C + 24); // TARGET PENURUNAN

  // ── Row 14: sub-headers ──
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
  row2.height = 28;

  // Vertical merges for row 14-15 (sub-headers except PENGENDALIAN YANG ADA)
  const verticalMergeOffsets = [1,2,3,4,5,6, 10,11,12,13,14, 15,16, 17,18,19, 20,21,22,23,24];
  verticalMergeOffsets.forEach((offset) => { ws.mergeCells(HEADER_ROW_2, C + offset, HEADER_ROW_3, C + offset); });
  ws.mergeCells(HEADER_ROW_2, C + 7, HEADER_ROW_2, C + 9); // PENGENDALIAN YANG ADA spans 3 cols

  // ── Row 15: sub-sub-headers (only under PENGENDALIAN YANG ADA) ──
  const row3 = ws.getRow(HEADER_ROW_3);
  for (let i = 0; i < COL_COUNT; i++) hCell(row3.getCell(C + i));
  row3.getCell(C + 7).value = "URAIAN";
  row3.getCell(C + 8).value = "EFEKTIF";
  row3.getCell(C + 9).value = "TIDAK EFEKTIF";
  row3.height = 24;

  // ── Row 16: column numbers ──
  const row4 = ws.getRow(HEADER_ROW_4);
  for (let i = 0; i < COL_COUNT; i++) {
    hCell(row4.getCell(C + i), i + 1);
  }
  row4.height = 20;

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
    const nilai = risk.inherentScore ?? risk.nilai;
    dataRow.getCell(C + 10).value = safeNum(risk.probability);
    dataRow.getCell(C + 11).value = safeNum(risk.impact);
    dataRow.getCell(C + 12).value = safeNum(risk.bobot);
    dataRow.getCell(C + 13).value = safeNum(nilai);
    dataRow.getCell(C + 14).value = safeStr(tingkatRisiko);
    dataRow.getCell(C + 15).value = safeNum(risk.prioritas_risiko);
    dataRow.getCell(C + 16).value = safeStr(riskAppetite);
    dataRow.getCell(C + 17).value = safeStr(treatmentOption);
    dataRow.getCell(C + 18).value = formatMitigationNarrative(risk);
    dataRow.getCell(C + 19).value = (risk.mitigation_due_dates ?? []).filter(Boolean).map((d: string) => formatDate(d)).join(", ");
    dataRow.getCell(C + 20).value = safeNum(risk.target_probability);
    dataRow.getCell(C + 21).value = safeNum(risk.target_impact);
    const targetNilai = risk.target_score ?? risk.target_nilai;
    dataRow.getCell(C + 22).value = safeNum(risk.target_bobot);
    dataRow.getCell(C + 23).value = safeNum(targetNilai);
    dataRow.getCell(C + 24).value = safeStr(targetTR);

    applyNilaiStyle(dataRow.getCell(C + 23), targetNilai);
    applyRiskLevelStyle(dataRow.getCell(C + 24), risk.target_tingkat_risiko);
  });

  const lastDataRow = DATA_START_ROW + risks.length - 1;
  applyDataBorders(ws, DATA_START_ROW, lastDataRow, FIRST_COL, LAST_COL);
  const lastSigRow = appendSignatureBlock(workbook, ws, signatories, FIRST_COL, LAST_COL, lastDataRow);
  appendPetunjukPengisian(ws, lastSigRow, FIRST_COL, LAST_COL);
  ws.views = [{ state: "frozen", ySplit: HEADER_ROW_4 }];
}

function buildPemantauanReviuSheet(
  workbook: ExcelJS.Workbook,
  risks: WorkingPaperRiskData[],
  signatories: WorkingPaperSignatory[],
  metadata: WorkingPaperSheetMetadata,
): void {
  const ws = workbook.addWorksheet("KK Pemantauan Reviu");

  const COL_COUNT = 18;
  const FIRST_COL = DATA_START_COL; // col 2 (B)
  const LAST_COL = FIRST_COL + COL_COUNT - 1; // col 19
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
    35,  // 17 TINGKAT RISIKO (simpulan)
    16,  // 18 EFEKTIFITAS
  ];

  columnWidths.forEach((width, index) => {
    ws.getColumn(FIRST_COL + index).width = width;
  });

  applyWorkingPaperMetadataBlock(ws, FIRST_COL, LAST_COL, metadata);

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

  const HEADER_ROW_1 = 13;
  const HEADER_ROW_2 = 14;
  const HEADER_ROW_3 = 15;
  const DATA_START_ROW = 16;

  // ── Row 13: main group headers ──
  const row1 = ws.getRow(HEADER_ROW_1);
  for (let i = 0; i < COL_COUNT; i++) hCell(row1.getCell(C + i));

  // Single column headers (cols 1-11 span rows 13-14)
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
  row1.height = 32;

  // Merges for row 13
  // NO through JADWAL PELAKSANAAN (cols 1-11) span rows 13-14
  for (let offset = 0; offset <= 10; offset++) {
    ws.mergeCells(HEADER_ROW_1, C + offset, HEADER_ROW_2, C + offset);
  }
  // HASIL PEMANTAUAN (cols 12-16)
  ws.mergeCells(HEADER_ROW_1, C + 11, HEADER_ROW_1, C + 15);
  // SIMPULAN (cols 17-18)
  ws.mergeCells(HEADER_ROW_1, C + 16, HEADER_ROW_1, C + 17);

  // ── Row 14: sub-headers ──
  const row2 = ws.getRow(HEADER_ROW_2);
  for (let i = 0; i < COL_COUNT; i++) hCell(row2.getCell(C + i));

  // Sub-headers under HASIL PEMANTAUAN
  const hasilPemantauanSubs = ["P", "D", "BOBOT", "NILAI", "TINGKAT RISIKO"];
  hasilPemantauanSubs.forEach((header, index) => {
    row2.getCell(C + 11 + index).value = header;
  });

  // Sub-headers under SIMPULAN
  row2.getCell(C + 16).value = "TINGKAT RISIKO";
  row2.getCell(C + 17).value = "EFEKTIFITAS";

  row2.height = 28;

  // ── Row 15: column numbers ──
  const row3 = ws.getRow(HEADER_ROW_3);
  for (let i = 0; i < COL_COUNT; i++) {
    hCell(row3.getCell(C + i), i + 1);
  }
  row3.height = 20;

  // ── Data rows ──
  risks.forEach((risk, index) => {
    const dataRow = ws.getRow(DATA_START_ROW + index);
    const prev = risk.previous;

    // Previous semester data (cols 1-11)
    const prevNilai = prev?.inherentScore ?? prev?.nilai ?? risk.inherentScore ?? risk.nilai;
    dataRow.getCell(C).value = index + 1;
    dataRow.getCell(C + 1).value = safeStr(risk.title);
    dataRow.getCell(C + 2).value = safeStr(risk.code);
    dataRow.getCell(C + 3).value = safeNum(prev?.probability ?? risk.probability);
    dataRow.getCell(C + 4).value = safeNum(prev?.impact ?? risk.impact);
    dataRow.getCell(C + 5).value = safeNum(prev?.bobot ?? risk.bobot);
    dataRow.getCell(C + 6).value = safeNum(prevNilai);
    dataRow.getCell(C + 7).value = safeStr(prev?.tingkat_risiko_display ?? prev?.tingkat_risiko ?? risk.tingkat_risiko_display ?? risk.tingkat_risiko);
    dataRow.getCell(C + 8).value = safeNum(prev?.prioritas_risiko ?? risk.prioritas_risiko);
    dataRow.getCell(C + 9).value = safeStr(prev?.existing_control ?? risk.existing_control);
    setTextCell(dataRow.getCell(C + 10), risk.jadwal_pelaksanaan);

    // Monitoring data (cols 12-16)
    const monNilai = risk.monitoring_inherent_score ?? risk.monitoring_nilai;
    dataRow.getCell(C + 11).value = safeNum(risk.monitoring_p);
    dataRow.getCell(C + 12).value = safeNum(risk.monitoring_d);
    dataRow.getCell(C + 13).value = safeNum(risk.monitoring_bobot);
    dataRow.getCell(C + 14).value = safeNum(monNilai);
    dataRow.getCell(C + 15).value = safeStr(risk.monitoring_tingkat_risiko_display ?? risk.monitoring_tingkat_risiko);

    // Simpulan (cols 17-18)
    dataRow.getCell(C + 16).value = safeStr(risk.monitoring_simpulan);
    dataRow.getCell(C + 17).value = safeStr(risk.monitoring_efektivitas);

    // Apply risk level colors
    applyNilaiStyle(dataRow.getCell(C + 6), prevNilai);
    applyRiskLevelStyle(dataRow.getCell(C + 7), prev?.tingkat_risiko ?? risk.tingkat_risiko);
    applyNilaiStyle(dataRow.getCell(C + 14), monNilai);
    applyRiskLevelStyle(dataRow.getCell(C + 15), risk.monitoring_tingkat_risiko);
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

function buildTandaTanganSheet(
  workbook: ExcelJS.Workbook,
  workingPaper: WorkingPaper,
): void {
  const ws = workbook.addWorksheet("Tanda Tangan");
  const signatories = workingPaper.signatories;

  ws.mergeCells("A1:H1");
  const hashCell = ws.getCell("A1");
  hashCell.value = `Document Hash: ${workingPaper.document_hash ?? "-"}`;
  hashCell.font = { name: BASE_FONT_NAME, bold: true, size: 11 };
  hashCell.alignment = { vertical: "middle" };
  ws.getRow(1).height = 24;

  const headerColumns = [
    { header: "Urutan", width: 9 },
    { header: "Nama", width: 24 },
    { header: "NIP", width: 22 },
    { header: "Jabatan", width: 28 },
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
    row.getCell(4).value = safeStr(sig.signer_jabatan);
    row.getCell(5).value = sig.signer_pangkat;
    row.getCell(6).value = workingPaper.tte_skipped ? "(Dilewati)" : sig.status === "signed" ? "Ditandatangani" : "Menunggu";
    row.getCell(7).value = formatDate(sig.signed_at);
    row.getCell(8).value = "";

    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c);
      cell.border = THIN_BORDER;
      cell.alignment = WRAP_ALIGNMENT;
    }

    if (!workingPaper.tte_skipped && sig.status === "signed" && sig.qr_code_png) {
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
  ws.mergeCells(`A${footerRowNum}:H${footerRowNum}`);
  const footerCell = ws.getCell(`A${footerRowNum}`);
  footerCell.value = workingPaper.tte_skipped
    ? "Kertas kerja ini selesai tanpa tanda tangan elektronik (TTE dilewati)"
    : "Dokumen ini ditandatangani secara elektronik melalui Manris";
  footerCell.font = { name: BASE_FONT_NAME, italic: true, size: 10, color: { argb: "FF666666" } };
  footerCell.alignment = { horizontal: "center", vertical: "middle" };
}

const PETUNJUK_PENGISIAN_ITEMS: string[] = [
  "Kolom (1) diisi dengan nomor urut",
  "Kolom (2) diisi dengan pernyataan risiko",
  "Kolom (3) diisi dengan kode risiko",
  "Kolom (4) diisi dengan tingkat probabilitas (P) semester sebelumnya",
  "Kolom (5) diisi dengan tingkat dampak (D) semester sebelumnya",
  "Kolom (6) diisi dengan nilai bobot semester sebelumnya",
  "Kolom (7) diisi dengan nilai atau skor risiko semester sebelumnya",
  "Kolom (8) diisi dengan tingkat risiko semester sebelumnya",
  "Kolom (9) diisi dengan prioritas risiko semester sebelumnya",
  "Kolom (10) diisi dengan uraian pengendalian yang ada semester sebelumnya",
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
  const n = sorted.length;
  const sigFont: Partial<ExcelJS.Font> = { name: BASE_FONT_NAME, size: 11 };
  const centerAlign: Partial<ExcelJS.Alignment> = { horizontal: "center", vertical: "middle", wrapText: true };

  const jabatanRow = afterRow + 3;
  const namaRow = jabatanRow + 4;
  const nipRow = namaRow + 1;

  const QR_SIZE = 75;
  const GAP_ROW_HEIGHT = 28;
  const GAP_ROW_COUNT = 3;
  const PT_TO_PX = 1.333;
  const DEFAULT_COL_WIDTH = 8.43;
  const PX_PER_CHAR = 7.5;
  const gapHeightPx = GAP_ROW_COUNT * GAP_ROW_HEIGHT * PT_TO_PX;

  for (let r = jabatanRow + 1; r <= jabatanRow + GAP_ROW_COUNT; r++) {
    ws.getRow(r).height = GAP_ROW_HEIGHT;
  }

  const columnWidths = new Map<number, number>();
  for (let c = 1; c <= endCol; c++) {
    columnWidths.set(c, ws.getColumn(c).width ?? DEFAULT_COL_WIDTH);
  }
  const signatureLayout = buildWorkingPaperSignatureLayout({
    startCol,
    endCol,
    signatureCount: n,
    columnWidths,
    qrSizePx: QR_SIZE,
    pxPerColumnWidthUnit: PX_PER_CHAR,
  });

  sorted.forEach((sig, index) => {
    const layout = signatureLayout[index];
    const sigStartCol = layout.textStartCol;
    const sigEndCol = layout.textEndCol;

    if (sigEndCol > sigStartCol) {
      ws.mergeCells(jabatanRow, sigStartCol, jabatanRow, sigEndCol);
      ws.mergeCells(namaRow, sigStartCol, namaRow, sigEndCol);
      ws.mergeCells(nipRow, sigStartCol, nipRow, sigEndCol);
    }

    const jabatanCell = ws.getRow(jabatanRow).getCell(sigStartCol);
    jabatanCell.value = sig.signer_jabatan;
    jabatanCell.font = sigFont;
    jabatanCell.alignment = centerAlign;

    const namaCell = ws.getRow(namaRow).getCell(sigStartCol);
    namaCell.value = sig.signer_name;
    namaCell.font = { ...sigFont, underline: true };
    namaCell.alignment = centerAlign;

    const nipCell = ws.getRow(nipRow).getCell(sigStartCol);
    nipCell.value = `NIP. ${sig.signer_nip ?? ""}`;
    nipCell.font = sigFont;
    nipCell.alignment = centerAlign;

    if (sig.status === "signed" && sig.qr_code_png) {
      const imageId = workbook.addImage({
        base64: stripBase64Prefix(sig.qr_code_png),
        extension: "png",
      });

      // Vertical center: native 0-based row in gap between jabatan and nama
      const nativeRow = jabatanRow;
      const verticalOffsetPx = (gapHeightPx - QR_SIZE) / 2;
      const nativeRowOff = Math.round((verticalOffsetPx / PT_TO_PX) * 10000);
      const anchorColumnWidth = ws.getColumn(layout.qrTopLeft.nativeCol + 1).width ?? DEFAULT_COL_WIDTH;
      const imageCol = layout.qrTopLeft.nativeCol +
        (layout.qrTopLeft.nativeColOff / (anchorColumnWidth * 10000));
      const imageRow = nativeRow + (nativeRowOff / (GAP_ROW_HEIGHT * 10000));

      ws.addImage(imageId, {
        tl: { col: imageCol, row: imageRow },
        ext: { width: QR_SIZE, height: QR_SIZE },
        editAs: "oneCell",
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
  const metadata = buildSheetMetadata(workingPaper, risks);

  buildProfilRisikoSheet(workbook, profileRows, signatories, metadata);
  buildPenilaianRisikoSheet(workbook, profileRows, signatories, metadata);
  buildPemantauanReviuSheet(workbook, risks, signatories, metadata);
  buildTandaTanganSheet(workbook, workingPaper);

  return workbook.xlsx.writeBuffer();
}
