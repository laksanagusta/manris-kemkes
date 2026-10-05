"use client";

import Link from "next/link";
import { reportErrorMessage } from "@/lib/report-feedback";
import { useMemo, useRef, useState } from "react";
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
import { ReportOverviewCards } from "./report-overview-cards";
import {
  buildQuarterlyAnalysis,
  buildQuarterlyOverview,
  buildQuarterlyRiskRows,
  currentReportCycle,
  formatReportNumber,
  formatReportDate,
  formatReportPercent,
  severityLabels,
  type QuarterlyAnalysis,
} from "@/lib/quarterly-report";
import type {
  QuarterlyReport,
  QuarterlyReportOverview,
} from "@/types/quarterly-report";
import { QuarterlyReportRiskTable, type ReportRiskTableHandle, type ReportRiskFilter } from "./quarterly-report-risk-table";
import { QuarterlyReportUnitDrawer } from "./quarterly-report-unit-drawer";

const eventSeverityChartConfig = {
  low: { label: severityLabels.low, color: RISK_CHART_COLORS.low },
  medium: { label: severityLabels.medium, color: RISK_CHART_COLORS.medium },
  high: { label: severityLabels.high, color: RISK_CHART_COLORS.high },
  extreme: { label: severityLabels.extreme, color: RISK_CHART_COLORS.extreme },
  unknown: { label: "Belum diketahui", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

type EventSeverity = keyof typeof eventSeverityChartConfig;

function reportTimestamp(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return "belum tersedia";
  return `${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value))} WIB`;
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
          <p className="text-xs leading-4 text-muted-foreground">
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
          <p className="text-xs leading-4 text-muted-foreground">
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
        className="relative size-6 shrink-0"
        role="img"
        aria-label={`${label}: ${percentage}, ${numerator} dari ${denominator}${detail ? `, ${detail}` : ""}`}
      >
        <ChartContainer
          config={{ completion: { label, color } }}
          initialDimension={{ width: 24, height: 24 }}
          className="size-6 aspect-square"
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

      </div>
      <div aria-hidden="true" className="min-w-0">
        <p className="text-sm tabular-nums">{percentage}</p>
        <p className="text-xs leading-4 tabular-nums text-secondary-foreground">
          {numerator}/{denominator}
        </p>
        {detail && (
          <p className="text-xs leading-4 text-muted-foreground">
            {detail}
          </p>
        )}
      </div>
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
  const riskTableRef = useRef<ReportRiskTableHandle>(null);
  const riskSectionRef = useRef<HTMLDivElement>(null);
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
  const { summary: s, units } = data;
  const events = data.recentEvents;
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
        reportErrorMessage(error, "Detail unit belum dapat dimuat. Periksa koneksi, lalu pilih Coba lagi."),
      );
      setUnitLoading(false);
    }
  };
  const inspectRisks = (filter: ReportRiskFilter) => {
    riskTableRef.current?.openFor(filter);
    requestAnimationFrame(() => riskSectionRef.current?.focus({ preventScroll: true }));
  };
  return (
    <div className="min-w-0 space-y-8">
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <div className="min-w-0 max-w-[75ch] space-y-2" role="status">
          <p className="flex flex-wrap items-center gap-2 text-sm">Laporan {data.cycle} dibanding {data.comparisonCycle}{(data.cycle === currentReportCycle() || data.comparisonCycle === currentReportCycle()) && <Badge variant="secondary">Kuartal berjalan</Badge>}</p>
          {(data.cycle === currentReportCycle() || data.comparisonCycle === currentReportCycle()) && <p className="text-sm text-info-foreground">{data.cycle === currentReportCycle() ? "Periode laporan" : "Periode pembanding"} belum selesai. Data dan selisih masih dapat berubah; hasil ini belum mewakili satu kuartal penuh.</p>}
          <p className="text-xs text-muted-foreground">Data terakhir diperbarui: {reportTimestamp(data.dataUpdatedAt)}. Diambil pada: {reportTimestamp(data.generatedAt)}. Selisih ditampilkan dalam poin persentase (pp).</p>
        </div>
        {(s.target.eligible > s.target.achieved || data.taskCounts.overdue > 0 || s.monitoring.total > s.monitoring.final) && <div className="min-w-0 space-y-2">
          <p className="text-sm font-medium">Perlu tindak lanjut</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Tindak lanjut laporan">
            {s.target.eligible > s.target.achieved && <Button asChild variant="outline" size="sm"><Link href="#risk-register" onClick={() => inspectRisks("target")}>{s.target.eligible - s.target.achieved} target belum tercapai</Link></Button>}
            {data.taskCounts.overdue > 0 && <Button asChild variant="outline" size="sm"><Link href="#risk-register" onClick={() => inspectRisks("overdue")}>{data.taskCounts.overdue} laporan mitigasi melewati tenggat</Link></Button>}
            {s.monitoring.total > s.monitoring.final && <Button asChild variant="outline" size="sm"><Link href="#risk-register" onClick={() => inspectRisks("monitoring")}>{s.monitoring.total - s.monitoring.final} pemantauan belum final</Link></Button>}
          </div>
        </div>}
      </div>
      <ReportOverviewCards data={data} onInspect={inspectRisks} />
      <ReportSummaryCard title="Kejadian dan dampak aktual">
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
            <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
              <div className="flex flex-wrap items-center gap-6">
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
                          isAnimationActive={false}
                        />
                      </PieChart>
                    </ChartContainer>
                  </div>
                </div>
                <ul
                  aria-label="Jumlah kejadian menurut tingkat"
                  className="flex flex-col items-start gap-3"
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
                <ul className="divide-y divide-border/60">
                  {events.slice(0, 3).map((event) => (
                    <li key={event.id} className="grid gap-2 py-4 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,1fr)_144px_112px] lg:gap-x-4">
                      <Link href={`/risk-events/${event.id}`} className="text-sm hover:text-muted-foreground">
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
      <Card data-report-card="" id="unit-comparison" className="scroll-mt-6">
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
            <div className="-mx-(--card-spacing)">
              <Table data-report-table="" className="min-w-[1120px] table-fixed">
                <caption className="sr-only">
                  Semua unit dalam pilihan laporan. Klik unit untuk meninjau
                  sumber data tanpa mengubah pilihan unit.
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
                    <TableHead className="">Unit</TableHead>
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
                        <TableCell className="whitespace-normal">
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
            <ReportEmptyState description="Tidak ada unit yang tersedia dalam pilihan unit ini." />
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
      <div id="risk-register" ref={riskSectionRef} tabIndex={-1} aria-label="Daftar risiko laporan" className="scroll-mt-6 outline-none">
        <QuarterlyReportRiskTable
          ref={riskTableRef}
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
