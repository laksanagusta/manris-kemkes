import type { TableFilterField } from "@/components/shared/design-system/collections/dynamic-table-filter-state";

export type OrganizationFilterUser = {
  organizationId: string | null;
  accessibleOrgIds: string[];
  isGlobal: boolean;
};

export function hasOrganizationChildren(
  user: OrganizationFilterUser | null,
  organizations: readonly { id: string; parentId?: string }[] = [],
) {
  if (!user?.organizationId) return false;
  if (!user.isGlobal && user.accessibleOrgIds.some((id) => id && id !== user.organizationId)) return true;
  return organizations.some((organization) => organization.parentId === user.organizationId);
}

export function visibleOrganizationFilterFields(fields: readonly TableFilterField[], hasChildren: boolean) {
  return fields.filter((field) => !field.organizationScope || hasChildren);
}
