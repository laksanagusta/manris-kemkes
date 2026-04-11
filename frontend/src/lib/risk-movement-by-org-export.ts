import ExcelJS from "exceljs";

import type { MovementByOrgDatum } from "@/lib/dashboard-insights";
import { downloadBlob } from "@/lib/risk-export";

const headerFill: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1E3A5F" },
};

const summaryFill: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFEEEEEE" },
};

const altRowFill: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFAFAFA" },
};

const naikDark: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4CCCC" } };
const naikMedium: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE4EC" } };
const naikLight: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF0F0" } };

const turunDark: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8E6C9" } };
const turunMedium: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } };
const turunLight: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F8E9" } };

const stabilFill: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5F5" } };

const fontRed: Partial<ExcelJS.Font> = { color: { argb: "FFC62828" } };
const fontGreen: Partial<ExcelJS.Font> = { color: { argb: "FF2E7D32" } };

function naikFillForValue(value: number): ExcelJS.FillPattern | null {
  if (value >= 5) return naikDark;
  if (value >= 3) return naikMedium;
  if (value >= 1) return naikLight;
  return null;
}

function turunFillForValue(value: number): ExcelJS.FillPattern | null {
  if (value >= 5) return turunDark;
  if (value >= 3) return turunMedium;
  if (value >= 1) return turunLight;
  return null;
}

function thinBorder(side: "bottom" | "top", style: "thin" | "medium" = "thin"): Partial<ExcelJS.Borders> {
  return { [side]: { style, color: { argb: "FF999999" } } };
}

export async function exportMovementByOrgXLSX(
  data: MovementByOrgDatum[],
  fromCycle: string,
  toCycle: string,
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Pergerakan Risiko per Unit");

  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 40;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 12;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 12;

  ws.mergeCells("A1:F1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "Laporan Pergerakan Risiko per Organisasi";
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: "left", vertical: "middle" };

  ws.mergeCells("A2:F2");
  const subtitleCell = ws.getCell("A2");
  subtitleCell.value = `Perbandingan ${fromCycle} ke ${toCycle}`;
  subtitleCell.font = { size: 11, color: { argb: "FF888888" } };
  subtitleCell.alignment = { horizontal: "left", vertical: "middle" };

  const headerLabels = ["No", "Organisasi", "Total Risiko", "Naik \u2191", "Turun \u2193", "Stabil ="];
  const headerRow = ws.getRow(4);

  headerLabels.forEach((label, colIdx) => {
    const cell = headerRow.getCell(colIdx + 1);
    cell.value = label;
    cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill = headerFill;
    cell.border = thinBorder("bottom");
    cell.alignment = {
      horizontal: colIdx === 1 ? "left" : "center",
      vertical: "middle",
    };
  });

  const dataStartRow = 5;

  data.forEach((datum, idx) => {
    const rowNum = dataStartRow + idx;
    const row = ws.getRow(rowNum);
    const isEvenRow = idx % 2 === 1;

    const noCell = row.getCell(1);
    noCell.value = idx + 1;
    noCell.alignment = { horizontal: "center", vertical: "middle" };
    if (isEvenRow) noCell.fill = altRowFill;

    const orgCell = row.getCell(2);
    orgCell.value = datum.orgName;
    orgCell.alignment = { horizontal: "left", vertical: "middle" };
    if (isEvenRow) orgCell.fill = altRowFill;

    const totalCell = row.getCell(3);
    totalCell.value = datum.total;
    totalCell.alignment = { horizontal: "right", vertical: "middle" };
    if (isEvenRow) totalCell.fill = altRowFill;

    const naikCell = row.getCell(4);
    naikCell.value = datum.naik;
    naikCell.alignment = { horizontal: "right", vertical: "middle" };
    const naikCellFill = naikFillForValue(datum.naik);
    if (naikCellFill) {
      naikCell.fill = naikCellFill;
      naikCell.font = fontRed;
    } else if (isEvenRow) {
      naikCell.fill = altRowFill;
    }

    const turunCell = row.getCell(5);
    turunCell.value = datum.turun;
    turunCell.alignment = { horizontal: "right", vertical: "middle" };
    const turunCellFill = turunFillForValue(datum.turun);
    if (turunCellFill) {
      turunCell.fill = turunCellFill;
      turunCell.font = fontGreen;
    } else if (isEvenRow) {
      turunCell.fill = altRowFill;
    }

    const stabilCell = row.getCell(6);
    stabilCell.value = datum.stabil;
    stabilCell.alignment = { horizontal: "right", vertical: "middle" };
    if (datum.stabil > 0) {
      stabilCell.fill = stabilFill;
    } else if (isEvenRow) {
      stabilCell.fill = altRowFill;
    }
  });

  const summaryRowNum = dataStartRow + data.length;
  const summaryRow = ws.getRow(summaryRowNum);
  const topBorder: Partial<ExcelJS.Borders> = { top: { style: "medium", color: { argb: "FF999999" } } };

  const totals = data.reduce(
    (acc, d) => ({
      total: acc.total + d.total,
      naik: acc.naik + d.naik,
      turun: acc.turun + d.turun,
      stabil: acc.stabil + d.stabil,
    }),
    { total: 0, naik: 0, turun: 0, stabil: 0 },
  );

  const summaryNoCell = summaryRow.getCell(1);
  summaryNoCell.value = "";
  summaryNoCell.fill = summaryFill;
  summaryNoCell.border = topBorder;

  const summaryOrgCell = summaryRow.getCell(2);
  summaryOrgCell.value = "TOTAL";
  summaryOrgCell.font = { bold: true };
  summaryOrgCell.alignment = { horizontal: "left", vertical: "middle" };
  summaryOrgCell.fill = summaryFill;
  summaryOrgCell.border = topBorder;

  const summaryValues = [totals.total, totals.naik, totals.turun, totals.stabil];
  summaryValues.forEach((val, colOffset) => {
    const cell = summaryRow.getCell(3 + colOffset);
    cell.value = val;
    cell.font = { bold: true };
    cell.alignment = { horizontal: "right", vertical: "middle" };
    cell.fill = summaryFill;
    cell.border = topBorder;
  });

  ws.views = [{ state: "frozen", ySplit: 4 }];
  ws.autoFilter = `A4:F${summaryRowNum}`;

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `pergerakan-risiko-per-unit-${toCycle}.xlsx`;
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}
