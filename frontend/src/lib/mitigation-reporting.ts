import { businessNow } from "./business-clock.ts";
export interface MitigationSubmissionActionState {
  allowed: boolean;
  message?: string;
  isOverdue: boolean;
}

const jakartaDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function normalizeDateOnly(value: string): number | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return timestamp;
}

export function isWithinMitigationSubmissionWindow(
  periodEnd: string,
  dueDate: string,
  now: Date = businessNow(),
): { allowed: boolean; message?: string } {
  const periodEndMs = normalizeDateOnly(periodEnd);
  const dueDateMs = normalizeDateOnly(dueDate);

  if (periodEndMs === null || dueDateMs === null) {
    return { allowed: false, message: "Jadwal pelaporan belum tersedia." };
  }

  const periodEndDate = new Date(periodEndMs);
  const dueDateObj = new Date(dueDateMs);
  const hPlus1Ms = Date.UTC(
    periodEndDate.getUTCFullYear(),
    periodEndDate.getUTCMonth(),
    periodEndDate.getUTCDate() + 1,
  );
  const dueDateEndMs = Date.UTC(
    dueDateObj.getUTCFullYear(),
    dueDateObj.getUTCMonth(),
    dueDateObj.getUTCDate(),
    23,
    59,
    59,
  );
  const currentMs = Date.parse(jakartaDate.format(now));

  const hPlus1Str = new Date(hPlus1Ms).toLocaleDateString("id-ID", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const dueDateStr = new Date(dueDateEndMs).toLocaleDateString("id-ID", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (periodEndMs === dueDateMs) {
    if (currentMs > dueDateEndMs) {
      return {
        allowed: false,
        message: `Batas pengiriman laporan telah berakhir pada ${dueDateStr}`,
      };
    }
    return { allowed: true };
  }

  if (currentMs < hPlus1Ms) {
    return {
      allowed: false,
      message: `Laporan dapat dikirim mulai ${hPlus1Str} (H+1 setelah periode berakhir)`,
    };
  }

  if (currentMs > dueDateEndMs) {
    return {
      allowed: false,
      message: `Batas pengiriman laporan telah berakhir pada ${dueDateStr}`,
    };
  }

  return { allowed: true };
}

export function getMitigationSubmissionActionState(
  periodEnd: string,
  dueDate: string,
  now: Date = businessNow(),
): MitigationSubmissionActionState {
  const submissionWindow = isWithinMitigationSubmissionWindow(periodEnd, dueDate, now);
  if (submissionWindow.allowed) {
    return { allowed: true, message: "Siap lapor progres", isOverdue: false };
  }

  const dueDateMs = normalizeDateOnly(dueDate);
  if (dueDateMs !== null && normalizeDateOnly(periodEnd) !== null) {
    const currentMs = Date.parse(jakartaDate.format(now));
    if (currentMs > dueDateMs) {
      return {
        allowed: true,
        message: "Terlambat, tetap bisa lapor progres",
        isOverdue: true,
      };
    }
  }

  return { allowed: false, message: submissionWindow.message, isOverdue: false };
}

export function getMitigationTaskReportAction(
  task: { status: string; periodEnd: string; dueDate: string },
  now?: Date,
): MitigationSubmissionActionState & { label: string } {
  if (task.status === "done") return { allowed: false, isOverdue: false, label: "Lihat laporan" };
  if (task.status === "not_reported") {
    return {
      allowed: false,
      isOverdue: false,
      label: "Lihat detail",
      message: "Pemantauan periode ini sudah difinalisasi tanpa laporan untuk tindakan ini.",
    };
  }
  if (task.status !== "pending" && task.status !== "overdue") {
    return { allowed: false, isOverdue: false, label: "Lihat detail" };
  }

  const state = getMitigationSubmissionActionState(task.periodEnd, task.dueDate, now);
  const reportLabel = state.isOverdue ? "Lapor terlambat" : "Isi laporan";
  return {
    ...state,
    label: state.allowed ? reportLabel : "Lihat jadwal pelaporan",
  };
}
