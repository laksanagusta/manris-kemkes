"use client";

import type { Dispatch, SetStateAction } from "react";
import { DynamicTableFilters, type TableFilterField } from "@/components/shared/design-system/collections/dynamic-table-filters";
import type { OrganizationListItem } from "@/lib/api/organizations";
import type { OrganizationGroupListItem } from "@/lib/api/organization-groups";
import type { ReportsFilterScope } from "@/lib/reports-filter-sheet";
import { reportQuarterOptions } from "@/lib/quarterly-report";

interface ReportFilterPanelProps {
  profile?: {
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
    period: string;
    periods: { value: string; label: string }[];
    onPeriodChange: (value: string) => void;
  };
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
  disabled: boolean;
}

export function ReportFilterPanel({
  cycle, onCycleChange, comparison, profile,
  scope, defaultScope, requireUnit = false, onScopeChange, organizations, groups, scopeSummary,
  disabled,
}: ReportFilterPanelProps) {
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
  const fields: TableFilterField[] = profile ? [
    { id: "profile", label: "Profil", value: profile.value, required: true, options: profile.options, onChange: profile.onChange },
    { id: "period", label: "Periode", value: profile.period, required: true, options: profile.periods, onChange: profile.onPeriodChange },
  ] : [
    { id: "period", label: "Periode", value: cycle, required: true, options: periodOptions, onChange: onCycleChange },
  ];
  if (comparison) {
    fields.push({
      id: "comparison", label: "Bandingkan dengan", value: comparison.cycle, required: true,
      options: profile?.periods ?? periodOptions, onChange: comparison.onChange,
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
    id: "organization", organizationScope: true, label: "Unit", type: "multi-select",
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
      <DynamicTableFilters fields={fields} disabled={disabled} />
      <p className="sr-only" aria-live="polite">{scopeSummary}</p>
    </div>
  );
}
