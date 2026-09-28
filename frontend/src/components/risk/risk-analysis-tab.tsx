"use client";

import { useMemo } from "react";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { IllustratedEmptyState } from "@/components/shared/design-system/feedback/illustrated-empty-state";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { cn } from "@/lib/utils";
import {
  formatRiskScore,
  getRiskLevelFromNilai,
  getRiskLevelLabel,
  roundRiskScore,
} from "@/lib/risk";
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
  supersededByRiskId: string | null;
  supersededByVersionNumber?: number;
};

type RiskAnalysisTabProps = {
  versions: RiskVersionTimelineItem[];
  loading?: boolean;
};

const chartConfig = {
  inherentScore: { label: "Nilai risiko", color: "oklch(0.68 0.17 35)" },
  targetScore: { label: "Target penanganan", color: "oklch(0.53 0.12 240)" },
} satisfies ChartConfig;

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
  return roundRiskScore(version.inherentScore) ?? 0;
}

function getVersionTargetScore(version: RiskVersionTimelineItem) {
  return roundRiskScore(version.targetScore) ?? 0;
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
    const chronological = [...versions].sort(
      (left, right) =>
        new Date(left.createdAt).getTime() -
        new Date(right.createdAt).getTime(),
    );
    const activeVersions = chronological.filter(
      (version) => !version.supersededByRiskId,
    );
    const activeIndexById = new Map<string, number>(
      activeVersions.map((version, index) => [version.id, index] as const),
    );
    const versionNumberById = new Map(
      chronological.map((version) => [version.id, version.versionNumber] as const),
    );

    return chronological.map((version) => {
      const activeIndex = activeIndexById.get(version.id);
      const inherentScore = getVersionInherentScore(version);
      const targetScore = getVersionTargetScore(version);
      const previousScore =
        activeIndex !== undefined && activeIndex > 0
          ? getVersionInherentScore(activeVersions[activeIndex - 1])
          : null;

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
        supersededByRiskId: version.supersededByRiskId ?? null,
        supersededByVersionNumber: version.supersededByRiskId
          ? versionNumberById.get(version.supersededByRiskId)
          : undefined,
      };
    });
  }, [versions]);

  const activeRows = rows.filter((row) => !row.supersededByRiskId);
  const latest = activeRows.at(-1);
  const previous = activeRows.length > 1 ? activeRows.at(-2) : undefined;
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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2">
          <Spinner />
          <span>
            Memuat analisis risiko...
          </span>
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent>
          <IllustratedEmptyState
            title="Belum ada versi risiko untuk dianalisis."
            description="Setelah risiko disimpan sebagai versi, tab ini menampilkan perubahan nilai, level, target, dan catatan revisi."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Nilai risiko terkini
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {formatRiskScore(latest?.inherentScore, "0")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {latest ? latest.level : "Belum ada data"}
          </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Nilai sebelumnya
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {formatRiskScore(previous?.inherentScore, "—")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {previous ? previous.level : "Belum ada pembanding"}
          </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Perubahan
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {formatDelta(deltaFromPrevious)}
          </p>
          <Badge variant={deltaFromPrevious !== null && deltaFromPrevious > 0 ? "destructive" : "secondary"}>
            {trendLabel}
          </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Selisih dari target
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {formatRiskScore(targetGap, "—")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {latest?.targetScore && latest.targetScore > 0
              ? latest.targetLevel
              : "Target belum ditetapkan"}
          </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5">
        <Card className="">
          <CardHeader className="space-y-1.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="">
                  Tren nilai risiko
                </CardTitle>
                <p className="mt-1 text-xs text-secondary-foreground">
                  Pergerakan nilai risiko dari versi ke versi, dibandingkan
                  dengan target penanganan.
                </p>
              </div>
              <Badge variant="outline" className="">
                {activeRows.length} versi aktif
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <LineChart
                  data={activeRows}
                  margin={{ top: 6, right: 18, left: -18, bottom: 0 }}
                >
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
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => (
                          <span className="flex w-full items-center justify-between gap-4">
                            <span>{chartConfig[name as keyof typeof chartConfig]?.label ?? name}</span>
                            <span className="font-mono font-medium tabular-nums">
                              {formatRiskScore(typeof value === "number" ? value : null, "0")}
                            </span>
                          </span>
                        )}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="inherentScore"
                    stroke="var(--color-inherentScore)"
                    strokeWidth={2.25}
                    dot={false}
                    activeDot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="targetScore"
                    stroke="var(--color-targetScore)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={false}
                  />
                </LineChart>
              </ChartContainer>
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

        <Card className="">
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="mt-1 text-xs text-secondary-foreground">
                  Lihat setiap versi risiko, kapan dibuat, nilai target, dan
                  alasan perubahannya.
                </p>
              </div>
              <Badge variant="outline" className="">
                {rows.length} versi
              </Badge>
            </div>
          </div>
          <CardContent className="">
            <div className="overflow-hidden">
              <div className="relative w-full overflow-x-auto">
                <Table className="w-full caption-bottom">
                  <TableHeader className="sticky top-0 z-10">
                    <TableRow className="transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted">
                      <TableHead className="h-10 text-left align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                        Versi
                      </TableHead>
                      <TableHead className="h-10 text-left align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                        Periode
                      </TableHead>
                      <TableHead className="h-10 text-left align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                        Tanggal
                      </TableHead>
                      <TableHead className="h-10 text-left align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                        Status
                      </TableHead>
                      <TableHead className="h-10 text-right align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                        Nilai
                      </TableHead>
                      <TableHead className="h-10 text-right align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                        Target
                      </TableHead>
                      <TableHead className="h-10 text-right align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                        Perubahan
                      </TableHead>
                      <TableHead className="h-10 text-left align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                        Level
                      </TableHead>
                      <TableHead className="h-10 text-left align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
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
                        <TableCell className="align-middle whitespace-nowrap">
                          <span className="text-sm font-medium text-foreground">
                            {row.versionNumber ? `v${row.versionNumber}` : "-"}
                          </span>
                        </TableCell>
                        <TableCell className="align-middle whitespace-nowrap">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-sm font-medium text-foreground">
                              {row.label}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="align-middle whitespace-nowrap">
                          {formatShortDate(row.createdAt)}
                        </TableCell>
                        <TableCell className="align-middle whitespace-nowrap">
                          <Badge variant={row.supersededByRiskId ? "secondary" : "outline"}>
                            {row.supersededByRiskId
                              ? `Digantikan${row.supersededByVersionNumber ? ` oleh v${row.supersededByVersionNumber}` : ""}`
                              : row.isCurrent
                                ? "Terkini"
                                : "Riwayat"}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-middle whitespace-nowrap text-right">
                          {formatRiskScore(row.inherentScore)}
                        </TableCell>
                        <TableCell className="align-middle whitespace-nowrap text-right">
                          {formatRiskScore(row.targetScore > 0 ? row.targetScore : null)}
                        </TableCell>
                        <TableCell className="align-middle whitespace-nowrap text-right">
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
                        <TableCell className="align-middle whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className=""
                          >
                            {row.level}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-middle whitespace-nowrap">
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
