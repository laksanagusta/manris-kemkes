"use client";

import Link from "next/link";

import {
  Badge,
  OverviewPanelState,
  StandardCard,
} from "@/components/shared/design-system";
import {
  formatRiskScore,
  getBobot,
  getRiskLevelFromNilai,
  getRiskLevelLabel,
  levelToColor,
  riskCategoryLabels,
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
      title="Risiko yang Perlu Perhatian"
      className={cn("h-full rounded-2xl", className)}
      headerClassName="px-5 pb-4 pt-5"
      contentClassName="p-0"
    >
      {loading ? (
        <OverviewPanelState
          state="loading"
          message="Memuat risiko teratas..."
          className="mx-5 mb-5"
        />
      ) : error ? (
        <OverviewPanelState
          state="error"
          message="Risiko teratas tidak dapat dimuat."
          onRetry={onRetry}
          className="mx-5 mb-5"
        />
      ) : risks.length === 0 ? (
        <OverviewPanelState
          state="empty"
          message="Belum ada data risiko."
          className="mx-5 mb-5"
        />
      ) : (
        <div className="border-t border-border/60">
          <div
            aria-hidden="true"
            data-testid="risk-list-header"
            className="grid min-h-10 w-full grid-cols-[1fr_8fr_1fr] items-center gap-x-3 border-b border-border/60 bg-table-header px-5 text-xs font-normal capitalize tracking-[0.02em] text-muted-foreground sm:grid-cols-[5fr_32fr_8fr_5fr]"
          >
            <span>Kode</span>
            <span>Judul</span>
            <span className="hidden sm:block">Kategori</span>
            <span className="text-right">Skor</span>
          </div>
          <div className="divide-y divide-border/40">
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
              const categoryLabel =
                riskCategoryLabels[risk.category] ??
                (risk.category || "Belum dikategorikan");

              return (
                <Link
                  key={risk.id}
                  href={`/risk/register/${risk.id}`}
                  data-testid="risk-row"
                  className="group/risk grid min-h-14 w-full grid-cols-[1fr_8fr_1fr] items-center gap-x-3 px-5 py-2 outline-none transition-[background-color,transform] duration-150 hover:bg-muted/30 active:scale-[0.995] focus-visible:bg-muted/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[5fr_32fr_8fr_5fr] motion-reduce:transform-none motion-reduce:transition-none"
                >
                  <div className="min-w-0 font-normal">
                    <span
                      className="block truncate font-mono text-sm font-normal text-muted-foreground"
                      title={risk.code}
                    >
                      {risk.code}
                    </span>
                  </div>
                  <p
                    className="min-w-0 truncate text-sm font-normal text-foreground"
                    title={risk.title}
                  >
                    {risk.title}
                    <span className="mt-0.5 block truncate text-sm font-normal text-muted-foreground sm:hidden">
                      {categoryLabel}
                    </span>
                  </p>
                  <p
                    className="hidden min-w-0 truncate text-sm font-normal text-muted-foreground sm:block"
                    title={categoryLabel}
                  >
                    {categoryLabel}
                  </p>
                  <Badge
                    variant="outline"
                    size="micro"
                    title={`Skor ${formatRiskScore(score)} — ${getRiskLevelLabel(level)}`}
                    className={cn(
                      "justify-self-end font-mono font-normal tabular-nums",
                      levelToColor(level),
                    )}
                  >
                    {formatRiskScore(score)}
                    <span className="sr-only">
                      ({getRiskLevelLabel(level)})
                    </span>
                  </Badge>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </StandardCard>
  );
}
