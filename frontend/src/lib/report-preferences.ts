import type { ReportsFilterScope } from "./reports-filter-sheet";

type SavedReportPreferences = { cycle: string; comparisonOverride: string; scope: ReportsFilterScope };
type Organization = { id: string };
type Group = { id: string; members?: Organization[] };

/** Restore only periods and organization selections the account can still access. */
export function parseReportPreferences(raw: string | null, currentCycle: string, organizations: Organization[], groups: Group[]): SavedReportPreferences | null {
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw);
    const validCycle = (value: unknown): value is string => typeof value === "string" && /^20\d{2}-Q[1-4]$/.test(value) && value <= currentCycle;
    if (!validCycle(saved.cycle) || (saved.comparisonOverride !== "" && !validCycle(saved.comparisonOverride))) return null;
    if (!saved.scope || typeof saved.scope.organizationGroupId !== "string" || !Array.isArray(saved.scope.organizationIds)) return null;
    const group = groups.find((item) => item.id === saved.scope.organizationGroupId);
    if (saved.scope.organizationGroupId && !group) return null;
    const allowed = new Set(organizations.filter((item) => !group || group.members?.some((member) => member.id === item.id)).map((item) => item.id));
    const organizationIds = [...new Set<string>(saved.scope.organizationIds.filter((id: unknown) => typeof id === "string" && allowed.has(id)))];
    if (saved.scope.organizationIds.length && !organizationIds.length) return null;
    return { cycle: saved.cycle, comparisonOverride: saved.comparisonOverride, scope: { organizationGroupId: saved.scope.organizationGroupId, organizationId: organizationIds.length === 1 ? organizationIds[0] : "", organizationIds } };
  } catch { return null; }
}
