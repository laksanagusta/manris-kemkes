"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

import { StandardCard } from "../layout/standard-card";
import { cn } from "@/lib/utils";
import { formatRiskScore, riskCategoryLabels } from "@/lib/risk";

export function OverviewTopRisksCard({
  risks,
}: {
  risks: ReadonlyArray<{
    id: string;
    code: string;
    title: string;
    category: string;
    score: number;
    levelClass: string;
    href: string;
  }>;
}) {
  return (
    <StandardCard
      title="Risiko yang Perlu Perhatian"
      className="h-full rounded-2xl"
      headerClassName="px-5 pb-4 pt-5"
      contentClassName="p-0"
    >
      <div className="border-t border-border/60">
        <div
          aria-hidden="true"
          className="grid min-h-10 w-full grid-cols-[1fr_8fr_1fr] items-center gap-x-3 border-b border-border/60 bg-table-header px-5 text-xs font-normal capitalize tracking-[0.02em] text-muted-foreground sm:grid-cols-[5fr_32fr_8fr_5fr]"
        >
          <span>Kode</span>
          <span>Judul</span>
          <span className="hidden sm:block">Kategori</span>
          <span className="text-right">Skor</span>
        </div>
        <div className="divide-y divide-border/40">
          {risks.map((risk) => {
            const categoryLabel =
              riskCategoryLabels[risk.category as keyof typeof riskCategoryLabels] ??
              (risk.category || "Belum dikategorikan");

            return (
              <Link
                key={risk.id}
                href={risk.href}
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
                  className={cn(
                    "justify-self-end font-mono font-normal tabular-nums",
                    risk.levelClass,
                  )}
                >
                  {formatRiskScore(risk.score)}
                </Badge>
              </Link>
            );
          })}
        </div>
      </div>
    </StandardCard>
  );
}
