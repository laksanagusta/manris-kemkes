import type { BadgeVariant } from "@/components/ui/badge";
import { getStatusBadgeClassName } from "@/lib/badge-variant";

const STATUS_TO_VARIANT: Record<string, BadgeVariant> = {
  draft: "secondary",
  signing: "default",
  completed: "default",
  cancelled: "destructive",
  final: "default",
  generated: "default",
  submitted: "default",
  approved: "default",
  revision_requested: "default",
  pending_signing: "default",
  reviewed: "default",
  pending_review: "default",
  in_progress: "default",
  "in-progress": "default",
  "in progress": "default",
  on_progress: "default",
  "on-progress": "default",
  "on progress": "default",
  progress: "default",
  finalized: "default",
  success: "default",
  archived: "secondary",
  ongoing: "default",
  pending: "default",
  done: "default",
  overdue: "destructive",
  cancel: "destructive",
  canceled: "destructive",
  skipped: "secondary",
  not_reported: "destructive",
  active: "default",
  inactive: "secondary",
};

export function getLinearStatusBadgeTone(status?: string | null): BadgeVariant {
  const normalized = (status ?? "").trim().toLowerCase();
  return STATUS_TO_VARIANT[normalized] ?? "secondary";
}

export function getLinearStatusBadgeClassName(status?: string | null): string {
  return getStatusBadgeClassName(status);
}

export function getLinearRiskLevelBadgeTone(level?: string | null): BadgeVariant {
  const normalized = (level ?? "").trim().toLowerCase();

  switch (normalized) {
    case "sangat rendah":
      return "default";
    case "rendah":
      return "outline";
    case "sedang":
      return "outline";
    case "tinggi":
    case "sangat tinggi":
      return "destructive";
    default:
      return "secondary";
  }
}
