"use client";

import type { Dispatch, SetStateAction } from "react";
import { FileSpreadsheet, Loader2, MoreHorizontal, RefreshCw, RotateCcw } from "@/components/shared/icons";
import { DynamicTableFilters, type TableFilterField } from "@/components/shared/design-system/collections/dynamic-table-filters";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OrganizationListItem } from "@/lib/api/organizations";
import type { OrganizationGroupListItem } from "@/lib/api/organization-groups";
import type { ReportsFilterScope } from "@/lib/reports-filter-sheet";
import { reportQuarterOptions } from "@/lib/quarterly-report";

interface ReportFilterPanelProps {
  cycle: string;
  onCycleChange: (cycle: string) => void;
  comparison?: { cycle: string; onChange: (cycle: string) => void };
  scope: ReportsFilterScope;
  defaultScope: ReportsFilterScope;
  requireUnit?: boolean;
  onScopeChange: Dispatch<SetStateAction<ReportsFilterScope>>;
  organizations: OrganizationListItem[];
  groups: OrganizationGroupListItem[];
  scopeSummary: string;
  scopeReady: boolean;
  loading: boolean;
  exporting?: boolean;
  canExport?: boolean;
  onExportExcel?: () => void;
  onExportDataExcel?: () => void;
  onReload: () => void;
  onReset: () => void;
}

export function ReportFilterPanel({
  cycle, onCycleChange, comparison,
  scope, defaultScope, requireUnit = false, onScopeChange, organizations, groups, scopeSummary,
  scopeReady, loading, exporting = false, canExport, onExportExcel, onExportDataExcel, onReload, onReset,
}: ReportFilterPanelProps) {
  const disabled = !scopeReady || exporting;

  const periodOptions = reportQuarterOptions();
  const unitsForGroup = (id: string) => {
    const group = groups.find((item) => item.id === id);
    const memberIds = new Set(group?.members?.map((member) => member.id));
    return organizations.filter((organization) => !id || memberIds.has(organization.id));
  };
  const scopeFor = (groupId: string, ids: string[]): ReportsFilterScope => ({
    organizationGroupId: groupId,
    organizationId: ids.length === 1 ? ids[0] : "",
    organizationIds: ids,
  });
  const groupUnits = scope.organizationGroupId
    ? unitsForGroup(scope.organizationGroupId).map(({ id }) => id).sort() : [];
  const fields: TableFilterField[] = [
    { id: "period", label: "Periode", value: cycle, required: true, options: periodOptions, onChange: onCycleChange },
  ];
  if (comparison) {
    fields.push({
      id: "comparison", label: "Bandingkan dengan", value: comparison.cycle, required: true,
      options: periodOptions, onChange: comparison.onChange,
    });
  }
  if (groups.length) {
    fields.push({
      id: "group", label: "Grup", value: scope.organizationGroupId, defaultValue: "",
      options: groups.map(({ id, name }) => ({ value: id, label: name })),
      onChange: (id) => onScopeChange(id ? scopeFor(id, unitsForGroup(id).map((unit) => unit.id).sort()) : defaultScope),
    });
  }
  fields.push({
    id: "organization", label: "Unit", type: "multi-select",
    value: [...scope.organizationIds].sort().join(","), defaultValue: groupUnits.join(","),
    required: requireUnit && !scope.organizationGroupId,
    options: unitsForGroup(scope.organizationGroupId).map(({ id, name }) => ({ value: id, label: name })),
    onChange: (value) => onScopeChange((previous) => {
      if (previous.organizationGroupId !== scope.organizationGroupId) return previous;
      if (!previous.organizationGroupId && !value) return defaultScope;
      const allowedIds = unitsForGroup(previous.organizationGroupId).map(({ id }) => id);
      const ids = value.split(",").filter((id) => allowedIds.includes(id));
      return scopeFor(previous.organizationGroupId, ids.length || !previous.organizationGroupId ? ids : allowedIds.sort());
    }),
  });

  return (
    <div className="min-w-0">
      <DynamicTableFilters fields={fields} disabled={disabled} columns={
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" size="icon" aria-label="Muat ulang" title="Muat ulang" disabled={disabled || loading} aria-busy={loading} onClick={onReload}>
            <RefreshCw aria-hidden="true" className={loading ? "animate-spin motion-reduce:animate-none" : undefined} />
          </Button>
          {onExportExcel && onExportDataExcel ? <DropdownMenu>
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
          </DropdownMenu> : (
            <Button type="button" variant="outline" size="icon" aria-label="Atur ulang filter" title="Atur ulang filter" disabled={disabled} onClick={onReset}>
              <RotateCcw aria-hidden="true" />
            </Button>
          )}
        </div>
      } />
      <p className="sr-only" aria-live="polite">{scopeSummary}</p>
    </div>
  );
}
