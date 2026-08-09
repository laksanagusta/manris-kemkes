import type { ReactNode } from "react";

import { StandardCard } from "../layout/standard-card";

export type OverviewCategorySegment = {
  label: string;
  value: number;
  color: string;
};

export function OverviewCategoryCard({
  title = "Distribusi Kategori Risiko",
  total,
  totalLabel,
  segments,
}: {
  title?: ReactNode;
  total: number;
  totalLabel: ReactNode;
  segments: ReadonlyArray<OverviewCategorySegment>;
}) {
  const sum = segments.reduce((result, segment) => result + segment.value, 0);
  const conicStops = segments
    .reduce(
      (result, segment) => {
        const nextCursor = result.cursor + segment.value;
        const start = sum > 0 ? (result.cursor / sum) * 100 : 0;
        const end = sum > 0 ? (nextCursor / sum) * 100 : 0;
        return {
          cursor: nextCursor,
          stops: [...result.stops, `${segment.color} ${start}% ${end}%`],
        };
      },
      { cursor: 0, stops: [] as string[] }
    )
    .stops.join(", ");

  return (
    <StandardCard title={title} className="h-full" contentClassName="p-4 pt-6">
      <div className="grid gap-4 lg:grid-cols-[auto_1fr] lg:items-center">
        <div className="flex justify-center">
          <div
            className="relative size-44 rounded-full"
            style={{ background: `conic-gradient(${conicStops})` }}
          >
            <div className="absolute inset-8 grid place-items-center rounded-full bg-card ring-1 ring-inset ring-border/60">
              <div className="text-center">
                <p className="text-2xl font-mono font-semibold tracking-tight text-foreground">
                  {total}
                </p>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {totalLabel}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {segments.map((segment) => (
            <div
              key={segment.label}
              className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-sm font-medium text-foreground">
                  {segment.label}
                </span>
              </div>
              <span className="text-sm font-mono tabular-nums text-muted-foreground">
                {segment.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </StandardCard>
  );
}
