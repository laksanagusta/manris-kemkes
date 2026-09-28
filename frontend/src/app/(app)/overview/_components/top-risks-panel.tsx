"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

import {
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
  OverviewPanelState,
  RiskCategoryIndicator,
  StandardCard,
} from "@/components/shared/design-system";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  formatRiskScore,
  getBobot,
  getRiskLevelFromNilai,
  getRiskLevelLabel,
  resolveRiskScoreSemantics,
} from "@/lib/risk";
import { cn } from "@/lib/utils";
import { getLinearRiskLevelBadgeTone } from "@/lib/linear-status-badge";
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
  const visibleRisks = risks.slice(0, 5);

  return (
    <StandardCard
      title={<span className="text-sm">Risiko yang Perlu Perhatian</span>}
      className={cn("xl:h-full xl:min-h-[377px]", className)}
      contentClassName="xl:flex xl:flex-1 xl:flex-col"
    >
      {loading ? (
        <OverviewPanelState
          state="loading"
          message="Memuat risiko teratas..."
          className="xl:flex-1"
        />
      ) : error ? (
        <OverviewPanelState
          state="error"
          message="Risiko teratas tidak dapat dimuat."
          onRetry={onRetry}
          className="xl:flex-1"
        />
      ) : risks.length === 0 ? (
        <OverviewPanelState
          state="empty"
          message="Belum ada data risiko."
          className="xl:flex-1"
        />
      ) : (
        <div className="-mx-(--card-spacing) -mb-(--card-spacing) min-w-0 xl:flex xl:flex-1 xl:flex-col">
          <Table
            aria-label="Risiko yang perlu perhatian"
            className="min-w-[680px] table-fixed"
          >
            <colgroup>
              <col className="w-[40%]" />
              <col className="w-[24%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
            </colgroup>
            <CollectionTableHeader>
              <CollectionTableHeaderRow
                data-testid="risk-list-header"
                className="border-t border-border/60"
              >
                <CollectionTableHead className="px-24">Risiko</CollectionTableHead>
                <CollectionTableHead>Kategori</CollectionTableHead>
                <CollectionTableHead>Probabilitas</CollectionTableHead>
                <CollectionTableHead>Dampak</CollectionTableHead>
                <CollectionTableHead className="text-right">
                  Skor
                </CollectionTableHead>
              </CollectionTableHeaderRow>
            </CollectionTableHeader>
            <TableBody>
            {visibleRisks.map((risk) => {
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
                <TableRow key={risk.id} data-testid="risk-row">
                  <TableCell className="whitespace-normal px-24">
                    <div className="flex min-w-0 flex-col items-start gap-1">
                      <Link
                        href={`/risk/register/${risk.id}`}
                        className="min-w-0 max-w-full truncate rounded-sm text-sm font-medium leading-5 text-foreground transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                        title={risk.title || "Risiko tanpa judul"}
                      >
                        {risk.title || "Risiko tanpa judul"}
                      </Link>
                      <span
                        className="font-mono text-[11px] leading-4 text-muted-foreground"
                        title={risk.code}
                      >
                        {risk.code}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">
                    <RiskCategoryIndicator category={risk.category} />
                  </TableCell>
                  <TableCell>
                    <span
                      className="font-mono text-sm tabular-nums text-foreground"
                      title={`Probabilitas ${risk.probability}`}
                    >
                      {risk.probability}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className="font-mono text-sm tabular-nums text-foreground"
                      title={`Dampak ${risk.impact}`}
                    >
                      {risk.impact}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={getLinearRiskLevelBadgeTone(getRiskLevelLabel(level))}
                      title={`Skor ${formatRiskScore(score)} — ${getRiskLevelLabel(level)}`}
                      className="tabular-nums"
                    >
                      {formatRiskScore(score)}
                      <span className="sr-only">
                        ({getRiskLevelLabel(level)})
                      </span>
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            </TableBody>
          </Table>
        </div>
      )}
    </StandardCard>
  );
}
