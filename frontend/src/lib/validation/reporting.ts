export interface MitigationReportFormValues {
  evidenceUrl: string;
  notes: string;
}

type FieldErrors<T extends string> = Partial<Record<T, string>>;

const MAX_NOTES_LENGTH = 1000;

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateMitigationReportForm(
  values: MitigationReportFormValues
): FieldErrors<keyof MitigationReportFormValues> {
  const errors: FieldErrors<keyof MitigationReportFormValues> = {};

  const evidenceUrl = values.evidenceUrl.trim();
  if (evidenceUrl && !isValidHttpUrl(evidenceUrl)) {
    errors.evidenceUrl = "Link bukti harus berupa URL http:// atau https:// yang valid.";
  }

  const notes = values.notes.trim();
  if (!notes) {
    errors.notes = "Catatan pelaksanaan wajib diisi.";
  } else if (notes.length < 10) {
    errors.notes = "Catatan pelaksanaan minimal 10 karakter.";
  } else if (notes.length > MAX_NOTES_LENGTH) {
    errors.notes = `Catatan pelaksanaan maksimal ${MAX_NOTES_LENGTH} karakter.`;
  }

  return errors;
}

export function normalizeMitigationReportPayload(values: MitigationReportFormValues) {
  return {
    evidenceUrl: values.evidenceUrl.trim(),
    notes: values.notes.trim(),
  };
}
