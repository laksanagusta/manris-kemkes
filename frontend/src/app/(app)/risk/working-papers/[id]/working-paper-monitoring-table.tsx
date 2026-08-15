"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, MoreHorizontal, Minus } from "@/components/ui/icons";

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
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CollectionEmptyState,
  CollectionStatusBadge,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
} from "@/components/shared/design-system";
import {
  WORKING_PAPER_MONITORING_COLUMNS,
  buildWorkingPaperMonitoringRowFromLink,
} from "@/lib/working-paper-monitoring-table";
import { cn } from "@/lib/utils";
import type { WorkingPaperRiskLink } from "@/types/working-paper";

const levelBadgeTone: Record<
  string,
  "success" | "info" | "warning" | "danger" | "neutral"
> = {
  "Sangat Rendah": "success",
  Rendah: "info",
  Sedang: "warning",
  Tinggi: "danger",
  "Sangat Tinggi": "danger",
};

const monitoringStatusTone = {
  draft: "neutral",
  final: "success",
  unmonitored: "neutral",
} as const;

const versionBadgeTone = {
  source: "neutral",
  result: "info",
} as const;

function NarrativeCell({ value }: { value: string }) {
  if (value === "-") {
    return     <span className="text-muted-foreground">-</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block max-w-[220px] whitespace-pre-line line-clamp-2 text-xs leading-5 text-muted-foreground">
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
          className="text-muted-foreground"
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
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
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
    <Table>
      <CollectionTableHeader>
        <CollectionTableHeaderRow>
          {WORKING_PAPER_MONITORING_COLUMNS.map((column, index) => (
            <CollectionTableHead
              key={column.key}
              className={cn(
                "whitespace-nowrap px-2.5 text-left align-middle text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground",
                index === 0 && "w-40 min-w-40 max-w-40",
                index === 1 && "w-[320px] min-w-[320px] max-w-[320px] overflow-hidden",
              )}
            >
              {column.label}
            </CollectionTableHead>
          ))}
        </CollectionTableHeaderRow>
      </CollectionTableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={10} className="h-24 px-4">
              <CollectionEmptyState
                title="Belum ada risiko"
                description="Dokumen ini belum memuat risiko apa pun"
              />
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow
              key={row.id}
              className="group border-border transition-colors hover:bg-muted/50"
            >
              <TableCell className="w-40 min-w-40 max-w-40 px-2.5 font-mono text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  {row.code}
                  {row.sourceVersionNumber != null ? (
                    <Badge tone={versionBadgeTone.source} size="micro">
                      Sumber v{row.sourceVersionNumber}
                    </Badge>
                  ) : null}
                  {row.resultVersionNumber != null ? (
                    <Badge tone={versionBadgeTone.result} size="micro">
                      Hasil v{row.resultVersionNumber}
                    </Badge>
                  ) : row.versionNumber != null && row.versionNumber > 1 ? (
                    <Badge tone={versionBadgeTone.source} size="micro">
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
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {row.sourceScore}
                    {row.observedScore == null ? "" : ` -> ${row.observedScore}`}
                  </span>
                  {row.observedScore != null ? (
                    <Badge
                      tone={levelBadgeTone[row.observedLevelLabel] || "info"}
                      size="micro"
                      className="font-semibold"
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
                <span className="block max-w-[200px] truncate text-xs text-muted-foreground">
                  {row.effectiveness}
                </span>
              </TableCell>
              <TableCell className="px-2.5">
                <NarrativeCell value={row.condition} />
              </TableCell>
              <TableCell className="px-2.5">
                <NarrativeCell value={row.followUp} />
              </TableCell>
              <TableCell className="px-2.5">
                <CollectionStatusBadge
                  size="micro"
                  tone={monitoringStatusTone[row.status] || "neutral"}
                  className="font-medium"
                >
                  {row.statusLabel}
                </CollectionStatusBadge>
              </TableCell>
              <TableCell className="px-2.5 text-right">
                <MonitoringActionMenu row={row} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
