export type MitigationReportState = { status: string; reportedAt?: string | null; notes?: string | null };

const executionLabels = new Map([
  ["pending", "Sedang dilaksanakan"],
  ["done", "Selesai"],
  ["skipped", "Belum dilaksanakan"],
]);
const reportNoteEncoder = new TextEncoder();

export function getMitigationExecutionLabel(status: string): string | undefined {
  return executionLabels.get(status);
}

export function hasReportedMitigation(task: MitigationReportState): boolean {
  if (!task.reportedAt || !executionLabels.has(task.status)) return false;
  const length = reportNoteEncoder.encode(task.notes?.trim() ?? "").length;
  return length >= 10 && length <= 1000;
}

export function getMitigationReportLabel(task: MitigationReportState): string {
  if (hasReportedMitigation(task)) {
    return `${getMitigationExecutionLabel(task.status)} · Dilaporkan`;
  }
  switch (task.status) {
    case "done": return "Laporan belum lengkap";
    case "overdue": return "Terlambat";
    case "not_reported": return "Tidak dilaporkan";
    case "skipped": return "Dilewati";
    default: return "Belum dilaporkan";
  }
}
