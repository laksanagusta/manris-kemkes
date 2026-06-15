"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, MoreHorizontal, Minus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getLinearStatusBadgeClass } from "@/lib/linear-status-badge";
import {
  WORKING_PAPER_MONITORING_COLUMNS,
  buildWorkingPaperMonitoringRowFromLink,
} from "@/lib/working-paper-monitoring-table";
import { cn } from "@/lib/utils";
import type { WorkingPaperRiskLink } from "@/types/working-paper";

const levelBadgeVariant: Record<string, string> = {
  "Sangat Rendah": "bg-green-100 text-green-700 border-green-200",
  Rendah: "bg-risk-low/15 text-risk-low border-risk-low/20",
  Sedang: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  Tinggi: "bg-risk-high/15 text-risk-high border-risk-high/20",
  "Sangat Tinggi":
    "bg-risk-extreme/15 text-risk-extreme border-risk-extreme/20",
};

function NarrativeCell({ value }: { value: string }) {
  if (value === "-") {
    return <span className="text-zinc-400">-</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block max-w-[220px] whitespace-pre-line line-clamp-2 text-xs leading-5 text-zinc-600">
          {value}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-sm whitespace-pre-line">
        {value}
      </TooltipContent>
    </Tooltip>
  );
}

function MonitoringActionMenu({
  row,
}: {
  row: ReturnType<typeof buildWorkingPaperMonitoringRowFromLink>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-zinc-500"
          aria-label={`Aksi risiko ${row.code}`}
        >
          <MoreHorizontal className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {row.actionItems.map((item) =>
          item.href ? (
            <DropdownMenuItem key={item.label} asChild>
              <Link href={item.href!}>{item.label}</Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={item.label} disabled>
              {item.label}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TrendCell({ trend }: { trend: "up" | "down" | "stable" | null }) {
  const Icon =
    trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : trend === "stable" ? Minus : null;

  const label = trend === "up" ? "Meningkat" : trend === "down" ? "Menurun" : trend === "stable" ? "Tetap" : "-";

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-zinc-600">
      {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
      {label}
    </span>
  );
}

export function WorkingPaperMonitoringTable({
  links,
}: {
  links: WorkingPaperRiskLink[];
}) {
  const rows = links.map((link) => buildWorkingPaperMonitoringRowFromLink(link));

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[1960px]">
        <TableHeader>
          <TableRow className="border-zinc-200/80 hover:bg-transparent">
            {WORKING_PAPER_MONITORING_COLUMNS.map((column, index) => (
              <TableHead
                key={column.key}
                className={cn(
                  "whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500",
                  index === 0 && "w-40 min-w-40 max-w-40",
                  index === 1 && "w-[320px] min-w-[320px] max-w-[320px] overflow-hidden",
                )}
              >
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="h-24">
                <div className="flex flex-col gap-1 text-left">
                  <p className="text-sm font-medium text-muted-foreground">
                    Belum ada risiko
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Dokumen ini belum memuat risiko apa pun
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                className="group border-zinc-200/80 transition-colors hover:bg-zinc-50/70"
              >
                <TableCell className="w-40 min-w-40 max-w-40 px-2.5 font-mono text-xs text-zinc-600">
                  <span className="flex items-center gap-1.5">
                    {row.code}
                    {row.sourceVersionNumber != null ? (
                      <Badge className="h-5 border-zinc-200 bg-zinc-50 px-1.5 text-[10px] text-zinc-600">
                        Sumber v{row.sourceVersionNumber}
                      </Badge>
                    ) : null}
                    {row.resultVersionNumber != null ? (
                      <Badge className="h-5 border-blue-200 bg-blue-50 px-1.5 text-[10px] text-blue-700">
                        Hasil v{row.resultVersionNumber}
                      </Badge>
                    ) : row.versionNumber != null && row.versionNumber > 1 ? (
                      <Badge className="h-5 border-zinc-200 bg-zinc-50 px-1.5 text-[10px] text-zinc-600">
                        v{row.versionNumber}
                      </Badge>
                    ) : null}
                  </span>
                </TableCell>
                <TableCell className="w-[320px] min-w-[320px] max-w-[320px] overflow-hidden px-2.5">
                  <span className="line-clamp-2 text-xs font-medium text-foreground">
                    {row.title}
                  </span>
                </TableCell>
                <TableCell className="px-2.5">
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="font-mono text-xs font-semibold text-zinc-900">
                      {row.sourceScore}
                      {row.observedScore == null ? "" : ` -> ${row.observedScore}`}
                    </span>
                    {row.observedScore != null ? (
                      <Badge
                        className={cn(
                          "h-5 border px-1.5 text-[10px] font-semibold",
                          levelBadgeVariant[row.observedLevelLabel] ||
                            levelBadgeVariant.Rendah,
                        )}
                      >
                        {row.observedLevelLabel}
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="px-2.5">
                  <TrendCell trend={row.trend} />
                </TableCell>
                <TableCell className="px-2.5">
                  <div className="min-w-[180px] space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-zinc-600">{row.progressSummary}</span>
                      <span className="font-mono font-semibold text-zinc-900">
                        {row.progressPercent == null ? "-" : `${row.progressPercent}%`}
                      </span>
                    </div>
                    {row.progressPercent != null ? (
                      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${row.progressPercent}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="px-2.5">
                  <span className="block max-w-[200px] truncate text-xs text-zinc-600">
                    {row.effectiveness}
                  </span>
                </TableCell>
                <TableCell className="px-2.5">
                  <NarrativeCell value={row.condition} />
                </TableCell>
                <TableCell className="px-2.5">
                  <NarrativeCell value={row.obstacles} />
                </TableCell>
                <TableCell className="px-2.5">
                  <NarrativeCell value={row.followUp} />
                </TableCell>
                <TableCell className="px-2.5">
                  <Badge
                    className={cn(
                      "h-5 border px-1.5 text-[10px] font-medium",
                      row.status === "draft"
                        ? getLinearStatusBadgeClass("draft")
                        : row.status === "finalized"
                          ? getLinearStatusBadgeClass("completed")
                          : "border-zinc-200 bg-zinc-50 text-zinc-600",
                    )}
                  >
                    {row.statusLabel}
                  </Badge>
                </TableCell>
                <TableCell className="px-2.5 text-right">
                  <MonitoringActionMenu row={row} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
