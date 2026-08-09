"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { KRIBreachItem } from "@/types/risk";

const STATUS_META = {
  safe: {
    label: "Aman",
    badgeClass: "bg-success/10 text-success border-success/30",
    bgClass: "bg-success/5",
    borderClass: "border-success/20",
  },
  warning: {
    label: "Peringatan",
    badgeClass: "bg-warning/10 text-warning border-warning/30",
    bgClass: "bg-warning/5",
    borderClass: "border-warning/20",
  },
  breach: {
    label: "Breach",
    badgeClass: "bg-risk-extreme/10 text-risk-extreme border-risk-extreme/30",
    bgClass: "bg-risk-extreme/5",
    borderClass: "border-risk-extreme/20",
  },
};

interface KRIBreachSummaryProps {
  loading?: boolean;
  data?: KRIBreachItem[];
}

export function KRIBreachSummary({ loading, data = [] }: KRIBreachSummaryProps) {
  const items = useMemo(
    () => data.filter((d) => d.status === "warning" || d.status === "breach").slice(0, 6),
    [data],
  );
  const hasData = items.length > 0;

  if (loading) {
    return (
      <Card className="rounded-lg ring-1 ring-inset ring-border bg-card shadow-none" data-testid="kri-breach-summary">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Ringkasan KRI Breach</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            Memuat...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-lg ring-1 ring-inset ring-border bg-card shadow-none" data-testid="kri-breach-summary">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Ringkasan KRI Breach</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              KRI yang mencapai ambang batas
            </p>
          </div>
          {hasData && (
            <Badge variant="outline" className="h-5 px-2 text-[10px]">
              {items.length} KRI
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            Tidak ada KRI yang breach atau warning saat ini.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((item) => {
              const meta = STATUS_META[item.status as keyof typeof STATUS_META] ?? STATUS_META.safe;
              const pct = item.threshold > 0
                ? Math.min(100, Math.round((item.actualValue / item.threshold) * 100))
                : 0;

              return (
                <div
                  key={item.kriId}
                  data-testid="kri-breach-card"
                  className={cn(
                    "rounded-lg border p-3 transition-colors",
                    meta.borderClass,
                    meta.bgClass,
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{item.kriName}</p>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{item.orgName}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("shrink-0 text-[9px] h-5 px-1.5", meta.badgeClass)}
                    >
                      {meta.label}
                    </Badge>
                  </div>

                  <p className="mt-2 truncate text-[10px] text-muted-foreground">
                    {item.riskTitle}
                  </p>

                  <div className="mt-3 flex items-baseline justify-between gap-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-foreground">
                        {item.actualValue.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{item.unit}</span>
                    </div>
                    <div className="flex items-baseline gap-1 text-right">
                      <span className="text-[10px] text-muted-foreground">/</span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {item.threshold.toFixed(1)} {item.unit}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted/40">
                    <div
                      className={cn("h-full rounded-full", item.status === "safe" ? "bg-success" : item.status === "warning" ? "bg-warning" : "bg-risk-extreme")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
