import { api } from "@/lib/api";

export interface OrganizationListItem {
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
}

export interface PaginatedOrganizationsResponse {
  data: OrganizationListItem[];
  total: number;
  page: number;
  limit: number;
}

interface ListOrganizationsParams {
  q?: string;
  page?: number;
  limit?: number;
}

export async function listOrganizations(
  token: string,
  params?: ListOrganizationsParams,
): Promise<PaginatedOrganizationsResponse> {
  const searchParams = new URLSearchParams();

  if (params?.q) searchParams.set("q", params.q);
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());

  const qs = searchParams.toString();

  return api.get<PaginatedOrganizationsResponse>(
    `/organizations${qs ? `?${qs}` : ""}`,
    token,
  );
}
