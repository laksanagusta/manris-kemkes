import { Check, Minus, Pencil } from "@/components/ui/icons";

import { cn } from "@/lib/utils";

export type SemesterIndicatorStatus = "complete" | "draft" | "empty" | "error";

const iconByStatus = {
  complete: Check,
  draft: Pencil,
  empty: Minus,
  error: Minus,
};

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
    <span
      aria-label={statusLabel}
      className={cn(
        "flex h-6 items-center justify-center gap-1 rounded-full border-0 px-1.5 text-[10px] font-semibold",
        status === "complete" && "bg-emerald-100 text-emerald-700",
        status === "draft" && "bg-amber-100 text-amber-700",
        status === "empty" && "bg-muted text-muted-foreground",
        status === "error" && "bg-red-100 text-red-500",
      )}
    >
      <Icon aria-hidden="true" className="size-2.5" />
      {label}
    </span>
  );
}
