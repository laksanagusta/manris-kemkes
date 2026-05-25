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

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SemesterScoreTargetDatum } from "@/lib/dashboard-insights";

const ACTUAL_COLOR = "oklch(0.68 0.17 35)";
const TARGET_COLOR = "oklch(0.53 0.12 240)";

interface SemesterTargetTrendProps {
  loading?: boolean;
  data?: SemesterScoreTargetDatum[];
}

function formatScore(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 1,
  }).format(value);
}

function getGapTone(gap: number | null) {
  if (gap === null) return "text-muted-foreground";
  if (gap > 0) return "text-destructive";
  if (gap < 0) return "text-success";
  return "text-muted-foreground";
}

export function SemesterTargetTrend({
  loading,
  data = [],
}: SemesterTargetTrendProps) {
  const hasData = data.length > 0;
  const latest = hasData ? data[data.length - 1] : null;

  if (loading) {
    return (
      <Card className="h-full border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Tren Skor Semester vs Target
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            Memuat...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">
              Tren Skor Semester vs Target
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Versi terakhir tiap risiko di semester itu, dibandingkan dengan
              target skornya.
            </p>
          </div>
          {latest ? (
            <Badge variant="outline" className="h-5 px-2 text-[10px]">
              {latest.period}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            Belum ada data semester untuk menampilkan skor aktual dan target.
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(260px,0.95fr)]">
            <div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data}
                    margin={{ top: 6, right: 18, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="oklch(0.5 0 0 / 8%)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === "actualScore") return [formatScore(Number(value ?? 0)), "Skor aktual"];
                        if (name === "targetScore") return [formatScore(typeof value === "number" ? value : null), "Target"];
                        return [formatScore(typeof value === "number" ? value : null), String(name)];
                      }}
                      labelFormatter={(label) => {
                        const item = data.find((entry) => entry.period === label);
                        if (!item) return String(label);
                        return `${label} - ${item.riskCount} risiko`;
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
                      dataKey="actualScore"
                      name="actualScore"
                      stroke={ACTUAL_COLOR}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="targetScore"
                      name="targetScore"
                      stroke={TARGET_COLOR}
                      strokeWidth={2.5}
                      strokeDasharray="5 4"
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: ACTUAL_COLOR }}
                  />
                  Skor aktual
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: TARGET_COLOR }}
                  />
                  Target
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Snapshot terbaru
              </p>
              {latest ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-border/50 bg-card/70 px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Skor aktual
                    </p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                      {formatScore(latest.actualScore)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Dari {latest.riskCount} risiko versi terakhir
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/50 bg-card/70 px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Target
                    </p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                      {formatScore(latest.targetScore)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {latest.targetCount} risiko punya target
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/50 bg-card/70 px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Gap
                    </p>
                    <p
                      className={`mt-1 text-2xl font-semibold tracking-tight ${getGapTone(latest.gap)}`}
                    >
                      {formatScore(latest.gap)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Aktual dikurangi target
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-sm text-muted-foreground">
                  Tidak ada snapshot terbaru yang bisa dibandingkan.
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
