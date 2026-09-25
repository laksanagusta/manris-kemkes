import type { BadgeVariant } from "@/components/ui/badge";

export type StatusTone =
  | "neutral"
  | "progress"
  | "success"
  | "warning"
  | "danger"
  | "info";

export function toBadgeVariant(
  value: StatusTone | BadgeVariant | string | null | undefined,
): BadgeVariant {
  switch (value) {
    case "danger":
    case "cancel":
    case "cancelled":
    case "canceled":
      return "destructive";
    case "neutral":
      return "secondary";
    case "progress":
    case "info":
    case "medium":
    case "sedang":
    case "in_progress":
    case "in-progress":
    case "in progress":
    case "on_progress":
    case "on-progress":
    case "on progress":
    case "ongoing":
    case "pending":
      return "default";
    case "success":
    case "final":
    case "finalized":
    case "done":
    case "completed":
    case "approved":
    case "reviewed":
    case "active":
      return "default";
    case "submitted":
    case "revision_requested":
    case "pending_signing":
    case "pending_review":
    case "signing":
      return "default";
    case "warning":
      return "outline";
    case "default":
    case "secondary":
    case "destructive":
    case "outline":
    case "ghost":
    case "link":
      return value;
    default:
      return "secondary";
  }
}

export function getStatusBadgeClassName(
  value: StatusTone | BadgeVariant | string | null | undefined,
): string {
  switch ((value ?? "").trim().toLowerCase()) {
    case "progress":
    case "pending":
    case "medium":
    case "sedang":
    case "ongoing":
    case "in_progress":
    case "in-progress":
    case "in progress":
    case "on_progress":
    case "on-progress":
    case "on progress":
    case "submitted":
    case "revision_requested":
    case "pending_signing":
    case "pending_review":
    case "signing":
      return "border-transparent bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
    case "info":
      return "border-transparent bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300";
    case "success":
    case "final":
    case "finalized":
    case "done":
    case "completed":
    case "approved":
    case "reviewed":
    case "active":
      return "border-transparent bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300";
    case "danger":
    case "cancel":
    case "cancelled":
    case "canceled":
      return "border-transparent bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300";
    case "warning":
      return "border-transparent bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
    default:
      return "";
  }
}
