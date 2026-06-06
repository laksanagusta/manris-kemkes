export type ReportsFilterScope = {
  organizationId: string;
  organizationGroupId: string;
  organizationIds: string[];
};

type ReportsFilterUser = {
  isGlobal: boolean;
  organizationId: string | null;
};

type ReportsFilterOrganization = {
  id: string;
};

type ReportsFilterOrganizationGroup = {
  id: string;
  members?: {
    id: string;
  }[];
};

export function copyReportsFilterScope(
  scope: ReportsFilterScope,
): ReportsFilterScope {
  return {
    ...scope,
    organizationIds: [...scope.organizationIds],
  };
}

export function resolveDefaultReportsFilterScope(
  user: ReportsFilterUser | null | undefined,
  organizations: ReportsFilterOrganization[],
): ReportsFilterScope {
  const defaultOrganizationId =
    !user?.isGlobal &&
    user?.organizationId &&
    organizations.some((organization) => organization.id === user.organizationId)
      ? user.organizationId
      : "";

  return {
    organizationId: defaultOrganizationId,
    organizationGroupId: "",
    organizationIds: defaultOrganizationId ? [defaultOrganizationId] : [],
  };
}

export function resolveReportsFilterScopeOrgIds(
  scope: ReportsFilterScope,
  organizationGroups: ReportsFilterOrganizationGroup[],
): string[] {
  if (scope.organizationIds.length > 0) {
    return [...scope.organizationIds];
  }

  if (scope.organizationGroupId) {
    const group = organizationGroups.find(
      (item) => item.id === scope.organizationGroupId,
    );
    return group?.members?.map((member) => member.id) ?? [];
  }

  if (scope.organizationId) {
    return [scope.organizationId];
  }

  return [];
}
