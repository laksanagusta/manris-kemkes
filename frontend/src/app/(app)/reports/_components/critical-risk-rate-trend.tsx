"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import type { CriticalRiskRateDatum } from "@/lib/dashboard-insights";
import { StandardCard } from "@/components/shared/design-system";

const RATE_COLOR = "oklch(0.68 0.15 190)";

interface CriticalRiskRateTrendProps {
  loading?: boolean;
  data?: CriticalRiskRateDatum[];
}

export function CriticalRiskRateTrend({
  loading,
  data = [],
}: CriticalRiskRateTrendProps) {
  const hasData = data.length > 0;
  const latestRate = hasData ? data[data.length - 1].highExtremeRate : 0;

  if (loading) {
    return (
      <StandardCard
        title="Tingkat Risiko Kritis"
        className="h-full"
        contentClassName="space-y-4"
      >
        <div data-testid="critical-risk-rate-trend">
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            Memuat...
          </div>
        </div>
      </StandardCard>
    );
  }

  return (
    <StandardCard
      title="Tingkat Risiko Kritis"
      action={
        hasData ? (
          <Badge variant="outline" className="h-5 px-2 text-[10px]">
            {latestRate}%
          </Badge>
        ) : null
      }
      className="h-full"
      contentClassName="space-y-4"
    >
      <div data-testid="critical-risk-rate-trend">
        {!hasData ? (
          <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            Belum ada data semester untuk menampilkan tren risiko kritis.
          </div>
        ) : (
          <>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={data}
                  margin={{ top: 4, right: 12, left: -12, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="criticalRateGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={RATE_COLOR}
                        stopOpacity={0.15}
                      />
                      <stop
                        offset="100%"
                        stopColor={RATE_COLOR}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.5 0 0 / 8%)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 10, fill: "oklch(0.6 0.02 265)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "oklch(0.6 0.02 265)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                    domain={[0, (max: number) => Math.max(max + 10, 20)]}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "highExtremeRate")
                        return [`${value ?? 0}%`, "Tingkat Kritis"];
                      return [`${value ?? 0}%`, String(name)];
                    }}
                    labelFormatter={(label) => {
                      const item = data.find((d) => d.period === label);
                      if (!item) return String(label);
                      return `${label} — ${item.mediumCount} sedang, ${item.highCount} tinggi, ${item.extremeCount} sangat tinggi dari ${item.totalRisks} total`;
                    }}
                    contentStyle={{
                      background: "oklch(0.98 0.003 170 / 95%)",
                      border: "1px solid oklch(0.91 0.008 170)",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="highExtremeRate"
                    fill="url(#criticalRateGradient)"
                    stroke="none"
                  />
                  <Line
                    type="monotone"
                    dataKey="highExtremeRate"
                    stroke={RATE_COLOR}
                    strokeWidth={2.5}
                    dot={{
                      r: 4,
                      fill: RATE_COLOR,
                      strokeWidth: 2,
                      stroke: "#fff",
                    }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center justify-center gap-4 border-t border-border/40 pt-3">
              <div className="flex items-center gap-1.5">
                <div
                  className="h-0.5 w-4 rounded-full"
                  style={{ background: RATE_COLOR }}
                />
                <span className="text-[10px] text-muted-foreground">
                  % Sedang + Tinggi + Sangat Tinggi
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </StandardCard>
  );
}
