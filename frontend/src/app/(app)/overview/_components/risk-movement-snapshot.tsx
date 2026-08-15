"use client";

import { ArrowDown, ArrowUp, Minus, Plus, Trash2 } from "@/components/ui/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MovementSnapshotDatum } from "@/lib/dashboard-insights";

interface RiskMovementSnapshotProps {
  data: MovementSnapshotDatum[];
  loading?: boolean;
}

const movementConfig: Record<
  MovementSnapshotDatum["key"],
  {
    icon: typeof Plus;
    label: string;
    colorClass: string;
    bgClass: string;
    borderClass: string;
  }
> = {
  new: {
    icon: Plus,
    label: "Baru",
    colorClass: "text-chart-1",
    bgClass: "bg-chart-1/8",
    borderClass: "border-chart-1/20 hover:border-chart-1/50",
  },
  up: {
    icon: ArrowUp,
    label: "Naik",
    colorClass: "text-risk-high",
    bgClass: "bg-risk-high/8",
    borderClass: "border-risk-high/20 hover:border-risk-high/50",
  },
  down: {
    icon: ArrowDown,
    label: "Turun",
    colorClass: "text-success",
    bgClass: "bg-success/8",
    borderClass: "border-success/20 hover:border-success/50",
  },
  stable: {
    icon: Minus,
    label: "Stabil",
    colorClass: "text-muted-foreground",
    bgClass: "bg-muted/30",
    borderClass: "border-border/40 hover:border-border",
  },
  removed: {
    icon: Trash2,
    label: "Keluar",
    colorClass: "text-risk-extreme",
    bgClass: "bg-risk-extreme/8",
    borderClass: "border-risk-extreme/20 hover:border-risk-extreme/50",
  },
};

export function RiskMovementSnapshot({
  data,
  loading,
}: RiskMovementSnapshotProps) {
  if (loading) {
    return (
      <Card
        className="bg-card/80 backdrop-blur-sm"
        data-testid="movement-snapshot"
      >
        <CardHeader className="pb-4">
          <div className="h-5 w-36 animate-pulse rounded-md bg-muted/60" />
          <div className="mt-2 h-3 w-52 animate-pulse rounded bg-muted/40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-xl border border-border/30 bg-muted/20 p-4"
              >
                <div className="flex items-center gap-2">
                  <div className="size-4 animate-pulse rounded bg-muted/60" />
                  <div className="h-2.5 w-10 animate-pulse rounded bg-muted/50" />
                </div>
                <div className="h-9 w-10 animate-pulse rounded-md bg-muted/60" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="bg-card/80 backdrop-blur-sm"
      data-testid="movement-snapshot"
    >
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">
          Perubahan Risiko
        </CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          Perubahan portofolio risiko vs kuartal sebelumnya.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {data.map((item) => {
            const config = movementConfig[item.key];
            const Icon = config.icon;
            return (
              <div
                key={item.key}
                data-testid={`movement-${item.key}`}
                className={cn(
                  "group flex flex-col gap-3 rounded-xl border p-4",
                  "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                  config.bgClass,
                  config.borderClass,
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className={cn("size-4 shrink-0", config.colorClass)} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {config.label}
                  </span>
                </div>

                <span
                  className={cn(
                    "text-4xl font-bold tabular-nums leading-none tracking-tight",
                    config.colorClass,
                  )}
                >
                  {item.value}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
