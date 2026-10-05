import { MotionNumber } from "@/components/shared/design-system/motion/motion-primitives";
import type { ComponentProps, ReactNode } from "react";
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ReportSummaryCard({
  title,
  icon,
  action,
  footer,
  children,
  className,
  ...props
}: Omit<ComponentProps<typeof Card>, "title"> & {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card
      data-report-card=""
      className={cn("min-w-0 scroll-mt-6", className)}
      {...props}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon ? (
            <span
              aria-hidden="true"
              className="text-muted-foreground [&_svg]:size-4"
            >
              {icon}
            </span>
          ) : null}
          {title}
        </CardTitle>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-6">{children}</CardContent>
      {footer ? <CardFooter data-report-footer="">{footer}</CardFooter> : null}
    </Card>
  );
}

export function ReportSummaryMetrics({
  items,
  className,
}: {
  items: { label: string; value: ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn("grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-x-6 gap-y-5", className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="mt-2 break-words text-2xl leading-tight tabular-nums">{typeof item.value === "string" || typeof item.value === "number" ? <MotionNumber value={item.value} /> : item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
