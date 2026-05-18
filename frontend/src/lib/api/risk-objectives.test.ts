import assert from "node:assert/strict";
import test from "node:test";

const riskObjectiveQueryLib = await import(
  new URL("./risk-objective-query", import.meta.url).href
);

test("buildRiskObjectiveListQuery serializes supported params only", () => {
  const { buildRiskObjectiveListQuery } = riskObjectiveQueryLib as {
    buildRiskObjectiveListQuery: (params?: Record<string, string | number | undefined>) => string;
  };

  assert.equal(
    buildRiskObjectiveListQuery({
      period: "2026-H1",
      status: "draft",
      page: 2,
      limit: 20,
      q: "kepatuhan",
      empty: "",
      skip: undefined,
    }),
    "period=2026-H1&status=draft&page=2&limit=20&q=kepatuhan",
  );
});

test("buildRiskObjectiveListQuery returns empty string for empty params", () => {
  const { buildRiskObjectiveListQuery } = riskObjectiveQueryLib as {
    buildRiskObjectiveListQuery: (params?: Record<string, string | number | undefined>) => string;
  };

  assert.equal(buildRiskObjectiveListQuery(), "");
  assert.equal(buildRiskObjectiveListQuery({ q: "", page: undefined }), "");
});
