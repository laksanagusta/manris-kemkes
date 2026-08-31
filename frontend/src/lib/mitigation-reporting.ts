export interface MitigationSubmissionActionState {
  allowed: boolean;
  message?: string;
  isOverdue: boolean;
}

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
  now: Date = new Date(),
): { allowed: boolean; message?: string } {
  const periodEndMs = normalizeDateOnly(periodEnd);
  const dueDateMs = normalizeDateOnly(dueDate);

  if (periodEndMs === null || dueDateMs === null) {
    return { allowed: false, message: "Invalid date" };
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
  const currentMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  const hPlus1Str = new Date(hPlus1Ms).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const dueDateStr = new Date(dueDateEndMs).toLocaleDateString("id-ID", {
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
  now: Date = new Date(),
): MitigationSubmissionActionState {
  const submissionWindow = isWithinMitigationSubmissionWindow(periodEnd, dueDate, now);
  if (submissionWindow.allowed) {
    return { allowed: true, message: "Siap lapor progres", isOverdue: false };
  }

  const dueDateMs = normalizeDateOnly(dueDate);
  if (dueDateMs !== null) {
    const currentMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
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
