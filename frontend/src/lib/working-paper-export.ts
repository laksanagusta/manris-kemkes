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
  fgColor: { argb: "FF1F4E79" },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
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
    for (let c = 1; c <= columnCount; c++) {
      row.getCell(c).border = THIN_BORDER;
    }
  }
}

function buildProfilRisikoSheet(
  workbook: ExcelJS.Workbook,
  risks: ExportableRiskRow[],
): void {
  const ws = workbook.addWorksheet("Profil Risiko");

  ws.columns = [
    { header: "No", key: "no", width: 5 },
    { header: "Kode Risiko", key: "kode_risiko", width: 14 },
    { header: "Uraian Risiko", key: "uraian_risiko", width: 32 },
    { header: "Kategori Risiko", key: "kategori_risiko", width: 18 },
    { header: "Pemilik Risiko", key: "pemilik_risiko", width: 20 },
    { header: "Sebab", key: "sebab", width: 28 },
    { header: "Sumber Risiko", key: "sumber_risiko", width: 18 },
    { header: "Dampak", key: "dampak", width: 28 },
    { header: "Probabilitas", key: "probabilitas", width: 13 },
    { header: "Dampak Score", key: "dampak_score", width: 13 },
    { header: "Bobot", key: "bobot", width: 10 },
    { header: "Nilai Risiko", key: "nilai_risiko", width: 13 },
    { header: "Tingkat Risiko", key: "tingkat_risiko", width: 15 },
    { header: "Prioritas Risiko", key: "prioritas_risiko", width: 16 },
  ];

  const colCount = ws.columns.length;
  applyHeaderRow(ws, colCount);

  risks.forEach((risk, index) => {
    ws.addRow({
      no: index + 1,
      kode_risiko: risk.code,
      uraian_risiko: risk.title,
      kategori_risiko: risk.category,
      pemilik_risiko: risk.org_name,
      sebab: joinArray(risk.sebab),
      sumber_risiko: safeStr(risk.sumber_risiko),
      dampak: joinArray(risk.dampak),
      probabilitas: risk.probability,
      dampak_score: risk.impact,
      bobot: risk.bobot,
      nilai_risiko: risk.nilai,
      tingkat_risiko: safeStr(risk.tingkat_risiko),
      prioritas_risiko: risk.prioritas_risiko,
    });
  });

  applyDataBorders(ws, 2, risks.length + 1, colCount);
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

function buildPenilaianRisikoSheet(
  workbook: ExcelJS.Workbook,
  risks: ExportableRiskRow[],
): void {
  const ws = workbook.addWorksheet("KK Penilaian Risiko");

  ws.columns = [
    { header: "No", key: "no", width: 5 },
    { header: "Kode Risiko", key: "kode_risiko", width: 14 },
    { header: "Uraian Risiko", key: "uraian_risiko", width: 32 },
    { header: "Pengendalian - Uraian", key: "pengendalian_uraian", width: 28 },
    { header: "Pengendalian - Efektif", key: "pengendalian_efektif", width: 18 },
    { header: "Pengendalian - Ada Tidak Efektif", key: "pengendalian_ada_tidak_efektif", width: 22 },
    { header: "Selera Risiko", key: "selera_risiko", width: 16 },
    { header: "Penanganan Risiko", key: "penanganan_risiko", width: 20 },
    { header: "RPR - Uraian", key: "rpr_uraian", width: 28 },
    { header: "RPR - Jadwal", key: "rpr_jadwal", width: 18 },
    { header: "RPR - Penanggung Jawab", key: "rpr_penanggung_jawab", width: 22 },
  ];

  const colCount = ws.columns.length;
  applyHeaderRow(ws, colCount);

  risks.forEach((risk, index) => {
    ws.addRow({
      no: index + 1,
      kode_risiko: risk.code,
      uraian_risiko: risk.title,
      pengendalian_uraian: safeStr(risk.pengendalian_uraian),
      pengendalian_efektif: safeStr(risk.pengendalian_efektif),
      pengendalian_ada_tidak_efektif: safeStr(risk.pengendalian_ada_tidak_efektif),
      selera_risiko: safeStr(risk.selera_risiko),
      penanganan_risiko: safeStr(risk.penanganan_risiko),
      rpr_uraian: safeStr(risk.rpr_uraian),
      rpr_jadwal: safeStr(risk.rpr_jadwal),
      rpr_penanggung_jawab: safeStr(risk.rpr_penanggung_jawab),
    });
  });

  applyDataBorders(ws, 2, risks.length + 1, colCount);
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

function buildPemantauanReviuSheet(
  workbook: ExcelJS.Workbook,
  risks: ExportableRiskRow[],
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
  });

  applyDataBorders(ws, 2, risks.length + 1, colCount);
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

  ws.mergeCells("A1:H1");
  const hashCell = ws.getCell("A1");
  hashCell.value = `Document Hash: ${workingPaper.document_hash ?? "-"}`;
  hashCell.font = { bold: true, size: 11 };
  hashCell.alignment = { vertical: "middle" };
  ws.getRow(1).height = 24;

  const headerColumns = [
    { header: "Urutan", width: 9 },
    { header: "Nama", width: 24 },
    { header: "NIP", width: 22 },
    { header: "Jabatan", width: 24 },
    { header: "Peran", width: 20 },
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
    row.getCell(4).value = sig.signer_title;
    row.getCell(5).value = sig.signer_role_label;
    row.getCell(6).value = sig.status === "signed" ? "Ditandatangani" : "Menunggu";
    row.getCell(7).value = formatDate(sig.signed_at);
    row.getCell(8).value = "";

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
  ws.mergeCells(`A${footerRowNum}:H${footerRowNum}`);
  const footerCell = ws.getCell(`A${footerRowNum}`);
  footerCell.value = "Dokumen ini ditandatangani secara elektronik melalui Manris";
  footerCell.font = { italic: true, size: 10, color: { argb: "FF666666" } };
  footerCell.alignment = { horizontal: "center", vertical: "middle" };
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

  buildProfilRisikoSheet(workbook, risks);
  buildPenilaianRisikoSheet(workbook, risks);
  buildPemantauanReviuSheet(workbook, risks);
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
