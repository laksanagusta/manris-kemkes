import assert from "node:assert/strict";
import test from "node:test";

import type { RiskReviewQueueItem } from "@/types/risk";

const panelLib = await import(new URL("./risk-review-panel.ts", import.meta.url).href);

const { getVisibleRiskReviewItems } = panelLib as typeof import("./risk-review-panel");

test("getVisibleRiskReviewItems keeps approved rows visible in monitoring", () => {
  const items: RiskReviewQueueItem[] = [
    {
      riskId: "approved-1",
      versionGroupId: "vg-1",
      code: "R-001",
      title: "Approved risk",
      orgName: "Org A",
      currentStatus: "approved",
      reviewStatus: "approved",
      assessmentCycle: "2026-H1",
      currentScore: 12,
      currentLevel: "Sedang",
    },
    {
      riskId: "due-1",
      versionGroupId: "vg-2",
      code: "R-002",
      title: "Due risk",
      orgName: "Org B",
      currentStatus: "assessment_draft",
      reviewStatus: "due",
      assessmentCycle: "2026-H1",
      currentScore: 8,
      currentLevel: "Rendah",
    },
  ];

  assert.deepEqual(getVisibleRiskReviewItems(items), items);
});
