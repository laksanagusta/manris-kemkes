function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const typedError = error as { message?: string; error?: string };
    return typedError.message || typedError.error || "";
  }

  return typeof error === "string" ? error : "";
}

function isExistingCurrentCycleReassessmentError(message: string): boolean {
  return /reassessment|pemantauan/i.test(message) &&
    /already exists|sudah ada|telah ada/i.test(message) &&
    /current cycle|siklus saat ini|cycle saat ini/i.test(message) &&
    /in progress|ongoing|masih berjalan|draft/i.test(message);
}

export function getWorkingPaperCreateErrorMessage(error: unknown): string {
  const message = getErrorMessage(error);

  if (isExistingCurrentCycleReassessmentError(message)) {
    return "Kertas kerja tidak bisa dibuat karena draft pemantauan untuk siklus saat ini sudah ada dan masih berjalan.";
  }

  return "Gagal membuat kertas kerja.";
}
