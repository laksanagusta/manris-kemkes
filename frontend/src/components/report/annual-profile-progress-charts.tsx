"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { ReportWidget } from "@/components/shared/design-system/reports/report-widget";
import { OverviewPanelState } from "@/components/shared/design-system/domain/overview-panel-state";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "@/components/shared/icons";
import { buildAnnualProgressSeries, type AnnualProfileProgressReport, type AnnualProgressPoint } from "@/lib/annual-profile-progress-report";
import { CHART_COLORS, RISK_CHART_COLORS } from "@/lib/chart-colors";
import { formatReportNumber, formatReportPercent } from "@/lib/quarterly-report";

export const annualProgressLayout = "grid min-w-0 gap-4 @min-[48rem]/report:grid-cols-2";

export const annualProgressWidgets: readonly {
  title: string;
  description: string;
  kind: "line" | "stack" | "percent";
  config: ChartConfig;
}[] = [
  {
    title: "Tren skor dan bobot risiko",
    description: "Rata-rata skor dan bobot baseline serta hasil pemantauan Final. Skor memakai sumbu kiri dan bobot memakai sumbu kanan.",
    kind: "line",
    config: {
      score: { label: "Rata-rata skor", color: CHART_COLORS.primary },
      weight: { label: "Rata-rata bobot", color: CHART_COLORS.secondary },
    },
  },
  {
    title: "Tren tingkat risiko",
    description: "Jumlah hasil yang memiliki skor valid pada setiap tingkat risiko.",
    kind: "stack",
    config: {
      sangat_rendah: { label: "Sangat rendah", color: RISK_CHART_COLORS.veryLow },
      rendah: { label: "Rendah", color: RISK_CHART_COLORS.low },
      sedang: { label: "Sedang", color: RISK_CHART_COLORS.medium },
      tinggi: { label: "Tinggi", color: RISK_CHART_COLORS.high },
      sangat_tinggi: { label: "Sangat tinggi", color: RISK_CHART_COLORS.extreme },
    },
  },
  {
    title: "Tren skor terhadap target",
    description: "Rata-rata skor dan target memakai pasangan dari risiko yang sama. Target mengikuti profil efektif pada periode tersebut.",
    kind: "line",
    config: {
      scoreWithTarget: { label: "Rata-rata skor", color: CHART_COLORS.primary },
      target: { label: "Rata-rata target", color: CHART_COLORS.tertiary },
    },
  },
  {
    title: "Tren pelaporan mitigasi",
    description: "Persentase tugas dengan laporan valid dari seluruh tugas mitigasi pada periode tersebut. Status pelaksanaan dapat berbeda dari status pelaporan.",
    kind: "percent",
    config: { mitigation: { label: "Terlapor", color: CHART_COLORS.primary } },
  },
  {
    title: "Tren risiko terhadap batas penerimaan",
    description: "Skor 10 ke atas dihitung di atas batas. Skor di bawah 10 dihitung dalam batas.",
    kind: "stack",
    config: {
      within: { label: "Dalam batas", color: RISK_CHART_COLORS.low },
      above: { label: "Di atas batas", color: RISK_CHART_COLORS.extreme },
    },
  },
  {
    title: "Perubahan skor risiko",
    description: "Jumlah risiko yang naik, turun, atau tetap dibandingkan dengan baseline, berdasarkan pasangan skor dari risiko yang sama.",
    kind: "stack",
    config: {
      up: { label: "Naik", color: RISK_CHART_COLORS.extreme },
      down: { label: "Turun", color: RISK_CHART_COLORS.low },
      stable: { label: "Tetap", color: CHART_COLORS.primary },
    },
  },
];

const axis = { tickLine: false, axisLine: false, fontSize: 12 };

function AnnualProgressWidget({ widget, points }: {
  widget: (typeof annualProgressWidgets)[number];
  points: AnnualProgressPoint[];
}) {
  const config: ChartConfig = widget.config;
  const series = Object.entries(config);
  const percent = widget.kind === "percent";
  const dualAxis = "weight" in config;
  const format = percent ? formatReportPercent : formatReportNumber;
  const hasData = points.some((point) => series.some(([key]) => point[key as keyof AnnualProgressPoint] != null));
  const sampleLabel = percent ? "Tugas terlapor" : "Risiko dengan data";
  const sample = (point: AnnualProgressPoint) => {
    if (percent) return point.totalTasks ? `${point.reportedTasks}/${point.totalTasks}` : null;
    const count = "up" in config ? point.compared : "target" in config ? point.targetCount : point.scoreCount;
    return count ? `${count}/${point.totalRisks}` : null;
  };
  const xAxis = <XAxis {...axis} dataKey="label" minTickGap={18} tickMargin={8} />;
  const yAxis = <YAxis {...axis} width={38} allowDecimals={widget.kind === "line"} domain={percent ? [0, 100] : [0, "auto"]}
    tickFormatter={percent ? (value: number) => `${value}%` : undefined} />;
  const tooltip = <ChartTooltip
    isAnimationActive={false}
    content={<ChartTooltipContent
      labelFormatter={(label) => {
        const point = points.find((item) => item.label === label);
        const coverage = point && sample(point);
        return coverage ? `${label} · ${coverage} ${percent ? "tugas" : "risiko"}` : label;
      }}
      formatter={(value, name) => (
        <div className="flex w-full justify-between gap-3">
          <span>{config[String(name)]?.label}</span><span className="tabular-nums">{format(Number(value))}</span>
        </div>
      )}
    />}
  />;
  const title = <span className="inline-flex items-center gap-1.5">
    <span>{widget.title}</span>
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label={`Tentang ${widget.title}`} className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:size-10">
          <Info aria-hidden="true" className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-pretty">{widget.description}</TooltipContent>
    </Tooltip>
  </span>;

  return (
    <ReportWidget chart title={title} className="min-w-0">
      <div className="flex min-h-7 flex-wrap items-start gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {series.map(([key, item]) => <span key={key} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>)}
      </div>
      {hasData ? <ChartContainer config={config} className="h-64 w-full" aria-label={widget.title}>
        {widget.kind === "line" ? (
          <LineChart data={points} accessibilityLayer margin={{ left: 0, right: 10, top: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            {xAxis}{yAxis}
            {dualAxis && <YAxis {...axis} yAxisId="weight" orientation="right" width={38} domain={[0, "auto"]} />}
            {tooltip}
            {series.map(([key]) => <Line key={key} dataKey={key} yAxisId={key === "weight" ? "weight" : 0}
              type="linear" stroke={`var(--color-${key})`} strokeWidth={2} dot={{ r: 3 }}
              strokeDasharray={key === "target" || key === "weight" ? "4 3" : undefined} isAnimationActive={false} />)}
          </LineChart>
        ) : (
          <BarChart data={points} accessibilityLayer margin={{ left: 0, right: 10, top: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            {xAxis}{yAxis}{tooltip}
            {series.map(([key]) => <Bar key={key} dataKey={key} stackId="period"
              fill={`var(--color-${key})`} maxBarSize={36} isAnimationActive={false} />)}
          </BarChart>
        )}
      </ChartContainer> : <div className="grid min-h-64 items-center">
        <OverviewPanelState state="empty" message="Data untuk grafik ini belum tersedia." />
      </div>}
      <div className="sr-only">
        <Table aria-label={`Data ${widget.title.toLowerCase()}`}>
          <TableHeader><TableRow><TableHead>Periode</TableHead>
            {series.map(([key, item]) => <TableHead key={key}>{item.label}</TableHead>)}
            <TableHead>{sampleLabel}</TableHead>
          </TableRow></TableHeader>
          <TableBody>{points.map((point) => <TableRow key={point.id}><TableCell>{point.label}</TableCell>
            {series.map(([key]) => <TableCell key={key}>{format(point[key as keyof AnnualProgressPoint] as number | null)}</TableCell>)}
            <TableCell>{sample(point) ?? "—"}</TableCell>
          </TableRow>)}</TableBody>
        </Table>
      </div>
    </ReportWidget>
  );
}

export function AnnualProfileProgressCharts({ report }: { report: AnnualProfileProgressReport }) {
  const points = buildAnnualProgressSeries(report);
  return (
    <div className="@container/report min-w-0">
      <div className={annualProgressLayout}>
        {annualProgressWidgets.map((widget) => <AnnualProgressWidget key={widget.title} widget={widget} points={points} />)}
      </div>
    </div>
  );
}
