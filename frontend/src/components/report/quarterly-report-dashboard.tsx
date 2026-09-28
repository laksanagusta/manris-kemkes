"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Cell, LabelList } from "recharts";
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
  DashboardKpiCard,
  ReportEmptyState,
  CollectionPagination,
} from "@/components/shared/design-system";
import {
  buildQuarterlyAnalysis,
  formatReportNumber,
  formatReportPercent,
  movementLabels,
  taskStateLabels,
  conditionLabels,
  severityLabels,
  type ReportSummary,
  type TaskState,
} from "@/lib/quarterly-report";
import type { QuarterlyReport } from "@/types/quarterly-report";
import { QuarterlyReportRiskTable } from "./quarterly-report-risk-table";
import { QuarterlyReportUnitDrawer } from "./quarterly-report-unit-drawer";

function changeText(
  current: number | null,
  previous: number | null,
  cycle: string,
) {
  if (current === null || previous === null)
    return `Pembanding ${cycle}: belum dapat dihitung`;
  const delta = Math.round((current - previous) * 10) / 10;
  return `${delta > 0 ? "+" : ""}${formatReportNumber(delta)} poin persentase dari ${cycle}`;
}
function rateDetail(value: number, total: number, rate: number | null) {
  return `${value}/${total} · ${formatReportPercent(rate)}`;
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardKpiCard
        title="Risiko di atas selera risiko"
        value={formatReportPercent(s.appetite.rate)}
        detail={`${s.appetite.above}/${s.total} risiko · ${changeText(s.appetite.rate, p.appetite.rate, cycle)}`}
        trend={
          s.appetite.rate !== null &&
          p.appetite.rate !== null &&
          s.appetite.rate !== p.appetite.rate
            ? s.appetite.rate > p.appetite.rate
              ? "up"
              : "down"
            : undefined
        }
      />
      <DashboardKpiCard
        title="Target tercapai"
        value={formatReportPercent(s.target.rate)}
        detail={`${s.target.achieved}/${s.target.eligible} dapat dinilai · ${s.target.unavailable} belum dapat dinilai. ${changeText(s.target.rate, p.target.rate, cycle)}`}
      />
      <DashboardKpiCard
        title="Mitigasi terlapor"
        value={formatReportPercent(s.mitigation.rate)}
        detail={`${s.mitigation.reported}/${s.mitigation.total} tugas · ${changeText(s.mitigation.rate, p.mitigation.rate, cycle)}`}
      />
      <DashboardKpiCard
        title="Pemantauan final"
        value={formatReportPercent(s.monitoring.rate)}
        detail={`${s.monitoring.final}/${s.total} risiko · ${changeText(s.monitoring.rate, p.monitoring.rate, cycle)}`}
      />
    </div>
  );
}
export function QuarterlyReportDashboard({
  report,
}: {
  report: QuarterlyReport;
}) {
  const analysis = useMemo(() => buildQuarterlyAnalysis(report), [report]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [unitOpen, setUnitOpen] = useState(false);
  const unitTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [unitPage, setUnitPage] = useState(1);
  const [unitPageSize, setUnitPageSize] = useState(10);
  const { summary: s, movement, rows, units, tasks, events } = analysis;
  const selectedUnit = units.find((unit) => unit.id === selectedUnitId) ?? null;
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
  return (
    <div className="space-y-6">
      <SummaryKpis
        summary={s}
        previous={analysis.previousSummary}
        cycle={report.comparisonCycle}
      />
      <p className="text-xs leading-5 text-muted-foreground">
        Cakupan data {report.cycle}: {s.monitoring.final}/{s.total} observasi
        final · {s.targetsAvailable}/{s.total} target tersedia ·{" "}
        {s.evidenceAvailable}/{s.mitigation.reported} laporan terlapor memiliki
        referensi bukti.
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Perubahan risiko dan pencapaian target
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {report.comparisonCycle} → {report.cycle}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          {rows.length ? (
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
                    margin={{ left: 8, right: 20 }}
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
                      <LabelList
                        dataKey="value"
                        position="right"
                        fontSize={12}
                        fill="var(--foreground)"
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Perubahan nilai profil kuartal yang dibulatkan. Profil dengan
                  skor ≥10 berada di atas selera risiko. Risiko baru tetap
                  dihitung tersendiri. {movement.absent} risiko pembanding tidak
                  masuk populasi periode ini; hal ini bukan penurunan skor.
                </p>
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
                    <span className="text-sm">{report.cycle}</span>
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
                      {report.comparisonCycle}
                    </span>
                    <span className="text-sm tabular-nums">
                      {rateDetail(
                        analysis.previousSummary.target.achieved,
                        analysis.previousSummary.target.eligible,
                        analysis.previousSummary.target.rate,
                      )}
                    </span>
                  </div>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  Hasil pemantauan dibandingkan dengan target profil yang
                  berlaku pada kuartal tersebut. Belum tercapai menunjukkan
                  posisi terhadap target; tenggat target belum dicatat.
                </p>
              </div>
            </div>
          ) : (
            <ReportEmptyState description="Belum ada profil final yang berlaku pada periode ini." />
          )}
        </CardContent>
      </Card>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pelaporan mitigasi</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length ? (
              <div className="space-y-4">
                {states.map((state) => {
                  const count = tasks.filter(
                    (row) => row.state === state,
                  ).length;
                  return (
                    <div key={state} className="space-y-2">
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span>{taskStateLabels[state]}</span>
                        <span className="tabular-nums">{count}</span>
                      </div>
                      <div
                        aria-hidden="true"
                        className="h-1.5 overflow-hidden rounded-full bg-muted"
                      >
                        <div
                          className={`h-full rounded-full ${state === "reported" ? "bg-risk-low" : state === "overdue" ? "bg-risk-extreme" : "bg-muted-foreground"}`}
                          style={{ width: `${(count / tasks.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <p className="pt-2 text-xs leading-5 text-muted-foreground">
                  {s.mitigation.reported}/{s.mitigation.total} tugas memiliki
                  laporan valid. Penyebut mencakup seluruh tugas periode,
                  termasuk yang dilewati. Pelaporan belum membuktikan
                  pelaksanaan tindakan selesai atau menyebabkan target risiko
                  tercapai.
                </p>
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
            <CardAction>
              <Badge variant="secondary">{events.length} kejadian</Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            {events.length ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-card-subtle-surface p-4">
                  <p className="text-xs text-muted-foreground">
                    Kerugian finansial yang diketahui
                  </p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">
                    {s.events.knownLossCount
                      ? `Rp ${formatReportNumber(s.events.knownLoss)}`
                      : "—"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {s.events.knownLossCount} nilai diketahui ·{" "}
                    {s.events.unknownLoss} belum diketahui · {s.events.unlinked}{" "}
                    belum terhubung ke register.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["low", "medium", "high", "extreme"] as const).map(
                    (severity) => (
                      <Badge key={severity} variant="outline">
                        {severityLabels[severity]}:{" "}
                        {
                          events.filter((event) => event.severity === severity)
                            .length
                        }
                      </Badge>
                    ),
                  )}
                </div>
                <ul className="space-y-3">
                  {[...events]
                    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
                    .slice(0, 3)
                    .map((event) => (
                      <li key={event.id}>
                        <Link
                          href={`/risk-events/${event.id}`}
                          className="line-clamp-2 text-sm hover:underline"
                        >
                          {event.description}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {event.organizationName || "—"} ·{" "}
                          {conditionLabels[event.postResponseCondition]}
                        </p>
                      </li>
                    ))}
                </ul>
                <p className="text-xs leading-5 text-muted-foreground">
                  Kondisi pascarespons adalah kondisi yang dicatat, bukan status
                  terkini otomatis. Detail seluruh kejadian tersedia pada drawer
                  unit.
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
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Perbandingan unit</CardTitle>
          <CardAction>
            <Badge variant="secondary">{units.length} unit</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          {units.length ? (
            <div className="-mx-4">
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
                            onClick={(event) => {
                              unitTriggerRef.current = event.currentTarget;
                              setSelectedUnitId(unit.id);
                              setUnitOpen(true);
                            }}
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
                        <TableCell className="tabular-nums">
                          {unit.summary.total
                            ? rateDetail(
                                unit.summary.appetite.above,
                                unit.summary.total,
                                unit.summary.appetite.rate,
                              )
                            : "—"}
                        </TableCell>
                        <TableCell className="whitespace-normal tabular-nums">
                          {unit.summary.target.eligible
                            ? rateDetail(
                                unit.summary.target.achieved,
                                unit.summary.target.eligible,
                                unit.summary.target.rate,
                              )
                            : "—"}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {unit.summary.target.unavailable
                              ? `${unit.summary.target.unavailable} belum dinilai`
                              : ""}
                          </p>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {unit.summary.mitigation.total
                            ? rateDetail(
                                unit.summary.mitigation.reported,
                                unit.summary.mitigation.total,
                                unit.summary.mitigation.rate,
                              )
                            : "—"}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {unit.summary.total
                            ? rateDetail(
                                unit.summary.monitoring.final,
                                unit.summary.total,
                                unit.summary.monitoring.rate,
                              )
                            : "—"}
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
      <QuarterlyReportRiskTable rows={rows} cycle={report.cycle} />
      <QuarterlyReportUnitDrawer
        unit={selectedUnit}
        open={unitOpen}
        cycle={report.cycle}
        onClose={() => setUnitOpen(false)}
        onRestoreFocus={() => unitTriggerRef.current?.focus()}
      />
    </div>
  );
}
