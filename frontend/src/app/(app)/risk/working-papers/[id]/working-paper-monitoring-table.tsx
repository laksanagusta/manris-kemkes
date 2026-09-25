"use client";

import Link from "next/link";
import { MoreHorizontal } from "@/components/shared/icons";

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
  CollectionEmptyState,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
} from "@/components/shared/design-system";
import {
  WORKING_PAPER_MONITORING_COLUMNS,
  buildWorkingPaperMonitoringRowFromLink,
} from "@/lib/working-paper-monitoring-table";
import { formatRiskScore } from "@/lib/risk";
import type { WorkingPaperRiskLink } from "@/types/working-paper";
import { getStatusBadgeClassName, toBadgeVariant } from "@/lib/badge-variant";

type MonitoringRow = ReturnType<typeof buildWorkingPaperMonitoringRowFromLink>;

function getMonitoringStatusTone(row: MonitoringRow) {
  if (row.statusLabel === "Data tidak konsisten") {
    return "danger" as const;
  }
  if (row.status === "draft") {
    return "progress" as const;
  }
  if (row.status === "final") {
    return "success" as const;
  }
  return "neutral" as const;
}

function MonitoringActionMenu({
  row,
}: {
  row: MonitoringRow;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className=""
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

export function WorkingPaperMonitoringTable({
  links,
}: {
  links: WorkingPaperRiskLink[];
}) {
  const rows = links.map((link) => buildWorkingPaperMonitoringRowFromLink(link));

  return (
    <Table className="w-full table-fixed">
      <colgroup>
        <col className="w-[13%]" />
        <col className="w-[9%]" />
        <col className="w-[33%]" />
        <col className="w-[22%]" />
        <col className="w-[13%]" />
        <col className="w-[10%]" />
      </colgroup>
      <CollectionTableHeader density="compact">
        <CollectionTableHeaderRow>
          <CollectionTableHead >Kode</CollectionTableHead>
          <CollectionTableHead >Versi</CollectionTableHead>
          <CollectionTableHead className="px-24">Risiko</CollectionTableHead>
          <CollectionTableHead >Perubahan Skor</CollectionTableHead>
          <CollectionTableHead >Status</CollectionTableHead>
          <CollectionTableHead className="text-center">
            <span className="sr-only">Aksi</span>
          </CollectionTableHead>
        </CollectionTableHeaderRow>
      </CollectionTableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={WORKING_PAPER_MONITORING_COLUMNS.length}
              className="h-24"
            >
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
              className="group h-10 hover:bg-muted/50"
            >
              <TableCell className="">
                {row.code}
              </TableCell>
              <TableCell className="truncate">
                {row.versionNumber != null ? `v${row.versionNumber}` : "-"}
              </TableCell>
              <TableCell className="max-w-0 px-24">
                <span
                  className="block truncate text-sm font-medium leading-relaxed text-foreground"
                  title={row.title}
                >
                  {row.title}
                </span>
              </TableCell>
              <TableCell className="">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="font-mono text-sm font-medium tabular-nums text-foreground">
                    {formatRiskScore(row.sourceScore)}
                    {row.observedScore == null
                      ? ""
                      : ` -> ${formatRiskScore(row.observedScore)}`}
                  </span>
                {row.observedScore != null ? (
                    <span className="truncate text-xs font-medium text-muted-foreground">
                      {row.observedLevelLabel}
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="max-w-0">
                <Badge variant={toBadgeVariant(getMonitoringStatusTone(row))}
                  className={`max-w-full truncate ${getStatusBadgeClassName(getMonitoringStatusTone(row))}`}
                  title={row.statusLabel}
                >
                  {row.statusLabel}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <MonitoringActionMenu row={row} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
