"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CollectionPagination } from "@/components/shared/design-system";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  statusLabelForPerformanceRisk,
  statusToneForPerformanceRisk,
} from "@/lib/performance-risk";
import type { PerformanceRiskNode } from "@/types/performance-risk";

type Props = {
  nodes: PerformanceRiskNode[];
  selectedROId?: string;
  onSelect: (node: PerformanceRiskNode) => void;
};

const PAGE_SIZE = 5;

export function PerformanceRiskNodeRankingTable({
  nodes,
  selectedROId,
  onSelect,
}: Props) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [open, setOpen] = useState(true);

  const totalPages = Math.max(1, Math.ceil(nodes.length / limit));
  const safePage = Math.min(page, totalPages);

  const visibleNodes = useMemo(
    () => nodes.slice((safePage - 1) * limit, safePage * limit),
    [nodes, safePage, limit],
  );

  const getMitigationProgress = (node: PerformanceRiskNode) => {
    const done = node.mitigationProgressDone ?? 0;
    const pending = node.mitigationProgressPending ?? 0;
    const overdue = node.mitigationProgressOverdue ?? 0;
    const total = node.mitigationProgressTotal ?? done + pending + overdue;
    const percentage =
      node.mitigationProgressPercent ??
      (total > 0 ? Math.round((done / total) * 100) : 0);

    return {
      done,
      pending,
      overdue,
      total,
      percentage: Math.max(0, Math.min(100, Math.round(percentage))),
    };
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className="overflow-x-auto rounded-lg bg-card ring-1 ring-inset ring-border"
        data-open={open}
      >
        <Collapsible open={open} onOpenChange={setOpen}>
          <div className="flex flex-col gap-3 p-4 shadow-[inset_0_-1px_rgba(24,24,27,0.06)] md:flex-row md:items-start md:justify-between md:px-6">
            <CollapsibleTrigger
              className="group flex min-w-0 flex-1 items-start justify-between gap-4 rounded-xl text-left outline-none transition-[background-color,scale] duration-150 ease-out active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2"
              aria-label={
                open ? "Sembunyikan Ranking RO" : "Tampilkan Ranking RO"
              }
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-50 text-zinc-600 shadow-inner ring-1 ring-inset ring-zinc-200/80 transition-colors duration-150 ease-out group-hover:bg-white">
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200 ease-out",
                      open && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </span>
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold tracking-tight text-zinc-900 text-balance">
                    Ranking Rincian Output
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500 text-pretty">
                    Urutan berdasarkan total inherent exposure, jumlah risiko
                    tinggi, dan mitigasi overdue.
                  </p>
                </div>
              </div>
              <div className="hidden shrink-0 items-center gap-3 md:flex">
                <span className="rounded-full bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-zinc-600 tabular-nums ring-1 ring-inset ring-zinc-200">
                  {nodes.length} RO
                </span>
              </div>
            </CollapsibleTrigger>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <Badge
                variant="outline"
                className="rounded-full bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-zinc-600 tabular-nums ring-1 ring-inset ring-zinc-200 md:hidden"
              >
                {nodes.length} RO
              </Badge>
            </div>
          </div>
          <CollapsibleContent>
            <div className="border-b border-zinc-200 px-0 pb-0 pt-0">
              <div className="w-full max-w-full min-w-0 overflow-x-auto">
                <Table className="min-w-[1280px]">
                  <TableHeader className="[&_tr]:border-b [&_tr]:border-border/50">
                    <TableRow className="border-border/50 transition-colors hover:bg-transparent">
                    <TableHead className="h-10 w-16 whitespace-nowrap pl-4 pr-2.5 text-left align-middle text-sm font-medium leading-none text-muted-foreground md:pl-6">
                        No
                      </TableHead>
                      <TableHead className="h-10 whitespace-nowrap px-2.5 text-left align-middle text-sm font-medium leading-none text-muted-foreground">
                        Rincian Output
                      </TableHead>
                      <TableHead className="h-10 whitespace-nowrap px-2.5 text-left align-middle text-sm font-medium leading-none text-muted-foreground">
                        Konteks
                      </TableHead>
                      <TableHead className="h-10 w-28 whitespace-nowrap px-2.5 text-left align-middle text-sm font-medium leading-none text-muted-foreground">
                        Jumlah Risiko
                      </TableHead>
                      <TableHead className="h-10 w-28 whitespace-nowrap px-2.5 text-left align-middle text-sm font-medium leading-none text-muted-foreground">
                        Total Nilai
                      </TableHead>
                      <TableHead className="h-10 w-28 whitespace-nowrap px-2.5 text-left align-middle text-sm font-medium leading-none text-muted-foreground">
                        Overdue
                      </TableHead>
                      <TableHead className="h-10 w-56 whitespace-nowrap px-2.5 text-left align-middle text-sm font-medium leading-none text-muted-foreground">
                        Progres Mitigasi
                      </TableHead>
                      <TableHead className="h-10 w-32 whitespace-nowrap px-2.5 text-left align-middle text-sm font-medium leading-none text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="h-10 w-24 whitespace-nowrap px-2.5 text-left align-middle text-sm font-medium leading-none text-muted-foreground">
                        Aksi
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleNodes.length > 0 ? (
                      visibleNodes.map((node, index) => {
                        const progress = getMitigationProgress(node);

                        return (
                      <TableRow
                        key={node.roId}
                        className={cn(
                          "border-border/30 transition-colors hover:bg-muted/30",
                          selectedROId === node.roId && "bg-muted/20",
                        )}
                      >
                        <TableCell className="align-middle pl-4 pr-2.5 font-mono text-xs text-muted-foreground md:pl-6">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted/60 text-[10px] font-semibold text-foreground">
                            {(safePage - 1) * PAGE_SIZE + index + 1}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[280px] align-middle">
                          <div className="space-y-1">
                            <div className="line-clamp-2 text-sm font-medium text-foreground">
                              {node.roTitle}
                            </div>
                                <div className="line-clamp-1 text-[11px] text-muted-foreground">
                                  {node.planningTitle || "Perjanjian Kinerja"}
                                </div>
                              </div>
                            </TableCell>
                        <TableCell className="align-middle text-muted-foreground">
                          <div className="line-clamp-1 text-xs">
                            {node.planningTitle || node.tujuanTitle || "-"}
                          </div>
                          <div className="line-clamp-1 text-[11px]">
                            {node.objectiveTitle || node.sasaranTitle || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="align-middle text-sm tabular-nums text-foreground">
                          {node.riskCount}
                        </TableCell>
                        <TableCell className="align-middle text-sm font-semibold tabular-nums text-foreground">
                          {node.totalExposure}
                        </TableCell>
                        <TableCell className="align-middle text-sm tabular-nums text-foreground">
                          {node.mitigationOverdue}
                        </TableCell>
                        <TableCell className="align-middle">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold tabular-nums text-foreground">
                                    {progress.percentage}%
                                  </span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2"
                                        aria-label="Lihat rincian progres mitigasi"
                                      >
                                        <Info className="size-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" align="start" className="max-w-[220px]">
                                      <div className="space-y-1">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-background/70">
                                          Rincian progres
                                        </p>
                                        <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-xs">
                                          <span>Selesai</span>
                                          <span className="tabular-nums">{progress.done}</span>
                                          <span>Pending</span>
                                          <span className="tabular-nums">{progress.pending}</span>
                                          <span>Overdue</span>
                                          <span className="tabular-nums">{progress.overdue}</span>
                                          <span>Total aktif</span>
                                          <span className="tabular-nums">{progress.total}</span>
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <Progress value={progress.percentage} className="h-1.5" />
                              </div>
                            </TableCell>
                        <TableCell className="align-middle">
                          <Badge
                            variant="outline"
                            className={cn(
                                  "text-[10px] font-medium",
                                  statusToneForPerformanceRisk(
                                    node.attentionStatus,
                                  ),
                                )}
                              >
                                {statusLabelForPerformanceRisk(
                                  node.attentionStatus,
                                )}
                              </Badge>
                            </TableCell>
                        <TableCell className="align-middle">
                          <Button
                            type="button"
                            variant="outline"
                                size="sm"
                                onClick={() => onSelect(node)}
                                className="h-8"
                              >
                                Detail
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="px-4 py-10 text-center text-sm text-muted-foreground"
                        >
                          Tidak ada RO yang cocok dengan filter aktif.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {nodes.length > limit ? (
                <CollectionPagination
                  itemLabel="RO"
                  page={safePage}
                  pageSize={limit}
                  total={nodes.length}
                  onPageChange={setPage}
                  onPageSizeChange={(nextLimit) => {
                    setLimit(nextLimit);
                    setPage(1);
                  }}
                />
              ) : null}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </TooltipProvider>
  );
}
