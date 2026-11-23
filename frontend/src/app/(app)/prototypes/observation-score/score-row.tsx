import { ChevronRight } from "@/components/shared/icons";
import { calculateRiskMetrics } from "@/lib/risk";
import { AxisValue, Level, ScoreButton, type TriggerProps } from "./score-parts";

export function ScoreRow(props: TriggerProps) {
  const { probability, impact } = props;
  const metrics = calculateRiskMetrics(probability, impact);

  return (
    <ScoreButton {...props} className="grid min-h-16 w-full max-w-[620px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 hover:bg-workspace sm:px-4">
      <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-2xl font-semibold tabular-nums">{metrics.inherentScore}</span>
          <Level level={metrics.level} />
        </span>
        <span className="flex items-center gap-3 sm:border-s sm:border-border sm:ps-4">
          <AxisValue label="Probabilitas" value={probability} />
          <AxisValue label="Dampak" value={impact} />
        </span>
      </span>
      <span className="flex items-center gap-1 text-sm font-medium">
        <span className="hidden sm:inline">Ubah skor</span>
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </span>
    </ScoreButton>
  );
}
