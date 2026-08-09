"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";

export type DashboardKpiTone = "success" | "warning" | "neutral";
export type DashboardKpiTrend = "up" | "down" | "stable" | "unavailable";

export function DashboardKpiCard({
  title,
  value,
  change,
  trend,
  tone,
  loading = false,
  error = false,
}: {
  title: string;
  value: string;
  change: string;
  trend: DashboardKpiTrend;
  tone: DashboardKpiTone;
  loading?: boolean;
  error?: boolean;
}) {
  const statusLabel = error
    ? "Data tidak tersedia"
    : trend === "up"
      ? `Naik ${change} dari siklus sebelumnya`
      : trend === "down"
        ? `Turun ${change} dari siklus sebelumnya`
        : trend === "stable"
          ? "Tidak berubah dari siklus sebelumnya"
          : change === "Baru"
            ? "Data baru pada siklus ini"
            : "Belum ada data pembanding";

  return (
    <div
      aria-busy={loading}
      className="flex min-h-32 flex-col rounded-2xl bg-card shadow-none ring-1 ring-inset ring-border"
    >
      <div className="flex items-center px-4 py-4">
        <p className="text-[11px] font-mono font-semibold uppercase leading-4 tracking-[0.1em] text-muted-foreground">
          {title}
        </p>
      </div>
      <div className="mt-auto flex min-h-16 items-end gap-2 px-4 pb-4 pt-3">
        {loading ? (
          <div className="h-9 w-28 rounded-lg bg-muted/50 motion-safe:animate-pulse" />
        ) : (
          <>
            <span className="text-3xl font-mono font-medium tracking-tight text-foreground tabular-nums">
              {error ? "—" : value}
            </span>
            <div
              title={statusLabel}
              aria-label={statusLabel}
              className={cn(
                "mb-0.5 inline-flex min-h-6 items-center gap-1 rounded-lg px-1.5 text-xs font-mono font-medium",
                trend === "up" && tone === "warning" && "text-destructive",
                trend === "up" && tone !== "warning" && "text-muted-foreground",
                trend === "down" && "text-success",
                (trend === "stable" || trend === "unavailable") &&
                  "text-muted-foreground",
                error && "text-destructive",
              )}
            >
              {!error && trend === "up" && <TrendingUp aria-hidden="true" className="size-3" />}
              {!error && trend === "down" && <TrendingDown aria-hidden="true" className="size-3" />}
              {!error && trend === "stable" && <Minus aria-hidden="true" className="size-3" />}
              {error ? "Tidak tersedia" : change}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
