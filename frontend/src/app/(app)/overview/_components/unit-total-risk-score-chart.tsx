"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UnitTotalRiskScoreDatum } from "@/lib/dashboard-insights";

interface UnitTotalRiskScoreChartProps {
  data: UnitTotalRiskScoreDatum[];
  cycle: string;
  loading?: boolean;
}

const DEFAULT_VISIBLE_ITEMS = 10;

function truncateLabel(value: string, max = 22) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function UnitTotalRiskScoreChart({
  data,
  cycle,
  loading,
}: UnitTotalRiskScoreChartProps) {
  const [expanded, setExpanded] = useState(false);

  const visibleData = useMemo(() => {
    return expanded ? data : data.slice(0, DEFAULT_VISIBLE_ITEMS);
  }, [data, expanded]);

  const chartData = useMemo(() => {
    return visibleData.map((item) => ({
      ...item,
      displayName: truncateLabel(item.orgName, 16),
    }));
  }, [visibleData]);

  const containerHeight = 320;
  const containerWidth = Math.max(720, chartData.length * 92);
  const hasOverflow = data.length > DEFAULT_VISIBLE_ITEMS;

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Total Skor Risiko per Unit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 animate-pulse rounded-lg bg-muted/40" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Total Skor Risiko per Unit
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Ranking unit berdasarkan penjumlahan skor risiko.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {data.length} unit
            </Badge>
            {hasOverflow ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[10px]"
                onClick={() => setExpanded((current) => !current)}
              >
                {expanded ? "Top 10" : "Semua"}
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-80 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            Belum ada data risiko pada cycle ini untuk menyusun ranking unit.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto pb-2">
              <div style={{ height: containerHeight, width: containerWidth }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 4, right: 12, left: 0, bottom: 56 }}
                    barCategoryGap="16%"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="oklch(0.5 0 0 / 8%)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="displayName"
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-32}
                      textAnchor="end"
                      height={56}
                      tick={{ fill: "oklch(0.6 0 0)", fontSize: 10 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "oklch(0.6 0 0)", fontSize: 10 }}
                    />
                    <RechartsTooltip
                      cursor={{ fill: "oklch(0.5 0 0 / 4%)" }}
                      formatter={(value, _name, item) => {
                        const riskCount = item?.payload?.riskCount ?? 0;
                        return [
                          `${value ?? 0} poin (${riskCount} risiko)`,
                          "Total skor",
                        ];
                      }}
                      labelFormatter={(label) =>
                        chartData.find((entry) => entry.displayName === label)
                          ?.orgName ?? label
                      }
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        fontSize: "11px",
                        color: "var(--popover-foreground)",
                        backdropFilter: "blur(8px)",
                      }}
                    />
                    <Bar
                      dataKey="totalScore"
                      fill="oklch(0.68 0.17 35)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {hasOverflow ? (
              <p className="mt-3 text-[11px] text-muted-foreground">
                Default tampil top 10 unit. Geser menyamping untuk baca unit,
                buka mode semua untuk ranking lengkap.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
