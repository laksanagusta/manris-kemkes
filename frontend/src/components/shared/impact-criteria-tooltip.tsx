"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ImpactCriteria,
  ImpactCriteriaCategory,
  ImpactCriteriaUPRLevel,
  impactLevelLabels,
} from "@/types/impact-criteria";
import { listImpactCriteria } from "@/lib/api/impact-criteria";

interface ImpactCriteriaTooltipProps {
  token: string;
  label?: string;
  category: ImpactCriteriaCategory;
  uprLevel: ImpactCriteriaUPRLevel;
  className?: string;
}

export function ImpactCriteriaTooltip({
  token,
  label = "Dampak",
  category,
  uprLevel,
  className,
}: ImpactCriteriaTooltipProps) {
  const [criteria, setCriteria] = useState<ImpactCriteria[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!category || !uprLevel || fetched) return;
    let cancelled = false;
    setLoading(true);

    listImpactCriteria(token, { category, uprLevel })
      .then((data) => {
        if (!cancelled) {
          setCriteria(data);
          setFetched(true);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          setFetched(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, category, uprLevel, fetched]);

  return (
    <div className={cn("flex h-6 items-center gap-2", className)}>
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex size-5 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Lihat kriteria dampak"
          >
            <Info className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="w-[min(92vw,44rem)] max-w-[44rem] rounded-xl border border-border/70 bg-background p-0 text-foreground shadow-xl"
        >
          <div className="max-h-[70vh] overflow-auto">
            <div className="border-b border-border/60 px-4 py-3">
              <p className="text-sm font-semibold">Kriteria Dampak</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Panduan level dampak berdasarkan kategori risiko dan UPR.
              </p>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 px-4 py-6 text-xs text-muted-foreground">
                <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                Memuat...
              </div>
            ) : criteria.length === 0 ? (
              <div className="px-4 py-6 text-xs text-muted-foreground">
                Tidak ada data kriteria.
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="border-b border-r border-border/60 px-3 py-2 font-semibold w-10">
                      Level
                    </th>
                    <th className="border-b border-border/60 px-3 py-2 font-semibold">
                      Kriteria &amp; Deskripsi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {criteria.map((c) => (
                    <tr key={c.id} className="align-top">
                      <td className="border-b border-r border-border/60 px-3 py-3 text-center font-bold">
                        {c.impactLevel}
                      </td>
                      <td className="border-b border-border/60 px-3 py-3">
                        <span className="font-medium">
                          {impactLevelLabels[c.impactLevel] || c.impactLabel}
                        </span>
                        <span className="mt-1 block text-muted-foreground">
                          {c.description}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}