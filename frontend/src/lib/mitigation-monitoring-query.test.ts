import assert from "node:assert/strict";
import test from "node:test";

const mitigationMonitoringQueryLib = await import(
  new URL("./mitigation-monitoring-query.ts", import.meta.url).href,
);

const {
  buildMitigationMonitoringQueryString,
  parseMitigationMonitoringQueryState,
} = mitigationMonitoringQueryLib as typeof import("./mitigation-monitoring-query");

test("parseMitigationMonitoringQueryState falls back to defaults", () => {
  const state = parseMitigationMonitoringQueryState(new URLSearchParams());

  assert.equal(state.search, "");
  assert.equal(state.page, 1);
  assert.equal(state.limit, 10);
});

test("buildMitigationMonitoringQueryString trims search and omits defaults", () => {
  const query = buildMitigationMonitoringQueryString({
    search: "  banjir  ",
    page: 1,
    limit: 10,
  });

  assert.equal(query, "q=banjir");
});

test("buildMitigationMonitoringQueryString keeps page and limit when changed", () => {
  const query = buildMitigationMonitoringQueryString({
    search: "",
    page: 3,
    limit: 25,
  });

  assert.equal(query, "page=3&limit=25");
});
