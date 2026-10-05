import { api } from "@/lib/api";

export interface OrganizationAPIKey {
  id: string;
  organizationId: string;
  prefix: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
}

export interface GeneratedOrganizationAPIKey {
  key: OrganizationAPIKey;
  secret: string;
}

function path(orgId: string, action = "") {
  return `/organization-api-key${action}?${new URLSearchParams({ organizationId: orgId })}`;
}

export function getOrganizationAPIKey(orgId: string, token: string) {
  return api.get<OrganizationAPIKey | null>(path(orgId), token);
}

export function generateOrganizationAPIKey(orgId: string, token: string, expectedKeyId?: string) {
  return api.post<GeneratedOrganizationAPIKey>(
    path(orgId, expectedKeyId ? "/regenerate" : "/generate"),
    expectedKeyId ? { expectedKeyId } : {},
    token,
  );
}
