import { useState } from "react";
import { RiskCountTrendChart } from "@/app/(app)/overview/_components/risk-count-trend-chart";
import { RiskCompositionTrendChart } from "@/app/(app)/overview/_components/risk-composition-trend-chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  RiskHeatmapGrid,
  StandardCard,
} from "@/components/shared/design-system";
import { ArrowExpand } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { current, currentCycle, cycles, integer, matrices, quarters, risks } from "./data";

export function TrendChart() {
  return <RiskCountTrendChart risks={risks} currentCycle={currentCycle} currentTotal={current.totalRisks} />;
}

export function CompositionChart() {
  return <RiskCompositionTrendChart risks={risks} currentCycle={currentCycle} />;
}

export const riskLevels = [
  { label: "Sangat rendah", color: "heatmap-sangat-rendah", key: "sangatRendah" },
  { label: "Rendah", color: "heatmap-rendah", key: "rendah" },
  { label: "Sedang", color: "heatmap-sedang", key: "sedang" },
  { label: "Tinggi", color: "heatmap-tinggi", key: "tinggi" },
  { label: "Sangat tinggi", color: "heatmap-sangat-tinggi", key: "sangatTinggi" },
] as const;

export function QuarterSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      {label}
      <select
        className="min-h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {cycles.slice(0, -1).map((cycle, index) => <option key={cycle} value={index}>{cycle}</option>)}
      </select>
    </label>
  );
}

function HeatmapPlot({ index }: { index: number }) {
  return (
    <div className="mx-auto grid w-full max-w-[17rem] grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
      <span className="rotate-180 text-xs text-muted-foreground [writing-mode:vertical-rl]">Probabilitas</span>
      <RiskHeatmapGrid matrix={matrices[index]} label={`Peta risiko ${cycles[index]}`} className="w-full" />
      <span aria-hidden="true" />
      <span className="text-center text-xs text-muted-foreground">Dampak</span>
    </div>
  );
}

function HeatmapLegend() {
  return (
    <ul aria-label="Legenda tingkat risiko" className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {riskLevels.map(({ label, color }) => (
        <li key={label} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={`size-2.5 rounded-sm ${color}`} />{label}
        </li>
      ))}
    </ul>
  );
}

export function Heatmap() {
  const latest = cycles.length - 1;
  const [previous, setPrevious] = useState(latest - 1);

  return (
    <Dialog>
      <StandardCard
        title={<span className="text-sm">Peta Risiko Saat Ini</span>}
        className="h-full"
        contentClassName="flex flex-1 flex-col justify-center gap-5"
        action={
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="icon-sm" aria-label="Bandingkan peta risiko">
              <ArrowExpand aria-hidden="true" />
            </Button>
          </DialogTrigger>
        }
      >
        <HeatmapPlot index={latest} />
        <HeatmapLegend />
      </StandardCard>
      <DialogContent className="max-h-[calc(100dvh-7rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Perbandingan Peta Risiko</DialogTitle>
          <DialogDescription>Bandingkan sebaran probabilitas dan dampak antar kuartal.</DialogDescription>
        </DialogHeader>
        <QuarterSelect label="Kuartal pembanding" value={previous} onChange={setPrevious} />
        <div className="grid gap-5 sm:grid-cols-2">
          {[previous, latest].map((index) => (
            <section key={index} className="grid gap-3">
              <h3 className="text-center text-sm font-medium">{cycles[index]} <span className="font-normal text-muted-foreground">· {integer.format(quarters[index].totalRisks)} risiko</span></h3>
              <HeatmapPlot index={index} />
            </section>
          ))}
        </div>
        <HeatmapLegend />
      </DialogContent>
    </Dialog>
  );
}
