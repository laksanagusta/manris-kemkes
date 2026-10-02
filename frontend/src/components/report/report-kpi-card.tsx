import Link from "next/link";
import { TrendingDown, TrendingUp } from "@/components/shared/icons";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type ReportKpiRow = {
  label: string;
  value: string;
};

export type ReportKpiComparison = {
  value: string;
  tooltip: string;
  trend?: "up" | "down";
};

export function ReportKpiCard({
  title,
  value,
  rows,
  comparison,
  href,
  progress,
  tone = "completion",
  loading = false,
}: {
  title: string;
  value: string;
  rows: ReportKpiRow[];
  comparison?: ReportKpiComparison;
  href?: string;
  progress?: number | null;
  tone?: "completion" | "risk";
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card className="h-full" aria-busy="true">
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-5 w-44 max-w-full" />
              <Skeleton className="h-4 w-10" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-full rounded-full" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-4 w-36 max-w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const clampedProgress = Math.max(0, Math.min(100, progress ?? 0));
  const progressColor =
    tone === "risk"
      ? "var(--destructive)"
      : clampedProgress >= 100
        ? "var(--color-success)"
        : "var(--color-violet-400)";
  const comparisonContent = comparison ? (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={comparison.tooltip}
        className="inline-flex shrink-0 items-center gap-1 rounded-sm text-xs leading-4 text-tertiary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {comparison.trend === "up" ? (
          <TrendingUp aria-hidden="true" className="size-3.5" />
        ) : comparison.trend === "down" ? (
          <TrendingDown aria-hidden="true" className="size-3.5" />
        ) : null}
        <span className="font-medium tabular-nums text-secondary-foreground">
          {comparison.value}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" align="end">
        {comparison.tooltip}
      </TooltipContent>
    </Tooltip>
  ) : null;
  const titleAndMetricContent = (
    <div className="flex flex-col gap-3">
      <span
        className={`min-w-0 text-sm text-secondary-foreground ${
          comparison ? "pr-16" : ""
        }`}
      >
        {title}
      </span>
      <div className="space-y-2">
        <span className="block text-2xl leading-7 font-semibold tabular-nums text-foreground">
          {value}
        </span>
        <div
          role="progressbar"
          aria-label={title}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress == null ? undefined : clampedProgress}
          aria-valuetext={value}
          className="h-3 w-full overflow-hidden rounded-full bg-muted"
        >
          {progress != null ? (
            <span
              aria-hidden="true"
              className="block h-full rounded-full"
              style={{
                width: `${clampedProgress}%`,
                backgroundColor: progressColor,
              }}
            />
          ) : null}
        </div>
      </div>
      {rows.length > 0 ? (
        <ul className="list-disc space-y-1 ps-4 text-xs leading-4 text-tertiary-foreground">
          {rows.map((row) => (
            <li key={row.label}>
              {row.value} {row.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );

  return (
    <Card
      className={
        href
          ? "h-full transition-colors hover:bg-card-subtle-surface"
          : "h-full"
      }
    >
      <CardContent>
        <div className="relative">
          {href ? (
            <Link
              href={href}
              aria-label={`${title}: ${value}`}
              className="block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {titleAndMetricContent}
            </Link>
          ) : (
            titleAndMetricContent
          )}
          {comparisonContent ? (
            <div className="absolute top-0 right-0 z-10">
              {comparisonContent}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
