"use client";

import { useEffect, useState } from "react";
import { Info } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

  useEffect(() => {
    if (!category || !uprLevel) return;
    let cancelled = false;
    setCriteria([]); // reset when category/upr changes
    setLoading(true);

    listImpactCriteria(token, { category, uprLevel })
      .then((data) => {
        if (!cancelled) {
          setCriteria(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, category, uprLevel]);

  return (
    <div className={cn("flex h-6 items-center gap-2", className)}>
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="icon-xs" aria-label="Lihat kriteria dampak">
            <Info />
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="w-[min(92vw,44rem)] max-w-[44rem]"
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
              <Table className="w-full text-left">
                <TableHeader>
                  <TableRow className="h-auto">
                    <TableHead className="w-10">
                      Level
                    </TableHead>
                    <TableHead className="">
                      Kriteria &amp; Deskripsi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criteria.map((c) => (
                    <TableRow key={c.id} className="h-auto align-top">
                      <TableCell className="text-center">
                        {c.impactLevel}
                      </TableCell>
                      <TableCell className="">
                        <span className="font-medium">
                          {impactLevelLabels[c.impactLevel] || c.impactLabel}
                        </span>
                        <span className="mt-1 block text-muted-foreground">
                          {c.description}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
