"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { InherentResidualDatum } from "@/lib/dashboard-insights";

const INHERENT_COLOR = "oklch(0.62 0.22 27)";
const RESIDUAL_COLOR = "oklch(0.72 0.17 155)";
const GAP_COLOR = "oklch(0.60 0.16 270)";

interface InherentResidualTrendProps {
  loading?: boolean;
  data?: InherentResidualDatum[];
}

export function InherentResidualTrend({ loading, data = [] }: InherentResidualTrendProps) {
  const hasData = data.length > 0;
  const latestGap = hasData ? data[data.length - 1].gap : 0;

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm" data-testid="inherent-residual-trend">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Inherent vs Residual Score</CardTitle>
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
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm" data-testid="inherent-residual-trend">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">Inherent vs Residual Score</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Rata-rata skor risiko sebelum & sesudah kontrol per semester
            </p>
          </div>
          {hasData && (
            <Badge variant="outline" className="h-5 px-2 text-[10px]">
              Gap: {latestGap}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            Belum ada data semester untuk menampilkan tren inherent vs residual.
          </div>
        ) : (
          <>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 8%)" vertical={false} />
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
                    domain={[0, "auto"]}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      const labels: Record<string, string> = {
                        avgInherent: "Avg Inherent",
                        avgResidual: "Avg Residual",
                        gap: "Gap",
                      };
                      return [`${value ?? 0}`, labels[String(name)] ?? String(name)];
                    }}
                    contentStyle={{
                      background: "oklch(0.98 0.003 170 / 95%)",
                      border: "1px solid oklch(0.91 0.008 170)",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgInherent"
                    stroke={INHERENT_COLOR}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: INHERENT_COLOR, strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgResidual"
                    stroke={RESIDUAL_COLOR}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: RESIDUAL_COLOR, strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="gap"
                    stroke={GAP_COLOR}
                    strokeWidth={1.5}
                    strokeDasharray="6 3"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center justify-center gap-4 border-t border-border/40 pt-3">
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 rounded-full" style={{ background: INHERENT_COLOR }} />
                <span className="text-[10px] text-muted-foreground">Inherent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 rounded-full" style={{ background: RESIDUAL_COLOR }} />
                <span className="text-[10px] text-muted-foreground">Residual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 rounded-full border-t border-dashed" style={{ borderColor: GAP_COLOR }} />
                <span className="text-[10px] text-muted-foreground">Gap</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
