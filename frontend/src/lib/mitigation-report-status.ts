export type MitigationReportState = { status: string; reportedAt?: string | null; notes?: string | null };
export function hasReportedMitigation(task: MitigationReportState): boolean {
  return task.status === "done" && Boolean(task.reportedAt) && (task.notes ?? "").trim().length >= 10;
}
export function getMitigationReportLabel(task: MitigationReportState): string {
  if (hasReportedMitigation(task)) return "Sudah dilaporkan";
  switch (task.status) {
    case "done": return "Laporan belum lengkap";
    case "overdue": return "Terlambat";
    case "not_reported": return "Tidak dilaporkan";
    case "skipped": return "Dilewati";
    default: return "Belum dilaporkan";
  }
}
