import { cn } from "@/lib/utils";

export type MonitoringTransactionStatus = string | null | undefined;

export type MonitoringTransactionProgressItem = {
  label: string;
  status: MonitoringTransactionStatus;
};

export type MonitoringTransactionQuarters = {
  q1?: MonitoringTransactionStatus;
  q2?: MonitoringTransactionStatus;
  q3?: MonitoringTransactionStatus;
  q4?: MonitoringTransactionStatus;
};

type QuarterKey = keyof MonitoringTransactionQuarters;

const quarters: Array<{ key: QuarterKey; label: string }> = [
  { key: "q1", label: "Q1" },
  { key: "q2", label: "Q2" },
  { key: "q3", label: "Q3" },
  { key: "q4", label: "Q4" },
];

function isCompleted(status: MonitoringTransactionStatus) {
  return status === "final" || status === "finalized";
}

function getStatusLabel(status: MonitoringTransactionStatus) {
  if (isCompleted(status)) return "final";
  if (status === "draft") return "draf";
  if (!status) return "belum tersedia";
  return "tercatat";
}

export function MonitoringTransactionProgress({
  data,
  className,
  items,
  countLabel = "",
  showCount = true,
  ariaLabelOverride,
  nativeTitle = true,
  presentation = "segments",
}: {
  data?: MonitoringTransactionQuarters | null;
  className?: string;
  items?: MonitoringTransactionProgressItem[];
  countLabel?: string;
  showCount?: boolean;
  ariaLabelOverride?: string;
  nativeTitle?: boolean;
  presentation?: "segments" | "meter" | "volume";
}) {
  const transactions =
    items ??
    quarters.map(({ key, label }) => ({
      label,
      status: data?.[key],
    }));
  const completed = transactions.filter(({ status }) => isCompleted(status)).length;
  const total = transactions.length;
  const countContext = countLabel ? `${countLabel} ` : "";
  const detail = transactions
    .map(({ label, status }) => `${label}: ${getStatusLabel(status)}`)
    .join(", ");
  const ariaLabel =
    ariaLabelOverride ??
    (items
      ? `${completed} dari ${total} ${countContext}berstatus selesai${detail ? `. ${detail}` : ""}`
      : `${completed} dari ${total} transaksi pemantauan berstatus final${detail ? `. ${detail}` : ""}`);

  if (presentation === "volume") {
    return (
      <span role="img" aria-label={ariaLabel} title={nativeTitle ? ariaLabel : undefined} className={cn("inline-flex items-center gap-2", className)}>
        <span aria-hidden="true" className="flex items-end gap-1">
          {transactions.map(({ label, status }, index) => (
            <span key={label} className="flex flex-col items-center gap-1">
              <span className="flex h-5 items-end">
                <span className={cn("block w-5 rounded-sm", isCompleted(status) ? "bg-workspace-data" : "bg-secondary")} style={{ height: `${8 + index * 4}px` }} />
              </span>
              <span className="text-xs leading-none text-muted-foreground">{label.split(" ")[0]}</span>
            </span>
          ))}
        </span>
        {showCount && <span aria-hidden="true" className="shrink-0 text-xs font-medium tabular-nums">{completed}/{total}</span>}
      </span>
    );
  }

  if (presentation === "meter") {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return (
      <span
        role="img"
        aria-label={ariaLabel}
        title={nativeTitle ? ariaLabel : undefined}
        className={cn("flex w-full items-center gap-2", className)}
      >
        <span aria-hidden="true" className="h-2.5 min-w-0 max-w-41 flex-1 rounded-full bg-secondary">
          <span className="block h-full rounded-full bg-workspace-data" style={{ width: `${percentage}%` }} />
        </span>
        {showCount && <span aria-hidden="true" className="shrink-0 font-medium tabular-nums">{percentage}%</span>}
      </span>
    );
  }

  return (
    <span
      aria-label={ariaLabel}
      className={cn(
        "inline-flex min-h-5 items-center gap-1.5 whitespace-nowrap",
        className,
      )}
      role="img"
      title={nativeTitle ? ariaLabel : undefined}
    >
      {transactions.map(({ label, status }) => (
        <span
          key={label}
          aria-hidden="true"
          className={cn(
            "h-2 w-3 rounded-full",
            isCompleted(status) ? "bg-workspace-data" : "bg-muted-foreground/25",
          )}
        />
      ))}
      {showCount ? (
        <span className="text-sm leading-none tabular-nums text-muted-foreground">
          {completed}/{total}{countLabel ? ` ${countLabel}` : ""}
        </span>
      ) : null}
    </span>
  );
}
