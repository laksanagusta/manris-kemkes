export type BadgeTone =
  | "neutral"
  | "progress"
  | "success"
  | "warning"
  | "danger"
  | "info";

const STATUS_TO_TONE: Record<string, BadgeTone> = {
  draft: "neutral",
  signing: "progress",
  completed: "success",
  cancelled: "danger",
  final: "success",
  reviewed: "progress",
  pending_review: "warning",
  archived: "neutral",
  ongoing: "progress",
  pending: "warning",
  done: "success",
  overdue: "danger",
  skipped: "neutral",
};

export function getLinearStatusBadgeTone(status?: string | null): BadgeTone {
  const normalized = (status ?? "").trim().toLowerCase();
  return STATUS_TO_TONE[normalized] ?? "neutral";
}

export function getLinearRiskLevelBadgeTone(level?: string | null): BadgeTone {
  const normalized = (level ?? "").trim().toLowerCase();

  switch (normalized) {
    case "sangat rendah":
      return "success";
    case "rendah":
      return "info";
    case "sedang":
      return "warning";
    case "tinggi":
    case "sangat tinggi":
      return "danger";
    default:
      return "neutral";
  }
}
