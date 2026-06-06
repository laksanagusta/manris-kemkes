export interface MitigationMonitoringQueryState {
  search: string;
  page: number;
  limit: number;
}

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

export function parseMitigationMonitoringQueryState(
  searchParams: URLSearchParams,
): MitigationMonitoringQueryState {
  return {
    search: searchParams.get("q")?.trim() || "",
    page: parsePositiveInt(searchParams.get("page"), 1),
    limit: parsePositiveInt(searchParams.get("limit"), 10),
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
  if (state.page !== 1) {
    params.set("page", String(state.page));
  }
  if (state.limit !== 10) {
    params.set("limit", String(state.limit));
  }

  return params.toString();
}
