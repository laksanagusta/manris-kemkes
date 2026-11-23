import type { ReactNode } from "react";
import type { RiskScoreSelection } from "@/components/shared/design-system/domain/risk-score-heatmap-picker";
import { Badge } from "@/components/ui/badge";
import { calculateRiskMetrics, getRiskLevelLabel, levelToColor } from "@/lib/risk";
import { cn } from "@/lib/utils";

export type TriggerProps = RiskScoreSelection & { open: (button: HTMLButtonElement) => void };
export type Metrics = ReturnType<typeof calculateRiskMetrics>;

export function ScoreButton({ probability, impact, open, className, children }: TriggerProps & {
  className: string;
  children: ReactNode;
}) {
  const metrics = calculateRiskMetrics(probability, impact);
  return (
    <button
      id="risk-score-picker"
      type="button"
      aria-haspopup="dialog"
      aria-describedby="observation-score-hint"
      aria-label={`Ubah skor risiko observasi. Skor ${metrics.inherentScore}, ${getRiskLevelLabel(metrics.level)}, probabilitas ${probability}, dampak ${impact}.`}
      onClick={(event) => open(event.currentTarget)}
      className={cn("group max-w-full text-start transition-[transform,background-color,border-color] duration-150 ease-out active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:active:scale-100", className)}
    >
      {children}
    </button>
  );
}

export function Level({ level }: { level: Metrics["level"] }) {
  return <Badge variant="outline" className={levelToColor(level)}>{getRiskLevelLabel(level)}</Badge>;
}

export function AxisValue({ label, value }: { label: string; value: number }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-base font-semibold tabular-nums">{value}</span>
    </span>
  );
}
