"use client";

import { useEffect, useMemo, useState } from "react";
import type { OrganizationListItem } from "@/lib/api/organizations";
import type { OrganizationGroupListItem } from "@/lib/api/organization-groups";
import { OrganizationPicker } from "@/components/report/organization-picker";
import { OrganizationGroupPicker } from "@/components/report/organization-group-picker";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ReportScopePickerProps {
  organizationId: string;
  onOrganizationChange: (value: string) => void;
  onSelectedOrganizationIdsChange?: (value: string[]) => void;
  selectedOrganizationIds?: string[];
  organizations: OrganizationListItem[];
  organizationGroupId: string;
  onOrganizationGroupChange: (value: string) => void;
  organizationGroups: OrganizationGroupListItem[];
  organizationPlaceholder?: string;
  organizationGroupPlaceholder?: string;
  allowAllOrganizations?: boolean;
  allOrganizationLabel?: string;
  allOrganizationValue?: string;
  allowAllOrganizationGroups?: boolean;
  allOrganizationGroupLabel?: string;
  allOrganizationGroupValue?: string;
  className?: string;
  disabled?: boolean;
  orientation?: "inline" | "vertical";
}

export function ReportScopePicker({
  organizationId,
  onOrganizationChange,
  onSelectedOrganizationIdsChange,
  selectedOrganizationIds,
  organizations,
  organizationGroupId,
  onOrganizationGroupChange,
  organizationGroups,
  organizationPlaceholder,
  organizationGroupPlaceholder,
  allOrganizationLabel,
  allOrganizationValue,
  allowAllOrganizationGroups,
  allOrganizationGroupLabel,
  allOrganizationGroupValue,
  className,
  disabled,
  orientation = "inline",
}: ReportScopePickerProps) {
  const selectedGroup = organizationGroups.find(
    (group) => group.id === organizationGroupId,
  );
  const hasRealGroup =
    Boolean(selectedGroup) && selectedGroup?.id !== allOrganizationGroupValue;
  const selectedGroupMembers = useMemo(
    () => (hasRealGroup ? selectedGroup?.members ?? [] : []),
    [hasRealGroup, selectedGroup],
  );
  const selectedGroupMemberIds = useMemo(
    () => selectedGroupMembers.map((member) => member.id),
    [selectedGroupMembers],
  );
  const selectedGroupMemberOrganizations = useMemo(
    () =>
      hasRealGroup
        ? organizations.filter((organization) =>
            selectedGroupMemberIds.includes(organization.id),
          )
        : organizations,
    [hasRealGroup, organizations, selectedGroupMemberIds],
  );
  const [selectedUnitSelection, setSelectedUnitSelection] = useState<{
    groupId: string;
    unitIds: string[];
  }>({
    groupId: "",
    unitIds: [],
  });
  const fallbackSelectedUnitIds = useMemo(
    () =>
      selectedUnitSelection.groupId === organizationGroupId
        ? selectedUnitSelection.unitIds
        : hasRealGroup
          ? selectedGroupMemberIds
          : organizationId && organizationId !== allOrganizationValue
            ? [organizationId]
            : [],
    [
      allOrganizationValue,
      hasRealGroup,
      organizationGroupId,
      organizationId,
      selectedGroupMemberIds,
      selectedUnitSelection,
    ],
  );
  const selectedUnitIds =
    selectedOrganizationIds === undefined
      ? fallbackSelectedUnitIds
      : selectedOrganizationIds;

  useEffect(() => {
    if (selectedOrganizationIds !== undefined) {
      return;
    }

    onSelectedOrganizationIdsChange?.(selectedUnitIds);
  }, [
    onSelectedOrganizationIdsChange,
    selectedOrganizationIds,
    selectedUnitIds,
  ]);

  return (
    <div className={className}>
      <div
        className={cn(
          "grid gap-3",
          orientation === "vertical"
            ? "grid-cols-1"
            : "md:grid-cols-[0.95fr_1.15fr] md:items-start",
        )}
      >
        <div className="min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">Group</p>
            {hasRealGroup ? (
              <Badge variant="outline" className="gap-1">
                {selectedGroupMembers.length}
              </Badge>
            ) : null}
          </div>
          <OrganizationGroupPicker
            value={organizationGroupId}
            groups={organizationGroups}
            onChange={(groupId) => {
              const nextGroup = organizationGroups.find(
                (group) => group.id === groupId,
              );
              setSelectedUnitSelection({
                groupId,
                unitIds: nextGroup?.members?.map((member) => member.id) ?? [],
              });
              onOrganizationGroupChange(groupId);
              onOrganizationChange(allOrganizationValue ?? "");
              if (selectedOrganizationIds !== undefined) {
                onSelectedOrganizationIdsChange?.(
                  nextGroup?.members?.map((member) => member.id) ?? [],
                );
              }
            }}
            placeholder={organizationGroupPlaceholder ?? "Pilih grup"}
            searchPlaceholder="Cari grup..."
            emptyMessage="Tidak ada grup yang dapat dipilih."
            allowAllOption={allowAllOrganizationGroups}
            allOptionLabel={allOrganizationGroupLabel}
            allOptionValue={allOrganizationGroupValue}
            disabled={disabled}
            className="w-full"
          />
        </div>

        <div className="min-w-0 space-y-2">
          <p className="text-sm font-medium text-foreground">Unit</p>
          <OrganizationPicker
            value={selectedUnitIds[0] ?? ""}
            organizations={selectedGroupMemberOrganizations}
            onChange={() => {
              // Unit selection is always controlled by the multi-select state.
            }}
            selectedValues={selectedUnitIds}
            onSelectedValuesChange={(unitIds) => {
              setSelectedUnitSelection({
                groupId: organizationGroupId,
                unitIds,
              });
              if (selectedOrganizationIds !== undefined) {
                onSelectedOrganizationIdsChange?.(unitIds);
              }
              if (!hasRealGroup) {
                onOrganizationChange(unitIds.length === 1 ? unitIds[0] : "");
                onOrganizationGroupChange(allOrganizationGroupValue ?? "");
              }
            }}
            multiSelect
            placeholder={organizationPlaceholder ?? "Pilih unit"}
            searchPlaceholder="Cari unit..."
            emptyMessage="Tidak ada unit yang dapat dipilih."
            allowAllOption={false}
            allOptionLabel={allOrganizationLabel}
            allOptionValue={allOrganizationValue}
            disabled={disabled}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
