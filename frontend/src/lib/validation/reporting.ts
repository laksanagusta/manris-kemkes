export interface MitigationReportFormValues {
  evidenceUrl: string;
  notes: string;
}

export interface KRIReportFormValues {
  value: string;
  notes: string;
  evidenceUrl?: string;
}

export interface KRISkipFormValues {
  reason: string;
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

function parseNumberInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;

  return parsed;
}

export function validateMitigationReportForm(
  values: MitigationReportFormValues
): FieldErrors<keyof MitigationReportFormValues> {
  const errors: FieldErrors<keyof MitigationReportFormValues> = {};

  const evidenceUrl = values.evidenceUrl.trim();
  if (!evidenceUrl) {
    errors.evidenceUrl = "Link bukti wajib diisi.";
  } else if (!isValidHttpUrl(evidenceUrl)) {
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

export function validateKRIReportForm(
  values: KRIReportFormValues
): FieldErrors<keyof KRIReportFormValues> {
  const errors: FieldErrors<keyof KRIReportFormValues> = {};

  const value = parseNumberInput(values.value);
  if (value === null) {
    errors.value = "Nilai KRI wajib diisi.";
  } else if (value < 0) {
    errors.value = "Nilai KRI tidak boleh negatif.";
  }

  const notes = values.notes.trim();
  if (notes.length > MAX_NOTES_LENGTH) {
    errors.notes = `Catatan maksimal ${MAX_NOTES_LENGTH} karakter.`;
  }

  const evidenceUrl = values.evidenceUrl?.trim() || "";
  if (evidenceUrl && !isValidHttpUrl(evidenceUrl)) {
    errors.evidenceUrl = "Link bukti harus berupa URL http:// atau https:// yang valid.";
  }

  return errors;
}

export function normalizeKRIReportPayload(values: KRIReportFormValues) {
  return {
    value: Number(values.value.trim()),
    notes: values.notes.trim(),
    evidenceUrl: values.evidenceUrl?.trim() || undefined,
  };
}

export function validateKRISkipForm(
  values: KRISkipFormValues
): FieldErrors<keyof KRISkipFormValues> {
  const errors: FieldErrors<keyof KRISkipFormValues> = {};
  const reason = values.reason.trim();

  if (!reason) {
    errors.reason = "Alasan skip wajib diisi.";
  } else if (reason.length < 5) {
    errors.reason = "Alasan skip minimal 5 karakter.";
  } else if (reason.length > MAX_NOTES_LENGTH) {
    errors.reason = `Alasan skip maksimal ${MAX_NOTES_LENGTH} karakter.`;
  }

  return errors;
}
