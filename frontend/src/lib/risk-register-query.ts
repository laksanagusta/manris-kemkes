export type RiskRegisterTab = "all-risks" | "my-drafts" | "history";
export type RiskRegisterStatusFilter =
  | "all"
  | "assessment_in_review"
  | "approved";
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
  activeTab: RiskRegisterTab;
  search: string;
  statusFilter: RiskRegisterStatusFilter;
  categoryFilter: RiskRegisterCategoryFilter;
  assessmentCycleFilter: string;
  createdAtFilter: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: RiskRegisterSortOrder;
};

function getRiskRegisterTab(value: string | null): RiskRegisterTab {
  if (value === "my-drafts" || value === "history") {
    return value;
  }

  return "all-risks";
}

function getRiskRegisterStatusFilter(
  value: string | null,
): RiskRegisterStatusFilter {
  if (value === "assessment_in_review" || value === "approved") {
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
    activeTab: getRiskRegisterTab(searchParams.get("tab")),
    search: searchParams.get("q") ?? "",
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

  if (state.activeTab !== "all-risks") {
    nextParams.set("tab", state.activeTab);
  }

  if (normalizedSearch) {
    nextParams.set("q", normalizedSearch);
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
