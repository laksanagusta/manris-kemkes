import type { ReportsFilterScope } from "./reports-filter-sheet";

type ReportFilters = { cycle: string; scope: ReportsFilterScope };
type Result = { filters: ReportFilters; error: string | null; hasFilters: boolean };
const filterKeys = ["cycle", "org_id", "organizationId", "organizationIds"];

/** A source link may override saved filters only after current access is known. */
export function resolveReportUrlFilters(search: string, currentCycle: string, organizations: { id: string }[], defaults: ReportFilters): Result {
  const params = new URLSearchParams(search);
  const hasFilters = filterKeys.some((key) => params.has(key));
  const invalid = (error: string): Result => ({ filters: defaults, error, hasFilters });
  if (!hasFilters) return { filters: defaults, error: null, hasFilters };
  const validCycle = (value: string) => /^20\d{2}-Q[1-4]$/.test(value) && value <= currentCycle;
  const requestedCycle = params.get("cycle");
  if (requestedCycle !== null && !validCycle(requestedCycle)) return invalid("Periode pada tautan tidak valid atau belum tersedia. Pilih periode laporan yang tersedia.");
  let scope = defaults.scope;
  const organizationKeys = ["org_id", "organizationId", "organizationIds"].filter((key) => params.has(key));
  if (organizationKeys.length) {
    const raw = organizationKeys.flatMap((key) => params.getAll(key));
    const organizationIds = [...new Set(raw.flatMap((value) => value === "" ? [] : value.split(",").map((id) => id.trim())))];
    const allowed = new Set(organizations.map((organization) => organization.id));
    if (organizationIds.some((id) => !id || !allowed.has(id))) return invalid("Unit pada tautan tidak tersedia atau aksesnya telah berubah. Pilih kembali unit yang dapat Anda akses.");
    scope = { organizationGroupId: "", organizationId: organizationIds.length === 1 ? organizationIds[0] : "", organizationIds };
  }
  return {
    filters: { cycle: requestedCycle ?? defaults.cycle, scope },
    error: null,
    hasFilters,
  };
}
