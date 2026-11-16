import type { VerificationResendOutcome } from "./api/auth";
import { formatDisplayDate } from "./display-date.ts";

interface VerificationResendFeedback {
  title: string;
  description?: string;
  retryTime?: { value: string; label: string };
}

const messages = {
  scheduled: { title: "Pengiriman baru dijadwalkan" },
  existing: { title: "Permintaan digabung dengan pengiriman aktif" },
  unavailable: {
    title: "Pengiriman baru belum tersedia",
    description: "Periksa status verifikasi akun sebelum mencoba lagi.",
  },
} satisfies Record<Exclude<VerificationResendOutcome, "cooldown">, VerificationResendFeedback>;

export function getVerificationResendFeedback(
  outcome: VerificationResendOutcome,
  retryAt?: string,
): VerificationResendFeedback {
  if (outcome !== "cooldown") return messages[outcome];

  const title = "Belum bisa kirim ulang";
  const date = retryAt ? new Date(retryAt) : undefined;
  if (!retryAt || !date || Number.isNaN(date.getTime())) return { title, description: "Coba lagi nanti." };

  return {
    title,
    retryTime: {
      value: retryAt,
      label: `${formatDisplayDate(date, {
        dateStyle: "medium",
        timeStyle: "medium",
        timeZone: "Asia/Jakarta",
      })} WIB`,
    },
  };
}
