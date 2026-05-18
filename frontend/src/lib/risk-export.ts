import ExcelJS from "exceljs";
import * as XLSX from "xlsx";

import type { RiskCategory } from "../types/risk";
import { riskCategoryLabels } from "./risk.js";

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
  riskPriority?: number;
  riskAppetite?: string;
  treatmentOption?: string;
  targetProbability?: number;
  targetImpact?: number;
  targetWeight?: number;
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

function categoryLabel(value?: string) {
  if (!value) return "";
  return riskCategoryLabels[value as keyof typeof riskCategoryLabels] || value;
}

function mitigationSchedule(mitigation?: RiskExportMitigation) {
  if (!mitigation) return "";
  return mitigation.executionScheduleText || mitigation.dueDate || "";
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
    "Selera Risiko": risk.riskAppetite || "",
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

  return Math.max(24, maxLines * 14);
}

function applyBulkExportTableStyles(worksheet: ExcelJS.Worksheet, rowCount: number) {
  const lastRow = Math.max(rowCount + 1, 1);
  const lastCol = BULK_RISK_EXPORT_COLUMNS.length;

  for (let col = 1; col <= lastCol; col += 1) {
    worksheet.getColumn(col).alignment = EXCEL_EXPORT_WRAP_ALIGNMENT;
  }

  const headerRow = worksheet.getRow(1);
  headerRow.font = EXCEL_EXPORT_HEADER_FONT;
  headerRow.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };
  headerRow.height = 28;

  for (let col = 1; col <= lastCol; col += 1) {
    const headerCell = headerRow.getCell(col);
    headerCell.fill = EXCEL_EXPORT_HEADER_FILL;
    headerCell.border = EXCEL_EXPORT_THIN_BORDER;
    headerCell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  }

  for (let rowNum = 2; rowNum <= lastRow; rowNum += 1) {
    const row = worksheet.getRow(rowNum);
    row.font = EXCEL_EXPORT_DATA_FONT;
    row.alignment = EXCEL_EXPORT_WRAP_ALIGNMENT;
    row.height = estimateBulkExportRowHeight(worksheet, rowNum, 1, lastCol);

    for (let col = 1; col <= lastCol; col += 1) {
      const cell = row.getCell(col);
      const value = cell.value;
      const isNumeric = typeof value === "number";
      cell.border = EXCEL_EXPORT_THIN_BORDER;
      cell.alignment = {
        vertical: "top",
        horizontal: isNumeric ? "right" : "left",
        wrapText: true,
      };
      if (isNumeric) {
        cell.numFmt = "0.##";
      }
    }
  }

  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = {
    from: "A1",
    to: `${String.fromCharCode(64 + lastCol)}${lastRow}`,
  };
}

export async function createRiskBulkExportWorkbookBuffer(
  risks: RiskExportItem[],
  cycle: string,
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Risk Export");
  const rows = buildRiskBulkExportRows(risks);

  sheet.columns = BULK_RISK_EXPORT_COLUMNS.map((header) => ({
    header,
    key: header,
    width: header === "Deskripsi" || header === "Pengendalian Uraian" ? 28 : 20,
  }));
  sheet.addRows(rows);
  applyBulkExportTableStyles(sheet, rows.length);

  const meta = workbook.addWorksheet("Metadata");
  meta.addRows([
    ["cycle", cycle],
    ["exportedAt", new Date().toISOString()],
    ["rowCount", rows.length],
  ]);

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
