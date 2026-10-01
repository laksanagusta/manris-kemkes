"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  CollapsibleCard,
  ReportEmptyState,
  CollectionPagination,
} from "@/components/shared/design-system";
import {
  ReportKpiCard,
  type ReportKpiComparison,
} from "@/components/report/report-kpi-card";
import {
  buildQuarterlyAnalysis,
  buildQuarterlyOverview,
  buildQuarterlyRiskRows,
  formatReportNumber,
  formatReportPercent,
  movementLabels,
  taskStateLabels,
  conditionLabels,
  severityLabels,
  type ReportSummary,
  type QuarterlyAnalysis,
  type TaskState,
} from "@/lib/quarterly-report";
import type {
  QuarterlyReport,
  QuarterlyReportOverview,
} from "@/types/quarterly-report";
import { QuarterlyReportRiskTable } from "./quarterly-report-risk-table";
import { QuarterlyReportUnitDrawer } from "./quarterly-report-unit-drawer";

function comparisonDelta(
  current: number | null,
  previous: number | null,
  cycle: string,
): ReportKpiComparison {
  const comparator = `dibanding ${cycle}`;
  if (current == null || previous == null) {
    return {
      value: "—",
      tooltip: `Selisih tidak dapat dihitung ${comparator} karena data tidak tersedia.`,
    };
  }
  const roundedDelta = Math.round((current - previous) * 10) / 10;
  const delta = Object.is(roundedDelta, -0) ? 0 : roundedDelta;
  const value = `${delta > 0 ? "+" : ""}${formatReportNumber(delta)}`;
  return {
    value,
    tooltip: `Selisih ${value} poin persentase ${comparator}.`,
    trend: delta > 0 ? "up" : delta < 0 ? "down" : undefined,
  };
}
function rateDetail(value: number, total: number, rate: number | null) {
  return `${value}/${total} · ${formatReportPercent(rate)}`;
}

function UnitRateCell({
  label,
  numerator,
  denominator,
  rate,
  detail,
  tone = "completion",
}: {
  label: string;
  numerator: number;
  denominator: number;
  rate: number | null;
  detail?: string;
  tone?: "completion" | "risk";
}) {
  if (denominator === 0) {
    return (
      <div className="min-w-0 space-y-1">
        <p className="tabular-nums text-muted-foreground">—</p>
        {detail && (
          <p className="text-[10px] leading-4 text-muted-foreground">
            {detail}
          </p>
        )}
      </div>
    );
  }

  if (rate === null) {
    return (
      <div className="min-w-0 space-y-1">
        <p className="text-xs tabular-nums">
          {numerator}/{denominator} · —
        </p>
        {detail && (
          <p className="text-[10px] leading-4 text-muted-foreground">
            {detail}
          </p>
        )}
      </div>
    );
  }

  const completionRate = Math.max(0, Math.min(100, rate));
  const percentage = formatReportPercent(rate);
  const color =
    tone === "risk"
      ? "var(--destructive)"
      : rate >= 100
        ? "var(--color-success)"
        : "var(--primary)";

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div
        className="relative size-10 shrink-0"
        role="img"
        aria-label={`${label}: ${percentage}, ${numerator} dari ${denominator}${detail ? `, ${detail}` : ""}`}
      >
        <ChartContainer
          config={{ completion: { label, color } }}
          initialDimension={{ width: 40, height: 40 }}
          className="size-10 aspect-square"
          aria-hidden="true"
        >
          <RadialBarChart
            data={[{ name: label, value: completionRate }]}
            startAngle={90}
            endAngle={-270}
            innerRadius="76%"
            outerRadius="96%"
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />
            <RadialBar
              dataKey="value"
              fill="var(--color-completion)"
              background={{ fill: "var(--muted)" }}
              cornerRadius={8}
            />
          </RadialBarChart>
        </ChartContainer>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-[9px] font-semibold leading-none tabular-nums text-foreground"
        >
          {percentage}
        </span>
      </div>
      <div aria-hidden="true" className="min-w-0">
        <p className="text-xs leading-4 tabular-nums text-secondary-foreground">
          {numerator}/{denominator}
        </p>
        {detail && (
          <p className="text-[10px] leading-4 text-muted-foreground">
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}
function SummaryKpis({
  summary: s,
  previous: p,
  cycle,
}: {
  summary: ReportSummary;
  previous: ReportSummary;
  cycle: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ReportKpiCard
        title="Risiko di atas selera risiko"
        value={formatReportPercent(s.appetite.rate)}
        progress={s.appetite.rate}
        tone="risk"
        comparison={comparisonDelta(s.appetite.rate, p.appetite.rate, cycle)}
        href="#risk-register"
        rows={[
          {
            label: "risiko di atas selera",
            value: s.total ? `${s.appetite.above}/${s.total}` : "—",
          },
        ]}
      />
      <ReportKpiCard
        title="Target tercapai"
        value={formatReportPercent(s.target.rate)}
        progress={s.target.rate}
        comparison={comparisonDelta(s.target.rate, p.target.rate, cycle)}
        href="#target-attainment"
        rows={[
          {
            label: "risiko mencapai target",
            value: s.target.eligible
              ? `${s.target.achieved}/${s.target.eligible}`
              : "—",
          },
          {
            label: "risiko belum dapat dinilai",
            value: String(s.target.unavailable),
          },
        ]}
      />
      <ReportKpiCard
        title="Mitigasi terlapor"
        value={formatReportPercent(s.mitigation.rate)}
        progress={s.mitigation.rate}
        comparison={comparisonDelta(s.mitigation.rate, p.mitigation.rate, cycle)}
        href="#mitigation-reporting"
        rows={[
          {
            label: "tugas dengan laporan valid",
            value: s.mitigation.total
              ? `${s.mitigation.reported}/${s.mitigation.total}`
              : "—",
          },
        ]}
      />
      <ReportKpiCard
        title="Pemantauan final"
        value={formatReportPercent(s.monitoring.rate)}
        progress={s.monitoring.rate}
        comparison={comparisonDelta(s.monitoring.rate, p.monitoring.rate, cycle)}
        href="#unit-comparison"
        rows={[
          {
            label: "risiko dipantau final",
            value: s.total ? `${s.monitoring.final}/${s.total}` : "—",
          },
        ]}
      />
    </div>
  );
}
export function QuarterlyReportDashboard({
  report,
  overview,
  loadDetails,
}: {
  report?: QuarterlyReport;
  overview?: QuarterlyReportOverview;
  loadDetails?: (organizationId?: string) => Promise<QuarterlyReport>;
}) {
  const analysis = useMemo(
    () => (report ? buildQuarterlyAnalysis(report) : null),
    [report],
  );
  const data = useMemo(
    () => overview ?? (report ? buildQuarterlyOverview(report) : null),
    [overview, report],
  );
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [unitOpen, setUnitOpen] = useState(false);
  const unitTriggerRef = useRef<HTMLButtonElement | null>(null);
  const unitRequestRef = useRef(0);
  const [unitDetails, setUnitDetails] = useState<
    Record<string, QuarterlyAnalysis["units"][number]>
  >({});
  const [unitLoading, setUnitLoading] = useState(false);
  const [unitError, setUnitError] = useState<string | null>(null);
  const [unitPage, setUnitPage] = useState(1);
  const [unitPageSize, setUnitPageSize] = useState(10);
  if (!data) return null;
  const { summary: s, movement, units } = data;
  const events = data.recentEvents;
  const taskCounts = data.taskCounts;
  const selectedUnitOverview =
    units.find((unit) => unit.id === selectedUnitId) ?? null;
  const selectedUnit = selectedUnitId
    ? (unitDetails[selectedUnitId] ??
      analysis?.units.find((unit) => unit.id === selectedUnitId) ??
      (selectedUnitOverview
        ? {
            ...selectedUnitOverview,
            rows: [],
            tasks: [],
            events: [],
          }
        : null))
    : null;
  const safeUnitPage = Math.min(
    unitPage,
    Math.max(1, Math.ceil(units.length / unitPageSize)),
  );
  const movementData = (["up", "down", "stable", "new"] as const).map(
    (key) => ({
      key,
      label: movementLabels[key],
      value: movement[key],
      fill:
        key === "up"
          ? "var(--risk-extreme)"
          : key === "down"
            ? "var(--risk-low)"
            : key === "new"
              ? "var(--chart-1)"
              : "var(--muted-foreground)",
    }),
  );
  const states: TaskState[] = [
    "reported",
    "pending",
    "overdue",
    "not_reported",
    "skipped",
  ];
  const severityCounts = data.severityCounts;
  const openUnit = async (
    unitId: string,
    trigger: HTMLButtonElement,
  ) => {
    unitTriggerRef.current = trigger;
    setSelectedUnitId(unitId);
    setUnitOpen(true);
    setUnitLoading(false);
    setUnitError(null);
    const localUnit = analysis?.units.find((unit) => unit.id === unitId);
    if (localUnit) {
      setUnitDetails((current) => ({ ...current, [unitId]: localUnit }));
      setUnitLoading(false);
      return;
    }
    if (!loadDetails || unitDetails[unitId]) return;
    const requestId = ++unitRequestRef.current;
    setUnitLoading(true);
    try {
      const fullReport = await loadDetails(unitId);
      const detailedUnit = buildQuarterlyAnalysis(fullReport).units.find(
        (unit) => unit.id === unitId,
      );
      if (requestId !== unitRequestRef.current) return;
      if (detailedUnit) {
        setUnitDetails((current) => ({ ...current, [unitId]: detailedUnit }));
      }
      setUnitLoading(false);
    } catch (error) {
      if (requestId !== unitRequestRef.current) return;
      setUnitError(
        error instanceof Error ? error.message : "Gagal memuat detail unit.",
      );
      setUnitLoading(false);
    }
  };
  return (
    <div className="space-y-6">
      <SummaryKpis
        summary={s}
        previous={data.previousSummary}
        cycle={data.comparisonCycle}
      />
      <Card id="target-attainment" className="scroll-mt-6">
        <CardHeader>
          <CardTitle className="text-sm">
            Perubahan risiko dan pencapaian target
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {data.comparisonCycle} → {data.cycle}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          {data.hasRisks ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <ChartContainer
                  config={{
                    value: { label: "Jumlah risiko", color: "var(--chart-1)" },
                  }}
                  className="h-52 w-full"
                >
                  <BarChart
                    accessibilityLayer
                    data={movementData}
                    layout="vertical"
                    margin={{ top: 12, right: 20, bottom: 12, left: 8 }}
                  >
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={78}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent hideIndicator />}
                    />
                    <Bar dataKey="value" radius={4} isAnimationActive={false}>
                      {movementData.map((item) => (
                        <Cell key={item.key} fill={item.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>
              <div className="flex flex-col gap-4">
                <dl className="grid grid-cols-3 gap-3">
                  {[
                    ["Tercapai", s.target.achieved],
                    ["Belum tercapai", s.target.eligible - s.target.achieved],
                    ["Belum dapat dinilai", s.target.unavailable],
                  ].map(([label, value]) => (
                    <div key={String(label)}>
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="mt-2 text-2xl font-semibold tabular-nums">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="space-y-3 rounded-lg bg-card-subtle-surface p-4">
                  <p className="text-xs text-muted-foreground">
                    Pencapaian pada observasi final
                  </p>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm">{data.cycle}</span>
                    <span className="text-sm font-medium tabular-nums">
                      {rateDetail(
                        s.target.achieved,
                        s.target.eligible,
                        s.target.rate,
                      )}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm text-muted-foreground">
                      {data.comparisonCycle}
                    </span>
                    <span className="text-sm tabular-nums">
                      {rateDetail(
                        data.previousSummary.target.achieved,
                        data.previousSummary.target.eligible,
                        data.previousSummary.target.rate,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <ReportEmptyState description="Belum ada profil final yang berlaku pada periode ini." />
          )}
        </CardContent>
      </Card>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card id="mitigation-reporting" className="scroll-mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Pelaporan mitigasi</CardTitle>
          </CardHeader>
          <CardContent>
            {taskCounts.total ? (
              <div className="space-y-4">
                <div
                  aria-hidden="true"
                  className="flex h-2 overflow-hidden rounded-full bg-muted"
                >
                  {states.map((state) => {
                    const count = taskCounts[state];
                    const color =
                      state === "reported"
                        ? "bg-risk-low"
                        : state === "overdue"
                          ? "bg-risk-extreme"
                          : state === "pending"
                            ? "bg-blue-400"
                            : state === "skipped"
                              ? "bg-muted-foreground/40"
                              : "bg-muted-foreground";
                    return count ? (
                      <div
                        key={state}
                        className={color}
                        style={{ width: `${(count / taskCounts.total) * 100}%` }}
                      />
                    ) : null;
                  })}
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                  {states.map((state) => (
                    <div
                      key={state}
                      className="flex items-baseline justify-between gap-2"
                    >
                      <dt className="text-xs text-muted-foreground">
                        {taskStateLabels[state]}
                      </dt>
                      <dd className="text-sm font-medium tabular-nums">
                        {taskCounts[state]}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <ReportEmptyState description="Belum ada tugas mitigasi yang tercatat untuk kuartal ini." />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Kejadian dan dampak aktual
            </CardTitle>
            {s.events.total > 0 && (
              <CardAction>
                <Badge variant="secondary">{s.events.total} kejadian</Badge>
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            {s.events.total ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-card-subtle-surface p-4">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Kerugian diketahui ({s.events.knownLossCount})
                      </dt>
                      <dd className="mt-1 text-2xl font-semibold tabular-nums">
                        {s.events.knownLossCount
                          ? `Rp ${formatReportNumber(s.events.knownLoss)}`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Nilai belum diketahui
                      </dt>
                      <dd className="mt-1 text-2xl font-semibold tabular-nums">
                        {s.events.unknownLoss}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Belum terhubung
                      </dt>
                      <dd className="mt-1 text-2xl font-semibold tabular-nums">
                        {s.events.unlinked}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["low", "medium", "high", "extreme"] as const).map(
                    (severity) => {
                      const count = severityCounts[severity];
                      return count ? (
                        <Badge key={severity} variant="outline">
                          {severityLabels[severity]}: {count}
                        </Badge>
                      ) : null;
                    },
                  )}
                </div>
                <ul className="divide-y divide-border/60">
                  {events.map((event) => (
                      <li
                        key={event.id}
                        className="py-3 first:pt-0 last:pb-0"
                      >
                        <Link
                          href={`/risk-events/${event.id}`}
                          className="line-clamp-2 text-sm hover:underline"
                        >
                          {event.description}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {event.organizationName || "—"} ·{" "}
                          {conditionLabels[
                            event.postResponseCondition as keyof typeof conditionLabels
                          ] ?? event.postResponseCondition}
                        </p>
                      </li>
                    ))}
                </ul>
                <p className="text-xs leading-5 text-info-foreground">
                  Kondisi pascarespons mengikuti catatan kejadian. Daftar lengkap
                  tersedia pada detail unit.
                </p>
              </div>
            ) : (
              <ReportEmptyState
                title="Belum ada kejadian tercatat"
                description="Atribusi memakai tanggal kejadian. Tidak adanya catatan belum membuktikan tidak ada kejadian."
              />
            )}
          </CardContent>
        </Card>
      </div>
      <Card id="unit-comparison" className="scroll-mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Perbandingan unit</CardTitle>
          <CardAction>
            <Badge variant="secondary">{units.length} unit</Badge>
          </CardAction>
        </CardHeader>
        <CardContent
          className={units.length ? "-mb-(--card-spacing)" : undefined}
        >
          {units.length ? (
            <div className="-mx-4 border-t border-border/60">
              <Table className="min-w-[1120px] table-fixed">
                <caption className="sr-only">
                  Semua unit dalam scope laporan. Klik unit untuk meninjau
                  sumber data tanpa mengubah scope.
                </caption>
                <colgroup>
                  <col style={{ width: "38%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "13%" }} />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-24">Unit</TableHead>
                    <TableHead>Jumlah risiko</TableHead>
                    <TableHead>Di atas selera</TableHead>
                    <TableHead>Target tercapai</TableHead>
                    <TableHead>Mitigasi terlapor</TableHead>
                    <TableHead>Pemantauan final</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units
                    .slice(
                      (safeUnitPage - 1) * unitPageSize,
                      safeUnitPage * unitPageSize,
                    )
                    .map((unit) => (
                      <TableRow key={unit.id}>
                        <TableCell className="whitespace-normal px-24">
                          <Button
                            variant="link"
                            className="h-auto whitespace-normal p-0 text-left font-normal"
                            onClick={(event) =>
                              void openUnit(unit.id, event.currentTarget)
                            }
                            aria-label={`Buka detail ${unit.name}`}
                          >
                            {unit.name}
                          </Button>
                          {!unit.hasData && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Belum ada data
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {unit.hasData ? unit.summary.total : "—"}
                        </TableCell>
                        <TableCell>
                          <UnitRateCell
                            label="Risiko di atas selera"
                            numerator={unit.summary.appetite.above}
                            denominator={unit.summary.total}
                            rate={unit.summary.appetite.rate}
                            tone="risk"
                          />
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <UnitRateCell
                            label="Target tercapai"
                            numerator={unit.summary.target.achieved}
                            denominator={unit.summary.target.eligible}
                            rate={unit.summary.target.rate}
                            detail={
                              unit.summary.target.unavailable
                                ? `${unit.summary.target.unavailable} belum dinilai`
                                : undefined
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <UnitRateCell
                            label="Mitigasi terlapor"
                            numerator={unit.summary.mitigation.reported}
                            denominator={unit.summary.mitigation.total}
                            rate={unit.summary.mitigation.rate}
                          />
                        </TableCell>
                        <TableCell>
                          <UnitRateCell
                            label="Pemantauan final"
                            numerator={unit.summary.monitoring.final}
                            denominator={unit.summary.total}
                            rate={unit.summary.monitoring.rate}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <ReportEmptyState description="Tidak ada unit yang tersedia dalam scope ini." />
          )}
        </CardContent>
        <CollectionPagination
          itemLabel="unit"
          page={safeUnitPage}
          pageSize={unitPageSize}
          total={units.length}
          onPageChange={setUnitPage}
          onPageSizeChange={(size) => {
            setUnitPageSize(size);
            setUnitPage(1);
          }}
        />
      </Card>
      <div id="risk-register" className="scroll-mt-6">
        <QuarterlyReportRiskTable
          rows={analysis?.rows ?? []}
          cycle={data.cycle}
          totalRows={s.total}
          hasRisks={data.hasRisks}
          loadRows={
            loadDetails
              ? async () => buildQuarterlyRiskRows(await loadDetails())
              : undefined
          }
        />
      </div>
      <QuarterlyReportUnitDrawer
        unit={selectedUnit}
        open={unitOpen}
        cycle={data.cycle}
        loading={unitLoading}
        error={unitError}
        onRetry={() => {
          if (selectedUnitId && unitTriggerRef.current) {
            void openUnit(selectedUnitId, unitTriggerRef.current);
          }
        }}
        onClose={() => setUnitOpen(false)}
        onRestoreFocus={() => unitTriggerRef.current?.focus()}
      />
    </div>
  );
}
