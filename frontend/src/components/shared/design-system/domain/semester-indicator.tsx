import { Check, Minus, Pencil } from "@/components/shared/icons";

import { Badge } from "@/components/ui/badge";

export type SemesterIndicatorStatus = "complete" | "draft" | "empty" | "error";

const iconByStatus = {
  complete: Check,
  draft: Pencil,
  empty: Minus,
  error: Minus,
};

const toneByStatus = {
  complete: "default",
  draft: "outline",
  empty: "secondary",
  error: "destructive",
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
      aria-label={statusLabel} variant={toneByStatus[status]}
      className=""
    >
      <Icon aria-hidden="true" className="size-2.5" />
      {label}
    </Badge>
  );
}
