"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MovementByOrgDatum, MovementByOrgSortKey } from "@/lib/dashboard-insights";

const COLOR_NAIK = "oklch(0.70 0.18 40)";
const COLOR_TURUN = "oklch(0.72 0.17 155)";
const COLOR_STABIL = "oklch(0.60 0.02 265 / 55%)";

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
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm" data-testid="risk-movement-by-org">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold">Pergerakan Risiko per Organisasi</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Jumlah risiko naik, turun, dan stabil per unit kerja.
            </p>
          </div>
          {hasData && (
            <Select
              value={currentSort}
              onValueChange={(value) => onSortChange?.(value as MovementByOrgSortKey)}
            >
              <SelectTrigger className="h-8 w-[120px] text-xs">
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
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            Belum ada data perbandingan risiko antar-cycle.
          </div>
        ) : (
          <>
            <div className="max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
              <div style={{ height: containerHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 0, bottom: 0 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 8%)" horizontal={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fill: "oklch(0.6 0 0)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="displayName"
                      width={120}
                      tick={{ fill: "oklch(0.6 0 0)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "oklch(0.5 0 0 / 4%)" }}
                      formatter={(value, name) => {
                        const labelMap: Record<string, string> = {
                          naik: "Naik",
                          turun: "Turun",
                          stabil: "Stabil",
                        };
                        return [value, labelMap[name as string] || name];
                      }}
                      contentStyle={{
                        background: "oklch(0.98 0.003 170 / 95%)",
                        border: "1px solid oklch(0.91 0.008 170)",
                        borderRadius: "8px",
                        fontSize: "11px",
                      }}
                      labelFormatter={(label) => chartData.find((d) => d.displayName === label)?.orgName ?? label}
                    />
                    <Bar dataKey="naik" stackId="movement" fill={COLOR_NAIK} />
                    <Bar dataKey="turun" stackId="movement" fill={COLOR_TURUN} />
                    <Bar dataKey="stabil" stackId="movement" fill={COLOR_STABIL} radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-5 border-t border-border/40 pt-4">
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-[3px]" style={{ background: COLOR_NAIK }} />
                <span className="text-[10px] text-muted-foreground">Naik</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-[3px]" style={{ background: COLOR_TURUN }} />
                <span className="text-[10px] text-muted-foreground">Turun</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-[3px]" style={{ background: COLOR_STABIL }} />
                <span className="text-[10px] text-muted-foreground">Stabil</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
