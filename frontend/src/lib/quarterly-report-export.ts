import type { QuarterlyReport } from "../types/quarterly-report";
import {
  buildQuarterlyAnalysis,
  movementLabels,
  taskStateLabels,
  conditionLabels,
  severityLabels,
  eventHasRiskLinks,
} from "./quarterly-report";

export async function createQuarterlyReportWorkbook(report: QuarterlyReport) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Manris";
  workbook.created = new Date();
  workbook.title = `Laporan ${report.cycle}`;
  const analysis = buildQuarterlyAnalysis(report);
  type Value = string | number | boolean | null;
  const addSheet = (name: string, headers: string[], rows: Value[][]) => {
    const sheet = workbook.addWorksheet(name, {
      views: [{ state: "frozen", ySplit: 1 }],
      pageSetup: { orientation: "landscape", paperSize: 9 },
    });
    sheet.addRow(headers);
    sheet.addRows(rows);
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, rows.length + 1), column: headers.length },
    };
    sheet.columns.forEach((column, index) => {
      column.width = index === 0 ? 30 : 24;
    });
    sheet.eachRow((row, number) => {
      row.font = { name: "Arial", size: 11, bold: number === 1 };
      row.alignment = { vertical: "top", wrapText: true };
      if (number === 1)
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF2F2F2" },
          };
        });
    });
    return sheet;
  };
  const s = analysis.summary;
  const previous = analysis.previousSummary;
  addSheet(
    "Ringkasan",
    ["Indikator", "Nilai", "Penyebut / Keterangan"],
    [
      ["Periode laporan", report.cycle, "Zona waktu Asia/Jakarta"],
      [
        "Periode pembanding",
        report.comparisonCycle,
        "Profil pada masing-masing periode",
      ],
      [
        "Scope unit",
        report.organizations.map((unit) => unit.name).join("; "),
        `${report.organizations.length} unit`,
      ],
      ["Data dimuat pada", report.generatedAt, "Snapshot dataset halaman"],
      [
        "Data terakhir diperbarui",
        report.dataUpdatedAt ?? null,
        "Data final terbaru untuk periode ini",
      ],
      [
        "Waktu ekspor",
        workbook.created.toISOString(),
        "File adalah salinan saat ekspor",
      ],
      [
        "Jumlah risiko",
        s.total,
        "Profil final aktif pada sebagian atau seluruh kuartal",
      ],
      ["Risiko di atas selera", s.appetite.above, s.total],
      ["Di atas selera (%)", s.appetite.rate, "Skor profil dibulatkan >= 10"],
      ["Target tercapai", s.target.achieved, s.target.eligible],
      [
        "Target tercapai (%)",
        s.target.rate,
        "Observasi final <= target profil efektif",
      ],
      [
        "Belum dapat dinilai",
        s.target.unavailable,
        "Target tidak valid atau observasi belum final",
      ],
      ["Mitigasi terlapor", s.mitigation.reported, s.mitigation.total],
      [
        "Mitigasi terlapor (%)",
        s.mitigation.rate,
        "Laporan valid; bukan tindakan selesai",
      ],
      [
        "Laporan melewati tenggat",
        s.mitigation.overdue,
        "Belum terlapor melewati tanggal tenggat pada saat data dimuat",
      ],
      ["Pemantauan final", s.monitoring.final, s.total],
      [
        "Pemantauan final (%)",
        s.monitoring.rate,
        "Observasi final pada kuartal laporan",
      ],
      ["Risiko memburuk", analysis.movement.up, "Perubahan skor profil"],
      ["Risiko membaik", analysis.movement.down, "Perubahan skor profil"],
      ["Risiko tetap", analysis.movement.stable, "Perubahan skor profil"],
      ["Risiko baru", analysis.movement.new, "Tidak terdapat pada pembanding"],
      [
        "Tidak dalam populasi sekarang",
        analysis.movement.absent,
        "Bukan penurunan skor",
      ],
      ["Jumlah kejadian", s.events.total, "Deduplikasi ID; tanggal kejadian"],
      [
        "Kerugian diketahui (Rp)",
        s.events.knownLossCount ? s.events.knownLoss : null,
        `${s.events.knownLossCount} diketahui; ${s.events.unknownLoss} belum diketahui`,
      ],
      [
        "Kejadian belum terhubung",
        s.events.unlinked,
        "Belum terhubung ke register risiko",
      ],
      [
        "Pembanding: risiko di atas selera",
        previous.appetite.above,
        previous.total,
      ],
      [
        "Pembanding: di atas selera (%)",
        previous.appetite.rate,
        report.comparisonCycle,
      ],
      [
        "Pembanding: target tercapai",
        previous.target.achieved,
        previous.target.eligible,
      ],
      [
        "Pembanding: target tercapai (%)",
        previous.target.rate,
        report.comparisonCycle,
      ],
      [
        "Pembanding: belum dapat dinilai",
        previous.target.unavailable,
        report.comparisonCycle,
      ],
      [
        "Pembanding: mitigasi terlapor",
        previous.mitigation.reported,
        previous.mitigation.total,
      ],
      [
        "Pembanding: mitigasi terlapor (%)",
        previous.mitigation.rate,
        report.comparisonCycle,
      ],
      [
        "Pembanding: pemantauan final",
        previous.monitoring.final,
        previous.total,
      ],
      [
        "Pembanding: pemantauan final (%)",
        previous.monitoring.rate,
        report.comparisonCycle,
      ],
      [
        "Pembanding: risiko di atas selera",
        previous.appetite.above,
        previous.total,
      ],
      [
        "Pembanding: di atas selera (%)",
        previous.appetite.rate,
        report.comparisonCycle,
      ],
      [
        "Pembanding: target tercapai",
        previous.target.achieved,
        previous.target.eligible,
      ],
      [
        "Pembanding: target tercapai (%)",
        previous.target.rate,
        report.comparisonCycle,
      ],
      [
        "Pembanding: belum dapat dinilai",
        previous.target.unavailable,
        report.comparisonCycle,
      ],
      [
        "Pembanding: mitigasi terlapor",
        previous.mitigation.reported,
        previous.mitigation.total,
      ],
      [
        "Pembanding: mitigasi terlapor (%)",
        previous.mitigation.rate,
        report.comparisonCycle,
      ],
      [
        "Pembanding: pemantauan final",
        previous.monitoring.final,
        previous.total,
      ],
      [
        "Pembanding: pemantauan final (%)",
        previous.monitoring.rate,
        report.comparisonCycle,
      ],
      ...report.warnings.map((warning): Value[] => [
        "Keterbatasan data",
        warning,
        null,
      ]),
    ],
  );
  addSheet(
    "Perbandingan unit",
    [
      "Unit",
      "Ketersediaan data",
      "Jumlah risiko",
      "Di atas selera",
      "Di atas selera (%)",
      "Target tercapai",
      "Dapat dinilai",
      "Target tercapai (%)",
      "Belum dapat dinilai",
      "Mitigasi terlapor",
      "Jumlah tugas",
      "Terlapor (%)",
      "Pemantauan final",
      "Pemantauan final (%)",
      "Jumlah kejadian",
    ],
    analysis.units.map((unit) => [
      unit.name,
      unit.hasData ? "Ada data" : "Belum ada data",
      unit.hasData ? unit.summary.total : null,
      unit.summary.total ? unit.summary.appetite.above : null,
      unit.summary.appetite.rate,
      unit.summary.target.eligible ? unit.summary.target.achieved : null,
      unit.summary.target.eligible || null,
      unit.summary.target.rate,
      unit.hasData ? unit.summary.target.unavailable : null,
      unit.summary.mitigation.total ? unit.summary.mitigation.reported : null,
      unit.summary.mitigation.total || null,
      unit.summary.mitigation.rate,
      unit.summary.total ? unit.summary.monitoring.final : null,
      unit.summary.monitoring.rate,
      unit.hasData ? unit.events.length : null,
    ]),
  );
  addSheet(
    "Risiko",
    [
      "Risiko",
      "Kode",
      "Unit",
      "Periode profil",
      "Nilai profil",
      "Profil pembanding",
      "Perubahan",
      "Di atas selera",
      "Pemantauan final",
      "Nilai observasi",
      "Nilai target",
      "Pencapaian target",
      "Perhatian",
      "Diarsipkan dalam periode",
      "Deskripsi",
      "Kategori",
      "Sebab",
      "Dampak",
      "P",
      "D",
      "Bobot",
      "Target P",
      "Target D",
      "Target bobot",
      "Jadwal pelaksanaan",
      "ID",
      "Kelompok versi",
    ],
    analysis.rows.map((row) => [
      row.risk.title,
      row.risk.code || row.risk.riskCode || "",
      row.risk.orgName || "",
      row.risk.assessmentCycle || "",
      row.profile,
      row.previousProfile,
      movementLabels[row.movement],
      row.aboveAppetite,
      row.final,
      row.observed,
      row.target,
      row.targetState === "achieved"
        ? "Tercapai"
        : row.targetState === "missed"
          ? "Belum tercapai"
          : "Belum dapat dinilai",
      row.attention.join("; "),
      Boolean(row.risk.archivedInPeriod),
      row.risk.description || "",
      row.risk.category || "",
      row.risk.cause?.join("; ") || "",
      row.risk.impactDesc?.join("; ") || "",
      row.risk.probability ?? null,
      row.risk.impact ?? null,
      row.risk.weight ?? null,
      row.risk.targetProbability ?? null,
      row.risk.targetImpact ?? null,
      row.risk.targetWeight ?? null,
      row.risk.nextReviewDate || "",
      row.risk.id,
      row.risk.versionGroupId || row.risk.id,
    ]),
  );
  addSheet(
    "Tugas mitigasi",
    [
      "Tindakan",
      "Risiko",
      "Kode risiko",
      "Unit",
      "PIC",
      "Periode tugas",
      "Mulai periode",
      "Akhir periode",
      "Tenggat laporan",
      "Status laporan",
      "Status sumber",
      "Waktu laporan tercatat",
      "Catatan",
      "Output",
      "Hambatan",
      "Bukti URL",
      "Biaya aktual tercatat",
      "ID tugas",
      "ID pemantauan",
    ],
    analysis.tasks.map(({ task, state }) => [
      task.mitigationAction || "",
      task.riskTitle || "",
      task.riskCode || "",
      report.organizations.find((unit) => unit.id === task.organizationId)
        ?.name || "",
      task.mitigationOwner || "",
      task.periodLabel || report.cycle,
      task.periodStart || "",
      task.periodEnd || "",
      task.dueDate || "",
      taskStateLabels[state],
      task.status,
      task.reportedAt || "",
      task.notes || "",
      task.reportOutput || "",
      task.reportObstacle || "",
      task.evidenceUrl || "",
      task.actualCost ?? null,
      task.id,
      task.monitoringId || "",
    ]),
  );
  addSheet(
    "Kejadian",
    [
      "Kejadian",
      "Kode",
      "Unit",
      "Tanggal kejadian",
      "Tingkat",
      "Kondisi pascarespons tercatat",
      "Dampak aktual",
      "Jenis dampak",
      "Respons langsung",
      "Tindak lanjut",
      "Kerugian diketahui",
      "Kerugian (Rp)",
      "Risiko terkait",
      "Lokasi",
      "Pihak terdampak",
      "Bukti URL",
      "Dicatat oleh",
      "Diperbarui pada",
      "ID",
    ],
    analysis.events.map((event) => [
      event.description,
      event.code,
      event.organizationName ||
        report.organizations.find((unit) => unit.id === event.organizationId)
          ?.name ||
        "",
      event.occurredAt,
      severityLabels[event.severity],
      conditionLabels[event.postResponseCondition],
      event.actualImpact || "",
      event.impactTypes?.join("; ") || "",
      event.immediateResponse || "",
      event.ongoingAction || "",
      event.financialLossKnown === true,
      event.financialLossKnown === true &&
      typeof event.financialLoss === "number" &&
      Number.isFinite(event.financialLoss) &&
      event.financialLoss >= 0
        ? event.financialLoss
        : null,
      event.linkedRisks
        ?.map((risk) => `${risk.code}: ${risk.title}`)
        .join("; ") ||
        (eventHasRiskLinks(event)
          ? "Risiko terkait di luar scope"
          : "Belum terhubung"),
      event.location || "",
      event.affectedParties || "",
      event.evidenceUrl || "",
      event.createdByName || "",
      event.updatedAt || "",
      event.id,
    ]),
  );
  return workbook;
}
