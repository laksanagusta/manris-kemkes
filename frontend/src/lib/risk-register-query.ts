export type RiskRegisterStatusFilter =
  | "all"
  | "draft"
  | "final";
export type RiskRegisterLifecycleFilter = "active" | "archived" | "all";
export type RiskRegisterCategoryFilter =
  | "all"
  | "kebijakan"
  | "reputasi"
  | "fraud_korupsi"
  | "legal"
  | "kepatuhan"
  | "operasional";
export type RiskRegisterSortOrder = "asc" | "desc";

export type RiskRegisterQueryState = {
  search: string;
  lifecycleFilter: RiskRegisterLifecycleFilter;
  statusFilter: RiskRegisterStatusFilter;
  categoryFilter: RiskRegisterCategoryFilter;
  assessmentCycleFilter: string;
  createdAtFilter: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: RiskRegisterSortOrder;
};

function getRiskRegisterLifecycleFilter(
  value: string | null,
): RiskRegisterLifecycleFilter {
  if (value === "archived" || value === "all") {
    return value;
  }

  return "active";
}

function getRiskRegisterStatusFilter(
  value: string | null,
): RiskRegisterStatusFilter {
  if (
    value === "draft" ||
    value === "final"
  ) {
    return value;
  }

  return "all";
}

function getRiskRegisterCategoryFilter(
  value: string | null,
): RiskRegisterCategoryFilter {
  if (
    value === "kebijakan" ||
    value === "reputasi" ||
    value === "fraud_korupsi" ||
    value === "legal" ||
    value === "kepatuhan" ||
    value === "operasional"
  ) {
    return value;
  }

  return "all";
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

export function parseRiskRegisterQueryState(
  searchParams: URLSearchParams,
): RiskRegisterQueryState {
  return {
    search: searchParams.get("q") ?? "",
    lifecycleFilter: getRiskRegisterLifecycleFilter(
      searchParams.get("lifecycle"),
    ),
    statusFilter: getRiskRegisterStatusFilter(searchParams.get("status")),
    categoryFilter: getRiskRegisterCategoryFilter(searchParams.get("category")),
    assessmentCycleFilter: searchParams.get("assessment_cycle") ?? "",
    createdAtFilter: searchParams.get("created_at") ?? "",
    page: parsePositiveInt(searchParams.get("page"), 1),
    limit: parsePositiveInt(searchParams.get("limit"), 10),
    sortBy: searchParams.get("sort_by") ?? "created_at",
    sortOrder:
      (searchParams.get("sort_order") as RiskRegisterSortOrder | null) ??
      "desc",
  };
}

export function buildRiskRegisterQueryString(
  state: RiskRegisterQueryState,
): string {
  const nextParams = new URLSearchParams();
  const normalizedSearch = state.search.trim();
  const normalizedAssessmentCycle = state.assessmentCycleFilter.trim();
  const normalizedCreatedAt = state.createdAtFilter.trim();

  if (normalizedSearch) {
    nextParams.set("q", normalizedSearch);
  }

  if (state.lifecycleFilter !== "active") {
    nextParams.set("lifecycle", state.lifecycleFilter);
  }

  if (state.statusFilter !== "all") {
    nextParams.set("status", state.statusFilter);
  }

  if (state.categoryFilter !== "all") {
    nextParams.set("category", state.categoryFilter);
  }

  if (normalizedAssessmentCycle) {
    nextParams.set("assessment_cycle", normalizedAssessmentCycle);
  }

  if (normalizedCreatedAt) {
    nextParams.set("created_at", normalizedCreatedAt);
  }

  if (!(state.sortBy === "created_at" && state.sortOrder === "desc")) {
    nextParams.set("sort_by", state.sortBy);
    nextParams.set("sort_order", state.sortOrder);
  }

  if (state.page !== 1) {
    nextParams.set("page", state.page.toString());
  }

  if (state.limit !== 10) {
    nextParams.set("limit", state.limit.toString());
  }

  return nextParams.toString();
}

export function shouldReplaceRiskRegisterUrl(input: {
  hasPendingUrlStateSync: boolean;
  currentSearchParams: URLSearchParams;
  nextState: RiskRegisterQueryState;
}) {
  if (input.hasPendingUrlStateSync) {
    return false;
  }

  return (
    buildRiskRegisterQueryString(input.nextState) !==
    buildRiskRegisterQueryString(
      parseRiskRegisterQueryState(input.currentSearchParams),
    )
  );
}
