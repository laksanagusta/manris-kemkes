import ExcelJS from "exceljs";
import * as XLSX from "xlsx";

import type { RiskCategory } from "../types/risk";
import { calculateNilai, getRiskLevelFromNilai, riskCategoryLabels } from "./risk.js";

export const BULK_RISK_EXPORT_COLUMNS = [
  "Risiko",
  "Deskripsi",
  "Kode Risiko",
  "Kategori Risiko",
  "Sebab",
  "Sumber Risiko",
  "C/UC",
  "Dampak",
  "Pengendalian Uraian",
  "Efektivitas Pengendalian",
  "P",
  "D",
  "Bobot",
  "Prioritas Risiko",
  "Selera Risiko",
  "Pilihan Penanganan Risiko",
  "RPR Uraian",
  "PIC RPR",
  "Jadwal Pelaksanaan",
  "Target P",
  "Target D",
  "Target Bobot",
  "Unit Kerja",
] as const;

type BulkRiskExportColumn = (typeof BULK_RISK_EXPORT_COLUMNS)[number];
const EXCEL_LINE_BREAK = "\r\n";

export type RiskExportItem = {
  id: string;
  title?: string;
  description?: string;
  code?: string;
  category?: RiskCategory;
  cause?: string[];
  riskSource?: string;
  controllability?: string;
  impactDesc?: string[];
  existingControl?: string;
  controlEffectiveness?: string;
  probability?: number;
  impact?: number;
  weight?: number;
  inherentScore?: number;
  riskPriority?: number;
  riskAppetite?: string;
  treatmentOption?: string;
  targetProbability?: number;
  targetImpact?: number;
  targetWeight?: number;
  nextReviewDate?: string | null;
  orgName?: string;
  mitigations?: Array<{
    action?: string;
    owner?: string;
    executionScheduleText?: string;
    dueDate?: string | null;
  }>;
};

export type BulkRiskExportRow = Record<BulkRiskExportColumn, string | number>;
type RiskExportMitigation = NonNullable<RiskExportItem["mitigations"]>[number];
const EXCEL_EXPORT_FONT_NAME = "Bookman Old Style";
const EXCEL_EXPORT_HEADER_ROW_1 = 1;
const EXCEL_EXPORT_HEADER_ROW_2 = 2;
const EXCEL_EXPORT_HEADER_ROW_3 = 3;
const EXCEL_EXPORT_HEADER_ROW_4 = 4;
const EXCEL_EXPORT_DATA_START_ROW = 5;
const EXCEL_EXPORT_FIRST_COL = 1;
const EXCEL_EXPORT_LAST_COL = 25;

const EXCEL_EXPORT_HEADER_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD9D9D9" },
};

const EXCEL_EXPORT_HEADER_FONT: Partial<ExcelJS.Font> = {
  name: EXCEL_EXPORT_FONT_NAME,
  bold: true,
  color: { argb: "FF000000" },
  size: 11,
};

const EXCEL_EXPORT_DATA_FONT: Partial<ExcelJS.Font> = {
  name: EXCEL_EXPORT_FONT_NAME,
  size: 11,
};

const EXCEL_EXPORT_THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

const EXCEL_EXPORT_WRAP_ALIGNMENT: Partial<ExcelJS.Alignment> = {
  vertical: "top",
  wrapText: true,
};

const EXCEL_EXPORT_COLUMN_WIDTHS = [
  5,   // NO
  40,  // RISIKO
  14,  // KODE RISIKO
  32,  // SEBAB
  16,  // SUMBER RISIKO
  8,   // C/UC
  32,  // DAMPAK
  35,  // URAIAN (pengendalian)
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
  35,  // URAIAN (RPR)
  18,  // JADWAL PELAKSANAAN
  6,   // P (target)
  6,   // D (target)
  10,  // BOBOT (target)
  10,  // NILAI (target)
  18,  // TINGKAT RISIKO (target)
] as const;

function toDelimited(value?: string[]) {
  return Array.isArray(value)
    ? value.filter(Boolean).join(EXCEL_LINE_BREAK)
    : "";
}

function controlEffectivenessLabel(value?: string) {
  switch (value) {
    case "efektif":
      return "Efektif";
    case "tidak_efektif":
      return "Tidak Efektif";
    default:
      return value || "";
  }
}

function treatmentOptionLabel(value?: string) {
  switch (value) {
    case "menghindari":
      return "Menghindari Risiko";
    case "berbagi":
      return "Berbagi Risiko";
    case "menerima":
      return "Menerima";
    case "mitigasi":
      return "Penanganan";
    case "mitigate":
      return "Penanganan";
    case "accept":
      return "Menerima risiko";
    case "transfer":
      return "Transfer";
    case "avoid":
      return "Hindari";
    default:
      return value || "";
  }
}

function riskAppetiteLabel(value?: string) {
  switch (value) {
    case "dalam_batas":
      return "Dalam batas selera risiko";
    case "di_atas_batas":
      return "Di atas batas selera risiko";
    default:
      return value || "";
  }
}

function categoryLabel(value?: string) {
  if (!value) return "";
  return riskCategoryLabels[value as keyof typeof riskCategoryLabels] || value;
}

function mitigationSchedule(mitigation?: RiskExportMitigation) {
  if (!mitigation) return "";
  return mitigation.executionScheduleText || mitigation.dueDate || "";
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function formatMitigationNarrative(mitigations?: RiskExportItem["mitigations"]) {
  if (!mitigations || mitigations.length === 0) return "";
  return mitigations
    .map((mitigation) => {
      const action = mitigation.action?.trim() || "";
      const owner = mitigation.owner?.trim() || "";
      const schedule = mitigationSchedule(mitigation).trim();

      const parts = [action];
      if (owner) parts.push(`PIC: ${owner}`);
      if (schedule) parts.push(`Jadwal: ${schedule}`);

      return parts.filter(Boolean).join(" | ");
    })
    .filter(Boolean)
    .join("\n\n");
}

function joinMitigationValues(
  mitigations: RiskExportItem["mitigations"],
  selector: (mitigation: RiskExportMitigation) => string,
) {
  if (!mitigations || mitigations.length === 0) return "";
  return mitigations
    .map((mitigation) => selector(mitigation).trim())
    .filter(Boolean)
    .join(EXCEL_LINE_BREAK);
}

function getRiskAssessmentLevelLabel(score: number) {
  return getRiskLevelFromNilai(score)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getTargetScore(risk: RiskExportItem) {
  if (risk.targetProbability == null && risk.targetImpact == null && risk.targetWeight == null) {
    return "";
  }
  const probability = risk.targetProbability ?? 0;
  const impact = risk.targetImpact ?? 0;
  const weight = risk.targetWeight ?? 1;
  return calculateNilai(probability, impact, weight);
}

function formatNumberCell(cell: ExcelJS.Cell, value: number | string | undefined | null) {
  if (typeof value !== "number") return;
  cell.numFmt = Number.isInteger(value) ? "0" : "0.##";
}

function buildRiskExportSheet(
  workbook: ExcelJS.Workbook,
  risks: RiskExportItem[],
) {
  const sheet = workbook.addWorksheet("Profil Risiko");

  sheet.getColumn(1).width = 3;
  EXCEL_EXPORT_COLUMN_WIDTHS.forEach((width, index) => {
    sheet.getColumn(EXCEL_EXPORT_FIRST_COL + index).width = width;
  });

  const headerStyleFill = EXCEL_EXPORT_HEADER_FILL;
  const headerStyleFont = EXCEL_EXPORT_HEADER_FONT;
  const headerStyleAlign: Partial<ExcelJS.Alignment> = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };

  function headerCell(cell: ExcelJS.Cell, value?: string | number) {
    if (value !== undefined) cell.value = value;
    cell.fill = headerStyleFill;
    cell.font = headerStyleFont;
    cell.alignment = headerStyleAlign;
    cell.border = EXCEL_EXPORT_THIN_BORDER;
    if (typeof value === "number") {
      cell.numFmt = "0";
    }
  }

  const C = EXCEL_EXPORT_FIRST_COL;

  const row1 = sheet.getRow(EXCEL_EXPORT_HEADER_ROW_1);
  for (let i = 0; i < EXCEL_EXPORT_COLUMN_WIDTHS.length; i += 1) {
    headerCell(row1.getCell(C + i));
  }
  row1.getCell(C).value = "NO";
  row1.getCell(C + 1).value = "IDENTIFIKASI RISIKO";
  row1.getCell(C + 7).value = "ANALISIS RISIKO";
  row1.getCell(C + 15).value = "EVALUASI RISIKO";
  row1.getCell(C + 17).value = "RENCANA PENANGANAN RISIKO (RPR)";
  row1.getCell(C + 20).value = "TARGET PENURUNAN TINGKAT RISIKO";
  row1.height = 28;

  sheet.mergeCells(EXCEL_EXPORT_HEADER_ROW_1, C, EXCEL_EXPORT_HEADER_ROW_3, C);
  sheet.mergeCells(EXCEL_EXPORT_HEADER_ROW_1, C + 1, EXCEL_EXPORT_HEADER_ROW_1, C + 6);
  sheet.mergeCells(EXCEL_EXPORT_HEADER_ROW_1, C + 7, EXCEL_EXPORT_HEADER_ROW_1, C + 14);
  sheet.mergeCells(EXCEL_EXPORT_HEADER_ROW_1, C + 15, EXCEL_EXPORT_HEADER_ROW_1, C + 16);
  sheet.mergeCells(EXCEL_EXPORT_HEADER_ROW_1, C + 17, EXCEL_EXPORT_HEADER_ROW_1, C + 19);
  sheet.mergeCells(EXCEL_EXPORT_HEADER_ROW_1, C + 20, EXCEL_EXPORT_HEADER_ROW_1, C + 24);

  const row2 = sheet.getRow(EXCEL_EXPORT_HEADER_ROW_2);
  for (let i = 0; i < EXCEL_EXPORT_COLUMN_WIDTHS.length; i += 1) {
    headerCell(row2.getCell(C + i));
  }
  const subHeaders: Array<[number, string]> = [
    [1, "RISIKO"],
    [2, "KODE RISIKO"],
    [3, "SEBAB"],
    [4, "SUMBER RISIKO"],
    [5, "C/UC"],
    [6, "DAMPAK"],
    [7, "PENGENDALIAN YANG ADA"],
    [10, "P"],
    [11, "D"],
    [12, "BOBOT"],
    [13, "NILAI"],
    [14, "TINGKAT RISIKO"],
    [15, "PRIORITAS RISIKO"],
    [16, "SELERA RISIKO"],
    [17, "PILIHAN PENANGANAN"],
    [18, "URAIAN"],
    [19, "JADWAL PELAKSANAAN"],
    [20, "P"],
    [21, "D"],
    [22, "BOBOT"],
    [23, "NILAI"],
    [24, "TINGKAT RISIKO"],
  ];
  subHeaders.forEach(([offset, label]) => {
    row2.getCell(C + offset).value = label;
  });
  row2.height = 28;

  const mergedSubHeaders = [
    1, 2, 3, 4, 5, 6,
    10, 11, 12, 13, 14,
    15, 16, 17, 18, 19,
    20, 21, 22, 23, 24,
  ];
  mergedSubHeaders.forEach((offset) => {
    sheet.mergeCells(EXCEL_EXPORT_HEADER_ROW_2, C + offset, EXCEL_EXPORT_HEADER_ROW_3, C + offset);
  });
  sheet.mergeCells(EXCEL_EXPORT_HEADER_ROW_2, C + 7, EXCEL_EXPORT_HEADER_ROW_2, C + 9);

  const row3 = sheet.getRow(EXCEL_EXPORT_HEADER_ROW_3);
  for (let i = 0; i < EXCEL_EXPORT_COLUMN_WIDTHS.length; i += 1) {
    headerCell(row3.getCell(C + i));
  }
  row3.getCell(C + 7).value = "URAIAN";
  row3.getCell(C + 8).value = "EFEKTIF";
  row3.getCell(C + 9).value = "TIDAK EFEKTIF";
  row3.height = 24;

  const row4 = sheet.getRow(EXCEL_EXPORT_HEADER_ROW_4);
  for (let i = 0; i < EXCEL_EXPORT_COLUMN_WIDTHS.length; i += 1) {
    headerCell(row4.getCell(C + i), i + 1);
  }
  row4.height = 20;

  risks.forEach((risk, index) => {
    const dataRow = sheet.getRow(EXCEL_EXPORT_DATA_START_ROW + index);
    const inherentScore = risk.inherentScore ?? (risk.probability != null && risk.impact != null && risk.weight != null
      ? calculateNilai(risk.probability, risk.impact, risk.weight)
      : "");
    const targetScore = getTargetScore(risk);
    const targetLevel = typeof targetScore === "number" ? getRiskAssessmentLevelLabel(targetScore) : "";
    const riskLevel = typeof inherentScore === "number" ? getRiskAssessmentLevelLabel(inherentScore) : "";
    const effectiveness = (risk.controlEffectiveness || "").toLowerCase();

    dataRow.getCell(C).value = index + 1;
    dataRow.getCell(C + 1).value = risk.title || "";
    dataRow.getCell(C + 2).value = risk.code || "";
    dataRow.getCell(C + 3).value = toDelimited(risk.cause);
    dataRow.getCell(C + 4).value = risk.riskSource || "";
    dataRow.getCell(C + 5).value = risk.controllability || "";
    dataRow.getCell(C + 6).value = toDelimited(risk.impactDesc);
    dataRow.getCell(C + 7).value = risk.existingControl || "";
    dataRow.getCell(C + 8).value = effectiveness.includes("efektif") && !effectiveness.includes("tidak") ? "EFEKTIF" : "";
    dataRow.getCell(C + 9).value = effectiveness.includes("tidak") ? "TIDAK EFEKTIF" : "";
    dataRow.getCell(C + 10).value = risk.probability ?? "";
    dataRow.getCell(C + 11).value = risk.impact ?? "";
    dataRow.getCell(C + 12).value = risk.weight ?? "";
    dataRow.getCell(C + 13).value = inherentScore;
    dataRow.getCell(C + 14).value = riskLevel;
    dataRow.getCell(C + 15).value = risk.riskPriority ?? "";
    dataRow.getCell(C + 16).value = riskAppetiteLabel(risk.riskAppetite);
    dataRow.getCell(C + 17).value = treatmentOptionLabel(risk.treatmentOption);
    dataRow.getCell(C + 18).value = formatMitigationNarrative(risk.mitigations);
    dataRow.getCell(C + 19).value = formatDate(risk.nextReviewDate);
    dataRow.getCell(C + 20).value = risk.targetProbability ?? "";
    dataRow.getCell(C + 21).value = risk.targetImpact ?? "";
    dataRow.getCell(C + 22).value = risk.targetWeight ?? "";
    dataRow.getCell(C + 23).value = targetScore;
    dataRow.getCell(C + 24).value = targetLevel;

    dataRow.font = EXCEL_EXPORT_DATA_FONT;
    dataRow.alignment = EXCEL_EXPORT_WRAP_ALIGNMENT;
    dataRow.height = estimateBulkExportRowHeight(sheet, EXCEL_EXPORT_DATA_START_ROW + index, C, EXCEL_EXPORT_LAST_COL);

    for (let col = C; col <= EXCEL_EXPORT_LAST_COL; col += 1) {
      const cell = dataRow.getCell(col);
      cell.border = EXCEL_EXPORT_THIN_BORDER;
      cell.alignment = {
        vertical: "top",
        horizontal: typeof cell.value === "number" ? "right" : "left",
        wrapText: true,
      };
      formatNumberCell(cell, cell.value as number | string | undefined | null);
    }
  });

  sheet.views = [{ state: "frozen", ySplit: EXCEL_EXPORT_HEADER_ROW_4 }];
  return sheet;
}

function createBaseRow(risk: RiskExportItem): BulkRiskExportRow {
  return {
    Risiko: risk.title || "",
    Deskripsi: risk.description || "",
    "Kode Risiko": risk.code || "",
    "Kategori Risiko": categoryLabel(risk.category),
    Sebab: toDelimited(risk.cause),
    "Sumber Risiko": risk.riskSource || "",
    "C/UC": risk.controllability || "",
    Dampak: toDelimited(risk.impactDesc),
    "Pengendalian Uraian": risk.existingControl || "",
    "Efektivitas Pengendalian": controlEffectivenessLabel(
      risk.controlEffectiveness,
    ),
    P: risk.probability ?? "",
    D: risk.impact ?? "",
    Bobot: risk.weight ?? "",
    "Prioritas Risiko": risk.riskPriority ?? "",
    "Selera Risiko": riskAppetiteLabel(risk.riskAppetite),
    "Pilihan Penanganan Risiko": treatmentOptionLabel(risk.treatmentOption),
    "RPR Uraian": "",
    "PIC RPR": "",
    "Jadwal Pelaksanaan": "",
    "Target P": risk.targetProbability ?? "",
    "Target D": risk.targetImpact ?? "",
    "Target Bobot": risk.targetWeight ?? "",
    "Unit Kerja": risk.orgName || "",
  };
}

export function buildRiskBulkExportRows(
  risks: RiskExportItem[],
): BulkRiskExportRow[] {
  return risks.map((risk) => {
    const baseRow = createBaseRow(risk);

    return {
      ...baseRow,
      "RPR Uraian": joinMitigationValues(
        risk.mitigations,
        (mitigation) => mitigation.action || "",
      ),
      "PIC RPR": joinMitigationValues(
        risk.mitigations,
        (mitigation) => mitigation.owner || "",
      ),
      "Jadwal Pelaksanaan": joinMitigationValues(
        risk.mitigations,
        (mitigation) => mitigationSchedule(mitigation),
      ),
    };
  });
}

function estimateBulkExportRowHeight(
  worksheet: ExcelJS.Worksheet,
  rowNum: number,
  startCol: number,
  endCol: number,
): number {
  const row = worksheet.getRow(rowNum);
  let maxLines = 1;

  for (let c = startCol; c <= endCol; c += 1) {
    const val = row.getCell(c).value;
    if (typeof val !== "string") continue;

    const colWidth = worksheet.getColumn(c).width ?? 10;
    const charsPerLine = Math.max(colWidth * 1.15, 1);
    const lines = val.split("\n");
    let totalLines = 0;

    for (const line of lines) {
      totalLines += Math.max(1, Math.ceil(line.length / charsPerLine));
    }

    maxLines = Math.max(maxLines, totalLines);
  }

  return Math.max(50, maxLines * 15);
}

export async function createRiskBulkExportWorkbookBuffer(
  risks: RiskExportItem[],
  _cycle: string,
) {
  const workbook = new ExcelJS.Workbook();
  void _cycle;
  buildRiskExportSheet(workbook, risks);

  return workbook.xlsx.writeBuffer();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportRiskBulkCSV(risks: RiskExportItem[], cycle: string) {
  const rows = buildRiskBulkExportRows(risks);
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: [...BULK_RISK_EXPORT_COLUMNS],
  });
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  downloadBlob(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    `risk-register-${cycle}.csv`,
  );
}

export async function exportRiskBulkXLSX(
  risks: RiskExportItem[],
  cycle: string,
) {
  const output = await createRiskBulkExportWorkbookBuffer(risks, cycle);
  downloadBlob(
    new Blob([output], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `risk-register-${cycle}.xlsx`,
  );
}
