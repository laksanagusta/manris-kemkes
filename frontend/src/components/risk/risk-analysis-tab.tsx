"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ScrollArea,
  ScrollBar,
} from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getRiskLevelFromNilai,
  getRiskLevelLabel,
} from "@/lib/risk";
import type { RiskVersionTimelineItem } from "@/types/risk";

type AnalysisRow = {
  id: string;
  label: string;
  period: string;
  createdAt: string;
  inherentScore: number;
  targetScore: number;
  delta: number | null;
  level: string;
  targetLevel: string;
  changeReason: string;
  isCurrent: boolean;
};

type RiskAnalysisTabProps = {
  versions: RiskVersionTimelineItem[];
  loading?: boolean;
};

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tanggal tidak valid";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatVersionLabel(version: RiskVersionTimelineItem) {
  const cycle = version.assessmentCycle?.trim();
  if (cycle) return cycle;
  return formatShortDate(version.createdAt);
}

function getVersionInherentScore(version: RiskVersionTimelineItem) {
  return version.inherentScore ?? 0;
}

function getVersionTargetScore(version: RiskVersionTimelineItem) {
  return version.targetScore ?? 0;
}

function formatDelta(delta: number | null) {
  if (delta === null) return "Baru";
  if (delta === 0) return "Stabil";
  return delta > 0 ? `+${delta}` : `${delta}`;
}

export function RiskAnalysisTab({
  versions,
  loading = false,
}: RiskAnalysisTabProps) {
  const rows = useMemo<AnalysisRow[]>(() => {
    return [...versions]
      .sort(
        (left, right) =>
          new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
      )
      .map((version, index, all) => {
        const inherentScore = getVersionInherentScore(version);
        const targetScore = getVersionTargetScore(version);
        const previousScore =
          index > 0 ? getVersionInherentScore(all[index - 1]) : null;

        return {
          id: version.id,
          label: formatVersionLabel(version),
          period: version.assessmentCycle || formatShortDate(version.createdAt),
          createdAt: version.createdAt,
          inherentScore,
          targetScore,
          delta: previousScore === null ? null : inherentScore - previousScore,
          level: getRiskLevelLabel(getRiskLevelFromNilai(inherentScore)),
          targetLevel:
            targetScore > 0
              ? getRiskLevelLabel(getRiskLevelFromNilai(targetScore))
              : "-",
          changeReason:
            version.changeReason?.trim() ||
            version.reviewSummary?.trim() ||
            "Tidak ada catatan perubahan.",
          isCurrent: version.isCurrent,
        };
      });
  }, [versions]);

  const latest = rows.at(-1);
  const previous = rows.length > 1 ? rows.at(-2) : undefined;
  const deltaFromPrevious =
    latest && previous ? latest.inherentScore - previous.inherentScore : null;
  const targetGap =
    latest && latest.targetScore > 0
      ? latest.inherentScore - latest.targetScore
      : null;
  const trendLabel =
    deltaFromPrevious === null
      ? "Belum cukup data"
      : deltaFromPrevious === 0
        ? "Stabil"
        : deltaFromPrevious < 0
          ? "Membaik"
          : "Memburuk";
  const trendTone =
    deltaFromPrevious === null
      ? "bg-muted/40 text-muted-foreground"
      : deltaFromPrevious <= 0
        ? "bg-success/10 text-success"
        : "bg-destructive/10 text-destructive";

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/80">
        <CardContent className="flex items-center justify-center py-14">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Memuat analisa risiko...
          </span>
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="border-dashed border-border/60 bg-muted/10">
        <CardContent className="flex flex-col items-center justify-center gap-2 py-14 text-center">
          <p className="text-sm font-medium text-foreground">
            Belum ada riwayat versi untuk dianalisis.
          </p>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            Setelah draft risiko disimpan dan berubah beberapa kali, tab ini
            akan menampilkan tren skor, perubahan level, dan catatan revisi.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-border/50 bg-card/80 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Skor inherent terakhir
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {latest?.inherentScore ?? 0}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {latest ? latest.level : "Belum ada data"}
          </p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card/80 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Skor inherent sebelumnya
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {previous?.inherentScore ?? "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {previous ? previous.level : "Belum ada pembanding"}
          </p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card/80 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Perubahan
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {formatDelta(deltaFromPrevious)}
          </p>
          <span
            className={cn(
              "mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
              trendTone,
            )}
          >
            {trendLabel}
          </span>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card/80 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Jarak ke target
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {targetGap === null ? "—" : `${targetGap}`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {latest?.targetScore && latest.targetScore > 0
              ? latest.targetLevel
              : "Target belum diisi"}
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="space-y-1.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Tren skor inherent risiko
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pergerakan skor inherent dari versi ke versi, dengan
                  pembanding target untuk membaca jarak residual.
                </p>
              </div>
              <Badge variant="outline" className="h-5 px-2 text-[10px]">
                {rows.length} versi
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={rows}
                  margin={{ top: 6, right: 18, left: -18, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.5 0 0 / 8%)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
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
                  <RechartsTooltip
                    contentStyle={{
                      background: "oklch(0.98 0.003 170 / 96%)",
                      border: "1px solid oklch(0.91 0.008 170)",
                      borderRadius: "10px",
                      fontSize: "11px",
                    }}
                    formatter={(value, name) => [
                      `${value ?? 0}`,
                      name === "inherentScore"
                        ? "Skor inherent"
                        : "Skor target",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="inherentScore"
                    stroke="oklch(0.68 0.17 35)"
                    strokeWidth={2.25}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="targetScore"
                    stroke="oklch(0.53 0.12 240)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[oklch(0.68_0.17_35)]" />
                Skor inherent
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[oklch(0.53_0.12_240)]" />
                Skor target
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80">
          <CardHeader className="space-y-1.5">
            <CardTitle className="text-sm font-semibold">
              Ringkasan versi
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Tabel ringkas untuk melihat periode, level, dan alasan perubahan.
            </p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-72">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Periode</TableHead>
                      <TableHead className="w-[84px] text-right">Inherent</TableHead>
                      <TableHead className="w-[84px] text-right">Target</TableHead>
                    <TableHead className="w-[70px] text-right">Delta</TableHead>
                    <TableHead className="w-[120px]">Level</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} className={row.isCurrent ? "bg-muted/25" : ""}>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {row.label}
                            </span>
                            {row.isCurrent && (
                              <Badge variant="outline" className="h-5 px-1.5 text-[9px]">
                                Current
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {formatShortDate(row.createdAt)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-right text-sm font-medium">
                        {row.inherentScore}
                      </TableCell>
                      <TableCell className="align-top text-right text-sm text-muted-foreground">
                        {row.targetScore > 0 ? row.targetScore : "—"}
                      </TableCell>
                      <TableCell className="align-top text-right text-sm">
                        <span
                          className={cn(
                            row.delta === null
                              ? "text-muted-foreground"
                              : row.delta <= 0
                                ? "text-success"
                                : "text-destructive",
                          )}
                        >
                          {formatDelta(row.delta)}
                        </span>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="outline" className="h-5 px-2 text-[10px]">
                          {row.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top text-xs leading-relaxed text-muted-foreground">
                        {row.changeReason}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
