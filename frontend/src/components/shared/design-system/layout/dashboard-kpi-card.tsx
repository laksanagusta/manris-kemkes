"use client";

export function DashboardKpiCard({
  title,
  value,
  loading = false,
  error = false,
}: {
  title: string;
  value: string;
  loading?: boolean;
  error?: boolean;
}) {
  return (
    <div
      aria-busy={loading}
      className="surface-hairline flex min-h-28 flex-col overflow-hidden rounded-xl bg-card"
    >
      <div className="mb-1 flex items-center px-4 pb-1 pt-3">
        <h2 className="font-sans text-xs font-medium capitalize leading-4 text-muted-foreground">
          {title}
        </h2>
      </div>
      <div className="flex items-baseline gap-3 px-4 pb-2 pt-0">
        {loading ? (
          <div className="h-7 w-28 rounded-lg bg-muted/50 motion-safe:animate-pulse" />
        ) : (
          <span className="text-2xl font-sans font-semibold leading-7 tracking-tight text-foreground tabular-nums">
            {error ? "—" : value}
          </span>
        )}
      </div>
    </div>
  );
}
