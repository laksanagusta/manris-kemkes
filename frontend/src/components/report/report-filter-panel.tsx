"use client";

import type { Dispatch, SetStateAction } from "react";
import { Download, FileSpreadsheet, FileText, Loader2, MoreHorizontal, RefreshCw, RotateCcw } from "@/components/shared/icons";
import { ReportScopePicker } from "@/components/report/report-scope-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OrganizationListItem } from "@/lib/api/organizations";
import type { OrganizationGroupListItem } from "@/lib/api/organization-groups";
import type { ReportsFilterScope } from "@/lib/reports-filter-sheet";
import { currentReportCycle } from "@/lib/quarterly-report";

export type ReportExportFormat = "xlsx" | "pdf";

function PeriodPicker({ label, cycle, onChange, disabled }: {
  label: string;
  cycle: string;
  onChange: (cycle: string) => void;
  disabled: boolean;
}) {
  const current = currentReportCycle();
  const currentYear = Number(current.slice(0, 4));
  const currentQuarter = Number(current.slice(-1));
  const [year, quarter] = cycle.split("-Q");

  return (
    <div className="min-w-0 space-y-1.5">
      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {label}
        {cycle === current && <Badge variant="secondary">Berjalan</Badge>}
      </p>
      <div className="grid grid-cols-[minmax(0,1fr)_4.5rem] gap-2">
        <Select
          disabled={disabled}
          value={year}
          onValueChange={(nextYear) => {
            const nextQuarter = nextYear === String(currentYear)
              ? Math.min(Number(quarter), currentQuarter)
              : Number(quarter);
            onChange(`${nextYear}-Q${nextQuarter}`);
          }}
        >
          <SelectTrigger className="h-9! w-full" aria-label={`Tahun ${label.toLowerCase()}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: currentYear - 1999 }, (_, i) => String(currentYear - i)).map((value) => (
              <SelectItem key={value} value={value}>{value}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select disabled={disabled} value={quarter} onValueChange={(value) => onChange(`${year}-Q${value}`)}>
          <SelectTrigger className="h-9! w-full" aria-label={`Kuartal ${label.toLowerCase()}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4].map((value) => (
              <SelectItem key={value} value={String(value)} disabled={Number(year) === currentYear && value > currentQuarter}>
                Q{value}{Number(year) === currentYear && value === currentQuarter ? " (berjalan)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

interface ReportFilterPanelProps {
  cycle: string;
  comparisonCycle: string;
  onCycleChange: (cycle: string) => void;
  onComparisonCycleChange: (cycle: string) => void;
  scope: ReportsFilterScope;
  onScopeChange: Dispatch<SetStateAction<ReportsFilterScope>>;
  organizations: OrganizationListItem[];
  groups: OrganizationGroupListItem[];
  scopeSummary: string;
  scopeReady: boolean;
  loading: boolean;
  exporting: ReportExportFormat | null;
  canExport: boolean;
  onExport: (format: ReportExportFormat) => void;
  onReload: () => void;
  onReset: () => void;
}

export function ReportFilterPanel({
  cycle, comparisonCycle, onCycleChange, onComparisonCycleChange,
  scope, onScopeChange, organizations, groups, scopeSummary,
  scopeReady, loading, exporting, canExport, onExport, onReload, onReset,
}: ReportFilterPanelProps) {
  const disabled = !scopeReady || Boolean(exporting);

  return (
    <Card data-report-card="" role="region" aria-label="Filter laporan">
      <CardContent className="space-y-4">
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-[11rem_11rem_minmax(0,1fr)]">
          <PeriodPicker label="Periode laporan" cycle={cycle} onChange={onCycleChange} disabled={disabled} />
          <PeriodPicker label="Pembanding" cycle={comparisonCycle} onChange={onComparisonCycleChange} disabled={disabled} />
          <ReportScopePicker
            organizationId={scope.organizationId}
            onOrganizationChange={(organizationId) => onScopeChange((value) => ({ ...value, organizationId }))}
            selectedOrganizationIds={scope.organizationIds}
            onSelectedOrganizationIdsChange={(organizationIds) => onScopeChange((value) => ({ ...value, organizationIds }))}
            organizations={organizations}
            organizationGroupId={scope.organizationGroupId}
            onOrganizationGroupChange={(organizationGroupId) => onScopeChange((value) => ({ ...value, organizationGroupId }))}
            organizationGroups={groups}
            className="min-w-0 md:col-span-2 xl:col-span-1"
            orientation="inline"
            density="compact"
            disabled={disabled}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">{scopeSummary}</p>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Opsi laporan" title="Opsi laporan" disabled={disabled}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled={loading} onSelect={onReload}>
                  <RefreshCw />Muat ulang data
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onReset}>
                  <RotateCcw />Atur ulang filter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={!canExport || loading || disabled}>
                  {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download />}
                  Ekspor
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onExport("pdf")}>
                  <FileText />Ringkasan PDF
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onExport("xlsx")}>
                  <FileSpreadsheet />Laporan lengkap Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
