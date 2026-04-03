import ExcelJS from "exceljs";
import * as XLSX from "xlsx";

import type { RiskCycleDetailedComparisonItem, RiskCycleDetailedComparisonReport, RiskCycleSideBySideSnapshot } from "../types/risk";
import { riskCategoryLabels } from "./risk";

type ExportRow = Record<string, string | number>;

type QuantitativeField =
  | "probability"
  | "impact"
  | "inherentScore"
  | "riskPriority"
  | "targetProbability"
  | "targetImpact"
  | "targetScore";

const coreFieldOrder = [
  "description",
  "category",
  "cause",
  "existingControl",
  "probability",
  "impact",
  "inherentScore",
  "riskPriority",
  "treatmentOption",
  "targetProbability",
  "targetImpact",
  "targetScore",
  "nextReviewDate",
  "mitigations",
] as const;

const quantitativeFields: QuantitativeField[] = [
  "probability",
  "impact",
  "inherentScore",
  "riskPriority",
  "targetProbability",
  "targetImpact",
  "targetScore",
];

const exceljsFillGreen: Partial<ExcelJS.FillPattern> = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } };
const exceljsFillRed: Partial<ExcelJS.FillPattern> = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDECEC" } };
const exceljsFillAmber: Partial<ExcelJS.FillPattern> = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF4E5" } };
const exceljsFontGreen: Partial<ExcelJS.Font> = { color: { argb: "FF2E7D32" }, bold: true };
const exceljsFontRed: Partial<ExcelJS.Font> = { color: { argb: "FFC62828" }, bold: true };
const exceljsFontAmber: Partial<ExcelJS.Font> = { color: { argb: "FFB26A00" }, bold: true };

function normalizeValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value)) return value.map((item) => normalizeValue(item)).filter(Boolean).join(" | ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function categoryLabel(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const slug = String(value);
  return riskCategoryLabels[slug as keyof typeof riskCategoryLabels] || slug;
}

function sanitizeFileSegment(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "report";
}

function baseFilename(report: RiskCycleDetailedComparisonReport) {
  return `risk-cycle-detail-${sanitizeFileSegment(report.summary.fromCycle)}-to-${sanitizeFileSegment(report.summary.toCycle)}`;
}

function buildSummaryRows(report: RiskCycleDetailedComparisonReport): ExportRow[] {
  return [
    {
      fromCycle: report.summary.fromCycle,
      toCycle: report.summary.toCycle,
      totalFrom: report.summary.totalFrom,
      totalTo: report.summary.totalTo,
      changedCount: report.summary.changedCount,
      addedCount: report.summary.addedCount,
      removedCount: report.summary.removedCount,
      stableCount: report.summary.stableCount,
    },
  ];
}

function buildRiskRows(report: RiskCycleDetailedComparisonReport): ExportRow[] {
  return report.items.map((item) => ({
    changeCategory: item.changeCategory,
    code: item.code,
    title: item.title,
    orgName: item.orgName,
    fromCycle: item.fromCycle,
    toCycle: item.toCycle,
    fromRiskId: item.fromRiskId || "",
    toRiskId: item.toRiskId || "",
    fieldDiffCount: item.fieldDiffs.length,
    mitigationDiffCount: item.mitigationDiffs.length,
    changeReason: item.changeReason || "",
    reviewSummary: item.reviewSummary || "",
  }));
}

function buildFieldRows(items: RiskCycleDetailedComparisonItem[]): ExportRow[] {
  return items.flatMap((item) => item.fieldDiffs.map((diff) => ({
    changeCategory: item.changeCategory,
    code: item.code,
    title: item.title,
    orgName: item.orgName,
    fromCycle: item.fromCycle,
    toCycle: item.toCycle,
    field: diff.field,
    label: diff.label,
    changeType: diff.changeType,
    before: normalizeValue(diff.before),
    after: normalizeValue(diff.after),
    changeReason: item.changeReason || "",
  })));
}

function buildMitigationRows(items: RiskCycleDetailedComparisonItem[]): ExportRow[] {
  return items.flatMap((item) => item.mitigationDiffs.flatMap((mitigationDiff) => {
    if (mitigationDiff.fieldDiffs.length === 0) {
      return [{
        changeCategory: item.changeCategory,
        code: item.code,
        title: item.title,
        orgName: item.orgName,
        fromCycle: item.fromCycle,
        toCycle: item.toCycle,
        mitigationRowKey: mitigationDiff.rowKey,
        mitigationChangeType: mitigationDiff.changeType,
        beforeLabel: mitigationDiff.beforeLabel || "",
        afterLabel: mitigationDiff.afterLabel || "",
        field: "",
        label: "",
        changeType: "",
        before: "",
        after: "",
      }];
    }

    return mitigationDiff.fieldDiffs.map((diff) => ({
      changeCategory: item.changeCategory,
      code: item.code,
      title: item.title,
      orgName: item.orgName,
      fromCycle: item.fromCycle,
      toCycle: item.toCycle,
      mitigationRowKey: mitigationDiff.rowKey,
      mitigationChangeType: mitigationDiff.changeType,
      beforeLabel: mitigationDiff.beforeLabel || "",
      afterLabel: mitigationDiff.afterLabel || "",
      field: diff.field,
      label: diff.label,
      changeType: diff.changeType,
      before: normalizeValue(diff.before),
      after: normalizeValue(diff.after),
    }));
  }));
}

function snapshotValue(snapshot: RiskCycleSideBySideSnapshot | undefined, key: keyof RiskCycleSideBySideSnapshot): string {
  return normalizeValue(snapshot?.[key]);
}

function findFieldDiffValue(item: RiskCycleDetailedComparisonItem, field: string, side: "from" | "to"): string {
  const diff = item.fieldDiffs.find((entry) => entry.field === field);
  if (!diff) return "";
  return normalizeValue(side === "from" ? diff.before : diff.after);
}

function mitigationFallbackValue(item: RiskCycleDetailedComparisonItem, side: "from" | "to"): string {
  const labels = item.mitigationDiffs
    .map((diff) => (side === "from" ? diff.beforeLabel : diff.afterLabel) || "")
    .filter(Boolean);
  return labels.join(" | ");
}

function sideBySideValue(
  item: RiskCycleDetailedComparisonItem,
  side: "from" | "to",
  key: keyof RiskCycleSideBySideSnapshot | "mitigations"
): string {
  const snapshot = side === "from" ? item.fromSnapshot : item.toSnapshot;
  const direct = snapshotValue(snapshot, key as keyof RiskCycleSideBySideSnapshot);
  if (direct) return direct;

  if (key === "mitigations") {
    return mitigationFallbackValue(item, side);
  }

  return findFieldDiffValue(item, key, side);
}

function parseNumeric(value: string | number): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function columnLetter(index: number) {
  let value = index;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function classifyTrend(item: RiskCycleDetailedComparisonItem): "improved" | "worsened" | "stable" {
  let improved = 0;
  let worsened = 0;

  for (const field of quantitativeFields) {
    const fromValue = parseNumeric(sideBySideValue(item, "from", field));
    const toValue = parseNumeric(sideBySideValue(item, "to", field));
    if (fromValue === null || toValue === null || fromValue === toValue) {
      continue;
    }
    if (toValue < fromValue) {
      improved += 1;
    } else {
      worsened += 1;
    }
  }

  if (improved > worsened) return "improved";
  if (worsened > improved) return "worsened";
  return "stable";
}

function buildTopBottomRows(items: RiskCycleDetailedComparisonItem[]): ExportRow[] {
  return items.flatMap((item) => {
    const trend = classifyTrend(item);
    const baseRow = {
      trend,
      changeCategory: item.changeCategory,
      code: item.code,
      title: item.title,
      orgName: item.orgName,
      fromCycle: item.fromCycle,
      toCycle: item.toCycle,
    };

    const fromRow: ExportRow = {
      ...baseRow,
      version: "Before",
      description: sideBySideValue(item, "from", "description"),
      category: categoryLabel(sideBySideValue(item, "from", "category")),
      cause: sideBySideValue(item, "from", "cause"),
      existingControl: sideBySideValue(item, "from", "existingControl"),
      probability: sideBySideValue(item, "from", "probability"),
      impact: sideBySideValue(item, "from", "impact"),
      inherentScore: sideBySideValue(item, "from", "inherentScore"),
      riskPriority: sideBySideValue(item, "from", "riskPriority"),
      treatmentOption: sideBySideValue(item, "from", "treatmentOption"),
      targetProbability: sideBySideValue(item, "from", "targetProbability"),
      targetImpact: sideBySideValue(item, "from", "targetImpact"),
      targetScore: sideBySideValue(item, "from", "targetScore"),
      nextReviewDate: sideBySideValue(item, "from", "nextReviewDate"),
      mitigations: sideBySideValue(item, "from", "mitigations"),
    };

    const toRow: ExportRow = {
      ...baseRow,
      version: "After",
      description: sideBySideValue(item, "to", "description"),
      category: categoryLabel(sideBySideValue(item, "to", "category")),
      cause: sideBySideValue(item, "to", "cause"),
      existingControl: sideBySideValue(item, "to", "existingControl"),
      probability: sideBySideValue(item, "to", "probability"),
      impact: sideBySideValue(item, "to", "impact"),
      inherentScore: sideBySideValue(item, "to", "inherentScore"),
      riskPriority: sideBySideValue(item, "to", "riskPriority"),
      treatmentOption: sideBySideValue(item, "to", "treatmentOption"),
      targetProbability: sideBySideValue(item, "to", "targetProbability"),
      targetImpact: sideBySideValue(item, "to", "targetImpact"),
      targetScore: sideBySideValue(item, "to", "targetScore"),
      nextReviewDate: sideBySideValue(item, "to", "nextReviewDate"),
      mitigations: sideBySideValue(item, "to", "mitigations"),
    };

    return [fromRow, toRow];
  });
}

function freezeAndFilterExcelSheet(worksheet: ExcelJS.Worksheet, toColumn: string, totalRows: number) {
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  if (totalRows > 0) {
    worksheet.autoFilter = `A1:${toColumn}1`;
  }
}

function applyHeaderStyle(row: ExcelJS.Row) {
  row.font = { bold: true };
}

function setWorksheetColumns(worksheet: ExcelJS.Worksheet, columns: Array<{ header: string; key: string; width: number }>) {
  worksheet.columns = columns.map((column) => ({ header: column.header, key: column.key, width: column.width }));
  applyHeaderStyle(worksheet.getRow(1));
}

function addRowsFromObjects(worksheet: ExcelJS.Worksheet, rows: ExportRow[]) {
  for (const row of rows) {
    worksheet.addRow(row);
  }
}

function applyLegendCells(worksheet: ExcelJS.Worksheet, legendStartColumn: number) {
  const legendRows = [
    ["legend", "meaning"],
    ["improved", "Hijau: nilai kuantitatif periode baru lebih rendah dari periode awal"],
    ["worsened", "Merah: nilai kuantitatif periode baru lebih tinggi dari periode awal"],
    ["stable", "Amber: nilai tetap atau campuran membaik dan memburuk"],
  ] as const;

  legendRows.forEach((legendRow, rowIndex) => {
    const excelRow = rowIndex + 1;
    worksheet.getCell(excelRow, legendStartColumn).value = legendRow[0];
    worksheet.getCell(excelRow, legendStartColumn + 1).value = legendRow[1];

    if (rowIndex === 0) {
      worksheet.getCell(excelRow, legendStartColumn).font = { bold: true };
      worksheet.getCell(excelRow, legendStartColumn + 1).font = { bold: true };
      return;
    }

    const style = legendRow[0] === "improved"
      ? { fill: exceljsFillGreen, font: exceljsFontGreen }
      : legendRow[0] === "worsened"
        ? { fill: exceljsFillRed, font: exceljsFontRed }
        : { fill: exceljsFillAmber, font: exceljsFontAmber };
    worksheet.getCell(excelRow, legendStartColumn).fill = style.fill as ExcelJS.Fill;
    worksheet.getCell(excelRow, legendStartColumn).font = style.font as ExcelJS.Font;
  });

  worksheet.getColumn(legendStartColumn).width = 12;
  worksheet.getColumn(legendStartColumn + 1).width = 64;
}

export async function createRiskCycleDetailWorkbookBuffer(report: RiskCycleDetailedComparisonReport) {
  const workbook = new ExcelJS.Workbook();

  const summarySheet = workbook.addWorksheet("Summary");
  const summaryRows = buildSummaryRows(report);
  const summaryColumns = Object.keys(summaryRows[0] || {}).map((key) => ({ header: key, key, width: 18 }));
  setWorksheetColumns(summarySheet, summaryColumns);
  addRowsFromObjects(summarySheet, summaryRows);
  freezeAndFilterExcelSheet(summarySheet, columnLetter(summaryColumns.length), summaryRows.length);

  const comparisonSheet = workbook.addWorksheet("Perbandingan");
  const topBottomRows = buildTopBottomRows(report.items);
  const comparisonColumns = [
    { header: "trend", key: "trend", width: 12 },
    { header: "changeCategory", key: "changeCategory", width: 14 },
    { header: "code", key: "code", width: 12 },
    { header: "title", key: "title", width: 32 },
    { header: "orgName", key: "orgName", width: 20 },
    { header: "fromCycle", key: "fromCycle", width: 12 },
    { header: "toCycle", key: "toCycle", width: 12 },
    { header: "version", key: "version", width: 10 },
    { header: "description", key: "description", width: 36 },
    { header: "category", key: "category", width: 20 },
    { header: "cause", key: "cause", width: 28 },
    { header: "existingControl", key: "existingControl", width: 24 },
    { header: "probability", key: "probability", width: 14 },
    { header: "impact", key: "impact", width: 12 },
    { header: "inherentScore", key: "inherentScore", width: 14 },
    { header: "riskPriority", key: "riskPriority", width: 14 },
    { header: "treatmentOption", key: "treatmentOption", width: 16 },
    { header: "targetProbability", key: "targetProbability", width: 18 },
    { header: "targetImpact", key: "targetImpact", width: 14 },
    { header: "targetScore", key: "targetScore", width: 14 },
    { header: "nextReviewDate", key: "nextReviewDate", width: 16 },
    { header: "mitigations", key: "mitigations", width: 48 },
  ];
  setWorksheetColumns(comparisonSheet, comparisonColumns);
  addRowsFromObjects(comparisonSheet, topBottomRows);
  freezeAndFilterExcelSheet(comparisonSheet, columnLetter(comparisonColumns.length), topBottomRows.length);

  topBottomRows.forEach((row, index) => {
    const excelRow = index + 2;
    const trendCell = comparisonSheet.getCell(`A${excelRow}`);
    if (row.trend === "improved") {
      trendCell.fill = exceljsFillGreen as ExcelJS.Fill;
      trendCell.font = exceljsFontGreen as ExcelJS.Font;
    } else if (row.trend === "worsened") {
      trendCell.fill = exceljsFillRed as ExcelJS.Fill;
      trendCell.font = exceljsFontRed as ExcelJS.Font;
    } else {
      trendCell.fill = exceljsFillAmber as ExcelJS.Fill;
      trendCell.font = exceljsFontAmber as ExcelJS.Font;
    }

    const versionCell = comparisonSheet.getCell(`H${excelRow}`);
    if (row.version === "Before") {
      versionCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF3E" } } as ExcelJS.Fill;
      versionCell.font = { color: { argb: "FF856404" }, bold: true };
    } else {
      versionCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD4EDDA" } } as ExcelJS.Fill;
      versionCell.font = { color: { argb: "FF155724" }, bold: true };
    }

    quantitativeFields.forEach((field) => {
      const value = parseNumeric(String(row[field] ?? ""));
      if (value === null) return;

      const fieldColumnIndex = comparisonColumns.findIndex((column) => column.key === field) + 1;
      if (fieldColumnIndex === 0) return;

      const previousRowIndex = index % 2 === 1 ? index - 1 : index + 1;
      if (previousRowIndex < 0 || previousRowIndex >= topBottomRows.length) return;

      const previousRow = topBottomRows[previousRowIndex];
      const previousValue = parseNumeric(String(previousRow[field] ?? ""));
      if (previousValue === null || previousValue === value) return;

      const improved = row.version === "After" ? value < previousValue : previousValue < value;
      const fill = improved ? exceljsFillGreen : exceljsFillRed;
      const font = improved ? exceljsFontGreen : exceljsFontRed;

      const cell = comparisonSheet.getCell(excelRow, fieldColumnIndex);
      cell.fill = fill as ExcelJS.Fill;
      cell.font = font as ExcelJS.Font;
    });
  });
  addRowsFromObjects(comparisonSheet, []);
  applyLegendCells(comparisonSheet, comparisonColumns.length + 2);

  const risksSheet = workbook.addWorksheet("Risks");
  const riskRows = buildRiskRows(report);
  const riskColumns = Object.keys(riskRows[0] || {}).map((key) => ({ header: key, key, width: 18 }));
  setWorksheetColumns(risksSheet, riskColumns);
  addRowsFromObjects(risksSheet, riskRows);
  freezeAndFilterExcelSheet(risksSheet, columnLetter(riskColumns.length), riskRows.length);

  const fieldChangesSheet = workbook.addWorksheet("Field Changes");
  const fieldRows = buildFieldRows(report.items);
  const fieldColumns = Object.keys(fieldRows[0] || { field: "", label: "" }).map((key) => ({ header: key, key, width: 18 }));
  setWorksheetColumns(fieldChangesSheet, fieldColumns);
  addRowsFromObjects(fieldChangesSheet, fieldRows);
  freezeAndFilterExcelSheet(fieldChangesSheet, columnLetter(fieldColumns.length), fieldRows.length);

  const mitigationChangesSheet = workbook.addWorksheet("Mitigation Changes");
  const mitigationRows = buildMitigationRows(report.items);
  const mitigationColumns = Object.keys(mitigationRows[0] || { field: "", label: "" }).map((key) => ({ header: key, key, width: 18 }));
  setWorksheetColumns(mitigationChangesSheet, mitigationColumns);
  addRowsFromObjects(mitigationChangesSheet, mitigationRows);
  freezeAndFilterExcelSheet(mitigationChangesSheet, columnLetter(mitigationColumns.length), mitigationRows.length);

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer instanceof ArrayBuffer ? Buffer.from(buffer) : Buffer.from(buffer);
}

function buildFlatCSVRows(report: RiskCycleDetailedComparisonReport): ExportRow[] {
  return report.items.flatMap((item) => {
    const fieldRows = item.fieldDiffs.map((diff) => ({
      rowType: "risk_field",
      changeCategory: item.changeCategory,
      code: item.code,
      title: item.title,
      orgName: item.orgName,
      fromCycle: item.fromCycle,
      toCycle: item.toCycle,
      mitigationRowKey: "",
      mitigationChangeType: "",
      field: diff.field,
      label: diff.label,
      changeType: diff.changeType,
      before: normalizeValue(diff.before),
      after: normalizeValue(diff.after),
      changeReason: item.changeReason || "",
      reviewSummary: item.reviewSummary || "",
    }));

    const mitigationRows = item.mitigationDiffs.flatMap((mitigationDiff) => mitigationDiff.fieldDiffs.map((diff) => ({
      rowType: "mitigation_field",
      changeCategory: item.changeCategory,
      code: item.code,
      title: item.title,
      orgName: item.orgName,
      fromCycle: item.fromCycle,
      toCycle: item.toCycle,
      mitigationRowKey: mitigationDiff.rowKey,
      mitigationChangeType: mitigationDiff.changeType,
      field: diff.field,
      label: diff.label,
      changeType: diff.changeType,
      before: normalizeValue(diff.before),
      after: normalizeValue(diff.after),
      changeReason: item.changeReason || "",
      reviewSummary: item.reviewSummary || "",
    })));

    if (fieldRows.length === 0 && mitigationRows.length === 0) {
      return [{
        rowType: "risk",
        changeCategory: item.changeCategory,
        code: item.code,
        title: item.title,
        orgName: item.orgName,
        fromCycle: item.fromCycle,
        toCycle: item.toCycle,
        mitigationRowKey: "",
        mitigationChangeType: "",
        field: "",
        label: "",
        changeType: "",
        before: "",
        after: "",
        changeReason: item.changeReason || "",
        reviewSummary: item.reviewSummary || "",
      }];
    }

    return [...fieldRows, ...mitigationRows];
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportRiskCycleDetailCSV(report: RiskCycleDetailedComparisonReport) {
  const rows = buildFlatCSVRows(report);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${baseFilename(report)}.csv`);
}

export async function exportRiskCycleDetailXLSX(report: RiskCycleDetailedComparisonReport) {
  const output = await createRiskCycleDetailWorkbookBuffer(report);
  downloadBlob(
    new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${baseFilename(report)}.xlsx`
  );
}
