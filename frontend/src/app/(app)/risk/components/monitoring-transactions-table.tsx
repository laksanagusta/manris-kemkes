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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatMonitoringScoreChange,
  getMonitoringTransactionActionLabel,
  getMonitoringTransactionHref,
  getMonitoringTransactionStatusLabel,
} from "@/lib/risk-register-monitoring";
import type { RiskMonitoringDetail } from "@/types/risk-monitoring";
import type { RiskCategory, RiskLevel } from "@/types/risk";
import { cn } from "@/lib/utils";
import { riskCategoryLabels } from "@/lib/risk";
import { MoreHorizontal } from "lucide-react";

type MonitoringTransactionsTableProps = {
  items: RiskMonitoringDetail[];
  levelBadgeVariant: Record<string, string>;
  statusVariant: Record<string, string>;
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
    <Table className="min-w-[1320px]">
      <TableHeader>
        <TableRow className="border-zinc-200 transition-colors hover:bg-transparent">
          <TableHead className="w-20 whitespace-nowrap pl-4 pr-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 md:pl-6">
            Kode
          </TableHead>
          <TableHead className="w-72 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
            Risiko
          </TableHead>
          <TableHead className="w-28 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
            Kategori
          </TableHead>
          <TableHead className="w-24 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
            Periode
          </TableHead>
          <TableHead className="w-44 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
            Perubahan Skor
          </TableHead>
          <TableHead className="w-28 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
            Status Pemantauan
          </TableHead>
          <TableHead className="w-40 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
            Efektivitas
          </TableHead>
          <TableHead className="w-32 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
            Update Terakhir
          </TableHead>
          <TableHead className="w-28 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
            Aksi
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={9}
              className="py-8 text-left text-xs text-zinc-500"
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
                className="border-zinc-200/80 transition-colors hover:bg-zinc-50/70"
              >
                <TableCell className="font-mono text-zinc-600 pl-4 pr-2 md:pl-6">
                  {sourceRisk?.code || "-"}
                </TableCell>
                <TableCell className="max-w-[260px] px-2.5">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Link
                      href={href}
                      className="min-w-0 flex-1 truncate text-sm font-semibold leading-relaxed text-zinc-900 transition-colors hover:text-primary"
                      title={sourceRisk?.title || item.draftTitle || "-"}
                    >
                      {sourceRisk?.title || item.draftTitle || "-"}
                    </Link>
                    {sourceRisk?.versionNumber != null ? (
                      <Badge className="h-4 shrink-0 border border-zinc-200 bg-zinc-50 px-1 text-[9px] font-semibold text-zinc-600">
                        v{sourceRisk.versionNumber}
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="px-2.5 whitespace-nowrap text-zinc-600">
                  {riskCategoryLabels[(sourceRisk?.category ?? item.draftCategory ?? "") as RiskCategory] ||
                    sourceRisk?.category ||
                    item.draftCategory ||
                    "-"}
                </TableCell>
                <TableCell className="px-2.5 whitespace-nowrap text-zinc-600">
                  {item.assessmentCycle || "-"}
                </TableCell>
                <TableCell className="px-2.5">
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="font-mono text-xs font-semibold text-zinc-900">
                      {scoreChange}
                    </span>
                    <span className="text-[10px] text-zinc-500">{trendIcon}</span>
                    <Badge
                      className={cn(
                        "text-[10px] font-semibold border h-5 px-1.5",
                        levelBadgeVariant[levelLabel] || levelBadgeVariant.Rendah,
                      )}
                    >
                      {levelLabel}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="px-2.5">
                  <Badge
                    className={cn(
                      "text-[10px] font-medium border h-5 px-1.5",
                      item.status ? statusVariant[item.status] : undefined,
                    )}
                  >
                    {statusText}
                  </Badge>
                </TableCell>
                <TableCell className="px-2.5 text-zinc-600">
                  <span
                    className="block truncate"
                    title={
                      item.effectivenessConclusion ||
                      item.mitigationProgressSummary ||
                      "-"
                    }
                  >
                    {item.effectivenessConclusion ||
                      item.mitigationProgressSummary ||
                      "-"}
                  </span>
                </TableCell>
                <TableCell className="px-2.5 whitespace-nowrap text-xs text-zinc-600">
                  {updateText}
                </TableCell>
                <TableCell className="px-2.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-zinc-500"
                        aria-label={`Aksi transaksi pemantauan ${sourceRisk?.code || sourceRisk?.title || item.id}`}
                      >
                        <MoreHorizontal className="size-3.5" />
                      </Button>
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
