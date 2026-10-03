"use client";

import Link from "next/link";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

import { CollectionTableHead } from "../collections/collection-table-head";
import { CollectionTableHeader } from "../collections/collection-table-header";
import { CollectionTableHeaderRow } from "../collections/collection-table-header-row";
import { StandardCard } from "../layout/standard-card";
import { formatRiskScore } from "@/lib/risk";
import { RiskCategoryIndicator } from "./risk-category-indicator";

export function OverviewTopRisksCard({
  risks,
}: {
  risks: ReadonlyArray<{
    id: string;
    code: string;
    title: string;
    category: string;
    probability: number;
    impact: number;
    score: number;
    levelVariant: BadgeVariant;
    href: string;
  }>;
}) {
  const visibleRisks = risks.slice(0, 5);

  return (
    <StandardCard
      title={<span className="text-sm">Risiko yang Perlu Perhatian</span>}
      className="xl:h-full xl:min-h-[377px]"
      contentClassName="xl:flex xl:flex-1 xl:flex-col"
    >
      <div className="-mx-(--card-spacing) -mb-(--card-spacing) min-w-0 xl:flex xl:flex-1 xl:flex-col">
        <Table
          aria-label="Contoh risiko yang perlu perhatian"
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
            <CollectionTableHeaderRow className="border-t border-border/60">
              <CollectionTableHead className="">Risiko</CollectionTableHead>
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
            return (
              <TableRow key={risk.id}>
                <TableCell className="whitespace-normal">
                  <div className="flex min-w-0 flex-col items-start gap-1">
                    <Link
                      href={risk.href}
                      className="min-w-0 max-w-full truncate rounded-sm text-sm font-medium leading-5 text-foreground transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                      title={risk.title}
                    >
                      {risk.title}
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
                    variant={risk.levelVariant}
                    className="tabular-nums"
                  >
                    {formatRiskScore(risk.score)}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
          </TableBody>
        </Table>
      </div>
    </StandardCard>
  );
}
