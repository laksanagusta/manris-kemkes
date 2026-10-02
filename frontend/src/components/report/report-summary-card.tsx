import type { ComponentProps, ReactNode } from "react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ReportSummaryCard({
  title,
  action,
  children,
  className,
  ...props
}: Omit<ComponentProps<typeof Card>, "title"> & {
  title: string;
  action?: ReactNode;
}) {
  return (
    <Card
      className={cn("scroll-mt-6 rounded-xl border border-border/60 ring-0 gap-6 p-4", className)}
      {...props}
    >
      <CardHeader className="px-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {action ? <CardAction className="text-sm text-secondary-foreground">{action}</CardAction> : null}
      </CardHeader>
      <CardContent className="space-y-6 px-0">{children}</CardContent>
    </Card>
  );
}

export function ReportSummaryMetrics({
  items,
}: {
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,180px)] gap-x-4 gap-y-6">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs text-secondary-foreground">{item.label}</dt>
          <dd className="mt-2 break-words text-2xl font-normal leading-tight tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
