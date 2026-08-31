"use client";

import Link from "next/link";
import { ChevronRight } from "@/components/ui/icons";

import {
  Badge,
  OverviewPanelState,
  StandardCard,
} from "@/components/shared/design-system";
import {
  getBobot,
  getRiskLevelFromNilai,
  getRiskLevelLabel,
  levelToColor,
  resolveRiskScoreSemantics,
} from "@/lib/risk";
import { cn } from "@/lib/utils";
import type { TopRiskItem } from "@/types/risk";

interface TopRisksPanelProps {
  risks: TopRiskItem[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  className?: string;
}

export function TopRisksPanel({
  risks,
  loading,
  error,
  onRetry,
  className,
}: TopRisksPanelProps) {
  return (
    <StandardCard
      title="Risiko Teratas"
      className={cn("lg:col-span-2", className)}
      contentClassName="px-4 pb-4 pt-0"
    >
      {loading ? (
        <OverviewPanelState
          state="loading"
          message="Memuat risiko teratas..."
        />
      ) : error ? (
        <OverviewPanelState
          state="error"
          message="Risiko teratas tidak dapat dimuat."
          onRetry={onRetry}
        />
      ) : risks.length === 0 ? (
        <OverviewPanelState state="empty" message="Belum ada data risiko." />
      ) : (
        <div className="-mx-4 divide-y divide-border/40">
            {risks.slice(0, 5).map((risk) => {
              const scoreSemantics = resolveRiskScoreSemantics({
                status: risk.status,
                probability: risk.probability,
                impact: risk.impact,
                weight: getBobot(risk.probability, risk.impact),
                nilai: risk.nilai,
                inherentScore: risk.inherentScore,
              });

              const score = scoreSemantics.primary.score;
              const level = getRiskLevelFromNilai(scoreSemantics.primary.nilai);

              return (
                <Link
                  key={risk.id}
                  href={`/risk/register/${risk.id}`}
                  data-testid="risk-row"
                  className="group/risk flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 outline-none transition-[background-color,transform] duration-150 hover:bg-muted/30 active:scale-[0.995] focus-visible:bg-muted/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transform-none motion-reduce:transition-none"
                >
                  <div className="min-w-0 flex-1 font-normal">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-xs font-mono font-normal text-muted-foreground">
                        {risk.code}
                      </span>
                      <Badge
                        variant="outline"
                        size="micro"
                        title={`Skor ${score} — ${getRiskLevelLabel(level)}`}
                        className={cn(
                          "font-normal",
                          levelToColor(level),
                        )}
                      >
                        {score}
                        <span className="sr-only">
                          ({getRiskLevelLabel(level)})
                        </span>
                      </Badge>
                    </div>
                    <p
                      className="mt-1 break-words text-pretty text-sm font-normal text-foreground"
                      title={risk.title}
                    >
                      {risk.title}
                    </p>
                    {risk.orgName && (
                      <p
                        className="mt-0.5 truncate text-xs text-muted-foreground"
                        title={risk.orgName}
                      >
                        {risk.orgName}
                      </p>
                    )}
                  </div>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground/60 transition-transform duration-150 group-hover/risk:translate-x-0.5 motion-reduce:transition-none"
                  />
                </Link>
              );
            })}
        </div>
      )}
    </StandardCard>
  );
}
