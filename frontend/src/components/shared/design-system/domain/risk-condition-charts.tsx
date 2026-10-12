"use client";

import { useMemo, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

function DataDisclosure({ children, label }: { children: ReactNode; label: string }) {
  return <details className="text-xs">
    <summary className="w-fit cursor-pointer rounded-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">Lihat data grafik<span className="sr-only"> {label}</span></summary>
    <div className="mt-3 min-w-0 overflow-x-auto">{children}</div>
  </details>;
}

export function RiskConditionCharts({ report, activeProfiles, previousProfiles }: {
  report: QuarterlyReport;
  activeProfiles: QuarterlyRisk[];
  previousProfiles: QuarterlyRisk[];
}) {
  const data = useMemo(() => buildRiskConditionChartData(report, activeProfiles, previousProfiles), [report, activeProfiles, previousProfiles]);
  const hasComposition = activeProfiles.length + previousProfiles.length > 0;
  const hasIndicators = data.indicators.some((row) => row.value !== null);
  const hasMovement = data.movement.some((row) => row.value > 0);
  const compositionMax = Math.max(1, ...data.composition.map((row) => levels.reduce((sum, level) => sum + row[level.key], 0)));
  const movementMax = Math.max(1, ...data.movement.map((row) => row.value));
  return <StandardCard title="Analisis risiko" className="min-w-0">
    <Tabs defaultValue="composition" className="gap-4">
      <TabsList variant="line" aria-label="Tampilan analisis risiko">
        <TabsTrigger value="composition">Komposisi</TabsTrigger>
        <TabsTrigger value="movement">Perubahan</TabsTrigger>
        <TabsTrigger value="indicators">Indikator</TabsTrigger>
      </TabsList>
      <TabsContent value="composition">
      <div className="space-y-4">
        <p className="max-w-[75ch] text-xs leading-5 text-muted-foreground">Jumlah profil Final aktif pada periode terpilih dan pembanding.</p>
        <div role="list" aria-label="Legenda tingkat risiko" className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {levels.map((level) => <span key={level.key} role="listitem" className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: level.color }} />{level.label}</span>)}
        </div>
        {hasComposition ? <ChartContainer config={compositionConfig} className="h-56 w-full" aria-label="Komposisi tingkat risiko per periode">
          <BarChart data={data.composition} accessibilityLayer layout="vertical" margin={{ left: 0, right: 16 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" domain={[0, compositionMax]} allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
            <YAxis type="category" dataKey="period" width={76} tickLine={false} axisLine={false} fontSize={12} />
            <ChartTooltip isAnimationActive={false} content={<ChartTooltipContent />} />
            {levels.map((level) => <Bar key={level.key} dataKey={level.key} stackId="risks" fill={`var(--color-${level.key})`} barSize={32} isAnimationActive={false} />)}
          </BarChart>
        </ChartContainer> : <OverviewPanelState state="empty" message="Belum ada profil aktif pada kedua periode." />}
        <div className="sr-only" aria-label="Data komposisi tingkat risiko">
          <Table><TableHeader><TableRow><TableHead>Periode</TableHead>{levels.map((level) => <TableHead key={level.key}>{level.label}</TableHead>)}</TableRow></TableHeader><TableBody>{data.composition.map((row, index) => <TableRow key={index}><TableCell>{row.period}</TableCell>{levels.map((level) => <TableCell key={level.key} className="tabular-nums">{row[level.key]}</TableCell>)}</TableRow>)}</TableBody></Table>
        </div>
      </div>
    </TabsContent>
    <TabsContent value="indicators">
      <div className="space-y-4">
        <p className="max-w-[75ch] text-xs leading-5 text-muted-foreground">Setiap indikator memakai penyebutnya sendiri, bukan skor kesehatan gabungan.</p>
        {hasIndicators ? <ChartContainer config={rateConfig} className="h-72 w-full" aria-label="Capaian lima indikator pengelolaan risiko">
          <BarChart data={data.indicators.map((row, index) => ({ ...row, name: indicatorLabels[index] }))} layout="vertical" accessibilityLayer margin={{ right: 16 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} fontSize={12} />
            <YAxis type="category" dataKey="name" width={112} tickLine={false} axisLine={false} fontSize={12} />
            <ChartTooltip isAnimationActive={false} content={<ChartTooltipContent formatter={(value) => formatReportPercent(Number(value))} />} />
            <Bar dataKey="value" fill="var(--color-value)" barSize={20} isAnimationActive={false} />
          </BarChart>
        </ChartContainer> : <OverviewPanelState state="empty" message="Indikator belum dapat dihitung karena data belum tersedia." />}
        <DataDisclosure label="capaian indikator">
          <Table><TableHeader><TableRow><TableHead>Indikator</TableHead><TableHead>Capaian</TableHead><TableHead>Jumlah</TableHead></TableRow></TableHeader><TableBody>{data.indicators.map((row) => <TableRow key={row.label}><TableCell>{row.label}</TableCell><TableCell className="tabular-nums">{formatReportPercent(row.value)}</TableCell><TableCell className="tabular-nums">{row.numerator}/{row.denominator}</TableCell></TableRow>)}</TableBody></Table>
        </DataDisclosure>
      </div>
    </TabsContent>
    <TabsContent value="movement">
      <div className="space-y-4">
        <p className="max-w-[75ch] text-xs leading-5 text-muted-foreground">{report.comparisonCycle} → {report.cycle}. Naik, turun, dan tetap hanya membandingkan risiko yang ada pada kedua periode. Skor yang belum tersedia masuk Belum dibandingkan. Keluar cakupan tidak berarti risiko selesai.</p>
        {hasMovement ? <ChartContainer config={valueConfig} className="h-72 w-full" aria-label="Jumlah risiko naik turun tetap baru dan keluar cakupan">
          <BarChart data={data.movement.map((row, index) => ({ ...row, fill: index === 0 ? RISK_CHART_COLORS.high : index === 1 ? RISK_CHART_COLORS.low : "var(--color-violet-400)" }))} layout="vertical" accessibilityLayer margin={{ right: 16 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" domain={[0, movementMax]} allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
            <YAxis type="category" dataKey="label" width={126} tickLine={false} axisLine={false} fontSize={12} />
            <ChartTooltip isAnimationActive={false} content={<ChartTooltipContent />} />
            <Bar dataKey="value" barSize={20} isAnimationActive={false} />
          </BarChart>
        </ChartContainer> : <OverviewPanelState state="empty" message="Belum ada perubahan profil yang dapat ditampilkan." />}
        <DataDisclosure label="perubahan profil risiko">
          <Table><TableHeader><TableRow><TableHead>Perubahan</TableHead><TableHead>Jumlah risiko</TableHead></TableRow></TableHeader><TableBody>{data.movement.map((row) => <TableRow key={row.label}><TableCell>{row.label}</TableCell><TableCell className="tabular-nums">{row.value}</TableCell></TableRow>)}</TableBody></Table>
        </DataDisclosure>
      </div>
    </TabsContent>
    </Tabs>
  </StandardCard>;
}
