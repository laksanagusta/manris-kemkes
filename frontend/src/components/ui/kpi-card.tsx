import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type KpiCardTone = "white" | "zinc" | "emerald" | "rose";

type KpiCardProps = {
  label: ReactNode;
  value: ReactNode;
  tone?: KpiCardTone;
  icon?: ReactNode;
  description?: ReactNode;
  className?: string;
  valueClassName?: string;
  valueWrapClassName?: string;
  labelClassName?: string;
  descriptionClassName?: string;
} & React.ComponentPropsWithoutRef<"div">;

const toneStyles: Record<
  KpiCardTone,
  {
    container: string;
    label: string;
    value: string;
    valueWrap: string;
    description: string;
  }
> = {
  white: {
    container:
      "min-h-[108px] rounded-xl px-4 py-4 ring-1 ring-inset bg-white ring-zinc-200/80",
    label:
      "text-xs font-medium uppercase tracking-[0.14em] text-zinc-500 text-pretty",
    value:
      "text-2xl font-semibold tabular-nums text-zinc-900 tracking-tight leading-none",
    valueWrap: "mt-3 flex items-baseline gap-1",
    description: "mt-2 text-[11px] text-zinc-500",
  },
  zinc: {
    container:
      "min-h-[108px] rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-4",
    label: "text-xs font-medium uppercase tracking-[0.14em] text-zinc-500",
    value: "mt-1 text-xl font-semibold tabular-nums text-zinc-900 leading-none",
    valueWrap: "mt-3 flex items-center justify-between gap-3",
    description: "mt-2 text-[11px] text-zinc-500",
  },
  emerald: {
    container:
      "min-h-[108px] rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-4",
    label: "text-xs font-medium uppercase tracking-[0.14em] text-emerald-700",
    value:
      "mt-1 text-xl font-semibold tabular-nums text-emerald-900 leading-none",
    valueWrap: "mt-3 flex items-center justify-between gap-3",
    description: "mt-2 text-[11px] text-emerald-800/70",
  },
  rose: {
    container:
      "min-h-[108px] rounded-lg border border-rose-200 bg-rose-50/60 px-4 py-4",
    label: "text-xs font-medium uppercase tracking-[0.14em] text-rose-700",
    value: "mt-1 text-xl font-semibold tabular-nums text-rose-900 leading-none",
    valueWrap: "mt-3 flex items-center justify-between gap-3",
    description: "mt-2 text-[11px] text-rose-800/70",
  },
};

export function KpiCard({
  label,
  value,
  tone = "zinc",
  icon,
  description,
  className,
  valueClassName,
  valueWrapClassName,
  labelClassName,
  descriptionClassName,
  ...rest
}: KpiCardProps) {
  const styles = toneStyles[tone];

  return (
    <div className={cn(styles.container, className)} {...rest}>
      <p className={cn(styles.label, labelClassName)}>{label}</p>
      <div className={cn(styles.valueWrap, valueWrapClassName)}>
        <p className={cn(styles.value, valueClassName)}>{value}</p>
        {icon ? <div className="shrink-0">{icon}</div> : null}
      </div>
      {description ? (
        <p className={cn(styles.description, descriptionClassName)}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
