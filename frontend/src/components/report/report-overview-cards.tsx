"use client";

import { MotionNumber } from "@/components/shared/design-system/motion/motion-primitives";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ArrowRight, BarChart3, CheckCircle2, CircleDot, Clock,
  FileText, ShieldCheck, TrendingDown, TrendingUp,
} from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ReportEmptyState } from "@/components/shared/design-system";
import { formatReportNumber, formatReportPercent, movementLabels, taskStateLabels } from "@/lib/quarterly-report";
import type { QuarterlyReportOverview } from "@/types/quarterly-report";
import type { ReportRiskFilter } from "./quarterly-report-risk-table";
import { ReportSummaryCard, ReportSummaryMetrics } from "./report-summary-card";

const movementConfig = {
  count: { label: "Jumlah risiko", color: "var(--color-violet-400)" },
} satisfies ChartConfig;

function RateComparison({ current, previous, cycle }: {
  current: number | null; previous: number | null; cycle: string;
}) {
  const delta = current == null || previous == null
    ? null : Math.round((current - previous) * 10) / 10;
  const value = delta == null ? "—" : `${delta > 0 ? "+" : ""}${formatReportNumber(Object.is(delta, -0) ? 0 : delta)}`;
  const explanation = delta == null
    ? `Selisih tidak dapat dihitung dibanding ${cycle} karena data tidak tersedia.`
    : `Selisih ${value} poin persentase dibanding ${cycle}.`;
  return (
    <Tooltip>
      <TooltipTrigger type="button" aria-label={explanation}
        className="inline-flex items-center gap-1.5 rounded-sm text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {delta != null && delta > 0 ? <TrendingUp className="size-3.5" aria-hidden="true" />
          : delta != null && delta < 0 ? <TrendingDown className="size-3.5" aria-hidden="true" /> : null}
        <span className="tabular-nums">{value}{delta == null ? "" : " pp"}</span>
      </TooltipTrigger>
      <TooltipContent>{explanation}</TooltipContent>
    </Tooltip>
  );
}

function ReportFooter({ title, description, href, action, onClick }: {
  title: ReactNode; description: string; href: string; action: string; onClick?: () => void;
}) {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-4">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm tabular-nums">{title}</p>
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <Button asChild variant="ghost" size="sm">
        <Link href={href} onClick={onClick}><ArrowRight data-icon="inline-start" />{action}</Link>
      </Button>
    </div>
  );
}

export function ReportOverviewCards({ data, onInspect }: { data: QuarterlyReportOverview; onInspect?: (filter: ReportRiskFilter) => void }) {
  const [view, setView] = useState<"chart" | "details">("chart");
  const { summary: s, previousSummary: p, movement, taskCounts } = data;
  const movementData = (["up", "down", "stable", "new"] as const).map((key) => ({
    name: movementLabels[key], count: movement[key],
    fill: key === "up" ? "var(--destructive)" : key === "down" ? "var(--color-success)" : "var(--color-violet-400)",
  }));
  const targetRows = [
    { label: "Tercapai", count: s.target.achieved, icon: CheckCircle2 },
    { label: "Belum tercapai", count: s.target.eligible - s.target.achieved, icon: CircleDot },
    { label: "Belum dapat dinilai", count: s.target.unavailable, icon: Clock },
  ];
  return (
    <div className="grid items-stretch gap-6 xl:grid-cols-2">
      <ReportSummaryCard id="risk-movement" title="Profil risiko" className="xl:min-h-[420px]"
        action={
          <div role="group" aria-label="Tampilan perubahan risiko" className="flex gap-1">
            <Button size="icon-sm" variant={view === "chart" ? "outline" : "ghost"}
              aria-label="Grafik perubahan risiko" aria-pressed={view === "chart"} onClick={() => setView("chart")}>
              <BarChart3 />
            </Button>
            <Button size="icon-sm" variant={view === "details" ? "outline" : "ghost"}
              aria-label="Rincian perubahan risiko" aria-pressed={view === "details"} onClick={() => setView("details")}>
              <FileText />
            </Button>
          </div>
        }>
        <div className="space-y-4">
          <div>
            <p className="text-4xl leading-none tabular-nums"><MotionNumber value={formatReportNumber(s.total)} /> <span className="text-sm text-muted-foreground">risiko</span></p>
            <p className="mt-3 text-xs text-muted-foreground">{data.cycle} <span className="mx-1">·</span> Dibanding {data.comparisonCycle}</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground tabular-nums"><MotionNumber value={formatReportPercent(s.appetite.rate)} /></span> di atas selera risiko
              <span className="ml-1.5 tabular-nums">({s.appetite.above}/{s.total})</span>
            </p>
            <RateComparison current={s.appetite.rate} previous={p.appetite.rate} cycle={data.comparisonCycle} />
          </div>
        </div>
        {data.hasRisks ? (
          <div className="mt-auto space-y-3">
            <p className="text-xs text-muted-foreground">Perubahan skor profil risiko</p>
            {view === "chart" ? (
              <>
                <p className="sr-only">{movementData.map((item) => `${item.name}: ${item.count} risiko`).join("; ")}</p>
                <ChartContainer config={movementConfig} className="h-[200px] w-full aspect-auto"
                  aria-label={`Perubahan risiko ${data.cycle} dibanding ${data.comparisonCycle}`}>
                  <BarChart accessibilityLayer data={movementData} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} domain={[0, (max: number) => Math.max(1, max)]} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" width={76} tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={[0, 5, 5, 0]} barSize={20} isAnimationActive={false} />
                  </BarChart>
                </ChartContainer>
              </>
            ) : (
              <dl className="flex min-h-[200px] flex-col justify-around">
                {movementData.map((item) => (
                  <div key={item.name} className="flex justify-between gap-4 text-sm">
                    <dt className="flex items-center gap-2 text-muted-foreground"><span className="size-2 rounded-full" style={{ backgroundColor: item.fill }} aria-hidden="true" />{item.name}</dt>
                    <dd className="tabular-nums"><MotionNumber value={formatReportNumber(item.count)} /></dd>
                  </div>
                ))}
              </dl>
            )}
            {movement.absent > 0 && <p className="text-xs text-muted-foreground">{movement.absent} risiko pembanding tidak ada pada periode ini.</p>}
          </div>
        ) : <ReportEmptyState description="Belum ada profil final yang berlaku pada periode ini." />}
      </ReportSummaryCard>

      <ReportSummaryCard id="target-attainment" title="Pencapaian target" className="xl:min-h-[420px]"
        footer={<ReportFooter title={<>Target tercapai <span className="ml-1 tabular-nums"><MotionNumber value={formatReportPercent(s.target.rate)} /></span></>}
          description={`${s.target.achieved} dari ${s.target.eligible} risiko yang dapat dinilai mencapai target.`}
          href="#risk-register" action="Lihat yang belum tercapai" onClick={() => onInspect?.("target")} />}>
        <dl className="space-y-5">
          {targetRows.map(({ label, count, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card-subtle-surface text-muted-foreground"><Icon className="size-4" aria-hidden="true" /></span>
              <dt className="flex-1 text-sm text-secondary-foreground">{label}</dt>
              <dd className="text-lg tabular-nums"><MotionNumber value={formatReportNumber(count)} /></dd>
            </div>
          ))}
        </dl>
        <div className="mt-auto space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">Capaian pada {data.cycle}</p>
            <RateComparison current={s.target.rate} previous={p.target.rate} cycle={data.comparisonCycle} />
          </div>
          <p className="max-w-md text-xs leading-5 text-muted-foreground">Target profil dibandingkan dengan hasil pemantauan final pada kuartal yang sama.</p>
        </div>
      </ReportSummaryCard>

      <ReportSummaryCard id="mitigation-reporting" title="Pelaporan mitigasi"
        action={<RateComparison current={s.mitigation.rate} previous={p.mitigation.rate} cycle={data.comparisonCycle} />}
        footer={<ReportFooter title={<>{taskCounts.overdue} tugas melewati tenggat</>}
          description={`${formatReportPercent(s.mitigation.rate)} terlapor · ${s.mitigation.reported}/${s.mitigation.total} tugas dengan laporan valid.`}
          href="#risk-register" action="Tinjau yang terlambat" onClick={() => onInspect?.("overdue")} />}>
        <div className="space-y-5">
          <div className="space-y-3"><p className="text-xs font-medium text-muted-foreground">Sudah tercatat</p><ReportSummaryMetrics items={(["reported", "skipped"] as const).map((state) => ({ label: taskStateLabels[state], value: formatReportNumber(taskCounts[state]) }))} /></div>
          <div className="space-y-3"><p className="text-xs font-medium text-muted-foreground">Masih memerlukan perhatian</p><ReportSummaryMetrics items={(["pending", "overdue", "not_reported"] as const).map((state) => ({ label: taskStateLabels[state], value: formatReportNumber(taskCounts[state]) }))} /></div>
        </div>
        <p className="text-xs text-muted-foreground">Terlapor menunjukkan laporan progres yang valid, bukan mitigasi selesai.</p>
        {!taskCounts.total && <p className="text-xs text-muted-foreground">Belum ada tugas mitigasi tercatat pada kuartal ini.</p>}
      </ReportSummaryCard>

      <ReportSummaryCard id="monitoring-summary" title="Pemantauan final"
        action={<RateComparison current={s.monitoring.rate} previous={p.monitoring.rate} cycle={data.comparisonCycle} />}
        footer={<ReportFooter title={<><MotionNumber value={formatReportPercent(s.monitoring.rate)} /> pemantauan final</>}
          description={`${s.monitoring.final}/${s.monitoring.total} risiko · ${data.cycle}`}
          href="#unit-comparison" action="Lihat unit" />}>
        <ReportSummaryMetrics items={[
          { label: "Sudah final", value: formatReportNumber(s.monitoring.final) },
          { label: "Belum final", value: formatReportNumber(Math.max(0, s.monitoring.total - s.monitoring.final)) },
        ]} />
        <div className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
          <p>Hasil final menjadi dasar evaluasi target risiko.</p>
        </div>
      </ReportSummaryCard>
    </div>
  );
}

export function ReportOverviewSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-2" aria-label="Memuat ringkasan" aria-busy="true">
      {["Profil risiko", "Pencapaian target", "Pelaporan mitigasi", "Pemantauan final"].map((title, index) => (
        <ReportSummaryCard key={title} title={title} className={index < 2 ? "xl:min-h-[420px]" : undefined}
          footer={index > 0 ? <Skeleton className="h-12 w-full" /> : undefined}>
          <Skeleton className="h-9 w-28" />
          <Skeleton className={index < 2 ? "h-52 w-full" : "h-20 w-full"} />
        </ReportSummaryCard>
      ))}
    </div>
  );
}
