"use client";

import type { Dispatch, SetStateAction } from "react";
import { FileSpreadsheet, Loader2, MoreHorizontal, RefreshCw, RotateCcw } from "@/components/shared/icons";
import { ReportFilterCard, ReportFilterRow } from "./report-filter-card";
import { ReportScopePicker } from "@/components/report/report-scope-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OrganizationListItem } from "@/lib/api/organizations";
import type { OrganizationGroupListItem } from "@/lib/api/organization-groups";
import type { ReportsFilterScope } from "@/lib/reports-filter-sheet";
import { currentReportCycle } from "@/lib/quarterly-report";


export function ReportPeriodPicker({ label, cycle, onChange, disabled }: {
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
          <SelectTrigger className="h-8! w-full" aria-label={`Tahun ${label.toLowerCase()}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: currentYear - 1999 }, (_, i) => String(currentYear - i)).map((value) => (
              <SelectItem key={value} value={value}>{value}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select disabled={disabled} value={quarter} onValueChange={(value) => onChange(`${year}-Q${value}`)}>
          <SelectTrigger className="h-8! w-full" aria-label={`Kuartal ${label.toLowerCase()}`}>
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
  onCycleChange: (cycle: string) => void;
  scope: ReportsFilterScope;
  onScopeChange: Dispatch<SetStateAction<ReportsFilterScope>>;
  organizations: OrganizationListItem[];
  groups: OrganizationGroupListItem[];
  scopeSummary: string;
  scopeReady: boolean;
  loading: boolean;
  exporting: boolean;
  canExport: boolean;
  onExportExcel: () => void;
  onExportDataExcel: () => void;
  onReload: () => void;
  onReset: () => void;
}

export function ReportFilterPanel({
  cycle, onCycleChange,
  scope, onScopeChange, organizations, groups, scopeSummary,
  scopeReady, loading, exporting, canExport, onExportExcel, onExportDataExcel, onReload, onReset,
}: ReportFilterPanelProps) {
  const disabled = !scopeReady || exporting;

  return (
    <ReportFilterCard>
      <ReportFilterRow>
        <div className="w-full sm:w-48">
          <ReportPeriodPicker
            label="Periode"
            cycle={cycle}
            onChange={onCycleChange}
            disabled={disabled}
          />
        </div>
        <ReportScopePicker
          organizationId={scope.organizationId}
          onOrganizationChange={(organizationId) => onScopeChange((value) => ({ ...value, organizationId }))}
          selectedOrganizationIds={scope.organizationIds}
          onSelectedOrganizationIdsChange={(organizationIds) => onScopeChange((value) => ({ ...value, organizationIds }))}
          organizations={organizations}
          organizationGroupId={scope.organizationGroupId}
          onOrganizationGroupChange={(organizationGroupId) => onScopeChange((value) => ({ ...value, organizationGroupId }))}
          organizationGroups={groups}
          className="w-full min-w-0 flex-1 md:min-w-[28rem]"
          orientation="inline"
          density="compact"
          disabled={disabled}
        />
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" size="icon" aria-label="Muat ulang" title="Muat ulang" disabled={disabled || loading} aria-busy={loading} onClick={onReload}>
            <RefreshCw aria-hidden="true" className={loading ? "animate-spin motion-reduce:animate-none" : undefined} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Opsi laporan" title="Opsi laporan" disabled={disabled}>
                {exporting ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={!canExport || loading || exporting} onSelect={onExportExcel}>
                {exporting ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}Laporan lengkap Excel
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!canExport || loading || exporting} onSelect={onExportDataExcel}>
                <FileSpreadsheet />Data laporan Excel
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onReset}>
                <RotateCcw />Atur ulang filter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </ReportFilterRow>
      <p className="sr-only" aria-live="polite">{scopeSummary}</p>
    </ReportFilterCard>
  );
}
