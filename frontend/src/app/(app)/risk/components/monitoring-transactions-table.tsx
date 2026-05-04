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
import { formatMonitoringNilai, getMonitoringTransactionActionLabel, getMonitoringTransactionHref } from "@/lib/risk-register-monitoring";
import type { RiskRegisterListItem } from "@/lib/api/risk-register";
import type { RiskCategory, RiskLevel } from "@/types/risk";
import { cn } from "@/lib/utils";
import { riskCategoryLabels } from "@/lib/risk";
import { MoreHorizontal } from "lucide-react";

type MonitoringTransactionsTableProps = {
  items: RiskRegisterListItem[];
  levelBadgeVariant: Record<string, string>;
  statusVariant: Record<string, string>;
  statusLabel: Record<string, string>;
  getRiskLevelLabel: (level: RiskLevel) => string;
  formatTreatmentOption: (value?: string | null) => string;
  formatLocalDateTime: (value?: string | null) => string;
};

function getMonitoringRiskLevel(risk: RiskRegisterListItem) {
  const score = risk.monitoringResultNilai ?? risk.nilai ?? 0;
  if (score >= 20) return "sangat_tinggi";
  if (score >= 15) return "tinggi";
  if (score >= 10) return "sedang";
  if (score >= 5) return "rendah";
  return "sangat_rendah";
}

export function MonitoringTransactionsTable({
  items,
  levelBadgeVariant,
  statusVariant,
  statusLabel,
  getRiskLevelLabel,
  formatTreatmentOption,
  formatLocalDateTime,
}: MonitoringTransactionsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border/50 hover:bg-transparent">
          <TableHead className="w-20 whitespace-nowrap">Kode</TableHead>
          <TableHead className="w-16 whitespace-nowrap">Versi</TableHead>
          <TableHead className="whitespace-nowrap">Judul Risiko</TableHead>
          <TableHead className="w-28 whitespace-nowrap">Kategori</TableHead>
          <TableHead className="w-24 whitespace-nowrap text-center">
            Nilai Sebelum
          </TableHead>
          <TableHead className="w-32 whitespace-nowrap text-center">
            Nilai Hasil Pemantauan
          </TableHead>
          <TableHead className="w-24 whitespace-nowrap">Tingkat Risiko</TableHead>
          <TableHead className="w-24 whitespace-nowrap">Status</TableHead>
          <TableHead className="w-24 whitespace-nowrap">Penanganan</TableHead>
          <TableHead className="w-28 whitespace-nowrap">Dibuat</TableHead>
          <TableHead className="w-28 whitespace-nowrap">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={11}
              className="py-8 text-left text-xs text-muted-foreground"
            >
              Tidak ada transaksi pemantauan yang ditemukan.
            </TableCell>
          </TableRow>
        ) : (
          items.map((risk) => {
            const levelKey = getMonitoringRiskLevel(risk);
            const levelLabel = getRiskLevelLabel(levelKey);
            const href = getMonitoringTransactionHref({ id: risk.id });
            return (
              <TableRow
                key={risk.id}
                className="border-border/30 hover:bg-muted/30 transition-colors"
              >
                <TableCell className="font-mono text-muted-foreground">
                  {risk.code || "-"}
                </TableCell>
                <TableCell>
                  {risk.versionNumber != null ? `v${risk.versionNumber}` : "-"}
                </TableCell>
                <TableCell className="max-w-[250px]">
                  <Link
                    href={href}
                    className="block truncate text-sm font-medium leading-relaxed text-primary transition-colors hover:text-primary/80"
                  >
                    {risk.title || "-"}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {riskCategoryLabels[risk.category as RiskCategory] ||
                    risk.category ||
                    "-"}
                </TableCell>
                <TableCell className="text-center font-medium">
                  {formatMonitoringNilai(risk.beforeMonitoringNilai)}
                </TableCell>
                <TableCell className="text-center font-semibold">
                  {formatMonitoringNilai(risk.monitoringResultNilai)}
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "text-[10px] font-semibold border h-5 px-1.5",
                      levelBadgeVariant[levelLabel] ||
                        levelBadgeVariant.Rendah,
                    )}
                  >
                    {levelLabel}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "text-[10px] font-medium border h-5 px-1.5",
                      risk.status ? statusVariant[risk.status] : undefined,
                    )}
                  >
                    {risk.status ? statusLabel[risk.status] || risk.status : "-"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatTreatmentOption(risk.treatmentOption)}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {formatLocalDateTime(risk.createdAt)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground"
                        aria-label={`Aksi transaksi pemantauan ${risk.code || risk.title || risk.id}`}
                      >
                        <MoreHorizontal className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem asChild>
                        <Link href={href}>
                          {getMonitoringTransactionActionLabel(risk.status)}
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
