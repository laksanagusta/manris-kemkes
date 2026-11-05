import { ArrowRight } from "@/components/shared/icons";
import { Badge } from "@/components/ui/badge";
import { getLinearRiskLevelBadgeTone } from "@/lib/linear-status-badge";
import { getStatusBadgeClassName, toBadgeVariant } from "@/lib/badge-variant";
import { getRiskLevelFromNilai, levelToColor } from "@/lib/risk";
import { formatMonitoringNilai } from "@/lib/risk-register-monitoring";
import type { MonitoringOverviewRow } from "@/lib/monitoring-overview";

type ScoreRow = Pick<MonitoringOverviewRow, "sourceScore" | "observedScore" | "observedLevel">;

export function MonitoringScoreComparison({ row }: { row: ScoreRow }) {
  return (
    <div
      className="flex min-w-0 max-w-full items-center gap-1.5 whitespace-nowrap"
      aria-label={`Skor awal ${formatMonitoringNilai(row.sourceScore)}; skor hasil pemantauan ${formatMonitoringNilai(row.observedScore)}`}
    >
      <span className="font-mono text-sm tabular-nums text-muted-foreground/70 line-through decoration-border">
        {formatMonitoringNilai(row.sourceScore)}
      </span>
      <ArrowRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground/60" />
      <span className="font-mono text-sm font-medium tabular-nums text-foreground">
        {formatMonitoringNilai(row.observedScore)}
      </span>
    </div>
  );
}

export function MonitoringLevelBadge({ row }: { row: ScoreRow }) {
  const label = row.observedLevel !== "-" ? row.observedLevel : null;
  if (row.observedScore === null || !label) {
    return <span className="text-muted-foreground">-</span>;
  }
  const level = getRiskLevelFromNilai(row.observedScore);
  const tone = getLinearRiskLevelBadgeTone(label);
  return (
    <Badge variant={level ? "outline" : toBadgeVariant(tone)} className={level ? levelToColor(level) : getStatusBadgeClassName(tone)}>
      {label}
    </Badge>
  );
}
