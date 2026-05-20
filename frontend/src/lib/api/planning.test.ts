import assert from "node:assert/strict";
import test from "node:test";

const planningApi = await import(new URL("./planning", import.meta.url).href);

test("buildPlanningROOptionsQuery serializes required params", () => {
  const { buildPlanningROOptionsQuery } = planningApi as {
    buildPlanningROOptionsQuery: (params?: Record<string, string | number | undefined>) => string;
  };

  assert.equal(
    buildPlanningROOptionsQuery({
      organization_id: "org-1",
      period: "2027",
      q: "bkk",
    }),
    "organization_id=org-1&period=2027&q=bkk",
  );
});

test("buildPlanningObjectiveCompatibilityQuery handles empty params", () => {
  const { buildPlanningObjectiveCompatibilityQuery } = planningApi as {
    buildPlanningObjectiveCompatibilityQuery: (params?: Record<string, string | number | undefined>) => string;
  };

  assert.equal(buildPlanningObjectiveCompatibilityQuery(), "");
});
