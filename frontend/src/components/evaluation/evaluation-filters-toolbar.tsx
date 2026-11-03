"use client";

import {
  CollectionSearchField,
  DynamicTableFilters,
} from "@/components/shared/design-system";
import type { OrganizationGroupListItem } from "@/lib/api/organization-groups";
import type { OrganizationListItem } from "@/lib/api/organizations";
import type { EvaluationPeriodOption } from "@/lib/evaluation-period-options";
import type { EvaluationStatus } from "@/types/evaluation";

type EvaluationFiltersToolbarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  queryPlaceholder: string;
  queryAriaLabel: string;
  organizationId: string;
  onOrganizationIdChange: (value: string) => void;
  organizationGroupId: string;
  onOrganizationGroupIdChange: (value: string) => void;
  organizations: OrganizationListItem[];
  organizationGroups: OrganizationGroupListItem[];
  organizationRequired?: boolean;
  periodOptions: EvaluationPeriodOption[];
  periodFilter: string;
  onPeriodFilterChange: (value: string) => void;
  status: EvaluationStatus | "all";
  onStatusChange: (value: EvaluationStatus | "all") => void;
};

export function EvaluationFiltersToolbar({
  query,
  onQueryChange,
  queryPlaceholder,
  queryAriaLabel,
  organizationId,
  onOrganizationIdChange,
  organizationGroupId,
  onOrganizationGroupIdChange,
  organizations,
  organizationGroups,
  organizationRequired = false,
  periodOptions,
  periodFilter,
  onPeriodFilterChange,
  status,
  onStatusChange,
}: EvaluationFiltersToolbarProps) {
  return (
    <DynamicTableFilters
      search={
        <CollectionSearchField
          containerClassName="w-full sm:w-80 sm:flex-none"
          placeholder={queryPlaceholder}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          aria-label={queryAriaLabel}
        />
      }
      fields={[
        {
          id: "organization",
          label: "Organisasi",
          value: organizationId,
          onChange: onOrganizationIdChange,
          required: organizationRequired,
          options: [
            { value: "all", label: organizationRequired ? "Pilih organisasi" : "Semua organisasi" },
            ...organizations.map((organization) => ({
              value: organization.id,
              label: organization.name,
            })),
          ],
        },
        ...(organizationGroups.length > 0 ? [{
          id: "organization-group",
          label: "Grup",
          value: organizationGroupId,
          onChange: onOrganizationGroupIdChange,
          options: [
            { value: "all", label: "Semua grup" },
            ...organizationGroups.map((group) => ({
              value: group.id,
              label: group.name,
            })),
          ],
        }] : []),
        {
          id: "period",
          label: "Periode",
          value: periodFilter,
          onChange: onPeriodFilterChange,
          options: periodOptions,
        },
        {
          id: "status",
          label: "Status",
          value: status,
          onChange: (value) => onStatusChange(value as EvaluationStatus | "all"),
          options: [
            { value: "all", label: "Semua status" },
            { value: "draft", label: "Draft" },
            { value: "final", label: "Final" },
          ],
        },
      ]}
    />
  );
}
