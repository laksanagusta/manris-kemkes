import { api } from "@/lib/api";

export interface OrganizationGroupMember {
  id: string;
  name: string;
  parentId?: string;
  location?: string;
}

export interface OrganizationGroupListItem {
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

export interface OrganizationGroupListResponse {
  data: OrganizationGroupListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ListOrganizationGroupsParams {
  ownerOrganizationId?: string;
  groupId?: string;
  q?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
  includeMembers?: boolean;
}

export interface OrganizationGroupPayload {
  ownerOrganizationId: string;
  name: string;
  description?: string;
  memberOrganizationIds: string[];
}

export interface OrganizationGroupQueryOption {
  id: string;
  name: string;
  ownerOrganizationName: string;
  memberCount: number;
}

function buildOrganizationGroupsQuery(params?: ListOrganizationGroupsParams) {
  const searchParams = new URLSearchParams();

  if (params?.ownerOrganizationId) {
    searchParams.set("owner_organization_id", params.ownerOrganizationId);
  }
  if (params?.q) {
    searchParams.set("q", params.q);
  }
  if (params?.groupId) searchParams.set("group_id", params.groupId);
  if (params?.sortBy) searchParams.set("sort_by", params.sortBy);
  if (params?.sortOrder) searchParams.set("sort_order", params.sortOrder);
  if (params?.page) {
    searchParams.set("page", params.page.toString());
  }
  if (params?.limit) {
    searchParams.set("limit", params.limit.toString());
  }
  if (params?.includeMembers) {
    searchParams.set("include_members", "true");
  }

  return searchParams.toString();
}

export async function listOrganizationGroups(
  token: string,
  params?: ListOrganizationGroupsParams,
): Promise<OrganizationGroupListResponse> {
  const qs = buildOrganizationGroupsQuery(params);
  return api.get<OrganizationGroupListResponse>(
    `/organization-groups${qs ? `?${qs}` : ""}`,
    token,
  );
}

export type OrganizationGroupFilterOption = Pick<
  OrganizationGroupListItem,
  "id" | "name" | "ownerOrganizationId" | "ownerOrganizationName"
>;

export function listOrganizationGroupOptions(token: string, ownerOrganizationId?: string) {
  const params = new URLSearchParams({ options_only: "true" });
  if (ownerOrganizationId) params.set("owner_organization_id", ownerOrganizationId);
  return api.get<OrganizationGroupFilterOption[]>(`/organization-groups?${params}`, token);
}

export async function createOrganizationGroup(
  token: string,
  payload: OrganizationGroupPayload,
): Promise<OrganizationGroupListItem> {
  return api.post<OrganizationGroupListItem>("/organization-groups", payload, token);
}

export async function updateOrganizationGroup(
  token: string,
  id: string,
  payload: OrganizationGroupPayload,
): Promise<OrganizationGroupListItem> {
  return api.put<OrganizationGroupListItem>(`/organization-groups/${id}`, payload, token);
}

export async function deleteOrganizationGroup(token: string, id: string): Promise<void> {
  await api.delete(`/organization-groups/${id}`, undefined, token);
}
