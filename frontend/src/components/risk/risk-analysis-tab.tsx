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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "@/components/ui/icons";

import { cn } from "@/lib/utils";
import { getRiskLevelFromNilai, getRiskLevelLabel } from "@/lib/risk";
import type { RiskVersionTimelineItem } from "@/types/risk";

type AnalysisRow = {
  id: string;
  label: string;
  versionNumber?: number;
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
  if (delta === null) return "Versi awal";
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
          new Date(left.createdAt).getTime() -
          new Date(right.createdAt).getTime(),
      )
      .map((version, index, all) => {
        const inherentScore = getVersionInherentScore(version);
        const targetScore = getVersionTargetScore(version);
        const previousScore =
          index > 0 ? getVersionInherentScore(all[index - 1]) : null;

        return {
          id: version.id,
          label: formatVersionLabel(version),
          versionNumber: version.versionNumber,
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
      <Card className="bg-card/80">
        <CardContent className="flex items-center justify-center py-14">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Memuat analisis risiko...
          </span>
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="bg-muted/10">
        <CardContent className="flex flex-col items-center justify-center gap-2 py-14 text-center">
          <p className="text-sm font-medium text-foreground">
            Belum ada versi risiko untuk dianalisis.
          </p>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            Setelah risiko disimpan sebagai versi, tab ini menampilkan
            perubahan nilai, level, target, dan catatan revisi.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl bg-card/80 px-4 py-3 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Nilai risiko terkini
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {latest?.inherentScore ?? 0}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {latest ? latest.level : "Belum ada data"}
          </p>
        </div>
        <div className="rounded-2xl bg-card/80 px-4 py-3 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Nilai sebelumnya
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {previous?.inherentScore ?? "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {previous ? previous.level : "Belum ada pembanding"}
          </p>
        </div>
        <div className="rounded-2xl bg-card/80 px-4 py-3 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30">
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
        <div className="rounded-2xl bg-card/80 px-4 py-3 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Selisih dari target
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {targetGap === null ? "—" : `${targetGap}`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {latest?.targetScore && latest.targetScore > 0
              ? latest.targetLevel
              : "Target belum ditetapkan"}
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <Card className="bg-card/80">
          <CardHeader className="space-y-1.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-medium normal-case">
                  Tren nilai risiko
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pergerakan nilai risiko dari versi ke versi, dibandingkan
                  dengan target penanganan.
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
                        ? "Nilai risiko"
                        : "Target penanganan",
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
                Nilai risiko
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[oklch(0.53_0.12_240)]" />
                Target penanganan
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80">
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Lihat setiap versi risiko, kapan dibuat, nilai target, dan
                  alasan perubahannya.
                </p>
              </div>
              <Badge variant="outline" className="h-5 px-2 text-[10px]">
                {rows.length} versi
              </Badge>
            </div>
          </div>
          <CardContent className="pt-0">
            <div className="overflow-hidden rounded-lg bg-card smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30">
              <div className="relative w-full overflow-x-auto">
                <Table className="w-full caption-bottom text-sm">
                  <TableHeader className="sticky top-0 z-10 bg-table-header [&_tr]:border-b">
                    <TableRow className="border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted">
                      <TableHead className="h-10 px-2 text-left align-middle font-semibold whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                        Versi
                      </TableHead>
                      <TableHead className="h-10 px-2 text-left align-middle font-semibold whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                        Periode
                      </TableHead>
                      <TableHead className="h-10 px-2 text-left align-middle font-semibold whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                        Tanggal
                      </TableHead>
                      <TableHead className="h-10 px-2 text-left align-middle font-semibold whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                        Status
                      </TableHead>
                      <TableHead className="h-10 px-2 text-right align-middle font-semibold whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                        Nilai
                      </TableHead>
                      <TableHead className="h-10 px-2 text-right align-middle font-semibold whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                        Target
                      </TableHead>
                      <TableHead className="h-10 px-2 text-right align-middle font-semibold whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                        Perubahan
                      </TableHead>
                      <TableHead className="h-10 px-2 text-left align-middle font-semibold whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                        Level
                      </TableHead>
                      <TableHead className="h-10 px-2 text-left align-middle font-semibold whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                        Catatan
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&_tr:last-child]:border-0">
                    {rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className={cn(
                          "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
                          row.isCurrent && "bg-muted/25",
                        )}
                      >
                        <TableCell className="p-2 align-middle whitespace-nowrap">
                          <span className="text-sm font-medium text-foreground">
                            {row.versionNumber ? `v${row.versionNumber}` : "-"}
                          </span>
                        </TableCell>
                        <TableCell className="p-2 align-middle whitespace-nowrap">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-sm font-medium text-foreground">
                              {row.label}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="p-2 align-middle whitespace-nowrap text-sm text-muted-foreground">
                          {formatShortDate(row.createdAt)}
                        </TableCell>
                        <TableCell className="p-2 align-middle whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={cn(
                              "h-5 px-2 text-[10px]",
                              row.isCurrent
                                ? "border-primary/30 bg-primary/10 text-primary"
                                : "text-muted-foreground",
                            )}
                          >
                            {row.isCurrent ? "Terkini" : "Riwayat"}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-2 align-middle whitespace-nowrap text-right text-sm font-medium text-foreground">
                          {row.inherentScore}
                        </TableCell>
                        <TableCell className="p-2 align-middle whitespace-nowrap text-right text-sm text-muted-foreground">
                          {row.targetScore > 0 ? row.targetScore : "—"}
                        </TableCell>
                        <TableCell className="p-2 align-middle whitespace-nowrap text-right text-sm">
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
                        <TableCell className="p-2 align-middle whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className="h-5 px-2 text-[10px]"
                          >
                            {row.level}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-2 align-middle whitespace-nowrap">
                          <span
                            className="block max-w-[28rem] truncate text-xs leading-relaxed text-muted-foreground"
                            title={row.changeReason}
                          >
                            {row.changeReason}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
