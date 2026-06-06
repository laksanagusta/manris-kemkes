"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ReportsFilterSheet } from "@/app/(app)/reports/_components/report-filter-sheet";
import type { ReportsFilterPlanningOption } from "@/app/(app)/reports/_components/report-filter-sheet";
import type { OrganizationGroupListItem } from "@/lib/api/organization-groups";
import type { OrganizationListItem } from "@/lib/api/organizations";
import type { ReportsFilterScope } from "@/lib/reports-filter-sheet";
import type { Dispatch, SetStateAction } from "react";

type Props = {
  filterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
  organizations: OrganizationListItem[];
  organizationGroups: OrganizationGroupListItem[];
  planningId: string;
  planningOptions: ReportsFilterPlanningOption[];
  onPlanningChange: (value: string) => void;
  draftScope: ReportsFilterScope;
  onDraftScopeChange: Dispatch<SetStateAction<ReportsFilterScope>>;
  onResetFilter: () => void;
  onCancelFilter: () => void;
  onApplyFilter: () => void;
  activeUnitCount: number;
  searchText: string;
  onSearchTextChange: (value: string) => void;
  showNoRisk: boolean;
  onShowNoRiskChange: (value: boolean) => void;
};

export function PerformanceRiskFilterBar({
  filterOpen,
  onFilterOpenChange,
  organizations,
  organizationGroups,
  planningId,
  planningOptions,
  onPlanningChange,
  draftScope,
  onDraftScopeChange,
  onResetFilter,
  onCancelFilter,
  onApplyFilter,
  activeUnitCount,
  searchText,
  onSearchTextChange,
  showNoRisk,
  onShowNoRiskChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 flex-1 md:max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="performance-risk-search"
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value)}
            placeholder="Ketik kata kunci"
            aria-label="Cari RO / program / kegiatan"
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <ReportsFilterSheet
          open={filterOpen}
          onOpenChange={onFilterOpenChange}
          activeUnitCount={activeUnitCount}
          showUnitCountBadge={false}
          disabled={organizations.length === 0 && organizationGroups.length === 0}
          title="Filter Analisis Kinerja"
          description="Atur group dan unit untuk membatasi RO yang dianalisis. Perubahan baru diterapkan setelah menekan Terapkan Filter."
          planningId={planningId}
          planningOptions={planningOptions}
          onPlanningChange={onPlanningChange}
          draftScope={draftScope}
          onDraftScopeChange={onDraftScopeChange}
          organizations={organizations}
          organizationGroups={organizationGroups}
          onReset={onResetFilter}
          onCancel={onCancelFilter}
          onApply={onApplyFilter}
        />

        <label className="flex h-8 items-center gap-2 rounded-[12px] border border-zinc-200 bg-white px-3 text-sm text-zinc-700 shadow-[0_1px_1px_rgba(0,0,0,0.04)] transition-colors hover:bg-zinc-50">
          <Switch checked={showNoRisk} onCheckedChange={onShowNoRiskChange} />
          <span className="whitespace-nowrap">Tampilkan RO tanpa risiko</span>
        </label>
      </div>
    </div>
  );
}
