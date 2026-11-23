import { ChevronRight } from "@/components/shared/icons";
import { calculateRiskMetrics, levelToFillColor } from "@/lib/risk";
import { cn } from "@/lib/utils";
import { Level, ScoreButton, type TriggerProps } from "./score-parts";

const probabilities = [5, 4, 3, 2, 1];
const impacts = [1, 2, 3, 4, 5];
const cells = probabilities.flatMap((probability) => impacts.map((impact) => ({
  probability, impact, color: levelToFillColor(calculateRiskMetrics(probability, impact).level),
})));

export function ScoreMap(props: TriggerProps) {
  const { probability, impact } = props;
  const metrics = calculateRiskMetrics(probability, impact);
  return (
    <ScoreButton {...props} className="flex w-full max-w-[420px] flex-wrap items-stretch gap-x-4 gap-y-3 rounded-xl border border-border bg-card p-3.5 hover:bg-workspace">
      <span aria-hidden="true" className="grid w-[106px] shrink-0 grid-cols-5 gap-1 self-center rounded-lg border border-border bg-workspace p-2">
        {cells.map((cell) => {
          const selected = cell.impact === impact && cell.probability === probability;
          return (
            <span key={`${cell.probability}-${cell.impact}`} className={cn("relative aspect-square rounded-xs", selected && "outline outline-offset-1 outline-foreground")}>
              <span className={cn("absolute inset-0 rounded-xs", selected ? "opacity-100" : "opacity-45")} style={{ backgroundColor: cell.color }} />
              {selected && <span className="absolute inset-0 m-auto size-1 rounded-full bg-foreground" />}
            </span>
          );
        })}
      </span>
      <span className="flex min-w-[133px] flex-1 flex-col justify-center gap-2">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-3xl leading-none font-semibold tracking-tight tabular-nums">{metrics.inherentScore}</span>
          <Level level={metrics.level} />
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">Probabilitas {probability} · Dampak {impact}</span>
        <span className="flex items-center gap-1 border-t border-border pt-2 text-sm font-medium">
          Buka heatmap <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
        </span>
      </span>
    </ScoreButton>
  );
}
