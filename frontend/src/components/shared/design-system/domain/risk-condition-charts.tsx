"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Info } from "@/components/shared/icons";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { StandardCard } from "../layout/standard-card";
import { OverviewPanelState } from "./overview-panel-state";
import { buildRiskConditionChartData, formatReportPercent } from "@/lib/quarterly-report";
import { RISK_CHART_COLORS } from "@/lib/chart-colors";
import type { QuarterlyReport, QuarterlyRisk } from "@/types/quarterly-report";

const levels = [
  { key: "veryLow", label: "Sangat rendah", color: RISK_CHART_COLORS.veryLow },
  { key: "low", label: "Rendah", color: RISK_CHART_COLORS.low },
  { key: "medium", label: "Sedang", color: RISK_CHART_COLORS.medium },
  { key: "high", label: "Tinggi", color: RISK_CHART_COLORS.high },
  { key: "extreme", label: "Sangat tinggi", color: RISK_CHART_COLORS.extreme },
  { key: "unknown", label: "Belum dinilai", color: "var(--muted-foreground)" },
] as const;
const compositionConfig = Object.fromEntries(levels.map((level) => [level.key, { label: level.label, color: level.color }])) satisfies ChartConfig;
const valueConfig = { value: { label: "Jumlah risiko", color: "var(--color-violet-400)" } } satisfies ChartConfig;
const rateConfig = { value: { label: "Capaian", color: "var(--color-violet-400)" } } satisfies ChartConfig;
const indicatorLabels = ["Area penerimaan", "Rencana mitigasi", "Mitigasi terlapor", "Pemantauan Final", "Target residual"];

const compactIndicatorLabels: Record<string, string> = {
  "Area penerimaan": "Area", "Rencana mitigasi": "Rencana", "Mitigasi terlapor": "Lapor",
  "Pemantauan Final": "Pantau", "Target residual": "Target",
};

function CategoryTick({ x = 0, y = 0, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const label = String(payload?.value ?? "");
  const compact = compactIndicatorLabels[label];
  return <g>
    <text x={x} y={y} textAnchor="middle" fill="var(--muted-foreground)" fontSize={12} className={compact ? "hidden @min-[24rem]/plot:block" : undefined}>
      {label.split(" ").map((word, index) => <tspan key={index} x={x} dy={14}>{word}</tspan>)}
    </text>
    {compact && <text x={x} y={y + 14} textAnchor="middle" fill="var(--muted-foreground)" fontSize={12} aria-label={label} className="@min-[24rem]/plot:hidden">{compact}</text>}
  </g>;
}

function ChartTitle({ title, description }: { title: string; description: string }) {
  return <span className="inline-flex items-center gap-1.5">
    <span>{title}</span>
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label={`Tentang ${title}`} className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:size-10">
          <Info aria-hidden="true" className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-pretty">{description}</TooltipContent>
    </Tooltip>
  </span>;
}

export function RiskConditionCharts({ report, activeProfiles, previousProfiles }: {
  report: QuarterlyReport;
  activeProfiles: QuarterlyRisk[];
  previousProfiles: QuarterlyRisk[];
}) {
  const data = useMemo(() => buildRiskConditionChartData(report, activeProfiles, previousProfiles), [report, activeProfiles, previousProfiles]);
  const hasComposition = activeProfiles.length + previousProfiles.length > 0;
  const hasIndicators = data.indicators.some((row) => row.value !== null);
  const movement = data.movement.filter((row) => ["Naik", "Turun", "Tetap", "Baru"].includes(row.label));
  const hasMovement = movement.some((row) => row.value > 0);
  const compositionMax = Math.max(1, ...data.composition.map((row) => levels.reduce((sum, level) => sum + row[level.key], 0)));
  const movementMax = Math.max(1, ...movement.map((row) => row.value));
  return (
    <div className="@container min-w-0">
    <div className="grid min-w-0 items-stretch gap-4 @min-[54rem]:grid-cols-2 @min-[82rem]:grid-cols-3">
      <StandardCard title={<ChartTitle title="Komposisi" description={"Jumlah profil Final aktif pada periode terpilih dan pembanding."} />} className="min-w-0">

      <div className="@container/plot space-y-4">
        {hasComposition ? <ChartContainer config={compositionConfig} className="h-72 w-full" aria-label="Komposisi tingkat risiko per periode">
          <BarChart data={data.composition} accessibilityLayer margin={{ left: 0, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="period" tickLine={false} axisLine={false} fontSize={12} height={48} interval={0} />
            <YAxis type="number" domain={[0, compositionMax]} allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={48} />
            <ChartTooltip isAnimationActive={false} content={<ChartTooltipContent />} />
            {levels.map((level) => <Bar key={level.key} dataKey={level.key} stackId="risks" fill={`var(--color-${level.key})`} barSize={32} isAnimationActive={false} />)}
          </BarChart>
        </ChartContainer> : <OverviewPanelState state="empty" message="Belum ada profil aktif pada kedua periode." />}
        <div role="list" aria-label="Legenda tingkat risiko" className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {levels.map((level) => <span key={level.key} role="listitem" className="inline-flex items-center gap-1.5 whitespace-nowrap"><span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: level.color }} />{level.label}</span>)}
        </div>
        <div className="sr-only" aria-label="Data komposisi tingkat risiko">
          <Table><TableHeader><TableRow><TableHead>Periode</TableHead>{levels.map((level) => <TableHead key={level.key}>{level.label}</TableHead>)}</TableRow></TableHeader><TableBody>{data.composition.map((row, index) => <TableRow key={index}><TableCell>{row.period}</TableCell>{levels.map((level) => <TableCell key={level.key} className="tabular-nums">{row[level.key]}</TableCell>)}</TableRow>)}</TableBody></Table>
        </div>
      </div>

      </StandardCard>
      <StandardCard title={<ChartTitle title="Perubahan" description={`${report.comparisonCycle} → ${report.cycle}. Naik, turun, dan tetap hanya membandingkan risiko yang ada pada kedua periode. Risiko baru ditampilkan terpisah.`} />} className="min-w-0">

      <div className="@container/plot space-y-4">
        {hasMovement ? <ChartContainer config={valueConfig} className="h-72 w-full" aria-label="Jumlah risiko naik turun tetap dan baru">
          <BarChart data={movement.map((row, index) => ({ ...row, fill: index === 0 ? RISK_CHART_COLORS.high : index === 1 ? RISK_CHART_COLORS.low : "var(--color-violet-400)" }))} accessibilityLayer margin={{ left: 0, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={<CategoryTick />} height={48} interval={0} />
            <YAxis type="number" domain={[0, movementMax]} allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={48} />
            <ChartTooltip isAnimationActive={false} content={<ChartTooltipContent />} />
            <Bar dataKey="value" maxBarSize={32} isAnimationActive={false} />
          </BarChart>
        </ChartContainer> : <OverviewPanelState state="empty" message="Belum ada perubahan profil yang dapat ditampilkan." />}
        <div className="sr-only" aria-label="Data perubahan profil risiko">
          <Table><TableHeader><TableRow><TableHead>Perubahan</TableHead><TableHead>Jumlah risiko</TableHead></TableRow></TableHeader><TableBody>{movement.map((row) => <TableRow key={row.label}><TableCell>{row.label}</TableCell><TableCell className="tabular-nums">{row.value}</TableCell></TableRow>)}</TableBody></Table>
        </div>
      </div>

      </StandardCard>
      <StandardCard title={<ChartTitle title="Indikator" description={"Setiap indikator memakai penyebutnya sendiri, bukan skor kesehatan gabungan. Area: area penerimaan; Rencana: cakupan rencana mitigasi; Lapor: mitigasi terlapor; Pantau: pemantauan Final; Target: target residual."} />} className="min-w-0 @min-[54rem]:col-span-2 @min-[82rem]:col-span-1">

      <div className="@container/plot space-y-4">
        {hasIndicators ? <ChartContainer config={rateConfig} className="h-72 w-full" aria-label="Capaian lima indikator pengelolaan risiko">
          <BarChart data={data.indicators.map((row, index) => ({ ...row, name: indicatorLabels[index] }))} accessibilityLayer margin={{ left: 0, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={<CategoryTick />} height={48} interval={0} />
            <YAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} fontSize={12} width={48} />
            <ChartTooltip isAnimationActive={false} content={<ChartTooltipContent formatter={(value) => formatReportPercent(Number(value))} />} />
            <Bar dataKey="value" fill="var(--color-value)" maxBarSize={32} isAnimationActive={false} />
          </BarChart>
        </ChartContainer> : <OverviewPanelState state="empty" message="Indikator belum dapat dihitung karena data belum tersedia." />}
        <div className="sr-only" aria-label="Data capaian indikator">
          <Table><TableHeader><TableRow><TableHead>Indikator</TableHead><TableHead>Capaian</TableHead><TableHead>Jumlah</TableHead></TableRow></TableHeader><TableBody>{data.indicators.map((row) => <TableRow key={row.label}><TableCell>{row.label}</TableCell><TableCell className="tabular-nums">{formatReportPercent(row.value)}</TableCell><TableCell className="tabular-nums">{row.numerator}/{row.denominator}</TableCell></TableRow>)}</TableBody></Table>
        </div>
      </div>

      </StandardCard>
    </div>
    </div>
  );
}
