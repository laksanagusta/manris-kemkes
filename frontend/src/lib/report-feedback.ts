import { ApiError } from "@/lib/api";

/** Translate service failures into task-specific recovery instructions. */
export function reportErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Sesi Anda berakhir. Masuk kembali untuk melanjutkan laporan.";
    if (error.status === 403) return "Anda tidak memiliki akses ke data ini. Pilih unit yang dapat diakses atau hubungi administrator.";
    if (error.status === 409) return "Data laporan berubah. Muat ulang laporan sebelum mencoba ekspor lagi.";
    if (error.status === 400) return "Pilihan laporan tidak dapat diproses. Periksa periode dan unit, lalu coba lagi.";
  }
  return fallback;
}
