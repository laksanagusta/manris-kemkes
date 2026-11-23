import { ArrowUpRight } from "@/components/shared/icons";
import { calculateRiskMetrics } from "@/lib/risk";
import { AxisValue, Level, ScoreButton, type TriggerProps } from "./score-parts";

export function ScoreCard(props: TriggerProps) {
  const { probability, impact } = props;
  const metrics = calculateRiskMetrics(probability, impact);

  return (
    <ScoreButton {...props} className="flex w-full max-w-[280px] flex-col gap-4 rounded-[24px] border border-transparent bg-workspace p-5 hover:border-border hover:bg-muted/45">
      <span className="flex items-start justify-between gap-4">
        <span className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Skor</span>
          <span className="text-5xl leading-none font-semibold tracking-tight tabular-nums">{metrics.inherentScore}</span>
        </span>
        <Level level={metrics.level} />
      </span>
      <span className="grid grid-cols-2 gap-3 border-t border-border pt-3">
        <AxisValue label="Probabilitas" value={probability} />
        <AxisValue label="Dampak" value={impact} />
      </span>
      <span className="flex items-center justify-between gap-2 border-t border-border pt-3 text-sm font-medium">
        Ubah skor
        <ArrowUpRight aria-hidden="true" className="size-4 text-muted-foreground" />
      </span>
    </ScoreButton>
  );
}
