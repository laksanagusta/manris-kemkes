"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  TradeDownIcon,
  TradeUpIcon,
} from "@hugeicons/core-free-icons";

type TrendDirection = "up" | "down";

export function DashboardKpiCard({
  title,
  value,
  detail,
  trend,
  loading = false,
  error = false,
}: {
  title: string;
  value: string;
  detail?: string;
  trend?: TrendDirection;
  loading?: boolean;
  error?: boolean;
}) {
  return (
    <div
      aria-busy={loading}
      className="surface-hairline relative min-h-[148px] overflow-hidden rounded-[12px]"
    >
      <div
        aria-hidden="true"
        data-corner-smoothing="60"
        data-smooth-radius="12"
        className="pointer-events-none absolute inset-0 rounded-[12px] bg-card"
      />
      <div className="relative flex min-h-[148px] flex-col p-5">
        <div className="flex min-h-6 items-center justify-between gap-2">
          <h2 className="min-w-0 font-sans text-sm leading-5 font-medium text-secondary-foreground text-pretty">
            {title}
          </h2>
          {trend === "up" ? (
            <HugeiconsIcon
              icon={TradeUpIcon}
              aria-hidden="true"
              className="size-5 shrink-0 text-success"
            />
          ) : trend === "down" ? (
            <HugeiconsIcon
              icon={TradeDownIcon}
              aria-hidden="true"
              className="size-5 shrink-0 text-destructive"
            />
          ) : null}
        </div>
        <div className="mt-5 flex flex-col items-start gap-0.5">
          {loading ? (
            <div className="flex flex-col gap-1">
              <span
                aria-hidden="true"
                className="block h-[42px] w-24 rounded-lg bg-muted/50 motion-safe:animate-pulse"
              />
              {detail ? (
                <span
                  aria-hidden="true"
                  className="block h-4 w-28 rounded bg-muted/40 motion-safe:animate-pulse"
                />
              ) : null}
            </div>
          ) : (
            <>
              <span className="text-[38px] font-sans font-semibold leading-[42px] tracking-[-1px] text-foreground tabular-nums">
                {error ? "—" : value}
              </span>
              {detail ? (
                <p className="text-xs leading-4 text-muted-foreground">
                  {detail}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
