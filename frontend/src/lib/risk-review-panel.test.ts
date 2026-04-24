import assert from "node:assert/strict";
import test from "node:test";

const panelLib = await import(new URL("./risk-review-panel.ts", import.meta.url).href);

const { getVisibleRiskReviewItems } = panelLib as typeof import("./risk-review-panel");

test("getVisibleRiskReviewItems keeps approved rows visible in monitoring", () => {
  const items = [
    { reviewStatus: "approved", id: "approved-1" },
    { reviewStatus: "due", id: "due-1" },
  ] as Array<{ reviewStatus: string; id: string }>;

  assert.deepEqual(getVisibleRiskReviewItems(items), items);
});
