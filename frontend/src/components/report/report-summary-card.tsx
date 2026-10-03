import type { ComponentProps, ReactNode } from "react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ReportSummaryCard({
  title,
  icon,
  action,
  children,
  className,
  ...props
}: Omit<ComponentProps<typeof Card>, "title"> & {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card
      className={cn("scroll-mt-6 rounded-3xl border border-border/60 ring-0 gap-6 p-4", className)}
      {...props}
    >
      <CardHeader className="px-0">
        <CardTitle className="flex items-center gap-3 text-lg font-medium">
          {icon ? (
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5"
            >
              {icon}
            </span>
          ) : null}
          {title}
        </CardTitle>
        {action ? <CardAction className="text-sm text-secondary-foreground">{action}</CardAction> : null}
      </CardHeader>
      <CardContent className="px-0">{children}</CardContent>
    </Card>
  );
}

export function ReportSummaryMetrics({
  items,
}: {
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="flex flex-col gap-6 sm:flex-row sm:gap-0 sm:divide-x sm:divide-border">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-1 flex-col sm:px-6 sm:first:pl-0 sm:last:pr-0">
          <dd className="order-1 break-words text-4xl font-semibold leading-tight tabular-nums">{item.value}</dd>
          <dt className="order-2 mt-2 text-sm text-muted-foreground">{item.label}</dt>
        </div>
      ))}
    </dl>
  );
}
