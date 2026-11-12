"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "@/components/shared/icons";
import { ReportEmptyState } from "@/components/shared/design-system";
import { ReportWidget } from "@/components/shared/design-system/reports/report-widget";
import { buildRiskTargetGap } from "@/lib/risk-summary-widgets";
import { formatReportNumber } from "@/lib/quarterly-report";
import type { QuarterlyReport } from "@/types/quarterly-report";

const config = { count: { label: "Jumlah risiko" } } satisfies ChartConfig;
const axisLines: Record<string, string[]> = {
  "Di atas target": ["Di atas", "target"],
  "Tepat target": ["Tepat", "target"],
  "Di bawah target": ["Di bawah", "target"],
  "Belum dapat dibandingkan": ["Belum dapat", "dibandingkan"],
};

function CategoryTick({ x = 0, y = 0, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  return <text x={x} y={y} textAnchor="middle" fill="var(--muted-foreground)" fontSize={12}>
    {(axisLines[payload?.value ?? ""] ?? []).map((line, index) => <tspan key={index} x={x} dy={16}>{line}</tspan>)}
  </text>;
}

export function RiskTargetGapCard({ report }: { report: QuarterlyReport }) {
  const data = useMemo(() => buildRiskTargetGap(report), [report]);
  return (
    <ReportWidget chart title={
      <span className="inline-flex items-center gap-1.5">
        Kesenjangan terhadap target
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label="Tentang kesenjangan terhadap target" className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Info aria-hidden="true" className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-pretty">
            Jumlah risiko berdasarkan selisih skor pemantauan Final pada periode terpilih dengan target masing-masing. Skor di atas target masih perlu diturunkan. Target tidak valid, pemantauan belum Final, atau pemantauan dari periode lain masuk Belum dapat dibandingkan. Selisih dibandingkan hingga dua desimal; skor antar-risiko tidak dijumlahkan.
          </TooltipContent>
        </Tooltip>
      </span>
    }>
      {data.total ? <div className="min-w-0 space-y-3">
        <p className="text-xs text-muted-foreground tabular-nums">{formatReportNumber(data.comparable)}/{formatReportNumber(data.total)} risiko dapat dibandingkan</p>
        <div className="overflow-x-auto">
          <ChartContainer config={config} className="h-64 min-w-80 w-full" aria-label="Jumlah risiko di atas, tepat, di bawah target, dan belum dapat dibandingkan">
            <BarChart data={data.categories} accessibilityLayer margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={<CategoryTick />} tickLine={false} axisLine={false} interval={0} height={48} />
              <YAxis allowDecimals={false} domain={[0, Math.max(1, ...data.categories.map(category => category.count))]} tickLine={false} axisLine={false} fontSize={12} width={40} />
              <ChartTooltip isAnimationActive={false} content={<ChartTooltipContent />} />
              <Bar dataKey="count" maxBarSize={32} isAnimationActive={false} />
            </BarChart>
          </ChartContainer>
        </div>
        <table className="sr-only">
          <caption>Jumlah risiko menurut kesenjangan terhadap target pada {report.cycle}</caption>
          <thead><tr><th scope="col">Kategori</th><th scope="col">Jumlah risiko</th></tr></thead>
          <tbody>{data.categories.map(category => <tr key={category.key}><th scope="row">{category.label}</th><td>{category.count}</td></tr>)}</tbody>
        </table>
      </div> : <ReportEmptyState title="Belum ada risiko pada periode ini" description="Pilih periode atau unit lain untuk melihat kesenjangan terhadap target." />}
    </ReportWidget>
  );
}
