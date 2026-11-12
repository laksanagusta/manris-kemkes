"use client";

import { CollectionCode } from "@/components/shared/design-system/collections/collection-code";
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
          className="min-w-[812px] table-fixed"
        >
          <colgroup>
            <col className="w-[16%]" />
            <col className="w-[24%]" />
            <col className="w-[24%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
          </colgroup>
          <CollectionTableHeader>
            <CollectionTableHeaderRow className="border-t border-border/60">
              <CollectionTableHead>Kode risiko</CollectionTableHead>
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
                <TableCell><CollectionCode code={risk.code} href={risk.href} /></TableCell>
                <TableCell>
                  <Link href={risk.href} title={risk.title} className="block truncate rounded-sm font-medium hover:text-primary focus-visible:outline-2 focus-visible:outline-ring">
                    {risk.title}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
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
