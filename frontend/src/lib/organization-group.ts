import type { Organization } from "@/lib/organization";

export interface OrganizationGroup {
  id: string;
  ownerOrganizationId: string;
  ownerOrganizationName: string;
  name: string;
  description: string;
  memberCount: number;
  members?: OrganizationGroupMember[];
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationGroupMember {
  id: string;
  name: string;
  parentId?: string;
  location?: string;
}

export function buildDescendantOrganizations(
  organizations: Organization[],
  ownerOrganizationId: string,
) {
  const childrenMap = new Map<string, Organization[]>();
  const byId = new Map(organizations.map((org) => [org.id, org] as const));

  for (const organization of organizations) {
    if (!organization.parentId) continue;
    const list = childrenMap.get(organization.parentId) ?? [];
    list.push(organization);
    childrenMap.set(organization.parentId, list);
  }

  const result: Organization[] = [];
  const queue = [...(childrenMap.get(ownerOrganizationId) ?? [])];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    result.push(current);
    const children = childrenMap.get(current.id);
    if (children?.length) {
      queue.push(...children);
    }
  }

  return result.filter((org) => byId.has(org.id));
}

export interface OrganizationDescendantOption extends Organization {
  depth: number;
}

export function buildDescendantOrganizationOptions(
  organizations: Organization[],
  ownerOrganizationId: string,
): OrganizationDescendantOption[] {
  const childrenMap = new Map<string, Organization[]>();

  for (const organization of organizations) {
    if (!organization.parentId) continue;
    const list = childrenMap.get(organization.parentId) ?? [];
    list.push(organization);
    childrenMap.set(organization.parentId, list);
  }

  const result: OrganizationDescendantOption[] = [];
  const walk = (parentId: string, depth: number) => {
    for (const child of childrenMap.get(parentId) ?? []) {
      result.push({ ...child, depth });
      walk(child.id, depth + 1);
    }
  };

  walk(ownerOrganizationId, 0);
  return result;
}

export function groupMembersToIds(members: OrganizationGroupMember[] | undefined) {
  return (members ?? []).map((member) => member.id);
}
