"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { listAllOrganizations, type OrganizationListItem } from "@/lib/api/organizations";
import { hasOrganizationChildren } from "@/lib/organization-filter";
import type { TableFilterField } from "@/components/shared/design-system/collections/dynamic-table-filter-state";

let directoryRequest: { token: string; promise: Promise<OrganizationListItem[]> } | undefined;
function directory(token: string) {
  if (directoryRequest?.token === token) return directoryRequest.promise;
  const promise = listAllOrganizations(token).catch((error) => {
    if (directoryRequest?.promise === promise) directoryRequest = undefined;
    throw error;
  });
  directoryRequest = { token, promise };
  return promise;
}

export function useOrganizationFilterAccess() {
  const { user, token } = useAuth();
  const [loaded, setLoaded] = useState<{ token: string; organizations: OrganizationListItem[] } | null>(null);
  const needsDirectory = !!user?.organizationId && (user.isGlobal || hasOrganizationChildren(user));
  useEffect(() => {
    if (!token || !needsDirectory) return;
    let active = true;
    directory(token).then((organizations) => {
      if (active) setLoaded({ token, organizations });
    }, () => { if (active) setLoaded(null); });
    return () => { active = false; };
  }, [token, needsDirectory]);
  const organizations = loaded?.token === token ? loaded.organizations : [];
  const hasChildren = hasOrganizationChildren(user, organizations);
  const allowed = new Set(user?.accessibleOrgIds ?? []);
  return {
    hasChildren,
    scopeKey: `${token}:${user?.organizationId}`,
    ready: !!user && (!user.isGlobal || !user.organizationId || loaded?.token === token),
    ownOrganizationId: user?.organizationId,
    organizations: user?.isGlobal ? organizations : organizations.filter((organization) => allowed.has(organization.id)),
  };
}

export function useOrganizationFilter(onChange?: () => void) {
  const { hasChildren, organizations, scopeKey } = useOrganizationFilterAccess();
  const [selected, setSelected] = useState({ scopeKey, value: "all" });
  const organizationId = hasChildren && selected.scopeKey === scopeKey ? selected.value : "all";
  const field: TableFilterField = {
    id: "organization", label: "Organisasi", organizationScope: true,
    value: organizationId,
    onChange(value) { setSelected({ scopeKey, value }); onChange?.(); },
    options: [{ value: "all", label: "Semua organisasi" }, ...organizations.map(({ id, name }) => ({ value: id, label: name }))],
  };
  return { field, organizationId, hasChildren };
}
