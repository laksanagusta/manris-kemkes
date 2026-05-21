import { cn } from "@/lib/utils";

const BASE_CLASS =
  "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2 py-0 text-[10px] font-medium whitespace-nowrap tracking-tight";

const TONES: Record<string, string> = {
  neutral: "border-zinc-200 bg-zinc-50 text-zinc-700",
  progress: "border-violet-200 bg-violet-50 text-violet-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
};

const STATUS_TO_TONE: Record<string, keyof typeof TONES> = {
  draft: "neutral",
  signing: "progress",
  completed: "success",
  cancelled: "danger",
  assessment_draft: "neutral",
  assessment_in_review: "progress",
  approved: "success",
  reviewed: "progress",
  pending_review: "warning",
  archived: "neutral",
  ongoing: "progress",
  pending: "warning",
  done: "success",
  overdue: "danger",
  skipped: "neutral",
};

export function getLinearStatusBadgeClass(status?: string | null) {
  const normalized = (status ?? "").trim().toLowerCase();
  const tone = STATUS_TO_TONE[normalized] ?? "neutral";
  return cn(BASE_CLASS, TONES[tone]);
}

export function getLinearToneBadgeClass(
  tone: keyof typeof TONES = "neutral",
) {
  return cn(BASE_CLASS, TONES[tone]);
}

export function getLinearRiskLevelBadgeClass(level?: string | null) {
  const normalized = (level ?? "").trim().toLowerCase();

  switch (normalized) {
    case "sangat rendah":
    case "sangat rendah ":
      return getLinearToneBadgeClass("success");
    case "rendah":
      return getLinearToneBadgeClass("info");
    case "sedang":
      return getLinearToneBadgeClass("warning");
    case "tinggi":
    case "sangat tinggi":
      return getLinearToneBadgeClass("danger");
    default:
      return getLinearToneBadgeClass("neutral");
  }
}
