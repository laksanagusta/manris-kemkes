import { api } from "@/lib/api";

export interface UserListItem {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  status: string;
  nip?: string | null;
  jabatan?: string | null;
  pangkat?: string | null;
  orgName?: string | null;
}

export interface PaginatedUsersResponse {
  data: UserListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ListUsersParams {
  q?: string;
  status?: string;
  role?: string;
  page?: number;
  limit?: number;
  organizationId?: string;
}

export async function listUsers(
  token: string,
  params?: ListUsersParams,
): Promise<PaginatedUsersResponse> {
  const searchParams = new URLSearchParams();

  if (params?.q) searchParams.set("q", params.q);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.role) searchParams.set("role", params.role);
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.organizationId) searchParams.set("organizationId", params.organizationId);

  const qs = searchParams.toString();

  return api.get<PaginatedUsersResponse>(
    `/users${qs ? `?${qs}` : ""}`,
    token,
  );
}
