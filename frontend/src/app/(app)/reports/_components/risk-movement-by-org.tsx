"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MovementByOrgDatum, MovementByOrgSortKey } from "@/lib/dashboard-insights";
import { StandardCard } from "@/components/shared/design-system";
import { RISK_CHART_COLORS } from "@/lib/chart-colors";

const chartConfig = {
  naik: { label: "Naik", color: RISK_CHART_COLORS.high },
  turun: { label: "Turun", color: RISK_CHART_COLORS.low },
  stabil: { label: "Stabil", color: RISK_CHART_COLORS.veryLow },
} satisfies ChartConfig;

export interface RiskMovementByOrgProps {
  data: MovementByOrgDatum[];
  onSortChange?: (sortBy: MovementByOrgSortKey) => void;
  currentSort?: MovementByOrgSortKey;
}

export function RiskMovementByOrg({
  data = [],
  onSortChange,
  currentSort = "total",
}: RiskMovementByOrgProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      displayName: item.orgName.length > 20 ? `${item.orgName.slice(0, 19)}…` : item.orgName,
    }));
  }, [data]);

  const hasData = chartData.length > 0;
  const containerHeight = Math.max(300, chartData.length * 28);

  return (
    <StandardCard
      title="Pergerakan Risiko per Organisasi"
      action={
        hasData ? (
          <Select
            value={currentSort}
            onValueChange={(value) => onSortChange?.(value as MovementByOrgSortKey)}
          >
            <SelectTrigger className="h-10 w-[120px] text-xs">
              <SelectValue placeholder="Urutkan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="total" className="text-xs">Total</SelectItem>
              <SelectItem value="naik" className="text-xs">Naik</SelectItem>
              <SelectItem value="turun" className="text-xs">Turun</SelectItem>
              <SelectItem value="stabil" className="text-xs">Stabil</SelectItem>
              <SelectItem value="orgName" className="text-xs">A-Z</SelectItem>
            </SelectContent>
          </Select>
        ) : null
      }
      className="h-full"
      contentClassName="flex flex-col gap-4"
    >
      <div data-testid="risk-movement-by-org">
        {!hasData ? (
          <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-surface-border bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            Belum ada data perbandingan risiko antar-cycle.
          </div>
        ) : (
          <>
            <div className="max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
              <div style={{ height: containerHeight }}>
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <BarChart
                    accessibilityLayer
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 0, bottom: 0 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--chart-grid)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="displayName"
                      width={120}
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip
                      cursor={{ fill: "var(--muted)" }}
                      content={
                        <ChartTooltipContent
                          indicator="line"
                          formatter={(value, name) => [value ?? 0, String(name)]}
                          labelFormatter={(label) =>
                            chartData.find((d) => d.displayName === label)?.orgName ??
                            String(label)
                          }
                        />
                      }
                    />
                    <Bar
                      dataKey="naik"
                      stackId="movement"
                      fill="var(--color-naik)"
                    />
                    <Bar
                      dataKey="turun"
                      stackId="movement"
                      fill="var(--color-turun)"
                    />
                    <Bar
                      dataKey="stabil"
                      stackId="movement"
                      fill="var(--color-stabil)"
                      fillOpacity={0.55}
                      radius={[0, 3, 3, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-5 border-t border-border/40 pt-4">
              <div className="flex items-center gap-1.5">
                  <div
                    className="size-2.5 rounded-[3px]"
                    style={{ background: RISK_CHART_COLORS.high }}
                  />
                <span className="text-[10px] text-muted-foreground">Naik</span>
              </div>
              <div className="flex items-center gap-1.5">
                  <div
                    className="size-2.5 rounded-[3px]"
                    style={{ background: RISK_CHART_COLORS.low }}
                  />
                <span className="text-[10px] text-muted-foreground">Turun</span>
              </div>
              <div className="flex items-center gap-1.5">
                  <div
                    className="size-2.5 rounded-[3px]"
                    style={{
                      background: RISK_CHART_COLORS.veryLow,
                      opacity: 0.55,
                    }}
                  />
                <span className="text-[10px] text-muted-foreground">Stabil</span>
              </div>
            </div>
          </>
        )}
      </div>
    </StandardCard>
  );
}
