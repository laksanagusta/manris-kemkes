const numberFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatMonitoringNilai(value?: number | null) {
  if (value == null || Number.isNaN(value)) {
    return "-";
  }

  return numberFormatter.format(value);
}

export function formatMonitoringScoreChange(
  sourceValue?: number | null,
  observedValue?: number | null,
) {
  const sourceText = formatMonitoringNilai(sourceValue);
  const observedText = formatMonitoringNilai(observedValue);

  if (sourceText === "-" && observedText === "-") {
    return "-";
  }

  if (observedText === "-") {
    return sourceText;
  }

  return `${sourceText} -> ${observedText}`;
}

export function formatMonitoringReviewNext(
  reviewScheduleText?: string | null,
  nextReviewDate?: string | null,
) {
  const text = reviewScheduleText?.trim();
  if (text) {
    return text;
  }

  if (!nextReviewDate) {
    return "-";
  }

  const parsed = new Date(nextReviewDate);
  if (Number.isNaN(parsed.getTime())) {
    return nextReviewDate;
  }

  return dateFormatter.format(parsed);
}

export function getMonitoringTransactionStatusLabel(status?: string) {
  switch (status) {
    case "draft":
      return "Draft";
    case "finalized":
      return "Final";
    case "void":
      return "Void";
    default:
      return status || "-";
  }
}

export function getMonitoringTransactionHref(
  risk: { id: string },
) {
  return `/risk/monitoring/${risk.id}`;
}

export function getMonitoringTransactionActionLabel(
  status?: string,
) {
  if (status === "draft") {
    return "Lanjutkan Pemantauan";
  }

  return "Lihat Hasil Pemantauan";
}
