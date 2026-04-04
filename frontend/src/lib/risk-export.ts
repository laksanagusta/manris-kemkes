import ExcelJS from "exceljs";
import * as XLSX from "xlsx";

import type { RiskCategory } from "../types/risk";
import { riskCategoryLabels } from "./risk";

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
    case "mitigate":
      return "Mitigasi";
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

export async function createRiskBulkExportWorkbookBuffer(
  risks: RiskExportItem[],
  cycle: string,
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Risk Export");
  const rows = buildRiskBulkExportRows(risks);
  const multilineColumns = new Set<BulkRiskExportColumn>([
    "Sebab",
    "Dampak",
    "RPR Uraian",
    "PIC RPR",
    "Jadwal Pelaksanaan",
  ]);

  sheet.columns = BULK_RISK_EXPORT_COLUMNS.map((header) => ({
    header,
    key: header,
    width: header === "Deskripsi" || header === "Pengendalian Uraian" ? 28 : 20,
  }));
  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "top", horizontal: "left" };

  BULK_RISK_EXPORT_COLUMNS.forEach((header, index) => {
    if (!multilineColumns.has(header)) return;
    sheet.getColumn(index + 1).alignment = {
      wrapText: true,
      vertical: "top",
    };
  });

  rows.forEach((row, rowIndex) => {
    const excelRow = sheet.getRow(rowIndex + 2);
    BULK_RISK_EXPORT_COLUMNS.forEach((header, columnIndex) => {
      const value = row[header];
      const isNumeric = typeof value === "number";
      const column = sheet.getColumn(columnIndex + 1);
      const baseWrap = column.alignment?.wrapText ?? false;
      excelRow.getCell(columnIndex + 1).alignment = {
        vertical: "top",
        horizontal: isNumeric ? "right" : "left",
        wrapText: baseWrap,
      };
    });
  });

  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: "A1",
    to:
      String.fromCharCode(64 + BULK_RISK_EXPORT_COLUMNS.length) +
      Math.max(rows.length + 1, 1),
  };

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
