import { Check, Minus, Pencil } from "@/components/ui/icons";

import { Badge } from "@/components/ui/badge";

export type SemesterIndicatorStatus = "complete" | "draft" | "empty" | "error";

const iconByStatus = {
  complete: Check,
  draft: Pencil,
  empty: Minus,
  error: Minus,
};

const toneByStatus = {
  complete: "success",
  draft: "warning",
  empty: "neutral",
  error: "danger",
} as const;

export function SemesterIndicator({
  label,
  status,
  statusLabel,
}: {
  label: string;
  status: SemesterIndicatorStatus;
  statusLabel: string;
}) {
  const Icon = iconByStatus[status];
  return (
    <Badge
      aria-label={statusLabel}
      tone={toneByStatus[status]}
      size="compact"
      className="px-1.5 text-[10px]"
    >
      <Icon aria-hidden="true" className="size-2.5" />
      {label}
    </Badge>
  );
}
