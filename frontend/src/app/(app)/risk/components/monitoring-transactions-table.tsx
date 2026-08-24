"use client";

import Link from "next/link";

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
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
} from "@/components/shared/design-system";
import {
  formatMonitoringScoreChange,
  getMonitoringTransactionActionLabel,
  getMonitoringTransactionHref,
  getMonitoringTransactionStatusLabel,
} from "@/lib/risk-register-monitoring";
import type { RiskMonitoringDetail } from "@/types/risk-monitoring";
import type { RiskCategory, RiskLevel } from "@/types/risk";
import { riskCategoryLabels } from "@/lib/risk";
import { ActionIconButton } from "@/components/shared/design-system";
import type { BadgeTone } from "@/lib/linear-status-badge";

type MonitoringTransactionsTableProps = {
  items: RiskMonitoringDetail[];
  levelBadgeVariant: Record<string, BadgeTone>;
  statusVariant: Record<string, BadgeTone>;
  getRiskLevelLabel: (level: RiskLevel) => string;
  formatLocalDateTime: (value?: string | null) => string;
};

export function MonitoringTransactionsTable({
  items,
  levelBadgeVariant,
  statusVariant,
  getRiskLevelLabel,
  formatLocalDateTime,
}: MonitoringTransactionsTableProps) {
  return (
    <Table className="min-w-[1160px] table-fixed">
      <colgroup>
        <col className="w-[8%]" />
        <col className="w-[26%]" />
        <col className="w-[10%]" />
        <col className="w-[9%]" />
        <col className="w-[16%]" />
        <col className="w-[10%]" />
        <col className="w-[12%]" />
        <col className="w-[10%]" />
      </colgroup>
      <CollectionTableHeader>
        <CollectionTableHeaderRow>
          <CollectionTableHead className="w-20 pl-4 pr-2.5 md:pl-6">
            Kode
          </CollectionTableHead>
          <CollectionTableHead className="w-72 px-2.5">
            Risiko
          </CollectionTableHead>
          <CollectionTableHead className="w-28 px-2.5">
            Kategori
          </CollectionTableHead>
          <CollectionTableHead className="w-24 px-2.5">
            Periode
          </CollectionTableHead>
          <CollectionTableHead className="w-44 px-2.5">
            Perubahan Skor
          </CollectionTableHead>
          <CollectionTableHead className="w-28 px-2.5">
            Status
          </CollectionTableHead>
          <CollectionTableHead className="w-32 px-2.5">
            Update Terakhir
          </CollectionTableHead>
          <CollectionTableHead className="w-28 px-2.5">
            Aksi
          </CollectionTableHead>
        </CollectionTableHeaderRow>
      </CollectionTableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={8}
              className="py-8 text-left text-xs text-muted-foreground"
            >
              Tidak ada transaksi pemantauan yang ditemukan.
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => {
            const sourceRisk = item.sourceRisk;
            const levelKey = (item.observedLevel || item.sourceLevel || "rendah") as RiskLevel;
            const levelLabel = getRiskLevelLabel(levelKey);
            const href = getMonitoringTransactionHref({ id: item.id });
            const scoreChange = formatMonitoringScoreChange(
              item.sourceNilai,
              item.observedNilai,
            );
            const statusText = getMonitoringTransactionStatusLabel(item.status);
            const updateText = formatLocalDateTime(item.updatedAt || item.startedAt);
            const trendIcon =
              item.trend === "up" ? "↑" : item.trend === "down" ? "↓" : "→";

            return (
              <TableRow
                key={item.id}
                className="border-0 transition-colors hover:bg-muted/50"
              >
                <TableCell className="py-2 font-mono text-foreground pl-4 pr-2 md:pl-6">
                  {sourceRisk?.code || "-"}
                </TableCell>
                <TableCell className="max-w-[260px] px-2.5 py-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Link
                      href={href}
                      className="min-w-0 flex-1 truncate text-sm font-normal leading-relaxed text-foreground transition-colors hover:text-primary"
                      title={sourceRisk?.title || item.draftTitle || "-"}
                    >
                      {sourceRisk?.title || item.draftTitle || "-"}
                    </Link>
                    {sourceRisk?.versionNumber != null ? (
                      <Badge tone="neutral" size="micro" className="shrink-0">
                        v{sourceRisk.versionNumber}
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="px-2.5 py-2 whitespace-nowrap text-foreground">
                  {riskCategoryLabels[(sourceRisk?.category ?? item.draftCategory ?? "") as RiskCategory] ||
                    sourceRisk?.category ||
                    item.draftCategory ||
                    "-"}
                </TableCell>
                <TableCell className="px-2.5 py-2 whitespace-nowrap text-foreground">
                  {item.assessmentCycle || "-"}
                </TableCell>
                <TableCell className="px-2.5 py-2">
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="font-mono text-sm font-medium text-foreground">
                      {scoreChange}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{trendIcon}</span>
                    <Badge
                      tone={levelBadgeVariant[levelLabel] || levelBadgeVariant.Rendah}
                      size="micro"
                    >
                      {levelLabel}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="px-2.5 py-2">
                  <Badge
                    tone={item.status ? statusVariant[item.status] : "neutral"}
                    size="micro"
                  >
                    {statusText}
                  </Badge>
                </TableCell>
                <TableCell className="px-2.5 py-2 whitespace-nowrap text-xs text-muted-foreground">
                  {updateText}
                </TableCell>
                <TableCell className="px-2.5 py-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <ActionIconButton
                        aria-label={`Aksi transaksi pemantauan ${sourceRisk?.code || sourceRisk?.title || item.id}`}
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem asChild>
                        <Link href={href}>
                          {getMonitoringTransactionActionLabel(item.status)}
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
