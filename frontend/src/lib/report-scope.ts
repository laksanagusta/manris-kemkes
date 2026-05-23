import type { OrganizationListItem } from "@/lib/api/organizations";

type ReportScopeUser = {
  isGlobal: boolean;
  organizationId: string | null;
  accessibleOrgIds: string[];
};

export function needsExplicitReportOrgSelection(
  user: ReportScopeUser | null | undefined,
) {
  if (!user || user.isGlobal) return false;
  return !user.organizationId;
}

export function resolveDefaultReportOrgId(
  user: ReportScopeUser | null | undefined,
) {
  if (!user || user.isGlobal) return null;
  return user.organizationId;
}

export function buildSelectableReportOrganizations(
  user: ReportScopeUser | null | undefined,
  organizations: OrganizationListItem[],
) {
  if (!user || user.isGlobal) return organizations;
  const allowed = new Set(user.accessibleOrgIds.filter(Boolean));
  return organizations.filter((organization) => allowed.has(organization.id));
}
