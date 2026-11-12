"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowExpand } from "@/components/shared/icons";
import { ReportEmptyState } from "@/components/shared/design-system";
import { ReportWidget } from "@/components/shared/design-system/reports/report-widget";
import { RiskTargetGapCard } from "./risk-target-gap-card";
import { buildRiskSummaryWidgets } from "@/lib/risk-summary-widgets";
import {
  currentReportCycle,
  formatReportNumber,
  formatReportPercent,
} from "@/lib/quarterly-report";
import type { QuarterlyReport } from "@/types/quarterly-report";

const metricLabels = ["Total risiko", "Risiko tinggi & sangat tinggi", "Total unit"];
const metricsLayout = "grid grid-cols-2 gap-4 @min-[36rem]/report:grid-cols-3";
const widgetsLayout = "grid min-w-0 gap-4 @min-[48rem]/report:grid-cols-2";
const meterRow = "grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(3rem,30%)_minmax(2ch,auto)] items-center gap-3 text-sm";
const countClass = "text-right tabular-nums";
const unitRankingTitle = "Risiko tinggi dan sangat tinggi per unit";

function ProgressMeter({ value, total, label, color = "var(--info-foreground)" }: {
  value: number;
  total: number;
  label: string;
  color?: string;
}) {
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.max(1, total)}
      aria-valuenow={value}
      aria-valuetext={`${value} dari ${total}`}
      className="h-1.5 overflow-hidden rounded-full bg-foreground/10"
    >
      <div className="h-full rounded-full" style={{
        width: `${total ? value / total * 100 : 0}%`,
        backgroundColor: color,
      }} />
    </div>
  );
}

function UnitRankingList({ units, highest }: {
  units: ReturnType<typeof buildRiskSummaryWidgets>["units"];
  highest: number;
}) {
  return (
    <ol className="space-y-2.5">
      {units.map(unit => (
        <li key={unit.id} className={meterRow}>
          <span className="wrap-anywhere">{unit.name}</span>
          <ProgressMeter value={unit.highCount} total={highest} label={`Risiko tinggi dan sangat tinggi di ${unit.name}`} />
          <span className={countClass}>{formatReportNumber(unit.highCount)}</span>
        </li>
      ))}
    </ol>
  );
}

export function RiskSummarySkeleton({ comparison = false }: { comparison?: boolean }) {
  const titles = comparison
    ? ["Komposisi", "Perubahan", "Indikator"]
    : ["Distribusi tingkat risiko", "Kesenjangan terhadap target", unitRankingTitle, "Pelaporan mitigasi"];
  return (
    <div className="@container/report space-y-4" aria-label={comparison ? "Memuat perbandingan risiko" : "Memuat ringkasan risiko"} aria-busy="true">
      {!comparison && (
        <div className={metricsLayout}>
          {metricLabels.map(label => (
            <Card key={label} className="min-h-28 gap-2 p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <Skeleton className="h-8 w-20" />
            </Card>
          ))}
        </div>
      )}
      <div className={widgetsLayout}>
        {titles.map((title, index) => (
          <ReportWidget key={title} title={title} chart={comparison || index === 1}
            className={comparison && index === 2 ? "@min-[48rem]/report:col-span-2" : undefined}>
            <Skeleton className={comparison || index < 2 ? "h-64 w-full" : "h-28 w-full"} />
          </ReportWidget>
        ))}
      </div>
    </div>
  );
}

export function QuarterlyReportDashboard({ report, illustrative = false }: {
  report: QuarterlyReport;
  illustrative?: boolean;
}) {
  const { data, previous } = useMemo(() => ({
    data: buildRiskSummaryWidgets(report),
    previous: buildRiskSummaryWidgets({ ...report, risks: report.previousRisks, organizations: [], tasks: [] }),
  }), [report]);
  const { reporting, distribution, units } = data;
  const highest = Math.max(1, ...units.map(unit => unit.highCount));
  const running = report.cycle === currentReportCycle();
  const metrics = [
    { value: data.total, change: data.total - previous.total },
    { value: data.highCount, change: data.highCount - previous.highCount },
    { value: units.length, change: 0 },
  ];
  const remainingReports = [
    { label: "Melewati tenggat", count: reporting.overdue, overdue: true },
    { label: "Belum terlapor", count: reporting.pending },
    { label: "Tidak dilaporkan", count: reporting.notReported },
    { label: "Dilewati", count: reporting.skipped },
  ].filter(status => status.count > 0);

  return (
    <section aria-label="Ringkasan risiko" className="@container/report min-w-0 space-y-4">
      {(illustrative || running) && (
        <div className="flex flex-wrap gap-2">
          {illustrative && <Badge variant="secondary">Data ilustrasi</Badge>}
          {running && <Badge variant="secondary">Kuartal berjalan, data sementara</Badge>}
        </div>
      )}
      <dl className={metricsLayout}>
        {metrics.map(({ value, change }, index) => (
          <Card key={metricLabels[index]} className="min-h-28 min-w-0 gap-1.5 p-4">
            <dt className="text-xs font-medium text-muted-foreground">{metricLabels[index]}</dt>
            <dd className="flex flex-wrap items-baseline gap-x-2 gap-y-1 tabular-nums">
              <span className="text-2xl font-semibold leading-tight tracking-tight">{formatReportNumber(value)}</span>
              {change !== 0 && report.comparisonCycle !== report.cycle && (
                <span className="text-xs text-muted-foreground">
                  <span className="font-medium">{change > 0 ? "+" : "−"}{formatReportNumber(Math.abs(change))}</span>{" "}
                  dari {report.comparisonCycle}
                </span>
              )}
            </dd>
          </Card>
        ))}
      </dl>

      <div className={widgetsLayout}>
        <ReportWidget title="Distribusi tingkat risiko">
          {data.total ? (
            <ul className="space-y-2.5">
              {distribution.filter(level => level.key !== "unknown" || level.count > 0).map(level => (
                <li key={level.key} className={meterRow}>
                  <span>{level.label}</span>
                  <ProgressMeter value={level.count} total={data.total} label={`Risiko ${level.label.toLowerCase()}`} color={level.color} />
                  <span className={countClass}>{formatReportNumber(level.count)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ReportEmptyState title="Belum ada risiko pada periode ini" description="Pilih periode atau unit lain untuk melihat distribusi risiko." />
          )}
        </ReportWidget>

        <RiskTargetGapCard report={report} />

        <Dialog>
          <ReportWidget title={unitRankingTitle} action={units.length > 0 ? (
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="icon-sm" aria-label="Lihat peringkat semua unit" title="Lihat peringkat semua unit">
                <ArrowExpand aria-hidden="true" />
              </Button>
            </DialogTrigger>
          ) : undefined}>
            {units.length > 0 ? (
              <UnitRankingList units={units.slice(0, 5)} highest={highest} />
            ) : <ReportEmptyState description="Tidak ada unit dalam cakupan laporan." />}
          </ReportWidget>
          <DialogContent className="flex max-w-2xl flex-col gap-0 overflow-hidden p-0">
            <DialogHeader className="shrink-0 border-b px-6 py-5 pe-16">
              <DialogTitle>{unitRankingTitle}</DialogTitle>
              <DialogDescription>{formatReportNumber(units.length)} unit · {report.cycle}</DialogDescription>
            </DialogHeader>
            <div className="min-h-0 overflow-y-auto px-6 py-5" role="region" aria-label="Daftar peringkat unit" tabIndex={0}>
              <UnitRankingList units={units} highest={highest} />
            </div>
          </DialogContent>
        </Dialog>

        <ReportWidget title="Pelaporan mitigasi">
          {reporting.total > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-2xl font-semibold tabular-nums tracking-tight">{formatReportPercent(reporting.rate)} <span className="text-xs font-normal text-muted-foreground">terlapor</span></p>
                <p className="text-xs tabular-nums text-muted-foreground" aria-label={`${reporting.reported} dari ${reporting.total} laporan terlapor`}>
                  {formatReportNumber(reporting.reported)}/{formatReportNumber(reporting.total)} laporan
                </p>
              </div>
              <ProgressMeter value={reporting.reported} total={reporting.total} label="Kelengkapan pelaporan mitigasi" />
              {remainingReports.length > 0 && (
                <dl className="space-y-2 pt-1 text-sm">
                  {remainingReports.map(status => (
                    <div key={status.label} className={`flex items-baseline justify-between gap-2 ${status.overdue ? "text-destructive" : "text-muted-foreground"}`}>
                      <dt>{status.label}</dt>
                      <dd className={countClass}>{formatReportNumber(status.count)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          ) : <p className="text-sm text-muted-foreground">Belum ada laporan mitigasi yang diwajibkan pada periode ini.</p>}
        </ReportWidget>
      </div>
    </section>
  );
}
