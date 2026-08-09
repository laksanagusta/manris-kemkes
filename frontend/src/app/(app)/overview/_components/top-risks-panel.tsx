"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { StandardCard } from "@/components/shared/design-system";
import { OverviewPanelState } from "@/components/shared/design-system";
import {
  getBobot,
  getRiskLevelFromNilai,
  levelToColor,
  resolveRiskScoreSemantics,
} from "@/lib/risk";
import { cn } from "@/lib/utils";
import type { TopRiskItem } from "@/types/risk";

interface TopRisksPanelProps {
  risks: TopRiskItem[];
  loading?: boolean;
  error?: boolean;
  className?: string;
}

export function TopRisksPanel({
  risks,
  loading,
  error,
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
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-xs font-mono font-semibold text-muted-foreground">
                        {risk.code}
                      </span>
                      <span
                        className={cn(
                          "inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold",
                          levelToColor(level),
                        )}
                      >
                        {score}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-foreground">
                      {risk.title}
                    </p>
                    {risk.orgName && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
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
