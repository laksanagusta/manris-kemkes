"use client";

import { useMemo, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportEmptyState } from "@/components/shared/design-system";
import { RiskTargetGapCard } from "./risk-target-gap-card";
import { buildRiskSummaryWidgets } from "@/lib/risk-summary-widgets";
import {
  currentReportCycle,
  formatReportNumber,
  formatReportPercent,
} from "@/lib/quarterly-report";
import type { QuarterlyReport } from "@/types/quarterly-report";

function Widget({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card data-risk-summary-card="" className="gap-4">
      <CardHeader><CardTitle><h2>{title}</h2></CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ProgressMeter({ value, total, label, color }: {
  value: number;
  total: number;
  label: string;
  color: string;
}) {
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.max(1, total)}
      aria-valuenow={value}
      aria-valuetext={`${value} dari ${total}`}
      className="h-3 overflow-hidden rounded-full bg-muted"
    >
      <div className="h-full rounded-full" style={{
        width: `${total ? value / total * 100 : 0}%`,
        backgroundColor: color,
      }} />
    </div>
  );
}

function UnitRankingList({ units, highest, start = 1 }: {
  units: ReturnType<typeof buildRiskSummaryWidgets>["units"];
  highest: number;
  start?: number;
}) {
  return (
    <ol start={start} className="space-y-4">
      {units.map(unit => (
        <li key={unit.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[minmax(9rem,16rem)_minmax(0,1fr)_3rem]">
          <span className="break-words text-sm">{unit.name}</span>
          <div className="col-span-2 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
            <ProgressMeter value={unit.highCount} total={highest} label={`Risiko tinggi dan sangat tinggi: ${unit.name}`} color="var(--color-orange-500)" />
          </div>
          <span className="col-start-2 row-start-1 text-right text-sm tabular-nums sm:col-start-3">{formatReportNumber(unit.highCount)}</span>
        </li>
      ))}
    </ol>
  );
}

export function RiskSummarySkeleton() {
  return (
    <div className="space-y-6" aria-label="Memuat ringkasan risiko" aria-busy="true">
      <Widget title="Profil risiko">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex flex-col gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-4 w-28 max-w-full" />
            </div>
          ))}
        </div>
      </Widget>
      {["Distribusi tingkat risiko", "Kesenjangan terhadap target", "Risiko tinggi dan sangat tinggi per unit", "Pelaporan mitigasi"].map(title => (
        <Widget key={title} title={title}><Skeleton className="h-24 w-full" /></Widget>
      ))}
    </div>
  );
}

export function QuarterlyReportDashboard({ report, illustrative = false }: {
  report: QuarterlyReport;
  illustrative?: boolean;
}) {
  const data = useMemo(() => buildRiskSummaryWidgets(report), [report]);
  const { reporting, distribution, units } = data;
  const highest = Math.max(1, ...units.map(unit => unit.highCount));
  const running = report.cycle === currentReportCycle();
  const metrics = [
    { label: "Total risiko", value: formatReportNumber(data.total) },
    { label: "Risiko tinggi & sangat tinggi", value: formatReportNumber(data.highCount) },
    { label: "Total unit", value: formatReportNumber(units.length) },
  ];
  const remainingReports = [
    { label: "Melewati tenggat", count: reporting.overdue, overdue: true },
    { label: "Belum terlapor", count: reporting.pending },
    { label: "Tidak dilaporkan", count: reporting.notReported },
    { label: "Dilewati", count: reporting.skipped },
  ].filter(status => status.count > 0);

  return (
    <div className="min-w-0 space-y-6">
      <Card data-risk-summary-card="" className="gap-4">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle><h2>Profil risiko</h2></CardTitle>
            {illustrative && <Badge variant="secondary">Data ilustrasi</Badge>}
          </div>
          {running && (
            <div>
              <Badge variant="secondary">Kuartal berjalan, data sementara</Badge>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-3">
            {metrics.map(metric => (
              <div key={metric.label} className="flex min-w-0 flex-col gap-2">
                <dt className="text-sm text-muted-foreground">{metric.label}</dt>
                <dd className="order-first text-3xl font-semibold tabular-nums tracking-tight">{metric.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Widget title="Distribusi tingkat risiko">
        {data.total ? (
          <div className="flex flex-col gap-4">
            <div
              role="img"
              aria-label={`Distribusi ${data.total} risiko: ${distribution.map(level => `${level.label} ${level.count}`).join(", ")}`}
              className="flex h-5 gap-1 overflow-hidden rounded-full"
            >
              {distribution.filter(level => level.count > 0).map(level => (
                <div key={level.key} style={{ flex: level.count, backgroundColor: level.color }} />
              ))}
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-5">
              {distribution.filter(level => level.key !== "unknown" || level.count > 0).map(level => (
                <div key={level.key} className="flex flex-col gap-2">
                  <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: level.color }} />
                    {level.label}
                  </dt>
                  <dd className="text-xl tabular-nums">{formatReportNumber(level.count)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <ReportEmptyState title="Belum ada risiko pada periode ini" description="Pilih periode atau unit lain untuk melihat distribusi risiko." />
        )}
      </Widget>

      <RiskTargetGapCard report={report} />

      <Widget title="Risiko tinggi dan sangat tinggi per unit">
        {units.length ? (
          <div className="space-y-4">
            <UnitRankingList units={units.slice(0, 5)} highest={highest} />
            {units.length > 5 && (
              <details>
                <summary className="w-fit cursor-pointer rounded-control text-sm text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring">
                  Unit lainnya ({formatReportNumber(units.length - 5)})
                </summary>
                <div className="pt-4"><UnitRankingList units={units.slice(5)} highest={highest} start={6} /></div>
              </details>
            )}
          </div>
        ) : <ReportEmptyState description="Tidak ada unit dalam cakupan laporan." />}
      </Widget>

      <Widget title="Pelaporan mitigasi">
        {reporting.total > 0 ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="text-xl tabular-nums">{formatReportPercent(reporting.rate)} <span className="text-sm text-muted-foreground">terlapor</span></p>
              <p className="text-sm tabular-nums text-muted-foreground" aria-label={`${reporting.reported} dari ${reporting.total} laporan terlapor`}>
                {formatReportNumber(reporting.reported)}/{formatReportNumber(reporting.total)} laporan
              </p>
            </div>
            <ProgressMeter value={reporting.reported} total={reporting.total} label="Kelengkapan pelaporan mitigasi" color="var(--color-green-500)" />
            {remainingReports.length > 0 && (
              <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {remainingReports.map(status => (
                  <div key={status.label} className={`flex items-baseline gap-2 ${status.overdue ? "text-destructive" : "text-muted-foreground"}`}>
                    <dt>{status.label}</dt>
                    <dd className="tabular-nums">{formatReportNumber(status.count)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        ) : <p className="text-sm text-muted-foreground">Belum ada laporan mitigasi yang diwajibkan pada periode ini.</p>}
      </Widget>

    </div>
  );
}
