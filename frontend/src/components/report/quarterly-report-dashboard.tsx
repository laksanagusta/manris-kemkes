"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ClipboardCheck,
  Target,
} from "@/components/shared/icons";
import {
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
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
  type ChartConfig,
} from "@/components/ui/chart";
import { ReportSummaryCard, ReportSummaryMetrics } from "@/components/report/report-summary-card";
import { RISK_CHART_COLORS } from "@/lib/chart-colors";
import {
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
  formatReportDate,
  formatReportPercent,
  movementLabels,
  taskStateLabels,
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

const eventSeverityChartConfig = {
  low: { label: severityLabels.low, color: RISK_CHART_COLORS.low },
  medium: { label: severityLabels.medium, color: RISK_CHART_COLORS.medium },
  high: { label: severityLabels.high, color: RISK_CHART_COLORS.high },
  extreme: { label: severityLabels.extreme, color: RISK_CHART_COLORS.extreme },
  unknown: { label: "Belum diketahui", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

type EventSeverity = keyof typeof eventSeverityChartConfig;

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
        : "var(--color-violet-400)";

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
  const states: TaskState[] = [
    "reported",
    "pending",
    "overdue",
    "not_reported",
    "skipped",
  ];
  const severityCounts = data.severityCounts;
  const severityLevels = ["low", "medium", "high", "extreme"] as const;
  const severitySegments = severityLevels
    .map((severity) => ({ severity, count: severityCounts[severity] }))
    .filter(({ count }) => count > 0);
  const classifiedSeverityCount = severitySegments.reduce(
    (total, segment) => total + segment.count,
    0,
  );
  const unclassifiedSeverityCount = Math.max(
    0,
    s.events.total - classifiedSeverityCount,
  );
  const severityChartData: {
    severity: EventSeverity;
    count: number;
    fill: string;
  }[] = [
    ...severitySegments.map(({ severity, count }) => ({
      severity,
      count,
      fill: eventSeverityChartConfig[severity].color,
    })),
    ...(unclassifiedSeverityCount > 0
      ? [
          {
            severity: "unknown" as const,
            count: unclassifiedSeverityCount,
            fill: eventSeverityChartConfig.unknown.color,
          },
        ]
      : []),
  ];
  const severityChartLabel = severityChartData
    .map(
      ({ severity, count }) =>
        `${eventSeverityChartConfig[severity].label} ${count}`,
    )
    .join(", ");
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
    <div className="space-y-4">
      <SummaryKpis
        summary={s}
        previous={data.previousSummary}
        cycle={data.comparisonCycle}
      />
      <ReportSummaryCard
        id="risk-movement"
        title="Perubahan risiko"
        icon={<Activity aria-hidden="true" />}
      >
        {data.hasRisks ? (
          <ReportSummaryMetrics
            items={(["up", "down", "stable", "new"] as const).map((key) => ({
              label: movementLabels[key],
              value: movement[key],
            }))}
          />
        ) : (
          <ReportEmptyState description="Belum ada profil final yang berlaku pada periode ini." />
        )}
      </ReportSummaryCard>
      <ReportSummaryCard id="target-attainment" title="Pencapaian target" icon={<Target aria-hidden="true" />}>
        {data.hasRisks ? (
          <ReportSummaryMetrics items={[
            { label: "Tercapai", value: s.target.achieved },
            { label: "Belum tercapai", value: s.target.eligible - s.target.achieved },
            { label: "Belum dapat dinilai", value: s.target.unavailable },
          ]} />
        ) : (
          <ReportEmptyState description="Belum ada profil final yang berlaku pada periode ini." />
        )}
      </ReportSummaryCard>
      <ReportSummaryCard id="mitigation-reporting" title="Pelaporan mitigasi" icon={<ClipboardCheck aria-hidden="true" />}>
        {taskCounts.total ? (
          <ReportSummaryMetrics
            items={states.map((state) => ({
              label: taskStateLabels[state],
              value: taskCounts[state],
            }))}
          />
        ) : (
          <ReportEmptyState description="Belum ada tugas mitigasi yang tercatat untuk kuartal ini." />
        )}
      </ReportSummaryCard>
      <ReportSummaryCard title="Kejadian dan dampak aktual" icon={<AlertTriangle aria-hidden="true" />}>
        <ReportSummaryMetrics
          items={[
            {
              label: "Kerugian",
              value: `Rp ${formatReportNumber(s.events.knownLoss)}`,
            },
            { label: "Nilai belum diketahui", value: s.events.unknownLoss },
            { label: "Belum terhubung", value: s.events.unlinked },
          ]}
        />
        {s.events.total ? (
          <>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] sm:items-center">
              <div className="space-y-2">
                <p className="text-xs text-secondary-foreground">Distribusi tingkat kejadian</p>
                <div
                  role="group"
                  aria-label={`Diagram donat distribusi tingkat kejadian: ${severityChartLabel}`}
                  className="aspect-square w-full max-w-[180px]"
                >
                  <ChartContainer
                    config={eventSeverityChartConfig}
                    className="size-full max-h-[180px] max-w-[180px] aspect-square"
                  >
                    <PieChart accessibilityLayer>
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Pie
                        data={severityChartData}
                        dataKey="count"
                        nameKey="severity"
                        cx="50%"
                        cy="50%"
                        innerRadius="48%"
                        outerRadius="80%"
                        paddingAngle={2}
                        stroke="var(--card)"
                        strokeWidth={5}
                      />
                    </PieChart>
                  </ChartContainer>
                </div>
              </div>
              <ul
                aria-label="Jumlah kejadian menurut tingkat"
                className="flex flex-col items-start gap-2"
              >
                {severityChartData.map(({ severity, count, fill }) => (
                  <li
                    key={severity}
                    className="inline-flex items-center gap-2 whitespace-nowrap text-xs text-secondary-foreground"
                  >
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: fill }}
                    />
                    <span>{eventSeverityChartConfig[severity].label}</span>
                    <span className="tabular-nums text-foreground">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_144px_112px] gap-x-4 text-xs font-medium text-secondary-foreground lg:grid">
                <span>Kejadian</span>
                <span className="text-right">Waktu</span>
                <span className="text-right">Tingkat</span>
              </div>
              <ul className="space-y-4">
                {events.map((event) => (
                  <li key={event.id} className="grid gap-1 lg:grid-cols-[minmax(0,1fr)_144px_112px] lg:gap-x-4">
                    <Link href={`/risk-events/${event.id}`} className="text-sm font-medium hover:no-underline">
                      {event.description}
                    </Link>
                    <span className="text-sm text-secondary-foreground lg:text-right">
                      <span className="sr-only">Waktu: </span>
                      {formatReportDate(event.occurredAt)}
                    </span>
                    <span className="text-xs text-secondary-foreground lg:text-right">
                      <span className="sr-only">Tingkat: </span>
                      {(severityLabels[event.severity as keyof typeof severityLabels] ?? event.severity) || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs leading-5 text-info-foreground">
              Waktu dan tingkat mengikuti catatan kejadian. Buka kejadian untuk melihat informasi lengkap.
            </p>
          </>
        ) : (
          <ReportEmptyState
            title="Belum ada kejadian tercatat"
            description="Atribusi memakai tanggal kejadian. Tidak adanya catatan belum membuktikan tidak ada kejadian."
          />
        )}
      </ReportSummaryCard>
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
