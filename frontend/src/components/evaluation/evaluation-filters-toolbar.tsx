"use client";

import {
  AccentButton,
  ActionButton,
  CollectionFilterTrigger,
  CollectionSearchField,
} from "@/components/shared/design-system";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReportScopePicker } from "@/components/report/report-scope-picker";
import type { OrganizationGroupListItem } from "@/lib/api/organization-groups";
import type { OrganizationListItem } from "@/lib/api/organizations";
import type { EvaluationPeriodOption } from "@/lib/evaluation-period-options";
import type { EvaluationStatus } from "@/types/evaluation";

type EvaluationFiltersToolbarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  queryPlaceholder: string;
  queryAriaLabel: string;
  filterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
  organizationId: string;
  onOrganizationIdChange: (value: string) => void;
  organizationGroupId: string;
  onOrganizationGroupIdChange: (value: string) => void;
  organizations: OrganizationListItem[];
  organizationGroups: OrganizationGroupListItem[];
  periodOptions: EvaluationPeriodOption[];
  periodFilter: string;
  onPeriodFilterChange: (value: string) => void;
  status: EvaluationStatus | "all";
  onStatusChange: (value: EvaluationStatus | "all") => void;
  onReset: () => void;
};

type EvaluationFiltersSidebarProps = Pick<
  EvaluationFiltersToolbarProps,
  | "organizationId"
  | "onOrganizationIdChange"
  | "organizationGroupId"
  | "onOrganizationGroupIdChange"
  | "organizations"
  | "organizationGroups"
  | "periodOptions"
  | "periodFilter"
  | "onPeriodFilterChange"
  | "status"
  | "onStatusChange"
  | "onReset"
> & { open: boolean; onOpenChange: (open: boolean) => void };

function EvaluationFiltersSidebar({
  open,
  onOpenChange,
  organizationId,
  onOrganizationIdChange,
  organizationGroupId,
  onOrganizationGroupIdChange,
  organizations,
  organizationGroups,
  periodOptions,
  periodFilter,
  onPeriodFilterChange,
  status,
  onStatusChange,
  onReset,
}: EvaluationFiltersSidebarProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <CollectionFilterTrigger />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[22rem]">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium">Filter Evaluasi</h4>
            <p className="mt-1 text-xs text-secondary-foreground">
              Atur organisasi, periode, dan status.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Organisasi
              </Label>
              <ReportScopePicker
                organizationId={organizationId}
                onOrganizationChange={onOrganizationIdChange}
                organizations={organizations}
                organizationGroupId={organizationGroupId}
                onOrganizationGroupChange={onOrganizationGroupIdChange}
                organizationGroups={organizationGroups}
                organizationPlaceholder="Semua organisasi"
                organizationGroupPlaceholder="Semua group"
                allowAllOrganizations
                allOrganizationLabel="Semua organisasi"
                allOrganizationValue="all"
                allowAllOrganizationGroups
                allOrganizationGroupLabel="Semua group"
                allOrganizationGroupValue="all"
                orientation="vertical"
                density="compact"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground">
                Periode
              </Label>
              <Select value={periodFilter} onValueChange={onPeriodFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Periode" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground">
                Status
              </Label>
              <Select
                value={status}
                onValueChange={(value) =>
                  onStatusChange(value as EvaluationStatus | "all")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <ActionButton type="button" variant="ghost" onClick={onReset}>
              Reset
            </ActionButton>
            <AccentButton type="button" onClick={() => onOpenChange(false)}>
              Terapkan
            </AccentButton>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function EvaluationFiltersToolbar({
  query,
  onQueryChange,
  queryPlaceholder,
  queryAriaLabel,
  filterOpen,
  onFilterOpenChange,
  organizationId,
  onOrganizationIdChange,
  organizationGroupId,
  onOrganizationGroupIdChange,
  organizations,
  organizationGroups,
  periodOptions,
  periodFilter,
  onPeriodFilterChange,
  status,
  onStatusChange,
  onReset,
}: EvaluationFiltersToolbarProps) {
  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
      <CollectionSearchField
        placeholder={queryPlaceholder}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        aria-label={queryAriaLabel}
      />

      <EvaluationFiltersSidebar
        open={filterOpen}
        onOpenChange={onFilterOpenChange}
        organizationId={organizationId}
        onOrganizationIdChange={onOrganizationIdChange}
        organizationGroupId={organizationGroupId}
        onOrganizationGroupIdChange={onOrganizationGroupIdChange}
        organizations={organizations}
        organizationGroups={organizationGroups}
        periodOptions={periodOptions}
        periodFilter={periodFilter}
        onPeriodFilterChange={onPeriodFilterChange}
        status={status}
        onStatusChange={onStatusChange}
        onReset={onReset}
      />
    </div>
  );
}
