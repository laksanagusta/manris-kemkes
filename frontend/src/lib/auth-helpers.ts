import { User } from "@/contexts/auth-context";

export function canWriteInOrg(user: User | null, targetOrgId: string): boolean {
  if (!user) return false;
  if (user.isGlobal) return true;
  return user.organizationId === targetOrgId;
}

export function canReadOrg(user: User | null, targetOrgId: string): boolean {
  if (!user) return false;
  if (user.isGlobal) return true;
  return user.accessibleOrgIds.includes(targetOrgId);
}

export function isReadOnlyForOrg(user: User | null, targetOrgId: string): boolean {
  if (!user) return false;
  if (user.isGlobal) return false;
  return canReadOrg(user, targetOrgId) && !canWriteInOrg(user, targetOrgId);
}
