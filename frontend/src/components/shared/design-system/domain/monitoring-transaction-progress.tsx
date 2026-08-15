import { cn } from "@/lib/utils";

export type MonitoringTransactionStatus = string | null | undefined;

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
}: {
  data?: MonitoringTransactionQuarters | null;
  className?: string;
}) {
  const transactions = quarters.map(({ key, label }) => ({
    label,
    status: data?.[key],
  }));
  const completed = transactions.filter(({ status }) => isCompleted(status)).length;
  const total = transactions.length;
  const detail = transactions
    .map(({ label, status }) => `${label}: ${getStatusLabel(status)}`)
    .join(", ");
  const ariaLabel = `${completed} dari ${total} transaksi pemantauan berstatus final${detail ? `. ${detail}` : ""}`;

  return (
    <span
      aria-label={ariaLabel}
      className={cn(
        "inline-flex min-h-5 items-center gap-1.5 whitespace-nowrap",
        className,
      )}
      role="img"
      title={ariaLabel}
    >
      {transactions.map(({ label, status }) => (
        <span
          key={label}
          aria-hidden="true"
          className={cn(
            "h-4 w-3 rounded-[3px]",
            isCompleted(status) ? "bg-foreground" : "bg-muted-foreground/25",
          )}
        />
      ))}
      <span className="text-sm leading-none tabular-nums text-muted-foreground">
        {completed}/{total} transaksi
      </span>
    </span>
  );
}
