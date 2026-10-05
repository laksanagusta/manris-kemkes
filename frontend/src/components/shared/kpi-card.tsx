import { MotionNumber } from "@/components/shared/design-system/motion/motion-primitives";
import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function KpiCard({
  label,
  value,
  tone,
  icon,
  className,
  valueClassName,
  valueWrapClassName,
  labelClassName,
  ...rest
}: KpiCardProps) {
  void tone;
  return (
    <Card className={cn("gap-2", className)} {...rest}>
      <CardHeader>
        <CardTitle className={cn("text-xs text-muted-foreground", labelClassName)}>
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={valueWrapClassName ?? "flex items-center justify-between gap-3"}>
          <p className={valueClassName ?? "text-2xl font-semibold tabular-nums"}>{typeof value === "string" || typeof value === "number" ? <MotionNumber value={value} /> : value}</p>
          {icon ? <div className="shrink-0">{icon}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}
