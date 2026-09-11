import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type KpiCardTone = "white" | "zinc" | "emerald" | "rose";

type KpiCardProps = {
  label: ReactNode;
  value: ReactNode;
  tone?: KpiCardTone;
  icon?: ReactNode;
  className?: string;
  valueClassName?: string;
  valueWrapClassName?: string;
  labelClassName?: string;
} & React.ComponentPropsWithoutRef<"div">;

const toneStyles: Record<
  KpiCardTone,
  {
    container: string;
    label: string;
    value: string;
    valueWrap: string;
  }
> = {
  white: {
    container:
      "surface-hairline min-h-[100px] rounded-xl bg-card px-5 py-5",
    label:
      "text-[13px] leading-4 font-medium tracking-normal text-muted-foreground text-pretty",
    value:
      "text-[28px] font-semibold tabular-nums text-foreground tracking-tight leading-none",
    valueWrap: "mt-3 flex items-baseline gap-1",
  },
  zinc: {
    container:
      "surface-hairline min-h-[100px] rounded-lg bg-muted px-5 py-5",
    label: "text-[13px] leading-4 font-medium tracking-normal text-muted-foreground",
    value: "text-[28px] font-semibold tabular-nums text-foreground leading-none",
    valueWrap: "mt-3 flex items-center justify-between gap-3",
  },
  emerald: {
    container:
      "surface-hairline min-h-[100px] rounded-lg bg-emerald-50/60 px-5 py-5",
    label: "text-[13px] leading-4 font-medium tracking-normal text-emerald-700",
    value:
      "text-[28px] font-semibold tabular-nums text-emerald-900 leading-none",
    valueWrap: "mt-3 flex items-center justify-between gap-3",
  },
  rose: {
    container:
      "surface-hairline min-h-[100px] rounded-lg bg-rose-50/60 px-5 py-5",
    label: "text-[13px] leading-4 font-medium tracking-normal text-rose-700",
    value: "text-[28px] font-semibold tabular-nums text-rose-900 leading-none",
    valueWrap: "mt-3 flex items-center justify-between gap-3",
  },
};

export function KpiCard({
  label,
  value,
  tone = "white",
  icon,
  className,
  valueClassName,
  valueWrapClassName,
  labelClassName,
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
    </div>
  );
}
