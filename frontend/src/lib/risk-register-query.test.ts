import assert from "node:assert/strict";
import test from "node:test";

const riskRegisterQueryLib = await import(
  new URL("./risk-register-query.ts", import.meta.url).href,
);

const {
  buildRiskRegisterQueryString,
  parseRiskRegisterQueryState,
  shouldReplaceRiskRegisterUrl,
} = riskRegisterQueryLib as typeof import("./risk-register-query");

test("parseRiskRegisterQueryState falls back to register defaults", () => {
  const result = parseRiskRegisterQueryState(new URLSearchParams());

  assert.deepEqual(result, {
    activeTab: "all-risks",
    search: "",
    lifecycleFilter: "active",
    statusFilter: "all",
    categoryFilter: "all",
    assessmentCycleFilter: "",
    createdAtFilter: "",
    page: 1,
    limit: 10,
    sortBy: "created_at",
    sortOrder: "desc",
  });
});

test("parseRiskRegisterQueryState accepts monitoring transactions tab", () => {
  const result = parseRiskRegisterQueryState(
    new URLSearchParams("tab=monitoring-transactions"),
  );

  assert.equal(result.activeTab, "monitoring-transactions");
});

test("buildRiskRegisterQueryString keeps deep-linkable non-default filters only", () => {
  const result = buildRiskRegisterQueryString({
    activeTab: "my-drafts",
    search: "  risiko strategis  ",
    lifecycleFilter: "archived",
    statusFilter: "approved",
    categoryFilter: "operasional",
    assessmentCycleFilter: "2026-H1",
    createdAtFilter: "2026-02-01",
    page: 2,
    limit: 25,
    sortBy: "title",
    sortOrder: "asc",
  });

  assert.equal(
    result,
    "tab=my-drafts&q=risiko+strategis&lifecycle=archived&status=approved&category=operasional&assessment_cycle=2026-H1&created_at=2026-02-01&sort_by=title&sort_order=asc&page=2&limit=25",
  );
});

test("buildRiskRegisterQueryString persists monitoring transactions tab", () => {
  const result = buildRiskRegisterQueryString({
    activeTab: "monitoring-transactions",
    search: "",
    lifecycleFilter: "active",
    statusFilter: "all",
    categoryFilter: "all",
    assessmentCycleFilter: "2026-H1",
    createdAtFilter: "",
    page: 1,
    limit: 10,
    sortBy: "created_at",
    sortOrder: "desc",
  });

  assert.equal(result, "tab=monitoring-transactions&assessment_cycle=2026-H1");
});

test("parseRiskRegisterQueryState normalizes archived lifecycle filter", () => {
  const result = parseRiskRegisterQueryState(
    new URLSearchParams("lifecycle=archived"),
  );

  assert.equal(result.lifecycleFilter, "archived");
});

test("shouldReplaceRiskRegisterUrl skips writes while state is catching up to external navigation", () => {
  const shouldReplace = shouldReplaceRiskRegisterUrl({
    hasPendingUrlStateSync: true,
    currentSearchParams: new URLSearchParams(),
    nextState: {
      activeTab: "all-risks",
      search: "",
      lifecycleFilter: "active",
      statusFilter: "all",
      categoryFilter: "all",
      assessmentCycleFilter: "",
      createdAtFilter: "",
      page: 2,
      limit: 10,
      sortBy: "created_at",
      sortOrder: "desc",
    },
  });

  assert.equal(shouldReplace, false);
});
