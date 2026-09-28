export interface MitigationMonitoringQueryState {
  search: string;
  page: number;
  limit: number;
  status?: MitigationMonitoringStatusFilter;
  period?: string;
}

export type MitigationMonitoringStatusFilter =
  | "all"
  | "pending"
  | "done"
  | "overdue"
  | "skipped"
  | "not_reported";

const MITIGATION_STATUSES: readonly MitigationMonitoringStatusFilter[] = [
  "all",
  "pending",
  "done",
  "overdue",
  "skipped",
  "not_reported",
];

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

export function parseMitigationMonitoringQueryState(
  searchParams: URLSearchParams,
): MitigationMonitoringQueryState {
  const statusValue = searchParams.get("status");

  return {
    search: searchParams.get("q")?.trim() || "",
    page: parsePositiveInt(searchParams.get("page"), 1),
    limit: parsePositiveInt(searchParams.get("limit"), 10),
    status: MITIGATION_STATUSES.includes(
      statusValue as MitigationMonitoringStatusFilter,
    )
      ? (statusValue as MitigationMonitoringStatusFilter)
      : "all",
    period: searchParams.get("period")?.trim() || "",
  };
}

export function buildMitigationMonitoringQueryString(
  state: MitigationMonitoringQueryState,
) {
  const params = new URLSearchParams();
  const search = state.search.trim();

  if (search) {
    params.set("q", search);
  }
  const status = state.status ?? "all";
  if (status !== "all") {
    params.set("status", status);
  }
  const period = state.period?.trim() ?? "";
  if (period) {
    params.set("period", period);
  }
  if (state.page !== 1) {
    params.set("page", String(state.page));
  }
  if (state.limit !== 10) {
    params.set("limit", String(state.limit));
  }

  return params.toString();
}

export function buildMitigationMonitoringApiQueryString(
  state: MitigationMonitoringQueryState,
) {
  const params = new URLSearchParams(buildMitigationMonitoringQueryString(state));
  params.set("page", String(state.page));
  params.set("limit", String(state.limit));
  return params.toString();
}
