"use client";

export function DashboardKpiCard({
  title,
  value,
  detail,
  loading = false,
  error = false,
}: {
  title: string;
  value: string;
  detail?: string;
  loading?: boolean;
  error?: boolean;
}) {
  return (
    <div
      aria-busy={loading}
      className="surface-hairline flex min-h-[100px] flex-col overflow-hidden rounded-xl bg-card px-5 py-5"
    >
      <div className="flex items-center">
        <h2 className="font-sans text-[11px] leading-4 font-semibold uppercase tracking-[1px] text-muted-foreground text-pretty">
          {title}
        </h2>
      </div>
      <div className="mt-6 flex items-baseline gap-1">
        {loading ? (
          <span
            aria-hidden="true"
            className="block h-7 w-28 rounded-lg bg-muted/50 motion-safe:animate-pulse"
          />
        ) : (
          <span className="text-[28px] font-sans font-semibold leading-none tracking-tight text-foreground tabular-nums">
            {error ? "—" : value}
          </span>
        )}
      </div>
      {detail ? (
        <p className="mt-2 text-xs leading-4 text-muted-foreground">
          {detail}
        </p>
      ) : null}
    </div>
  );
}
