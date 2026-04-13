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

export interface ListOrganizationsParams {
  q?: string;
  page?: number;
  limit?: number;
}

type OrganizationPageRequest = {
  page: number;
  limit: number;
};

const ORGANIZATION_PAGE_LIMIT = 100;

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

export async function collectAllOrganizations(
  fetchPage: (params: OrganizationPageRequest) => Promise<PaginatedOrganizationsResponse>,
): Promise<OrganizationListItem[]> {
  const organizations: OrganizationListItem[] = [];
  let page = 1;

  while (true) {
    const response = await fetchPage({ page, limit: ORGANIZATION_PAGE_LIMIT });
    const items = Array.isArray(response.data) ? response.data : [];

    organizations.push(...items);

    const total = typeof response.total === "number" && Number.isFinite(response.total)
      ? response.total
      : organizations.length;

    if (items.length === 0 || organizations.length >= total) {
      return organizations.slice(0, total);
    }

    page += 1;
  }
}

export async function listAllOrganizations(
  token: string,
  params?: Pick<ListOrganizationsParams, "q">,
): Promise<OrganizationListItem[]> {
  return collectAllOrganizations(({ page, limit }) =>
    listOrganizations(token, {
      ...params,
      page,
      limit,
    }),
  );
}
