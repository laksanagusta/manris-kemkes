"use client";

import { TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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
    <Card aria-busy={loading}>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
        {!loading && !error && trend ? (
          <CardAction>
            {trend === "up" ? (
              <TrendingUp aria-hidden="true" className="size-3.5 text-risk-extreme" />
            ) : (
              <TrendingDown aria-hidden="true" className="size-3.5 text-risk-low" />
            )}
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {loading ? (
          <>
            <Skeleton className="h-9 w-24" />
            {detail ? <Skeleton className="h-4 w-28" /> : null}
          </>
        ) : (
          <>
            <div className="text-2xl font-semibold tabular-nums">{error ? "—" : value}</div>
            {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
