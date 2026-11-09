import type { RiskLevel } from "@/types/risk";
import { getRiskLevelDisplayLabel, levelToFillColor } from "@/lib/risk";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function RiskTableScore({ score, level }: { score: string; level?: RiskLevel | null }) {
  const value = (
    <span tabIndex={level ? 0 : undefined} className="inline-flex items-center justify-start gap-2 whitespace-nowrap rounded-sm text-sm font-medium tabular-nums text-foreground focus-visible:outline-2 focus-visible:outline-ring">
      {score}
      {level && <><span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: levelToFillColor(level) }} /><span className="sr-only"> — {getRiskLevelDisplayLabel(level)}</span></>}
    </span>
  );
  return level ? (
    <Tooltip>
      <TooltipTrigger asChild>{value}</TooltipTrigger>
      <TooltipContent className="register-motion-tooltip">{getRiskLevelDisplayLabel(level)}</TooltipContent>
    </Tooltip>
  ) : value;
}
