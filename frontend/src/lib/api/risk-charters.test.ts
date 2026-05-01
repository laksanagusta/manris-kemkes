import assert from "node:assert/strict";
import test from "node:test";

const riskCharterQueryLib = await import(
  new URL("./risk-charter-query.ts", import.meta.url).href,
);

test("buildRiskCharterListQuery serializes supported params only", () => {
  const { buildRiskCharterListQuery } = riskCharterQueryLib as {
    buildRiskCharterListQuery: (params?: Record<string, string | number | undefined>) => string;
  };

  assert.equal(
    buildRiskCharterListQuery({
      period: "2026-H1",
      status: "draft",
      page: 2,
      limit: 20,
      q: "direktorat",
      empty: "",
      skip: undefined,
    }),
    "period=2026-H1&status=draft&page=2&limit=20&q=direktorat",
  );
});

test("buildRiskCharterListQuery returns empty string for empty params", () => {
  const { buildRiskCharterListQuery } = riskCharterQueryLib as {
    buildRiskCharterListQuery: (params?: Record<string, string | number | undefined>) => string;
  };

  assert.equal(buildRiskCharterListQuery(), "");
  assert.equal(buildRiskCharterListQuery({ q: "", page: undefined }), "");
});
